# cls-tls

### Usage

```js
var tls = require('tls');
var cls = require('continuation-local-storage');
var ns = cls.createNamespace('test');

var patchTls = require('cls-tls');
patchTls(ns);

ns.run(function () {
  var data = '1';
  ns.set('id', '1');
  var socket = tls.connect(8000, 'localhost', options, function () {
    socket.write(data, 'utf8', function () {
      var id = ns.get('id');
      console.log('client sent data: ' + data + ' for request: ' + id);
    });
  });
});
```

which should log

```js
'client sent data: 1 for request: 1'
```
### Tests

Run

```sh
npm test
```

The tests assume a TLS socket server is running already via

```sh
cd test
node TlsServer.js
```

More completed example please see test/client_patch.tap.js file.

The server key and cert files under /test were generated before (running above TLS server) using

```sh
$ openssl genrsa -out server-key.pem 4096
$ openssl req -new -key server-key.pem -out server-csr.pem
$ openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem
```
