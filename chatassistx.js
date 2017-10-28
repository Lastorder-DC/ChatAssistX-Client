/*    ________          __  ___              _      __ _  __
 *   / ____/ /_  ____ _/ /_/   |  __________(_)____/ /| |/ /
 *  / /   / __ \/ __ `/ __/ /| | / ___/ ___/ / ___/ __/   / 
 * / /___/ / / / /_/ / /_/ ___ |(__  |__  ) (__  ) /_/   |  
 * \____/_/ /_/\__,_/\__/_/  |_/____/____/_/____/\__/_/|_|  
 *                 V E R S I O N    1.6.0-dev1
 *       Last updated by Lastorder-DC on 2017-10-28.
 */

if(typeof window.chat === 'undefined') {
    // 변수 초기화
    window.chat = {};

    // 채팅 관련 설정 변수
    window.chat.template = null;
    window.chat.stickytemplate = null;
    window.chat.isInited = false;
    window.chat.failcount = 0;
    window.chat.count = 0;
    window.chat.cur_count = 0;
    window.chat.maxcount = 50;
    window.chat.emoticonfailcount = 0
    window.chat.sticky = false;
    
    // 기본 채팅 스타일
    window.chat.config = {};
    window.chat.config.platformIcon = true;
    window.chat.config.platform = "all";
    window.chat.config.animation = "fade";
    window.chat.config.chatFade = 10;
    window.chat.config.font = "Jeju Gothic";
    window.chat.config.fontUsernameSize = 14;
    window.chat.config.fontUsernameColor = "255, 255, 255";
    window.chat.config.fontChatSize = 16;
    window.chat.config.fontChatColor = "255, 255, 255";
    window.chat.config.backgroundColor = "255, 255, 255";
    window.chat.config.backgroundAlpha = 0;
    window.chat.config.chatBackgroundColor = "255, 255, 255";
    window.chat.config.chatBackgroundAlpha = 25;
}

// 버전 번호
window.chat.version = "1.6.0-dev1";

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
 * 이모티콘 JSON 불러옴
 * @returns {Boolean}
 */
function LoadEmoticon() {
    // 이모티콘 주소가 비어있으면 무시
    if(window.emoticon.address === "") return true;

    // httpRequest 초기화
    if (window.XMLHttpRequest) { // 파폭, 사파리, 크롬 등등 웹표준 준수 브라우저
        httpRequest = new XMLHttpRequest();
    } else if (window.ActiveXObject) { // 쓰레기 IE
        try {
            httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
        }
        catch (e) {
            try {
                httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
            }
            catch (e) {}
        }
    }

    if (!httpRequest) {
        addChatMessage("error","이모티콘 초기화 오류","XMLHTTPRequest를 초기화할수 없었습니다.",true,false);
        return false;
    }
    
    if(window.tapic.oauth === "") {
        addChatMessage("info","불러오는중","디시콘 목록을 불러오는중... (1 / 3)",true,false);
    } else {
        addChatMessage("info","불러오는중","디시콘 목록을 불러오는중... (1 / 1)",true,false);
    }
    
    httpRequest.onreadystatechange = CompleteLoadEmoticon;
    httpRequest.open('GET', window.emoticon.address);
    httpRequest.send();

    return true;
}

/**
 * 불러온 이모티콘 JSON 파일 파싱 후 배열에 저장
 * @returns void
 */
