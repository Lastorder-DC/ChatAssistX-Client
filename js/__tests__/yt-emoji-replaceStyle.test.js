/**
 * @jest-environment jsdom
 */

/**
 * 유튜브 이모지 URL에 replaceStyle에서 변환할 수 있는 패턴(-- ~~ __ 등)이
 * 포함되었을 때 올바르게 처리되는지 테스트
 */

// chatassist.js에서 함수 로드
window.config = { allowExternalSource: false, allowEmoticon: true, replace: {} };
window.emoticon = { isActive: false, list: {} };

const { replaceStyle, YT_replaceEmoticon } = require('../chatassist');

// addChatMessage에서 사용하는 유튜브 이모지 보호 로직 복제
// 이 로직은 addChatMessage 함수 내부에 인라인으로 존재하므로 별도 export 불가
function processYouTubeMessage(message) {
    var ytEmojiPlaceholders = [];
    message = message.replace(/\[yt-emoji:(https?:\/\/[^\]]+)\]/g, function(match) {
        var idx = ytEmojiPlaceholders.length;
        ytEmojiPlaceholders.push(match);
        return '\x00YTEMOJI' + idx + '\x00';
    });

    message = replaceStyle(message);

    for(var i = 0; i < ytEmojiPlaceholders.length; i++) {
        message = message.replace('\x00YTEMOJI' + i + '\x00', ytEmojiPlaceholders[i]);
    }

    message = YT_replaceEmoticon(message);
    return message;
}

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

describe('YouTube emoji protection from replaceStyle', () => {
    beforeEach(() => {
        window.config = { allowExternalSource: false };
    });

    test('should preserve emoji URL containing -- pattern', () => {
        const input = '[yt-emoji:https://yt3.ggpht.com/--abc--/photo.jpg]';
        const result = processYouTubeMessage(input);
        expect(result).toContain('src="https://yt3.ggpht.com/--abc--/photo.jpg"');
        expect(result).not.toContain('<strike>');
    });

    test('should preserve emoji URL containing ~~ pattern', () => {
        const input = '[yt-emoji:https://yt3.ggpht.com/~~abc~~/photo.jpg]';
        const result = processYouTubeMessage(input);
        expect(result).toContain('src="https://yt3.ggpht.com/~~abc~~/photo.jpg"');
        expect(result).not.toContain('<strike>');
    });

    test('should preserve emoji URL containing __ pattern', () => {
        const input = '[yt-emoji:https://yt3.ggpht.com/__abc__/photo.jpg]';
        const result = processYouTubeMessage(input);
        expect(result).toContain('src="https://yt3.ggpht.com/__abc__/photo.jpg"');
        expect(result).not.toContain('<u>');
    });

    test('should still apply replaceStyle to non-emoji text alongside emoji', () => {
        const input = '--strikethrough-- [yt-emoji:https://yt3.ggpht.com/--abc--/photo.jpg]';
        const result = processYouTubeMessage(input);
        expect(result).toContain('<strike>strikethrough</strike>');
        expect(result).toContain('src="https://yt3.ggpht.com/--abc--/photo.jpg"');
    });

    test('should handle multiple emojis with -- in URLs', () => {
        const input = '[yt-emoji:https://yt3.ggpht.com/--a--/e1.png] text [yt-emoji:https://yt3.ggpht.com/--b--/e2.png]';
        const result = processYouTubeMessage(input);
        expect(result).toContain('src="https://yt3.ggpht.com/--a--/e1.png"');
        expect(result).toContain('src="https://yt3.ggpht.com/--b--/e2.png"');
        expect(result).not.toContain('<strike>');
    });

    test('should handle emoji URL with realistic YouTube emoji path containing --', () => {
        // 실제 유튜브 이모지 URL 형식 예시
        const input = '[yt-emoji:https://lh3.googleusercontent.com/--Md3eBq7B20--/AAAAAAAAAAI/AAAAAAAAAAA/photo.jpg]';
        const result = processYouTubeMessage(input);
        expect(result).toContain('src="https://lh3.googleusercontent.com/--Md3eBq7B20--/AAAAAAAAAAI/AAAAAAAAAAA/photo.jpg"');
        expect(result).not.toContain('<strike>');
    });

    test('should handle message with only text (no emoji) normally', () => {
        const input = '--hello-- world';
        const result = processYouTubeMessage(input);
        expect(result).toBe('<strike>hello</strike> world');
    });

    test('should handle message with emoji but no problematic patterns in URL', () => {
        const input = 'hello [yt-emoji:https://example.com/emoji.png] world';
        const result = processYouTubeMessage(input);
        expect(result).toContain('src="https://example.com/emoji.png"');
        expect(result).toContain('hello');
        expect(result).toContain('world');
    });
});
