'use strict';

const path = require('path');
var test = require('tap').test;

test("cls + tls without patching", function (t) {
    t.plan(60);

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

            var tlsSocket = tls.connect(8000, 'localhost', options, function () {
                // without patch, this does not work
                var rid0 = ns.get('requestId');
                t.notOk(rid0, 'without patching, connect cb does not work');
                // console.log('client connected for request: ' + rid0);

                tlsSocket.setEncoding('utf8');

                tlsSocket.on('end', function () {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'without patching, on-end cb works still works');
                    // console.log('client socket ended [' + rid + ']');
                });

                tlsSocket.on('data', function (responseData) {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'without patching, on-data cb still works');
                    t.equal(rid, responseData, 'without patching, cls context and received data should match');
                    // console.log('client got data: ' + responseData + ' for request: ' + rid);

                    // testing the renegotiate api before closing the socket
                    var renegotiateOptions = {
                        rejectUnauthorized: true,
                        requestCert: true
                    };
                    // testing the renegotiate api before closing the socket
                    tlsSocket.renegotiate(renegotiateOptions, function (err) {
                        var rid2 = ns.get('requestId');
                        t.notOk(rid2, 'without patching, renegotiate cb does not work');
                        // console.log('client renegotiate completed, rid2: ' + rid2 + ', err: ' + err);

                        tlsSocket.end();
                    });

                });

                tlsSocket.write(requestData, 'utf8', function () {
                    // without patch, this does not work
                    var rid = ns.get('requestId');
                    t.notOk(rid, 'without patching, write cb does not work');
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
    t.plan(70);

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
                t.ok(rid0, 'with patching, connect cb works');
                // console.log('client connected for request: ' + rid0);

                tlsSocket.setEncoding('utf8');

                tlsSocket.on('end', function () {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with patching, on-end cb works');
                    // console.log('client socket ended [' + rid + ']');
                });

                tlsSocket.on('data', function (responseData) {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with patching, on-data cb works');
                    t.equal(rid, responseData, 'with patching, cls context and received data should match');
                    // console.log('client got data: ' + responseData + ' for request: ' + rid);

                    var renegotiateOptions = {
                        rejectUnauthorized: true,
                        requestCert: true
                    };

                    // testing the renegotiate api before closing the socket
                    tlsSocket.renegotiate(renegotiateOptions, function (err) {
                        var rid2 = ns.get('requestId');
                        t.ok(rid2, 'with patching, renegotiate cb works');
                        // console.log('client renegotiate completed, rid: ' + rid);
                        tlsSocket.end();
                    });
                });

                tlsSocket.write(requestData, 'utf8', function () {
                    // after patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with patching, write cb works');
                    t.equal(rid, requestData, 'with patching, cls context and requested data should match');
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