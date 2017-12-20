'use strict';

var test = require('tap').test;

/**
 * Use case 1 - in this use case, there is a single global tls socket
 * created, client code reuses this socket to send multiple requests,
 * each is supposed to have a request-specific id.
 *
 * The client code tries to define cls namespace and create cls context
 * as usual.
 */
test("use case 1 - cls + tls with cls-tls patch", function (t) {
    t.plan(20);

    var tls = require('tls');

    var cls = require('continuation-local-storage');
    var ns = cls.createNamespace('test');

    var patchTls = require('../shim');
    patchTls(ns);

    var fs = require('fs');

    var options = {
        ca: [fs.readFileSync('server-cert.pem')]
    };

    function test() {
        // this counter is decremented to decide when the tls socket is closed
        // here 10 means 'exactly 10 responses should be received'
        var responseReceived = 10;

        // in this test, the request data sent through the tls socket and the
        // request id created for each request are the same, and the value is
        // i = 0, 1, ..., 10

        var tlsSocket = tls.connect(8000, 'localhost', options, function () {
            console.log('client connected',
                tlsSocket.authorized ? 'authorized' : 'unauthorized');
            tlsSocket.setEncoding('utf8');
            tlsSocket.on('end', function () {
                console.log('client socket ended')
            });

            /**
             * Define the behavior when client receives responses.
             *
             * Note the normal callback is replaced with one bound to the
             * current active cls context, whenever this callback is called.
             */
            tlsSocket.on('data', ns.bind(function (data) {
                    var rid = ns.get('requestId');
                    t.ok(rid, 'with patch, cls context is carried on data cb');
                    console.log('client got response[' + rid + '] with data: ' + data);

                    // close the tls socket after receiving all responses
                    responseReceived--;
                    if (responseReceived <= 0) {
                        tlsSocket.end();
                    }
                })
            );

            // sending multiple requests
            for (var i = 0; i < 10; i++) {
                let requestData = '' + i;

                // each request is sent with a new cls context created and request
                // id populated
                ns.run(function () {
                    var requestId = '' + i;
                    ns.set('requestId', requestId);
                    tlsSocket.write(requestData, 'utf8', function () {
                        var rid = ns.get('requestId');
                        t.ok(rid, 'with patch, cls context is carried on write cb');
                        console.log('client sent request[' + rid + '] with data: ' + requestData);
                    });
                });
            }
        });
    };

    // starts the test in next tick
    process.nextTick(test);
});


/**
 * Use case 1 - in this use case, a single client code call causes a new tls socket
 * being created, all requests sent through this socket are sharing the same request
 * id.
 */