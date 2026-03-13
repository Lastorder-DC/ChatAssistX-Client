/**
 * @jest-environment jsdom
 */

describe('_markPlatformConnected', () => {
    let _markPlatformConnected;

    beforeEach(() => {
        window.chat = {
            isInited: false,
            _pendingPlatforms: new Set()
        };

        // Replicate the function from chatassist.js
        _markPlatformConnected = function(platform) {
            window.chat._pendingPlatforms.delete(platform);
            if (window.chat._pendingPlatforms.size === 0) {
                window.chat.isInited = true;
            }
        };
    });

    test('should set isInited when single platform connects', () => {
        window.chat._pendingPlatforms = new Set(['youtube']);

        expect(window.chat.isInited).toBe(false);
        _markPlatformConnected('youtube');
        expect(window.chat.isInited).toBe(true);
    });

    test('should not set isInited when not all platforms are connected (youtube + naver + cime)', () => {
        window.chat._pendingPlatforms = new Set(['youtube', 'naver', 'cime']);

        _markPlatformConnected('youtube');
        expect(window.chat.isInited).toBe(false);
        expect(window.chat._pendingPlatforms.size).toBe(2);

        _markPlatformConnected('naver');
        expect(window.chat.isInited).toBe(false);
        expect(window.chat._pendingPlatforms.size).toBe(1);

        _markPlatformConnected('cime');
        expect(window.chat.isInited).toBe(true);
        expect(window.chat._pendingPlatforms.size).toBe(0);
    });

    test('should not set isInited when not all platforms are connected (twitch + naver + cime)', () => {
        window.chat._pendingPlatforms = new Set(['twitch', 'naver', 'cime']);

        _markPlatformConnected('twitch');
        expect(window.chat.isInited).toBe(false);

        _markPlatformConnected('naver');
        expect(window.chat.isInited).toBe(false);

        _markPlatformConnected('cime');
        expect(window.chat.isInited).toBe(true);
    });

    test('should handle all five platforms', () => {
        window.chat._pendingPlatforms = new Set(['twitch', 'kick', 'youtube', 'naver', 'cime']);

        _markPlatformConnected('twitch');
        expect(window.chat.isInited).toBe(false);

        _markPlatformConnected('kick');
        expect(window.chat.isInited).toBe(false);

        _markPlatformConnected('youtube');
        expect(window.chat.isInited).toBe(false);

        _markPlatformConnected('naver');
        expect(window.chat.isInited).toBe(false);

        _markPlatformConnected('cime');
        expect(window.chat.isInited).toBe(true);
    });

    test('should handle duplicate calls for same platform gracefully', () => {
        window.chat._pendingPlatforms = new Set(['youtube', 'naver']);

        _markPlatformConnected('youtube');
        expect(window.chat.isInited).toBe(false);

        // Duplicate call for youtube should not break anything
        _markPlatformConnected('youtube');
        expect(window.chat.isInited).toBe(false);

        _markPlatformConnected('naver');
        expect(window.chat.isInited).toBe(true);
    });

    test('should set isInited immediately for single platform (kick only)', () => {
        window.chat._pendingPlatforms = new Set(['kick']);

        _markPlatformConnected('kick');
        expect(window.chat.isInited).toBe(true);
    });
});

