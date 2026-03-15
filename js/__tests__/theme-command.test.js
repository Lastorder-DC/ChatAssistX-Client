/**
 * @jest-environment jsdom
 */

describe('applyTheme', () => {
    let applyTheme;

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

        // Mock addChatMessage
        global.addChatMessage = jest.fn();

        // Define applyTheme directly (mirrors the function in chatassist.js)
        applyTheme = function(themeValue, showMessage) {
            if(!themeValue) return false;

            $("#chatassistx-theme").remove();

            if(themeValue === "초기화" || themeValue === "없음" || themeValue === "제거") {
                if(showMessage) addChatMessage("warning", "테마 변경 알림", "테마가 초기화되었습니다.", true, false);
                return true;
            } else if(themeValue.startsWith("http://") || themeValue.startsWith("https://")) {
                var cssUrl = themeValue.split("?")[0].split("#")[0];
                if(!cssUrl.toLowerCase().endsWith(".css")) {
                    if(showMessage) addChatMessage("warning", "테마 변경 알림", "CSS 파일만 불러올 수 있습니다. (.css 확장자 필요)", true, false);
                    return false;
                }
                $("head").append('<link id="chatassistx-theme" rel="stylesheet" type="text/css" href="' + themeValue + '">');
                if(showMessage) addChatMessage("warning", "테마 변경 알림", "외부 테마가 적용되었습니다.", true, false);
                return true;
            } else {
                var themeName = themeValue.replace(/[^a-zA-Z0-9_-]/g, "");
                if(!themeName) {
                    if(showMessage) addChatMessage("warning", "테마 변경 알림", "올바른 테마 이름을 입력해주세요.", true, false);
                    return false;
                }
                $("head").append('<link id="chatassistx-theme" rel="stylesheet" type="text/css" href="./themes/' + themeName + '/index.css">');
                if(showMessage) addChatMessage("warning", "테마 변경 알림", "테마 \'" + themeName + "\'이(가) 적용되었습니다.", true, false);
                return true;
            }
        };
    });

    test('should apply local theme', () => {
        const result = applyTheme("grey_round", true);
        expect(result).toBe(true);
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('./themes/grey_round/index.css');
        expect(global.$.appendedHtml[0]).toContain('id="chatassistx-theme"');
    });

    test('should reject non-css external URL', () => {
        const result = applyTheme("https://evil.com/malware.js", true);
        expect(result).toBe(false);
        expect(global.$.appendedHtml.length).toBe(0);
        expect(global.addChatMessage).toHaveBeenCalledWith(
            "warning", "테마 변경 알림",
            expect.stringContaining("CSS 파일만"),
            true, false
        );
    });

    test('should accept .css external URL', () => {
        const result = applyTheme("https://example.com/theme.css", true);
        expect(result).toBe(true);
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('https://example.com/theme.css');
    });

    test('should reset theme', () => {
        const result = applyTheme("초기화", true);
        expect(result).toBe(true);
        expect(global.$.appendedHtml.length).toBe(0);
        expect(global.addChatMessage).toHaveBeenCalledWith(
            "warning", "테마 변경 알림",
            expect.stringContaining("초기화"),
            true, false
        );
    });

    test('should sanitize theme name to prevent path traversal', () => {
        const result = applyTheme("../../../etc/passwd", true);
        expect(result).toBe(true);
        // The sanitized name should strip dots and slashes
        expect(global.$.appendedHtml[0]).not.toContain('..');
        expect(global.$.appendedHtml[0]).toContain('./themes/etcpasswd/index.css');
    });

    test('should reject .js external URL', () => {
        const result = applyTheme("https://example.com/script.js", true);
        expect(result).toBe(false);
        expect(global.$.appendedHtml.length).toBe(0);
    });

    test('should accept .css URL with query params', () => {
        const result = applyTheme("https://example.com/theme.css?v=2", true);
        expect(result).toBe(true);
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('https://example.com/theme.css?v=2');
    });

    test('should return false if no theme value provided', () => {
        const result = applyTheme("", false);
        expect(result).toBe(false);
    });

    test('should show warning for theme name with only special characters', () => {
        const result = applyTheme("@@@", true);
        expect(result).toBe(false);
        expect(global.$.appendedHtml.length).toBe(0);
        expect(global.addChatMessage).toHaveBeenCalledWith(
            "warning", "테마 변경 알림",
            expect.stringContaining("올바른 테마 이름"),
            true, false
        );
    });

    test('should not show messages when showMessage is false', () => {
        applyTheme("grey_round", false);
        expect(global.addChatMessage).not.toHaveBeenCalled();
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('./themes/grey_round/index.css');
    });

    test('should not show error messages when showMessage is false', () => {
        applyTheme("https://evil.com/malware.js", false);
        expect(global.addChatMessage).not.toHaveBeenCalled();
    });

    test('should remove existing theme before applying new one', () => {
        applyTheme("gaming", false);
        expect(global.$.removedIds).toContain('#chatassistx-theme');
    });
});

