import request from 'request';
import JSONStream from 'json-stream';
import fs from 'fs';
import process from 'process';
import websocket from 'websocket';
import http from 'http';

"use strict";

var webSocketsServerPort = 8080;
var webSocketServer = websocket.server;

var clients = [];
var data = {};

var server = http.createServer(function(request, response) {});
var wsServer = null;

process.on('uncaughtException', function (err) {
  console.log(err);
})

var cadir = '.';
var tokendir = '/var/run/secrets/kubernetes.io/serviceaccount';
if (process.argv.length > 3) tokendir = process.argv[3];
if (process.argv.length > 4) cadir = process.argv[4];

const options = {
  resource: 'pods',
  url: 'https://kubernetes.default:443',
  request: {
	auth: {
	   bearer: fs.readFileSync(tokendir+'/token')
	},
	ca: fs.readFileSync(cadir+'/ca.pem'),
	//cert: fs.readFileSync(certdir+'/cert.pem'),
	//key: fs.readFileSync(certdir+'/key.pem')
  },
  version: 'v1'
};

if (process.argv.length > 2) options.resource = process.argv[2];

var url = `${options.url}/api/${options.version}/${options.resource}`;

const watchRequest = {
  uri: url,
  qs: {
	timeoutSeconds: 60,
	watch: true,
  }
};

for (var key in options.request) watchRequest[key] = options.request[key];

const versionRequest = {
  uri: url,
  json: true,
  qs: {}
};

for (var key in options.request) versionRequest[key] = options.request[key];

function versionStream() {doStream(versionRequest);}
function watchStream() {
	if ('resourceVersion' in watchRequest.qs) doStream(watchRequest);
	else versionStream();
}

function dispatch(key) {
	var message = {"request":"one", "type":options.resource, "key":key, "value":data[key]};
	var json = JSON.stringify(message);
	for (var i=0; i < clients.length; i++) {
		clients[i].sendUTF(json);
	}
}

function produce(event) {
	var key = event.object.metadata.uid;
	var value = event.object;
	event.object['eventType']=event.type;
	data[key]=value;
	if (clients.length>0) dispatch(key);
}

function close(connection) {
	var index = -1;
	for (var i=0; i < clients.length; i++) {
		if (connection==clients[i]) {
			index = i;
			break;
		}
	}
	if (index > 0) clients.splice(index, 1);
}

function wsHandle(request) {
	console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
	var connection = request.accept(null, request.origin);
	var index = clients.push(connection) - 1;
	connection.on('message', function(message) {
		if (message.type === 'utf8') {
			var msg = JSON.parse(message.utf8Data);
			if (msg.request === 'all') {
				connection.sendUTF(JSON.stringify({"request":"all", "type":options.resource, "data":data}));
			}
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

function wsStart() {
	console.log('wsStart');
	server.listen(webSocketsServerPort, function() {});
	wsServer = new webSocketServer({httpServer: server});
	wsServer.on('request', wsHandle);
}

function doStream(req) {
	console.log(req);
	if ((wsServer == null) && req.qs['watch']) wsStart();
	var stream = new JSONStream();
	stream.on('data', event => {
		if (event) {
			if (event.kind && event.items) {
				for (var i=0;i<event.items.length; i++) {
					var item = event.items[i];
					data[item.metadata.uid]=item;
				}
				watchRequest.qs.resourceVersion = event.metadata.resourceVersion;
			}
			else if (event.type && event.object && event.object.kind) {
				watchRequest.qs.resourceVersion = event.object.metadata.resourceVersion;
				produce(event);
			}
		}
	});
	request(req).on('close', watchStream).pipe(stream);
}

watchStream();

