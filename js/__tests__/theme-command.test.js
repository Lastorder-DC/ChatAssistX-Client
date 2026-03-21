/**
 * @jest-environment jsdom
 */

// chatassist.js를 글로벌 스코프에 로드
window.config = { allowExternalSource: false, allowEmoticon: true, replace: {}, ignoreNickname: 'nightbot,twipkr' };
window.emoticon = { isActive: false, list: {} };

const { loadChatassistGlobal } = require('./helpers/loadChatassist');
loadChatassistGlobal();

function setupJQueryMock() {
    const removedIds = [];
    const appendedAttrs = [];

    const jqMock = jest.fn((selector, attrs) => {
        // $('<link>', { id, rel, type, href }) constructor pattern
        if (attrs && typeof attrs === 'object') {
            var obj = { tag: selector, attrs: attrs };
            obj.on = jest.fn().mockReturnValue(obj);
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

describe('applyTheme', () => {
    beforeEach(() => {
        global.$ = setupJQueryMock();
        global.addChatMessage = jest.fn();
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
    beforeEach(() => {
        global.$ = setupJQueryMock();

        window.config = { allowExternalSource: false, allowEmoticon: true, replace: {}, ignoreNickname: 'nightbot,twipkr' };
        window.chat = { config: {}, isInited: true, count: 0, cur_count: 0 };
        window.verb = { emoticon: "\uC774\uBAA8\uD2F0\uCF58" };
        window.emoticon = { isActive: false };
        window.def_verb = { emoticon: "\uC774\uBAA8\uD2F0\uCF58" };

        global.addChatMessage = jest.fn();
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
