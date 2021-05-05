import {WsClient} from '../wsclient.js';
import process from 'process';
import {Watch} from '../watch.js';
import {JsMockito} from 'jsmockito';
import Jasmine from 'jasmine/lib/jasmine.js';
import {JsHamcrest} from 'jshamcrest';

JsHamcrest.Integration.JsTestDriver();

const spy = JsMockito.spy;
const when = JsMockito.when;
const then = JsMockito.then;

class Test {
    constructor() {
        this.watch = new Watch('pods', null, null, null);
		this.watch.watchStream();
        var serverUrl = 'ws://localhost:8080/';
        this.client = new WsClient(this, serverUrl);
        this.data = null;
    }

    handleConnection () {
        this.client.send({"request":"all"});
    }

    handleMessage(msg) {
        if (msg.request == 'all') {
            var nb = 0;
            for (var o in msg.data) nb++;
            if (nb == 0) {
                console.log("no pod fetched : "+msg.data);
                process.exit(1);
            }
        }
        else if (msg.request == 'one') {
            process.exit(0);
        }
        else {
            console.log("msg non expected : "+msg.request);
            process.exit(2);
        }
    }
}

class TestMocked {
	static all = {'11111':{}};
	static one = ('2222',{});
    constructor() {
        this.watch = new Watch('pods', null, null, null);
        // change watchStream method to avoid needed connection to a cluster
        this.mocked = spy(this.watch.doStream.bind(this.watch));
        this.watch.doStream = this.mocked;
        //mock the function to do nothing
        when(this.mocked).call(this.watch, this.watch.versionRequest).then(function(req) {
			this.data=TestMocked.all; 
			this.initServer(); 
			this.watchRequest.qs['resourceVersion'] = '1'; 
			this.watchStream();
		});
		when(this.mocked).call(this.watch, this.watch.watchRequest).then(function(req) {
			this.dispatch(TestMocked.one[0], TestMocked.one[1]);
		});
        //this.spied.call(this.watch);
        this.watch.watchStream();
		setTimeout(this.dispatchEvent.bind(this), 1000);
        var serverUrl = 'ws://localhost:8080/';
        this.client = new WsClient(this, serverUrl);
        this.data = null;
    }

	dispatchEvent() {
		this.watch.watchStream();	
		setTimeout(this.dispatchEvent.bind(this), 1000);
	}

    handleConnection () {
        this.client.send({"request":"all"});
    }

    handleMessage(msg) {
		assertThat(msg.request, anyOf(equalTo('all'), equalTo('one')), "request");
        if (msg.request == 'all') {
			assertThat(JSON.stringify(msg.data), equalTo(JSON.stringify(TestMocked.all)), "all"); 
		}
        else if (msg.request == 'one') {
			assertThat(msg.key, equalTo(TestMocked.one[0]), "one-key");
			assertThat(JSON.stringify(msg.value), equalTo(JSON.stringify(TestMocked.one[1])), "one-value");
            process.exit(0);
        }
    }
}

process.on('uncaughtException', function (err) {
        console.log(err);
})

new TestMocked();

