/*
    This file is what connects to chat and parses messages as they come along. The chat client connects via a 
    Web Socket to Twitch chat. The important part events are onopen and onmessage.

	Original Author : Dallas Tester (@DallasNChains)
*/

var chatClient = function chatClient(options){
    this.username = options.username;
    this.password = options.password;
    this.channel = options.channel;

    this.server = 'irc-ws.chat.twitch.tv';
    this.port = 443;
	this.limit = 20;
	this.lasttime = Date.now() / 1000 | 0;
	this.count = 0;
}

chatClient.prototype.unixtime = function unixtime(){
	return Date.now() / 1000 | 0;
};

chatClient.prototype.open = function open(){
    this.webSocket = new WebSocket('wss://' + this.server + ':' + this.port + '/', 'irc');

    this.webSocket.onmessage = this.onMessage.bind(this);
    this.webSocket.onerror = this.onError.bind(this);
    this.webSocket.onclose = this.onClose.bind(this);
    this.webSocket.onopen = this.onOpen.bind(this);
};

chatClient.prototype.onError = function onError(message){
    console.log('Error: ' + message);
};

/* This is an example of a leaderboard scoring system. When someone sends a message to chat, we store 
   that value in local storage. It will show up when you click Populate Leaderboard in the UI. 
*/
chatClient.prototype.onMessage = function onMessage(message){
    if(message !== null) {
        var parsed = this.parseMessage(message.data);

        if(parsed !== null) {
			// do something
        }
    }
};

chatClient.prototype.sendMessage = function sendMessage(message){
	var socket = this.webSocket;

	if(typeof socket === 'undefined' || typeof socket.send === 'undefined') {
		console.error("Chat is not connected!");
		return false;
	}

	if(this.unixtime() - this.lasttime > 30) this.count = 0;

	// prevent over 20 message during 30sec period.
	if(this.count == 20) {
		console.error("Message was not sent because 20 / 30sec limit was over");
		return false;
	}

	if(typeof message === 'undefined' || message == '') return;
	socket.send('PRIVMSG ' + this.channel + ' :' + message);
	this.lasttime = this.unixtime();
	this.count++;

	console.log("Message \"" + message + "\" was sent to chatroom " + this.channel + ".");
	console.log("This is " + this.count + "th message of 30sec period. (total 20 message)");

	return true;
};

chatClient.prototype.onOpen = function onOpen(){
    var socket = this.webSocket;

    if (socket !== null && socket.readyState === 1) {
        console.log('Connecting and authenticating...');

        socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
        socket.send('PASS ' + this.password);
        socket.send('NICK ' + this.username);
        socket.send('JOIN ' + this.channel);
		this.count = 4;
		this.lasttime = this.unixtime();
    }
};

chatClient.prototype.onClose = function onClose(){
    console.log('Disconnected from the chat server.');
};

chatClient.prototype.close = function close(){
    if(this.webSocket){
        this.webSocket.close();
    }
};

/* This is an example of an IRC message with tags. I split it across 
multiple lines for readability. The spaces at the beginning of each line are 
intentional to show where each set of information is parsed. */

//@badges=global_mod/1,turbo/1;color=#0D4200;display-name=TWITCH_UserNaME;emotes=25:0-4,12-16/1902:6-10;mod=0;room-id=1337;subscriber=0;turbo=1;user-id=1337;user-type=global_mod
// :twitch_username!twitch_username@twitch_username.tmi.twitch.tv 
// PRIVMSG 
// #channel
// :Kappa Keepo Kappa

chatClient.prototype.parseMessage = function parseMessage(rawMessage) {
    var parsedMessage = {
        message: null,
        tags: null,
        command: null,
        original: rawMessage,
        channel: null,
        username: null
    };

    if(rawMessage[0] === '@'){
        var tagIndex = rawMessage.indexOf(' '),
        userIndex = rawMessage.indexOf(' ', tagIndex + 1),
        commandIndex = rawMessage.indexOf(' ', userIndex + 1),
        channelIndex = rawMessage.indexOf(' ', commandIndex + 1),
        messageIndex = rawMessage.indexOf(':', channelIndex + 1);

        parsedMessage.tags = rawMessage.slice(0, tagIndex);
        parsedMessage.username = rawMessage.slice(tagIndex + 2, rawMessage.indexOf('!'));
        parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
        parsedMessage.channel = rawMessage.slice(commandIndex + 1, channelIndex);
        parsedMessage.message = rawMessage.slice(messageIndex + 1);
    }

    if(parsedMessage.command !== 'PRIVMSG'){
        parsedMessage = null;
    }

    return parsedMessage;
}