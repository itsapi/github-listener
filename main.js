var socket = io.connect('http://node.dvbris.com');
socket.on('update_out', function (data) {
    console.log(data);
});