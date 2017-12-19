# cls-tls


### Test

The tests assume a TLS socket server is running already via

```sh
cd test
node TlsServer.js
```

The server key and cert file are generated using

```sh
$ openssl genrsa -out server-key.pem 4096
$ openssl req -new -key server-key.pem -out server-csr.pem
$ openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem
```
