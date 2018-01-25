(function(window) {
	var plugin_name = "style";

	/**
	 * 메세지에서 기본 스타일 문법 치환
	 * @param {String} message
	 * @returns {String}
	 */
	function replaceStyle(message) {
		//외부 이미지 문법(기본 비활성화 상태로 상단 설정변수를 true로 바꿔 활성화 가능)
		if (window.ChatAssistX.config.allowExternalSource) {
			// 일단 처음 나오는 이미지는 바꿈
			message = message.replace(/\[img ([^\]\"]*)\]/, "<img class='extimg' src=\"$1\" />");

			// 두번째 이후 이미지는 모두 삭제
			message = message.replace(/\[img ([^\]\"]*)\]/g, "");
		}
		
		// 트위치 이모티콘을 이미지태그로 변환
		// 내부문법으로 직접 사용 비권장
		message = message.replace(/\[twitch ([0-9]*)\]/g, "<img class=\"twchimg\" src=\"https://static-cdn.jtvnw.net/emoticons/v1/$1/" + window.ChatAssistX.config.TwitchEmoticonsize + "\" >");

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

			if (processedMessage != args.message) return processedMessage;
			else return false;
		}

		window.ChatAssistX.plugins[plugin_name].init = function(config) {
			return true;
		}
	}
})(window);