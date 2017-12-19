'use strict';

var shimmer = require('shimmer');

function slice(args) {
    var length = args.length, array = [], i;
    for (i = 0; i < length; i++) array[i] = args[i];
    return array;
}

exports = module.exports = function patchTls(ns) {
    var tls = require('tls');
    var proto = tls && tls.TLSSocket && tls.TLSSocket.prototype;
    shimmer.massWrap([proto], ['connect', 'write', 'on', 'destroy'], function (captured) {
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