const { WebSocket } = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = 18090;
let serverProcess;

function startServer() {
    return new Promise((resolve, reject) => {
        serverProcess = spawn('node', ['index.js'], {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, PORT: String(TEST_PORT) },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let started = false;

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('started on port') && !started) {
                started = true;
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            // Log stderr for debugging but don't fail
        });

        serverProcess.on('error', (err) => {
            if (!started) reject(err);
        });

        // Timeout if server doesn't start within 10 seconds
        setTimeout(() => {
            if (!started) reject(new Error('Server start timeout'));
        }, 10000);
    });
}

function stopServer() {
    return new Promise((resolve) => {
        if (serverProcess) {
            serverProcess.on('exit', () => resolve());
            serverProcess.kill('SIGTERM');
            // Force kill after 5 seconds
            setTimeout(() => {
                try { serverProcess.kill('SIGKILL'); } catch (e) {}
                resolve();
            }, 5000);
        } else {
            resolve();
        }
    });
}

function connectWs(origin) {
    return new Promise((resolve, reject) => {
        const opts = origin ? { origin } : {};
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}`, opts);
        ws.on('open', () => resolve(ws));
        ws.on('error', (err) => reject(err));
        // Timeout
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
}

function waitForMessage(ws, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);
        ws.once('message', (data) => {
            clearTimeout(timer);
            resolve(JSON.parse(data.toString()));
        });
    });
}

function closeWs(ws) {
    return new Promise((resolve) => {
        if (ws.readyState === WebSocket.CLOSED) {
            resolve();
            return;
        }
        ws.on('close', () => resolve());
        ws.close();
        setTimeout(resolve, 1000);
    });
}

describe('WebSocket Server Integration Tests', () => {
    beforeAll(async () => {
        await startServer();
    }, 15000);

    afterAll(async () => {
        await stopServer();
    }, 10000);

    describe('Origin validation', () => {
        test('should accept connections from allowed origins', async () => {
            const ws = await connectWs('https://chatassistx.vercel.app');
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('version');
            expect(msg.message).toBe('1.1.2');
            await closeWs(ws);
        });

        test('should accept connections from funzinnu.com subdomains', async () => {
            const ws = await connectWs('https://sub.funzinnu.com');
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('version');
            await closeWs(ws);
        });

        test('should reject connections from disallowed origins', async () => {
            await expect(connectWs('https://evil.com')).rejects.toThrow();
        });
    });

    describe('Version message', () => {
        test('should send version message on connection', async () => {
            const ws = await connectWs('https://funzinnu.com');
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('version');
            expect(msg.message).toBe('1.1.2');
            await closeWs(ws);
        });
    });

    describe('Connect message handling', () => {
        test('should return error for invalid JSON', async () => {
            const ws = await connectWs('https://funzinnu.com');
            await waitForMessage(ws); // consume version message
            ws.send('not json');
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('error');
            await closeWs(ws);
        });

        test('should return error when channel is missing in connect message', async () => {
            const ws = await connectWs('https://funzinnu.com');
            await waitForMessage(ws); // consume version message
            ws.send(JSON.stringify({ type: 'connect' }));
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('error');
            await closeWs(ws);
        });
    });

    describe('Ping/Pong heartbeat', () => {
        test('should respond with pong when client sends ping', async () => {
            const ws = await connectWs('https://funzinnu.com');
            await waitForMessage(ws); // consume version message
            ws.send(JSON.stringify({ type: 'ping' }));
            const msg = await waitForMessage(ws);
            expect(msg.type).toBe('pong');
            await closeWs(ws);
        });

        test('should drop connection when no ping received within timeout', async () => {
            // Start a separate server with short timeouts for testing
            const pingPort = TEST_PORT + 2;
            const proc = spawn('node', ['-e', `
                const { WebSocketServer, WebSocket } = require('ws');
                const { PROGRAM_VERSION, isAllowedOrigin } = require('./utils');
                const PORT = ${pingPort};
                const clientLastPing = new Map();
                const PING_TIMEOUT = 2000; // 2 seconds for testing
                const PING_CHECK_INTERVAL = 1000; // 1 second for testing
                const wss = new WebSocketServer({
                    port: PORT,
                    verifyClient: (info) => {
                        const origin = info.origin || info.req.headers.origin;
                        return isAllowedOrigin(origin);
                    }
                });
                console.log('started on port ' + PORT);
                const pingMonitorInterval = setInterval(() => {
                    const now = Date.now();
                    for (const [client, lastPing] of clientLastPing) {
                        if (now - lastPing > PING_TIMEOUT) {
                            console.log('Client ping timeout');
                            client.close(1000, 'Ping timeout');
                            clientLastPing.delete(client);
                        }
                    }
                }, PING_CHECK_INTERVAL);
                wss.on('connection', (ws) => {
                    clientLastPing.set(ws, Date.now());
                    ws.send(JSON.stringify({ type: 'version', message: PROGRAM_VERSION }));
                    ws.on('message', (data) => {
                        const parsed = JSON.parse(data.toString());
                        if (parsed.type === 'ping') {
                            clientLastPing.set(ws, Date.now());
                            ws.send(JSON.stringify({ type: 'pong' }));
                        }
                    });
                    ws.on('close', () => {
                        clientLastPing.delete(ws);
                    });
                });
            `], {
                cwd: path.join(__dirname, '..'),
                env: { ...process.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Ping test server start timeout')), 10000);
                proc.stdout.on('data', (data) => {
                    if (data.toString().includes('started on port')) {
                        clearTimeout(timer);
                        resolve();
                    }
                });
            });

            const ws = new WebSocket(`ws://localhost:${pingPort}`, { origin: 'https://funzinnu.com' });
            await new Promise((resolve) => ws.on('open', resolve));
            await waitForMessage(ws); // consume version message

            // Don't send any ping - wait for connection to be dropped
            const closePromise = new Promise((resolve) => {
                ws.on('close', (code, reason) => {
                    resolve({ code, reason: reason.toString() });
                });
            });

            const result = await closePromise;
            expect(result.code).toBe(1000);
            expect(result.reason).toBe('Ping timeout');

            // Clean up
            proc.kill('SIGTERM');
            await new Promise((resolve) => {
                proc.on('exit', resolve);
                setTimeout(resolve, 5000);
            });
        }, 30000);
    });

    describe('Graceful shutdown', () => {
        test('should send disconnected message before closing on SIGTERM', async () => {
            // Start a separate server for this test
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

            // Connect a client and subscribe to a channel
            const ws = new WebSocket(`ws://localhost:${shutdownPort}`, { origin: 'https://funzinnu.com' });
            await new Promise((resolve) => ws.on('open', resolve));

            // Consume version message
            await waitForMessage(ws);

            // Send connect to subscribe (even though channel won't exist, it will enter the session map)
            ws.send(JSON.stringify({ type: 'connect', channel: '@testchannel' }));

            // Wait for server to process and send info/error messages about the channel
            // Just wait a bit for the subscribe to be processed
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Collect all messages received after SIGTERM
            const messages = [];
            ws.on('message', (data) => {
                messages.push(JSON.parse(data.toString()));
            });

            // Send SIGTERM
            proc.kill('SIGTERM');

            // Wait for connection to close
            await new Promise((resolve) => {
                ws.on('close', resolve);
                setTimeout(resolve, 5000);
            });

            // Check that a disconnected message was received
            const disconnectedMsg = messages.find(m => m.type === 'disconnected');
            expect(disconnectedMsg).toBeDefined();
            expect(disconnectedMsg.message).toBe('Server shutting down');

            // Ensure server process exits
            await new Promise((resolve) => {
                proc.on('exit', resolve);
                setTimeout(resolve, 5000);
            });
        }, 30000);
    });
});
