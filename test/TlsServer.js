/**
 * A sample TLS socket server that echo-es data sent from client back to client.
 * For testing purpose.
 */

const tls = require('tls');
const fs = require('fs');

const options = {
    key: fs.readFileSync('server-key.pem'),
    cert: fs.readFileSync('server-cert.pem'),

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
