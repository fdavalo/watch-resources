import process from 'process';
import {Watch} from './watch.js';

process.on('uncaughtException', function (err) {
	console.log(err);
})

var resource = 'pods';

var watch = new Watch(resource, null, null, null);
watch.watchStream();
