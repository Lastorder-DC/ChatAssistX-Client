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
		console.log("Twitch(tmijs) driver is loading2");
        // 1. nvrChannel을 이용하여 첫 번째 API 호출
        var xhr1 = new XMLHttpRequest();
		const nvrChannel = window.ChatAssistX.config.nvrChannel;
        xhr1.open('GET', `https://api.chatassistx.cc/?command=getChannel&cid=${nvrChannel}`, false);
        xhr1.send();
		console.log(nvrChannel);
        if (xhr1.status === 200) {
            var data1 = JSON.parse(xhr1.responseText);
			console.log(data1);	
            // 2. openLive가 true인 경우 두 번째 API 호출
            if (true) {
                var xhr2 = new XMLHttpRequest();
                xhr2.open('GET', `https://api.chatassistx.cc/?command=getLiveStatus&cid=${nvrChannel}`, false);
                xhr2.send();
				
                if (xhr2.status === 200) {
                    var data2 = JSON.parse(xhr2.responseText);

                    // 3. chatChannelId 저장
                    var chatChannelId = data2.content.chatChannelId;

					if(true){

						// 4. accessToken 저장
						var accessToken = data2['access-token'];

						// 5. 웹소켓 연결
						var socket = new WebSocket(`wss://kr-ss${Math.floor(Math.random() * 4) + 1}.chat.naver.com/chat`);

						// 6. 웹소켓으로 전송할 내용 구성
						var init_chat = {
							ver: '2',
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
						};

						socket.onmessage = function (event) {
							socketResponse = JSON.parse(event.data);

							// 8. sid를 sid 변수에 저장한 후 login 전송
							if (socketResponse.cmd === 10100) {
								var sid = socketResponse.bdy.sid;
								var login = {
									ver: '2',
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
							// 9. 아마도 핑 비스무리한것 응답
							} else if (socketResponse.cmd === 0) {
								socket.send('{"ver":"2","cmd":10000}');
							// 10. 채팅 처리
							} else {
								if(Array.isArray(socketResponse.bdy)) {
									for(const chat of socketResponse.bdy) {
										const profile = JSON.parse(chat['profile']);
										const ext_args = {};
										const extras = JSON.parse(chat['extras']);
										
										ext_args.isStreamer = (profile['userRoleCode'] == "streamer");
										ext_args.isMod = (profile['userRoleCode'] == "streaming_chat_manager");
										ext_args.rawprint = false;
										ext_args.emotes = extras['emojis'];
										ext_args.color = void 0;
										ext_args.subscriber = false;
										console.log(chat.msg.htmlEntities());
										var data = {};
														
										data.isStreamer = false;
										data.isMod = false;
										data.rawprint = false;
										data.nickname = profile['nickname'].htmlEntities();
										data.message = chat.msg.htmlEntities();
										data.platform = "twitch";
										console.log(data);
										window.ChatAssistX.addChatMessage(data);
									}
								}
							}
						};	
					}
                    
                }
            }
        }
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
					clientId: "pmxd8z2s9kfykxrw8t665kdv02uay4"
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
			});
			
			client.on("connected", (address, port) => {
                        	console.log("Twitch inited");
                    	});
			
			client.on("message", function(channel, userstate, message, self) {
				if (userstate["message-type"] !== "chat") return;
				
				var data = {};
				data.isStreamer = false;
				data.isMod = false;
				data.rawprint = false;
				data.nickname = userstate["display-name"];
				data.message = message.trim();
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
				console.log(data);
				window.ChatAssistX.addChatMessage(data);
			});
			
		client.connect().catch(console.error);
			return true;
		};
		
		window.ChatAssistX.addNotice("Twitch(tmijs) Provider " + version + " loading...","system");
		
	}
})(window);
