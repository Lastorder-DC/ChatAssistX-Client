/**
 * @jest-environment jsdom
 */

describe('YouTube WebSocket Client (connect_yt)', () => {
    let mockWebSocket;
    let MockWebSocketClass;
    let capturedOnOpen;
    let capturedOnMessage;
    let capturedOnClose;
    let capturedOnError;
    let sentMessages;

    beforeEach(() => {
        sentMessages = [];
        capturedOnOpen = null;
        capturedOnMessage = null;
        capturedOnClose = null;
        capturedOnError = null;

        mockWebSocket = {
            send: jest.fn((msg) => sentMessages.push(JSON.parse(msg))),
            close: jest.fn(),
            readyState: 1, // WebSocket.OPEN
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

        // Set up window globals needed by connect_yt
        window.config = {
            ytChannel: '@testchannel',
            ytServer: 'ws://localhost:8090'
        };

        window.ytsocket = {
            socket: null,
            isInited: false,
            retryTimer: null
        };

        window.chat = {
            isInited: false,
            _pendingPlatforms: new Set(['youtube'])
        };

        // Mock _markPlatformConnected
        window._markPlatformConnected = function(platform) {
            if (!window.chat._pendingPlatforms.has(platform)) return;
            window.chat._pendingPlatforms.delete(platform);
            if (window.chat._pendingPlatforms.size === 0) {
                window.chat.isInited = true;
            }
        };

        // Mock addChatMessage
        window.addChatMessage = jest.fn();

        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        if (window.ytsocket && window.ytsocket.retryTimer) {
            clearTimeout(window.ytsocket.retryTimer);
        }
        if (window.ytsocket && window.ytsocket.pingTimer) {
            clearInterval(window.ytsocket.pingTimer);
        }
    });

    // Helper: minimal connect_yt implementation extracted from chatassist.js
    // This simulates the core logic we're testing
    function connect_yt() {
        var ytChannel = window.config.ytChannel;
        var ytServerUrl = window.config.ytServer;

        if (!ytServerUrl) {
            ytServerUrl = "wss://youtube-chat.chatassistx.cc";
        }

        if (!ytServerUrl.startsWith("ws://") && !ytServerUrl.startsWith("wss://")) {
            ytServerUrl = "wss://" + ytServerUrl;
        }

        try {
            window.ytsocket.socket = new WebSocket(ytServerUrl);
        } catch (e) {
            window.addChatMessage("error", "YouTube 연결 오류", "WebSocket 연결에 실패했습니다: " + e.message, true, false);
            return;
        }

        window.ytsocket.retryTimer = null;

        function clearYtRetryTimer() {
            if (window.ytsocket.retryTimer) {
                clearTimeout(window.ytsocket.retryTimer);
                window.ytsocket.retryTimer = null;
            }
        }

        function scheduleYtRetry() {
            clearYtRetryTimer();
            window.ytsocket.retryTimer = setTimeout(function () {
                window.ytsocket.retryTimer = null;
                if (window.ytsocket.socket && window.ytsocket.socket.readyState === WebSocket.OPEN) {
                    console.log("YouTube: Retrying channel connection...");
                    window.ytsocket.socket.send(JSON.stringify({
                        type: "connect",
                        channel: ytChannel
                    }));
                }
            }, 30000);
        }

        window.ytsocket.socket.onopen = function () {
            console.log("YouTube relay server connected");
            clearYtRetryTimer();
            // 30초 간격으로 ping 전송
            window.ytsocket.pingTimer = setInterval(function() {
                if(window.ytsocket.socket && window.ytsocket.socket.readyState === WebSocket.OPEN) {
                    window.ytsocket.socket.send(JSON.stringify({ type: "ping" }));
                }
            }, 30000);
        };

        window.ytsocket.socket.onmessage = function (event) {
            var data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                console.error("YouTube message parse error:", e);
                return;
            }

            if (data.type === "version") {
                console.log("YouTube relay server version:", data.message);
                window.ytsocket.socket.send(JSON.stringify({
                    type: "connect",
                    channel: ytChannel
                }));
            } else if (data.type === "pong") {
                // ping 응답 수신 - 별도 처리 불필요
            } else if (data.type === "chat" || data.type === "superchat") {
                var message = data.message || "";
                if (data.type === "superchat" && data.amount) {
                    message = "[" + data.amount + "] " + message;
                }
                window.addChatMessage("youtube", data.nickname || "Unknown", message, false, {
                    rawprint: false,
                    isStreamer: data.isOwner || false,
                    isMod: data.isMod || false,
                    id: data.id || ""
                });
            } else if (data.type === "not_found" || data.type === "ended") {
                console.log("YouTube:", data.message);
                window.addChatMessage("info", "YouTube", data.message, true, false);
                scheduleYtRetry();
            } else if (data.type === "info") {
                console.log("YouTube info:", data.message);
                window.addChatMessage("info", "YouTube", data.message, true, false);
            } else if (data.type === "error") {
                console.error("YouTube error:", data.message);
                window.addChatMessage("error", "YouTube 오류", data.message, true, false);
            } else if (data.type === "connected") {
                console.log("YouTube info:", data.message);
                window.addChatMessage("info", "YouTube", data.message, true, false);
                window._markPlatformConnected('youtube');
            } else if (data.type === "disconnected") {
                console.log("YouTube disconnected:", data.message);
                window.addChatMessage("info", "YouTube", data.message || "서버 연결이 종료되었습니다", true, false);
            }
        };

        window.ytsocket.socket.onclose = function () {
            console.log("YouTube relay server disconnected");
            window.ytsocket.isInited = false;
            clearYtRetryTimer();
            // ping 타이머 정리
            if(window.ytsocket.pingTimer) {
                clearInterval(window.ytsocket.pingTimer);
                window.ytsocket.pingTimer = null;
            }
        };

        window.ytsocket.socket.onerror = function (err) {
            console.error("YouTube WebSocket error:", err);
        };

        window.ytsocket.isInited = true;
    }

    describe('Connection flow', () => {
        test('should not send connect message on open (wait for version)', () => {
            connect_yt();
            // Trigger onopen
            capturedOnOpen();
            // No messages should be sent on open
            expect(sentMessages.length).toBe(0);
        });

        test('should send connect message after receiving version message', () => {
            connect_yt();
            capturedOnOpen();
            expect(sentMessages.length).toBe(0);

            // Simulate receiving version message
            capturedOnMessage({ data: JSON.stringify({ type: 'version', message: '1.1.2' }) });

            expect(sentMessages.length).toBe(1);
            expect(sentMessages[0]).toEqual({
                type: 'connect',
                channel: '@testchannel'
            });
        });

        test('should use default server URL when ytServer is not configured', () => {
            window.config.ytServer = null;
            connect_yt();
            expect(MockWebSocketClass).toHaveBeenCalledWith('wss://youtube-chat.chatassistx.cc');
        });

        test('should add wss:// prefix when protocol is missing', () => {
            window.config.ytServer = 'example.com';
            connect_yt();
            expect(MockWebSocketClass).toHaveBeenCalledWith('wss://example.com');
        });

        test('should keep ws:// prefix as-is', () => {
            window.config.ytServer = 'ws://localhost:8090';
            connect_yt();
            expect(MockWebSocketClass).toHaveBeenCalledWith('ws://localhost:8090');
        });
    });

    describe('Message handling', () => {
        beforeEach(() => {
            connect_yt();
            capturedOnOpen();
            // Send version to complete handshake
            capturedOnMessage({ data: JSON.stringify({ type: 'version', message: '1.1.2' }) });
            sentMessages = []; // Clear the connect message
        });

        test('should handle chat messages', () => {
            capturedOnMessage({
                data: JSON.stringify({
                    type: 'chat',
                    nickname: 'TestUser',
                    message: 'Hello World',
                    isOwner: false,
                    isMod: false,
                    id: 'user123'
                })
            });

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'youtube', 'TestUser', 'Hello World', false,
                { rawprint: false, isStreamer: false, isMod: false, id: 'user123' }
            );
        });

        test('should handle superchat messages with amount', () => {
            capturedOnMessage({
                data: JSON.stringify({
                    type: 'superchat',
                    nickname: 'DonorUser',
                    message: 'Great stream!',
                    amount: '$50.00',
                    isOwner: false,
                    isMod: false,
                    id: 'user456'
                })
            });

            expect(window.addChatMessage).toHaveBeenCalledWith(
                'youtube', 'DonorUser', '[$50.00] Great stream!', false,
                { rawprint: false, isStreamer: false, isMod: false, id: 'user456' }
            );
        });

        test('should handle connected message and set isInited', () => {
            expect(window.chat.isInited).toBe(false);
            capturedOnMessage({
                data: JSON.stringify({ type: 'connected', message: 'Connected to live chat' })
            });
            expect(window.chat.isInited).toBe(true);
            expect(window.addChatMessage).toHaveBeenCalledWith(
                'info', 'YouTube', 'Connected to live chat', true, false
            );
        });

        test('should handle disconnected message', () => {
            capturedOnMessage({
                data: JSON.stringify({ type: 'disconnected', message: 'Server shutting down' })
            });
            expect(window.addChatMessage).toHaveBeenCalledWith(
                'info', 'YouTube', 'Server shutting down', true, false
            );
        });

        test('should handle disconnected message with default text when message is empty', () => {
            capturedOnMessage({
                data: JSON.stringify({ type: 'disconnected' })
            });
            expect(window.addChatMessage).toHaveBeenCalledWith(
                'info', 'YouTube', '서버 연결이 종료되었습니다', true, false
            );
        });

        test('should handle not_found message and schedule retry', () => {
            capturedOnMessage({
                data: JSON.stringify({ type: 'not_found', message: 'No live stream found' })
            });
            expect(window.addChatMessage).toHaveBeenCalledWith(
                'info', 'YouTube', 'No live stream found', true, false
            );
            // Verify retry timer was set
            expect(window.ytsocket.retryTimer).not.toBeNull();
        });

        test('should handle error messages', () => {
            capturedOnMessage({
                data: JSON.stringify({ type: 'error', message: 'Something went wrong' })
            });
            expect(window.addChatMessage).toHaveBeenCalledWith(
                'error', 'YouTube 오류', 'Something went wrong', true, false
            );
        });

        test('should handle invalid JSON gracefully', () => {
            capturedOnMessage({ data: 'not valid json' });
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('Connection lifecycle', () => {
        test('should set isInited to false on close', () => {
            connect_yt();
            expect(window.ytsocket.isInited).toBe(true);
            capturedOnClose();
            expect(window.ytsocket.isInited).toBe(false);
        });

        test('should clear ping timer on close', () => {
            jest.useFakeTimers();
            connect_yt();
            capturedOnOpen();
            expect(window.ytsocket.pingTimer).not.toBeNull();
            capturedOnClose();
            expect(window.ytsocket.pingTimer).toBeNull();
            jest.useRealTimers();
        });

        test('should log error on WebSocket error', () => {
            connect_yt();
            const error = new Error('connection error');
            capturedOnError(error);
            expect(console.error).toHaveBeenCalledWith('YouTube WebSocket error:', error);
        });
    });

    describe('Ping/Pong heartbeat', () => {
        test('should start ping interval on connection open', () => {
            jest.useFakeTimers();
            connect_yt();
            capturedOnOpen();
            expect(window.ytsocket.pingTimer).not.toBeNull();
            jest.useRealTimers();
        });

        test('should send ping message every 30 seconds', () => {
            jest.useFakeTimers();
            connect_yt();
            capturedOnOpen();
            sentMessages = []; // clear any messages

            // Advance 30 seconds
            jest.advanceTimersByTime(30000);
            expect(sentMessages.length).toBe(1);
            expect(sentMessages[0]).toEqual({ type: 'ping' });

            // Advance another 30 seconds
            jest.advanceTimersByTime(30000);
            expect(sentMessages.length).toBe(2);
            expect(sentMessages[1]).toEqual({ type: 'ping' });

            jest.useRealTimers();
        });

        test('should handle pong response without side effects', () => {
            connect_yt();
            capturedOnOpen();
            capturedOnMessage({ data: JSON.stringify({ type: 'version', message: '1.1.2' }) });
            sentMessages = [];

            capturedOnMessage({ data: JSON.stringify({ type: 'pong' }) });
            // pong should not trigger addChatMessage or any other action
            expect(window.addChatMessage).not.toHaveBeenCalled();
            expect(sentMessages.length).toBe(0);
        });
    });
});
