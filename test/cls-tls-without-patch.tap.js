'use strict';

var test = require('tap').test;

test("cls + tls without cls-tls patch", function (t) {
    t.plan(40);

    var fs = require('fs');

    var tls = require('tls');
    var cls = require('continuation-local-storage');
    var ns = cls.createNamespace('test');

    /**
     * No patching of tls using this shim
     */

    var options = {
        ca: [fs.readFileSync('server-cert.pem')]
    };

    var _send = function () {

        ns.run(function () {
            ns.set('requestId', requestData);

            var tlsSocket = tls.connect(8000, 'localhost', options, function () {
                // without patch, this does not work
                var rid0 = ns.get('requestId');
                t.notOk(rid0, 'without patch, connect cb does not work');
                console.log('client connected for request: ' + rid0);

                tlsSocket.setEncoding('utf8');

                tlsSocket.on('end', function () {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with or without patch, on cb works');
                    console.log('client socket ended [' + rid + ']');
                });

                tlsSocket.on('data', function (responseData) {
                    // with or without patch, this works
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with or without patch, on cb works');
                    console.log('client got data: ' + responseData + ' for request: ' + rid);
                    tlsSocket.end();
                });

                tlsSocket.write(requestData, 'utf8', function () {
                    // without patch, this does not work
                    var rid = ns.get('requestId');
                    t.notOk(rid, 'without patch, write cb does not work');
                    console.log('client sent data: ' + requestData + ' for request: ' + rid);
                });
            });
        });
    };

    // run test
    for (var i = 0; i < 10; i++) {
        _send('' + i);
    }
});