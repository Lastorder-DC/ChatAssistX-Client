const { isAllowedOrigin, processMessageRuns, PROGRAM_VERSION, EMOJI_MAP_MIN_VERSION, supportsEmojiMap, resolveEmojiMap } = require('../utils');

describe('PROGRAM_VERSION', () => {
    test('should be a non-empty version string', () => {
        expect(typeof PROGRAM_VERSION).toBe('string');
        expect(PROGRAM_VERSION.length).toBeGreaterThan(0);
    });
});

describe('isAllowedOrigin', () => {
    // 정확히 일치하는 도메인 테스트 (EXACT_DOMAINS)
    test('should allow chatassistx.cc', () => {
        expect(isAllowedOrigin('https://chatassistx.cc')).toBe(true);
    });

    test('should allow chatassistx.vercel.app', () => {
        expect(isAllowedOrigin('https://chatassistx.vercel.app')).toBe(true);
    });

    test('should allow lastorder.xyz', () => {
        expect(isAllowedOrigin('https://lastorder.xyz')).toBe(true);
    });

    test('should allow chat.lastorder.xyz', () => {
        expect(isAllowedOrigin('https://chat.lastorder.xyz')).toBe(true);
    });

    test('should allow funzinnu.com', () => {
        expect(isAllowedOrigin('https://funzinnu.com')).toBe(true);
    });

    // 접미사(Suffix) 조건 테스트 (ALLOWED_SUFFIXES)
    test('should allow subdomains of funzinnu.com', () => {
        expect(isAllowedOrigin('https://sub.funzinnu.com')).toBe(true);
        expect(isAllowedOrigin('https://deep.sub.funzinnu.com')).toBe(true);
        expect(isAllowedOrigin('https://chat.funzinnu.com')).toBe(true);
    });

    test('should allow Vercel preview domains under lastorderdcs-projects', () => {
        expect(isAllowedOrigin('https://chatassistx-xxx-lastorderdcs-projects.vercel.app')).toBe(true);
        expect(isAllowedOrigin('https://chatassistx-abc123-lastorderdcs-projects.vercel.app')).toBe(true);
    });

    // http 프로토콜도 허용
    test('should allow http protocol', () => {
        expect(isAllowedOrigin('http://funzinnu.com')).toBe(true);
        expect(isAllowedOrigin('http://chatassistx.vercel.app')).toBe(true);
    });

    // 거부되어야 하는 도메인 테스트
    test('should reject unknown domains', () => {
        expect(isAllowedOrigin('https://evil.com')).toBe(false);
        expect(isAllowedOrigin('https://google.com')).toBe(false);
    });

    test('should reject domains that look similar but are not allowed', () => {
        expect(isAllowedOrigin('https://notfunzinnu.com')).toBe(false);
        expect(isAllowedOrigin('https://fakechatassistx.vercel.app')).toBe(false);
        expect(isAllowedOrigin('https://evillastorder.xyz')).toBe(false);
    });

    // 다른 허용 도메인의 하위 도메인은 거부 (funzinnu.com만 하위 도메인 허용)
    test('should reject subdomains of non-funzinnu.com allowed domains', () => {
        expect(isAllowedOrigin('https://sub.lastorder.xyz')).toBe(false);
        expect(isAllowedOrigin('https://sub.chatassistx.vercel.app')).toBe(false);
    });

    // 엣지 케이스
    test('should reject null/undefined/empty origin', () => {
        expect(isAllowedOrigin(null)).toBe(false);
        expect(isAllowedOrigin(undefined)).toBe(false);
        expect(isAllowedOrigin('')).toBe(false);
    });

    test('should reject invalid URLs', () => {
        expect(isAllowedOrigin('not-a-url')).toBe(false);
        expect(isAllowedOrigin('://missing-protocol')).toBe(false);
    });
});