function CompleteLoadEmoticon() {
    if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
            try {
                window.chat.emoticonfailcount = 0;
                window.emoticon.list = JSON.parse(httpRequest.responseText);
                window.emoticon.isActive = true;
                
                if(window.tapic.oauth === "") {
                    addChatMessage("info","불러오는중","디시콘 목록을 불러왔습니다. (1 / 3)",true,false);
                    LoadTwitchEmoticon();
                } else {
                    window.emoticon.istwitchActive = true;
                    addChatMessage("info","불러오는중","디시콘 목록을 불러왔습니다. (1 / 1)",true,false);
                    
                    window.chat.isInited = true;
                    addChatMessage("info","TAPIC 사용","<span class='tapiclogo'><pre>  _________    ____  __________[br] /_  __/   |  / __ <span class='backslash'>\\</span>/  _/ ____/[br]  / / / /| | / /_/ // // /[br] / / / ___ |/ ____// // /___[br]/_/ /_/  |_/_/   /___/<span class='backslash'>\\</span>____/</pre></span><span class='tapicversionstring'><pre>[br]    TAPIC BY Skhmt</pre></span>",false,true);
                    
                    addChatMessage("info","NOTITLE","<span class='logo'><pre>   ________          __  ___              _      __ _  __[br]  / ____/ /_  ____ _/ /_/   |  __________(_)____/ /| |/ /[br] / /   / __ <span class='backslash'>\\</span>/ __ `/ __/ /| | / ___/ ___/ / ___/ __/   /[br]/ /___/ / / / /_/ / /_/ ___ |(__  |__  ) (__  ) /_/   |[br]<span class='backslash'>\\</span>____/_/ /_/<span class='backslash'>\\</span>__,_/<span class='backslash'>\\</span>__/_/  |_/____/____/_/____/<span class='backslash'>\\</span>__/_/|_|</pre></span><span class='versionstring'><pre>[br]V E R S I O N      V. " + window.chat.version + "[br]초 기 화    성 공</pre></span>",true,true);
                }
            }
            catch (e) {
                window.chat.emoticonfailcount++;
                if(window.chat.emoticonfailcount>10) addChatMessage("error","이모티콘 초기화 오류","이모티콘 JSON 파싱중 오류가 발생했습니다.",true,false);
                else setTimeout(LoadEmoticon, 1000);
            }
        } else {
            window.chat.emoticonfailcount++;
            if(window.chat.emoticonfailcount>10) addChatMessage("error","이모티콘 초기화 오류","이모티콘 JSON 다운로드중 오류가 발생했습니다.",true,false);
            else setTimeout(LoadEmoticon, 1000);
        }
    }
}

/**
 * 트위치 이모티콘 JSON 불러옴
 * @returns {Boolean}
 */
function LoadTwitchEmoticon() {
    // httpRequest 초기화
    if (window.XMLHttpRequest) { // 파폭, 사파리, 크롬 등등 웹표준 준수 브라우저
        httpRequest = new XMLHttpRequest();
    } else if (window.ActiveXObject) { // 쓰레기 IE
        try {
            httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
        }
        catch (e) {
            try {
                httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
            }
            catch (e) {}
        }
    }

    if (!httpRequest) {
        addChatMessage("error","이모티콘 초기화 오류","XMLHTTPRequest를 초기화할수 없었습니다.",true,false);
        return false;
    }
    
    addChatMessage("info","불러오는중","트위치 글로벌 이모티콘을 불러오는중... (2 / 3)",true,false);

    httpRequest.onreadystatechange = CompleteLoadTwitchEmoticon;
    httpRequest.open('GET', window.emoticon.twitch);
    httpRequest.send();

    return true;
}

/**
 * 불러온 이모티콘 JSON 파일 파싱 후 배열에 저장
 * @returns void
 */
function CompleteLoadTwitchEmoticon() {
    if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
            try {
                window.chat.emoticonfailcount = 0;
                window.emoticon.twitch_list = JSON.parse(httpRequest.responseText);
                window.emoticon.istwitchActive = true;
                
                addChatMessage("info","불러오는중","트위치 글로벌 이모티콘을 불러왔습니다. (2 / 3)",true,false);
                LoadTwitchSubEmoticon();
            }
            catch (e) {
                window.chat.emoticonfailcount++;
                if(window.chat.emoticonfailcount>10) addChatMessage("error","이모티콘 초기화 오류","이모티콘 JSON 파싱중 오류가 발생했습니다.",true,false);
                else setTimeout(LoadTwitchEmoticon, 1000);
            }
        } else {
            window.chat.emoticonfailcount++;
            if(window.chat.emoticonfailcount>10) addChatMessage("error","이모티콘 초기화 오류","이모티콘 JSON 다운로드중 오류가 발생했습니다.",true,false);
            else setTimeout(LoadTwitchEmoticon, 1000);
        }
    }
}

