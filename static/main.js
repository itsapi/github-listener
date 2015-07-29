var Build = function(elem, build_manager) {
  var self = this;

  self.elem = elem;
  self.id = parseInt(elem.id);
  self.loaded_ui = false;

  self.elem.addEventListener('click', function() {
    build_manager.update_selected(self.id);
    if (!self.loaded_ui) {
      socket.emit('request_update', self.id);
    } else {
      build_manager.update_info(self.id);
    }
  });
};

// Initalises the element
Build.prototype.init = function(ui) {
  var self = this;

  self.update_ui(ui);

  function span(param) {
    var elem = document.createElement('span');
    elem.className = param;
    elem.innerHTML = ui.data[param] || '';
    return elem;
  }

  self.elem.id = ui.id;
  self.id = ui.id;
  self.elem.classList.add('build');

  self.elem.appendChild(span('slug'));
  self.elem.appendChild(span('branch'));
  self.elem.appendChild(span('commit'));
};

Build.prototype.update_ui = function(ui) {
  var self = this;

  self.ui = ui;

  // Update status class
  if (self.ui.status !== undefined) {
    self.elem.className = self.elem.className.split(' ').filter(function (c) {
      return c.lastIndexOf('status-', 0) !== 0;
    }).join(' ') + ' status-' + self.ui.status.toLowerCase();
  }
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
    self.builds[elems[i].id] = new Build(elems[i], self);
  }

  // Get latest updates
  socket.emit('request_all');
  socket.on('send_all', function(data) {
    data = JSON.parse(data);
    console.log('Updates:', data);

    for (var id in data) {
      if (self.builds[id] === undefined) {
        socket.emit('request_update', id);
      } else {
        self.builds[id].update_ui({status: data[id]});
      }
    }
  });

  if (document.body.dataset.current !== undefined) {
    self.update_selected(document.body.dataset.current);
  }

  self.header.elem.querySelector('.rebuild').addEventListener('click', function() {
    socket.emit('rerun', self.selected);
  });

  socket.on('send_update', function(data) {
    data = JSON.parse(data);

    if (self.builds[data.build.id] === undefined) {
      console.log('New:', data.build.id);

      self.add_build(data.build);
      self.update_selected(data.build.id);

    } else {
      console.log(data.build.status, data.build.id);
    }

    self.builds[data.build.id].update_ui(data.build);
    self.builds[data.build.id].loaded_ui = true;

    set_status_title(data.status);

    if (self.selected === data.build.id) {
      self.update_info(data.build.id);
    }
  });
};

BuildManager.prototype.add_build = function(ui) {
  var self = this;

  var elem = document.createElement('li');

  self.builds[ui.id] = new Build(elem, self);
  self.builds[ui.id].init(ui);
  self.elem.insertBefore(elem, self.elem.firstChild);

  self.update_selected(ui.id);
};

BuildManager.prototype.update_info = function(id) {
  var self = this;

  var ui = self.builds[id].ui;

  function set_inner(elem, html) {
    if (html === '') {
      elem.classList.add('empty');
    } else {
      elem.innerHTML = html;
      elem.classList.remove('empty');
    }
  }

  self.log.innerHTML = toHtml(ui.log);
  window.scrollTo(0, self.log.scrollHeight);

  set_inner(self.header.timestamp, ui.timestamp);
  set_inner(self.header.commit, toHtml(ui.data.commit));
  set_inner(self.header.url, toHtml(ui.data.url));
  if (ui.data.image) {
    self.header.elem.style.backgroundImage = 'url(' + ui.data.image + ')';
    self.header.elem.classList.add('image');
  } else {
    self.header.elem.style.backgroundImage = '';
    self.header.elem.classList.remove('image');
  }
};

BuildManager.prototype.update_selected = function (id) {
  var self = this;

  if (self.selected !== undefined) {
    self.builds[self.selected].elem.classList.remove('selected');
  }

  self.selected = parseInt(id);
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

function set_status_title(status) {
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
