(function(window) {
	var plugin_name = "dccon";
	var plugin_version = "2.0.0"
	var address = {};
	var httpRequest;
	var fail_count;
	var list = {};
	//address.dccon
	//addrsss.global
	//address.sub

	/**
	 * 진행상황을 채팅으로 올림
	 * 고정메세지, rawprint 여부 신경쓰지 않으며 chatloader의 addChatMessage 호출함
	 * @returns {Boolean}
	 */
	function addChatMessage(platform, nickname, message, sticky, raw) {
		var data = {};

		data.platform = platform;
		data.nickname = nickname;
		data.message = message;
		data.isStreamer = false;
		data.isMod = false;
		data.rawprint = true;

		window.ChatAssistX.addChatMessage(data);
	}

	function increaseCount(type) {
		console.warn("function increaseCount is stub!");
	}

	/**
	 * 이모티콘 JSON 불러옴
	 * @returns {Boolean}
	 */
	function LoadEmoticon() {
		// 이모티콘 주소가 비어있으면 무시
		if (address.dccon === "") return true;

		// httpRequest 초기화
		if (window.XMLHttpRequest) { // 파폭, 사파리, 크롬 등등 웹표준 준수 브라우저
			httpRequest = new XMLHttpRequest();
		} else if (window.ActiveXObject) { // 쓰레기 IE
			try {
				httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
			} catch (e) {
				try {
					httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
				} catch (e) {}
			}
		}

		if (!httpRequest) {
			addChatMessage("info", "이모티콘 초기화 오류", "XMLHTTPRequest를 초기화할수 없었습니다.", true, false);
			return false;
		}

		addChatMessage("info", "불러오는중", "디시콘 목록을 불러오는중... (1 / 3)", true, false);

		httpRequest.onreadystatechange = CompleteLoadEmoticon;
		httpRequest.open('GET', address.dccon);
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
					fail_count = 0;
					list.dccon = JSON.parse(httpRequest.responseText);

					addChatMessage("info", "불러오는중", "디시콘 목록을 불러왔습니다. (1 / 3)", false, false);
					LoadTwitchEmoticon();
				} catch (e) {
					fail_count++;
					if (fail_count > 10) addChatMessage("info", "이모티콘 초기화 오류", "이모티콘 JSON 파싱중 오류가 발생했습니다.", false, false);
					else setTimeout(LoadEmoticon, 1000);
				}
			} else {
				fail_count++;
				if (fail_count > 10) addChatMessage("info", "이모티콘 초기화 오류", "이모티콘 JSON 다운로드중 오류가 발생했습니다.", false, false);
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
			} catch (e) {
				try {
					httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
				} catch (e) {}
			}
		}

		if (!httpRequest) {
			addChatMessage("info", "이모티콘 초기화 오류", "XMLHTTPRequest를 초기화할수 없었습니다.", true, false);
			return false;
		}

		addChatMessage("info", "불러오는중", "트위치 글로벌 이모티콘을 불러오는중... (2 / 3)", true, false);

		httpRequest.onreadystatechange = CompleteLoadTwitchEmoticon;
		httpRequest.open('GET', address.global);
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
					fail_count = 0;
					list.global = JSON.parse(httpRequest.responseText);

					addChatMessage("info", "불러오는중", "트위치 글로벌 이모티콘을 불러왔습니다. (2 / 3)", true, false);
					LoadTwitchSubEmoticon();
				} catch (e) {
					fail_count++;
					if (fail_count > 10) addChatMessage("error", "이모티콘 초기화 오류", "이모티콘 JSON 파싱중 오류가 발생했습니다.", true, false);
					else setTimeout(LoadTwitchEmoticon, 1000);
				}
			} else {
				fail_count++;
				if (fail_count > 10) addChatMessage("error", "이모티콘 초기화 오류", "이모티콘 JSON 다운로드중 오류가 발생했습니다.", true, false);
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
			} catch (e) {
				try {
					httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
				} catch (e) {}
			}
		}

		if (!httpRequest) {
			addChatMessage("info", "이모티콘 초기화 오류", "XMLHTTPRequest를 초기화할수 없었습니다.", true, false);
			return false;
		}

		addChatMessage("info", "불러오는중", "트위치 구독 이모티콘을 불러오는중... (3 / 3)", true, false);

		httpRequest.onreadystatechange = CompleteLoadTwitchSubEmoticon;
		httpRequest.open('GET', address.sub);
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
					fail_count = 0;
					list.sub = JSON.parse(httpRequest.responseText);

					addChatMessage("info", "불러오는중", "트위치 구독 이모티콘을 불러왔습니다. (3 / 3)", true, false);

					list.inited = true;
				} catch (e) {
					fail_count++;
					if (fail_count > 10) addChatMessage("info", "이모티콘 초기화 오류", "이모티콘 JSON 파싱중 오류가 발생했습니다.", true, false);
					else setTimeout(LoadTwitchSubEmoticon, 1000);
				}
			} else {
				fail_count++;
				if (fail_count > 10) addChatMessage("info", "이모티콘 초기화 오류", "이모티콘 JSON 다운로드중 오류가 발생했습니다.", true, false);
				else setTimeout(LoadTwitchSubEmoticon, 1000);
			}
		}
	}

	/**
	 * 이모티콘 변환 함수
	 * @param {String} match
	 * @param {String} emoticon_key
	 * @param {String} offset
	 * @returns {String}
	 */
	function replaceEmoticon(match, emoticon_key, offset) {
		var emoticon = list.dccon;

		// 이모티콘이 없다면 그냥 반환함
		if (typeof emoticon[emoticon_key] == "undefined") {
			return match;
		} else {
			increaseCount("emoticon");
			return "<img src=\"" + emoticon[emoticon_key] + "\" >";
		}
	}

	function replaceTwitchEmoticon(match, emoticon_key, offset) {
		var twitch = list.global;
		var sub = list.sub;

		if (typeof twitch[emoticon_key] == "undefined") {
			if (typeof sub[emoticon_key] == "undefined") {
				return match;
			} else {
				increaseCount("twitchemoticon");
				return "[twitch " + sub[emoticon_key].id + "]";
				//return "<img class='twchimg' src=\"https://static-cdn.jtvnw.net/emoticons/v1/" + sub[emoticon_key].id + "/" + window.ChatAssistX.config.TwitchEmoticonsize + "\" >";
			}
		} else {
			increaseCount("twitchemoticon");
			return "[twitch " + twitch[emoticon_key].id + "]";
			//return "<img class='twchimg' src=\"https://static-cdn.jtvnw.net/emoticons/v1/" + twitch[emoticon_key].id + "/" + window.ChatAssistX.config.TwitchEmoticonsize + "\" >";
		}
	}

	function TAPIC_replaceTwitchEmoticon(message, emotes) {
		var ranges;
		var id;
		var i;
		var emote_id;
		var regExp;
		var replace_list = {};
		var id_list = [];

		if (typeof emotes != 'undefined') {
			var emote_list = emotes.split("/");
			emote_list.forEach(function(emote_replace) {
				ranges = emote_replace.split(":");
				id = ranges[0];
				if (typeof ranges[1] == 'undefined') return;
				ranges = ranges[1].split(",");
				if (typeof ranges[0] != 'undefined') {
					ranges = ranges[0].split("-");
					emote_id = message.substring(parseInt(ranges[0]), parseInt(ranges[1]) + 1);
					replace_list[emote_id] = id;
					id_list.push(emote_id);
				}
			});
			
			id_list = id_list.sort(function(a, b) {
				return b.length - a.length;
			});

			for (i = 0; i < id_list.length; i++) {
				regExp = new RegExp(id_list[i].escapeRegExp(), "g");
				message = message.replace(regExp, "[twitch " + replace_list[id_list[i]] + "]");
			}
		}

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
		if (typeof direction == "undefined") direction = "";
		if (typeof behavior == "undefined") behavior = "";
		if (typeof loop == "undefined") loop = "";
		if (typeof scrollamount == "undefined") scrollamount = "";
		if (typeof scrolldelay == "undefined") scrolldelay = "";

		// 내용이 빈 mq 태그는 무의미하므로 리턴
		if (typeof body == "undefined") return "";

		var scrollamount_value = scrollamount.replace(/[^0-9]/g, "");

		// scrollamount 값을 50 이하로 제한함(50이 넘으면 50으로 강제 하향조정)
		if (scrollamount_value > 50) scrollamount = ' scrollamount=50';

		// 마퀴태그내 이모티콘이 오면 마퀴태그를 무시함
		if (list.inited && window.config.allowEmoticon && window.config.ignoreMQEmoticon) {
			// 우선 마퀴태그 내 이모티콘을 변환해봄
			body = body.replace(/~([^\ ~]*)/g, replaceEmoticon);
			// 이모티콘이 있다면 그냥 마퀴태그 없이 변환된 이모티콘 이미지만 반환
			if (body.match(/<img/) != null) return body;
		}

		increaseCount("mq");

		// 마퀴태그 만들어 반환
		return '<marquee' + direction + behavior + loop + scrollamount + scrolldelay + '>' + body + '</marquee>';
	}

	if (typeof window.ChatAssistX.plugins[plugin_name] !== 'undefined') {
		console.log("DCCON plugin is already loaded!");
	} else {
		console.log("DCCON plugin is loaded");
		window.ChatAssistX.plugins[plugin_name] = {};
		window.ChatAssistX.plugins[plugin_name].process = function(args, config) {
			var message = args.message;

			//마퀴태그 치환
			message = message.replace(/\[mq( direction=([^\ ])*)?( behavior=[^\ ]*)?( loop=[^\ ]*)?( scrollamount=[0-9]*)?( scrolldelay=[0-9]*)?\](.*)\[\/mq\]/g, replaceMarquee);

			if (window.ChatAssistX.config.allowEmoticon) {
				//디시콘치환
				message = message.replace(/~([^\ ~]*)/g, replaceEmoticon);
			}

			if (window.ChatAssistX.config.enableTwitchEmoticon) {
				//트위치이모지치환
				if (args.emotes) message = TAPIC_replaceTwitchEmoticon(args.message, args.emotes);
				else message = message.replace(/\\n(\S*?)\\n/g, replaceTwitchEmoticon);
			}

			message = message.replace(/\[twitch ([0-9]*)\]/g, "<img class=\"twchimg\" src=\"https://static-cdn.jtvnw.net/emoticons/v1/$1/" + window.ChatAssistX.config.TwitchEmoticonsize + "\" >");

			if (args.message != message) return message;
			else return false;
		}

		window.ChatAssistX.plugins[plugin_name].init = function(config) {
			address.dccon = config.address;
			address.global = config.twitch;
			address.sub = config.twitch_sub;
			LoadEmoticon();

			return true;
		}
	}


})(window);
