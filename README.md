# cls-tls


When using cls [continuation-local-storage][npm-cls] with a node [tls][tls] client [socket][tls-TLSSocket], 
the cls contexts get lost in some client socket event callbacks (such as [write callback][net-socket-write-event]) 
and [tls.connect event][tls-connect-event], for example,

```js
var tls = require('tls');
var cls = require('continuation-local-storage');
var ns = cls.createNamespace('test');

ns.run(function () {
    ns.set('id', '1');
    var tlsSocket = tls.connect(8000, 'localhost', options, function () {
        tlsSocket.write('hello node!', 'utf8', function () {
            var id = ns.get('id');
            assert.ok(id); // this throws AssertionError
        });
    });
});
```

This shim cls-tls monkeypatches the node tls module and/or tls.TLSSocket socket instances. 
The goal is to make cls and tls socket client work nicely.

### Usage example
This patches the net.Socket prototype (using shim api patch(ns)) so that every new tls client socket works with cls in 
its event callbacks.

An example,

```js
var tls = require('tls');
var cls = require('continuation-local-storage');
var ns = cls.createNamespace('test');

var patchTls = require('cls-tls');
patchTls(ns);

ns.run(function () {
  ns.set('id', '1');
  var tlsSocket = tls.connect(8000, 'localhost', options, function () {
    tlsSocket.write('hello node!', 'utf8', function () {
      var id = ns.get('id');
      assert.equal(id, '1'); // pass
    });
  });
});
```

For a formal example see test/client_patch.tap.js file.

### Tests

Run
```sh
$ npm test
```

Before running the tests, you must run a TLS socket server via
```sh
$ node test/TlsServer.js
```

Note: the server key and cert files under /test were generated before (running above TLS server) using
```sh
$ openssl genrsa -out server-key.pem 4096
$ openssl req -new -key server-key.pem -out server-csr.pem
$ openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem
```

[npm-cls]: https://www.npmjs.com/package/continuation-local-storage
[tls]: https://nodejs.org/api/tls.html
[tls-TLSSocket]: https://nodejs.org/api/tls.html#tls_class_tls_tlssocket
[net-socket-write-event]: https://nodejs.org/api/net.html#net_socket_write_data_encoding_callback
[tls-connect-event]: https://nodejs.org/api/tls.html#tls_tls_connect_options_callback