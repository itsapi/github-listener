var Build = function(e) {
  this.elem = e;
  this.id = e.id;
};

Build.prototype.refresh = function(data) {
  this.ui = data;
};


document.addEventListener('DOMContentLoaded', function() {
  var builds = {};
  var elems = document.querySelectorAll('.list li');

  for (var i = 0; i < elems.length; i++) {
    builds[elems[i].id] = new Build(elems[i]);
  }

  console.log(builds);

  var socket = io();

  socket.on('refresh', function(data) {
    var build = JSON.parse(data);

    console.log('Received a refresh');
    console.log(build);

    function span(param) {
      var elem = document.createElement('span');
      elem.className = param;
      elem.innerHTML = build.data[param];
      return elem;
    }

    if (!builds[build.id]) {

      var elem = document.createElement('li');

      elem.id = build.id;

      elem.appendChild(span('slug'));
      elem.appendChild(span('commit'));
      elem.appendChild(span('branch'));

      document.querySelector('.list').appendChild(elem);

      builds[build.id] = new Build(elem);
    }

    builds[build.id].refresh(build);
  });

  // rebuild_btn.onclick = function () {
  //   makeRequest(window.location.href + '?rebuild', function (data) {
  //     console.log(data);
  //   });
  // };

});


/*
function makeRequest(url, cb) {
  var httpRequest;
  if (window.XMLHttpRequest) { // Mozilla, Safari, ...
    httpRequest = new XMLHttpRequest();
  } else if (window.ActiveXObject) { // IE
    try {
      httpRequest = new ActiveXObject('Msxml2.XMLHTTP');
    }
    catch (e) {
      try {
        httpRequest = new ActiveXObject('Microsoft.XMLHTTP');
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


function toHtml(string) {
  // Converts URLs to HTML links
  return (string || '').replace(
    /((https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?)/g,
    '<a href=\"$1\">$1</a>'
  );
}


function refresh(data) {
  data = JSON.parse(data);

  data.header = data.timestamp;
  if (data.data && data.data.url && data.data.commit) {
    data.header += ' | Commit: ' + data.data.commit +
                   ' | URL: ' + data.data.url;
  }

  payload.innerHTML = data.payload;
  log.innerHTML = toHtml(data.log);
  header.innerHTML = toHtml(data.header);
  if (data.data && data.data.image) { header_img.src = data.data.image; }

  document.title = data.status + ' - Git';
  changeFavicon('icons/' + data.status.toLowerCase() + '.png');
}
*/