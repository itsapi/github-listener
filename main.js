var socket = io.connect('http://node.dvbris.com', { resource: 'git' });
socket.on('update_out', function (data) {
    console.log(data);
});