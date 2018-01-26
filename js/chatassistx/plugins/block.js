(function(window) {
	var plugin_name = "block";

	if (typeof window.ChatAssistX.plugins[plugin_name] !== 'undefined') {
		console.log(plugin_name.capFirst() + " plugin is already loaded!");
	} else {
		console.log(plugin_name.capFirst() + " plugin is loaded");
		window.ChatAssistX.plugins[plugin_name] = {};
		window.ChatAssistX.plugins[plugin_name].process = function(args, config) {
			var block_nick = [];
			var block_chat = [];
			var message = args.message;
			var do_not_print = false;
			
			if(typeof config === 'undefined') {
				console.error("Block plugin loaded without block_list. quitting...");
				window.ChatAssistX.plugins[plugin_name].process = function(args, config) {
					return false;
				};
			}
			
			if(typeof config === 'string') {
				console.error("block_list should be array, not string. quitting...");
				window.ChatAssistX.plugins[plugin_name].process = function(args, config) {
					return false;
				};
			}
			
			for(var blockword in config.block_list) {
			    if(config.block_list[blockword] === "keyword") {
			        block_chat.push(blockword);
			    } else if(config.block_list[blockword] === "nickname") {
			        block_nick.push(blockword);
			    }
			}
			
			var keyword_test = new RegExp("(" + block_chat.join("|") + ")", "g");
			if(keyword_test.test(args.message)) do_not_print = true;
			if(block_nick.indexOf(args.nickname.toLowerCase()) !== -1) do_not_print = true;
			
			if(do_not_print) return "DO_NOT_PRINT";
			else return false;
		};
		
		window.ChatAssistX.plugins[plugin_name].init = function(config) {
			return true;
		};
	}
})(window);