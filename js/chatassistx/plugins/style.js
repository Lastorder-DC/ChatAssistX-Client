(function(window) {
	var plugin_name = "style";

	/**
	 * 메세지에서 기본 스타일 문법 치환
	 * @param {String} message
	 * @returns {String}
	 */
	function replaceStyle(message) {
		// 외부 이미지 문법(기본 비활성화 상태로 상단 설정변수를 true로 바꿔 활성화 가능)
		// 외부 이미지 문법 이외 다른 문법이나 글자는 무시됩니다.
		if (window.ChatAssistX.config.allowExternalSource) {
			var image = message.match(/\[img ([^\]\"]*)\]/);
			if(image !== null && typeof image[1] !== 'undefined') {
				var attr = {};
				attr.class = "extimg"
				message = ReferrerKiller.imageHtml(image[1], attr, attr);
			}

			// 나머지 외부 이미지 문법은 모두 삭제
			message = message.replace(/\[img ([^\]\"]*)\]/g, "");
		}

		//닫는태그가 지정된 [b][i][s]
		message = message.replace(/\[b\](.*)\[\/b\]/g, "<b>$1</b>"); //볼드 [b]blah[/b]
		message = message.replace(/\[i\](.*)\[\/i\]/g, "<i>$1</i>"); //이탤릭 [i]blah[/i]
		message = message.replace(/\[s\](.*)\[\/s\]/g, "<strike>$1</strike>"); //취소선 [s]blahp[/s]

		// 나무위키식
		message = message.replace(/'''(.*)'''/g, "<b>$1</b>");
		message = message.replace(/''(.*)''/g, "<i>$1</i>");
		message = message.replace(/~~(.*)~~/g, "<strike>$1</strike>");
		message = message.replace(/--(.*)--/g, "<strike>$1</strike>");
		message = message.replace(/__(.*)__/g, "<u>$1</u>");

		//닫는 태그가 없는 [b][i][s]
		message = message.replace(/\[b\](.*)/g, "<b>$1</b>"); //볼드 [b]blah
		message = message.replace(/\[i\](.*)/g, "<i>$1</i>"); //이탤릭 [i]blah
		message = message.replace(/\[s\](.*)/g, "<strike>$1</strike>"); //취소선 [s]blah

		//강제개행
		message = message.replace(/\[br\]/g, "<br />");

		return message;
	}

	if (typeof window.ChatAssistX.plugins[plugin_name] !== 'undefined') {
		console.log("Style plugin is already loaded!");
	} else {
		console.log("Style plugin is loaded");
		window.ChatAssistX.plugins[plugin_name] = {};
		window.ChatAssistX.plugins[plugin_name].process = function(args, config) {
			var processedMessage = replaceStyle(args.message);

			if (processedMessage !== args.message) return processedMessage;
			else return false;
		}

		window.ChatAssistX.plugins[plugin_name].init = function(config) {
			// register image command
			window.ChatAssistX.commands["image"] = {};
			window.ChatAssistX.commands["image"].cooldown = 0;
			window.ChatAssistX.commands["image"].lastusetime = -1;
			window.ChatAssistX.commands["image"].permission = "streamer";
			window.ChatAssistX.commands["image"].cmdFunc = function(args) {
				var option = args.message.match(/^!!image (on|off)/);
				
				if(option === null || typeof option[1] === 'undefined') {
					window.ChatAssistX.addNotice("사용법 : !!image on|off - 외부이미지 문법을 켜거나 끕니다.","system");
				} else {
					if(option[1] === "on") {
						window.ChatAssistX.config.allowExternalSource = true;
						window.ChatAssistX.addNotice("외부이미지 문법이 켜졌습니다.","system");
					} else {
						window.ChatAssistX.config.allowExternalSource = false;
						window.ChatAssistX.addNotice("외부이미지 문법이 꺼졌습니다.","system");
					}
				}
			};
			
			return true;
		}
	}
})(window);
