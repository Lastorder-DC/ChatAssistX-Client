/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('ChatAssist environment detection', () => {
    let environmentScript;

    beforeEach(() => {
        environmentScript = fs.readFileSync(path.resolve(__dirname, '../environment.js'), 'utf8');
        document.body.innerHTML = '';
        delete window.ChatAssistEnvironment;
        window.eval(environmentScript);
    });

    test('should detect localhost development environment and add DEV MODE badge', () => {
        var environment = window.ChatAssistEnvironment.getEnvironment({
            hostname: 'localhost',
            href: 'http://localhost:5500/config.html'
        });

        window.ChatAssistEnvironment.installDevModeBadge(document, environment);

        expect(environment.isDev).toBe(true);
        expect(environment.baseUrl).toBe('http://localhost:5500/');
        expect(environment.ytServerUrl).toBe('ws://localhost:8090');

        var badge = document.getElementById('chatassistx-dev-mode-badge');
        expect(badge).not.toBeNull();
        expect(badge.textContent).toBe('DEV MODE');
    });

    test('should detect github.dev development environment and map port 5500 to 8090', () => {
        var environment = window.ChatAssistEnvironment.getEnvironment({
            hostname: 'opulent-winner-97g5jq5wxp52p96r-5500.app.github.dev',
            href: 'https://opulent-winner-97g5jq5wxp52p96r-5500.app.github.dev/config.html'
        });

        expect(environment.isDev).toBe(true);
        expect(environment.baseUrl).toBe('https://opulent-winner-97g5jq5wxp52p96r-5500.app.github.dev/');
        expect(environment.ytServerUrl).toBe('wss://opulent-winner-97g5jq5wxp52p96r-8090.app.github.dev/');
    });

    test('should keep production defaults outside development environments', () => {
        var environment = window.ChatAssistEnvironment.getEnvironment({
            hostname: 'chatassistx.cc',
            href: 'https://chatassistx.cc/config.html'
        });

        expect(environment.isDev).toBe(false);
        expect(environment.baseUrl).toBe('https://chatassistx.cc/');
        expect(environment.ytServerUrl).toBe('wss://youtube-chat.chatassistx.cc');
    });
});