describe('processMessageRuns', () => {
    test('should return empty string for null/undefined message', () => {
        expect(processMessageRuns(null)).toEqual({ text: '', emojiMap: {} });
        expect(processMessageRuns(undefined)).toEqual({ text: '', emojiMap: {} });
    });

    test('should return toString() for message without runs', () => {
        const message = { toString: () => 'hello' };
        expect(processMessageRuns(message)).toEqual({ text: 'hello', emojiMap: {} });
    });

    test('should return empty string for message with empty runs', () => {
        const message = { runs: [], toString: () => 'fallback' };
        expect(processMessageRuns(message)).toEqual({ text: 'fallback', emojiMap: {} });
    });

    test('should concatenate text runs', () => {
        const message = {
            runs: [
                { text: 'Hello ' },
                { text: 'World' }
            ]
        };
        expect(processMessageRuns(message)).toEqual({ text: 'Hello World', emojiMap: {} });
    });

    test('should convert emoji runs to [yt-emoji:key] format with emojiMap', () => {
        const message = {
            runs: [
                { text: 'Hi ' },
                { emoji: { image: [{ url: 'https://example.com/emoji.png' }] } },
                { text: ' there' }
            ]
        };
        const result = processMessageRuns(message);
        expect(result.text).toBe('Hi [yt-emoji:e0] there');
        expect(result.emojiMap).toEqual({ e0: 'https://example.com/emoji.png' });
    });

    test('should handle emoji without image gracefully', () => {
        const message = {
            runs: [
                { emoji: {} },
                { emoji: { image: [] } },
                { text: 'text' }
            ]
        };
        expect(processMessageRuns(message)).toEqual({ text: 'text', emojiMap: {} });
    });

    test('should handle runs with no text and no emoji', () => {
        const message = {
            runs: [{}]
        };
        expect(processMessageRuns(message)).toEqual({ text: '', emojiMap: {} });
    });

    test('should handle multiple different emojis', () => {
        const message = {
            runs: [
                { emoji: { image: [{ url: 'https://example.com/e1.png' }] } },
                { emoji: { image: [{ url: 'https://example.com/e2.png' }] } }
            ]
        };
        const result = processMessageRuns(message);
        expect(result.text).toBe('[yt-emoji:e0][yt-emoji:e1]');
        expect(result.emojiMap).toEqual({
            e0: 'https://example.com/e1.png',
            e1: 'https://example.com/e2.png'
        });
    });

    test('should deduplicate same emoji URLs', () => {
        const url = 'https://yt3.ggpht.com/KOxdr_z3A5h1Gb7kqnxqOCnbZrBmxI2B_tRQ453BhTWUhYAlpg5ZP8IKEBkcvRoY8grY91Q=w48-h48-c-k-nd';
        const message = {
            runs: [
                { emoji: { image: [{ url }] } },
                { emoji: { image: [{ url }] } },
                { emoji: { image: [{ url }] } },
                { emoji: { image: [{ url }] } }
            ]
        };
        const result = processMessageRuns(message);
        expect(result.text).toBe('[yt-emoji:e0][yt-emoji:e0][yt-emoji:e0][yt-emoji:e0]');
        expect(result.emojiMap).toEqual({ e0: url });
    });

    test('should deduplicate mixed same and different emoji URLs', () => {
        const url1 = 'https://example.com/emoji1.png';
        const url2 = 'https://example.com/emoji2.png';
        const message = {
            runs: [
                { emoji: { image: [{ url: url1 }] } },
                { emoji: { image: [{ url: url2 }] } },
                { emoji: { image: [{ url: url1 }] } },
                { text: ' hello ' },
                { emoji: { image: [{ url: url2 }] } }
            ]
        };
        const result = processMessageRuns(message);
        expect(result.text).toBe('[yt-emoji:e0][yt-emoji:e1][yt-emoji:e0] hello [yt-emoji:e1]');
        expect(result.emojiMap).toEqual({
            e0: url1,
            e1: url2
        });
    });

    test('should preserve emoji URL containing -- pattern in emojiMap', () => {
        const message = {
            runs: [
                { text: 'Hi ' },
                { emoji: { image: [{ url: 'https://lh3.googleusercontent.com/--Md3eBq7B20--/photo.jpg' }] } },
                { text: ' there' }
            ]
        };
        const result = processMessageRuns(message);
        expect(result.text).toBe('Hi [yt-emoji:e0] there');
        expect(result.emojiMap).toEqual({ e0: 'https://lh3.googleusercontent.com/--Md3eBq7B20--/photo.jpg' });
    });

    test('should preserve emoji URL containing ~~ and __ patterns in emojiMap', () => {
        const message = {
            runs: [
                { emoji: { image: [{ url: 'https://example.com/~~test~~/emoji.png' }] } },
                { emoji: { image: [{ url: 'https://example.com/__test__/emoji.png' }] } }
            ]
        };
        const result = processMessageRuns(message);
        expect(result.text).toBe('[yt-emoji:e0][yt-emoji:e1]');
        expect(result.emojiMap).toEqual({
            e0: 'https://example.com/~~test~~/emoji.png',
            e1: 'https://example.com/__test__/emoji.png'
        });
    });
});

