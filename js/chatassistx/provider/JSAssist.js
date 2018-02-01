(function(window) {
	var args_test = {};
	args_test.nickname = "JSAssistNick";
	args_test.platform = "twitch";
	args_test.message = "JSAssist driver is working fine";
	
	var provider_name = "JSAssist";
	var version = "v1.0.0";
	var fail_count = 0;
	var ignore_twitch = true;
	var plugin_config;
	
	/**
	 * JSAssist의 고질적인 JSON 버그 수정
	 * @param {String} json_string
	 * @returns {String}
	 */
	function FixJSAssistBug(json_string) {
		var message;
		
		// 트위치에서 이모티콘 입력시 앞뒤로 붙는 쓸데없는 것을 이모티콘 시동어로 적절히 바꿔준다
		// 이모티콘으로 트위치 이모티콘 영문명을 추가해주면 잘 동작함
		json_string = json_string.replace(/(?:\r\n|\r|\n)/g, "\\n");
		
		if (json_string.indexOf('"message" : "') !== -1) {
			message = json_string.substring(json_string.indexOf('"message" : "') + 13, json_string.indexOf('", "type" : '));
			// 메세지 맨 마지막에 \가 오면 이스케이프로 처리되어 발생하는 문제 수정
			json_string = json_string.replace(message, message.replace(/\\/g, '\\\\'));
			// JSAssist에서 " 들어간 채팅을 부적절하게 처리해 발생하는 문제 수정
			json_string = json_string.replace(message, message.replace(/"/g, '\\"'));
		}
		return json_string;
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
	
	if (typeof window.ChatAssistX.provider[provider_name] !== 'undefined') {
		console.log("JSAssist/TAPIC provider is already loaded!");
	} else {
		console.log("JSAssist/TAPIC driver is loading");
		
		window.ChatAssistX.provider[provider_name] = {};
		window.ChatAssistX.provider[provider_name].chatPresets = {};
		window.ChatAssistX.provider[provider_name].connect = function(config) {
			if(typeof config !== 'undefined') plugin_config = config;
			if(typeof plugin_config.channelname === 'undefined' || plugin_config.channelname === "" || plugin_config.do_not_use_tapic) {
				ignore_twitch = false;
			}
			
			if(plugin_config.do_not_use_jsassist) {
				ignore_twitch = true;
			} else {
				var ws = new WebSocket("ws://localhost:4649/JSAssistChatServer");
				ws.onopen = function() {
					fail_count = 0;
				};
				ws.onmessage = function(evt) {
					var data = JSON.parse(FixJSAssistBug(evt.data));
					
					
					if (data.type === "chat_message") {
						data.nickname = data.username;
						data.message = data.message.trim();
						data.isStreamer = isStreamer(data.platform, data.nickname);
						data.isMod = false;
						data.emotes = false;
						
						if (ignore_twitch) {
							if (data.platform !== "twitch") window.ChatAssistX.addChatMessage(data);
						} else {
							window.ChatAssistX.addChatMessage(data);
						}
					} else if (data.type === "config") {
						window.ChatAssistX.provider[provider_name].chatPresets[data.presetName] = data;
						if (data.presetName === window.ChatAssistX.config.preset) window.ChatAssistX.config.chat = window.ChatAssistX.provider[provider_name].chatPresets[data.presetName];
					}
				};
				ws.onclose = function() {
					is_connected = false;
					if(fail_count > 9 && fail_count % 10 === 0) window.ChatAssistX.addNotice("JSAssist에 연결할 수 없습니다. JSAssist가 실행중이고 방화벽 소프트웨어에 의해 차단되지 않았는지 확인해주세요.","system");
					
					fail_count++;
					console.warn("JSAssist에 연결할 수 없습니다. JSAssist가 실행중이고 방화벽 소프트웨어에 의해 차단되지 않았는지 확인해주세요.");
					//}
					if (fail_count > 100) {
						window.ChatAssistX.addNotice("100회 이상 접속 실패로 JSAssist 접속 시도를 중단합니다.[br]JSAssist가 켜져 있는지, 동시에 두개가 실행되어 있는건 아닌지 확인후 새로고침해주세요.","system");
						console.error("100회 이상 접속 실패로 접속 시도를 중단합니다.");
					} else {
						//console.error("JSAssist connect failed " + window.chat.failcount + " times.");
						setTimeout(window.ChatAssistX.provider[provider_name].connect, 1000);
					}
				};
			}
			
			window.ChatAssistX.commands["preset"] = {};
			window.ChatAssistX.commands["preset"].cooldown = 0;
			window.ChatAssistX.commands["preset"].lastusetime = -1;
			window.ChatAssistX.commands["preset"].permission = "streamer";
			window.ChatAssistX.commands["preset"].cmdFunc = function(args) {
				if (typeof window.ChatAssistX.provider[provider_name].chatPresets[args.message.match(/^!!preset ([^ ]+)/)[1]] === 'undefined') {
					window.ChatAssistX.addNotice("프리셋 " + args.message.match(/^!!preset ([^ ]+)/)[1] + "(은)는 존재하지 않습니다!","system");
				} else {
					window.ChatAssistX.config.preset = args.message.match(/^!!preset ([^ ]+)/)[1];
					window.ChatAssistX.config.chat = window.ChatAssistX.provider[provider_name].chatPresets[window.ChatAssistX.config.preset];
					window.ChatAssistX.addNotice("프리셋이 " + window.ChatAssistX.config.preset + "(으)로 변경되었습니다.","system");
				}
			};
			
			if (ignore_twitch) {
				if (typeof plugin_config.oauth === 'undefined' || plugin_config.oauth === "") {
					console.warn("TAPIC is using default oauth value!");
					// default hardcoded oauth value - do not change!
					plugin_config.oauth = "71g7xd68c55kb05rvzhbtt2fvey16i";
				}
				TAPIC.setup(plugin_config.oauth, function() {
					TAPIC.setRefreshRate(10);
					
					TAPIC.joinChannel(plugin_config.channelname, function() {
						console.info("TAPIC Connected!");
					});
				});
				
				TAPIC.listen('message', function(e) {
					var data = {};
					data.isStreamer = false;
					data.isMod = false;
					data.rawprint = false;
					data.emotes = e.emotes;
					data.nickname = e.from;
					data.message = e.text.trim();
					data.platform = "twitch";
					
					if (e.streamer || e.badges.indexOf("broadcaster/1") !== -1) {
						data.isStreamer = true;
						data.isMod = false;
					} else if (e.mod) {
						data.isStreamer = false;
						data.isMod = true;
					}
					
					window.ChatAssistX.addChatMessage(data);
				});
			}
			
			return true;
		};
		
		window.ChatAssistX.addNotice("JSAssist/TAPIC Provider " + version + " loading...","system");
	}
})(window);