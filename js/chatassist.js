/*    ________          __  ___              _      __ _  __
 *   / ____/ /_  ____ _/ /_/   |  __________(_)____/ /| |/ /
 *  / /   / __ \/ __ `/ __/ /| | / ___/ ___/ / ___/ __/   / 
 * / /___/ / / / /_/ / /_/ ___ |(__  |__  ) (__  ) /_/   |  
 * \____/_/ /_/\__,_/\__/_/  |_/____/____/_/____/\__/_/|_|  
 *                 V E R S I O N    1.17.0
 *       Last updated by Lastorder-DC on 2026-03-15.
 */
// 변수 초기화
window.chat = {};
clientId = "6c4013c4-c290-433d-a772-070e02d63585";

// 채팅 소켓
window.chat.socket = null;
window.kicksocket = {};
window.kicksocket.isInited = false;
window.ytsocket = {};
window.ytsocket.isInited = false;
window.cimesocket = {};
window.cimesocket.isInited = false;

// 버전 번호
window.chat.version = "1.17.0";

// 채팅 관련 설정 변수
window.chat.template = null;
window.chat.stickytemplate = null;
window.chat.isInited = false;
window.chat._pendingPlatforms = new Set();
window.chat.failcount = 0;
window.chat.count = 0;
window.chat.cur_count = 0;
window.chat.maxcount = 20;
window.chat.emoticonfailcount = 0;
window.chat.sticky = false;

// 채팅 스타일 가져옴
window.chat.config = (typeof window.config.chat !== 'undefined') ? window.config.chat : {};

// 용어 설정 가져옴
window.verb = (typeof window.verb !== 'undefined') ? window.verb : {};

window.def_verb = {};
window.def_verb.emoticon = "이모티콘";

// 가져온 용어중 빠진 값은 기본값으로 지정
for(var key in window.def_verb) {
    if(typeof window.verb[key] === 'undefined') window.verb[key] = window.def_verb[key];
}

// 익명화 관련 내용
window.anon = {};
window.anon.nickdb = {};

if(typeof window.config.channelname === 'undefined') {
    if(typeof window.tapic !== 'undefined' && typeof window.tapic.channelname !== 'undefined') {
        window.config.channelname = window.tapic.channelname;
    } else {
        window.config.channelname = "lastorder_dc";
    }
}

// XMLHTTPRequest
var httpRequest;

/**
 * 채팅 템플릿 컴파일
 * @returns void
 */
function CompileChat() {
    Handlebars.registerHelper('ifCond', function(v1, v2, options) {
        if(v1 === v2) {
            return options.fn(this);
        }
        return options.inverse(this);
    });

    var source = $("#chat-template").html();
    window.chat.template = Handlebars.compile(source);
    source = $("#chat-template-sticky").html();
    window.chat.stickytemplate = Handlebars.compile(source);
}

/**
 * 임의 문자열을 반환하는 함수
 * @returns String
 */
