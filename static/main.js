var Build = function(elem, onChange) {
  var self = this;

  self.elem = elem;
  self.id = parseInt(elem.id);

  self.elem.addEventListener('click', function() {
    onChange(self.id);
  });
};

Build.prototype.refresh = function(data) {
  var self = this;

  self.ui = data;
  setStatusClass(self.elem, self.ui.status);
};


var BuildManager = function(elem) {
  var self = this;

  self.elem = elem;
  self.builds = {};
  self.log = document.querySelector('.log');

  self.header = {
    elem: document.querySelector('.header'),
    timestamp: document.querySelector('.header .timestamp'),
    commit: document.querySelector('.header .commit'),
    url: document.querySelector('.header .url')
  };

  var elems = self.elem.querySelectorAll('.build');

  for (var i = 0; i < elems.length; i++) {
    self.builds[elems[i].id] = new Build(elems[i], self.onChange.bind(self));
    socket.emit('refresh', elems[i].id);
  }

  if (document.body.dataset.current !== undefined) {
    self.updateSelected(document.body.dataset.current);
  }

  self.header.elem.querySelector('.rebuild').addEventListener('click', function() {
    console.log('click');
    socket.emit('rerun', self.selected);
  });

  socket.on('refresh', function(data) {
    data = JSON.parse(data);

    console.log('Received a refresh');
    console.log(data);

    if (self.builds[data.build.id] === undefined) {
      self.addBuild(data.build);
    }

    setStatusTitle(data.status);
    self.refresh(data.build);
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
  setStatusClass(elem, build.status);

  elem.id = build.id;

  elem.appendChild(span('slug'));
  elem.appendChild(span('branch'));
  elem.appendChild(span('commit'));

  self.elem.insertBefore(elem, self.elem.firstChild);

  self.builds[build.id] = new Build(elem, self.onChange.bind(self));
  self.updateSelected(build.id);
};

BuildManager.prototype.refresh = function(build) {
  var self = this;

  if (self.selected === build.id) {
    self.log.innerHTML = toHtml(build.log);

    self.header.timestamp.innerHTML = build.timestamp;
    self.header.commit.innerHTML = build.data.commit;
    self.header.url.innerHTML = toHtml(build.data.url);
    if (build.data.image) {
      self.header.elem.style.backgroundImage = 'url('+build.data.image+')';
    } else {
      self.header.elem.style.backgroundImage = '';
    }
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

  self.selected = parseInt(build_id);
  self.builds[self.selected].elem.classList.add('selected');
};


var socket = io();


document.addEventListener('DOMContentLoaded', function() {
  new BuildManager(document.querySelector('.list'));
});


function toHtml(string) {
  // Converts URLs to HTML links
  return (string || '').replace(
    /((https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?)/g,
    '<a href=\"$1\">$1</a>'
  );
}

function setStatusClass(elem, status) {
  // Remove old status class
  if (status !== undefined) {
    elem.className = elem.className.split(' ').filter(function (c) {
      return c.lastIndexOf('status-', 0) !== 0;
    }).join(' ') + ' status-' + status.toLowerCase();
  }
}

function setStatusTitle(status) {
  document.title = status + ' - Git';

  var src = 'icons/' + status.toLowerCase() + '.png';
  var link = document.createElement('link');
  var oldLink = document.getElementById('dynamic-favicon');

  link.id = 'dynamic-favicon';
  link.rel = 'shortcut icon';
  link.href = src;

  if (oldLink) { document.head.removeChild(oldLink); }
  document.head.appendChild(link);
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
*/
