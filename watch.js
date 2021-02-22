import request from 'request';
import JSONStream from 'json-stream';
import fs from 'fs';
import {WsServer} from './wsserver.js';
  
export class Watch {

    constructor(resource, tokendir, cadir) {
        this.data = {};

        var reqOptions = {
            auth: {
                bearer: fs.readFileSync(tokendir+'/token')
            },
            ca: fs.readFileSync(cadir+'/ca.pem'),
            //cert: fs.readFileSync(certdir+'/cert.pem'),
            //key: fs.readFileSync(certdir+'/key.pem')
        };

        this.options = {
            resource: resource,
            url: 'https://kubernetes.default:443',
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

        for (var key in reqOptions) this.watchRequest[key] = reqOptions[key];  
        for (var key in reqOptions) this.versionRequest[key] = reqOptions[key];

        this.wsServer = new WsServer (8080, this.messageHandle);

        this.watchStream();
    }

    messageHandle(msg, connection) {
	    if (msg.request === 'all') {
		    var message = {"request":"all", "type":this.options.resource, "data":this.data};
		    this.wsServer.send(message, connection);
	    }
    }

    versionStream() {
        doStream(this.versionRequest);
    }

    watchStream() {
	    if ('resourceVersion' in this.watchRequest.qs) this.doStream(this.watchRequest);
	    else this.versionStream();
    }

    doStream(req) {
	    console.log(req);
	    var stream = new JSONStream();
	    stream.on('data', event => {
		    if (event) {
			    if (event.kind && event.items) {
				    for (var i=0;i<event.items.length; i++) {
					    var item = event.items[i];
					    this.data[item.metadata.uid]=item;
				    }
				    this.watchRequest.qs.resourceVersion = event.metadata.resourceVersion;
			    }
			    else if (event.type && event.object && event.object.kind) {
				    var key = event.object.metadata.uid;
				    var value = event.object;
				    event.object['eventType']=event.type;
				    this.data[key]=value;
				    var message = {"request":"one", "type":this.options.resource, "key":key, "value":this.data[key]};
				    this.wsServer.dispatch(message);
				    this.watchRequest.qs.resourceVersion = event.object.metadata.resourceVersion;
			    }
		    }
	    });
	    request(req).on('close', this.watchStream).pipe(stream);
    }

}
