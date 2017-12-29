'use strict';

const path = require('path');
var test = require('tap').test;

const TEST_ITERATIONS = 10;

const kConnectOptions = Symbol('connect-options');

test("cls + tls without patching, using socket creation", function (t) {
    t.plan(11 * TEST_ITERATIONS);

    var fs = require('fs');

    var tls = require('tls');
    var cls = require('continuation-local-storage');
    var ns = cls.createNamespace('test');

    var _send_verify = function (requestData) {

        ns.run(function () {
            ns.set('requestId', requestData);

            var options = {
                // defaults
                rejectUnauthorized: true,
                ciphers: tls.DEFAULT_CIPHERS,
                checkServerIdentity: tls.checkServerIdentity,
                minDHSize: 1024,
                // added by me
                ca: [fs.readFileSync(path.join(__dirname, 'server-cert.pem'))],
                requestOCSP: true,
                port: 8000,
                host: 'localhost',
                // adjusted by framework
                singleUse: true
            };

            var securityContext = tls.createSecureContext(options);

            var tlsSocket = new tls.TLSSocket(undefined, {
                pipe: !!options.path,
                secureContext: securityContext,
                isServer: false,
                requestCert: true,
                rejectUnauthorized: options.rejectUnauthorized !== false,
                session: options.session,
                NPNProtocols: options.NPNProtocols,
                ALPNProtocols: options.ALPNProtocols,
                requestOCSP: options.requestOCSP
            });

            tlsSocket[kConnectOptions] = options;

            // tlsSocket.on('secureConnect', function () {
            //     console.log('secureConnect');
            // });

            tlsSocket.on('connect', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']connect');
                t.notOk(rid, 'without patching, connect cb does not work');
            });

            tlsSocket.on('lookup', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']lookup');
                t.equal(rid, requestData, 'without patching, lookup cb still works');
            });

            // tlsSocket.on('OCSPResponse', function (ocspResponse) {
            //     console.log('OCSPResponse');
            // });

            tlsSocket.connect({
                port: options.port,
                host: options.host
            });

            // tlsSocket._releaseControl();

            if (options.session)
                tlsSocket.setSession(options.session);

            // if (options.servername)
            //     tlsSocket.setServername(options.servername);

            tlsSocket.once('secure', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']secure');
                t.notOk(rid, 'without patching, secure cb does not work');
            });

            tlsSocket.on('close', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']close');
                t.notOk(rid, 'without patching, close cb does not work');
            });

            // tlsSocket.on('drain', function () {
            //     console.log('drain');
            // });

            tlsSocket.once('end', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']end');
                t.equal(rid, requestData, 'without patching, end cb still works');
            });

            tlsSocket.on('finish', function () {
                // stream.Writable
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']finish');
                t.notOk(rid, 'without patching, finish cb does not work');
            });

            // tlsSocket.on('pipe', function () {
            //     // stream.Writable
            //     console.log('pipe');
            // });

            tlsSocket.once('readable', function () {
                // stream.Readable
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']readable');
                t.equal(rid, requestData, 'without patching, readable cb still works');
            });

            tlsSocket.on('data', function (responseData) {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']data = ' + responseData);
                t.equal(rid, responseData.toString(), 'without patching, data cb still works');

                var renegotiateOptions = {
                    rejectUnauthorized: true,
                    requestCert: true
                };

                tlsSocket.renegotiate(renegotiateOptions, function (err) {
                    var rid = ns.get('requestId');
                    // console.log('[requestData=' + requestData + ', rid=' + rid + ']renegotiate');
                    t.notOk(rid, 'without patching, renegotiate cb does not work');

                    tlsSocket.setTimeout(100);
                    tlsSocket.on('timeout', function () {
                        var rid = ns.get('requestId');
                        // console.log('[requestData=' + requestData + ', rid=' + rid + ']timeout');
                        t.notOk(rid, 'without patching, timeout cb does not work');

                        tlsSocket.end();
                    });
                });
            });

            tlsSocket.on('error', function (err) {
                var rid = ns.get('requestId');
                console.log('[requestData=' + requestData + ', rid=' + rid + ']error = ' + err);
            });

            tlsSocket.write(requestData, 'utf8', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']write');
                t.notOk(rid, 'without patching, write cb does not work');
            });
        });
    };

    // run test
    for (var i = 0; i < TEST_ITERATIONS; i++) {
        _send_verify('' + i);
    }
});

