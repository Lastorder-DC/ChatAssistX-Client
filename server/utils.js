const PROGRAM_VERSION = "1.1.3";

// 허용된 Origin 도메인 목록
const ALLOWED_ORIGINS = [
    'chatassistx.vercel.app',
    'lastorder.xyz',
    'chat.lastorder.xyz',
    'funzinnu.com'  // funzinnu.com 및 하위 도메인 허용
];

/**
 * Origin 헤더가 허용된 도메인인지 확인한다.
 * funzinnu.com의 경우 하위 도메인도 허용한다.
 */
function isAllowedOrigin(origin) {
    if (!origin) return false;

    let hostname;
    try {
        hostname = new URL(origin).hostname;
    } catch (e) {
        return false;
    }

    for (const domain of ALLOWED_ORIGINS) {
        if (hostname === domain) return true;
        // funzinnu.com의 하위 도메인 허용
        if (domain === 'funzinnu.com' && hostname.endsWith('.' + domain)) return true;
    }
    return false;
}

/**
 * 메시지 runs를 처리하여 이모지를 마커 형식으로 변환한다.
 * 이모지 runs는 [yt-emoji:이미지URL] 형식으로 변환된다.
 */
function processMessageRuns(message) {
    if (!message) {
        return '';
    }

    if (!message.runs || message.runs.length === 0) {
        return message.toString() || '';
    }

    return message.runs.map(run => {
        if (run.emoji && run.emoji.image && run.emoji.image.length > 0) {
            const url = run.emoji.image[0].url;
            if (url) {
                return `[yt-emoji:${url}]`;
            }
        }
        return run.text || '';
    }).join('');
}

module.exports = {
    PROGRAM_VERSION,
    ALLOWED_ORIGINS,
    isAllowedOrigin,
    processMessageRuns
};