/**
 * 트위치 이모티콘 JSON 불러옴
 * @returns {Boolean}
 */
function LoadTwitchSubEmoticon() {
    // httpRequest 초기화
    if (window.XMLHttpRequest) { // 파폭, 사파리, 크롬 등등 웹표준 준수 브라우저
        httpRequest = new XMLHttpRequest();
    } else if (window.ActiveXObject) { // 쓰레기 IE
        try {
            httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
        }
        catch (e) {
            try {
                httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
            }
            catch (e) {}
        }
    }

    if (!httpRequest) {
        addChatMessage("error","이모티콘 초기화 오류","XMLHTTPRequest를 초기화할수 없었습니다.",true,false);
        return false;
    }
    
    addChatMessage("info","불러오는중","트위치 구독 이모티콘을 불러오는중... (3 / 3)",true,false);

    httpRequest.onreadystatechange = CompleteLoadTwitchSubEmoticon;
    httpRequest.open('GET', window.emoticon.twitch_sub);
    httpRequest.send();

    return true;
}

/**
 * 불러온 이모티콘 JSON 파일 파싱 후 배열에 저장
 * @returns void
 */
function CompleteLoadTwitchSubEmoticon() {
    if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
            try {
                window.chat.emoticonfailcount = 0;
                window.emoticon.twitch_sub_list = JSON.parse(httpRequest.responseText);
                window.emoticon.istwitchActive = true;
                
                addChatMessage("info","불러오는중","트위치 구독 이모티콘을 불러왔습니다. (3 / 3)",true,false);
                
                window.chat.isInited = true;
                addChatMessage("info","NOTITLE","<span class='logo'><pre>   ________          __  ___              _      __ _  __[br]  / ____/ /_  ____ _/ /_/   |  __________(_)____/ /| |/ /[br] / /   / __ <span class='backslash'>\\</span>/ __ `/ __/ /| | / ___/ ___/ / ___/ __/   /[br]/ /___/ / / / /_/ / /_/ ___ |(__  |__  ) (__  ) /_/   |[br]<span class='backslash'>\\</span>____/_/ /_/<span class='backslash'>\\</span>__,_/<span class='backslash'>\\</span>__/_/  |_/____/____/_/____/<span class='backslash'>\\</span>__/_/|_|</pre></span><span class='versionstring'><pre>[br]V E R S I O N      V. " + window.chat.version + "[br]초 기 화    성 공</pre></span>",true,true);
            }
            catch (e) {
                window.chat.emoticonfailcount++;
                if(window.chat.emoticonfailcount>10) addChatMessage("error","이모티콘 초기화 오류","이모티콘 JSON 파싱중 오류가 발생했습니다.",true,false);
                else setTimeout(LoadTwitchSubEmoticon, 1000);
            }
        } else {
            window.chat.emoticonfailcount++;
            if(window.chat.emoticonfailcount>10) addChatMessage("error","이모티콘 초기화 오류","이모티콘 JSON 다운로드중 오류가 발생했습니다.",true,false);
            else setTimeout(LoadTwitchSubEmoticon, 1000);
        }
    }
}

/**
 * 메세지에서 기본 스타일 문법 치환
 * @param {String} message
 * @returns {String}
 */