test("cls + tls with patching, using socket creation", function (t) {
    t.plan(11 * TEST_ITERATIONS);

    var fs = require('fs');

    var tls = require('tls');
    var cls = require('continuation-local-storage');
    var ns = cls.createNamespace('test');

    var { patchTls } = require('../shim');

    var _send_verify = function (requestData) {

        ns.run(function () {
            ns.set('requestId', requestData);

            var options = {
                // defaults
                rejectUnauthorized: true,
                ciphers: tls.DEFAULT_CIPHERS,
                checkServerIdentity: tls.checkServerIdentity,
                minDHSize: 1024,
                // added by me
                ca: [fs.readFileSync(path.join(__dirname, 'server-cert.pem'))],
                requestOCSP: true,
                port: 8000,
                host: 'localhost',
                // adjusted by framework
                singleUse: true
            };

            var securityContext = tls.createSecureContext(options);

            var tlsSocket = new tls.TLSSocket(undefined, {
                pipe: !!options.path,
                secureContext: securityContext,
                isServer: false,
                requestCert: true,
                rejectUnauthorized: options.rejectUnauthorized !== false,
                session: options.session,
                NPNProtocols: options.NPNProtocols,
                ALPNProtocols: options.ALPNProtocols,
                requestOCSP: options.requestOCSP
            });

            patchTls(ns, tlsSocket);

            tlsSocket[kConnectOptions] = options;

            // tlsSocket.on('secureConnect', function () {
            //     console.log('secureConnect');
            // });

            tlsSocket.on('connect', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']connect');
                t.equal(rid, requestData, 'with patching, connect cb works');
            });

            tlsSocket.on('lookup', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']lookup');
                t.equal(rid, requestData, 'with patching, lookup cb works');
            });

            // tlsSocket.on('OCSPResponse', function (ocspResponse) {
            //     console.log('OCSPResponse');
            // });

            tlsSocket.connect({
                port: options.port,
                host: options.host
            });

            // tlsSocket._releaseControl();

            if (options.session)
                tlsSocket.setSession(options.session);

            // if (options.servername)
            //     tlsSocket.setServername(options.servername);

            tlsSocket.once('secure', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']secure');
                t.equal(rid, requestData, 'with patching, secure cb works');
            });

            tlsSocket.on('close', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']close');
                t.equal(rid, requestData, 'with patching, close cb works');
            });

            // tlsSocket.on('drain', function () {
            //     console.log('drain');
            // });

            tlsSocket.once('end', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']end');
                t.equal(rid, requestData, 'with patching, end cb works');
            });

            tlsSocket.on('finish', function () {
                // stream.Writable
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']finish');
                t.equal(rid, requestData, 'with patching, finish cb works');
            });

            // tlsSocket.on('pipe', function () {
            //     // stream.Writable
            //     console.log('pipe');
            // });

            tlsSocket.once('readable', function () {
                // stream.Readable
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']readable');
                t.equal(rid, requestData, 'with patching, readable cb works');
            });

            tlsSocket.on('data', function (responseData) {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']data = ' + responseData);
                t.equal(rid, responseData.toString(), 'with patching, data cb works');

                var renegotiateOptions = {
                    rejectUnauthorized: true,
                    requestCert: true
                };

                tlsSocket.renegotiate(renegotiateOptions, function (err) {
                    var rid = ns.get('requestId');
                    // console.log('[requestData=' + requestData + ', rid=' + rid + ']renegotiate');
                    t.equal(rid, requestData, 'with patching, renegotiate cb works');

                    tlsSocket.setTimeout(100);
                    tlsSocket.on('timeout', function () {
                        var rid = ns.get('requestId');
                        // console.log('[requestData=' + requestData + ', rid=' + rid + ']timeout');
                        t.equal(rid, requestData, 'with patching, timeout cb works');

                        tlsSocket.end();
                    });
                });
            });

            tlsSocket.on('error', function (err) {
                var rid = ns.get('requestId');
                console.log('[requestData=' + requestData + ', rid=' + rid + ']error = ' + err);
            });

            tlsSocket.write(requestData, 'utf8', function () {
                var rid = ns.get('requestId');
                // console.log('[requestData=' + requestData + ', rid=' + rid + ']write');
                t.equal(rid, requestData, 'with patching, write cb works');
            });
        });
    };

    // run test
    for (var i = 0; i < TEST_ITERATIONS; i++) {
        _send_verify('' + i);
    }
});