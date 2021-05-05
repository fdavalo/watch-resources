import websocket from 'websocket';

"use strict";

export class WsClient {

    constructor(messageHandler, serverUrl='ws://localhost:8080/') {
        this.serverUrl = serverUrl;
        this.messageHandler = messageHandler;
        this.wsClient = new websocket.client();
        this.clientConnection = null;
        this.data = {};
        this.wsClient.on('connectFailed', this.errorConnection.bind(this)); 
        this.wsClient.on('connect', this.handleConnection.bind(this));
        this.check();
    }

    send(message) {
        var json = JSON.stringify(message);
        if (this.clientConnection != null) this.clientConnection.sendUTF(json);
    }

    messageHandle(message) {
        if (message.type === 'utf8') {
            var msg = JSON.parse(message.utf8Data);
            //console.log("Received: '" + message.utf8Data + "'");
            this.messageHandler.handleMessage(msg); 
        }
    }

    errorConnection (error) {
        console.log('Connect Error: ' + error.toString());
    }

    handleConnection (connection) {
        console.log('WebSocket Client Connected');
        this.clientConnection = connection;
        this.messageHandler.handleConnection();
        connection.on('error', function(error) {
            console.log("Connection Error: " + error.toString());
            this.disconnect();
        });
        connection.on('close', function() {
            console.log('Connection Closed');
            this.disconnect();
        });
        connection.on('message', this.messageHandle.bind(this));
    }

    disconnect() {
        if (this.clientConnection!=null) {
                this.clientConnection=null;
                setTimeout(this.connect.bind(this), 10000);
        }
    }

    connect() {
        if (this.clientConnection!=null) this.disconnect();
        else this.wsClient.connect(this.serverUrl);
    }

    check() {
        if (this.clientConnection == null) this.connect();
        setTimeout(this.check.bind(this), 10000);
    }

    close() {
        if (this.clientConnection!=null) this.disconnect();
    }
}
