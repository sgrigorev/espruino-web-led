const storage = require('Storage');

// Neopixel settings
const neopixel = require('neopixel');
const LED_STRIP_PIN = 12;
const PIXELS_COUNT = 30;

// dht22 settings 
const dht = require('DHT22');
const DHT_PIN = 13;

// Wi-Fi settings
let wifi = require('Wifi');
const WIFI_SETTINGS_FILE = 'wifi_settings.json';
let wifiSettings;

// The last data that was POSTed to us
let postData = {
  ledEnabled: false
};

// This function is run on microcontroller start
function onInit() {
  try {
    wifiSettings = storage.readJSON(WIFI_SETTINGS_FILE);
  } catch (err) {
    console.log(err.message);
  }

  console.log(`WiFi settings: ${JSON.stringify(wifiSettings)}`);
  if (wifiSettings !== undefined && !wifiSettings.startApMode) {
    connectToWifi(wifiSettings.ssid, wifiSettings.password);
  } else {
    startWifiAP();
  }
}

// Comment this line out if you chosed to save code in flash
// onInit();

// This is called when we have an internet connection
function onWiFiConnected() {
  wifi.getIP(function (err, ip) {
    console.log('Connect to http://' + ip.ip);
    if (wifiSettings) {
      wifiSettings.lastIp = ip.ip;
    }
    storage.writeJSON(WIFI_SETTINGS_FILE, wifiSettings);
    require('http').createServer(onPageRequest).listen(80);
  });
}

function connectToWifi(ssid, password) {
  wifi.connect(ssid, { password: password }, function (err) {
    if (err) {
      console.log('Connection error: ' + err);
      startWifiAP();
      return;
    }
    console.log('Connected!');
    onWiFiConnected();
  });
}

function startWifiAP() {
  wifi.startAP('Espruino_Server', {}, onWiFiConnected);
}

function readTemperatureSensor() {
  return new Promise((resolve) => {
    dht.connect(DHT_PIN).read(resolve);
  });
}

// css styles to use on html
const cssStyle = `
<style>
  body { font-size: 50px; }
  input, select {
    height: 50px;
    font-size: 30px;
    width: 300px;
  }
  button {
    height: 50px;
    width: 100px;
  }
</style>
`;

// This serves up the webpage itself
function sendIndexPage(res) {
  readTemperatureSensor()
    .then((data) => {
      const html = `
    <html>
    ${cssStyle}
     <body>
      <label>Temperature: ${data.err ? 'Failed to read sensor' : data.temp + '°C'}</label>
      </p></p>
      <label>Humidity: ${data.err ? 'Failed to read sensor' : data.rh + '%'}</label>
      </p></p>
      <label><b>LED Settings:</b></label>
      </p></p>
      <form action='#' method='post'>
        <label for='frequency'>Frequency (ms):</label>
        <input type='number' id='frequency' name='frequency' value='${postData.frequency || 200}'/>
        </p></p>
        <label for='ledMode'>Led mode:</label>
        <select name='ledMode' id='ledMode'>
          <option value='blink' ${postData.ledMode === 'blink' ? 'selected' : ''}>Blink</option>
          <option value='blinkHalf' ${postData.ledMode === 'blinkHalf' ? 'selected' : ''}>Blink half</option>
          <option value='runningDots' ${postData.ledMode === 'runningDots' ? 'selected' : ''}>Running dots</option>
          <option value='rainbow' ${postData.ledMode === 'rainbow' ? 'selected' : ''}>Rainbow</option>
        </select>
        </p></p>
        <label for='color'>Color:</label>
        <select name='color' id='color'>
          <option value='white' ${postData.color === 'white' ? 'selected' : ''}>White</option>
          <option value='red' ${postData.color === 'red' ? 'selected' : ''}>Red</option>
          <option value='yellow' ${postData.color === 'yellow' ? 'selected' : ''}>Yellow</option>
          <option value='blue' ${postData.color === 'blue' ? 'selected' : ''}>Blue</option>
          <option value='green' ${postData.color === 'green' ? 'selected' : ''}>Green</option>
          <option value='random' ${postData.color === 'random' ? 'selected' : ''}>Random</option>
        </select>
        </p></p>
        <label for='ledEnabled'>Enable Led:</label>
        <input type='checkbox' id='ledEnabled' name='ledEnabled' value='1' ${postData.ledEnabled ? 'checked' : ''}>
        </p></p>
        <button>Submit</button>
      </form>
     </body>
    </html>`;
      res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': html.length });
      res.end(html);
    });
}

