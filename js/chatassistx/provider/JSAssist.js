(function(window) {
	var args_test = {};
	args_test.nickname = "JSAssistNick";
	args_test.platform = "twitch";
	args_test.message = "JSAssist driver is working fine";

	var provider_name = "JSAssist";
	var version = "v1.0.0"
	var fail_count = 0;
	var ignore_twitch = true;

	function FixJSAssistBug(json_string) {
		var message;

		// 트위치에서 이모티콘 입력시 앞뒤로 붙는 쓸데없는 것을 이모티콘 시동어로 적절히 바꿔준다
		// 이모티콘으로 트위치 이모티콘 영문명을 추가해주면 잘 동작함
		json_string = json_string.replace(/(?:\r\n|\r|\n)/g, "\\n");

		if (json_string.indexOf('"message" : "') != -1) {
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
	 * @param {String} nickname
	 * @returns {Boolean}
	 */
	function isStreamer(platform, nickname) {
		return window.ChatAssistX.config.streamer[platform] == nickname;
	}

	if (typeof window.ChatAssistX.provider[provider_name] !== 'undefined') {
		console.log("JSAssist/TAPIC provider is already loaded!");
	} else {
		console.log("JSAssist/TAPIC driver is loading");

		window.ChatAssistX.provider[provider_name] = {};
		window.ChatAssistX.provider[provider_name].chatPresets = {};
		window.ChatAssistX.provider[provider_name].connect = function(plugin_config) {
			if (typeof plugin_config.channelname === 'undefined' || plugin_config.channelname === "" || plugin_config.do_not_use_tapic) {
				ignore_twitch = false;
			}

			var ws = new WebSocket("ws://localhost:4649/JSAssistChatServer");
			ws.onopen = function() {
				fail_count = 0;
			};
			ws.onmessage = function(evt) {
				var data = JSON.parse(FixJSAssistBug(evt.data));


				if (data.type == "chat_message") {
					data.nickname = data.username;
					data.message = data.message.trim();
					data.isStreamer = isStreamer(data.platform, data.nickname);
					data.isMod = false;
					data.emotes = false;

					if (data.isStreamer && data.message.match(/^!!preset ([^ ]+)/) != null) {
						if (typeof window.ChatAssistX.provider[provider_name].chatPresets[data.message.match(/^!!preset ([^ ]+)/)[1]] === 'undefined') {
							window.ChatAssistX.addNotice("프리셋 " + data.message.match(/^!!preset ([^ ]+)/)[1] + " 은 존재하지 않습니다!", "error");
						} else {
							window.ChatAssistX.config.preset = data.message.match(/^!!preset ([^ ]+)/)[1];
							window.ChatAssistX.config.chat = window.ChatAssistX.provider[provider_name].chatPresets[window.ChatAssistX.config.preset];

							window.ChatAssistX.addNotice("프리셋이 " + window.ChatAssistX.config.preset + " 으로 변경되었습니다.", "info");
						}
					} else {
						if (ignore_twitch) {
							if (data.platform !== "twitch") window.ChatAssistX.addChatMessage(data);
						} else {
							window.ChatAssistX.addChatMessage(data);
						}
					}
				} else if (data.type == "config") {
					window.ChatAssistX.provider[provider_name].chatPresets[data.presetName] = data;
					if (data.presetName == window.ChatAssistX.config.preset) window.ChatAssistX.config.chat = window.ChatAssistX.provider[provider_name].chatPresets[data.presetName];
				}
			};
			ws.onclose = function() {
				is_connected = false;
				fail_count++;
				//if(window.chat.failcount > 9 && window.chat.failcount % 10 === 0) {
				// 10번 이상 접속 실패시 접속 장애 안내문 출력
				//addChatMessage("warning", "ChatAssistX Error", "JSAssist에 연결할 수 없습니다. JSAssist가 실행중이고 방화벽 소프트웨어에 의해 차단되지 않았는지 확인해주세요.",true,false);
				console.warn("JSAssist에 연결할 수 없습니다. JSAssist가 실행중이고 방화벽 소프트웨어에 의해 차단되지 않았는지 확인해주세요.");
				window.ChatAssistX.addNotice("JSAssist에 연결할 수 없습니다. JSAssist가 실행중이고 방화벽 소프트웨어에 의해 차단되지 않았는지 확인해주세요.", "warn");
				//}
				if (window.chat.failcount > 29) {
					//addChatMessage("critical", "ChatAssistX Critical Error", "100회 이상 접속 실패로 접속 시도를 중단합니다.",true,false);
					console.error("100회 이상 접속 실패로 접속 시도를 중단합니다.");
					window.ChatAssistX.addNotice("100회 이상 접속 실패로 접속 시도를 중단합니다. 재접속하시려면 새로고침해주세요.", "error");
				} else {
					//console.error("JSAssist connect failed " + window.chat.failcount + " times.");
					setTimeout(window.ChatAssistX.provider[provider_name].connect, 1000);
				}
			};

			if (ignore_twitch) {
				if (typeof plugin_config.oauth === 'undefined' || plugin_config.oauth === "") {
					console.warn("TAPIC is using default oauth value!");
					plugin_config.oauth = "3f3bf3d800zru10drjjl4j7fagr9aa";
				}
				TAPIC.setup(plugin_config.oauth, function(username) {
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

					if (e.streamer || e.badges.indexOf("broadcaster/1") != -1) {
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
		}
	}
})(window);
