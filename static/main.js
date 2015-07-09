/* global ActiveXObject: false, io: false */


document.head = document.head || document.getElementsByTagName('head')[0];


function makeRequest(url, cb) {
  var httpRequest;
  if (window.XMLHttpRequest) { // Mozilla, Safari, ...
    httpRequest = new XMLHttpRequest();
  } else if (window.ActiveXObject) { // IE
    try {
      httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
    }
    catch (e) {
      try {
        httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
      }
      catch (e) {}
    }
  }
  if (!httpRequest) {
    console.log('Giving up :( Cannot create an XMLHTTP instance');
    return false;
  }
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        cb(httpRequest.responseText);
      } else {
        console.log('There was a problem with the request.');
      }
    }
  };
  httpRequest.open('GET', url);
  httpRequest.send();
}


function changeFavicon(src) {
  var link = document.createElement('link');
  var oldLink = document.getElementById('dynamic-favicon');

  link.id = 'dynamic-favicon';
  link.rel = 'shortcut icon';
  link.href = src;

  if (oldLink) { document.head.removeChild(oldLink); }
  document.head.appendChild(link);
}


function to_html(string) {
  // Converts URLs to HTML links
  return string.replace(
    /((https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?)/g,
    '<a href=\"$1\">$1</a>'
  );
}


function refresh(data) {
  data = JSON.parse(data);

  data.header = data.timestamp;
  if (data.data.url && data.data.commit) {
    data.header += ' | Commit: ' + data.data.commit +
                   ' | URL: ' + data.data.url;
  }

  last_payload.innerHTML = JSON.stringify(data.last_payload, null, '  ');
  script_out.innerHTML = to_html(data.script_out);
  header.innerHTML = to_html(data.header);
  if (data.data.image) { header_img.src = data.data.image; }

  document.title = data.status + ' - Git';
  changeFavicon('icons/' + data.status.toLowerCase() + '.png');
}


var last_payload = document.querySelector('#left pre');
var script_out = document.querySelector('#right pre');
var header = document.querySelector('header p');
var header_img = document.querySelector('header img');
var rebuild_btn = document.querySelector('header button');
var socket = io();

socket.on('refresh', function(data) {
  console.log('Received a refresh');
  refresh(data);
});

makeRequest(window.location.href+'?refresh', refresh);

rebuild_btn.onclick = function () {
  makeRequest(window.location.href+'?rebuild', function (data) {
    console.log(data);
  });
};

setInterval(function() {
  if (!socket.connected) {
    console.log('Polling for refresh');
    makeRequest(window.location.href+'?refresh', refresh);
  }
}, 2000);
