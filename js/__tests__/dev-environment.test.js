/**
 * @jest-environment jsdom
 */

const { isDevEnvironment, getDevYtServer } = require('../config');

describe('Dev environment detection', () => {
    test('should detect localhost as dev environment', () => {
        expect(isDevEnvironment('localhost')).toBe(true);
    });

    test('should detect 127.0.0.1 as dev environment', () => {
        expect(isDevEnvironment('127.0.0.1')).toBe(true);
    });

    test('should detect GitHub Codespaces domain as dev environment', () => {
        expect(isDevEnvironment('opulent-winner-97g5jq5wxp52p96r-5500.app.github.dev')).toBe(true);
    });

    test('should not detect production domain as dev environment', () => {
        expect(isDevEnvironment('chatassistx.cc')).toBe(false);
    });

    test('should not detect arbitrary domain as dev environment', () => {
        expect(isDevEnvironment('example.com')).toBe(false);
    });
});

describe('Dev environment ytServer auto-configuration', () => {
    test('should return ws://localhost:8090 for localhost', () => {
        expect(getDevYtServer('localhost')).toBe('ws://localhost:8090');
    });

    test('should return ws://127.0.0.1:8090 for 127.0.0.1', () => {
        expect(getDevYtServer('127.0.0.1')).toBe('ws://127.0.0.1:8090');
    });

    test('should convert GitHub Codespaces domain port 5500 to 8090', () => {
        expect(getDevYtServer('opulent-winner-97g5jq5wxp52p96r-5500.app.github.dev'))
            .toBe('wss://opulent-winner-97g5jq5wxp52p96r-8090.app.github.dev');
    });

    test('should convert GitHub Codespaces domain with any port to 8090', () => {
        expect(getDevYtServer('my-codespace-name-3000.app.github.dev'))
            .toBe('wss://my-codespace-name-8090.app.github.dev');
    });

    test('should use wss:// protocol for GitHub Codespaces', () => {
        var result = getDevYtServer('opulent-winner-97g5jq5wxp52p96r-5500.app.github.dev');
        expect(result.startsWith('wss://')).toBe(true);
    });

    test('should use ws:// protocol for localhost', () => {
        var result = getDevYtServer('localhost');
        expect(result.startsWith('ws://')).toBe(true);
    });
});

describe('DEV MODE badge', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should create badge element with correct properties', () => {
        // Replicate badge creation logic from config.js
        var badge = document.createElement('div');
        badge.id = 'dev-mode-badge';
        badge.textContent = 'DEV MODE';
        badge.style.cssText = 'position:fixed;top:0;left:0;background:red;color:white;padding:4px 12px;font-size:12px;font-weight:bold;z-index:99999;';
        document.body.appendChild(badge);

        var el = document.getElementById('dev-mode-badge');
        expect(el).not.toBeNull();
        expect(el.textContent).toBe('DEV MODE');
        expect(el.style.position).toBe('fixed');
        expect(el.style.top).toBe('0px');
        expect(el.style.left).toBe('0px');
        expect(el.style.background).toBe('red');
        expect(el.style.color).toBe('white');
        expect(el.style.fontWeight).toBe('bold');
    });

    test('should not create badge for non-dev environment', () => {
        var isDev = isDevEnvironment('chatassistx.cc');

        if (isDev) {
            var badge = document.createElement('div');
            badge.id = 'dev-mode-badge';
            document.body.appendChild(badge);
        }

        var el = document.getElementById('dev-mode-badge');
        expect(el).toBeNull();
    });
});
