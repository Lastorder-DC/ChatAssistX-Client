/**
 * @jest-environment jsdom
 */

function setupJQueryMock() {
    const removedIds = [];
    const appendedAttrs = [];

    const jqMock = jest.fn((selector, attrs) => {
        // $('<link>', { id, rel, type, href }) constructor pattern
        if (attrs && typeof attrs === 'object') {
            var obj = { tag: selector, attrs: attrs };
            return obj;
        }
        return {
            html: jest.fn(),
            remove: jest.fn(() => { removedIds.push(selector); }),
            append: jest.fn((item) => { appendedAttrs.push(item); }),
            css: jest.fn()
        };
    });
    jqMock.removedIds = removedIds;
    jqMock.appendedAttrs = appendedAttrs;
    return jqMock;
}

function createApplyTheme() {
    return function(themeValue, showMessage) {
        if(!themeValue) return false;

        $("#chatassistx-theme").remove();

        if(themeValue === "\uCD08\uAE30\uD654" || themeValue === "\uC5C6\uC74C" || themeValue === "\uC81C\uAC70") {
            if(showMessage) addChatMessage("warning", "\uD14C\uB9C8 \uBCC0\uACBD \uC54C\uB9BC", "\uD14C\uB9C8\uAC00 \uCD08\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", true, false);
            return true;
        } else if(themeValue.startsWith("http://") || themeValue.startsWith("https://")) {
            var cssUrl = themeValue.split("?")[0].split("#")[0];
            if(!cssUrl.toLowerCase().endsWith(".css")) {
                if(showMessage) addChatMessage("warning", "\uD14C\uB9C8 \uBCC0\uACBD \uC54C\uB9BC", "CSS \uD30C\uC77C\uB9CC \uBD88\uB7EC\uC62C \uC218 \uC788\uC2B5\uB2C8\uB2E4. (.css \uD655\uC7A5\uC790 \uD544\uC694)", true, false);
                return false;
            }
            $("head").append($('<link>', { id: 'chatassistx-theme', rel: 'stylesheet', type: 'text/css', href: themeValue }));
            if(showMessage) addChatMessage("warning", "\uD14C\uB9C8 \uBCC0\uACBD \uC54C\uB9BC", "\uC678\uBD80 \uD14C\uB9C8\uAC00 \uC801\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", true, false);
            return true;
        } else {
            var themeName = themeValue.replace(/[^a-zA-Z0-9_-]/g, "");
            if(!themeName) {
                if(showMessage) addChatMessage("warning", "\uD14C\uB9C8 \uBCC0\uACBD \uC54C\uB9BC", "\uC62C\uBC14\uB978 \uD14C\uB9C8 \uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.", true, false);
                return false;
            }
            $("head").append($('<link>', { id: 'chatassistx-theme', rel: 'stylesheet', type: 'text/css', href: './themes/' + themeName + '/index.css' }));
            if(showMessage) addChatMessage("warning", "\uD14C\uB9C8 \uBCC0\uACBD \uC54C\uB9BC", "\uD14C\uB9C8 '" + themeName + "'\uC774(\uAC00) \uC801\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", true, false);
            return true;
        }
    };
}

