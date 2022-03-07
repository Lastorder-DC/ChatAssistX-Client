(function(window) {
	var args_test = {};
	args_test.nickname = "JSAssistNick";
	args_test.platform = "twitch";
	args_test.message = "JSAssist driver is working fine";
	
	var provider_name = "JSAssist";
	var version = "v1.1.0";
	var fail_count = 0;
	var ignore_twitch = true;
	var plugin_config;
	
	/**
	 * JSAssist의 고질적인 JSON 버그 수정
	 * @param {String} json_string
	 * @returns {String}
	 * @removed JSAssist 지원은 중단되었으며 이 함수는 입력값을 그대로 반환합니다.
	 */
	function FixJSAssistBug(json_string) {
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
		console.log("Twitch(tmijs) provider is already loaded!");
	} else {
		console.log("Twitch(tmijs) driver is loading");
		
		window.ChatAssistX.provider[provider_name] = {};
		window.ChatAssistX.provider[provider_name].chatPresets = {};
		window.ChatAssistX.provider[provider_name].connect = function(config) {
			if(typeof config !== 'undefined') plugin_config = config;
			
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
			
			if (typeof plugin_config.login === 'undefined' || plugin_config.login === "" || typeof plugin_config.oauth === 'undefined' || plugin_config.oauth === "") {
				window.ChatAssistX.addNotice("Cannot connect to twitch - missing login information", "system");
			}
			
			client = new tmi.Client({
				options: {
					debug: true,
					messagesLogLevel: "info",
					clientId: window.oauth_client_id
				},
				connection: {
					reconnect: true,
					secure: true
				},
				identity: {
					username: plugin_config.login,
					password: plugin_config.oauth
				},
				channels: [plugin_config.channelname]
			);
			
			
			TAPIC.setup(plugin_config.oauth, function() {
				TAPIC.setRefreshRate(10);

				TAPIC.joinChannel(plugin_config.channelname, function() {
					console.info("TAPIC Connected!");
				});
			});
			
			client.on("connected", (address, port) => {
                        	console.log("Twitch inited");
                    	});
			
			client.on("message", function(channel, userstate, message, self) {
				if (self || userstate["message-type"] !== "chat") return;
				
				var data = {};
				data.isStreamer = false;
				data.isMod = false;
				data.rawprint = false;
				data.nickname = userstate["display-name"];
				data.message = e.text.trim();
				data.color = userstate.color;
				data.platform = "twitch";
				if(userstate['emotes-raw'] !== null) data.emotes = userstate['emotes-raw'];
				
				data.room_id = userstate["room-id"];
				data.user_id = userstate["user-id"];
				data.action = userstate["message-type"] == "action";
				data.badges = userstate["badges-raw"] ?? "";
				
				data.streamer = data.badges.indexOf("broadcaster/1") !== -1;
				data.mod = userstate.mod;
				data.sub = userstate.subscriber;
				data.turbo = userstate.turbo;
				
				if (data.streamer || data.badges.indexOf("broadcaster/1") !== -1) {
					data.isStreamer = true;
					data.isMod = false;
				} else if (data.mod) {
					data.isStreamer = false;
					data.isMod = true;
				}
				
				window.ChatAssistX.addChatMessage(data);
			}
			
			return true;
		};
		
		window.ChatAssistX.addNotice("Twitch(tmijs) Provider " + version + " loading...","system");
	}
})(window);
