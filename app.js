// app.js – KaiOS Fraud Protection App

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
      if (key === 38) { // Up
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + totalItems) % totalItems;
        highlightMenu();
      } else if (key === 40) { // Down
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % totalItems;
        highlightMenu();
      } else if (key === 13) { // Enter / OK
        selectMenu();
      } else if (key >= 49 && key <= 53) { // 1-5
        selectedIndex = key - 49;
        highlightMenu();
        selectMenu();
      }
    } else {
      if (key === 8) { // Backspace
        e.preventDefault();
        goBack();
      }
    }
  });

  // ---- Menu click / softkey ----
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

  // ---- Clear results between screens ----
  function clearResults() {
    var results = document.querySelectorAll('.result-box');
    for (var r = 0; r < results.length; r++) {
      results[r].className = 'result-box';
      results[r].textContent = '';
    }
  }

  // ---- Keyword lists for basic heuristics ----
  var FRAUD_KEYWORDS = [
    'lottery', 'winner', 'prize', 'congratulations', 'otp', 'bank account',
    'verify now', 'click here', 'claim your', 'free gift', 'urgent',
    'suspended', 'blocked', 'update your', 'kyc', 'reward', 'limited time',
    'won', 'selected', 'bit.ly', 'tinyurl', 'goo.gl', 'ow.ly', 'is.gd',
    'suspicious', 'phishing', 'scam', 'hack', 'fake'
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

  function showResult(boxId, type, msg) {
    var box = document.getElementById(boxId);
    if (!box) return;
    box.className = 'result-box result-' + type;
    box.textContent = msg;
  }

  // ---- QR Scan (mock) ----
  var qrScanBtn = document.getElementById('qr-scan-btn');
  if (qrScanBtn) {
    qrScanBtn.addEventListener('click', function () {
      showResult('qr-result', 'warn',
        'Camera not available on this device. Please type the UPI ID below to verify.');
    });
  }

  var qrCheckBtn = document.getElementById('qr-check-btn');
  if (qrCheckBtn) {
    qrCheckBtn.addEventListener('click', function () {
      var val = document.getElementById('qr-input').value.trim();
      if (!val) {
        showResult('qr-result', 'warn', 'Please enter a UPI ID or payment link.');
        return;
      }
      var found = containsKeyword(val, FRAUD_KEYWORDS);
      if (found) {
        showResult('qr-result', 'danger', 'WARNING: Suspicious pattern "' + found + '" found. Do NOT pay!');
      } else if (val.indexOf('@') === -1 && val.indexOf('upi://') === -1) {
        showResult('qr-result', 'warn', 'Could not verify. Check UPI ID format (e.g. name@bank).');
      } else {
        showResult('qr-result', 'safe', 'Looks OK. Always confirm recipient name before paying.');
      }
    });
  }

  // ---- Message Checker ----
  var msgCheckBtn = document.getElementById('msg-check-btn');
  if (msgCheckBtn) {
    msgCheckBtn.addEventListener('click', function () {
      var val = document.getElementById('msg-input').value.trim();
      if (!val) {
        showResult('msg-result', 'warn', 'Please paste a message to check.');
        return;
      }
      var found = containsKeyword(val, FRAUD_KEYWORDS);
      if (found) {
        showResult('msg-result', 'danger', 'DANGER: Fraud keyword "' + found + '" found. This is likely a scam!');
      } else {
        showResult('msg-result', 'safe', 'No obvious fraud keywords found. Stay cautious.');
      }
    });
  }

  // ---- Link Checker ----
  var linkCheckBtn = document.getElementById('link-check-btn');
  if (linkCheckBtn) {
    linkCheckBtn.addEventListener('click', function () {
      var val = document.getElementById('link-input').value.trim();
      if (!val) {
        showResult('link-result', 'warn', 'Please paste a link to check.');
        return;
      }
      if (isSafeDomain(val)) {
        showResult('link-result', 'safe', 'Domain appears to be from a known safe site.');
      } else {
        var found = containsKeyword(val, FRAUD_KEYWORDS);
        if (found) {
          showResult('link-result', 'danger', 'DANGER: Suspicious link. Do NOT click!');
        } else if (val.indexOf('http') === -1) {
          showResult('link-result', 'warn', 'Not a valid link format. Try pasting the full URL.');
        } else {
          showResult('link-result', 'warn', 'Unknown link. Proceed with caution. Avoid entering OTP or passwords.');
        }
      }
    });
  }

  // ---- Video Checker (mock) ----
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
