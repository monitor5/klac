// From KLAP-cli chrome-extension (https://github.com/leehyowon14/KLAP-cli),
// MIT License, Copyright (c) 2026 KLAP contributors.
(() => {
  const fields = ['grcode', 'subj', 'year', 'hakgi', 'bunban', 'module', 'oid', 'ptime', 'weeklyseq', 'weeklysubseq', 'lesson'];
  function capture(form) {
    if (!(form instanceof HTMLFormElement)) return;
    const action = new URL(form.action || location.href, location.href);
    if (action.origin !== location.origin || !action.pathname.endsWith('/LctreCntntsViewSpvPage.do')) return;
    const data = {};
    for (const name of fields) {
      const element = form.elements.namedItem(name);
      data[name] = element && typeof element.value === 'string' ? element.value : '';
    }
    document.dispatchEvent(new CustomEvent('klap-lecture-form', { detail: JSON.stringify(data) }));
  }
  const original = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () { capture(this); return original.call(this); };
  document.addEventListener('submit', event => capture(event.target), true);
})();
