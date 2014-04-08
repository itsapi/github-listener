var socket = io.connect();
socket.on('update_out', function (data) {
    console.log(data);
});