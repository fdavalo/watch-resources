import request from 'request';
import JSONStream from 'json-stream';
import fs from 'fs';
import {WsServer} from './wsserver.js';
import process from 'process';
 
export class Watch {

    constructor(resource, 
                tokendir='/var/run/secrets/kubernetes.io/serviceaccount', 
                cadir='.', 
                kubeApiUrl='https://kubernetes.default:443') {

        if (process.env.TOKENDIR) tokendir = process.env.TOKENDIR;
        if (process.env.CADIR) cadir = process.env.CADIR;
        if (process.env.KUBEAPIURL) kubeApiUrl = process.env.KUBEAPIURL;

        this.data = {};

        var reqOptions = {
            auth: {
                bearer: fs.readFileSync(tokendir+'/token')
            },
            ca: fs.readFileSync(cadir+'/ca.pem'),
        };

        this.options = {
            resource: resource,
            url: kubeApiUrl,
            request: reqOptions,
            version: 'v1'
        };
    
        this.url = `${this.options.url}/api/${this.options.version}/${resource}`;

        this.watchRequest = {
            uri: this.url,
            qs: {
                timeoutSeconds: 60,
                watch: true,
            }
        };
    
        this.versionRequest = {
            uri: this.url,
            json: true,
            qs: {}
        };

        // copy authents keys
        for (var key in reqOptions) this.watchRequest[key] = reqOptions[key];  
        for (var key in reqOptions) this.versionRequest[key] = reqOptions[key];

        this.wsServer = null;
        this.stream = null;
        this.end = false;
    }

    messageHandle(msg) {
        // When called with 'all' message, dispatch all resource info
        if (msg.request === 'all') {
            var message = {"request":"all", "type":this.options.resource, "data":this.data};
            this.wsServer.dispatch(message);
        }
    }

    // first call, gets resources and set resourceVersion for next watch calls
    versionStream() {
        this.doStream(this.versionRequest);
    }

    // when resourceVersion set, watch ressources by stream mode
    watchStream() {
        if (this.end) return;
        if ('resourceVersion' in this.watchRequest.qs) this.doStream(this.watchRequest);
        else this.versionStream();
    }

    doStream(req) {
        console.log(req);
        this.stream = new JSONStream();
        this.stream.on('data', event => {
            if (event) {
                // result from get all resources, first call
                if (event.kind && event.items) {
                    for (var i=0;i<event.items.length; i++) {
                        var item = event.items[i];
                        this.data[item.metadata.uid]=item;
                    }
                    this.watchRequest.qs.resourceVersion = event.metadata.resourceVersion;
					this.initServer();
                }
                // event from resource event stream
                else if (event.type && event.object && event.object.kind) {
                    var key = event.object.metadata.uid;
                    var value = event.object;
                    event.object['eventType']=event.type;
                    // update data set with event info
                    this.data[key]=value;
                    // dispatch this one event to websocket clients
                    this.dispatch(key, this.data[key]);
                    this.watchRequest.qs.resourceVersion = event.object.metadata.resourceVersion;
                }
            }
        });
        // on close, start a new stream
        request(req).on('close', this.watchStream.bind(this)).pipe(this.stream);
    }

	initServer() {
		if (this.wsServer == null) this.wsServer = new WsServer (8080, this);
	}

	dispatch(key, value) {
		var message = {"request":"one", "type":this.options.resource, "key":key, "value":this.data[key]};
		this.wsServer.dispatch(message);
	}


    close() {
        this.end = true;
        this.wsServer.close();
    }
}
