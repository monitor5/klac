// From KLAP-cli chrome-extension (https://github.com/leehyowon14/KLAP-cli),
// MIT License, Copyright (c) 2026 KLAP contributors.
(() => {
  const panel = document.createElement('aside');
  panel.className = 'klap-panel';
  panel.innerHTML = '<strong>KLAP 자동 수강</strong><p>이 강의의 진도를 60초마다 갱신합니다.</p><div class="klap-actions"><button type="button">시작</button><button type="button" disabled>중지</button></div><p class="klap-status" role="status">대기 중</p>';
  document.body.append(panel);
  const [start, stop] = panel.querySelectorAll('button');
  const status = panel.querySelector('.klap-status');
  let controller = null;
  let timer = null;
  function finish(message) {
    if (timer) clearTimeout(timer);
    timer = null;
    controller?.abort();
    controller = null;
    start.disabled = false;
    stop.disabled = true;
    status.textContent = message;
  }
  async function post(path, form, signal) {
    const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: form, signal });
    if (!response.ok || response.redirected) throw new Error('KLAS 요청에 실패했습니다. 로그인 상태를 확인해 주세요.');
    return response.text();
  }
  start.addEventListener('click', async () => {
    if (controller) return;
    controller = new AbortController();
    const current = controller;
    start.disabled = true;
    stop.disabled = false;
    status.textContent = '강의 정보를 확인하는 중…';
    try {
      const captured = await chrome.runtime.sendMessage({ type: 'get-form' });
      if (controller !== current) return;
      const form = KlapLecture.extract(document, captured);
      async function tick() {
        try {
          const check = await post('/spv/lis/lctre/viewer/ChkLctreCntntsView.do', form, current.signal);
          KlapLecture.parseResponse(check, false);
          const body = await post('/spv/lis/lctre/viewer/UpdateProgress.do', form, current.signal);
          const result = KlapLecture.parseResponse(body, true);
          if (controller !== current) return;
          status.textContent = `진도 ${result.progress}%${result.totalTime != null && result.ptime != null ? ` (${result.totalTime}/${result.ptime})` : ''}`;
          if (result.progress >= 100) finish(`수강 완료 · 진도 ${result.progress}%`);
          else timer = setTimeout(tick, 60000);
        } catch (error) { if (controller === current) finish(error.message); }
      }
      await tick();
    } catch (error) { if (controller === current) finish(error.message); }
  });
  stop.addEventListener('click', () => finish('중지됨'));
})();
