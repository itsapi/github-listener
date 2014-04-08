var socket = io.connect(
    'http://node.dvbris.com/git/'
    , {resource: 'git/socket.io'}
);
socket.on('update_out', function (data) {
    console.log(data);
});