function replaceStyle(message) {
    //외부 이미지 문법(기본 비활성화 상태로 상단 설정변수를 true로 바꿔 활성화 가능)
    if(window.config.allowExternalSource) {
        // 일단 처음 나오는 이미지는 바꿈
        message = message.replace(/\[img ([^\]\"]*)\]/,"<img class='extimg' src=\"$1\" />");
        
        // 두번째 이후 이미지는 모두 삭제
        message = message.replace(/\[img ([^\]\"]*)\]/g,"");
    }

    //닫는태그가 지정된 [b][i][s]
    message = message.replace(/\[b\](.*)\[\/b\]/g,"<b>$1</b>"); //볼드 [b]blah[/b]
    message = message.replace(/\[i\](.*)\[\/i\]/g,"<i>$1</i>"); //이탤릭 [i]blah[/i]
    message = message.replace(/\[s\](.*)\[\/s\]/g,"<strike>$1</strike>"); //취소선 [s]blahp[/s]

    // 나무위키식
    message = message.replace(/'''(.*)'''/g,"<b>$1</b>");
    message = message.replace(/''(.*)''/g,"<i>$1</i>");
    message = message.replace(/~~(.*)~~/g,"<strike>$1</strike>");
    message = message.replace(/--(.*)--/g,"<strike>$1</strike>");
    message = message.replace(/__(.*)__/g,"<u>$1</u>");

    //닫는 태그가 없는 [b][i][s]
    message = message.replace(/\[b\](.*)/g,"<b>$1</b>"); //볼드 [b]blah
    message = message.replace(/\[i\](.*)/g,"<i>$1</i>"); //이탤릭 [i]blah
    message = message.replace(/\[s\](.*)/g,"<strike>$1</strike>"); //취소선 [s]blah
    
    //강제개행
    message = message.replace(/\[br\]/g,"<br />");

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
function replaceMarquee(match,direction,behavior,loop,scrollamount,scrolldelay,body,offset) {
    // 빈 값 확인
    if(typeof direction == "undefined") direction = "";
    if(typeof behavior == "undefined") behavior = "";
    if(typeof loop == "undefined") loop = "";
    if(typeof scrollamount == "undefined") scrollamount = "";
    if(typeof scrolldelay == "undefined") scrolldelay = "";

    // 내용이 빈 mq 태그는 무의미하므로 리턴
    if(typeof body == "undefined") return "";

    var scrollamount_value = scrollamount.replace(/[^0-9]/g,"");

    // scrollamount 값을 50 이하로 제한함(50이 넘으면 50으로 강제 하향조정)
    if(scrollamount_value > 50) scrollamount = ' scrollamount=50';

    // 마퀴태그내 이모티콘이 오면 마퀴태그를 무시함
    if(window.emoticon.isActive && window.config.allowEmoticon && window.config.ignoreMQEmoticon) {
        // 우선 마퀴태그 내 이모티콘을 변환해봄
        body = body.replace(/~([^\ ~]*)/g,replaceEmoticon);
        // 이모티콘이 있다면 그냥 마퀴태그 없이 변환된 이모티콘 이미지만 반환
        if(body.match(/<img/) != null) return body;
    }
    
    increaseCount("mq");

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
    
    // 이모티콘이 없다면 그냥 반환함
    if(typeof emoticon[emoticon_key] == "undefined") {
        return match;
    } else {
        increaseCount("emoticon");
        return "<img src=\"" + emoticon[emoticon_key] + "\" >";
    }
}

function replaceTwitchEmoticon(match, emoticon_key, offset) {
    var twitch = window.emoticon.twitch_list;
    var sub = window.emoticon.twitch_sub_list;
    if(typeof twitch[emoticon_key] == "undefined") {
        if(typeof sub[emoticon_key] == "undefined") {
            return match;
        } else {
            increaseCount("twitchemoticon");
            return "<img class='twchimg' src=\"https://static-cdn.jtvnw.net/emoticons/v1/" + sub[emoticon_key].id + "/" + window.config.TwitchEmoticonsize + "\" >";
        }
    } else {
        increaseCount("twitchemoticon");
        return "<img class='twchimg' src=\"https://static-cdn.jtvnw.net/emoticons/v1/" + twitch[emoticon_key].id + "/" + window.config.TwitchEmoticonsize + "\" >";
    }
}

function TAPIC_replaceTwitchEmoticon(message,emotes) {
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
                emote_id = message.substring(parseInt(ranges[0]),parseInt(ranges[1])+1);
                replace_list[emote_id] = id;
            }
        });
        
        for (var replace_id in replace_list) {
            regExp = new RegExp(escapeRegExp(replace_id),"g");
            message = message.replace(regExp,"<img class=\"twitch_emoticon\" src=\"https://static-cdn.jtvnw.net/emoticons/v1/" + replace_list[replace_id] + "/" + window.config.TwitchEmoticonsize + "\" >");
        }
    }
    
    return message;
}

/**
 * 정규식 특수문자 이스케이프 함수
 * @param {String} str
 * @returns {String}
 */
function escapeRegExp(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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
    
    switch(command) {
        case "채팅초기화":
            $(".chat_container").html("");
            break;
        case "통계":
            message = "채팅 수 : " + getCount("chat") + "[br]마퀴태그 : " + getCount("mq");
            message = message + "[br]디시콘 : " + getCount("emoticon") + "[br]트위치 이모지 : " + getCount("twitchemoticon");
            
            // 고정 메세지로 출력
            addChatMessage("info","채팅 통계",message,true,false);
            
            break;
        case "통계초기화":
            sessionStorage.setItem("chat","0");
            sessionStorage.setItem("mq","0");
            sessionStorage.setItem("style","0");
            sessionStorage.setItem("emoticon","0");
            sessionStorage.setItem("twitchemoticon","0");
            
            message = "통계가 초기화되었습니다.";
            
            // 고정 메세지로 출력
            addChatMessage("info","채팅 통계",message,true,false);
            
            break;
        case "공지":
            message = commandarg.replace("~공지","");
            
            // 고정 메세지로 출력
            addChatMessage("info","공지",message,true,false);
            
            break;
        case "이미지":
            message = commandarg.replace("~이미지","");
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
            addChatMessage("warning","설정 변경 알림",message,true,false);
            break;
        case "디시콘":
            message = commandarg.replace("~디시콘","");
            message = message.split(" ");
            if(typeof message[0] === 'undefined') return match;
            if(message[0] === "켜기" || message[0] === "활성화" || message[0] === "온") {
                window.config.allowEmoticon = true;
                message = "디시콘이 켜졌습니다.";
            }
            if(message[0] === "끄기" || message[0] === "비활성화" || message[0] === "오프") {
                window.config.allowEmoticon = false;
                message = "디시콘이 꺼졌습니다.";
            }
            // 고정 메세지로 출력
            addChatMessage("warning","설정 변경 알림",message,true,false);
            break;
        case "투표생성":
            if((typeof window.vote !== 'undefined' && window.vote.inprogress === "Y") || sessionStorage.getItem("vote_inprogress") === "Y") {
                // 고정 메세지로 출력함
                addChatMessage("warning","오류","이미 투표가 진행중입니다.",true,false);
            }
            
            message = commandarg.replace("~투표생성","");
            message = message.split(" ");
            if(typeof message[0] === 'undefined') return match;
            
            if(typeof window.vote === 'undefined') window.vote = {};
            window.vote.inprogress = "Y";
            window.vote.item = [];
            window.vote.voter = [];
            message.forEach(function(element, index, array) {
                window.vote.item[element] = 0;
            });
            
            message = "투표가 생성되었습니다.[br]" + message.join("[br]");
            
            // 고정 메세지로 출력
            addChatMessage("info","공지",message,true,false);
            
            break;
        case "투표종료":
            if(typeof window.vote === 'undefined') {
                window.vote = {};
                window.vote.inprogress = "N";
                window.vote.item = {};
                window.vote.voter = [];
            }
            
            if(window.vote.inprogress !== "Y" && sessionStorage.getItem("vote_inprogress") !== "Y") {
                // 고정 메세지로 출력
                addChatMessage("warning","오류","투표가 진행중이지 않습니다.",true,false);
            }
            
            message = "";
            
            for(var index in window.vote.item) {
                message = message + index + " " + window.vote.item[index] + " 표[br]";
            }
            
            sessionStorage.setItem("vote_inprogress","N");
            sessionStorage.setItem("vote_item","");
            window.vote.inprogress = "N";
            window.vote.item = {};
            window.vote.voter = [];
            
            // 고정 메세지로 출력
            addChatMessage("info","투표가 종료되었습니다",message,true,false);
            
            break;
        case "투표확인":
            checkVote();
            break;
        default:
            return match;
    }
    
    return "COMMAND_DO_NOT_PRINT";
}

function checkVote() {
    if(typeof window.vote !== 'undefined' && typeof window.vote.inprogress !== 'undefined' && window.vote.inprogress === "Y") {
        var message = "";
        
        for(var index in window.vote.item) {
            message = message + index + " " + window.vote.item[index] + " 표[br]";
        }
        
        addChatMessage("info","투표 진행중",message,true,false);
    }
}

function doVote(platform,nickname,command) {
    if(typeof window.vote !== 'undefined' && typeof window.vote.inprogress !== 'undefined' && window.vote.inprogress === "Y") {
        command = command.replace(/\s/g, '');
        
        if(typeof window.vote.item[command] !== 'undefined' && window.vote.voter.indexOf(platform + nickname) === -1) {
            window.vote.item[command]++;
            window.vote.voter.push(platform + nickname);
            
            return command + "에 투표!";
        } else {
            return "이미 투표했거나 잘못 투표함";
        }
    } else {
        return "투표 진행중 아님!";
    }
}

/**
 * HTML 필터링
 * @param {String} str
 * @returns {String}
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 채팅 스타일 반영
 * @returns void
 */
function updateStyle() {
    $(".chat_text_nickname").css({
        'font-family': window.chat.config.font + ', 나눔바른고딕, 나눔고딕, NanumGothic, 맑은고딕, "Malgun Gothic", sans-serif',
        'font-size': window.chat.config.fontUsernameSize,
        "color": "rgb(" + window.chat.config.fontUsernameColor + ")"});
    $(".chat_text_message").css({
        'font-family': window.chat.config.font + ', 나눔바른고딕, 나눔고딕, NanumGothic, 맑은고딕, "Malgun Gothic", sans-serif',
        'font-size': window.chat.config.fontChatSize,
        "color": "rgb(" + window.chat.config.fontChatColor + ")",
        "background-color": "rgba(" + window.chat.config.chatBackgroundColor + "," + (window.chat.config.chatBackgroundAlpha * 0.01) + ")"});
    $("body").css("background", "rgba(" + window.chat.config.backgroundColor + "," + (window.chat.config.backgroundAlpha * 0.01) + ")");
}

/**
 * 봇 채팅 필터링 함수
 * 필터링 대상 닉네임이면 true 반환
 * @param {String} nickname
 * @returns {Boolean}
 */
function filterNick(nickname)  {
    //BUGFIX 필터링 닉네임이 비어있으면 채팅이 뜨지 않는 문제 수정
    if(window.config.ignoreNickname === '') return false;
    var list = window.config.ignoreNickname.split(",");
    
    if(list.indexOf(nickname.toLowerCase()) != -1) return true;
    else return false;
}

function getCount(key) {
    if(sessionStorage.getItem(key) === null) {
        value = 0;
    } else {
        value = parseInt(sessionStorage.getItem(key));
    }
    
    return value;
}

function decreaseCount(key) {
    if(sessionStorage.getItem(key) === null) {
        value = 0;
    } else {
        value = parseInt(sessionStorage.getItem(key));
    }
    
    value--;
    sessionStorage.setItem(key,value.toString());
}

function increaseCount(key) {
    if(sessionStorage.getItem(key) === null) {
        value = 0;
    } else {
        value = parseInt(sessionStorage.getItem(key));
    }
    
    value++;
    sessionStorage.setItem(key,value.toString());
}

/**
 * 봇 채팅 필터링 함수
 * 필터링 대상 닉네임이면 true 반환
 * @param {String} nickname
 * @returns {Boolean}
 */
function isStreamer(platform,nickname)  {
    // 기본값인 경우 무조건 false 반환
    if(window.config.streamer[platform] === "REPLACE_THIS_WITH_NAME") return false;
    return window.config.streamer[platform] == nickname;
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
        message = message.replace(/\[br\]/g,"<br />");
    } else {
        // 닉네임 HTML 제거
        nickname = htmlEntities(nickname);

        if(filterNick(nickname)) return;

        // 메세지 HTML 제거
        message = htmlEntities(message);

        // 플랫폼 아이콘 미사용시
        if(!window.chat.config.platformIcon) {
            platform = "none";
        }

        //기본문법 변환
        message = replaceStyle(message);

        // marquee 태그 변환
        message = message.replace(/\[mq( direction=[^\ ]*)?( behavior=[^\ ]*)?( loop=[^\ ]*)?( scrollamount=[^\ ]*)?( scrolldelay=[^\ ]*)?\](.*)\[\/mq\]/g,replaceMarquee);

        // 메세지 안 디시콘 변환(시동어 ~ 입력후 등록한 이모티콘 이름 입력하면 됨)
        if(window.emoticon.isActive && window.config.allowEmoticon) message = message.replace(/~([^\ ~]*)/g,replaceEmoticon);

        if(window.config.enableTwitchEmoticon && typeof window.emoticon.twitch_list != "undefined") {
            message = message.replace(/\\n(\S*?)\\n/g,replaceTwitchEmoticon);
        }
        
        if(window.config.enableTwitchEmoticon && typeof ext_args.emotes != "undefined") {
            message = TAPIC_replaceTwitchEmoticon(message,ext_args.emotes);
        }
        
        if(ext_args.isMod) {
            nickname = "<b>" + nickname + "</b>";
        }

        if(ext_args.isStreamer || isStreamer(platform,nickname)) {
            message = message.replace(/~([^ ]+)+(?: )*(.+)*/g,replaceCommand);
            nickname = '<img style="vertical-align: middle;" src="http://funzinnu.cafe24.com/stream/cdn/b_broadcaster.png" alt="Broadcaster" class="badge">&nbsp;' + nickname;
        }

        if(message.indexOf("~투표생성") === -1 && message.indexOf("~투표종료") === -1 && message.indexOf("~투표") !== -1) {
            message = doVote(platform,nickname,message.replace(/([^~]*)~투표/,""));
        }

        // 명령어 입력은 스킵함
        if(message.indexOf("COMMAND_DO_NOT_PRINT") != -1) return;
    }

    chat = {num: window.chat.cur_count, platform: platform, nickname: nickname, message: message, notitle: "NOTITLE"};
    $chatElement = sticky ? $(window.chat.stickytemplate(chat)) : $(window.chat.template(chat));
    $chatElement.appendTo($(".chat_container"));
    updateStyle();
    if (window.chat.config.animation == "none") {
        $chatElement.show();
    } else {
        $chatElement.show(window.chat.config.animation, {easing: "easeOutQuint", direction: "down"});
    }
    
    if(sticky) window.chat.sticky = true;

    window.chat.count++;
    window.chat.cur_count++;
    
    if(sticky || window.chat.config.chatFade != 0) {
        var fadeTime = sticky ? 10000 : window.chat.config.chatFade * 1000;
        if (window.chat.config.animation == "none") {
            $chatElement.delay(fadeTime).hide(0, function () {
                $(this).remove();
                window.chat.count--;
                window.chat.sticky = false;
            });
        } else {
            $chatElement.delay(fadeTime).hide(window.chat.config.animation, 1000, function () {
                $(this).remove();
                window.chat.count--;
                window.chat.sticky = false;
            });
        }
    } else {
        if (window.chat.count > window.chat.maxcount) {
            window.chat.count--;
            $remove_temp = $(".chat_container div.chat_div:first-child");
            $remove_temp.remove();
        }

        if (window.chat.cur_count > window.chat.maxcount) {
            window.chat.cur_count = 0;
        }
    }
    
    // 고정 메세지는 채팅 미포함
    if(!sticky) increaseCount("chat");
}

/**
 * JSAssist에서 특정 채팅메세지의 JSON을 잘못 생성하는 버그 수정
 * @param {String} json_string
 * @returns {String}
 */
function FixJSAssistBug(json_string) {
    var message;

    // 트위치에서 이모티콘 입력시 앞뒤로 붙는 쓸데없는 것을 이모티콘 시동어로 적절히 바꿔준다
    // 이모티콘으로 트위치 이모티콘 영문명을 추가해주면 잘 동작함
    json_string = json_string.replace(/(?:\r\n|\r|\n)/g, "\\n");
    
    if(json_string.indexOf('"message" : "') != -1) {
        message = json_string.substring(json_string.indexOf('"message" : "') + 13,json_string.indexOf('", "type" : '));
        // 메세지 맨 마지막에 \가 오면 이스케이프로 처리되어 발생하는 문제 수정
        json_string = json_string.replace(message,message.replace(/\\/g,'\\\\'));
        // JSAssist에서 " 들어간 채팅을 부적절하게 처리해 발생하는 문제 수정
        json_string = json_string.replace(message,message.replace(/"/g,'\\"'));
    }
    return json_string;
}

/**
 * JSAssist에 연결하는 함수
 * @returns void
 */
function connect_jsassist() {
    var ws = new WebSocket("ws://localhost:4649/JSAssistChatServer");
    ws.onopen = function () {
        window.chat.failcount = 0;
    };
    ws.onmessage = function (evt) {
        var data = JSON.parse(FixJSAssistBug(evt.data));

        if (data.type == "chat_message") {
            if (window.chat.config.platform != "all" && window.chat.config.platform != data.platform) {
                return;
            }
            
            // tapic 세팅이 되어있지 않은 경우에만 jsassist 이용
            if(window.tapic.inited && data.platform === "twitch") {
                return;
            }
            
            addChatMessage(data.platform, data.username, data.message, false, false);
        } else if (data.type == "config") {
            if(data.presetName == window.config.preset) window.chat.config = data;
        }
    };
    ws.onclose = function () {
        is_connected = false;
        window.chat.failcount++;
        //if(window.chat.failcount > 9 && window.chat.failcount % 10 === 0) {
            // 10번 이상 접속 실패시 접속 장애 안내문 출력
            //addChatMessage("warning", "ChatAssistX Error", "JSAssist에 연결할 수 없습니다. JSAssist가 실행중이고 방화벽 소프트웨어에 의해 차단되지 않았는지 확인해주세요.",true,false);
        //}
        if(window.chat.failcount > 29) {
            //addChatMessage("critical", "ChatAssistX Critical Error", "100회 이상 접속 실패로 접속 시도를 중단합니다.",true,false);
        } else {
            //console.error("JSAssist connect failed " + window.chat.failcount + " times.");
            setTimeout(connect_jsassist, 1000);
        }
    };
}

function connect_tapic() {
    if(window.tapic.oauth !== "") {
        TAPIC.setup(window.tapic.oauth, function(username) {
            TAPIC.setRefreshRate(10);

            if (window.tapic.channelname !== "") {
                TAPIC.joinChannel(window.tapic.channelname, function() {
                    window.tapic.inited = true;
                });
            }
        });
        
        TAPIC.listen('message', function(e) {
            var ext_args = {};
            ext_args.isStreamer = false;
            ext_args.isMod = false;
            ext_args.rawprint = false;
            ext_args.emotes = e.emotes;
            
            if (e.streamer || e.badges.indexOf("broadcaster/1") != -1) {
                ext_args.isStreamer = true;
                ext_args.isMod = true;
            } else if(e.mod) {
                ext_args.isStreamer = false;
                ext_args.isMod = true;
            }
            
            addChatMessage("twitch", e.from, e.text, false, ext_args);
        });
    }
}

$(document).ready(function () {
    CompileChat();
    connect_jsassist();
    connect_tapic();
    LoadEmoticon();
});
