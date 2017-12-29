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
 * the call to the tls.connect method. (In another word, if you create socket using
 * new tls.TLSSocket, those sockets are not patched)
 * @param ns
 */

/**
 * Patching tls module or individual tls socket so they work with cls.
 *
 * Parameter 'tlsSocket' is optional. Specify it or not depends on your use cases.
 *
 * When tlsSocket is not specified, calling this method register a patcher function that does these:
 * 1) the tls.connect is patched so it works with the cls namespace,
 * 2) the tls.TLSSocket instance created as a result of the tls.connect call is also patched so it
 * works with the cls namespace.
 *
 * When tlsSocket is specified, calling this method register a patcher function that patches the
 * given tlsSocket so  it works with the cls namespace.
 *
 * @param ns The cls namespace
 * @param tlsSocket Optional. When specified, it must be a tls.TLSSocket instance
 */
var patchTls = function (ns, tlsSocket) {

    var tls = require('tls');
    if (tlsSocket && tlsSocket instanceof tls.TLSSocket) {
        // patching only a single socket
        ns.bindEmitter(tlsSocket);
        shimmer.massWrap([tlsSocket], ['connect', '_writeGeneric'], function (tlsSocket_writeGeneric) {
            return _wrapCaptured(tlsSocket_writeGeneric, ns);
        });
    }
    else if (tls.connect) {
        // patching the tls module connect
        shimmer.wrap(tls, 'connect', function (tls_connect) {
            return function () {
                var args = slice(arguments);
                var last = args.length - 1;
                var cb = args[last];
                if (typeof cb === 'function' && cb) {
                    args[last] = ns.bind(cb);
                }
                var tlsSocket = tls_connect.apply(this, args);

                // patches every tls.TLSSocket instances created as result of tls.connect
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

exports = module.exports = {
    patchTls: patchTls
};