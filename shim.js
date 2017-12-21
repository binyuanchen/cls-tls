'use strict';

var shimmer = require('shimmer');

function slice(args) {
    var length = args.length, array = [], i;
    for (i = 0; i < length; i++) array[i] = args[i];
    return array;
}

exports = module.exports = function patchTls(ns) {
    var net = require('net');
    var proto = net && net.Socket && net.Socket.prototype;
    /**
     * wrapping 'connect' is actually not necessary due to its current way of implementation,
     * however, for future proof, it is wrapped anyway here.
     *
     * This shim is for tls/socket client only.
     */
    shimmer.massWrap([proto], ['connect', 'write', 'on', 'setTimeout', 'destroy'], function (captured) {
        return function wrapped() {
            var args = slice(arguments);
            var last = args.length - 1;
            var cb = args[last];
            if (typeof cb === 'function' && cb) {
                args[last] = ns.bind(cb);
            }
            return captured.apply(this, args);
        };
    });
};