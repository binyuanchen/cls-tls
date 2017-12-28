'use strict';

const shimmer = require('shimmer');

function slice(args) {
    var length = args.length, array = [], i;
    for (i = 0; i < length; i++) array[i] = args[i];
    return array;
}

/**
 * An internal helper function to patch a callback-at-last function.
 * @param captured
 * @param ns
 * @returns {Function}
 * @private
 */
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
 * Calling this patches the tls module connect method first. It also defines patcher
 * function that patches the tls.TLSSocket instance generated at runtime as part of
 * the call to the tls.connect method.
 * @param ns
 */
var patchTls = function (ns) {

    var tls = require('tls');

    if (tls && tls.connect) {
        shimmer.wrap(tls, 'connect', function (tls_connect) {
            return function () {
                var args = slice(arguments);
                var last = args.length - 1;
                var cb = args[last];
                if (typeof cb === 'function' && cb) {
                    args[last] = ns.bind(cb);
                }
                var tlsSocket = tls_connect.apply(this, args);
                if (tlsSocket && tlsSocket instanceof tls.TLSSocket) {
                    ns.bindEmitter(tlsSocket);
                    shimmer.wrap(tlsSocket, '_writeGeneric', function (tlsSocket_writeGeneric) {
                        return _wrapCaptured(tlsSocket_writeGeneric, ns);
                    });
                }
                return tlsSocket;
            };
        });
    }
};

exports = module.exports = patchTls;