function sendWiFiPage(res) {
  const html = `
  <html>
  ${cssStyle}
    <body>
    <form action='#' method='post' onsubmit='alert("Reboot the microcontroller to apply settings");'>
      <label>Last IP: ${wifiSettings && wifiSettings.lastIp || ''}</label>
      </p></p>
      <label for='ssid'>SSID:</label>
      <input type='text' id='ssid' name='ssid' value='${wifiSettings && wifiSettings.ssid || ''}'/>
      </p></p>
      <label for='password'>Password:</label>
      <input type='password' id='password' name='password' value='${wifiSettings && wifiSettings.password || ''}'/>
      </p></p>
      <label for='startApMode'>Start access point mode:</label>
      <input type='checkbox' id='startApMode' name='startApMode' value='0' ${wifiSettings && wifiSettings.startApMode ? 'checked' : ''}>
      </p></p>
      <button>Submit</button>
    </form>
    </body>
  </html>
  `
  res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': html.length });
  res.end(html);
}

function redirectToIndex(res) {
  res.writeHead(302, {
    'Location': '/'
  });
  res.end();
}

// This handles the HTTP request itself and serves up the webpage or a
// 404 not found page
function onPageRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname == '/wifi') {
    if (req.method == 'POST' && req.headers['Content-Type'] == 'application/x-www-form-urlencoded') {
      handleWiFiSettings(req, function () { redirectToIndex(res); });
    } else {
      sendWiFiPage(res);
    }
  } else if (parsedUrl.pathname == '/') {
    // handle the '/' (root) page...
    // If we had a POST, handle the data we're being given
    if (req.method == 'POST' &&
      req.headers['Content-Type'] == 'application/x-www-form-urlencoded') {
      handleLedSettings(req, function () { redirectToIndex(res); });
    } else {
      sendIndexPage(res);
    }
  } else {
    // Page not found - return 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404: Page ' + parsedUrl.pathname + ' not found');
  }
}

// This handles any received data from the POST request
function handleLedSettings(req, callback) {
  var data = '';
  req.on('data', function (d) { data += d; });
  req.on('end', function () {
    // All data received from the client, so handle the url encoded data we got
    // If we used 'close' then the HTTP request would have been closed and we
    // would be unable to send the result page.
    postData = {};
    data.split('&').forEach(function (el) {
      const els = el.split('=');
      postData[els[0]] = decodeURIComponent(els[1]);
    });
    // finally our data is in postData
    console.log(postData);
    if (!postData.ledEnabled) {
      disableLed();
    } else {
      setupLed(postData);
    }
    // call our callback (to send the HTML result)
    callback();
  });
}

function handleWiFiSettings(req, callback) {
  var data = '';
  req.on('data', function (d) { data += d; });
  req.on('end', function () {
    wifiSettings = {};
    data.split('&').forEach(function (el) {
      const els = el.split('=');
      wifiSettings[els[0]] = decodeURIComponent(els[1]);
    });
    storage.writeJSON(WIFI_SETTINGS_FILE, wifiSettings);
    callback();
  });
}

// Inits when turning on led blink modes
let intervalId;

function setupLed(postData) {
  disableLed();

  if (postData.ledMode === 'blink') {
    blinkMode(postData.color, postData.frequency);
    return;
  }
  if (postData.ledMode === 'blinkHalf') {
    blinkHalfMode(postData.color, postData.frequency);
    return;
  }
  if (postData.ledMode === 'runningDots') {
    runningDotsMode(postData.color, postData.frequency);
    return;
  }
  if (postData.ledMode === 'rainbow') {
    rainbowMode(postData.frequency);
    return;
  }
}

function getColorInGrb(colorName) {
  // colors in rgb but led accepts grb
  const colors = {
    white: [255, 255, 255],
    red: [255, 0, 0],
    yellow: [255, 255, 0],
    blue: [0, 0, 255],
    green: [0, 255, 0]
  };

  if (colorName !== 'random') {
    return [colors[colorName][1], colors[colorName][0], colors[colorName][2]];
  }

  return [Math.random() * 255, Math.random() * 255, Math.random() * 255];
}

