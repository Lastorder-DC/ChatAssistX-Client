(function(window) {
	var args_test = {};
	args_test.nickname = "JSAssistNick";
	args_test.platform = "twitch";
	args_test.message = "JSAssist driver is working fine";
	var fail_count = 0;

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

	if (typeof window.ChatAssistX.provider['JSAssist'] !== 'undefined') {
		console.log("JSAssist provider is already loaded!");
	} else {
		console.log("JSAssist driver is loading");
		window.ChatAssistX.provider['JSAssist'] = {};
		window.ChatAssistX.provider['JSAssist'].connect = function() {
			//JSAssist 연결함수
			//console.warn("TODO: Implement JSAssist Connection");

			//window.ChatAssistX.addChatMessage(args_test);

			var ws = new WebSocket("ws://localhost:4649/JSAssistChatServer");
			ws.onopen = function() {
				fail_count = 0;
			};
			ws.onmessage = function(evt) {
				var data = JSON.parse(FixJSAssistBug(evt.data));

				if (data.type == "chat_message") {
					data.nickname = data.username;
					window.ChatAssistX.addChatMessage(data);
				} else if (data.type == "config") {
					//if (data.presetName == window.config.preset) window.chat.config = data;
				}
			};
			ws.onclose = function() {
				is_connected = false;
				fail_count++;
				//if(window.chat.failcount > 9 && window.chat.failcount % 10 === 0) {
				// 10번 이상 접속 실패시 접속 장애 안내문 출력
				//addChatMessage("warning", "ChatAssistX Error", "JSAssist에 연결할 수 없습니다. JSAssist가 실행중이고 방화벽 소프트웨어에 의해 차단되지 않았는지 확인해주세요.",true,false);
				console.warn("JSAssist에 연결할 수 없습니다. JSAssist가 실행중이고 방화벽 소프트웨어에 의해 차단되지 않았는지 확인해주세요.");
				//}
				if (window.chat.failcount > 29) {
					//addChatMessage("critical", "ChatAssistX Critical Error", "100회 이상 접속 실패로 접속 시도를 중단합니다.",true,false);
					console.error("100회 이상 접속 실패로 접속 시도를 중단합니다.");
				} else {
					//console.error("JSAssist connect failed " + window.chat.failcount + " times.");
					setTimeout(window.ChatAssistX.provider['JSAssist'].connect, 1000);
				}
			};

			return true;
		}
	}
})(window);