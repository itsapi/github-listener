var Build = function(elem, onChange) {
  var self = this;

  self.elem = elem;
  self.id = parseInt(elem.id);

  self.elem.addEventListener('click', function() {
    onChange(self.id);
  });

  socket.emit('refresh', self.id);
};

Build.prototype.refresh = function(data) {
  this.ui = data;
};


var BuildManager = function(elem) {
  var self = this;

  self.elem = elem;
  self.builds = {};
  self.log = document.querySelector('.log');

  var elems = self.elem.querySelectorAll('.build');

  for (var i = 0; i < elems.length; i++) {
    self.builds[elems[i].id] = new Build(elems[i], self.onChange.bind(self));
  }

  self.updateSelected(document.body.dataset.current);

  socket.on('refresh', function(data) {
    data = JSON.parse(data);

    console.log('Received a refresh');
    console.log(data);

    if (self.builds[data.id] === undefined) {
      self.addBuild(data);
    }

    if (self.selected === undefined) {
      self.updateSelected(data.id);
    }

    self.refresh(data);
  });
};

BuildManager.prototype.addBuild = function(build) {
  var self = this;

  function span(param) {
    var elem = document.createElement('span');
    elem.className = param;
    elem.innerHTML = build.data[param];
    return elem;
  }

  var elem = document.createElement('li');
  elem.classList.add('build');

  elem.id = build.id;

  elem.appendChild(span('slug'));
  elem.appendChild(span('branch'));
  elem.appendChild(span('commit'));

  self.elem.appendChild(elem);

  self.builds[build.id] = new Build(elem, self.onChange.bind(self));
};

BuildManager.prototype.refresh = function(build) {
  var self = this;

  if (self.selected === build.id) {
    self.log.innerHTML = toHtml(build.log);
  }

  self.builds[build.id].refresh(build);
};

BuildManager.prototype.onChange = function(build_id) {
  var self = this;

  self.updateSelected(build_id);

  self.refresh(self.builds[build_id].ui);
};

BuildManager.prototype.updateSelected = function (build_id) {
  var self = this;

  if (self.selected !== undefined) {
    self.builds[self.selected].elem.classList.remove('selected');
  }

  self.selected = build_id;
  self.builds[self.selected].elem.classList.add('selected');
};


var socket = io();


document.addEventListener('DOMContentLoaded', function() {
  new BuildManager(document.querySelector('.list'));

  // rebuild_btn.onclick = function () {
  //   makeRequest(window.location.href + '?rebuild', function (data) {
  //     console.log(data);
  //   });
  // };

});


function toHtml(string) {
  // Converts URLs to HTML links
  return (string || '').replace(
    /((https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?)/g,
    '<a href=\"$1\">$1</a>'
  );
}


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