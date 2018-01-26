(function(window) {
	var args_test = {};
	args_test.nickname = "MixerNick";
	args_test.platform = "mixer";
	args_test.message = "Mixer driver is working fine";
	
	var provider_name = "mixer";
	var channelid;
	var version = "v0.1.0";
	var fail_count = 0;
	var serverList = ["wss://chat6-dal.mixer.com:443",
					  "wss://chat9-dal.mixer.com:443",
					  "wss://chat4-dal.mixer.com:443",
					  "wss://chat2-dal.mixer.com:443",
					  "wss://chat3-dal.mixer.com:443",
					  "wss://chat8-dal.mixer.com:443",
					  "wss://chat7-dal.mixer.com:443",
					  "wss://chat5-dal.mixer.com:443",
					  "wss://chat1-dal.mixer.com:443"];
	var curServer = 0;

	if (typeof window.ChatAssistX.provider[provider_name] !== 'undefined') {
		console.log("Mixer provider is already loaded!");
	} else {
		console.log("Mixer driver is loading");
		window.ChatAssistX.provider[provider_name] = {};
		window.ChatAssistX.provider[provider_name].chatPresets = {};
		window.ChatAssistX.provider[provider_name].connect = function(plugin_config) {
			if(typeof plugin_config !== 'undefined') channelid = plugin_config.channelid;
			var ws = new WebSocket(serverList[curServer]);
			ws.onopen = function() {
				ws.send('{"type": "method","method": "auth","arguments": [' + channelid + '],"id": 0}');
			};
			ws.onmessage = function(evt) {
				var data = JSON.parse(evt.data);
				
				if(data.type === "event" && data.event === "ChatMessage") {
					var parsedData = data.data;
					var message = "";
					
					//TODO 멘션링크 등등등 처리
					for(var id in parsedData.message.message) {
						message += parsedData.message.message[id].text;
					}
					
					parsedData.nickname = parsedData.user_name;
					parsedData.platform = "mixer";
					parsedData.message = message;
					parsedData.isStreamer = false;
					parsedData.isMod = false;
					
					window.ChatAssistX.addChatMessage(parsedData);
				}
			};
			ws.onclose = function() {
				curServer++;
				if(curServer > 9) curServer = 0;
				
				setTimeout(window.ChatAssistX.provider[provider_name].connect, 1000);
			};

			return true;
		}
	}
})(window);