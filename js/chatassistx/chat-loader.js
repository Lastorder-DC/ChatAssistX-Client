/*    ________          __  ___              _      __ _  __
 *   / ____/ /_  ____ _/ /_/   |  __________(_)____/ /| |/ /
 *  / /   / __ \/ __ `/ __/ /| | / ___/ ___/ / ___/ __/   / 
 * / /___/ / / / /_/ / /_/ ___ |(__  |__  ) (__  ) /_/   |  
 * \____/_/ /_/\__,_/\__/_/  |_/____/____/_/____/\__/_/|_|  
 *                 V E R S I O N    2.0.0-beta2
 *       Last updated by Lastorder-DC on 2018-02-01.
 */

(function(window) {
	var httpRequest;
	var cur_count = 0;
	var count = 0;
	var maxcount = 30;
	
	var plugins_loaded = false;
	var plugin_configs = {};
	var provider_configs = {};

	window.chat = {};
	window.ChatAssistX = {};
	window.ChatAssistX.version = "2.0.0-beta2";
	window.ChatAssistX.plugins = [];
	window.ChatAssistX.plugin_count = 0;
	window.ChatAssistX.loaded_plugin_count = 0;
	window.ChatAssistX.provider = [];
	window.ChatAssistX.provider_count = 0;
	window.ChatAssistX.loaded_provider_count = 0;
	window.ChatAssistX.commands = [];
	
	String.prototype.capFirst = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	};

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
		return String(this).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	};
	
	// @deprecated this functions will be removed since they moved to string prototype.
	window.escapeRegExp = function(str) {
		console.warn("escapeRegExp function is moved to String prototype.");
		return str.escapeRegExp();
	};
	window.htmlEntities = function(str) {
		console.warn("htmlEntities function is moved to String prototype.");
		return str.htmlEntities();
	};
	
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

	window.ChatAssistX.init = function(config) {
		if (typeof config === "string") {
			LoadConfig(config);
		} else {
			plugin_configs = config.plugins;
			provider_configs = config.provider;
			loadPlugins(plugin_configs);
			loadProvider(provider_configs);
			CompileChat();
			window.ChatAssistX.config = config.config;
			
			if(window.ChatAssistX.config.theme !== "") {
				if(typeof window.ChatAssistX.config.themes[window.ChatAssistX.config.theme] === 'undefined') {
					window.ChatAssistX.addNotice("기본 테마 " + window.ChatAssistX.config.theme + " 은 존재하지 않아 적용되지 않았습니다.", "error");
				}
				for(var i = 0;i < window.ChatAssistX.config.themes[window.ChatAssistX.config.theme].css.length;i++) {
					addThemeCSS(window.ChatAssistX.config.themes[window.ChatAssistX.config.theme].css[i]);
				}
			}
			
			addChatMessage("info", "NOTITLE", "<span class='logo'><pre>   ________          __  ___              _      __ _  __[br]  / ____/ /_  ____ _/ /_/   |  __________(_)____/ /| |/ /[br] / /   / __ <span class='backslash'>\\</span>/ __ `/ __/ /| | / ___/ ___/ / ___/ __/   /[br]/ /___/ / / / /_/ / /_/ ___ |(__  |__  ) (__  ) /_/   |[br]<span class='backslash'>\\</span>____/_/ /_/<span class='backslash'>\\</span>__,_/<span class='backslash'>\\</span>__/_/  |_/____/____/_/____/<span class='backslash'>\\</span>__/_/|_|</pre></span><span class='versionstring'><pre>[br]V E R S I O N      V. " + window.ChatAssistX.version + "</pre></span>", true, true);
		}
	};

	function InitProvider() {
		//provider들의 연결함수 실행
		var list = window.ChatAssistX.provider;
		for (var id in list) {
			if(!list[id].connect(provider_configs[id].config)) {
				console.error("Cannot connect provider " + id);
			}
		}
	}
	
	function InitPlugins() {
		var list = window.ChatAssistX.plugins;
		for (var id in list) {
			if(!list[id].init(plugin_configs[id].config)) {
				console.error("Cannot init plugin " + id);
			}
		}
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
		//window.ChatAssistX.config.themes
		
		// register theme command
		window.ChatAssistX.commands["theme"] = {};
		window.ChatAssistX.commands["theme"].cooldown = 0;
		window.ChatAssistX.commands["theme"].lastusetime = -1;
		window.ChatAssistX.commands["theme"].permission = "streamer";
		window.ChatAssistX.commands["theme"].cmdFunc = function(args) {
			var theme = args.message.match(/^!!theme ([^ ]+)/)[1];
			
			if(typeof window.ChatAssistX.config.themes[theme] === 'undefined') {
				window.ChatAssistX.addNotice("테마 " + theme + "(은)는 존재하지 않습니다!","system");
			} else {
				deleteThemeCSS();
				window.ChatAssistX.addNotice("테마가 " + theme + "(으)로 변경되었습니다.","system");
				for(var i = 0;i < window.ChatAssistX.config.themes[theme].css.length;i++) {
					addThemeCSS(window.ChatAssistX.config.themes[theme].css[i]);
				}
				
				window.ChatAssistX.config.theme = theme;
			}
		};
		
		var command = args.message.match(/^!!([^ ]+) ([^ ]+)/);
		if(command !== null && typeof command[1] !== 'undefined') {
			if(typeof window.ChatAssistX.commands[command[1]] !== 'undefined') {
				var permission = window.ChatAssistX.commands[command[1]].permission;
				
				if((permission === "streamer" && args.isStreamer) ||
					(permission === "moderator" && args.isMod) ||
					(permission === "user")
				) {
					window.ChatAssistX.commands[command[1]].cmdFunc(args);
					args.message = "DO_NOT_PRINT";
				} else {
					args.message = "권한이 부족해 명령어가 실행되지 않았습니다 - " + command[1];
				}
			}
		}
		
		if (args.rawprint) {
			// 강제개행 문법만 변환
			args.message = args.message.replace(/\[br\]/g, "<br />");
		} else {
			// 닉네임 HTML 제거
			args.nickname = args.nickname.htmlEntities();

			if (filterNick(args.nickname)) return;

			// 메세지 HTML 제거
			args.message = args.message.htmlEntities();

			// 플랫폼 아이콘 미사용시
			if (!window.ChatAssistX.config.chat.platformIcon) {
				args.platform = "none";
			}
			
			var list = window.ChatAssistX.plugins;
			for (var id in list) {
				var parsedMessage = list[id].process(args, plugin_configs[id].config);
				if(!!parsedMessage) {
					args.message = parsedMessage;
				}
			}

			if (args.isMod) {
				args.nickname = "<b>" + args.nickname + "</b>";
			}
			
			if (args.isStreamer || isStreamer(args.platform, args.nickname)) {
				var badge_streamer = window.ChatAssistX.config.themes[window.ChatAssistX.config.theme].image.streamer;
				if(badge_streamer === "") badge_streamer = "https://static-cdn.jtvnw.net/chat-badges/broadcaster.png";
				args.nickname = '<img style="vertical-align: middle;" src="' + badge_streamer + '" alt="Broadcaster" class="badge">&nbsp;' + args.nickname;
			}
			
			// 명령어 입력은 스킵함
			if (args.message.indexOf("DO_NOT_PRINT") !== -1) return;
		}

		chat = {
			num: cur_count,
			platform: args.platform,
			nickname: args.nickname,
			message: args.message,
			notitle: "NOTITLE"
		};
		
		$chatElement = args.nickname === "NOTITLE" ? $(window.chat.stickytemplate(chat)) : $(window.chat.template(chat));
		$chatElement.appendTo($(".chat_container"));
		updateStyle();
		if (window.ChatAssistX.config.chat.animation === "none") {
			$chatElement.show();
		} else {
			$chatElement.show(window.ChatAssistX.config.chat.animation, {
				easing: "easeOutQuint",
				direction: "down"
			});
		}

		count++;
		cur_count++;

		if (args.nickname === "NOTITLE" || window.ChatAssistX.config.chat.chatFade !== 0) {
			var fadeTime = window.ChatAssistX.config.chat.chatFade * 1000;
			if(args.nickname === "NOTITLE") fadeTime = 5000;
			
			if (window.ChatAssistX.config.chat.animation === "none") {
				$chatElement.delay(fadeTime).hide(0, function() {
					$(this).remove();
					count--;
					window.chat.sticky = false;
				});
			} else {
				$chatElement.delay(fadeTime).hide(window.ChatAssistX.config.chat.animation, 1000, function() {
					$(this).remove();
					count--;
					window.chat.sticky = false;
				});
			}
			
			if (count > maxcount) {
				count--;
				$remove_temp = $(".chat_container div.chat_div:first-child");
				$remove_temp.remove();
			}

			if (cur_count > maxcount) {
				cur_count = 0;
			}
		} else {
			if (count > maxcount) {
				count--;
				$remove_temp = $(".chat_container div.chat_div:first-child");
				$remove_temp.remove();
			}

			if (cur_count > maxcount) {
				cur_count = 0;
			}
		}
	};

	window.ChatAssistX.addNotice = function(message, type) {
		if(type === "info") alertify.success(message);
		if(type === "warn") alertify.warning(message);
		if(type === "error") alertify.error(message);
		if(type === "system") {
			var notice = {};
			notice.nickname = "System";
			notice.message = message;
			notice.platform = "info";
			
			window.ChatAssistX.addChatMessage(notice);
		}
	};

	function loadPlugins(list) {
		var id;
		
		//플러그인 불러오는 함수
		window.ChatAssistX.plugin_count = 0;
		window.ChatAssistX.loaded_plugin_count = 0;
		for (id in list) {
			if (list[id].use) {
				window.ChatAssistX.plugin_count++;
			}
		}
		for (id in list) {
			if (list[id].use) {
				console.log("Loading plugin : " + id);
				$.loadScript('./js/chatassistx/plugins/' + id + '.js', function() {
					window.ChatAssistX.loaded_plugin_count++;
					if(window.ChatAssistX.plugin_count === window.ChatAssistX.loaded_plugin_count) {
						plugins_loaded = true;
						InitPlugins();
					}
				});
			}
		}
		return true;
	}

	function loadProvider(list) {
		var id;
		
		//provider 불러오는 함수
		window.ChatAssistX.provider_count = 0;
		window.ChatAssistX.loaded_provider_count = 0;
		for (id in list) {
			if (list[id].use) {
				window.ChatAssistX.provider_count++;
			}
		}
		for (id in list) {
			if (list[id].use) {
				console.log("Loading provider : " + id);
				$.loadScript('./js/chatassistx/provider/' + id + '.js', function() {
					window.ChatAssistX.loaded_provider_count++;
					if(window.ChatAssistX.provider_count === window.ChatAssistX.loaded_provider_count) {
						InitProvider();
					}
				});
			}
		}
		return true;
	}
	
	function addThemeCSS(cssfile) {
		var head  = document.getElementsByTagName('head')[0];
		var link  = document.createElement('link');
		link.rel  = 'stylesheet';
		link.type = 'text/css';
		link.href = cssfile;
		head.appendChild(link);
	}
	
	function deleteThemeCSS() {
		while(document.querySelector('link:not([defcss="true"])') !== null) {
			document.querySelector('link:not([defcss="true"])').remove();
		}
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

		return list.indexOf(nickname.toLowerCase()) !== -1;
	}

	/**
	 * 스트리머 여부 반환
	 * @param {String} platform
	 * @param {String} nickname
	 * @returns {Boolean}
	 */
	function isStreamer(platform, nickname) {
		return window.ChatAssistX.config.streamer[platform] === nickname;
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
			complete: callback,
			async: true
		});
	}
})(window);
