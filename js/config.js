function convertStringToObject(str) {
    if(!str) return {};
    const pairs = str.split(',');
    const obj = {};

    for (let pair of pairs) {
        const [key, value] = pair.split('|');
        obj[key] = value;
    }

    return obj;
}

var url_string = window.location.href;
var url = new URL(url_string);
// ChatAssist 설정 변수
window.config = {};

window.config.allowExternalSource = url.searchParams.get("allowExternalSource") == "true"; // 외부이미지([img 주소] 문법) 허용하려면 true로 변경
window.config.allowEmoticon = url.searchParams.get("allowEmoticon") != "false"; // 디시콘 사용가능유무 사용금지로 바꾸려면 false로 변경
window.config.ignoreMQEmoticon = url.searchParams.get("ignoreMQEmoticon") != "false"; // 마퀴태그+디시콘 사용여부 사용하려면 false로 변경
window.config.ignoreNickname = !url.searchParams.get("ignoreNickname") ? "nightbot,twipkr" : url.searchParams.get("ignoreNickname") // 필터링할 닉네임 목록(,로 구분)
window.config.enableTwitchEmoticon = url.searchParams.get("enableTwitchEmoticon") != "false"; // 트위치 이모티콘 사용여부
window.config.TwitchEmoticonsize = !url.searchParams.get("TwitchEmoticonsize") ? "1.0" : url.searchParams.get("TwitchEmoticonsize"); //트위치 이모티콘 크기 1.0/2.0/3.0 처럼 입력
window.config.TwitchEmoticonMode = !url.searchParams.get("TwitchEmoticonMode") ? "light" : url.searchParams.get("TwitchEmoticonMode"); //트위치 이모티콘 라이트/다크모드 설정. light나 dark 둘중하나 입력

// 1.6.1.0 추가 - 채널명 입력
// 기존 tapic은 더이상 사용하지 않습니다.
window.config.channelname = !url.searchParams.get("twitch") ? "" : url.searchParams.get("twitch");

// kick 스트리머 아이디 입력
window.config.kickid = !url.searchParams.get("kick") ? "" : url.searchParams.get("kick");

// 유튜브 스트리머 아이디 입력
window.config.ytChannel = !url.searchParams.get("ytChannel") ? "" : url.searchParams.get("ytChannel");

// 유튜브 라이브 채팅 중계 서버 주소
window.config.ytServer = !url.searchParams.get("ytServer") ? "" : url.searchParams.get("ytServer");

// 치지직 스트리머 채널 아이디 입력(베타)
window.config.nvrChannel = !url.searchParams.get("nvrChannel") ? "" : url.searchParams.get("nvrChannel");

// 씨미(ci.me) 스트리머 아이디 입력
window.config.cimeChannel = !url.searchParams.get("cime") ? "" : url.searchParams.get("cime");

// 이모티콘
window.emoticon = {};
window.emoticon.address = url.searchParams.get("list");
window.emoticon.isActive = false; // 이모티콘 목록 불러와졌는지 여부
window.emoticon.list = {}; // 이모티콘 목록(위 address에서 불러와서 채워짐)

// 치환 리스트
// 입력한 단어는 채팅 위젯에서 치환되어 보입니다
// 비울경우 {}로 대체
window.config.replace = convertStringToObject(url.searchParams.get("replace")) // 입력예 금지표현1|바꿀표현1,금지표현2|바꿀표현ㅁㅁ,금지331|ㅁㄴㅇㄹ

// 스타일 설정 (기본값 지정 후 searchParams으로 오버라이드)
window.config.chat = {};
window.config.chat.platformIcon = url.searchParams.get("platformIcon") !== null ? url.searchParams.get("platformIcon") != "false" : true;
window.config.chat.platform = url.searchParams.get("platform") !== null ? url.searchParams.get("platform").split(",") : ["all"];
window.config.chat.animation = url.searchParams.get("animation") !== null ? url.searchParams.get("animation") : "fade";
window.config.chat.chatFade = url.searchParams.get("chatFade") !== null ? parseInt(url.searchParams.get("chatFade"), 10) : 30;
window.config.chat.font = url.searchParams.get("font") !== null ? url.searchParams.get("font") : "sans-serif";
window.config.chat.fontUsernameSize = url.searchParams.get("fontUsernameSize") !== null ? parseInt(url.searchParams.get("fontUsernameSize"), 10) : 14;
window.config.chat.fontUsernameColor = url.searchParams.get("fontUsernameColor") !== null ? url.searchParams.get("fontUsernameColor") : "255, 255, 255";
window.config.chat.fontChatSize = url.searchParams.get("fontChatSize") !== null ? parseInt(url.searchParams.get("fontChatSize"), 10) : 16;
window.config.chat.fontChatColor = url.searchParams.get("fontChatColor") !== null ? url.searchParams.get("fontChatColor") : "255, 255, 255";
window.config.chat.backgroundColor = url.searchParams.get("backgroundColor") !== null ? url.searchParams.get("backgroundColor") : "255, 255, 255";
window.config.chat.backgroundAlpha = url.searchParams.get("backgroundAlpha") !== null ? parseFloat(url.searchParams.get("backgroundAlpha")) : 0;
window.config.chat.chatBackgroundColor = url.searchParams.get("chatBackgroundColor") !== null ? url.searchParams.get("chatBackgroundColor") : "255, 255, 255";
window.config.chat.chatBackgroundAlpha = url.searchParams.get("chatBackgroundAlpha") !== null ? parseFloat(url.searchParams.get("chatBackgroundAlpha")) : 0.25;
window.config.chat.debug = url.searchParams.get("debug") !== null ? url.searchParams.get("debug") == "true" : false;

// 익명화 설정
// 방송에 표시되는 닉네임만 익명화할수 있습니다.
window.config.anon = url.searchParams.get("anon") == "true"; // 익명 사용시 true
window.config.anon_nickname = url.searchParams.get("anon_nickname");
window.config.anon_random = url.searchParams.get("anon_random") == "false" ? false : url.searchParams.get("anon_random"); // 랜덤 숫자를 붙이려면 "number" 랜덤 문자열을 붙이려면 "string"
window.config.random_length = !url.searchParams.get("random_length") ? 4 : parseInt(url.searchParams.get("random_length"), 10); // 랜덤 숫자/닉네임 길이 지정(위에서 number나 string 지정시)
window.config.fix_random_id = url.searchParams.get("fix_random_id") == "true"; // 랜덤 닉네임 고정(같은 시청자는 같은 랜덤 문자 배정) 활성화시 true - 새로고침시 초기화됨
