const { WebSocket } = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const { createServer } = require('../index');

const TEST_PORT = 18090;

/**
 * WebSocket에 연결하고 메시지 큐를 설정한다.
 * 인프로세스 서버에서는 open 이전에 메시지가 도착할 수 있으므로 큐로 버퍼링한다.
 */
function connectWs(port, origin) {
    return new Promise((resolve, reject) => {
        const opts = origin ? { origin } : {};
        const ws = new WebSocket(`ws://localhost:${port}`, opts);
        ws._messageQueue = [];
        ws._messageResolvers = [];
        ws.on('message', (data) => {
            const parsed = JSON.parse(data.toString());
            if (ws._messageResolvers.length > 0) {
                ws._messageResolvers.shift()(parsed);
            } else {
                ws._messageQueue.push(parsed);
            }
        });
        const timer = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        ws.on('open', () => {
            clearTimeout(timer);
            resolve(ws);
        });
        ws.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

/**
 * 다음 메시지를 기다린다. 이미 큐에 쌓인 메시지가 있으면 즉시 반환한다.
 */
function waitForMessage(ws, timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (ws._messageQueue && ws._messageQueue.length > 0) {
            resolve(ws._messageQueue.shift());
            return;
        }
        const timer = setTimeout(() => {
            const idx = ws._messageResolvers ? ws._messageResolvers.indexOf(onMessage) : -1;
            if (idx >= 0) ws._messageResolvers.splice(idx, 1);
            reject(new Error('Message timeout'));
        }, timeout);
        function onMessage(msg) {
            clearTimeout(timer);
            resolve(msg);
        }
        if (ws._messageResolvers) {
            ws._messageResolvers.push(onMessage);
        } else {
            // spawned process의 WebSocket (큐 없음) - 직접 리스너 사용
            ws.once('message', (data) => {
                clearTimeout(timer);
                resolve(JSON.parse(data.toString()));
            });
        }
    });
}

function closeWs(ws) {
    return new Promise((resolve) => {
        if (ws.readyState === WebSocket.CLOSED) {
            resolve();
            return;
        }
        const timer = setTimeout(resolve, 1000);
        ws.on('close', () => {
            clearTimeout(timer);
            resolve();
        });
        ws.close();
    });
}

function waitForListening(server) {
    return new Promise((resolve) => {
        server.wss.on('listening', resolve);
    });
}

describe('WebSocket Server Integration Tests', () => {
    let server;

    beforeAll(async () => {
        server = createServer({ port: TEST_PORT });
        await waitForListening(server);
    }, 15000);

    afterAll(async () => {
        await server.close();
    }, 10000);

    describe('Origin validation', () => {
        test('should accept connections from allowed origins', async () => {
            const ws = await connectWs(TEST_PORT, 'https://chatassistx.vercel.app');
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('version');
            expect(typeof msg.message).toBe('string');
            await closeWs(ws);
        });

        test('should accept connections from funzinnu.com subdomains', async () => {
            const ws = await connectWs(TEST_PORT, 'https://sub.funzinnu.com');
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('version');
            await closeWs(ws);
        });

        test('should reject connections from disallowed origins', async () => {
            await expect(connectWs(TEST_PORT, 'https://evil.com')).rejects.toThrow();
        });
    });

    describe('Version message', () => {
        test('should send version message on connection', async () => {
            const ws = await connectWs(TEST_PORT, 'https://funzinnu.com');
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('version');
            expect(typeof msg.message).toBe('string');
            await closeWs(ws);
        });
    });

    describe('Connect message handling', () => {
        test('should return error for invalid JSON', async () => {
            const ws = await connectWs(TEST_PORT, 'https://funzinnu.com');
            await waitForMessage(ws); // consume version message
            ws.send('not json');
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('error');
            await closeWs(ws);
        });

        test('should return error when channel is missing in connect message', async () => {
            const ws = await connectWs(TEST_PORT, 'https://funzinnu.com');
            await waitForMessage(ws); // consume version message
            ws.send(JSON.stringify({ type: 'connect' }));
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('error');
            await closeWs(ws);
        });
    });

    describe('Ping/Pong heartbeat', () => {
        test('should respond with pong when client sends ping', async () => {
            const ws = await connectWs(TEST_PORT, 'https://funzinnu.com');
            await waitForMessage(ws); // consume version message
            ws.send(JSON.stringify({ type: 'ping' }));
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('pong');
            await closeWs(ws);
        });

        test('should drop connection when no ping received within timeout', async () => {
            const pingServer = createServer({
                port: TEST_PORT + 2,
                pingTimeout: 2000,
                pingCheckInterval: 1000
            });
            await waitForListening(pingServer);

            try {
                const ws = await connectWs(TEST_PORT + 2, 'https://funzinnu.com');
                await waitForMessage(ws); // consume version message

                // Don't send any ping - wait for connection to be dropped
                const result = await new Promise((resolve) => {
                    ws.on('close', (code, reason) => {
                        resolve({ code, reason: reason.toString() });
                    });
                });

                expect(result.code).toBe(1000);
                expect(result.reason).toBe('Ping timeout');
            } finally {
                await pingServer.close();
            }
        }, 30000);
    });

    describe('Session cleanup delay on disconnect', () => {
        test('should delay session cleanup when last client disconnects and clean up after timeout', async () => {
            const sessionServer = createServer({
                port: TEST_PORT + 3,
                sessionCleanupDelay: 2000,
                onStartSession: async (channel, session, broadcast) => {
                    session.connecting = false;
                    broadcast(session, { type: 'connected', message: channel });
                }
            });
            await waitForListening(sessionServer);

            try {
                // Connect client and subscribe to a channel
                const ws1 = await connectWs(TEST_PORT + 3, 'https://funzinnu.com');
                await waitForMessage(ws1); // consume version message
                ws1.send(JSON.stringify({ type: 'connect', channel: '@testch' }));
                await waitForMessage(ws1); // consume connected message

                // Disconnect client - session should NOT be deleted immediately
                await closeWs(ws1);
                // Wait a short time to confirm session is still alive
                await new Promise(resolve => setTimeout(resolve, 500));
                expect(sessionServer.channelSessions.has('@testch')).toBe(true);

                // Wait for cleanup delay to expire (2s + buffer)
                await new Promise(resolve => setTimeout(resolve, 2500));
                expect(sessionServer.channelSessions.has('@testch')).toBe(false);
            } finally {
                await sessionServer.close();
            }
        }, 30000);

        test('should cancel cleanup timer when a new client reconnects during grace period', async () => {
            const sessionServer = createServer({
                port: TEST_PORT + 4,
                sessionCleanupDelay: 3000,
                onStartSession: async (channel, session, broadcast) => {
                    session.connecting = false;
                    broadcast(session, { type: 'connected', message: channel });
                }
            });
            await waitForListening(sessionServer);

            try {
                // Connect first client and subscribe
                const ws1 = await connectWs(TEST_PORT + 4, 'https://funzinnu.com');
                await waitForMessage(ws1); // version
                ws1.send(JSON.stringify({ type: 'connect', channel: '@testch' }));
                await waitForMessage(ws1); // connected

                // Disconnect first client - starts cleanup timer
                await closeWs(ws1);
                await new Promise(resolve => setTimeout(resolve, 500));

                // Reconnect with a new client within the grace period
                const ws2 = await connectWs(TEST_PORT + 4, 'https://funzinnu.com');
                await waitForMessage(ws2); // version
                ws2.send(JSON.stringify({ type: 'connect', channel: '@testch' }));
                await waitForMessage(ws2); // connected (기존 채널 세션에 연결됨)

                // Wait for the original cleanup delay to pass
                await new Promise(resolve => setTimeout(resolve, 3500));

                // Session should still exist because the timer was cancelled
                expect(sessionServer.channelSessions.has('@testch')).toBe(true);

                await closeWs(ws2);
            } finally {
                await sessionServer.close();
            }
        }, 30000);
    });

    describe('Graceful shutdown', () => {
        test('should send disconnected message before closing on SIGTERM', async () => {
            // Start a separate server process for this test (SIGTERM requires separate process)
            const shutdownPort = TEST_PORT + 1;
            const proc = spawn('node', ['index.js'], {
                cwd: path.join(__dirname, '..'),
                env: { ...process.env, PORT: String(shutdownPort) },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Wait for server to start
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Shutdown test server start timeout')), 10000);
                proc.stdout.on('data', (data) => {
                    if (data.toString().includes('started on port')) {
                        clearTimeout(timer);
                        resolve();
                    }
                });
            });

            // Connect a client
            const ws = new WebSocket(`ws://localhost:${shutdownPort}`, { origin: 'https://funzinnu.com' });
            await new Promise((resolve) => ws.on('open', resolve));

            // Consume version message
            await waitForMessage(ws);

            // Collect all messages received after this point
            const messages = [];
            ws.on('message', (data) => {
                messages.push(JSON.parse(data.toString()));
            });

            // Send SIGTERM
            proc.kill('SIGTERM');

            // Wait for connection to close
            await new Promise((resolve) => {
                const timer = setTimeout(resolve, 5000);
                ws.on('close', () => {
                    clearTimeout(timer);
                    resolve();
                });
            });

            // Check that a disconnected message was received
            const disconnectedMsg = messages.find(m => m.type === 'disconnected');
            expect(disconnectedMsg).toBeDefined();
            expect(disconnectedMsg.message).toBe('Server shutting down');

            // Ensure server process exits
            await new Promise((resolve) => {
                const timer = setTimeout(resolve, 5000);
                proc.on('exit', () => {
                    clearTimeout(timer);
                    resolve();
                });
            });
        }, 30000);
    });
});
