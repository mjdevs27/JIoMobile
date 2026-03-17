// app.js – KaiOS Fraud Protection App (with Groq AI backend)

(function () {
  'use strict';

  var currentScreen = 'home';
  var selectedIndex = 0;
  var menuItems = document.querySelectorAll('.menu-item');
  var totalItems = menuItems.length;

  // ---- Navigation ----
  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    var target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
      currentScreen = id;
    }
    updateHeader(id);
    clearResults();
  }

  function updateHeader(id) {
    var titles = {
      home: 'Fraud Protection',
      qr: 'Check QR Payment',
      message: 'Check Message',
      link: 'Check Link',
      video: 'Check Video',
      tips: 'Safety Tips'
    };
    var el = document.getElementById('header-title');
    if (el) el.textContent = titles[id] || 'Fraud Protection';
  }

  function goBack() {
    if (currentScreen !== 'home') {
      showScreen('home');
      selectedIndex = 0;
      highlightMenu();
    }
  }

  // ---- Menu highlight ----
  function highlightMenu() {
    for (var i = 0; i < menuItems.length; i++) {
      menuItems[i].classList.remove('selected');
    }
    if (menuItems[selectedIndex]) {
      menuItems[selectedIndex].classList.add('selected');
    }
  }

  function selectMenu() {
    var screens = ['qr', 'message', 'link', 'video', 'tips'];
    if (selectedIndex >= 0 && selectedIndex < screens.length) {
      showScreen(screens[selectedIndex]);
    }
  }

  // ---- Keydown handler ----
  document.addEventListener('keydown', function (e) {
    var key = e.keyCode || e.which;

    if (currentScreen === 'home') {
      if (key === 38) {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + totalItems) % totalItems;
        highlightMenu();
      } else if (key === 40) {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % totalItems;
        highlightMenu();
      } else if (key === 13) {
        selectMenu();
      } else if (key >= 49 && key <= 53) {
        selectedIndex = key - 49;
        highlightMenu();
        selectMenu();
      }
    } else {
      if (key === 8) {
        e.preventDefault();
        goBack();
      }
    }
  });

  // ---- Menu click ----
  for (var i = 0; i < menuItems.length; i++) {
    (function (idx) {
      menuItems[idx].addEventListener('click', function () {
        selectedIndex = idx;
        highlightMenu();
        selectMenu();
      });
    })(i);
  }

  // Back buttons
  var backBtns = document.querySelectorAll('.back-btn');
  for (var b = 0; b < backBtns.length; b++) {
    backBtns[b].addEventListener('click', goBack);
  }

  // ---- Clear results ----
  function clearResults() {
    var results = document.querySelectorAll('.result-box');
    for (var r = 0; r < results.length; r++) {
      results[r].className = 'result-box';
      results[r].textContent = '';
    }
  }

  // ---- Show result ----
  function showResult(boxId, type, msg) {
    var box = document.getElementById(boxId);
    if (!box) return;
    box.className = 'result-box result-' + type;
    box.textContent = msg;
  }

  // ---- Groq API call via XHR (ES5, KaiOS compatible) ----
  function callGroqCheck(type, text, boxId) {
    showResult(boxId, 'warn', 'Checking with AI...');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/check', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;

      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          var verdict = data.verdict || 'warn';
          var reason = data.reason || 'No details returned.';
          showResult(boxId, verdict, reason);
        } catch (e) {
          showResult(boxId, 'warn', 'Could not parse AI response. Use caution.');
        }
      } else {
        // Fallback to offline keyword check on API failure
        offlineCheck(type, text, boxId);
      }
    };

    xhr.ontimeout = function () {
      offlineCheck(type, text, boxId);
    };

    xhr.onerror = function () {
      offlineCheck(type, text, boxId);
    };

    xhr.send(JSON.stringify({ type: type, text: text }));
  }

  // ---- Offline fallback (keyword heuristics) ----
  var FRAUD_KEYWORDS = [
    'lottery', 'winner', 'prize', 'congratulations', 'otp', 'bank account',
    'verify now', 'click here', 'claim your', 'free gift', 'urgent',
    'suspended', 'blocked', 'update your', 'kyc', 'reward', 'limited time',
    'won', 'selected', 'bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 'is.gd'
  ];

  var SAFE_DOMAINS = [
    'google.com', 'youtube.com', 'wikipedia.org', 'paytm.com',
    'phonepe.com', 'uidai.gov.in', 'sbi.co.in', 'irctc.co.in',
    'amazon.in', 'flipkart.com', 'jio.com', 'airtel.in'
  ];

  function containsKeyword(text, list) {
    var lower = text.toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (lower.indexOf(list[i]) !== -1) return list[i];
    }
    return null;
  }

  function isSafeDomain(url) {
    for (var i = 0; i < SAFE_DOMAINS.length; i++) {
      if (url.indexOf(SAFE_DOMAINS[i]) !== -1) return true;
    }
    return false;
  }

  function offlineCheck(type, text, boxId) {
    if (type === 'link') {
      if (isSafeDomain(text)) {
        showResult(boxId, 'safe', '(Offline) Domain looks like a known safe site.');
        return;
      }
    }
    var found = containsKeyword(text, FRAUD_KEYWORDS);
    if (found) {
      showResult(boxId, 'danger', '(Offline) WARNING: Suspicious pattern "' + found + '" found!');
    } else {
      showResult(boxId, 'warn', '(Offline) No obvious fraud signs. AI check unavailable.');
    }
  }

  // ---- QR Check ----
  var qrScanBtn = document.getElementById('qr-scan-btn');
  if (qrScanBtn) {
    qrScanBtn.addEventListener('click', function () {
      showResult('qr-result', 'warn', 'Camera not available. Type the UPI ID below.');
    });
  }

  var qrCheckBtn = document.getElementById('qr-check-btn');
  if (qrCheckBtn) {
    qrCheckBtn.addEventListener('click', function () {
      var val = document.getElementById('qr-input').value.trim();
      if (!val) { showResult('qr-result', 'warn', 'Please enter a UPI ID or payment link.'); return; }
      callGroqCheck('qr', val, 'qr-result');
    });
  }

  // ---- Message Check ----
  var msgCheckBtn = document.getElementById('msg-check-btn');
  if (msgCheckBtn) {
    msgCheckBtn.addEventListener('click', function () {
      var val = document.getElementById('msg-input').value.trim();
      if (!val) { showResult('msg-result', 'warn', 'Please paste a message to check.'); return; }
      callGroqCheck('message', val, 'msg-result');
    });
  }

  // ---- Link Check ----
  var linkCheckBtn = document.getElementById('link-check-btn');
  if (linkCheckBtn) {
    linkCheckBtn.addEventListener('click', function () {
      var val = document.getElementById('link-input').value.trim();
      if (!val) { showResult('link-result', 'warn', 'Please paste a link to check.'); return; }
      callGroqCheck('link', val, 'link-result');
    });
  }

  // ---- Video Check ----
  var videoCheckBtn = document.getElementById('video-check-btn');
  if (videoCheckBtn) {
    videoCheckBtn.addEventListener('click', function () {
      showResult('video-result', 'warn',
        'Deepfake detection needs internet. Check suspicious videos at: futuretools.io/deepfake-detectors');
    });
  }

  // Init
  highlightMenu();
  showScreen('home');

})();
