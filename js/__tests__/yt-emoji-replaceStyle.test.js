/**
 * @jest-environment jsdom
 */

/**
 * 유튜브 이모지 URL에 replaceStyle에서 변환할 수 있는 패턴(-- ~~ __ 등)이
 * 포함되었을 때 올바르게 처리되는지 테스트
 */

// chatassist.js에서 replaceStyle 함수 복제
function replaceStyle(message) {
    if(window.config.allowExternalSource) {
        var image = message.match(/\[img ([^\]\"]*)\]/);
        if(image !== null && typeof image[1] !== 'undefined') {
            message = '<img class="extimg" src="https://proxy.chatassistx.cc/image/' + image[1] + '">';
        }
        message = message.replace(/\[img ([^\]\"]*)\]/gi, "");
        return message;
    }

    message = message.replace(/\[b\](.*)\[\/b\]/gi, "<b>$1</b>");
    message = message.replace(/\[i\](.*)\[\/i\]/gi, "<i>$1</i>");
    message = message.replace(/\[s\](.*)\[\/s\]/gi, "<strike>$1</strike>");

    message = message.replace(/'''(.*)'''/gi, "<b>$1</b>");
    message = message.replace(/''(.*)''/gi, "<i>$1</i>");
    message = message.replace(/~~(.*)~~/gi, "<strike>$1</strike>");
    message = message.replace(/--(.*)--/gi, "<strike>$1</strike>");
    message = message.replace(/__(.*)__/gi, "<u>$1</u>");

    message = message.replace(/\[b\](.*)/gi, "<b>$1</b>");
    message = message.replace(/\[i\](.*)/gi, "<i>$1</i>");
    message = message.replace(/\[s\](.*)/gi, "<strike>$1</strike>");

    message = message.replace(/\[br\]/gi, "<br />");

    return message;
}

// chatassist.js에서 YT_replaceEmoticon 함수 복제
function YT_replaceEmoticon(message) {
    var regex = /\[yt-emoji:(https?:\/\/[^\]]+)\]/g;
    return message.replace(regex, function(match, url) {
        return '<img class="yt_emoticon" src="' + url + '" alt="YouTube emoji" style="vertical-align: middle; height: 1.5em; width: 1.5em;">';
    });
}

// addChatMessage에서 사용하는 유튜브 이모지 보호 로직 복제
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
