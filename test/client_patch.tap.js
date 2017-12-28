'use strict';

const path = require('path');
var test = require('tap').test;

test("cls + tls without any patching", function (t) {
    t.plan(50);

    var fs = require('fs');

    var tls = require('tls');
    var cls = require('continuation-local-storage');
    var ns = cls.createNamespace('test');

    var options = {
        ca: [fs.readFileSync(path.join(__dirname, 'server-cert.pem'))]
    };

    var _send_verify = function (requestData) {

        ns.run(function () {
            ns.set('requestId', requestData);

            tls.connect(8000, 'localhost', options, function () {
                // without patch, this does not work
                var rid0 = ns.get('requestId');
                t.notOk(rid0, 'without patch, connect cb does not work');
                // console.log('client connected for request: ' + rid0);

                this.setEncoding('utf8');

                this.on('end', function () {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with or without patch, on cb works');
                    // console.log('client socket ended [' + rid + ']');
                });

                this.on('data', function (responseData) {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with or without patch, on cb works');
                    t.equal(rid, responseData, 'id in context and received data must equal');
                    // console.log('client got data: ' + responseData + ' for request: ' + rid);
                    this.end();
                });

                this.write(requestData, 'utf8', function () {
                    // without patch, this does not work
                    var rid = ns.get('requestId');
                    t.notOk(rid, 'without patch, write cb does not work');
                    // console.log('client sent data: ' + requestData + ' for request: ' + rid);
                });
            });
        });
    };

    // run test
    for (var i = 0; i < 10; i++) {
        _send_verify('' + i);
    }
});

test("cls + tls with patching", function (t) {
    t.plan(60);

    var fs = require('fs');

    var tls = require('tls');
    var cls = require('continuation-local-storage');
    var ns = cls.createNamespace('test');

    var patchTls = require('../shim');
    /**
     * this patches the net.Socket prototype, this means all client sockets created from tls are patched.
     */
    patchTls(ns);

    var options = {
        ca: [fs.readFileSync('server-cert.pem')]
    };

    var _send_verify = function (requestData) {

        ns.run(function () {
            ns.set('requestId', requestData);

            var tlsSocket = tls.connect(8000, 'localhost', options, function () {
                // after patch, this works
                var rid0 = ns.get('requestId');
                t.ok(rid0, 'after patch, connect cb works');
                // console.log('client connected for request: ' + rid0);

                tlsSocket.setEncoding('utf8');

                tlsSocket.on('end', function () {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with or without patch, on cb works');
                    // console.log('client socket ended [' + rid + ']');
                });

                tlsSocket.on('data', function (responseData) {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with or without patch, on cb works');
                    t.equal(rid, responseData, 'id in context and received data must equal');
                    // console.log('client got data: ' + responseData + ' for request: ' + rid);
                    tlsSocket.end();
                });

                tlsSocket.write(requestData, 'utf8', function () {
                    // after patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'after patch, write cb works');
                    t.equal(rid, requestData, 'id in context and requested data must equal');
                    // console.log('client sent data: ' + requestData + ' for request: ' + rid);
                });
            });
        });
    };

    // run test
    for (var i = 0; i < 10; i++) {
        _send_verify('' + i);
    }
});