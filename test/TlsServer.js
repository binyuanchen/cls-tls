/**
 * A sample TLS socket server that echo-es data sent from client back to client.
 * For testing purpose.
 */

const tls = require('tls');
const fs = require('fs');
const path = require('path');

// discourage tls to report DOS attacks because the client (tap tests) will send aggressively
tls.CLIENT_RENEG_LIMIT = 1000;
tls.CLIENT_RENEG_WINDOW = 60;

const options = {
    key: fs.readFileSync(path.join(__dirname, 'server-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'server-cert.pem')),

    rejectUnauthorized: true,
};

const server = tls.createServer(options, (socket) => {
    socket.setEncoding('utf8');
    socket.on('data', function (data) {
        console.log('received : ' + data);
        socket.write(data, 'utf8', function () {
            console.log('done echo back to client.');
        });
    });
    console.log('connected', socket.authorized ? 'authorized' : 'unauthorized');
});
server.listen(8000, () => {
    console.log('server listening on port 8000.');
});
