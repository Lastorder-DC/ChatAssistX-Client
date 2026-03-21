/**
 * @jest-environment jsdom
 */

// chatassist.js 로드 시 필요한 전역 변수 설정
window.config = { allowExternalSource: false, allowEmoticon: true, replace: {} };
window.emoticon = { isActive: false, list: {} };

const { applyBadge, anonymizeNickname, genID, KICK_replaceEmoticon } = require('../chatassist');

describe('applyBadge', () => {
    beforeEach(() => {
        // Mock replaceCommand: applyBadge가 내부적으로 호출하는 replaceCommand 함수는
        // chatassist.js에서 이미 정의되어 있으므로 별도 설정 불필요
        // 다만 replaceCommand가 사용하는 전역변수 설정
        window.verb = { emoticon: "이모티콘" };
        window.def_verb = { emoticon: "이모티콘" };
    });

    describe('Naver (Chzzk) badges', () => {
        test('should add streamer badge for naver', () => {
            var result = applyBadge('naver', 'TestUser', 'Hello', { isStreamer: true, isMod: false });
            expect(result.nickname).toContain('streamer.png');
            expect(result.nickname).toContain('class="badge streamer"');
            expect(result.nickname).toContain('TestUser');
        });

        test('should add moderator badge for naver', () => {
            var result = applyBadge('naver', 'ModUser', 'Hello', { isStreamer: false, isMod: true });
            expect(result.nickname).toContain('manager.png');
            expect(result.nickname).toContain('class="badge mod"');
            expect(result.nickname).toContain('<b>ModUser</b>');
        });

        test('should not add badge for regular naver user', () => {
            var result = applyBadge('naver', 'RegularUser', 'Hello', { isStreamer: false, isMod: false });
            expect(result.nickname).toBe('RegularUser');
            expect(result.message).toBe('Hello');
        });
    });

    describe('ci.me badges', () => {
        test('should add streamer badge for cime', () => {
            var result = applyBadge('cime', 'CimeStreamer', 'Hi', { isStreamer: true, isMod: false });
            expect(result.nickname).toContain('STREAMER.webp');
            expect(result.nickname).toContain('class="badge streamer"');
        });

        test('should add moderator badge for cime', () => {
            var result = applyBadge('cime', 'CimeMod', 'Hi', { isStreamer: false, isMod: true });
            expect(result.nickname).toContain('CHAT_MANAGER.webp');
            expect(result.nickname).toContain('class="badge mod"');
        });
    });

    describe('YouTube badges', () => {
        test('should add owner badge for youtube streamer', () => {
            var result = applyBadge('youtube', 'YTOwner', 'Hey', { isStreamer: true, isMod: false });
            expect(result.nickname).toContain('class="badge streamer"');
            expect(result.nickname).toContain('alt="Owner"');
        });

        test('should add moderator SVG badge for youtube mod', () => {
            var result = applyBadge('youtube', 'YTMod', 'Hey', { isStreamer: false, isMod: true });
            expect(result.nickname).toContain('<svg');
            expect(result.nickname).toContain('class="badge mod"');
            expect(result.nickname).toContain('<b>YTMod</b>');
        });
    });

    describe('Twitch (default) badges', () => {
        test('should add broadcaster badge for twitch streamer', () => {
            var result = applyBadge('twitch', 'TwitchStreamer', 'GG', { isStreamer: true, isMod: false });
            expect(result.nickname).toContain('alt="Broadcaster"');
            expect(result.nickname).toContain('class="badge streamer"');
        });

        test('should add moderator badge for twitch mod', () => {
            var result = applyBadge('twitch', 'TwitchMod', 'GG', { isStreamer: false, isMod: true });
            expect(result.nickname).toContain('alt="Moderator"');
            expect(result.nickname).toContain('class="badge mod"');
            expect(result.nickname).toContain('<b>TwitchMod</b>');
        });

        test('should use twitch badges as default for kick platform', () => {
            var result = applyBadge('kick', 'KickStreamer', 'GG', { isStreamer: true, isMod: false });
            expect(result.nickname).toContain('alt="Broadcaster"');
        });
    });
});