describe('supportsEmojiMap', () => {
    test('should return false for null/undefined version', () => {
        expect(supportsEmojiMap(null)).toBe(false);
        expect(supportsEmojiMap(undefined)).toBe(false);
    });

    test('should return false for empty string version', () => {
        expect(supportsEmojiMap('')).toBe(false);
    });

    test('should return false for version below minimum', () => {
        expect(supportsEmojiMap('1.16.6')).toBe(false);
        expect(supportsEmojiMap('1.15.0')).toBe(false);
        expect(supportsEmojiMap('1.0.0')).toBe(false);
        expect(supportsEmojiMap('0.99.99')).toBe(false);
    });

    test('should return true for exact minimum version', () => {
        expect(supportsEmojiMap('1.16.7')).toBe(true);
    });

    test('should return true for versions above minimum', () => {
        expect(supportsEmojiMap('1.16.8')).toBe(true);
        expect(supportsEmojiMap('1.17.0')).toBe(true);
        expect(supportsEmojiMap('2.0.0')).toBe(true);
    });
});

describe('resolveEmojiMap', () => {
    test('should return text unchanged when emojiMap is empty', () => {
        expect(resolveEmojiMap('Hello world', {})).toBe('Hello world');
    });

    test('should return text unchanged when emojiMap is null', () => {
        expect(resolveEmojiMap('Hello world', null)).toBe('Hello world');
    });

    test('should resolve emoji keys to full URLs', () => {
        const text = 'Hi [yt-emoji:e0] there';
        const emojiMap = { e0: 'https://example.com/emoji.png' };
        expect(resolveEmojiMap(text, emojiMap)).toBe('Hi [yt-emoji:https://example.com/emoji.png] there');
    });

    test('should resolve duplicate emoji keys to same URL', () => {
        const url = 'https://yt3.ggpht.com/emoji.png';
        const text = '[yt-emoji:e0][yt-emoji:e0][yt-emoji:e0]';
        const emojiMap = { e0: url };
        expect(resolveEmojiMap(text, emojiMap)).toBe(
            `[yt-emoji:${url}][yt-emoji:${url}][yt-emoji:${url}]`
        );
    });

    test('should resolve multiple different keys', () => {
        const text = '[yt-emoji:e0] text [yt-emoji:e1]';
        const emojiMap = { e0: 'https://example.com/e1.png', e1: 'https://example.com/e2.png' };
        expect(resolveEmojiMap(text, emojiMap)).toBe(
            '[yt-emoji:https://example.com/e1.png] text [yt-emoji:https://example.com/e2.png]'
        );
    });

    test('should leave unknown keys unchanged', () => {
        const text = '[yt-emoji:e0] [yt-emoji:e99]';
        const emojiMap = { e0: 'https://example.com/e1.png' };
        expect(resolveEmojiMap(text, emojiMap)).toBe(
            '[yt-emoji:https://example.com/e1.png] [yt-emoji:e99]'
        );
    });

    test('should return text without emoji markers unchanged', () => {
        const text = 'Hello world no emojis';
        const emojiMap = { e0: 'https://example.com/emoji.png' };
        expect(resolveEmojiMap(text, emojiMap)).toBe('Hello world no emojis');
    });
});
