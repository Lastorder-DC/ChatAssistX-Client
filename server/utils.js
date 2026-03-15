const PROGRAM_VERSION = "1.1.4";

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
 * 이모지 runs는 [yt-emoji:키] 형식으로 변환되며, 별도의 emojiMap에 키-URL 매핑을 저장한다.
 * 같은 URL의 이모지가 여러 번 나올 경우 동일한 키를 재사용하여 중복을 제거한다.
 * @returns {{ text: string, emojiMap: Object<string, string> }}
 */
function processMessageRuns(message) {
    if (!message) {
        return { text: '', emojiMap: {} };
    }

    if (!message.runs || message.runs.length === 0) {
        return { text: message.toString() || '', emojiMap: {} };
    }

    const emojiMap = {};
    const urlToKey = {};
    let emojiIndex = 0;

    const text = message.runs.map(run => {
        if (run.emoji && run.emoji.image && run.emoji.image.length > 0) {
            const url = run.emoji.image[0].url;
            if (url) {
                if (!urlToKey[url]) {
                    const key = 'e' + emojiIndex++;
                    urlToKey[url] = key;
                    emojiMap[key] = url;
                }
                return `[yt-emoji:${urlToKey[url]}]`;
            }
        }
        return run.text || '';
    }).join('');

    return { text, emojiMap };
}

module.exports = {
    PROGRAM_VERSION,
    ALLOWED_ORIGINS,
    isAllowedOrigin,
    processMessageRuns
};
