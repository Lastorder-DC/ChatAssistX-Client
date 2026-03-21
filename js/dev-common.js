/**
 * ChatAssistX 개발 환경 공통 유틸리티
 * index.html과 config.html 모두에서 사용되는 공통 코드
 */

/**
 * 개발 환경인지 감지하는 함수
 * @param {String} hostname - 호스트명
 * @returns {Boolean}
 */
function isDevEnvironment(hostname) {
    return (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.app.github.dev'));
}

/**
 * 개발 환경에서 사용할 YouTube 중계서버 주소를 반환
 * @param {String} hostname - 호스트명
 * @returns {String}
 */
function getDevYtServer(hostname) {
    if (hostname === 'localhost') {
        return 'ws://localhost:8090';
    } else if (hostname === '127.0.0.1') {
        return 'ws://127.0.0.1:8090';
    } else if (hostname.endsWith('.app.github.dev')) {
        return 'wss://' + hostname.replace(/-\d+\.app\.github\.dev$/, '-8090.app.github.dev');
    }
    return '';
}

/**
 * DEV MODE 뱃지를 문서에 추가하는 함수
 */
function appendDevBadge() {
    var badge = document.createElement('div');
    badge.id = 'dev-mode-badge';
    badge.textContent = 'DEV MODE';
    badge.style.cssText = 'position:fixed;top:0;left:0;background:red;color:white;padding:4px 12px;font-size:12px;font-weight:bold;z-index:99999;';
    document.body.appendChild(badge);
}

// Node.js / Jest 환경에서 테스트를 위한 exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isDevEnvironment,
        getDevYtServer,
        appendDevBadge
    };
}
