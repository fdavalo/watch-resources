import websocket from 'websocket';
import http from 'http';

"use strict";

const webSocketServer = websocket.server;

export class WsServer {

    constructor(port, messageHandler) {
		var server = http.createServer(function(request, response) {});
		server.listen(port, function() {});
        this.clients = [];
        this.messageHandler = messageHandler;
	    this.wsServer = new webSocketServer({httpServer: server});
	    this.wsServer.on('request', this.wsHandle.bind(this));        
    }

    send(message, connection) {
        connection.sendUTF(JSON.stringify(message));
    }
    
    dispatch(message) {
	    var json = JSON.stringify(message);
	    for (var i=0; i < this.clients.length; i++) {
		    this.clients[i].sendUTF(json);
	    }
    }

    close(connection) {
	    var index = -1;
	    for (var i=0; i < this.clients.length; i++) {
		    if (connection==this.clients[i]) {
			    index = i;
			    break;
		    }
	    }
	    if (index > 0) this.clients.splice(index, 1);
    }

	messageHandle(message) {
		if (message.type === 'utf8') {
			var msg = JSON.parse(message.utf8Data);
			this.messageHandler.messageHandle(msg);
		}
	}
	
	wsClose(connection) {
		    console.log((new Date()) + " Peer " + connection.remoteAddress + " error.");
		    this.close(connection);
	}
	
    wsHandle(request) {
	    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
	    var connection = request.accept(null, request.origin);
	    var index = this.clients.push(connection) - 1;
	    connection.on('message', this.messageHandle.bind(this));
	    connection.on('error', this.wsClose.bind(this));
	    connection.on('close', this.wsClose.bind(this));
    }

}
