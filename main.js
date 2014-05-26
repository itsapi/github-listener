function makeRequest(url, cb) {
  var httpRequest
  if (window.XMLHttpRequest) { // Mozilla, Safari, ...
    httpRequest = new XMLHttpRequest()
  } else if (window.ActiveXObject) { // IE
    try {
      httpRequest = new ActiveXObject("Msxml2.XMLHTTP")
    }
    catch (e) {
      try {
        httpRequest = new ActiveXObject("Microsoft.XMLHTTP")
      }
      catch (e) {}
    }
  }
  if (!httpRequest) {
    console.log('Giving up :( Cannot create an XMLHTTP instance')
    return false
  }
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        cb(httpRequest.responseText)
      } else {
        console.log('There was a problem with the request.')
      }
    }
  }
  httpRequest.open('GET', url)
  httpRequest.send()
}

var last_payload = document.getElementById('left').getElementsByTagName('pre')[0];
var script_out = document.getElementById('right').getElementsByTagName('pre')[0];
var header = document.getElementsByTagName('header')[0];

setInterval(function () {
  makeRequest('http://git.dvbris.com?refresh', function (data) {
    data = JSON.parse(data);

    last_payload.innerHTML = JSON.stringify(data.last_payload, null, '  ');
    script_out.innerHTML = data.script_out;
    header.innerHTML = data.header;
  });
}, 2000);
