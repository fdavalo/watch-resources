import websocket from 'websocket';
import http from 'http';

"use strict";

const webSocketServer = websocket.server;

class WsServer {

    constructor(port, eventHandle) {
        var server = http.createServer(function(request, response) {});
	    server.listen(port, function() {});
        this.clients = [];
        this.eventHandle = eventHandle;
	    this.wsServer = new webSocketServer({httpServer: server});
	    this.wsServer.on('request', wsHandle);        
    }

    send(message, connection) {
        connection.sendUTF(JSON.stringify(message));
    }
    
    dispatch(message) {
	    var json = JSON.stringify(message);
	    for (var i=0; i < clients.length; i++) {
		    this.clients[i].sendUTF(json);
	    }
    }

    close(connection) {
	    var index = -1;
	    for (var i=0; i < this.clients.length; i++) {
		    if (connection==clients[i]) {
			    index = i;
			    break;
		    }
	    }
	    if (index > 0) this.clients.splice(index, 1);
    }

    wsHandle(request) {
	    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
	    var connection = request.accept(null, request.origin);
	    var index = this.clients.push(connection) - 1;
	    connection.on('message', function(message) {
		    if (message.type === 'utf8') {
			    var msg = JSON.parse(message.utf8Data);
                this.eventHandle(msg, connection);
		    }
	    });
	    connection.on('error', function(connection) {
		    console.log((new Date()) + " Peer " + connection.remoteAddress + " error.");
		    close(connection);
	    });
	    connection.on('close', function(connection) {
		    console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
		    close(connection);
	    });
    }

}