function disableLed() {
  if (intervalId !== undefined) {
    clearInterval(intervalId);
    intervalId = undefined;
  }

  const arr = [];
  for (let i = 0; i < PIXELS_COUNT * 3; i++) {
    arr[i] = 0;
  }
  neopixel.write(LED_STRIP_PIN, arr);
}

function blinkMode(color, frequency) {
  let isOn = true;
  intervalId = setInterval(function () {
    const col = getColorInGrb(color);
    const arr = new Uint8ClampedArray(PIXELS_COUNT * 3);
    for (let i = 0; i < arr.length; i += 3) {
      if (isOn) {
        arr[i] = col[0];
        arr[i + 1] = col[1];
        arr[i + 2] = col[2];
      } else {
        arr[i] = 0;
        arr[i + 1] = 0;
        arr[i + 2] = 0;
      }
    }
    neopixel.write(LED_STRIP_PIN, arr);
    isOn = !isOn;
  }, frequency);
}

function blinkHalfMode(color, frequency) {
  let isOn = true;
  intervalId = setInterval(function () {
    const col = getColorInGrb(color);
    const arr = new Uint8ClampedArray(PIXELS_COUNT * 3);
    for (let i = 0; i < arr.length; i += 3) {
      if ((isOn && i % 2 === 0) || (!isOn && i % 2 !== 0)) {
        arr[i] = col[0];
        arr[i + 1] = col[1];
        arr[i + 2] = col[2];
      }
      if ((!isOn && i % 2 === 0) || (isOn && i % 2 !== 0)) {
        arr[i] = 0;
        arr[i + 1] = 0;
        arr[i + 2] = 0;
      }
    }
    neopixel.write(LED_STRIP_PIN, arr);
    isOn = !isOn;
  }, frequency);
}

function runningDotsMode(color, frequency) {
  let pixel = 0;
  intervalId = setInterval(function () {
    const col = getColorInGrb(color);
    const arr = new Uint8ClampedArray(PIXELS_COUNT * 3);

    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = 0;
      arr[i + 1] = 0;
      arr[i + 2] = 0;
    }

    // TODO: think how to simplify
    if (pixel === 0) {
      arr[pixel * 3] = col[0];
      arr[pixel * 3 + 1] = col[1];
      arr[pixel * 3 + 2] = col[2];
      arr[29 * 3] = col[0];
      arr[29 * 3 + 1] = col[1];
      arr[29 * 3 + 2] = col[2];
      arr[28 * 3] = col[0];
      arr[28 * 3 + 1] = col[1];
      arr[28 * 3 + 2] = col[2];
    } else if (pixel === 1) {
      arr[pixel * 3] = col[0];
      arr[pixel * 3 + 1] = col[1];
      arr[pixel * 3 + 2] = col[2];
      arr[0] = col[0];
      arr[1] = col[1];
      arr[2] = col[2];
      arr[29 * 3] = col[0];
      arr[29 * 3 + 1] = col[1];
      arr[29 * 3 + 2] = col[2];
    } else {
      arr[pixel * 3] = col[0];
      arr[pixel * 3 + 1] = col[1];
      arr[pixel * 3 + 2] = col[2];
      arr[(pixel - 1) * 3] = col[0];
      arr[(pixel - 1) * 3 + 1] = col[1];
      arr[(pixel - 1) * 3 + 2] = col[2];
      arr[(pixel - 2) * 3] = col[0];
      arr[(pixel - 2) * 3 + 1] = col[1];
      arr[(pixel - 2) * 3 + 2] = col[2];
    }

    pixel = (pixel + 1) % PIXELS_COUNT;

    neopixel.write(LED_STRIP_PIN, arr);
  }, frequency);
}

function rainbowMode(frequency) {
  const arr = new Uint8ClampedArray(PIXELS_COUNT * 3);
  let pos = 0;
  function getPattern() {
    pos++;
    for (let i = 0; i < arr.length;) {
      arr[i++] = (1 + Math.sin((i + pos) * 0.1324)) * 127;
      arr[i++] = (1 + Math.sin((i + pos) * 0.1654)) * 127;
      arr[i++] = (1 + Math.sin((i + pos) * 0.1)) * 127;
    }
    return arr;
  }
  intervalId = setInterval(function () {
    neopixel.write(LED_STRIP_PIN, getPattern());
  }, frequency);
}