describe('applyTheme', () => {
    let applyTheme;

    beforeEach(() => {
        global.$ = setupJQueryMock();
        global.addChatMessage = jest.fn();
        applyTheme = createApplyTheme();
    });

    test('should apply local theme', () => {
        const result = applyTheme("grey_round", true);
        expect(result).toBe(true);
        expect(global.$.appendedAttrs.length).toBe(1);
        expect(global.$.appendedAttrs[0].attrs.href).toBe('./themes/grey_round/index.css');
        expect(global.$.appendedAttrs[0].attrs.id).toBe('chatassistx-theme');
    });

    test('should reject non-css external URL', () => {
        const result = applyTheme("https://evil.com/malware.js", true);
        expect(result).toBe(false);
        expect(global.$.appendedAttrs.length).toBe(0);
        expect(global.addChatMessage).toHaveBeenCalledWith(
            "warning", expect.any(String),
            expect.stringContaining("CSS"),
            true, false
        );
    });

    test('should accept .css external URL', () => {
        const result = applyTheme("https://example.com/theme.css", true);
        expect(result).toBe(true);
        expect(global.$.appendedAttrs.length).toBe(1);
        expect(global.$.appendedAttrs[0].attrs.href).toBe('https://example.com/theme.css');
    });

    test('should reset theme', () => {
        const result = applyTheme("\uCD08\uAE30\uD654", true);
        expect(result).toBe(true);
        expect(global.$.appendedAttrs.length).toBe(0);
        expect(global.addChatMessage).toHaveBeenCalledWith(
            "warning", expect.any(String),
            expect.stringContaining("\uCD08\uAE30\uD654"),
            true, false
        );
    });

    test('should sanitize theme name to prevent path traversal', () => {
        const result = applyTheme("../../../etc/passwd", true);
        expect(result).toBe(true);
        expect(global.$.appendedAttrs[0].attrs.href).not.toContain('..');
        expect(global.$.appendedAttrs[0].attrs.href).toBe('./themes/etcpasswd/index.css');
    });

    test('should reject .js external URL', () => {
        const result = applyTheme("https://example.com/script.js", true);
        expect(result).toBe(false);
        expect(global.$.appendedAttrs.length).toBe(0);
    });

    test('should accept .css URL with query params', () => {
        const result = applyTheme("https://example.com/theme.css?v=2", true);
        expect(result).toBe(true);
        expect(global.$.appendedAttrs.length).toBe(1);
        expect(global.$.appendedAttrs[0].attrs.href).toBe('https://example.com/theme.css?v=2');
    });

    test('should return false if no theme value provided', () => {
        const result = applyTheme("", false);
        expect(result).toBe(false);
    });

    test('should show warning for theme name with only special characters', () => {
        const result = applyTheme("@@@", true);
        expect(result).toBe(false);
        expect(global.$.appendedAttrs.length).toBe(0);
        expect(global.addChatMessage).toHaveBeenCalled();
    });

    test('should not show messages when showMessage is false', () => {
        applyTheme("grey_round", false);
        expect(global.addChatMessage).not.toHaveBeenCalled();
        expect(global.$.appendedAttrs.length).toBe(1);
        expect(global.$.appendedAttrs[0].attrs.href).toBe('./themes/grey_round/index.css');
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

describe('replaceCommand - uses applyTheme', () => {
    let replaceCommand, applyTheme;

    beforeEach(() => {
        global.$ = setupJQueryMock();

        window.config = { allowExternalSource: false, allowEmoticon: true, replace: {} };
        window.chat = { config: {}, isInited: true, count: 0, cur_count: 0 };
        window.verb = { emoticon: "\uC774\uBAA8\uD2F0\uCF58" };
        window.emoticon = { isActive: false };
        window.def_verb = { emoticon: "\uC774\uBAA8\uD2F0\uCF58" };

        global.addChatMessage = jest.fn();
        applyTheme = createApplyTheme();

        replaceCommand = function(match, command, commandarg, offset) {
            var message = "";
            switch (command) {
                case "\uCC44\uD305\uCD08\uAE30\uD654":
                    $(".chat_container").html("");
                    break;
                case "\uD14C\uB9C8":
                    message = commandarg.replace("~\uD14C\uB9C8", "").trim();
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
        const result = replaceCommand("~\uD14C\uB9C8 grey_round", "\uD14C\uB9C8", "~\uD14C\uB9C8 grey_round", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedAttrs.length).toBe(1);
        expect(global.$.appendedAttrs[0].attrs.href).toBe('./themes/grey_round/index.css');
    });

    test('should return match if no theme name provided', () => {
        const result = replaceCommand("~\uD14C\uB9C8", "\uD14C\uB9C8", "~\uD14C\uB9C8", 0);
        expect(result).toBe("~\uD14C\uB9C8");
    });

    test('should reset theme via command', () => {
        const result = replaceCommand("~\uD14C\uB9C8 \uCD08\uAE30\uD654", "\uD14C\uB9C8", "~\uD14C\uB9C8 \uCD08\uAE30\uD654", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.addChatMessage).toHaveBeenCalled();
    });

    test('should accept .css external URL via command', () => {
        const result = replaceCommand("~\uD14C\uB9C8 https://example.com/theme.css", "\uD14C\uB9C8", "~\uD14C\uB9C8 https://example.com/theme.css", 0);
        expect(result).toBe("COMMAND_DO_NOT_PRINT");
        expect(global.$.appendedAttrs.length).toBe(1);
        expect(global.$.appendedAttrs[0].attrs.href).toBe('https://example.com/theme.css');
    });
});