describe('anonymizeNickname', () => {
    beforeEach(() => {
        window.config = {
            anon: false
        };

        window.chat = {
            isInited: true
        };

        window.anon = {
            nickdb: {}
        };
    });

    test('should return original nickname when anon is disabled', () => {
        window.config.anon = false;
        var result = anonymizeNickname('OriginalNick', { id: 'user1' }, false);
        expect(result).toBe('OriginalNick');
    });

    test('should return original nickname when chat is not inited', () => {
        window.config.anon = true;
        window.chat.isInited = false;
        var result = anonymizeNickname('OriginalNick', { id: 'user1' }, false);
        expect(result).toBe('OriginalNick');
    });

    test('should return original nickname for sticky messages', () => {
        window.config.anon = true;
        var result = anonymizeNickname('OriginalNick', { id: 'user1' }, true);
        expect(result).toBe('OriginalNick');
    });

    test('should anonymize with default nickname when anon is enabled', () => {
        window.config.anon = true;
        window.config.anon_random = false;
        var result = anonymizeNickname('OriginalNick', { id: 'user1' }, false);
        expect(result).toBe('시청자');
    });

    test('should use custom anon_nickname', () => {
        window.config.anon = true;
        window.config.anon_nickname = '익명';
        window.config.anon_random = false;
        var result = anonymizeNickname('OriginalNick', { id: 'user1' }, false);
        expect(result).toBe('익명');
    });

    test('should append random string when anon_random is enabled', () => {
        window.config.anon = true;
        window.config.anon_nickname = '시청자';
        window.config.anon_random = 'string';
        window.config.random_length = 4;
        var result = anonymizeNickname('OriginalNick', { id: 'user1' }, false);
        expect(result).toMatch(/^시청자 .{4}$/);
    });

    test('should generate fixed random ID for same user with fix_random_id', () => {
        window.config.anon = true;
        window.config.anon_nickname = '시청자';
        window.config.anon_random = 'string';
        window.config.random_length = 4;
        window.config.fix_random_id = true;

        var result1 = anonymizeNickname('User1', { id: 'user1' }, false);
        var result2 = anonymizeNickname('User1', { id: 'user1' }, false);

        // Same user should get the same random ID
        expect(result1).toBe(result2);
    });

    test('should generate different random IDs for different users with fix_random_id', () => {
        window.config.anon = true;
        window.config.anon_nickname = '시청자';
        window.config.anon_random = 'string';
        window.config.random_length = 8;
        window.config.fix_random_id = true;

        var result1 = anonymizeNickname('User1', { id: 'user1' }, false);
        var result2 = anonymizeNickname('User2', { id: 'user2' }, false);

        // Different users should very likely get different IDs (8 char length)
        // This test has extremely low chance of collision
        expect(result1).not.toBe(result2);
    });
});

describe('KICK_replaceEmoticon', () => {

    test('should replace single emote', () => {
        var result = KICK_replaceEmoticon('[emote:123:KickEmote]');
        expect(result).toBe('<img class="kick_emoticon" src="https://files.kick.com/emotes/123/fullsize" alt="KickEmote">');
    });

    test('should replace multiple emotes', () => {
        var result = KICK_replaceEmoticon('[emote:123:EmoteA] text [emote:456:EmoteB]');
        expect(result).toContain('src="https://files.kick.com/emotes/123/fullsize"');
        expect(result).toContain('src="https://files.kick.com/emotes/456/fullsize"');
        expect(result).toContain(' text ');
    });

    test('should not modify messages without emotes', () => {
        var result = KICK_replaceEmoticon('Hello World');
        expect(result).toBe('Hello World');
    });

    test('should preserve surrounding text', () => {
        var result = KICK_replaceEmoticon('before [emote:789:Test] after');
        expect(result).toBe('before <img class="kick_emoticon" src="https://files.kick.com/emotes/789/fullsize" alt="Test"> after');
    });
});
