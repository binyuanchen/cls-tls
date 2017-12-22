'use strict';

var shimmer = require('shimmer');

function slice(args) {
    var length = args.length, array = [], i;
    for (i = 0; i < length; i++) array[i] = args[i];
    return array;
}

var _wrapCaptured = function (captured, ns) {
    return function () {
        var args = slice(arguments);
        var last = args.length - 1;
        var cb = args[last];
        if (typeof cb === 'function' && cb) {
            args[last] = ns.bind(cb);
        }
        return captured.apply(this, args);
    };
};

/**
 *
 * If a tls socket is not specified, monkeypatching the net.Socket prototype,
 * otherwise, monkeypatching the tls socket.
 *
 * @param ns The current active cls namespace context that the monkeypatched functions bind to
 * @param tlsSocket Optionally monkeypatching only a given tls socket
 */
var patch = function (ns, tlsSocket) {

    var net = require('net');

    if (net.Socket.prototype._CLS_TLS_PATCHED) {
        // if tls.TLSSocket prototype prototype is already patched, do not patch repeatedly
    }
    else {
        var tls = require('tls');

        if (tlsSocket && (tlsSocket instanceof tls.TLSSocket)) {
            shimmer.massWrap([tlsSocket], ['connect', 'write', 'on', 'setTimeout', 'destroy'],
                function (captured) {
                    return _wrapCaptured(captured, ns);
                });
        }
        else {
            var proto = net && net.Socket && net.Socket.prototype;
            shimmer.massWrap([proto], ['connect', 'write', 'on', 'setTimeout', 'destroy'],
                function (captured) {
                    return _wrapCaptured(captured, ns);
                });
            net.Socket.prototype._CLS_TLS_PATCHED = 'true';
        }
    }
};

exports = module.exports = patch;