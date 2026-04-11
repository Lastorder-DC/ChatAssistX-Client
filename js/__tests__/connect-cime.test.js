/**
 * @jest-environment jsdom
 */

// chatassist.js를 글로벌 스코프에 로드
window.config = { allowExternalSource: false, allowEmoticon: true, replace: {}, ignoreNickname: 'nightbot,twipkr' };
window.emoticon = { isActive: false, list: {} };

const { loadChatassistGlobal } = require('./helpers/loadChatassist');
loadChatassistGlobal();

describe('ci.me WebSocket Client (connect_cime)', () => {
    let mockWebSocket;
    let MockWebSocketClass;
    let capturedOnOpen;
    let capturedOnMessage;
    let capturedOnClose;
    let capturedOnError;
    let mockXHR;

    function createMockXHR(status, responseData) {
        return {
            open: jest.fn(),
            setRequestHeader: jest.fn(),
            send: jest.fn(function() {
                this.readyState = 4;
                this.status = status;
                this.responseText = JSON.stringify(responseData);
                if (this.onreadystatechange) this.onreadystatechange();
            }),
            readyState: 0,
            status: 0,
            responseText: '',
            onreadystatechange: null
        };
    }

    beforeEach(() => {
        capturedOnOpen = null;
        capturedOnMessage = null;
        capturedOnClose = null;
        capturedOnError = null;

        mockWebSocket = {
            send: jest.fn(),
            close: jest.fn(),
            readyState: 1,
            set onopen(fn) { capturedOnOpen = fn; },
            set onmessage(fn) { capturedOnMessage = fn; },
            set onclose(fn) { capturedOnClose = fn; },
            set onerror(fn) { capturedOnError = fn; },
            get onopen() { return capturedOnOpen; },
            get onmessage() { return capturedOnMessage; },
            get onclose() { return capturedOnClose; },
            get onerror() { return capturedOnError; },
        };

        MockWebSocketClass = jest.fn(() => mockWebSocket);
        MockWebSocketClass.OPEN = 1;
        MockWebSocketClass.CLOSED = 3;
        global.WebSocket = MockWebSocketClass;

        window.config = {
            cimeChannel: 'testchannel',
            ignoreNickname: 'nightbot,twipkr'
        };

        window.cimesocket = {
            socket: null,
            isInited: false
        };

        window.chat = {
            isInited: false,
            _pendingPlatforms: new Set(['cime']),
            version: '1.18.0'
        };

        window._markPlatformConnected = function(platform) {
            if (!window.chat._pendingPlatforms.has(platform)) return;
            window.chat._pendingPlatforms.delete(platform);
            if (window.chat._pendingPlatforms.size === 0) {
                window.chat.isInited = true;
            }
        };

        window.addChatMessage = jest.fn();

        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    describe('Initial connection', () => {
        beforeEach(() => {
            mockXHR = createMockXHR(200, {
                code: 200,
                data: {
                    token: 'test-token-123',
                    sid: null,
                    tokenExpirationTime: '2026-03-15T22:55:03.000Z',
                    sessionExpirationTime: '2026-03-15T22:55:03.000Z'
                }
            });
            global.XMLHttpRequest = jest.fn(() => mockXHR);
        });

        test('should request token from ci.me API', () => {
            connect_cime();

            expect(mockXHR.open).toHaveBeenCalledWith(
                'POST', 'https://ci.me/api/app/channels/testchannel/chat-token', true
            );
            expect(mockXHR.send).toHaveBeenCalled();
        });

        test('should create WebSocket with token as protocol', () => {
            connect_cime();

            expect(MockWebSocketClass).toHaveBeenCalledWith(
                'wss://edge.ivschat.ap-northeast-2.amazonaws.com/', 'test-token-123'
            );
        });

        test('should show connection message on first connect', () => {
            connect_cime();
            capturedOnOpen();

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'info', 'ci.me 채팅 연결됨', 'testchannel 채널에 연결되었습니다.', true, false
            );
        });

        test('should set isInited to true on open', () => {
            connect_cime();
            capturedOnOpen();

            expect(window.cimesocket.isInited).toBe(true);
        });

        test('should mark platform connected', () => {
            connect_cime();
            capturedOnOpen();

            expect(window.chat.isInited).toBe(true);
            expect(window.chat._pendingPlatforms.size).toBe(0);
        });
    });

    describe('Message handling', () => {
        beforeEach(() => {
            mockXHR = createMockXHR(200, {
                code: 200,
                data: { token: 'test-token-123' }
            });
            global.XMLHttpRequest = jest.fn(() => mockXHR);
            connect_cime();
            capturedOnOpen();
            window.addChatMessage.mockClear();
        });

        test('should handle MESSAGE type messages', () => {
            capturedOnMessage({
                data: JSON.stringify({
                    Type: 'MESSAGE',
                    Content: 'Hello World',
                    Sender: {
                        UserId: 'user123',
                        Attributes: {
                            user: JSON.stringify({ ch: { na: 'TestUser' }, c: 'RV' })
                        }
                    }
                })
            });

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'cime', 'TestUser', 'Hello World', false,
                expect.objectContaining({
                    isStreamer: false,
                    isMod: false,
                    id: 'user123'
                })
            );
        });

        test('should detect streamer role (RS)', () => {
            capturedOnMessage({
                data: JSON.stringify({
                    Type: 'MESSAGE',
                    Content: 'Hi',
                    Sender: {
                        UserId: 'streamer1',
                        Attributes: {
                            user: JSON.stringify({ ch: { na: 'StreamerName' }, c: 'RS' })
                        }
                    }
                })
            });

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'cime', 'StreamerName', 'Hi', false,
                expect.objectContaining({ isStreamer: true, isMod: false })
            );
        });

        test('should detect moderator role (RM)', () => {
            capturedOnMessage({
                data: JSON.stringify({
                    Type: 'MESSAGE',
                    Content: 'Mod here',
                    Sender: {
                        UserId: 'mod1',
                        Attributes: {
                            user: JSON.stringify({ ch: { na: 'ModName' }, c: 'RM' })
                        }
                    }
                })
            });

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'cime', 'ModName', 'Mod here', false,
                expect.objectContaining({ isStreamer: false, isMod: true })
            );
        });

        test('should ignore non-MESSAGE types', () => {
            capturedOnMessage({
                data: JSON.stringify({ Type: 'EVENT', Content: 'something' })
            });

            expect(window.addChatMessage).not.toHaveBeenCalled();
        });

        test('should handle parse errors gracefully', () => {
            capturedOnMessage({ data: 'invalid json' });
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('Reconnection on disconnect', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            mockXHR = createMockXHR(200, {
                code: 200,
                data: { token: 'test-token-123' }
            });
            global.XMLHttpRequest = jest.fn(() => mockXHR);
        });

        test('should set isInited to false on close', () => {
            connect_cime();
            capturedOnOpen();
            expect(window.cimesocket.isInited).toBe(true);

            capturedOnClose();
            expect(window.cimesocket.isInited).toBe(false);
        });

        test('should request new token and reconnect after 5 seconds on close', () => {
            connect_cime();
            capturedOnOpen();

            expect(global.XMLHttpRequest).toHaveBeenCalledTimes(1);
            expect(MockWebSocketClass).toHaveBeenCalledTimes(1);

            capturedOnClose();

            jest.advanceTimersByTime(5000);

            expect(global.XMLHttpRequest).toHaveBeenCalledTimes(2);
            expect(MockWebSocketClass).toHaveBeenCalledTimes(2);
        });

        test('should NOT show connection message on reconnect', () => {
            connect_cime();
            capturedOnOpen();

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'info', 'ci.me 채팅 연결됨', 'testchannel 채널에 연결되었습니다.', true, false
            );
            window.addChatMessage.mockClear();

            capturedOnClose();
            jest.advanceTimersByTime(5000);

            capturedOnOpen();

            expect(window.addChatMessage).not.toHaveBeenCalledWith(
                'info', 'ci.me 채팅 연결됨', expect.any(String), true, false
            );
        });

        test('should not reconnect if cimeChannel is cleared', () => {
            connect_cime();
            capturedOnOpen();

            window.config.cimeChannel = '';
            capturedOnClose();

            jest.advanceTimersByTime(5000);

            expect(global.XMLHttpRequest).toHaveBeenCalledTimes(1);
            expect(MockWebSocketClass).toHaveBeenCalledTimes(1);
        });
    });

    describe('Error handling', () => {
        test('should show error when token response has no data', () => {
            mockXHR = createMockXHR(200, { code: 200 });
            global.XMLHttpRequest = jest.fn(() => mockXHR);

            connect_cime();

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'error', 'ci.me 연결 오류', 'ci.me 채팅 토큰을 가져올 수 없습니다.', true, false
            );
        });

        test('should show error when token response has no token field', () => {
            mockXHR = createMockXHR(200, { code: 200, data: {} });
            global.XMLHttpRequest = jest.fn(() => mockXHR);

            connect_cime();

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'error', 'ci.me 연결 오류', 'ci.me 채팅 토큰을 가져올 수 없습니다.', true, false
            );
        });

        test('should show error on non-200 HTTP response', () => {
            mockXHR = createMockXHR(500, {});
            global.XMLHttpRequest = jest.fn(() => mockXHR);

            connect_cime();

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'error', 'ci.me 연결 오류', 'ci.me 채팅 토큰을 가져올 수 없습니다.', true, false
            );
        });

        test('should log WebSocket errors', () => {
            mockXHR = createMockXHR(200, {
                code: 200,
                data: { token: 'test-token-123' }
            });
            global.XMLHttpRequest = jest.fn(() => mockXHR);

            connect_cime();
            const error = new Error('connection error');
            capturedOnError(error);

            expect(console.error).toHaveBeenCalledWith('ci.me WebSocket 오류: ', error);
        });
    });
});
