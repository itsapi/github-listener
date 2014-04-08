var last_payload = document.getElementById('left').getElementsByTagName('pre')[0];
var script_out = document.getElementById('right').getElementsByTagName('pre')[0];
var header = document.getElementsByTagName('header')[0];

var socket = io.connect('http://git.dvbris.com');
socket.on('update_out', function (data) {
  last_payload.innerHTML = JSON.stringify(data.last_payload, null, '  ');
  script_out.innerHTML = data.script_out;
  header.innerHTML = data.header;
});
