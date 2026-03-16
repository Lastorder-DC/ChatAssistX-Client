const { Innertube, YTNodes } = require('youtubei.js');
const { WebSocketServer, WebSocket } = require('ws');
const { PROGRAM_VERSION, isAllowedOrigin, processMessageRuns, supportsEmojiMap, resolveEmojiMap } = require('./utils');
const PORT = process.env.PORT || 8090;
const DEV_MODE = process.argv.includes('--dev');

const wss = new WebSocketServer({
    port: PORT,
    verifyClient: (info) => {
        if (DEV_MODE) return true;
        const origin = info.origin || info.req.headers.origin;
        if (!isAllowedOrigin(origin)) {
            console.log(`Connection rejected: origin ${origin} is not allowed`);
            return false;
        }
        return true;
    }
});

console.log(`YouTube Live Chat relay server ${PROGRAM_VERSION} started on port ${PORT}${DEV_MODE ? ' (dev mode - origin check disabled)' : ''}`);

// 채널별 공유 세션 관리
// Map<channel, { livechat, clients: Set<ws>, connecting: boolean }>
const channelSessions = new Map();

/**
 * 세션에 연결된 모든 클라이언트에게 메시지 전송
 */
function broadcast(session, data) {
    const message = JSON.stringify(data);
    for (const client of session.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

// 클라이언트 ping 모니터링을 위한 타임스탬프 관리
const clientLastPing = new Map();

// 60초 이상 ping이 없는 클라이언트 연결 해제
const PING_TIMEOUT = 60000;
// 클라이언트 ping 주기(30초)보다 짧게 체크하여 타이밍 이슈 방지
const PING_CHECK_INTERVAL = 10000;
// 세션 정리 대기 시간 (새로고침 시 재연결 허용)
const SESSION_CLEANUP_DELAY = 10000;

/**
 * 클라이언트를 채널에서 구독 해제
 */
function unsubscribeClient(ws, channel) {
    const session = channelSessions.get(channel);
    if (!session) return;

    session.clients.delete(ws);
    console.log(`Client unsubscribed from ${channel} (${session.clients.size} remaining)`);

    // 더 이상 구독자가 없으면 일정 시간 대기 후 세션 정리 (새로고침 시 재연결 허용)
    if (session.clients.size === 0) {
        console.log(`No more clients for ${channel}, waiting ${SESSION_CLEANUP_DELAY / 1000}s before stopping session`);
        session.cleanupTimer = setTimeout(() => {
            if (session.clients.size === 0) {
                console.log(`No clients reconnected for ${channel}, stopping session`);
                if (session.livechat) {
                    session.livechat.stop();
                }
                channelSessions.delete(channel);
            }
        }, SESSION_CLEANUP_DELAY);
    }
}


const pingMonitorInterval = setInterval(() => {
    const now = Date.now();
    for (const [client, lastPing] of clientLastPing) {
        if (now - lastPing > PING_TIMEOUT) {
            console.log('Client ping timeout, dropping connection');
            client.close(1000, 'Ping timeout');
            clientLastPing.delete(client);
        }
    }
}, PING_CHECK_INTERVAL);

wss.on('connection', (ws) => {
    console.log('Client connected');
    let subscribedChannel = null;

    // ping 타임스탬프 초기화
    clientLastPing.set(ws, Date.now());

    ws.send(JSON.stringify({ type: 'version', message: PROGRAM_VERSION }));
    ws.on('message', async (data) => {
        let parsed;
        try {
            parsed = JSON.parse(data.toString());
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: '잘못된 JSON' }));
            return;
        }

        if (parsed.type === 'ping') {
            clientLastPing.set(ws, Date.now());
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
            return;
        }

        if (parsed.type === 'connect') {
            const channel = parsed.channel;
            if (!channel) {
                ws.send(JSON.stringify({ type: 'error', message: '채널 식별자가 필요합니다' }));
                return;
            }

            // 클라이언트 버전 저장
            ws.clientVersion = parsed.version || null;

            // 이전 채널 구독 해제
            if (subscribedChannel) {
                unsubscribeClient(ws, subscribedChannel);
            }
            subscribedChannel = channel;

            // 채널 세션에 구독
            await subscribeClient(ws, channel);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clientLastPing.delete(ws);
        if (subscribedChannel) {
            unsubscribeClient(ws, subscribedChannel);
            subscribedChannel = null;
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        clientLastPing.delete(ws);
        if (subscribedChannel) {
            unsubscribeClient(ws, subscribedChannel);
            subscribedChannel = null;
        }
    });
});

/**
 * 클라이언트를 채널 세션에 구독.
 * 이미 해당 채널에 활성 세션이 있으면 기존 세션에 합류한다.
 */
async function subscribeClient(ws, channel) {
    const existingSession = channelSessions.get(channel);

    if (existingSession) {
        // 대기중인 세션 정리 타이머 취소 (새로고침 등으로 재연결 시)
        if (existingSession.cleanupTimer) {
            clearTimeout(existingSession.cleanupTimer);
            existingSession.cleanupTimer = null;
            console.log(`Cleanup timer cancelled for ${channel}, client reconnected`);
        }
        existingSession.clients.add(ws);
        if (existingSession.connecting) {
            ws.send(JSON.stringify({ type: 'info', message: `채널 ${channel}에 연결중...` }));
        } else {
            ws.send(JSON.stringify({ type: 'connected', message: `${channel}: 기존 채널 세션에 연결됨` }));
        }
        return;
    }

    // 새 세션 생성
    const session = { livechat: null, clients: new Set([ws]), connecting: true };
    channelSessions.set(channel, session);

    try {
        await startChannelSession(channel, session);
    } catch (err) {
        console.error('Error starting channel session:', err);
        broadcast(session, { type: 'error', message: err.message || '라이브 채팅 세션 시작 실패' });
        channelSessions.delete(channel);
    }
}

/**
 * 채널의 라이브 스트림을 찾고 채팅 세션을 시작한다.
 * 재시도 로직 없이 한 번만 시도하며, 실패/종료 시 클라이언트에게 알린다.
 */
async function startChannelSession(channel, session) {
    const yt = await Innertube.create();

    broadcast(session, { type: 'info', message: `채널 확인중: ${channel}` });

    let videoId = null;

    try {
        videoId = await findLiveVideoId(yt, channel);
    } catch (err) {
        console.error('Error finding live video:', err);
        broadcast(session, { type: 'not_found', message: `생방송을 찾을 수 없음: ${err.message}` });
        channelSessions.delete(channel);
        return;
    }

    if (!videoId) {
        broadcast(session, { type: 'not_found', message: '채널에 생방송이 진행중이지 않습니다' });
        channelSessions.delete(channel);
        return;
    }

    broadcast(session, { type: 'info', message: `생방송 찾음: ${videoId}` });

    // Get video info and start live chat
    const info = await yt.getInfo(videoId);
    const livechat = info.getLiveChat();
    session.livechat = livechat;
    session.connecting = false;

    livechat.on('start', (initial_data) => {
        broadcast(session, {
            type: 'connected',
            message: `${channel}: 생방송 채팅에 연결됨`
        });
    });

    livechat.on('chat-update', (action) => {
        if (action.is(YTNodes.AddChatItemAction)) {
            const item = action.as(YTNodes.AddChatItemAction).item;
            if (!item) return;

            handleChatItem(session, item);
        }
    });

    livechat.on('error', (err) => {
        console.error('Live chat error:', err);
        broadcast(session, { type: 'error', message: `Live chat error: ${err.message}` });
    });

    livechat.on('end', () => {
        broadcast(session, { type: 'ended', message: 'Live stream has ended' });
        channelSessions.delete(channel);
    });

    livechat.start();
}

/**
 * Finds the live video ID for a given channel identifier.
 * Supports @handle, channel ID (UC...), and custom URLs.
 */
async function findLiveVideoId(yt, channel) {
    let channelInfo;

    if (channel.startsWith('@')) {
        // Handle: resolve via URL
        const endpoint = await yt.resolveURL(`https://www.youtube.com/${channel}/live`);
        if (endpoint.payload && endpoint.payload.videoId) {
            return endpoint.payload.videoId;
        }

        // Fallback: resolve the channel and look for live streams
        const channelEndpoint = await yt.resolveURL(`https://www.youtube.com/${channel}`);
        if (channelEndpoint.payload && channelEndpoint.payload.browseId) {
            channelInfo = await yt.getChannel(channelEndpoint.payload.browseId);
        }
    } else if (channel.startsWith('UC')) {
        // Channel ID
        channelInfo = await yt.getChannel(channel);
    } else {
        // Try as video ID directly
        try {
            const info = await yt.getBasicInfo(channel);
            if (info.basic_info && info.basic_info.is_live) {
                return channel;
            }
        } catch (e) {
            // Not a video ID, try resolving as URL
        }

        // Try resolving as a custom URL
        const endpoint = await yt.resolveURL(`https://www.youtube.com/${channel}/live`);
        if (endpoint.payload && endpoint.payload.videoId) {
            return endpoint.payload.videoId;
        }

        if (endpoint.payload && endpoint.payload.browseId) {
            channelInfo = await yt.getChannel(endpoint.payload.browseId);
        }
    }

    // Look through channel's live streams tab or home tab for active live
    if (channelInfo) {
        // Try the home tab first (featured live stream)
        const videos = channelInfo.videos;
        for (const video of videos) {
            if (video.is(YTNodes.Video) || video.is(YTNodes.GridVideo) || video.is(YTNodes.RichItem)) {
                const v = video.is(YTNodes.RichItem) ? video.content : video;
                if (v && v.is_live) {
                    return v.id;
                }
            }
        }

        // Try live streams tab
        if (channelInfo.has_live_streams) {
            const liveTab = await channelInfo.getLiveStreams();
            const liveVideos = liveTab.videos;
            for (const video of liveVideos) {
                if (video.is(YTNodes.Video) || video.is(YTNodes.GridVideo) || video.is(YTNodes.RichItem)) {
                    const v = video.is(YTNodes.RichItem) ? video.content : video;
                    if (v && v.is_live) {
                        return v.id;
                    }
                }
            }
        }
    }

    return null;
}

/**
 * 채팅 메시지를 클라이언트 버전에 따라 적절한 형식으로 전송한다.
 * 이모지 맵핑을 지원하는 클라이언트에게는 키 기반 이모지 + emojiMap을,
 * 지원하지 않는 클라이언트에게는 URL이 포함된 레거시 형식을 전송한다.
 */
function broadcastMessage(session, baseData, text, emojiMap) {
    const hasEmoji = Object.keys(emojiMap).length > 0;
    let legacyText = null;

    for (const client of session.clients) {
        if (client.readyState === WebSocket.OPEN) {
            if (hasEmoji && supportsEmojiMap(client.clientVersion)) {
                client.send(JSON.stringify({ ...baseData, message: text, emojiMap }));
            } else {
                if (legacyText === null) {
                    legacyText = hasEmoji ? resolveEmojiMap(text, emojiMap) : text;
                }
                client.send(JSON.stringify({ ...baseData, message: legacyText }));
            }
        }
    }
}

/**
 * Handles a live chat item and broadcasts it to all subscribed clients.
 */
function handleChatItem(session, item) {
    switch (item.type) {
        case 'LiveChatTextMessage': {
            const msg = item.as(YTNodes.LiveChatTextMessage);
            const author = msg.author;

            // Check for owner badge
            const isOwner = author?.badges?.some(
                (badge) => badge.tooltip === 'Owner' || badge.icon_type === 'OWNER'
            ) || false;

            // nickname(author?.name?.toString()) 맨앞 @ 삭제
            const { text: chatText, emojiMap: chatEmojiMap } = processMessageRuns(msg.message);
            broadcastMessage(session, {
                type: 'chat',
                nickname: author?.name?.toString()?.replace(/^@/, '') || 'Unknown',
                isOwner: isOwner,
                isMod: author?.is_moderator || false,
                isMember: author?.badges?.some(
                    (badge) => badge.tooltip === 'Member' || badge.style === 'BADGE_STYLE_TYPE_MEMBER'
                ) || false,
                id: author?.id || ''
            }, chatText, chatEmojiMap);
            break;
        }
        case 'LiveChatPaidMessage': {
            const msg = item.as(YTNodes.LiveChatPaidMessage);
            const author = msg.author;

            const { text: scText, emojiMap: scEmojiMap } = processMessageRuns(msg.message);
            broadcastMessage(session, {
                type: 'superchat',
                nickname: author?.name?.toString() || 'Unknown',
                amount: msg.purchase_amount || '',
                isOwner: false,
                isMod: author?.is_moderator || false,
                id: author?.id || ''
            }, scText, scEmojiMap);
            break;
        }
        case 'LiveChatPaidSticker': {
            const msg = item.as(YTNodes.LiveChatPaidSticker);
            const author = msg.author;

            broadcast(session, {
                type: 'superchat',
                nickname: author?.name?.toString() || 'Unknown',
                message: `[Sticker] ${msg.purchase_amount || ''}`,
                amount: msg.purchase_amount || '',
                isOwner: false,
                isMod: author?.is_moderator || false,
                id: author?.id || ''
            });
            break;
        }
        default:
            break;
    }
}

/**
 * 서버 종료 시 모든 세션과 연결을 정리한다.
 */
function gracefulShutdown() {
    console.log('\nShutting down server...');

    // ping 모니터링 중지
    clearInterval(pingMonitorInterval);
    clientLastPing.clear();

    // 모든 채널 세션의 라이브 채팅 중지
    for (const [channel, session] of channelSessions) {
        console.log(`Stopping session for channel: ${channel}`);
        // 대기중인 세션 정리 타이머 취소
        if (session.cleanupTimer) {
            clearTimeout(session.cleanupTimer);
            session.cleanupTimer = null;
        }
        if (session.livechat) {
            try {
                session.livechat.stop();
            } catch (e) {
                console.error(`Error stopping livechat for ${channel}:`, e.message);
            }
        }
        // 세션에 연결된 모든 클라이언트에게 종료 알림 메시지 전송 후 연결 해제
        for (const client of session.clients) {
            try {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'disconnected', message: 'Server shutting down' }));
                }
            } catch (e) {
                // 이미 닫힌 연결은 무시
            }
        }
    }

    // 메시지 전송 후 잠시 대기하여 클라이언트가 메시지를 수신할 수 있도록 함
    setTimeout(() => {
        for (const [channel, session] of channelSessions) {
            for (const client of session.clients) {
                try {
                    client.close(1001, 'Server shutting down');
                } catch (e) {
                    // 이미 닫힌 연결은 무시
                }
            }
        }
        channelSessions.clear();

        // WebSocket 서버 종료
        wss.close(() => {
            console.log('Server stopped.');
            process.exit(0);
        });

        // 3초 내에 종료되지 않으면 강제 종료
        setTimeout(() => {
            console.error('Forced shutdown after timeout');
            process.exit(1);
        }, 3000);
    }, 500);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
