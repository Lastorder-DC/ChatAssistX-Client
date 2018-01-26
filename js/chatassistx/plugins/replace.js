(function(window) {
	var plugin_name = "replace";

	if (typeof window.ChatAssistX.plugins[plugin_name] !== 'undefined') {
		console.log(plugin_name.capFirst() + " plugin is already loaded!");
	} else {
		console.log(plugin_name.capFirst() + " plugin is loaded");
		window.ChatAssistX.plugins[plugin_name] = {};
		window.ChatAssistX.plugins[plugin_name].process = function(args, config) {
			var message = args.message;
			if(typeof config === 'undefined') {
				console.warn("Replace plugin loaded without replace_list. quitting...");
				window.ChatAssistX.plugins[plugin_name].process = function(args, config) {
					return false;
				};
			}
			
			if(typeof config === 'string') {
				var old_config;
				config = [];
				config.push(old_config);
				
				console.warn("replace_list should be array, not string.");
			}
			
			for(var findword in config.replace_list) {
				//console.info(findword + " => " + config.replace_list[findword]);
				var keyword_test = new RegExp(findword.escapeRegExp(), "g");
				message = message.replace(keyword_test, config.replace_list[findword]);
			}
			
			if(args.message != message) return message;
			else return false;
		};
		
		window.ChatAssistX.plugins[plugin_name].init = function(config) {
			return true;
		};
	}
})(window);