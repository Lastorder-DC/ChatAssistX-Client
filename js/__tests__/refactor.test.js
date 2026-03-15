/**
 * @jest-environment jsdom
 */

describe('applyBadge', () => {
    let applyBadge;
    let replaceCommandCalls;

    beforeEach(() => {
        replaceCommandCalls = [];

        // Mock replaceCommand to track calls
        window.replaceCommand = function(match, command, commandarg) {
            replaceCommandCalls.push({ match, command, commandarg });
            return "COMMAND_DO_NOT_PRINT";
        };

        // Replicate applyBadge from chatassist.js
        applyBadge = function(platform, nickname, message, ext_args) {
            function replaceCommand(match, p1, p2) {
                return window.replaceCommand(match, p1, p2);
            }

            if(platform == "naver") {
                if(ext_args.isStreamer) {
                    message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                    nickname = '<img style="vertical-align: middle;" src="https://ssl.pstatic.net/static/nng/glive/icon/streamer.png" alt="스트리머" class="badge streamer">&nbsp;' + nickname;
                }
                if(ext_args.isMod) {
                    nickname = "<b>" + nickname + "</b>";
                    message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                    nickname = '<img style="vertical-align: middle;" src="https://ssl.pstatic.net/static/nng/glive/icon/manager.png" alt="채팅 운영자" class="badge mod">&nbsp;' + nickname;
                }
            } else if(platform == "cime") {
                if(ext_args.isStreamer) {
                    message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                    nickname = '<img style="vertical-align: middle;" src="https://streaming.cf.ci.me/public/assets/images/badge/STREAMER.webp" alt="스트리머" class="badge streamer">&nbsp;' + nickname;
                }
                if(ext_args.isMod) {
                    nickname = "<b>" + nickname + "</b>";
                    message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                    nickname = '<img style="vertical-align: middle;" src="https://streaming.cf.ci.me/public/assets/images/badge/CHAT_MANAGER.webp" alt="모더레이터" class="badge mod">&nbsp;' + nickname;
                }
            } else if(platform == "youtube") {
                if(ext_args.isStreamer) {
                    message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                    nickname = '<img style="vertical-align: middle;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsSAAALEgHS3X78AAAA3klEQVQ4y2NgGLng+5P9/78/2f+fJA1/vz3vRhb7++1599N1jv+frnPEKodsAROM8evDLYZXe9NLfrw8A5d8f7an5P/vLwz/f39heH+utwQm/uPlmf+v9qaX/PpwC24wC9xEVl6Gv9+eM7w5kMnw4Xzvf1YBNYb3p5rgCn88Pcjw9f7m/78/3GJ4cyATrgfDIFYBNbjgl1srsHof2WB0PXCvMbHxMpAKkPXADWITVGck1SBkPUzIEoys3EQbgq4WxSBkPxMC6GpRDEKOBYLhg6YW1UWCJLhIkEYuGsYAABF9W/Yuoo7SAAAAAElFTkSuQmCC" alt="Owner" class="badge streamer">&nbsp;' + nickname;
                }
                if(ext_args.isMod) {
                    nickname = "<b>" + nickname + "</b>";
                    message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                    nickname = '<svg style="vertical-align: middle; width: 18px; height: 18px;" viewBox="0 0 16 16" class="badge mod"><path fill="#5e84f1" d="M9.64589146,7.05569719 C9.83346524,6.562372 9.93617022,6.02722257 9.93617022,5.46808511 C9.93617022,3.00042984 7.93574038,1 5.46808511,1 C4.67485908,1 3.93000562,1.21498266 3.2874668,1.59379395 L5.09918785,3.40551499 L3.40551499,5.09918785 L1.59379395,3.2874668 C1.21498266,3.93000562 1,4.67485908 1,5.46808511 C1,7.93574038 3.00042984,9.93617022 5.46808511,9.93617022 C6.02722257,9.93617022 6.562372,9.83346524 7.05569719,9.64589146 L12.4098057,15 L15,12.4098057 L9.64589146,7.05569719 Z"></path></svg>&nbsp;' + nickname;
                }
            } else {
                if(ext_args.isStreamer) {
                    message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                    nickname = '<img style="vertical-align: middle;" src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1" alt="Broadcaster" class="badge streamer">&nbsp;' + nickname;
                }
                if(ext_args.isMod) {
                    nickname = "<b>" + nickname + "</b>";
                    nickname = '<img style="vertical-align: middle;" src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1" alt="Moderator" class="badge mod">&nbsp;' + nickname;
                }
            }

            return { nickname: nickname, message: message };
        };
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
    let anonymizeNickname;
    let genID;

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

        genID = function(type, length) {
            var result = '';
            var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            if(type == "string") {
                for(var i = 0; i < length; i++) {
                    result += characters.charAt(Math.floor(Math.random() * characters.length));
                }
            } else {
                for(var i = 0; i < length; i++) {
                    result += (Math.floor(Math.random() * 9) + 1).toString();
                }
            }
            return result;
        };

        // Replicate anonymizeNickname from chatassist.js
        anonymizeNickname = function(nickname, ext_args, sticky) {
            if(!window.config.anon || !window.chat.isInited || sticky) return nickname;

            if(typeof window.config.anon_nickname === 'undefined') {
                window.config.anon_nickname = "시청자";
            }

            nickname = window.config.anon_nickname;
            if(window.config.anon_random !== false) {
                if(typeof window.config.anon_random === 'undefined') {
                    window.config.anon_random = "string";
                }
                if(typeof window.config.random_length === 'undefined') {
                    window.config.random_length = 4;
                }
                if(typeof window.config.fix_random_id === 'undefined') {
                    window.config.fix_random_id = false;
                }

                var rand_id;
                if(window.config.fix_random_id) {
                    if(typeof window.anon.nickdb[ext_args.id] === 'undefined') {
                        window.anon.nickdb[ext_args.id] = {};
                        window.anon.nickdb[ext_args.id].type = window.config.anon_random;
                        window.anon.nickdb[ext_args.id].length = window.config.random_length;
                        window.anon.nickdb[ext_args.id].rand_id = genID(window.config.anon_random, window.config.random_length);
                    }

                    if(window.anon.nickdb[ext_args.id].type != window.config.anon_random || window.anon.nickdb[ext_args.id].length != window.config.random_length) {
                        window.anon.nickdb[ext_args.id].rand_id = genID(window.config.anon_random, window.config.random_length);
                    }

                    rand_id = window.anon.nickdb[ext_args.id].rand_id;
                } else {
                    rand_id = genID(window.config.anon_random, window.config.random_length);
                }

                nickname += " " + rand_id;
            }

            return nickname;
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
    let KICK_replaceEmoticon;

    beforeEach(() => {
        // Replicate KICK_replaceEmoticon (renamed from KICK_replaceTwitchEmoticon)
        KICK_replaceEmoticon = function(message) {
            const regex = /\[emote:(\d+):([^\]]+)\]/g;
            const replacedMessage = message.replace(regex, (match, number, text) => {
                const imageUrl = `https://files.kick.com/emotes/${number}/fullsize`;
                return `<img class="kick_emoticon" src="${imageUrl}" alt="${text}">`;
            });
            return replacedMessage;
        };
    });

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
