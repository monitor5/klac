// From KLAP-cli chrome-extension (https://github.com/leehyowon14/KLAP-cli),
// MIT License, Copyright (c) 2026 KLAP contributors.
const KlapLecture = (() => {
  const fields = ['grcode', 'subj', 'year', 'hakgi', 'bunban', 'module', 'oid', 'ptime', 'weeklyseq', 'weeklysubseq', 'lesson'];
  const required = fields.filter(field => field !== 'weeklysubseq');
  function extract(document, captured) {
    const html = Array.from(document.scripts, script => script.textContent).join('\n');
    const values = {};
    for (const field of [...fields, 'lecKey']) {
      const input = document.querySelector(`[name="${field}"], #${field}`);
      const match = html.match(new RegExp(`(?:["']${field}["']|\\b${field}\\b)\\s*[:=]\\s*["']([^"']+)["']`, 'i'));
      values[field] = input?.value || match?.[1] || '';
    }
    if (captured && (!values.oid || values.oid === captured.oid)) {
      for (const field of fields) values[field] ||= String(captured[field] || '');
    }
    const missing = [...required, 'lecKey'].filter(field => !values[field]?.trim());
    if (missing.length) throw new Error(`강의 정보를 찾지 못했습니다 (${missing.join(', ')}). 강의 목록에서 뷰어를 다시 열어 주세요.`);
    return new URLSearchParams(Object.fromEntries([...fields, 'lecKey'].map(field => [field, values[field]])));
  }
  function parseResponse(text, progress) {
    let result;
    try { result = JSON.parse(text); } catch { throw new Error('서버 응답을 읽을 수 없습니다. 로그인 상태를 확인해 주세요.'); }
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('서버 응답 형식이 올바르지 않습니다.');
    if (result.loginRequired === true || result.redirect === true || Number(result.errorCount) > 0 || (Array.isArray(result.fieldErrors) && result.fieldErrors.length)) throw new Error('KLAS에서 요청을 거부했습니다. 로그인 상태와 강의 수강 기간을 확인해 주세요.');
    if (!progress) return result;
    const data = result.data && typeof result.data === 'object' ? result.data : result;
    if (data.prog === undefined || data.prog === null || String(data.prog).trim() === '' || !Number.isFinite(Number(data.prog))) throw new Error('서버의 진도 응답을 확인할 수 없습니다.');
    return { progress: Number(data.prog), totalTime: data.totalTime, ptime: data.ptime };
  }
  return { extract, parseResponse };
})();
if (typeof module !== 'undefined') module.exports = KlapLecture;
