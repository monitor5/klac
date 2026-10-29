// From KLAP-cli chrome-extension (https://github.com/leehyowon14/KLAP-cli),
// MIT License, Copyright (c) 2026 KLAP contributors.
document.addEventListener('klap-lecture-form', event => {
  try {
    chrome.runtime.sendMessage({ type: 'capture', data: JSON.parse(event.detail) }).catch(() => {});
  } catch {}
});
