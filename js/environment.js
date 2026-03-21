(function() {
    'use strict';

    var PROD_BASE_URL = 'https://chatassistx.cc/';
    var PROD_YT_SERVER_URL = 'wss://youtube-chat.chatassistx.cc';
    var DEV_MODE_BADGE_ID = 'chatassistx-dev-mode-badge';

    function getEnvironment(locationLike) {
        var currentLocation = locationLike || window.location;
        var hostname = currentLocation && currentLocation.hostname ? currentLocation.hostname : '';
        var environment = {
            isDev: false,
            baseUrl: PROD_BASE_URL,
            ytServerUrl: PROD_YT_SERVER_URL
        };

        if(hostname === 'localhost' || hostname === '127.0.0.1') {
            environment.isDev = true;
            environment.baseUrl = new URL('./', currentLocation.href).toString();
            environment.ytServerUrl = 'ws://' + hostname + ':8090';
            return environment;
        }

        var githubDevMatch = hostname.match(/^(.*)-5500\.app\.github\.dev$/i);
        if(githubDevMatch) {
            environment.isDev = true;
            environment.baseUrl = new URL('./', currentLocation.href).toString();
            environment.ytServerUrl = 'wss://' + githubDevMatch[1] + '-8090.app.github.dev/';
        }

        return environment;
    }

    function appendDevModeBadge(doc) {
        if(doc.getElementById(DEV_MODE_BADGE_ID)) {
            return;
        }

        var badge = doc.createElement('div');
        badge.id = DEV_MODE_BADGE_ID;
        badge.textContent = 'DEV MODE';
        badge.style.position = 'fixed';
        badge.style.top = '12px';
        badge.style.left = '12px';
        badge.style.padding = '6px 10px';
        badge.style.borderRadius = '999px';
        badge.style.background = '#dc3545';
        badge.style.color = '#ffffff';
        badge.style.fontSize = '12px';
        badge.style.fontWeight = '700';
        badge.style.lineHeight = '1';
        badge.style.letterSpacing = '0.04em';
        badge.style.zIndex = '2147483647';
        badge.style.pointerEvents = 'none';
        doc.body.appendChild(badge);
    }

    function installDevModeBadge(doc, environment) {
        var currentDocument = doc || document;
        var currentEnvironment = environment || getEnvironment(window.location);

        if(!currentEnvironment.isDev) {
            return;
        }

        if(currentDocument.body) {
            appendDevModeBadge(currentDocument);
            return;
        }

        currentDocument.addEventListener('DOMContentLoaded', function handleDomContentLoaded() {
            currentDocument.removeEventListener('DOMContentLoaded', handleDomContentLoaded);
            appendDevModeBadge(currentDocument);
        });
    }

    window.ChatAssistEnvironment = {
        current: getEnvironment(window.location),
        getEnvironment: getEnvironment,
        installDevModeBadge: installDevModeBadge,
        PROD_BASE_URL: PROD_BASE_URL,
        PROD_YT_SERVER_URL: PROD_YT_SERVER_URL
    };

    installDevModeBadge(document, window.ChatAssistEnvironment.current);
})();
