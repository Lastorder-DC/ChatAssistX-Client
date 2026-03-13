const { Innertube, YTNodes } = require('youtubei.js');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8090;

const wss = new WebSocketServer({ port: PORT });

console.log(`YouTube Live Chat relay server started on port ${PORT}`);

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

/**
 * 클라이언트를 채널에서 구독 해제
 */
function unsubscribeClient(ws, channel) {
    const session = channelSessions.get(channel);
    if (!session) return;

    session.clients.delete(ws);
    console.log(`Client unsubscribed from ${channel} (${session.clients.size} remaining)`);

    // 더 이상 구독자가 없으면 세션 정리
    if (session.clients.size === 0) {
        console.log(`No more clients for ${channel}, stopping session`);
        if (session.livechat) {
            session.livechat.stop();
        }
        channelSessions.delete(channel);
    }
}

wss.on('connection', (ws) => {
    console.log('Client connected');
    let subscribedChannel = null;

    ws.on('message', async (data) => {
        let parsed;
        try {
            parsed = JSON.parse(data.toString());
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        if (parsed.type === 'connect') {
            const channel = parsed.channel;
            if (!channel) {
                ws.send(JSON.stringify({ type: 'error', message: 'Channel identifier is required' }));
                return;
            }

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
        if (subscribedChannel) {
            unsubscribeClient(ws, subscribedChannel);
            subscribedChannel = null;
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
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
        existingSession.clients.add(ws);
        if (existingSession.connecting) {
            ws.send(JSON.stringify({ type: 'info', message: `Connecting to ${channel}...` }));
        } else {
            ws.send(JSON.stringify({ type: 'info', message: `Joined existing live chat session for ${channel}` }));
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
        broadcast(session, { type: 'error', message: err.message || 'Failed to start live chat' });
        channelSessions.delete(channel);
    }
}

/**
 * 채널의 라이브 스트림을 찾고 채팅 세션을 시작한다.
 * 재시도 로직 없이 한 번만 시도하며, 실패/종료 시 클라이언트에게 알린다.
 */
async function startChannelSession(channel, session) {
    const yt = await Innertube.create();

    broadcast(session, { type: 'info', message: `Resolving channel: ${channel}` });

    let videoId = null;

    try {
        videoId = await findLiveVideoId(yt, channel);
    } catch (err) {
        console.error('Error finding live video:', err);
        broadcast(session, { type: 'not_found', message: `Could not find live stream: ${err.message}` });
        channelSessions.delete(channel);
        return;
    }

    if (!videoId) {
        broadcast(session, { type: 'not_found', message: 'No active live stream found for this channel' });
        channelSessions.delete(channel);
        return;
    }

    broadcast(session, { type: 'info', message: `Found live stream: ${videoId}` });

    // Get video info and start live chat
    const info = await yt.getInfo(videoId);
    const livechat = info.getLiveChat();
    session.livechat = livechat;
    session.connecting = false;

    livechat.on('start', (initial_data) => {
        broadcast(session, {
            type: 'info',
            message: `Connected to live chat (${initial_data.viewer_name || 'Guest'})`
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

            broadcast(session, {
                type: 'chat',
                nickname: author?.name?.toString() || 'Unknown',
                message: msg.message?.toString() || '',
                isOwner: isOwner,
                isMod: author?.is_moderator || false,
                isMember: author?.badges?.some(
                    (badge) => badge.tooltip === 'Member' || badge.style === 'BADGE_STYLE_TYPE_MEMBER'
                ) || false,
                id: author?.id || ''
            });
            break;
        }
        case 'LiveChatPaidMessage': {
            const msg = item.as(YTNodes.LiveChatPaidMessage);
            const author = msg.author;

            broadcast(session, {
                type: 'superchat',
                nickname: author?.name?.toString() || 'Unknown',
                message: msg.message?.toString() || '',
                amount: msg.purchase_amount || '',
                isOwner: false,
                isMod: author?.is_moderator || false,
                id: author?.id || ''
            });
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
