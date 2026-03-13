const { isAllowedOrigin, processMessageRuns, ALLOWED_ORIGINS, PROGRAM_VERSION } = require('../utils');

describe('PROGRAM_VERSION', () => {
    test('should be 1.1.3', () => {
        expect(PROGRAM_VERSION).toBe('1.1.3');
    });
});

describe('ALLOWED_ORIGINS', () => {
    test('should contain the required domains', () => {
        expect(ALLOWED_ORIGINS).toContain('chatassistx.vercel.app');
        expect(ALLOWED_ORIGINS).toContain('lastorder.xyz');
        expect(ALLOWED_ORIGINS).toContain('chat.lastorder.xyz');
        expect(ALLOWED_ORIGINS).toContain('funzinnu.com');
    });
});

describe('isAllowedOrigin', () => {
    // 허용된 도메인 테스트
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

    // funzinnu.com 하위 도메인 테스트
    test('should allow subdomains of funzinnu.com', () => {
        expect(isAllowedOrigin('https://sub.funzinnu.com')).toBe(true);
        expect(isAllowedOrigin('https://deep.sub.funzinnu.com')).toBe(true);
        expect(isAllowedOrigin('https://chat.funzinnu.com')).toBe(true);
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
        expect(processMessageRuns(null)).toBe('');
        expect(processMessageRuns(undefined)).toBe('');
    });

    test('should return toString() for message without runs', () => {
        const message = { toString: () => 'hello' };
        expect(processMessageRuns(message)).toBe('hello');
    });

    test('should return empty string for message with empty runs', () => {
        const message = { runs: [], toString: () => 'fallback' };
        expect(processMessageRuns(message)).toBe('fallback');
    });

    test('should concatenate text runs', () => {
        const message = {
            runs: [
                { text: 'Hello ' },
                { text: 'World' }
            ]
        };
        expect(processMessageRuns(message)).toBe('Hello World');
    });

    test('should convert emoji runs to [yt-emoji:URL] format', () => {
        const message = {
            runs: [
                { text: 'Hi ' },
                { emoji: { image: [{ url: 'https://example.com/emoji.png' }] } },
                { text: ' there' }
            ]
        };
        expect(processMessageRuns(message)).toBe('Hi [yt-emoji:https://example.com/emoji.png] there');
    });

    test('should handle emoji without image gracefully', () => {
        const message = {
            runs: [
                { emoji: {} },
                { emoji: { image: [] } },
                { text: 'text' }
            ]
        };
        expect(processMessageRuns(message)).toBe('text');
    });

    test('should handle runs with no text and no emoji', () => {
        const message = {
            runs: [{}]
        };
        expect(processMessageRuns(message)).toBe('');
    });

    test('should handle multiple emojis', () => {
        const message = {
            runs: [
                { emoji: { image: [{ url: 'https://example.com/e1.png' }] } },
                { emoji: { image: [{ url: 'https://example.com/e2.png' }] } }
            ]
        };
        expect(processMessageRuns(message)).toBe('[yt-emoji:https://example.com/e1.png][yt-emoji:https://example.com/e2.png]');
    });

    test('should preserve emoji URL containing -- pattern', () => {
        const message = {
            runs: [
                { text: 'Hi ' },
                { emoji: { image: [{ url: 'https://lh3.googleusercontent.com/--Md3eBq7B20--/photo.jpg' }] } },
                { text: ' there' }
            ]
        };
        expect(processMessageRuns(message)).toBe('Hi [yt-emoji:https://lh3.googleusercontent.com/--Md3eBq7B20--/photo.jpg] there');
    });

    test('should preserve emoji URL containing ~~ and __ patterns', () => {
        const message = {
            runs: [
                { emoji: { image: [{ url: 'https://example.com/~~test~~/emoji.png' }] } },
                { emoji: { image: [{ url: 'https://example.com/__test__/emoji.png' }] } }
            ]
        };
        expect(processMessageRuns(message)).toBe('[yt-emoji:https://example.com/~~test~~/emoji.png][yt-emoji:https://example.com/__test__/emoji.png]');
    });
});