describe('connect_chat platform registration', () => {
    let connect_chat;

    beforeEach(() => {
        window.chat = {
            isInited: false,
            _pendingPlatforms: new Set()
        };

        window.config = {};

        // Mock all connect functions
        window.connect_twitch = jest.fn();
        window.connect_kick = jest.fn();
        window.connect_yt = jest.fn();
        window.connect_naver = jest.fn();
        window.connect_cime = jest.fn();

        // Mock addChatMessage
        window.addChatMessage = jest.fn();

        // Replicate connect_chat logic from chatassist.js
        connect_chat = function() {
            window.chat._pendingPlatforms = new Set();

            if(typeof window.config.channelname !== 'undefined' && !!window.config.channelname) {
                window.chat._pendingPlatforms.add('twitch');
            }

            if(typeof window.config.kickid !== 'undefined' && !!window.config.kickid) {
                window.chat._pendingPlatforms.add('kick');
            }

            if(typeof window.config.ytChannel !== 'undefined' && !!window.config.ytChannel) {
                window.chat._pendingPlatforms.add('youtube');
            }

            if(typeof window.config.nvrChannel !== 'undefined' && !!window.config.nvrChannel) {
                window.chat._pendingPlatforms.add('naver');
            }

            if(typeof window.config.cimeChannel !== 'undefined' && !!window.config.cimeChannel) {
                window.chat._pendingPlatforms.add('cime');
            }

            if(window.chat._pendingPlatforms.size === 0) {
                window.addChatMessage("info", "구성된 채널 없음", "연결할 채널이 하나 이상 구성되지 않았습니다.", true, false);
                return;
            }

            if(window.chat._pendingPlatforms.has('twitch')) {
                window.connect_twitch();
            }

            if(window.chat._pendingPlatforms.has('kick')) {
                window.connect_kick();
            }

            if(window.chat._pendingPlatforms.has('youtube')) {
                window.connect_yt();
            }

            if(window.chat._pendingPlatforms.has('naver')) {
                window.connect_naver();
            }

            if(window.chat._pendingPlatforms.has('cime')) {
                window.connect_cime();
            }
        };
    });

    test('should register youtube, naver, cime when all three are configured', () => {
        window.config.ytChannel = '@testchannel';
        window.config.nvrChannel = 'testnaverchannel';
        window.config.cimeChannel = 'testcimechannel';

        connect_chat();

        expect(window.chat._pendingPlatforms).toEqual(new Set(['youtube', 'naver', 'cime']));
        expect(window.connect_yt).toHaveBeenCalled();
        expect(window.connect_naver).toHaveBeenCalled();
        expect(window.connect_cime).toHaveBeenCalled();
    });

    test('should register twitch, naver, cime when all three are configured', () => {
        window.config.channelname = 'testchannel';
        window.config.nvrChannel = 'testnaverchannel';
        window.config.cimeChannel = 'testcimechannel';

        connect_chat();

        expect(window.chat._pendingPlatforms).toEqual(new Set(['twitch', 'naver', 'cime']));
        expect(window.connect_twitch).toHaveBeenCalled();
        expect(window.connect_naver).toHaveBeenCalled();
        expect(window.connect_cime).toHaveBeenCalled();
    });

    test('should register only configured platforms', () => {
        window.config.ytChannel = '@testchannel';

        connect_chat();

        expect(window.chat._pendingPlatforms).toEqual(new Set(['youtube']));
        expect(window.connect_yt).toHaveBeenCalled();
        expect(window.connect_twitch).not.toHaveBeenCalled();
        expect(window.connect_naver).not.toHaveBeenCalled();
        expect(window.connect_cime).not.toHaveBeenCalled();
    });

    test('should not register platforms with empty config values and show info message', () => {
        window.config.channelname = '';
        window.config.ytChannel = '';
        window.config.nvrChannel = '';
        window.config.cimeChannel = '';

        connect_chat();

        expect(window.chat._pendingPlatforms.size).toBe(0);
        expect(window.addChatMessage).toHaveBeenCalledWith(
            "info", "구성된 채널 없음", "연결할 채널이 하나 이상 구성되지 않았습니다.", true, false
        );
    });

    test('should show info message when no channels are configured at all', () => {
        connect_chat();

        expect(window.chat._pendingPlatforms.size).toBe(0);
        expect(window.addChatMessage).toHaveBeenCalledWith(
            "info", "구성된 채널 없음", "연결할 채널이 하나 이상 구성되지 않았습니다.", true, false
        );
        expect(window.connect_twitch).not.toHaveBeenCalled();
        expect(window.connect_kick).not.toHaveBeenCalled();
        expect(window.connect_yt).not.toHaveBeenCalled();
        expect(window.connect_naver).not.toHaveBeenCalled();
        expect(window.connect_cime).not.toHaveBeenCalled();
    });

    test('should register all five platforms when all are configured', () => {
        window.config.channelname = 'testchannel';
        window.config.kickid = 'testkick';
        window.config.ytChannel = '@testchannel';
        window.config.nvrChannel = 'testnaverchannel';
        window.config.cimeChannel = 'testcimechannel';

        connect_chat();

        expect(window.chat._pendingPlatforms).toEqual(new Set(['twitch', 'kick', 'youtube', 'naver', 'cime']));
    });
});
