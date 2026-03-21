/**
 * @jest-environment jsdom
 */

/**
 * replaceStyle과 YT_replaceEmoticon 함수 테스트
 */

// chatassist.js에서 함수 로드
window.config = { allowExternalSource: false, allowEmoticon: true, replace: {} };
window.emoticon = { isActive: false, list: {} };

const { replaceStyle, YT_replaceEmoticon } = require('../chatassist');

describe('replaceStyle', () => {
    beforeEach(() => {
        window.config = { allowExternalSource: false };
    });

    test('should convert -- text -- to strikethrough', () => {
        expect(replaceStyle('--hello--')).toBe('<strike>hello</strike>');
    });

    test('should convert ~~ text ~~ to strikethrough', () => {
        expect(replaceStyle('~~hello~~')).toBe('<strike>hello</strike>');
    });

    test('should convert __ text __ to underline', () => {
        expect(replaceStyle('__hello__')).toBe('<u>hello</u>');
    });
});

describe('YT_replaceEmoticon', () => {
    test('should convert [yt-emoji:URL] to img tag', () => {
        const input = '[yt-emoji:https://example.com/emoji.png]';
        const result = YT_replaceEmoticon(input);
        expect(result).toContain('<img');
        expect(result).toContain('src="https://example.com/emoji.png"');
    });

    test('should handle URL with -- in path', () => {
        const input = '[yt-emoji:https://yt3.ggpht.com/--abc--/photo.jpg]';
        const result = YT_replaceEmoticon(input);
        expect(result).toContain('src="https://yt3.ggpht.com/--abc--/photo.jpg"');
    });

    test('should handle multiple emojis', () => {
        const input = '[yt-emoji:https://example.com/e1.png] hello [yt-emoji:https://example.com/e2.png]';
        const result = YT_replaceEmoticon(input);
        expect(result).toContain('src="https://example.com/e1.png"');
        expect(result).toContain('src="https://example.com/e2.png"');
    });
});
