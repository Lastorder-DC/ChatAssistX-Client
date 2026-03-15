const PROGRAM_VERSION = "1.1.5";

// 이모지 맵핑을 지원하는 최소 클라이언트 버전
const EMOJI_MAP_MIN_VERSION = "1.16.7";

// 정확히 일치해야 하는 도메인 (조회 속도 최적화를 위해 Set 사용)
const EXACT_DOMAINS = new Set([
    'chatassistx.vercel.app',
    'lastorder.xyz',
    'chat.lastorder.xyz',
    'funzinnu.com'
]);

// 특정 문자열로 끝나야 하는 도메인 조건 (하위 도메인 및 Vercel 프리뷰)
const ALLOWED_SUFFIXES = [
    '.funzinnu.com', 
    'lastorderdcs-projects.vercel.app' // 예: chatassistx-xxx-lastorderdcs-projects.vercel.app
];

/**
 * Origin 헤더가 허용된 도메인인지 확인한다.
 */
function isAllowedOrigin(origin) {
    if (!origin) return false;

    let hostname;
    try {
        hostname = new URL(origin).hostname;
    } catch (e) {
        return false;
    }

    // 1. 정확히 일치하는 도메인이 있는지 확인 (O(1))
    if (EXACT_DOMAINS.has(hostname)) return true;

    // 2. 접미사(Suffix) 조건에 부합하는지 확인 (하나라도 일치하면 true 반환)
    return ALLOWED_SUFFIXES.some(suffix => hostname.endsWith(suffix));
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

/**
 * 시맨틱 버전 문자열을 비교한다.
 * v1 >= v2 이면 true, 아니면 false를 반환한다.
 */
function isVersionAtLeast(v1, v2) {
    if (!v1 || !v2) return false;
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
        const a = parts1[i] || 0;
        const b = parts2[i] || 0;
        if (a > b) return true;
        if (a < b) return false;
    }
    return true; // equal
}

/**
 * 클라이언트 버전이 이모지 맵핑을 지원하는지 확인한다.
 * @param {string|undefined} clientVersion
 * @returns {boolean}
 */
function supportsEmojiMap(clientVersion) {
    return isVersionAtLeast(clientVersion, EMOJI_MAP_MIN_VERSION);
}

/**
 * 이모지 맵의 키를 실제 URL로 치환하여 레거시 형식의 텍스트를 반환한다.
 * @param {string} text - [yt-emoji:key] 형식의 텍스트
 * @param {Object<string, string>} emojiMap - 키-URL 매핑
 * @returns {string} - [yt-emoji:URL] 형식의 텍스트
 */
function resolveEmojiMap(text, emojiMap) {
    if (!emojiMap || Object.keys(emojiMap).length === 0) return text;
    return text.replace(/\[yt-emoji:([^\]]+)\]/g, (match, key) => {
        return emojiMap[key] ? `[yt-emoji:${emojiMap[key]}]` : match;
    });
}

module.exports = {
    PROGRAM_VERSION,
    EMOJI_MAP_MIN_VERSION,
    isAllowedOrigin,
    processMessageRuns,
    supportsEmojiMap,
    resolveEmojiMap
};
