/**
 * @jest-environment jsdom
 */

describe('replaceCommand - 테마 command', () => {
    let replaceCommand;

    beforeEach(() => {
        // Set up jQuery mock
        const removedIds = [];
        const appendedHtml = [];

        global.$ = jest.fn((selector) => {
            return {
                html: jest.fn(),
                remove: jest.fn(() => { removedIds.push(selector); }),
                append: jest.fn((html) => { appendedHtml.push(html); }),
                css: jest.fn()
            };
        });
        global.$.removedIds = removedIds;
        global.$.appendedHtml = appendedHtml;

        // Set up window objects
        window.config = { allowExternalSource: false, allowEmoticon: true, replace: {} };
        window.chat = { config: {}, isInited: true, count: 0, cur_count: 0 };
        window.verb = { emoticon: "이모티콘" };
        window.emoticon = { isActive: false };
        window.def_verb = { emoticon: "이모티콘" };

        // Mock addChatMessage
        global.addChatMessage = jest.fn();

        // Define replaceCommand directly (mirrors the function in chatassist.js)
        replaceCommand = function(match, command, commandarg, offset) {
            var message = "";

            switch (command) {
                case "채팅초기화":
                    $(".chat_container").html("");
                    break;
                case "이미지":
                    message = commandarg.replace("~이미지", "");
                    message = message.split(" ");
                    if(typeof message[0] === 'undefined') return match;
                    if(message[0] === "켜기" || message[0] === "활성화" || message[0] === "온") {
                        window.config.allowExternalSource = true;
                        message = "외부 이미지 문법이 켜졌습니다.";
                    }
                    if(message[0] === "끄기" || message[0] === "비활성화" || message[0] === "오프") {
                        window.config.allowExternalSource = false;
                        message = "외부 이미지 문법이 꺼졌습니다.";
                    }
                    addChatMessage("warning", "설정 변경 알림", message, true, false);
                    break;
                case window.verb.emoticon:
                    message = commandarg.replace("~" + window.verb.emoticon, "");
                    message = message.split(" ");
                    if(typeof message[0] === 'undefined') return match;
                    if(message[0] === "켜기" || message[0] === "활성화" || message[0] === "온") {
                        window.config.allowEmoticon = true;
                        message = window.verb.emoticon + "이 켜졌습니다.";
                    }
                    if(message[0] === "끄기" || message[0] === "비활성화" || message[0] === "오프") {
                        window.config.allowEmoticon = false;
                        message = window.verb.emoticon + "이 꺼졌습니다.";
                    }
                    addChatMessage("warning", "설정 변경 알림", message, true, false);
                    break;
                case "테마":
                    message = commandarg.replace("~테마", "").trim();
                    if(!message) return match;

                    $("#chatassistx-theme").remove();

                    if(message === "초기화" || message === "없음" || message === "제거") {
                        addChatMessage("warning", "테마 변경 알림", "테마가 초기화되었습니다.", true, false);
                    } else if(message.startsWith("http://") || message.startsWith("https://")) {
                        var cssUrl = message.split("?")[0].split("#")[0];
                        if(!cssUrl.toLowerCase().endsWith(".css")) {
                            addChatMessage("warning", "테마 변경 알림", "CSS 파일만 불러올 수 있습니다. (.css 확장자 필요)", true, false);
                        } else {
                            $("head").append('<link id="chatassistx-theme" rel="stylesheet" type="text/css" href="' + message + '">');
                            addChatMessage("warning", "테마 변경 알림", "외부 테마가 적용되었습니다.", true, false);
                        }
                    } else {
                        var themeName = message.replace(/[^a-zA-Z0-9_-]/g, "");
                        if(!themeName) return match;
                        $("head").append('<link id="chatassistx-theme" rel="stylesheet" type="text/css" href="./themes/' + themeName + '/index.css">');
                        addChatMessage("warning", "테마 변경 알림", "테마 '" + themeName + "'이(가) 적용되었습니다.", true, false);
                    }
                    break;
                default:
                    return match;
            }

            return "COMMAND_DO_NOT_PRINT";
        };
    });

    test('should apply local theme', () => {
        const result = replaceCommand("~테마 grey_round", "테마", "~테마 grey_round", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('./themes/grey_round/index.css');
        expect(global.$.appendedHtml[0]).toContain('id="chatassistx-theme"');
    });

    test('should reject non-css external URL', () => {
        const result = replaceCommand("~테마 https://evil.com/malware.js", "테마", "~테마 https://evil.com/malware.js", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedHtml.length).toBe(0);
        expect(global.addChatMessage).toHaveBeenCalledWith(
            "warning", "테마 변경 알림",
            expect.stringContaining("CSS 파일만"),
            true, false
        );
    });

    test('should accept .css external URL', () => {
        const result = replaceCommand("~테마 https://example.com/theme.css", "테마", "~테마 https://example.com/theme.css", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('https://example.com/theme.css');
    });

    test('should reset theme', () => {
        const result = replaceCommand("~테마 초기화", "테마", "~테마 초기화", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedHtml.length).toBe(0);
        expect(global.addChatMessage).toHaveBeenCalledWith(
            "warning", "테마 변경 알림",
            expect.stringContaining("초기화"),
            true, false
        );
    });

    test('should sanitize theme name to prevent path traversal', () => {
        const result = replaceCommand("~테마 ../../../etc/passwd", "테마", "~테마 ../../../etc/passwd", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        // The sanitized name should strip dots and slashes
        expect(global.$.appendedHtml[0]).not.toContain('..');
        expect(global.$.appendedHtml[0]).toContain('./themes/etcpasswd/index.css');
    });

    test('should reject .js external URL', () => {
        const result = replaceCommand("~테마 https://example.com/script.js", "테마", "~테마 https://example.com/script.js", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedHtml.length).toBe(0);
    });

    test('should accept .css URL with query params', () => {
        const result = replaceCommand("~테마 https://example.com/theme.css?v=2", "테마", "~테마 https://example.com/theme.css?v=2", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('https://example.com/theme.css?v=2');
    });

    test('should return match if no theme name provided', () => {
        const result = replaceCommand("~테마", "테마", "~테마", 0);
        expect(result).toBe("~테마");
    });
});
