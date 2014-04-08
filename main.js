
var socket = io.connect('http://node.dvbris.com/git');
socket.on('update_out', function (data) {
    console.log(data);
});