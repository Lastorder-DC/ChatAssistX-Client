(function(window) {
	var plugin_name = "command";

	if (typeof window.ChatAssistX.plugins[plugin_name] !== 'undefined') {
		console.log("Command plugin is already loaded!");
	} else {
		console.log("Command plugin is loaded");
		window.ChatAssistX.plugins[plugin_name] = {};
		window.ChatAssistX.plugins[plugin_name].process = function(message, config) {
			console.warn("Command Plugin - process() is stub");
			
			return false;
		}
		
		window.ChatAssistX.plugins[plugin_name].init = function(config) {
			return true;
		}
	}
})(window);