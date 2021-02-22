import process from 'process';

const watch = require('watch.js');

process.on('uncaughtException', function (err) {
	console.log(err);
})

var resource = 'pods';
var tokendir = '/var/run/secrets/kubernetes.io/serviceaccount';
var cadir = '.';

if (process.argv.length > 2) resource = process.argv[2];
if (process.argv.length > 3) tokendir = process.argv[3];
if (process.argv.length > 4) cadir = process.argv[4];

new watch.Watch(resource, tokendir, cadir);