function genID(type, length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    var i;
    if(type == "string") {
        for(i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
    } else {
        for(i = 0; i < length; i++) {
            result += (Math.floor(Math.random() * 9) + 1).toString();
        }
    }
    return result;
}

/**
 * 정규식 특수문자 이스케이프 함수
 * @returns {String}
 */
String.prototype.escapeRegExp = function() {
    return this.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * HTML 필터링
 * @returns {String}
 */
String.prototype.htmlEntities = function() {
    return String(this).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/&amp;gt/g, '&gt').replace(/&amp;lt/g, '&lt');
};

/**
 * 이모티콘 JSON 불러옴
 * @returns {Boolean}
 */
function LoadEmoticon() {
    if(!window.emoticon.address) {
        connect_chat();
        return true;
    }
    
    // BridgeBBCC 호환 이모티콘 목록은 script 태그를 사용해서 불러옴
    if(window.emoticon.address.split('.').pop() != "php") {
        var emoticon_js = document.createElement("script");
        emoticon_js.type = "text/javascript";
        emoticon_js.src = window.emoticon.address + "?ts=" + new Date().getTime();
        document.body.appendChild(emoticon_js);
    
        emoticon_js.onload = function() {
            if(!window.emoticon.isActive) {
                if (dcConsData.length == 0) {
                    addChatMessage("error", window.verb.emoticon + " 초기화 오류", window.verb.emoticon + " 리스트를 불러올 수 없습니다.", true, false);
                }
            
                addChatMessage("info", "불러오는중", window.verb.emoticon + " 목록 파싱중...", true, false);
                for(var index in dcConsData) {
                    var keywords = dcConsData[index].keywords;
                    for(var index2 in keywords) {
                        if(typeof dcConsData[index].uri === 'undefined') {
                            window.emoticon.list[keywords[index2]] = window.emoticon.address.replace(/[^\/]+\.js$/, "images/") + encodeURIComponent(dcConsData[index].name);
                        } else {
                            window.emoticon.list[keywords[index2]] = dcConsData[index].uri;
                        }
                    }
                }
                
                window.emoticon.isActive = true;
                window.emoticon.istwitchActive = true;
                addChatMessage("info", "불러오는중", window.verb.emoticon + " 목록을 불러왔습니다.", true, false);
                connect_chat();
            }
        }
        
        return true;
    } else {
        addChatMessage("error", "미지원 형식", "<span style='color:red;'>1.9.0.0 버전부터 예전 스타일 " + window.verb.emoticon + " 목록 지원이 중단되었습니다.</span>", true, false);

        return true;
    }
}

/**
 * 메세지에서 기본 스타일 문법 치환
 * @param {String} message
 * @returns {String}
 */
function replaceStyle(message) {
    //외부 이미지 문법
    //~이미지 켜기 혹은 설정 변수 변경으로 활성화
    if(window.config.allowExternalSource) {
        var image = message.match(/\[img ([^\]\"]*)\]/);
        if(image !== null && typeof image[1] !== 'undefined') {
            message = '<img class="extimg" src="https://proxy.chatassistx.cc/image/' + image[1] + '">';
        }

        // 나머지 외부 이미지 문법은 모두 삭제
        message = message.replace(/\[img ([^\]\"]*)\]/gi, "");

        // 외부이미지 사용시 이외 문자는 지워짐으로 변환할 이유 없음
        return message;
    }

    //닫는태그가 지정된 [b][i][s]
    message = message.replace(/\[b\](.*)\[\/b\]/gi, "<b>$1</b>"); //볼드 [b]blah[/b]
    message = message.replace(/\[i\](.*)\[\/i\]/gi, "<i>$1</i>"); //이탤릭 [i]blah[/i]
    message = message.replace(/\[s\](.*)\[\/s\]/gi, "<strike>$1</strike>"); //취소선 [s]blahp[/s]

    // 나무위키식
    message = message.replace(/'''(.*)'''/gi, "<b>$1</b>");
    message = message.replace(/''(.*)''/gi, "<i>$1</i>");
    message = message.replace(/~~(.*)~~/gi, "<strike>$1</strike>");
    message = message.replace(/--(.*)--/gi, "<strike>$1</strike>");
    message = message.replace(/__(.*)__/gi, "<u>$1</u>");

    //닫는 태그가 없는 [b][i][s]
    message = message.replace(/\[b\](.*)/gi, "<b>$1</b>"); //볼드 [b]blah
    message = message.replace(/\[i\](.*)/gi, "<i>$1</i>"); //이탤릭 [i]blah
    message = message.replace(/\[s\](.*)/gi, "<strike>$1</strike>"); //취소선 [s]blah

    //강제개행
    message = message.replace(/\[br\]/gi, "<br />");

    return message;
}

/**
 * 메세지의 마퀴태그 문법 파싱후 <marquee> 태그 반환
 * @param {String} match
 * @param {String} direction
 * @param {String} behavior
 * @param {String} loop
 * @param {String} scrollamount
 * @param {String} scrolldelay
 * @param {String} body
 * @param {String} offset
 *
 * @returns {String}
 */
function replaceMarquee(match, direction, behavior, loop, scrollamount, scrolldelay, body, offset) {
    // 빈 값 확인
    if(typeof direction == "undefined") direction = "";
    if(typeof behavior == "undefined") behavior = "";
    if(typeof loop == "undefined") loop = "";
    if(typeof scrollamount == "undefined") scrollamount = "";
    if(typeof scrolldelay == "undefined") scrolldelay = "";

    // 내용이 빈 mq 태그는 무의미하므로 리턴
    if(typeof body == "undefined") return "";

    var scrollamount_value = scrollamount.replace(/[^0-9]/g, "");

    // scrollamount 값을 50 이하로 제한함(50이 넘으면 50으로 강제 하향조정)
    if(scrollamount_value > 50) scrollamount = ' scrollamount=50';

    // 마퀴태그내 이모티콘이 오면 마퀴태그를 무시함
    if(window.emoticon.isActive && window.config.allowEmoticon && window.config.ignoreMQEmoticon) {
        // 우선 마퀴태그 내 이모티콘을 변환해봄
        body = body.replace(/~([^\ ~]*)/gi, replaceEmoticon);
        // 이모티콘이 있다면 그냥 마퀴태그 없이 변환된 이모티콘 이미지만 반환
        if(body.match(/<img/) != null) return body;
    }

    // 마퀴태그 만들어 반환
    return '<marquee' + direction + behavior + loop + scrollamount + scrolldelay + '>' + body + '</marquee>';
}

/**
 * 이모티콘 변환 함수
 * @param {String} match
 * @param {String} emoticon_key
 * @param {String} offset
 * @returns {String}
 */
function replaceEmoticon(match, emoticon_key, offset) {
    var emoticon = window.emoticon.list;
    emoticon_key = emoticon_key.toLowerCase();

    // 이모티콘이 없다면 그냥 반환함
    if(typeof emoticon[emoticon_key] == "undefined") {
        return match;
    } else {
        return "<img src=\"" + emoticon[emoticon_key] + "\" >";
    }
}

function TAPIC_replaceTwitchEmoticon(message, emotes) {
    var ranges;
    var id;
    var emote_id;
    var regExp;
    var replace_list = {};

    if(typeof emotes != 'undefined') {
        var emote_list = emotes.split("/");
        emote_list.forEach(function(emote_replace) {
            ranges = emote_replace.split(":");
            id = ranges[0];
            if(typeof ranges[1] == 'undefined') return;
            ranges = ranges[1].split(",");
            if(typeof ranges[0] != 'undefined') {
                ranges = ranges[0].split("-");
                emote_id = message.substring(parseInt(ranges[0]), parseInt(ranges[1]) + 1);
                replace_list[emote_id] = id;
            }
        });

        for(var replace_id in replace_list) {
            regExp = new RegExp(replace_id.escapeRegExp(), "g");
            message = message.replace(regExp, "<img class=\"twitch_emoticon\" src=\"https://static-cdn.jtvnw.net/emoticons/v2/" + replace_list[replace_id] + "/default/" + (!window.config.TwitchEmoticonMode ? "light" : window.config.TwitchEmoticonMode) + "/" + window.config.TwitchEmoticonsize + "\" >");
        }
    }

    return message;
}

function KICK_replaceTwitchEmoticon(message) {
    const regex = /\[emote:(\d+):([^\]]+)\]/g;
    const replacedMessage = message.replace(regex, (match, number, text) => {
    const imageUrl = `https://files.kick.com/emotes/${number}/fullsize`;
        return `<img class="kick_emoticon" src="${imageUrl}" alt="${text}">`;
    });

    return replacedMessage;
}

function NAVER_replaceEmoticon(message, emotes) {
    var regex = /{:([^:]+):}/g;
    var result = message.replace(regex, function(match, code) {
        if(typeof emotes[code] === 'undefined') return "";
        else return `<img class="naver_emoticon" src="${emotes[code]}" alt="치지직 이모티콘 ${code}">`;
    });
  
    return result;
  }

/**
 * 유튜브(YouTube) 이모티콘 변환 함수
 * 서버에서 [yt-emoji:이미지URL] 형식으로 전달된 이모지를 <img> 태그로 변환
 * @param {String} message
 * @returns {String}
 */
function YT_replaceEmoticon(message) {
    var regex = /\[yt-emoji:(https?:\/\/[^\]]+)\]/g;
    return message.replace(regex, function(match, url) {
        return '<img class="yt_emoticon" src="' + url + '" alt="YouTube emoji" style="vertical-align: middle; height: 1.5em; width: 1.5em;">';
    });
}

/**
 * 씨미(ci.me) 이모티콘 그룹 매핑
 * 이모지 코드의 접두사에 따라 그룹(폴더)을 결정
 * 긴 접두사를 먼저 배치하여 올바른 매칭을 보장
 * 새 그룹 추가 시 { prefix: "접두사", group: "그룹명" } 형태로 추가
 */
var CIME_EMOJI_GROUPS = [
    { prefix: "Pixel-cat", group: "Pixel" },
    { prefix: "Pixel-item", group: "Pixel" },
    { prefix: "be-tx", group: "Beam" },
    { prefix: "vtm", group: "Vt" },
    { prefix: "cartoon", group: "Cartoon" },
    { prefix: "vt", group: "Vt" },
    { prefix: "be", group: "Beam" },
    { prefix: "wa", group: "Basic" },
    { prefix: "sh", group: "Basic" },
    { prefix: "emo", group: "Basic" }
];

/**
 * 씨미(ci.me) 이모지 코드로부터 이미지 URL을 반환
 * @param {String} code - 이모지 코드 (예: be-039, vt-01, 4E6L-yumeka)
 * @returns {String} 이미지 URL
 */
function CIME_getEmojiUrl(code) {
    for (var i = 0; i < CIME_EMOJI_GROUPS.length; i++) {
        if (code.indexOf(CIME_EMOJI_GROUPS[i].prefix) === 0) {
            return "https://streaming.cf.ci.me/public/assets/images/emoji/" + CIME_EMOJI_GROUPS[i].group + "/" + code + ".webp";
        }
    }
    // 기본값: 구독 이모티콘 (channel-emojis)
    return "https://streaming.cf.ci.me/channel-emojis/" + code + ".png";
}

/**
 * 씨미(ci.me) 이모티콘 변환 함수
 * 이모티콘 형식: :emoticon-code: (예: :be-039:)
 * @param {String} message
 * @returns {String}
 */
function CIME_replaceEmoticon(message) {
    var regex = /:([a-zA-Z0-9_-]+):/g;
    message = message.replace(regex, function(match, code) {
        var url = CIME_getEmojiUrl(code);
        return '<img class="cime_emoticon" src="' + url + '" alt="' + code + '">';
    });
    return message;
}

/**
 * 테마 적용 함수
 * @param {String} themeValue - 테마 이름, 외부 CSS URL, 또는 초기화 키워드
 * @param {Boolean} showMessage - 채팅 메시지로 결과를 표시할지 여부
 * @returns {Boolean} 테마 적용 성공 여부
 */
function applyTheme(themeValue, showMessage) {
    if(!themeValue) return false;

    // 기존 테마 스타일시트 제거
    $("#chatassistx-theme").remove();

    if(themeValue === "초기화" || themeValue === "없음" || themeValue === "제거") {
        if(showMessage) addChatMessage("warning", "테마 변경 알림", "테마가 초기화되었습니다.", true, false);
        return true;
    } else if(themeValue.startsWith("http://") || themeValue.startsWith("https://")) {
        // 외부 CSS URL인 경우 .css 확장자만 허용
        var cssUrl = themeValue.split("?")[0].split("#")[0];
        if(!cssUrl.toLowerCase().endsWith(".css")) {
            if(showMessage) addChatMessage("warning", "테마 변경 알림", "CSS 파일만 불러올 수 있습니다. (.css 확장자 필요)", true, false);
            return false;
        }
        $("head").append($('<link>', { id: 'chatassistx-theme', rel: 'stylesheet', type: 'text/css', href: themeValue }));
        if(showMessage) addChatMessage("warning", "테마 변경 알림", "외부 테마가 적용되었습니다.", true, false);
        return true;
    } else {
        // 로컬 테마 이름인 경우 themes 폴더에서 불러옴
        var themeName = themeValue.replace(/[^a-zA-Z0-9_-]/g, "");
        if(!themeName) {
            if(showMessage) addChatMessage("warning", "테마 변경 알림", "올바른 테마 이름을 입력해주세요.", true, false);
            return false;
        }
        $("head").append($('<link>', { id: 'chatassistx-theme', rel: 'stylesheet', type: 'text/css', href: './themes/' + themeName + '/index.css' }));
        if(showMessage) addChatMessage("warning", "테마 변경 알림", "테마 '" + themeName + "'이(가) 적용되었습니다.", true, false);
        return true;
    }
}

// 폰트 오버라이드에 사용 가능한 폰트 목록
var AVAILABLE_FONTS = {
    "default": { family: "", label: "테마 기본" },
    "RoundedFixedsys": { family: "'RoundedFixedsys', monospace", label: "둥근모꼴+ Fixedsys" },
    "SchoolSafetyChalkboardEraser": { family: "'SchoolSafetyChalkboardEraser', sans-serif", label: "학교안심 칠판지우개" },
    "KyoboHandwriting2019": { family: "'KyoboHandwriting2019', sans-serif", label: "교보손글씨 2019" },
    "GMarketSans": { family: "'GMarketSans', sans-serif", label: "G마켓 산스" },
    "Pretendard": { family: "'Pretendard', sans-serif", label: "프리텐다드" },
    "NanumSquare": { family: "'NanumSquare', sans-serif", label: "나눔스퀘어" },
    "TtangsBudaeJjigae": { family: "'TtangsBudaeJjigae', sans-serif", label: "땅스부대찌개" }
};

/**
 * 폰트 오버라이드 적용 함수
 * @param {String} fontKey - AVAILABLE_FONTS의 키
 */
function applyFontOverride(fontKey) {
    $("#chatassistx-font-override").remove();
    if(!fontKey || fontKey === "default") return;

    var font = AVAILABLE_FONTS[fontKey];
    if(!font || !font.family) return;

    var css = ".chat_text_nickname, .chat_text_message { font-family: " + font.family + " !important; }";
    $("head").append($('<style>', { id: 'chatassistx-font-override', text: css }));
}

/**
 * 명령어 변환 함수
 * @param {String} match
 * @param {String} command
 * @param {String} commandarg
 * @param {String} offset
 * @returns {String}
 */
function replaceCommand(match, command, commandarg, offset) {
    var message = "";
    console.log(command);

    switch (command) {
        case "채팅초기화":
            $(".chat_container").html("");
            break;
        case "이미지":
            message = commandarg.replace("~이미지", "");
            message = message.split(" ");
            if(typeof message[0] === 'undefined') return match;
            if(message[0] === "켜기" || message[0] === "활성화" || message[0] === "온") {
                window.config.allowExternalSource = true;
                message = "외부 이미지 문법이 켜졌습니다.";
            }
            if(message[0] === "끄기" || message[0] === "비활성화" || message[0] === "오프") {
                window.config.allowExternalSource = false;
                message = "외부 이미지 문법이 꺼졌습니다.";
            }

            // 고정 메세지로 출력
            addChatMessage("warning", "설정 변경 알림", message, true, false);
            break;
        case window.verb.emoticon:
            message = commandarg.replace("~" + window.verb.emoticon, "");
            message = message.split(" ");
            if(typeof message[0] === 'undefined') return match;
            if(message[0] === "켜기" || message[0] === "활성화" || message[0] === "온") {
                window.config.allowEmoticon = true;
                message = window.verb.emoticon + "이 켜졌습니다.";
            }
            if(message[0] === "끄기" || message[0] === "비활성화" || message[0] === "오프") {
                window.config.allowEmoticon = false;
                message = window.verb.emoticon + "이 꺼졌습니다.";
            }
            // 고정 메세지로 출력
            addChatMessage("warning", "설정 변경 알림", message, true, false);
            break;
        case "테마":
            message = commandarg.replace("~테마", "").trim();
            if(!message) return match;
            applyTheme(message, true);
            break;
        default:
            return match;
    }

    return "COMMAND_DO_NOT_PRINT";
}

/**
 * 채팅 스타일 반영
 * @returns void
 */
function updateStyle() {
    $(".chat_text_nickname").css({
        'font-family': window.chat.config.font,
        'font-size': window.chat.config.fontUsernameSize,
        "color": "rgb(" + window.chat.config.fontUsernameColor + ")"
    });
    $(".chat_text_message").css({
        'font-family': window.chat.config.font,
        'font-size': window.chat.config.fontChatSize,
        "color": "rgb(" + window.chat.config.fontChatColor + ")",
        "background-color": "rgba(" + window.chat.config.chatBackgroundColor + "," + (window.chat.config.chatBackgroundAlpha * 0.01) + ")"
    });
    $("body").css("background", "rgba(" + window.chat.config.backgroundColor + "," + (window.chat.config.backgroundAlpha * 0.01) + ")");
}

/**
 * 봇 채팅 필터링 함수
 * 필터링 대상 닉네임이면 true 반환
 * @param {String} nickname
 * @returns {Boolean}
 */
function filterNick(nickname) {
    //BUGFIX 필터링 닉네임이 비어있으면 채팅이 뜨지 않는 문제 수정
    if(window.config.ignoreNickname === '') return false;
    var list = window.config.ignoreNickname.split(",");

    if(list.indexOf(nickname.toLowerCase()) != -1) return true;
    else return false;
}

/**
 * 스트리머 닉네임 여부를 판단하는 함수
 * [DEPRECATED] this function always return false
 * @param {String} nickname
 * @returns {Boolean}
 */
function isStreamer(platform, nickname) {
    return false;
}

/**
 * 채팅메세지 추가 함수
 * @param {String} platform
 * @param {String} nickname
 * @param {String} message
 * @param {Boolean} sticky
 * @param {Boolean} ext_args
 * @returns {String}
 */
function addChatMessage(platform, nickname, message, sticky, ext_args) {
    var $chatElement;
    var $remove_temp;
    var chat;
    var rawprint = false;
    var message_regex;

    // 초기화 전엔 일반채팅은 무시하며 고정 채팅만 일반채팅으로 출력
    if(!window.chat.isInited) {
        if(!sticky) return;
        else sticky = false;
    }

    //이미 고정된 메세지가 있었다면 추가로 고정하지 않음
    if(window.chat.sticky && sticky) return;

    if(typeof ext_args === "boolean") {
        rawprint = ext_args;
        ext_args = {};
        ext_args.rawprint = rawprint;
        ext_args.isStreamer = false;
        ext_args.isMod = false;
    } else if(typeof ext_args === "object" && typeof ext_args.rawprint === "boolean") {
        rawprint = ext_args.rawprint;
    } else {
        console.error("ext_args format is wrong - expected object or boolean, got " + typeof ext_args);
        ext_args = {};
        ext_args.rawprint = rawprint;
        ext_args.isStreamer = false;
        ext_args.isMod = false;
    }

    if(rawprint) {
        // 강제개행 문법만 변환
        message = message.replace(/\[br\]/gi, "<br />");
    } else {
        if(filterNick(nickname)) return;

        // 플랫폼 필터링
        if(window.chat.config.platform && window.chat.config.platform.indexOf("all") === -1) {
            if(window.chat.config.platform.indexOf(platform) === -1) return;
        }

        // 플랫폼 아이콘 미사용시
        if(!window.chat.config.platformIcon) {
            platform = "none";
        }

        // 유튜브 이모지 마커를 replaceStyle에서 보호하기 위해 임시 치환
        // (이모지 URL에 -- 등 replaceStyle에서 변환하는 패턴이 포함될 수 있음)
        var ytEmojiPlaceholders = [];
        if(platform == "youtube") {
            message = message.replace(/\[yt-emoji:(https?:\/\/[^\]]+)\]/g, function(match) {
                var idx = ytEmojiPlaceholders.length;
                ytEmojiPlaceholders.push(match);
                return '\x00YTEMOJI' + idx + '\x00';
            });
        }

        //기본문법 변환
        message = replaceStyle(message);

        // 유튜브 이모지 마커 복원
        for(var i = 0; i < ytEmojiPlaceholders.length; i++) {
            message = message.replace('\x00YTEMOJI' + i + '\x00', ytEmojiPlaceholders[i]);
        }

        // 금지어 치환
        for(var key in window.config.replace) {
            message_regex = new RegExp(key.escapeRegExp(), "gi");
            message = message.replace(message_regex, window.config.replace[key]);
        }
        
        // 메세지 안 트위치 이모티콘 변환
        if(platform == "twitch") message = TAPIC_replaceTwitchEmoticon(message, ext_args.emotes);
        if(platform == "kick") message = KICK_replaceTwitchEmoticon(message, ext_args.emotes);
        if(platform == "naver") message = NAVER_replaceEmoticon(message, ext_args.emotes);
        if(platform == "cime") message = CIME_replaceEmoticon(message);
        if(platform == "youtube") message = YT_replaceEmoticon(message);

        // marquee 태그 변환
        message = message.replace(/\[mq( direction=[^\ ]*)?( behavior=[^\ ]*)?( loop=[^\ ]*)?( scrollamount=[^\ ]*)?( scrolldelay=[^\ ]*)?\](.*)\[\/mq\]/gi, replaceMarquee);

        // 메세지 안 이모티콘 변환(시동어 ~ 입력후 등록한 이모티콘 이름 입력하면 됨)
        if(window.emoticon.isActive && window.config.allowEmoticon) message = message.replace(/~([^\ ~]*)/gi, replaceEmoticon);

        if(platform == "naver") {
            // 스트리머 뱃지
            if(ext_args.isStreamer) {
                message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                nickname = '<img style="vertical-align: middle;" src="https://ssl.pstatic.net/static/nng/glive/icon/streamer.png" alt="스트리머" class="badge streamer">&nbsp;' + nickname;
            }

            // 모더레이터
            if(ext_args.isMod) {
                nickname = "<b>" + nickname + "</b>";
                message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                nickname = '<img style="vertical-align: middle;" src="https://ssl.pstatic.net/static/nng/glive/icon/manager.png" alt="채팅 운영자" class="badge mod">&nbsp;' + nickname;
            }
        } else if(platform == "cime") {
            // 스트리머 뱃지
            if(ext_args.isStreamer) {
                message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                nickname = '<img style="vertical-align: middle;" src="https://streaming.cf.ci.me/public/assets/images/badge/STREAMER.webp" alt="스트리머" class="badge streamer">&nbsp;' + nickname;
            }

            // 모더레이터
            if(ext_args.isMod) {
                nickname = "<b>" + nickname + "</b>";
                message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                nickname = '<img style="vertical-align: middle;" src="https://streaming.cf.ci.me/public/assets/images/badge/CHAT_MANAGER.webp" alt="모더레이터" class="badge mod">&nbsp;' + nickname;
            }
        } else if(platform == "youtube") {
            // 방송 소유자 뱃지
            if(ext_args.isStreamer) {
                message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                nickname = '<img style="vertical-align: middle;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsSAAALEgHS3X78AAAA3klEQVQ4y2NgGLng+5P9/78/2f+fJA1/vz3vRhb7++1599N1jv+frnPEKodsAROM8evDLYZXe9NLfrw8A5d8f7an5P/vLwz/f39heH+utwQm/uPlmf+v9qaX/PpwC24wC9xEVl6Gv9+eM7w5kMnw4Xzvf1YBNYb3p5rgCn88Pcjw9f7m/78/3GJ4cyATrgfDIFYBNbjgl1srsHof2WB0PXCvMbHxMpAKkPXADWITVGck1SBkPUzIEoys3EQbgq4WxSBkPxMC6GpRDEKOBYLhg6YW1UWCJLhIkEYuGsYAABF9W/Yuoo7SAAAAAElFTkSuQmCC" alt="Owner" class="badge streamer">&nbsp;' + nickname;
            }

            // 모더레이터
            if(ext_args.isMod) {
                nickname = "<b>" + nickname + "</b>";
                message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                nickname = '<svg style="vertical-align: middle; width: 18px; height: 18px;" viewBox="0 0 16 16" class="badge mod"><path fill="#5e84f1" d="M9.64589146,7.05569719 C9.83346524,6.562372 9.93617022,6.02722257 9.93617022,5.46808511 C9.93617022,3.00042984 7.93574038,1 5.46808511,1 C4.67485908,1 3.93000562,1.21498266 3.2874668,1.59379395 L5.09918785,3.40551499 L3.40551499,5.09918785 L1.59379395,3.2874668 C1.21498266,3.93000562 1,4.67485908 1,5.46808511 C1,7.93574038 3.00042984,9.93617022 5.46808511,9.93617022 C6.02722257,9.93617022 6.562372,9.83346524 7.05569719,9.64589146 L12.4098057,15 L15,12.4098057 L9.64589146,7.05569719 Z"></path></svg>&nbsp;' + nickname;
            }
        } else {
            // 스트리머 뱃지
            if(ext_args.isStreamer) {
                message = message.replace(/~([^ ]+)+(?: )*(.+)*/gi, replaceCommand);
                nickname = '<img style="vertical-align: middle;" src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1" alt="Broadcaster" class="badge streamer">&nbsp;' + nickname;
            }

            // 모더레이터는 굵게
            if(ext_args.isMod) {
                nickname = "<b>" + nickname + "</b>";
                nickname = '<img style="vertical-align: middle;" src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1" alt="Moderator" class="badge mod">&nbsp;' + nickname;
            }
        }

        if(window.config.anon && window.chat.isInited && !sticky) {
            if(typeof window.config.anon_nickname === 'undefined') {
                window.config.anon_nickname = "시청자";
            }

            nickname = window.config.anon_nickname;
            if(window.config.anon_random !== false) {
                if(typeof window.config.anon_random === 'undefined') {
                    window.config.anon_random = "string";
                }
                if(typeof window.config.random_length === 'undefined') {
                    window.config.random_length = 4;
                }
                if(typeof window.config.fix_random_id === 'undefined') {
                    window.config.fix_random_id = false;
                }

                var rand_id;
                if(window.config.fix_random_id) {
                    if(typeof window.anon.nickdb[ext_args.id] === 'undefined') {
                        window.anon.nickdb[ext_args.id] = {};
                        window.anon.nickdb[ext_args.id].type = window.config.anon_random;
                        window.anon.nickdb[ext_args.id].length = window.config.random_length;
                        window.anon.nickdb[ext_args.id].rand_id = genID(window.config.anon_random, window.config.random_length);
                    }

                    if(window.anon.nickdb[ext_args.id].type != window.config.anon_random || window.anon.nickdb[ext_args.id].length != window.config.random_length) {
                        window.anon.nickdb[ext_args.id].rand_id = genID(window.config.anon_random, window.config.random_length);
                    }

                    rand_id = window.anon.nickdb[ext_args.id].rand_id;
                } else {
                    rand_id = genID(window.config.anon_random, window.config.random_length);
                }

                nickname += " " + rand_id;
            }
        }

        // 명령어 입력은 화면에 표시하지 않음
        if(message.indexOf("COMMAND_DO_NOT_PRINT") != -1) return;
    }

    chat = {
        num: window.chat.cur_count,
        platform: platform,
        nickname: nickname,
        message: message,
        notitle: "NOTITLE"
    };
    $chatElement = sticky ? $(window.chat.stickytemplate(chat)) : $(window.chat.template(chat));
    $chatElement.appendTo($(".chat_container"));
    updateStyle();
    if(window.chat.config.animation == "none") {
        $chatElement.show();
    } else {
        $chatElement.show(window.chat.config.animation, {
            easing: "easeOutQuint",
            direction: "down"
        });
    }

    if(sticky) window.chat.sticky = true;

    window.chat.count++;
    window.chat.cur_count++;

    if(sticky || window.chat.config.chatFade != 0) {
        var fadeTime = sticky ? 10000 : window.chat.config.chatFade * 1000;
        if(window.chat.config.animation == "none") {
            $chatElement.delay(fadeTime).hide(0, function() {
                $(this).remove();
                window.chat.count--;
                window.chat.sticky = false;
            });
        } else {
            $chatElement.delay(fadeTime).hide(window.chat.config.animation, 1000, function() {
                $(this).remove();
                window.chat.count--;
                window.chat.sticky = false;
            });
        }

        if(window.chat.count > window.chat.maxcount) {
            window.chat.count--;
            $remove_temp = $(".chat_container div.chat_div:first-child");
            $remove_temp.remove();
        }

        if(window.chat.cur_count > window.chat.maxcount) {
            window.chat.cur_count = 0;
        }
    } else {
        if(window.chat.count > window.chat.maxcount) {
            window.chat.count--;
            $remove_temp = $(".chat_container div.chat_div:first-child");
            $remove_temp.remove();
        }

        if(window.chat.cur_count > window.chat.maxcount) {
            window.chat.cur_count = 0;
        }
    }
}

function _markPlatformConnected(platform) {
    if (!window.chat._pendingPlatforms.has(platform)) return;
    window.chat._pendingPlatforms.delete(platform);
    if (window.chat._pendingPlatforms.size === 0) {
        window.chat.isInited = true;
        addChatMessage("info", "NOTITLE", "<span class='logo'><pre>   ________          __  ___              _      __ _  __[br]  / ____/ /_  ____ _/ /_/   |  __________(_)____/ /| |/ /[br] / /   / __ <span class='backslash'>\\</span>/ __ `/ __/ /| | / ___/ ___/ / ___/ __/   /[br]/ /___/ / / / /_/ / /_/ ___ |(__  |__  ) (__  ) /_/   |[br]<span class='backslash'>\\</span>____/_/ /_/<span class='backslash'>\\</span>__,_/<span class='backslash'>\\</span>__/_/  |_/____/____/_/____/<span class='backslash'>\\</span>__/_/|_|</pre></span><span class='versionstring'><pre>[br]V E R S I O N      V. " + window.chat.version + "[br]초 기 화    성 공</pre></span>", true, true);
    }
}

function connect_chat() {
    window.chat._pendingPlatforms = new Set();

    if(typeof window.config.channelname !== 'undefined' && !!window.config.channelname) {
        window.chat._pendingPlatforms.add('twitch');
    }
    
    if(typeof window.config.kickid !== 'undefined' && !!window.config.kickid) {
        window.chat._pendingPlatforms.add('kick');
    }
    
    if(typeof window.config.ytChannel !== 'undefined' && !!window.config.ytChannel) {
        window.chat._pendingPlatforms.add('youtube');
    }

    if(typeof window.config.nvrChannel !== 'undefined' && !!window.config.nvrChannel) {
        window.chat._pendingPlatforms.add('naver');
    }

    if(typeof window.config.cimeChannel !== 'undefined' && !!window.config.cimeChannel) {
        window.chat._pendingPlatforms.add('cime');
    }

    if(window.chat._pendingPlatforms.size === 0) {
        addChatMessage("info", "구성된 채널 없음", "연결할 채널이 하나 이상 구성되지 않았습니다.", true, false);
        return;
    }

    if(window.chat._pendingPlatforms.has('twitch')) {
        connect_twitch();
    }

    if(window.chat._pendingPlatforms.has('kick')) {
        connect_kick();
    }

    if(window.chat._pendingPlatforms.has('youtube')) {
        connect_yt();
    }

    if(window.chat._pendingPlatforms.has('naver')) {
        connect_naver();
    }

    if(window.chat._pendingPlatforms.has('cime')) {
        connect_cime();
    }
}

function connect_yt() {
    if(!window.config.ytServer) {
        window.config.ytServer = "wss://youtube-chat.chatassistx.cc";
    }

    var ytChannel = window.config.ytChannel;
    var ytServerUrl = window.config.ytServer;

    if(!ytServerUrl.startsWith("ws://") && !ytServerUrl.startsWith("wss://")) {
        ytServerUrl = "wss://" + ytServerUrl;
    }

    try {
        window.ytsocket.socket = new WebSocket(ytServerUrl);
    } catch(e) {
        addChatMessage("error", "YouTube 연결 오류", "WebSocket 연결에 실패했습니다: " + e.message, true, false);
        return;
    }

    // 라이브 스트림 재시도 타이머
    window.ytsocket.retryTimer = null;

    function clearYtRetryTimer() {
        if(window.ytsocket.retryTimer) {
            clearTimeout(window.ytsocket.retryTimer);
            window.ytsocket.retryTimer = null;
        }
    }

    function scheduleYtRetry() {
        clearYtRetryTimer();
        window.ytsocket.retryTimer = setTimeout(function() {
            window.ytsocket.retryTimer = null;
            if(window.ytsocket.socket && window.ytsocket.socket.readyState === WebSocket.OPEN) {
                console.log("YouTube: Retrying channel connection...");
                window.ytsocket.socket.send(JSON.stringify({
                    type: "connect",
                    channel: ytChannel,
                    version: window.chat.version
                }));
            }
        }, 30000); // 30초 후 재시도
    }

    window.ytsocket.socket.onopen = function() {
        console.log("YouTube relay server connected");
        clearYtRetryTimer();
        // 30초 간격으로 ping 전송
        window.ytsocket.pingTimer = setInterval(function() {
            if(window.ytsocket.socket && window.ytsocket.socket.readyState === WebSocket.OPEN) {
                window.ytsocket.socket.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000);
    };

    window.ytsocket.socket.onmessage = function(event) {
        var data;
        try {
            data = JSON.parse(event.data);
        } catch(e) {
            console.error("YouTube message parse error:", e);
            return;
        }

        if(data.type === "version") {
            console.log("YouTube relay server version:", data.message);
            // 버전 메시지를 받은 후 채널 연결 요청
            window.ytsocket.socket.send(JSON.stringify({
                type: "connect",
                channel: ytChannel,
                version: window.chat.version
            }));
        } else if(data.type === "pong") {
            // ping 응답 수신 - 별도 처리 불필요
        } else if(data.type === "chat" || data.type === "superchat") {
            var message = data.message || "";
            // emojiMap이 있으면 이모지 키를 실제 URL로 치환
            if(data.emojiMap) {
                message = message.replace(/\[yt-emoji:([^\]]+)\]/g, function(match, key) {
                    return data.emojiMap[key] ? '[yt-emoji:' + data.emojiMap[key] + ']' : match;
                });
            }
            // 슈퍼챗인 경우 금액 표시
            if(data.type === "superchat" && data.amount) {
                message = "[" + data.amount + "] " + message;
            }
            addChatMessage("youtube", data.nickname || "Unknown", message, false, {
                rawprint: false,
                isStreamer: data.isOwner || false,
                isMod: data.isMod || false,
                id: data.id || ""
            });
        } else if(data.type === "not_found" || data.type === "ended") {
            // 라이브 스트림을 찾지 못했거나 종료됨 - 30초 후 재시도
            console.log("YouTube:", data.message);
            addChatMessage("info", "YouTube", data.message, true, false);
            scheduleYtRetry();
        } else if(data.type === "info") {
            console.log("YouTube info:", data.message);
            addChatMessage("info", "YouTube", data.message, true, false);
        } else if(data.type === "error") {
            console.error("YouTube error:", data.message);
            addChatMessage("error", "YouTube 오류", data.message, true, false);
        } else if(data.type === "connected") {
            console.log("YouTube info:", data.message);
            addChatMessage("info", "YouTube", data.message, true, false);
            _markPlatformConnected('youtube');
        } else if(data.type === "disconnected") {
            console.log("YouTube disconnected:", data.message);
            addChatMessage("info", "YouTube", data.message || "서버 연결이 종료되었습니다", true, false);
        }
    };

    window.ytsocket.socket.onclose = function() {
        console.log("YouTube relay server disconnected");
        window.ytsocket.isInited = false;
        clearYtRetryTimer();
        // ping 타이머 정리
        if(window.ytsocket.pingTimer) {
            clearInterval(window.ytsocket.pingTimer);
            window.ytsocket.pingTimer = null;
        }
        // 5초 후 WebSocket 재연결 시도
        setTimeout(function() {
            if(window.config.ytChannel && window.config.ytServer) {
                console.log("YouTube relay server reconnecting...");
                connect_yt();
            }
        }, 5000);
    };

    window.ytsocket.socket.onerror = function(err) {
        console.error("YouTube WebSocket error:", err);
    };

    window.ytsocket.isInited = true;
}

function connect_kick() {
    httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', `https://kick.com/api/v1/channels/${window.config.kickid}`);
    httpRequest.onreadystatechange = complete_connect_kick;
    httpRequest.send();

    return true;
}

function complete_connect_kick() {
    if(httpRequest.readyState === 4) {
        if(httpRequest.status === 200) {
            const kickData = JSON.parse(httpRequest.responseText);
            window.kicksocket.socket = new WebSocket("wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false");
            window.kicksocket.socket.onmessage = function(event) {
                // connect to channel
                if(!window.kicksocket.isInited && event.data.indexOf("connection_established") !== -1) {
                    window.kicksocket.socket.send(`{"event":"pusher:subscribe","data":{"auth":"","channel":"channel.${kickData.id}"}}`);
                    window.kicksocket.socket.send(`{"event":"pusher:subscribe","data":{"auth":"","channel":"chatrooms.${kickData.chatroom.id}.v2"}}`);
                    addChatMessage("info", "Kick 채팅 연결됨", window.config.kickid + " 채널에 연결되었습니다.", true, false);
                    window.kicksocket.isInited = true;
                    _markPlatformConnected('kick');
                } else if(event.data.indexOf("ChatMessageEvent") !== -1) {
                    var rawMessage = JSON.parse(event.data)
                    var message = JSON.parse(rawMessage.data)
                    console.log(message);
                    message.body = message.content;

                    var ext_args = {};
                    ext_args.isStreamer = rawMessage.data.indexOf('"type":"broadcaster"') !== -1;
                    ext_args.isMod = false;
                    ext_args.rawprint = false;
                    ext_args.emotes = void 0;
                    ext_args.color = void 0;
                    ext_args.subscriber = false;

                    addChatMessage("kick", message.sender.username.htmlEntities(), message.content, false, ext_args);
                }
            };
        } else {
            addChatMessage("error", "Kick 연결 오류", "존재하지 않는 kick 스트리머 아이디이거나 오류입니다.", true, false);
        }
    }
}

function connect_cime() {
    const cimeChannel = window.config.cimeChannel;

    try {
        // 1. chat-token 요청
        var xhr = new XMLHttpRequest();
        xhr.open('POST', `https://ci.me/api/app/channels/${cimeChannel}/chat-token`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);

                    if (!response.data || !response.data.token) {
                        addChatMessage("error", "ci.me 연결 오류", "ci.me 채팅 토큰을 가져올 수 없습니다.", true, false);
                        return;
                    }

                    var token = response.data.token;

                    // 2. 웹소켓 연결 (token을 sec-websocket-protocol로 전달)
                    window.cimesocket.socket = new WebSocket("wss://edge.ivschat.ap-northeast-2.amazonaws.com/", token);

                    window.cimesocket.socket.onopen = function(event) {
                        addChatMessage("info", "ci.me 채팅 연결됨", cimeChannel + " 채널에 연결되었습니다.", true, false);
                        window.cimesocket.isInited = true;
                        _markPlatformConnected('cime');
                    };

                    window.cimesocket.socket.onmessage = function(event) {
                        try {
                            var data = JSON.parse(event.data);

                            // MESSAGE 타입만 처리
                            if (data.Type !== "MESSAGE") return;
                            if (!data.Sender || !data.Sender.Attributes || !data.Sender.Attributes.user) return;

                            // 유저 정보 파싱
                            var userInfo = JSON.parse(data.Sender.Attributes.user);
                            var nickname = userInfo.ch.na;
                            var userId = data.Sender.UserId;
                            var content = data.Content;

                            var ext_args = {};
                            ext_args.isStreamer = false;
                            ext_args.isMod = false;

                            //userInfo의 c가 RS이면 스트리머, RM이면 모더레이터, 둘다 아니면 일반 유저로 간주
                            if (userInfo.c === "RS") {
                                ext_args.isStreamer = true;
                            } else if (userInfo.c === "RM") {
                                ext_args.isMod = true;
                            }
                            ext_args.rawprint = false;
                            ext_args.emotes = void 0;
                            ext_args.color = void 0;
                            ext_args.subscriber = false;
                            ext_args.id = userId;

                            addChatMessage("cime", nickname.htmlEntities(), content.htmlEntities(), false, ext_args);
                        } catch (error) {
                            console.error("ci.me 메세지 파싱 오류: ", error);
                        }
                    };

                    window.cimesocket.socket.onerror = function(error) {
                        console.error("ci.me WebSocket 오류: ", error);
                    };

                    window.cimesocket.socket.onclose = function() {
                        window.cimesocket.isInited = false;
                    };
                } else {
                    addChatMessage("error", "ci.me 연결 오류", "ci.me 채팅 토큰을 가져올 수 없습니다.", true, false);
                }
            }
        };

        xhr.send();
    } catch (error) {
        console.error("ci.me 연결 오류: ", error);
        addChatMessage("error", "ci.me 연결 오류", "ci.me 채팅 연결에 실패했습니다.", true, false);
    }
}

function connect_twitch() {
    var twitchJoined = false;
    window.chat.socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

    window.chat.socket.onopen = function(event) {
        window.chat.socket.send("PASS " + Math.floor((Math.random() * 9999) + 1000));
        window.chat.socket.send("NICK justinfan" + Math.floor((Math.random() * 9999) + 1000));
    };
    window.chat.socket.onmessage = function(event) {
        // connect to channel and request tags/membership
        if(!twitchJoined && event.data.indexOf("maze") !== -1) {
            twitchJoined = true;
            window.chat.socket.send("JOIN #" + window.config.channelname);
            window.chat.socket.send("CAP REQ :twitch.tv/tags twitch.tv/membership");
            addChatMessage("info", "트위치 채팅 연결됨", window.config.channelname + " 채널에 연결되었습니다.", true, false);
            _markPlatformConnected('twitch');
        } else if(event.data.indexOf("PING :tmi.twitch.tv") !== -1) {
            window.chat.socket.send("PONG :tmi.twitch.tv");
        } else if(event.data.indexOf(";") !== -1) {
            var ext_args = {};
            ext_args.isStreamer = false;
            ext_args.isMod = false;
            ext_args.rawprint = false;
            ext_args.emotes = void 0;
            ext_args.color = void 0;
            ext_args.subscriber = false;

            rawMessage = event.data.split(";");
            message = {};
            message.body = event.data.split("PRIVMSG #" + window.config.channelname + " :").pop().htmlEntities().replace("\r", "").replace("\n", "").replace(decodeURI("%01") + "ACTION ", "").replace(decodeURI("%01"), "");
            while(rawMessage.length > 0) {
                parseObj = rawMessage.pop();
                if(parseObj.split("=").length > 1) {
                    message[parseObj.split("=")[0]] = parseObj.split("=")[1];
                }
            }

            ext_args.id = message['user-id'];
            if(message.badges.indexOf("broadcaster/1") != -1) {
                ext_args.isStreamer = true;
                ext_args.isMod = true;
                ext_args.subscriber = true;
            } else if(message.mod == "1") {
                ext_args.isStreamer = false;
                ext_args.isMod = true;
            }

            if(message.subscriber == "1") {
                ext_args.subscriber = true;
            }

            if(message.emotes !== "emotes") {
                ext_args.emotes = message.emotes;
            }

            if(message.color !== "color") {
                ext_args.color = message.color;
            }

            if(window.chat.config.debug) console.log(message);
            if(window.chat.config.debug) console.log(ext_args);

            addChatMessage("twitch", message['display-name'].htmlEntities(), message.body, false, ext_args);
        }
    };
}

function connect_naver() {
    const nvrChannel = window.config.nvrChannel;
    try {
        // 1. nvrChannel을 이용하여 첫 번째 API 호출
        var xhr1 = new XMLHttpRequest();
        xhr1.open('GET', `https://api.chatassistx.cc/?command=getChannel&cid=${nvrChannel}`, false);
        xhr1.send();

        if (xhr1.status === 200) {
            var data1 = JSON.parse(xhr1.responseText);

            // 2. channelName 저장
            var channelName = data1.content.channelName;

            if (!channelName) {
                addChatMessage("error", "치지직 연결 오류", "존재하지 않는 치지직 스트리머 채널이거나 오류입니다.", true, false);
                return;
            }

            var xhr2 = new XMLHttpRequest();
            xhr2.open('GET', `https://api.chatassistx.cc/?command=getLiveStatus&cid=${nvrChannel}`, false);
            xhr2.send();

            if (xhr2.status === 200) {
                var data2 = JSON.parse(xhr2.responseText);

                // 3. chatChannelId 저장
                if (!data2.content || !data2.content.chatChannelId) {
                    addChatMessage("error", "치지직 연결 오류", "채팅창이 존재하지 않는 채널입니다.", true, false);
                    return;
                }
                var chatChannelId = data2.content.chatChannelId;

                // 4. accessToken 저장
                var accessToken = data2['access-token'];

                // 5. 웹소켓 연결
                var socket = new WebSocket(`wss://kr-ss${Math.floor(Math.random() * 4) + 1}.chat.naver.com/chat`);
                var pingInterval = null; // Ping 타이머 변수 추가

                // 6. 웹소켓으로 전송할 내용 구성
                var init_chat = {
                    ver: '3',
                    cmd: 100,
                    svcid: 'game',
                    cid: chatChannelId,
                    bdy: {
                        uid: null,
                        devType: 2001,
                        accTkn: accessToken,
                        auth: 'READ'
                    },
                    tid: 1
                };

                // 7. 웹소켓 응답 저장
                var socketResponse = null;

                socket.onopen = function () {
                    // 웹소켓 연결이 열렸을 때 init_chat 전송
                    socket.send(JSON.stringify(init_chat));

                    // ★ 20초 간격으로 Ping(cmd: 0) 전송 시작
                    pingInterval = setInterval(function() {
                        if (socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({ "ver": "3", "cmd": 0 }));
                        }
                    }, 20000);

                    addChatMessage("info", "치지직 채팅 연결됨", channelName + " 채널에 연결되었습니다.", true, false);
                    _markPlatformConnected('naver');
                };

                socket.onmessage = function (event) {
                    socketResponse = JSON.parse(event.data);

                    // 8. sid를 sid 변수에 저장한 후 login 전송
                    if (socketResponse.cmd === 10100) {
                        var sid = socketResponse.bdy.sid;
                        var login = {
                            ver: '3',
                            cmd: 5101,
                            svcid: 'game',
                            cid: chatChannelId,
                            sid: sid,
                            bdy: {
                                recentMessageCount: 50
                            },
                            tid: 2
                        };
                        socket.send(JSON.stringify(login));
                    
                    // ★ 서버의 Pong 응답(cmd: 10000) 무시
                    } else if (socketResponse.cmd === 10000) {
                        return; 
                        
                    // 혹시 모를 기존 cmd: 0 응답 처리 (무시)
                    } else if (socketResponse.cmd === 0) {
                        return;
                        
                    // 10. 채팅 처리
                    } else {
                        if (Array.isArray(socketResponse.bdy)) {
                            for (const chat of socketResponse.bdy) {
                                const profile = JSON.parse(chat['profile']);
                                const ext_args = {};
                                const extras = JSON.parse(chat['extras']);
                                
                                ext_args.isStreamer = (profile['userRoleCode'] == "streamer");
                                ext_args.isMod = (profile['userRoleCode'] == "streaming_chat_manager");
                                ext_args.rawprint = false;
                                ext_args.emotes = extras['emojis'];
                                ext_args.color = void 0;
                                ext_args.subscriber = false;
                                addChatMessage("naver", profile['nickname'].htmlEntities(), chat.msg.htmlEntities(), false, ext_args);
                            }
                        }
                    }
                };

                // ★ 웹소켓 연결이 끊어지면 Ping 타이머 해제
                socket.onclose = function () {
                    if (pingInterval) {
                        clearInterval(pingInterval);
                    }
                };
                
                socket.onerror = function (error) {
                    console.error("WebSocket Error: ", error);
                    if (pingInterval) {
                        clearInterval(pingInterval);
                    }
                };
            }
        }
    } catch (error) {
        console.error(error);
    }
}

function generateState() {
    const length = 20; // 상태 값의 길이
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const state = new Array(length).fill(null).map(() => 
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    return state;
}

function requestAuthorizationCode() {
    const url = `https://chzzk.naver.com/account-interlock`;
    
    const params = new URLSearchParams({
        clientId: clientId,
        redirectUri: "https://chzzk.chatassistx.cc/v1/token/create",
        state: generateState()
    });
    
    window.location.href = `${url}?${params}`;
}

$(document).ready(function() {
    CompileChat();
    LoadEmoticon();

    // searchParams에서 설정된 테마 적용
    if(window.config.theme) {
        applyTheme(window.config.theme, false);
    }

    // 폰트 오버라이드 적용
    if(window.config.fontOverride) {
        applyFontOverride(window.config.fontOverride);
    }
});
