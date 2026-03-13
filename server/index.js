const { Innertube, YTNodes } = require('youtubei.js');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8090;

const wss = new WebSocketServer({ port: PORT });

console.log(`YouTube Live Chat relay server started on port ${PORT}`);

wss.on('connection', (ws) => {
    console.log('Client connected');
    let livechat = null;

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

            // Stop any existing live chat session
            if (livechat) {
                livechat.stop();
                livechat = null;
            }

            try {
                await startLiveChat(ws, channel, (lc) => { livechat = lc; });
            } catch (err) {
                console.error('Error starting live chat:', err);
                ws.send(JSON.stringify({ type: 'error', message: err.message || 'Failed to start live chat' }));
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (livechat) {
            livechat.stop();
            livechat = null;
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        if (livechat) {
            livechat.stop();
            livechat = null;
        }
    });
});

/**
 * Resolves a channel identifier (handle or ID) to a live video ID
 * and starts the live chat relay.
 */
async function startLiveChat(ws, channel, setLivechat) {
    const yt = await Innertube.create();

    ws.send(JSON.stringify({ type: 'info', message: `Resolving channel: ${channel}` }));

    let videoId = null;

    // Try to find the live video from the channel
    try {
        videoId = await findLiveVideoId(yt, channel);
    } catch (err) {
        console.error('Error finding live video:', err);
        ws.send(JSON.stringify({ type: 'error', message: `Could not find live stream: ${err.message}` }));
        return;
    }

    if (!videoId) {
        ws.send(JSON.stringify({ type: 'error', message: 'No active live stream found for this channel' }));
        return;
    }

    ws.send(JSON.stringify({ type: 'info', message: `Found live stream: ${videoId}` }));

    // Get video info and start live chat
    const info = await yt.getInfo(videoId);
    const livechat = info.getLiveChat();
    setLivechat(livechat);

    livechat.on('start', (initial_data) => {
        ws.send(JSON.stringify({
            type: 'info',
            message: `Connected to live chat (${initial_data.viewer_name || 'Guest'})`
        }));
    });

    livechat.on('chat-update', (action) => {
        if (action.is(YTNodes.AddChatItemAction)) {
            const item = action.as(YTNodes.AddChatItemAction).item;
            if (!item) return;

            handleChatItem(ws, item);
        }
    });

    livechat.on('error', (err) => {
        console.error('Live chat error:', err);
        ws.send(JSON.stringify({ type: 'error', message: `Live chat error: ${err.message}` }));
    });

    livechat.on('end', () => {
        ws.send(JSON.stringify({ type: 'info', message: 'Live stream has ended' }));
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
 * Handles a live chat item and sends it to the WebSocket client.
 */
function handleChatItem(ws, item) {
    if (ws.readyState !== 1) return; // WebSocket.OPEN

    switch (item.type) {
        case 'LiveChatTextMessage': {
            const msg = item.as(YTNodes.LiveChatTextMessage);
            const author = msg.author;

            // Check for owner badge
            const isOwner = author?.badges?.some(
                (badge) => badge.tooltip === 'Owner' || badge.icon_type === 'OWNER'
            ) || false;

            ws.send(JSON.stringify({
                type: 'chat',
                nickname: author?.name?.toString() || 'Unknown',
                message: msg.message?.toString() || '',
                isOwner: isOwner,
                isMod: author?.is_moderator || false,
                isMember: author?.badges?.some(
                    (badge) => badge.tooltip === 'Member' || badge.style === 'BADGE_STYLE_TYPE_MEMBER'
                ) || false,
                id: author?.id || ''
            }));
            break;
        }
        case 'LiveChatPaidMessage': {
            const msg = item.as(YTNodes.LiveChatPaidMessage);
            const author = msg.author;

            ws.send(JSON.stringify({
                type: 'superchat',
                nickname: author?.name?.toString() || 'Unknown',
                message: msg.message?.toString() || '',
                amount: msg.purchase_amount || '',
                isOwner: false,
                isMod: author?.is_moderator || false,
                id: author?.id || ''
            }));
            break;
        }
        case 'LiveChatPaidSticker': {
            const msg = item.as(YTNodes.LiveChatPaidSticker);
            const author = msg.author;

            ws.send(JSON.stringify({
                type: 'superchat',
                nickname: author?.name?.toString() || 'Unknown',
                message: `[Sticker] ${msg.purchase_amount || ''}`,
                amount: msg.purchase_amount || '',
                isOwner: false,
                isMod: author?.is_moderator || false,
                id: author?.id || ''
            }));
            break;
        }
        default:
            break;
    }
}
