import { PAGES, assignmentURL, noticeURL, lectureNeedsAttendance } from '../src/klas.js';
import { DAY, dueItems } from '../src/views.js';

const $ = id => document.getElementById(id);
const state = { tab: 'due', snapshot: null, settings: null, course: '', pendingOnly: true };

if (new URLSearchParams(location.search).has('full')) document.body.classList.add('full');

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

async function call(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response) throw new Error('확장 프로그램 응답이 없습니다.');
  if (!response.ok) { const error = new Error(response.error); error.kind = response.kind; throw error; }
  return response.data;
}

// ---------- formatting ----------
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function fmtDate(ms, withTime = true) {
  if (ms === null || ms === undefined) return '-';
  const d = new Date(ms);
  const base = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
  return withTime ? `${base} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : base;
}
function remaining(ms, now = Date.now()) {
  const diff = ms - now;
  if (diff < 0) return { text: '마감', level: '' };
  const hours = diff / 3600000;
  if (hours < 1) return { text: `${Math.max(1, Math.round(diff / 60000))}분 남음`, level: 'danger' };
  if (hours < 24) return { text: `${Math.floor(hours)}시간 남음`, level: 'danger' };
  const days = Math.floor(hours / 24);
  return { text: `D-${days}`, level: days <= 3 ? 'warn' : '' };
}
function ago(ms) {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  return `${Math.round(minutes / 60)}시간 전`;
}

// ---------- actions ----------
async function openKlas(url, courseId) {
  try { await call('open', { url, term: state.snapshot?.term?.value, courseId }); }
  catch (error) { showBanner(error.message, true); }
}

function courses() { return state.snapshot?.courses || []; }
function filteredCourses() { return courses().filter(c => !state.course || c.id === state.course); }

function partError(part) { return part && part.error ? h('div', { class: 'sub' }, `⚠ ${part.error}`) : null; }

// ---------- views ----------
function emptyView(title, text) {
  return h('div', { class: 'empty' }, h('strong', {}, title), text);
}

function dueView() {
  const days = state.settings?.dueDays || 14;
  const items = dueItems(state.snapshot, days);
  if (!items.length) return emptyView('마감 임박 항목이 없습니다 🎉', `앞으로 ${days}일 안에 마감되는 미제출 과제와 미수강 강의가 없습니다.`);
  const now = Date.now();
  const groups = [['오늘', 0, DAY], ['3일 이내', DAY, 3 * DAY], ['4일 이후', 3 * DAY, Infinity]];
  return groups.map(([label, from, to]) => {
    const list = items.filter(i => i.dueAt - now >= from && i.dueAt - now < to);
    if (!list.length) return null;
    return [h('div', { class: 'group' }, `${label} · ${list.length}`), list.map(item => {
      const left = remaining(item.dueAt, now);
      const onclick = item.kind === 'assignment'
        ? () => showAssignment(courses().find(c => c.id === item.courseId), { ordseq: item.ordseq, title: item.title })
        : () => openKlas(PAGES.lectures, item.courseId);
      return h('button', { class: 'item', onclick },
        h('span', { class: 'kind', title: item.kind === 'assignment' ? '과제' : '온라인 강의' }, item.kind === 'assignment' ? '📝' : '▶'),
        h('div', { class: 'main' },
          h('div', { class: 'title' }, item.title),
          h('div', { class: 'sub' }, `${item.course} · ${fmtDate(item.dueAt)}${item.kind === 'lecture' && item.progress !== null ? ` · 진도 ${item.progress}%` : ''}`)),
        h('span', { class: `tag ${left.level}` }, left.text));
    })];
  });
}

function coursesView() {
  if (!courses().length) return emptyView('수강 과목이 없습니다', '학기를 바꿔 보세요.');
  const now = Date.now();
  return courses().map(course => {
    const assignments = course.assignments?.value || [];
    const lectures = course.lectures?.value || [];
    const notices = course.notices?.value || [];
    const pendingA = assignments.filter(a => !a.submitted && a.dueAt !== null && a.dueAt > now).length;
    const pendingL = lectures.filter(l => lectureNeedsAttendance(l, now)).length;
    const newN = notices.filter(n => n.registeredAt && now - n.registeredAt < 3 * DAY).length;
    const select = tab => () => { state.course = course.id; $('course-filter').value = course.id; switchTab(tab); };
    return h('div', { class: 'course-card' },
      h('h3', {}, course.name),
      h('div', { class: 'stats' },
        h('span', { class: `tag ${pendingA ? 'warn' : 'ok'}` }, `미제출 과제 ${pendingA}`),
        h('span', { class: `tag ${pendingL ? 'warn' : 'ok'}` }, `미수강 강의 ${pendingL}`),
        h('span', { class: `tag ${newN ? 'accent' : ''}` }, `새 공지 ${newN}`)),
      h('div', { class: 'links' },
        h('a', { href: '#', onclick: e => { e.preventDefault(); select('assignments')(); } }, '과제'),
        h('a', { href: '#', onclick: e => { e.preventDefault(); select('notices')(); } }, '공지'),
        h('a', { href: '#', onclick: e => { e.preventDefault(); select('lectures')(); } }, '강의'),
        h('a', { href: '#', onclick: e => { e.preventDefault(); openKlas(PAGES.courseHome, course.id); } }, '강의실 열기 ↗')));
  });
}

function assignmentsView() {
  const now = Date.now();
  const out = [];
  for (const course of filteredCourses()) {
    let list = course.assignments?.value || [];
    if (state.pendingOnly) list = list.filter(a => !a.submitted && (a.dueAt === null || a.dueAt > now));
    if (!list.length && !course.assignments?.error) continue;
    out.push(h('div', { class: 'group' }, course.name), partError(course.assignments));
    for (const a of [...list].sort((x, y) => (x.dueAt ?? Infinity) - (y.dueAt ?? Infinity))) {
      const left = a.dueAt !== null ? remaining(a.dueAt, now) : { text: '기한 없음', level: '' };
      const tag = a.submitted ? h('span', { class: 'tag ok' }, '제출 완료')
        : a.dueAt !== null && a.dueAt < now ? h('span', { class: 'tag' }, '마감됨')
        : h('span', { class: `tag ${left.level}` }, left.text);
      out.push(h('button', { class: 'item', onclick: () => showAssignment(course, a) },
        h('div', { class: 'main' }, h('div', { class: 'title' }, a.title), h('div', { class: 'sub' }, `${fmtDate(a.startAt, false)} ~ ${fmtDate(a.dueAt)}`)),
        tag));
    }
  }
  return out.length ? out : emptyView('과제가 없습니다', state.pendingOnly ? '미제출 과제가 없습니다.' : '등록된 과제가 없습니다.');
}

function noticesView() {
  const now = Date.now();
  let rows = [];
  for (const course of filteredCourses()) {
    if (course.notices?.error) rows.push({ error: course.notices.error, course });
    for (const n of course.notices?.value || []) rows.push({ n, course });
  }
  if (state.pendingOnly) rows = rows.filter(r => r.error || (r.n.registeredAt && now - r.n.registeredAt < 14 * DAY));
  rows.sort((x, y) => (y.n?.registeredAt || 0) - (x.n?.registeredAt || 0));
  if (!rows.length) return emptyView('공지가 없습니다', state.pendingOnly ? '최근 2주간 새 공지가 없습니다. "최근 2주"를 끄면 전체를 봅니다.' : '');
  return rows.map(({ n, course, error }) => error
    ? h('div', { class: 'sub' }, `⚠ ${course.name}: ${error}`)
    : h('button', { class: 'item', onclick: () => showNotice(course, n) },
      h('div', { class: 'main' },
        h('div', { class: 'title' }, n.pinned ? '📌 ' : '', n.title),
        h('div', { class: 'sub' }, `${course.name} · ${n.author || '작성자 미상'} · ${fmtDate(n.registeredAt, false)}${n.fileCount ? ` · 📎${n.fileCount}` : ''}`)),
      n.registeredAt && now - n.registeredAt < 3 * DAY ? h('span', { class: 'tag accent' }, 'NEW') : null));
}

function lecturesView() {
  const now = Date.now();
  const out = [];
  for (const course of filteredCourses()) {
    let list = course.lectures?.value || [];
    if (state.pendingOnly) list = list.filter(l => lectureNeedsAttendance(l, now));
    if (!list.length && !course.lectures?.error) continue;
    out.push(h('div', { class: 'group' }, course.name), partError(course.lectures));
    for (const l of list) {
      const done = l.isActivity ? !lectureNeedsAttendance(l, now) && l.endAt !== null && now <= l.endAt : (l.progress ?? 0) >= 100;
      const tag = done ? h('span', { class: 'tag ok' }, '완료')
        : l.startAt !== null && now < l.startAt ? h('span', { class: 'tag' }, '예정')
        : l.endAt !== null && now > l.endAt ? h('span', { class: 'tag' }, '기간 종료')
        : l.endAt !== null ? (r => h('span', { class: `tag ${r.level}` }, r.text))(remaining(l.endAt, now)) : null;
      out.push(h('button', { class: 'item', onclick: () => openKlas(PAGES.lectures, course.id), title: 'KLAS 온라인 강의 페이지에서 열기' },
        h('div', { class: 'main' },
          h('div', { class: 'title' }, `${l.week ? `${l.week}주차 · ` : ''}${l.title}`),
          h('div', { class: 'sub' }, `${fmtDate(l.startAt, false)} ~ ${fmtDate(l.endAt)}${l.isActivity ? ' · 학습활동' : ''}`),
          !l.isActivity && l.progress !== null ? h('div', { class: 'bar' }, h('span', { style: `width:${Math.min(100, l.progress)}%` })) : null),
        !l.isActivity && l.progress !== null ? h('span', { class: 'tag' }, `${l.progress}%`) : null,
        tag));
    }
  }
  return out.length ? out : emptyView('강의가 없습니다', state.pendingOnly ? '지금 들어야 하는 온라인 강의가 없습니다.' : '');
}

function timetableView() {
  const entries = state.snapshot?.timetable || [];
  if (!entries.length) return emptyView('시간표가 없습니다', '이 학기의 시간표 정보를 불러오지 못했습니다.');
  const offline = entries.filter(e => e.period <= 12);
  const maxPeriod = Math.max(6, ...offline.map(e => e.period + e.span - 1));
  const days = entries.some(e => e.weekday === 6) ? 6 : 5;
  const today = new Date().getDay();
  const covered = new Set();
  const rows = [];
  for (let p = 1; p <= maxPeriod; p++) {
    const cells = [h('td', { class: 'p' }, p)];
    for (let d = 1; d <= days; d++) {
      if (covered.has(`${d}:${p}`)) continue;
      const entry = offline.find(e => e.weekday === d && e.period === p);
      if (!entry) { cells.push(h('td', { class: d === today ? 'today-col' : '' })); continue; }
      for (let k = 1; k < entry.span; k++) covered.add(`${d}:${p + k}`);
      const course = courses().find(c => c.id === entry.courseId);
      cells.push(h('td', { class: 'slot', rowspan: entry.span, title: `${entry.name}\n${entry.professor}\n${entry.room}`, onclick: course ? () => openKlas(PAGES.courseHome, course.id) : null },
        h('b', {}, entry.name), h('small', {}, entry.room || '온라인')));
    }
    rows.push(h('tr', {}, cells));
  }
  return h('table', { class: 'tt' },
    h('thead', {}, h('tr', {}, h('th', { class: 'p' }), ['월', '화', '수', '목', '금', '토'].slice(0, days).map(d => h('th', {}, d)))),
    h('tbody', {}, rows));
}

function settingsView() {
  const s = state.settings;
  const save = async patch => {
    state.settings = await call('saveSettings', { patch });
    if (patch.term !== undefined) await load(true);
  };
  return h('div', { class: 'settings' },
    h('div', { class: 'group' }, '설정'),
    h('label', {}, '마감 탭에 표시할 기간(일)', h('input', { type: 'number', min: 1, max: 60, value: s.dueDays, onchange: e => save({ dueDays: Math.max(1, Number(e.target.value) || 14) }) })),
    h('label', {}, '자동 새로고침 주기(분)', h('input', { type: 'number', min: 5, max: 240, value: s.refreshMinutes, onchange: e => save({ refreshMinutes: Math.max(5, Number(e.target.value) || 30) }) })),
    h('label', {}, '새 공지 알림', h('input', { type: 'checkbox', checked: s.notifyNotices, onchange: e => save({ notifyNotices: e.target.checked }) })),
    h('label', {}, '마감 24시간 전 알림', h('input', { type: 'checkbox', checked: s.notifyDeadlines, onchange: e => save({ notifyDeadlines: e.target.checked }) })),
    h('p', {}, 'KLAP은 브라우저에 로그인된 KLAS 세션만 사용하며 비밀번호를 저장하지 않습니다. 과목별 조회 시 KLAS의 “선택 과목”이 바뀌므로, 열려 있는 KLAS 탭은 새로고침이 필요할 수 있습니다.'),
    h('button', { class: 'primary', onclick: () => switchTab(state.tab === 'settings' ? 'due' : state.tab) }, '닫기'));
}

const VIEWS = { due: dueView, courses: coursesView, assignments: assignmentsView, notices: noticesView, lectures: lecturesView, timetable: timetableView, settings: settingsView };
const FILTERED = new Set(['assignments', 'notices', 'lectures']);

function render() {
  const view = $('view');
  view.replaceChildren();
  $('filters').hidden = !FILTERED.has(state.tab);
  $('pending-label').textContent = state.tab === 'notices' ? '최근 2주' : '미완료만';
  if (state.tab === 'settings') { if (state.settings) view.append(settingsView()); return; }
  if (!state.snapshot?.courses) {
    if (state.snapshot?.status === 'login') view.append(loginView());
    else if (state.snapshot?.status === 'error') view.append(emptyView('불러오지 못했습니다', state.snapshot.error));
    else view.append(emptyView('불러오는 중…', 'KLAS에서 과목 정보를 가져오고 있습니다. 과목 수에 따라 몇 초 걸립니다.'));
    return;
  }
  view.append(...[VIEWS[state.tab]()].flat(3).filter(Boolean));
}

function loginView() {
  return h('div', { class: 'empty' },
    h('strong', {}, 'KLAS 로그인이 필요합니다'),
    h('p', {}, '브라우저에서 KLAS에 로그인한 뒤 다시 열어 주세요.'),
    h('button', { class: 'primary', onclick: () => chrome.tabs.create({ url: PAGES.login }) }, 'KLAS 로그인'));
}

function switchTab(tab) {
  state.tab = tab;
  for (const button of document.querySelectorAll('.tabs button')) button.setAttribute('aria-selected', String(button.dataset.tab === tab));
  render();
}

function showBanner(text, error = false, action) {
  const banner = $('banner');
  banner.hidden = !text;
  banner.className = `banner${error ? ' error' : ''}`;
  banner.replaceChildren(text || '');
  if (action) banner.append(h('button', { class: 'icon', style: 'width:auto;padding:0 8px', onclick: action.run }, action.label));
}

// ---------- detail ----------
function openDetail(title, meta, url, courseId) {
  $('detail').hidden = false;
  $('detail-title').textContent = title;
  $('detail-meta').replaceChildren(...meta.filter(Boolean).map(m => h('span', { class: 'tag' }, m)));
  $('detail-body').replaceChildren('불러오는 중…');
  $('detail-open').onclick = () => openKlas(url, courseId);
}

async function showAssignment(course, a) {
  const term = state.snapshot.term.value;
  openDetail(a.title, [course.name], assignmentURL(term, course.id, a.ordseq), course.id);
  try {
    const d = await call('assignmentDetail', { term, courseId: course.id, ordseq: a.ordseq });
    $('detail-meta').replaceChildren(...[course.name, `마감 ${fmtDate(d.dueAt)}`, d.type, d.submitted ? '제출 완료' : '미제출', d.score && d.score !== 'null' ? `점수 ${d.score}` : null, d.fileLimitMB ? `파일 ${d.fileLimitMB}MB` : null]
      .filter(Boolean).map(m => h('span', { class: `tag ${m === '미제출' ? 'warn' : m === '제출 완료' ? 'ok' : ''}` }, m)));
    $('detail-body').replaceChildren(...[
      d.content || '(본문 없음)',
      ...(d.submittedTitle || d.submittedText ? [h('h4', {}, '내 제출물'), [d.submittedTitle, d.submittedText].filter(Boolean).join('\n')] : []),
      ...(d.feedback ? [h('h4', {}, '교수 피드백'), d.feedback] : []),
    ]);
  } catch (error) { $('detail-body').replaceChildren(`⚠ ${error.message}`); }
}

async function showNotice(course, n) {
  const term = state.snapshot.term.value;
  openDetail(n.title, [course.name, n.author, fmtDate(n.registeredAt)], noticeURL(term, course.id, n.boardNo, n.masterNo), course.id);
  try {
    const d = await call('noticeDetail', { term, courseId: course.id, boardNo: n.boardNo, masterNo: n.masterNo });
    $('detail-body').replaceChildren(d.content || '(본문 없음)', n.fileCount ? h('h4', {}, `첨부파일 ${n.fileCount}개는 KLAS에서 확인하세요.`) : '');
  } catch (error) { $('detail-body').replaceChildren(`⚠ ${error.message}`); }
}

// ---------- load ----------
function fillTerms() {
  const select = $('term');
  const snapshot = state.snapshot;
  select.replaceChildren(...(snapshot?.terms || []).map(t => h('option', { value: t.value, selected: t.value === snapshot.term?.value }, t.label)));
  const filter = $('course-filter');
  filter.replaceChildren(h('option', { value: '' }, '전체 과목'), ...courses().map(c => h('option', { value: c.id, selected: c.id === state.course }, c.name)));
}

function setStatus() {
  const s = state.snapshot;
  $('status').textContent = s?.fetchedAt ? `${s.term?.label || ''} · ${ago(s.fetchedAt)} 갱신` : '';
  if (s?.status === 'login' && s.stale) showBanner('KLAS 세션이 만료되어 저장된 데이터를 표시합니다.', true, { label: '로그인', run: () => chrome.tabs.create({ url: PAGES.login }) });
  else if (s?.status === 'error' && s.stale) showBanner(`갱신 실패: ${s.error}`, true);
  else showBanner('');
}

async function load(force) {
  $('refresh').classList.add('spin');
  try {
    state.snapshot = await call('snapshot', { force });
  } catch (error) {
    state.snapshot = { status: 'error', error: error.message };
  } finally {
    $('refresh').classList.remove('spin');
  }
  fillTerms();
  setStatus();
  render();
}

async function init() {
  for (const button of document.querySelectorAll('.tabs button')) button.addEventListener('click', () => switchTab(button.dataset.tab));
  $('refresh').addEventListener('click', () => load(true));
  $('expand').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html?full=1') }));
  $('back').addEventListener('click', () => { $('detail').hidden = true; });
  $('settings-link').addEventListener('click', e => { e.preventDefault(); switchTab('settings'); });
  $('term').addEventListener('change', async e => {
    state.course = '';
    state.snapshot = { ...state.snapshot, courses: null, status: 'loading' };
    render();
    state.settings = await call('saveSettings', { patch: { term: e.target.value } });
    await load(true);
  });
  $('course-filter').addEventListener('change', e => { state.course = e.target.value; render(); });
  $('pending-only').addEventListener('change', e => { state.pendingOnly = e.target.checked; render(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('detail').hidden) { $('detail').hidden = true; e.preventDefault(); } });

  state.settings = await call('settings');
  // Show cached data right away, then refresh if stale.
  const { snapshot } = await chrome.storage.local.get('snapshot');
  if (snapshot) { state.snapshot = snapshot; fillTerms(); setStatus(); render(); }
  else render();
  await load(false);
}

init();
