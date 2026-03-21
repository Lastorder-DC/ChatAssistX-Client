/**
 * chatassist.js를 글로벌 스코프에 로드하는 헬퍼
 * (테스트 전용 - 프로덕션 코드에서 사용 금지)
 *
 * require()로 모듈을 로드하면 함수들이 모듈 스코프에 갇혀서
 * window.addChatMessage = jest.fn() 같은 mock이 내부 호출을 가로채지 못합니다.
 *
 * 이 헬퍼는 indirect eval을 사용하여 chatassist.js의 모든 함수를
 * 글로벌(window) 스코프에 정의하므로, beforeEach에서 window.함수명 = jest.fn()으로
 * 내부 호출도 mock할 수 있습니다.
 *
 * indirect eval이 필요한 이유: (0, eval)(code)는 코드를 글로벌 스코프에서 실행하여
 * function 선언이 전역 함수가 되므로, 테스트에서 window.함수명으로 mock 교체가 가능합니다.
 */
const fs = require('fs');
const path = require('path');

let loaded = false;

function loadChatassistGlobal() {
    if (loaded) return;

    // 최소한의 jQuery mock (로드 시 필요)
    if (typeof global.$ === 'undefined') {
        global.$ = function() {
            return {
                html: function() { return this; },
                remove: function() { return this; },
                append: function() { return this; },
                appendTo: function() { return this; },
                css: function() { return this; },
                fadeIn: function() { return this; },
                fadeOut: function() { return this; },
                slideDown: function() { return this; },
                slideUp: function() { return this; },
                on: function() { return this; },
                // ready는 콜백을 실행하지 않음 - CompileChat()이 Handlebars를 필요로 하기 때문
                ready: function() { return this; }
            };
        };
    }

    var source = fs.readFileSync(path.join(__dirname, '..', '..', 'chatassist.js'), 'utf-8');

    // module.exports 블록 제거 (글로벌 스코프에서는 불필요)
    source = source.replace(
        /\/\/ Node\.js \/ Jest[\s\S]*?module\.exports\s*=\s*\{[\s\S]*?\};\s*\}/,
        ''
    );

    // indirect eval로 글로벌 스코프에 로드
    (0, eval)(source);
    loaded = true;
}

module.exports = { loadChatassistGlobal };