describe('replaceCommand - 테마 command with applyTheme', () => {
    let replaceCommand, applyTheme;

    beforeEach(() => {
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

        window.config = { allowExternalSource: false, allowEmoticon: true, replace: {} };
        window.chat = { config: {}, isInited: true, count: 0, cur_count: 0 };
        window.verb = { emoticon: "이모티콘" };
        window.emoticon = { isActive: false };
        window.def_verb = { emoticon: "이모티콘" };

        global.addChatMessage = jest.fn();

        // Define applyTheme
        applyTheme = function(themeValue, showMessage) {
            if(!themeValue) return false;
            $("#chatassistx-theme").remove();
            if(themeValue === "초기화" || themeValue === "없음" || themeValue === "제거") {
                if(showMessage) addChatMessage("warning", "테마 변경 알림", "테마가 초기화되었습니다.", true, false);
                return true;
            } else if(themeValue.startsWith("http://") || themeValue.startsWith("https://")) {
                var cssUrl = themeValue.split("?")[0].split("#")[0];
                if(!cssUrl.toLowerCase().endsWith(".css")) {
                    if(showMessage) addChatMessage("warning", "테마 변경 알림", "CSS 파일만 불러올 수 있습니다. (.css 확장자 필요)", true, false);
                    return false;
                }
                $("head").append('<link id="chatassistx-theme" rel="stylesheet" type="text/css" href="' + themeValue + '">');
                if(showMessage) addChatMessage("warning", "테마 변경 알림", "외부 테마가 적용되었습니다.", true, false);
                return true;
            } else {
                var themeName = themeValue.replace(/[^a-zA-Z0-9_-]/g, "");
                if(!themeName) {
                    if(showMessage) addChatMessage("warning", "테마 변경 알림", "올바른 테마 이름을 입력해주세요.", true, false);
                    return false;
                }
                $("head").append('<link id="chatassistx-theme" rel="stylesheet" type="text/css" href="./themes/' + themeName + '/index.css">');
                if(showMessage) addChatMessage("warning", "테마 변경 알림", "테마 \'" + themeName + "\'이(가) 적용되었습니다.", true, false);
                return true;
            }
        };

        // Define replaceCommand that uses applyTheme
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
                    applyTheme(message, true);
                    break;
                default:
                    return match;
            }

            return "COMMAND_DO_NOT_PRINT";
        };
    });

    test('should apply local theme via command', () => {
        const result = replaceCommand("~테마 grey_round", "테마", "~테마 grey_round", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('./themes/grey_round/index.css');
    });

    test('should return match if no theme name provided', () => {
        const result = replaceCommand("~테마", "테마", "~테마", 0);
        expect(result).toBe("~테마");
    });

    test('should reset theme via command', () => {
        const result = replaceCommand("~테마 초기화", "테마", "~테마 초기화", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.addChatMessage).toHaveBeenCalledWith(
            "warning", "테마 변경 알림",
            expect.stringContaining("초기화"),
            true, false
        );
    });

    test('should accept .css external URL via command', () => {
        const result = replaceCommand("~테마 https://example.com/theme.css", "테마", "~테마 https://example.com/theme.css", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedHtml.length).toBe(1);
        expect(global.$.appendedHtml[0]).toContain('https://example.com/theme.css');
    });
});
