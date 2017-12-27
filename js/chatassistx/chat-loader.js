/*    ________          __  ___              _      __ _  __
 *   / ____/ /_  ____ _/ /_/   |  __________(_)____/ /| |/ /
 *  / /   / __ \/ __ `/ __/ /| | / ___/ ___/ / ___/ __/   / 
 * / /___/ / / / /_/ / /_/ ___ |(__  |__  ) (__  ) /_/   |  
 * \____/_/ /_/\__,_/\__/_/  |_/____/____/_/____/\__/_/|_|  
 *                 V E R S I O N    2.0.0-dev1
 *       Last updated by Lastorder-DC on 2017-12-27.
 */

(function(window) {
	var httpRequest;

	window.chat = {};
	window.ChatAssistX = {};
	window.ChatAssistX.plugins = [];
	window.ChatAssistX.provider = [];

	/**
	 * 정규식 특수문자 이스케이프 함수
	 * @param {String} str
	 * @returns {String}
	 */
	window.escapeRegExp = function(str) {
		return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}

	/**
	 * HTML 필터링
	 * @param {String} str
	 * @returns {String}
	 */
	window.htmlEntities = function(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	window.ChatAssistX.init = function(config) {
		if (typeof config === "string") {
			LoadConfig(config);

		} else {
			loadPlugins(config.plugins);
			loadProvider(config.provider);
			CompileChat();
			window.ChatAssistX.config = config.config;
		}
	}

	window.ChatAssistX.connect = function() {
		//provider들의 연결함수 실행
	}

	window.ChatAssistX.addChatMessage = function(args) {
		//채팅 플러그인들 실행후 반환된 값 이용 채팅 출력
		//기본전달 값
		//args.message : 채팅
		//args.nickname : 닉네임
		//args.platform : 플랫폼(유튜브, 트위치 등등)
		var $chatElement;
		var $remove_temp;
		var chat;
		var rawprint = false;

		if (rawprint) {
			// 강제개행 문법만 변환
			args.message = args.message.replace(/\[br\]/g, "<br />");
		} else {
			// 닉네임 HTML 제거
			args.nickname = htmlEntities(args.nickname);

			if (filterNick(args.nickname)) return;

			// 메세지 HTML 제거
			args.message = htmlEntities(args.message);

			// 플랫폼 아이콘 미사용시
			if (!window.ChatAssistX.config.chat.platformIcon) {
				args.platform = "none";
			}

			if (args.isMod) {
				args.nickname = "<b>" + args.nickname + "</b>";
			}

			//TODO 스트리머 아이콘 커스텀
			if (args.isStreamer || isStreamer(args.platform, args.nickname)) {
				args.nickname = '<img style="vertical-align: middle;" src="http://funzinnu.cafe24.com/stream/cdn/b_broadcaster.png" alt="Broadcaster" class="badge">&nbsp;' + nickname;
			}

			// 명령어 입력은 스킵함
			if (args.message.indexOf("DO_NOT_PRINT") != -1) return;
		}

		chat = {
			num: window.chat.cur_count,
			platform: args.platform,
			nickname: args.nickname,
			message: args.message,
			notitle: "NOTITLE"
		};
		//$chatElement = sticky ? $(window.chat.stickytemplate(chat)) : $(window.chat.template(chat));
		$chatElement = $(window.chat.template(chat));
		$chatElement.appendTo($(".chat_container"));
		updateStyle();
		if (window.ChatAssistX.config.chat.animation == "none") {
			$chatElement.show();
		} else {
			$chatElement.show(window.ChatAssistX.config.chat.animation, {
				easing: "easeOutQuint",
				direction: "down"
			});
		}

		window.chat.count++;
		window.chat.cur_count++;

		if (window.ChatAssistX.config.chat.chatFade != 0) {
			var fadeTime = window.ChatAssistX.config.chat.chatFade * 1000;
			if (window.ChatAssistX.config.chat.animation == "none") {
				$chatElement.delay(fadeTime).hide(0, function() {
					$(this).remove();
					window.chat.count--;
					window.chat.sticky = false;
				});
			} else {
				$chatElement.delay(fadeTime).hide(window.ChatAssistX.config.chat.animation, 1000, function() {
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
	}

	window.ChatAssistX.addNotice = function(message) {
		//상단공지 추가 함수
		//큐에 추가되어 일정주기로 갱신됨
	}

	function loadPlugins(list) {
		//플러그인 불러오는 함수
		//console.log(list);
		for (var id in list) {
			if (list[id].use) {
				console.log("Loading plugin : " + id);
				$.loadScript('./js/chatassistx/plugins/' + id + '.js', function() {});
			}
		}
		return true;
	}

	function loadProvider(list) {
		//provider 불러오는 함수
		for (var id in list) {
			if (list[id].use) {
				console.log("Loading provider : " + id);
			}
		}
		return true;
	}

	/**
	 * 설정파일 불러옴
	 * @returns {Boolean}
	 */
	function LoadConfig(address) {
		if (address === "") return true;

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

		httpRequest.onreadystatechange = CompleteLoadConfig;
		httpRequest.open('GET', address);
		httpRequest.send();

		return true;
	}

	/**
	 * 설정 JSON 파싱후 init함수 재실행
	 * @returns void
	 */
	function CompleteLoadConfig() {
		if (httpRequest.readyState === 4) {
			if (httpRequest.status === 200) {
				try {
					window.ChatAssistX.init(JSON.parse(httpRequest.responseText));
				} catch (e) {
					//error
				}
			} else {
				//error
			}
		}
	}

	/**
	 * 채팅 템플릿 컴파일
	 * @returns void
	 */
	function CompileChat() {
		Handlebars.registerHelper('ifCond', function(v1, v2, options) {
			if (v1 === v2) {
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
	 * 봇 채팅 필터링 함수
	 * 필터링 대상 닉네임이면 true 반환
	 * @param {String} nickname
	 * @returns {Boolean}
	 */
	function filterNick(nickname) {
		//BUGFIX 필터링 닉네임이 비어있으면 채팅이 뜨지 않는 문제 수정
		if (window.ChatAssistX.config.ignoreNickname === '') return false;
		var list = window.ChatAssistX.config.ignoreNickname.split(",");

		if (list.indexOf(nickname.toLowerCase()) != -1) return true;
		else return false;
	}

	/**
	 * 스트리머 여부 반환
	 * @param {String} nickname
	 * @returns {Boolean}
	 */
	function isStreamer(platform, nickname) {
		return window.ChatAssistX.config.streamer[platform] == nickname;
	}

	/**
	 * 채팅 스타일 반영
	 * @returns void
	 */
	function updateStyle() {
		$(".chat_text_nickname").css({
			'font-family': window.ChatAssistX.config.chat.font,
			'font-size': window.ChatAssistX.config.chat.fontUsernameSize,
			"color": "rgb(" + window.ChatAssistX.config.chat.fontUsernameColor + ")"
		});
		$(".chat_text_message").css({
			'font-family': window.ChatAssistX.config.chat.font,
			'font-size': window.ChatAssistX.config.chat.fontChatSize,
			"color": "rgb(" + window.ChatAssistX.config.chat.fontChatColor + ")",
			"background-color": "rgba(" + window.ChatAssistX.config.chat.chatBackgroundColor + "," + (window.ChatAssistX.config.chat.chatBackgroundAlpha * 0.01) + ")"
		});
		$("body").css("background", "rgba(" + window.ChatAssistX.config.chat.backgroundColor + "," + (window.ChatAssistX.config.chat.backgroundAlpha * 0.01) + ")");
	}

	jQuery.loadScript = function(url, callback) {
		jQuery.ajax({
			url: url,
			dataType: 'script',
			success: callback,
			async: true
		});
	}
})(window);