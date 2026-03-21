/**
 * @jest-environment jsdom
 */

// chatassist.js를 글로벌 스코프에 로드 (모든 함수가 window에 정의됨)
window.config = { allowExternalSource: false, allowEmoticon: true, replace: {}, ignoreNickname: 'nightbot,twipkr' };
window.emoticon = { isActive: false, list: {} };

const { loadChatassistGlobal } = require('./helpers/loadChatassist');
loadChatassistGlobal();

describe('_markPlatformConnected', () => {
    beforeEach(() => {
        window.chat = {
            isInited: false,
            _pendingPlatforms: new Set()
        };

        window.addChatMessage = jest.fn();
    });

    test('should set isInited when single platform connects', () => {
        window.chat._pendingPlatforms = new Set(['youtube']);

        expect(window.chat.isInited).toBe(false);
        _markPlatformConnected('youtube');
        expect(window.chat.isInited).toBe(true);
    });

    test('should ignore unregistered platforms', () => {
        window.chat._pendingPlatforms = new Set(['youtube']);

        _markPlatformConnected('twitch');
        expect(window.chat.isInited).toBe(false);
        expect(window.chat._pendingPlatforms.size).toBe(1);
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
    beforeEach(() => {
        window.chat = {
            isInited: false,
            _pendingPlatforms: new Set()
        };

        window.config = { ignoreNickname: 'nightbot,twipkr' };

        // connect 함수들을 mock으로 대체 (글로벌 스코프이므로 내부 호출도 가로챔)
        window.connect_twitch = jest.fn();
        window.connect_kick = jest.fn();
        window.connect_yt = jest.fn();
        window.connect_naver = jest.fn();
        window.connect_cime = jest.fn();

        window.addChatMessage = jest.fn();
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
