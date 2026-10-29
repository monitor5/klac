import { KlasClient, KlasError, PAGES, assignmentURL, noticeURL } from './klas.js';
import { DAY, dueItems } from './views.js';

const klas = new KlasClient();
const CACHE_TTL = 5 * 60 * 1000;
const ALARM = 'klap-refresh';
const DEFAULT_SETTINGS = { term: '', refreshMinutes: 30, notifyNotices: true, notifyDeadlines: true, dueDays: 14 };

// ---------- request headers ----------
// KLAS expects same-origin XHRs; requests from the service worker otherwise
// carry a chrome-extension:// Origin. Only extension-initiated requests (tabId -1)
// are rewritten, so normal browsing is untouched.
async function installHeaderRules() {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [1],
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'Origin', operation: 'set', value: 'https://klas.kw.ac.kr' },
          { header: 'Referer', operation: 'set', value: 'https://klas.kw.ac.kr/std/cmn/frame/Frame.do' },
        ],
      },
      condition: { requestDomains: ['klas.kw.ac.kr'], tabIds: [-1], resourceTypes: ['xmlhttprequest', 'other'] },
    }],
  });
}
const ready = installHeaderRules().catch(error => console.warn('[KLAP] header rule', error));

// ---------- settings & storage ----------
async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function saveSettings(patch) {
  const settings = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings });
  await scheduleAlarm(settings);
  return settings;
}

async function scheduleAlarm(settings) {
  const minutes = Math.max(5, Number(settings.refreshMinutes) || DEFAULT_SETTINGS.refreshMinutes);
  await chrome.alarms.create(ALARM, { periodInMinutes: minutes, delayInMinutes: 1 });
}

// ---------- snapshot ----------
let inflight = null;

async function buildSnapshot() {
  await ready;
  const settings = await getSettings();
  const terms = await klas.terms();
  if (!terms.length) throw new KlasError('remote', '수강 학기가 없습니다.');
  const term = terms.find(t => t.value === settings.term) || terms[0];

  const courses = [];
  for (const course of term.courses) {
    const bundle = await klas.courseBundle(term.value, course.id);
    courses.push({ ...course, ...bundle });
  }
  let timetable = [];
  try { timetable = await klas.timetable(term.value); } catch (error) {
    if (error.kind === 'session') throw error;
  }
  return {
    status: 'ok',
    fetchedAt: Date.now(),
    term: { value: term.value, label: term.label },
    terms: terms.map(t => ({ value: t.value, label: t.label })),
    courses,
    timetable,
  };
}

function refresh() {
  if (!inflight) {
    inflight = buildSnapshot()
      .then(async snapshot => {
        const previous = (await chrome.storage.local.get('snapshot')).snapshot;
        await chrome.storage.local.set({ snapshot });
        await afterRefresh(snapshot, previous);
        return snapshot;
      })
      .catch(async error => {
        const status = error.kind === 'session' ? 'login' : 'error';
        const { snapshot } = await chrome.storage.local.get('snapshot');
        await setBadge(status === 'login' ? '!' : '', '#d93025');
        return { ...(snapshot || {}), status, error: error.message, stale: !!snapshot };
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

async function getSnapshot(force) {
  const { snapshot } = await chrome.storage.local.get('snapshot');
  if (!force && snapshot && Date.now() - snapshot.fetchedAt < CACHE_TTL) return snapshot;
  return refresh();
}

async function setBadge(text, color) {
  await chrome.action.setBadgeText({ text });
  if (color) await chrome.action.setBadgeBackgroundColor({ color });
}

async function notify(id, title, message) {
  try {
    await chrome.notifications.create(id, { type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon128.png'), title, message, priority: 1 });
  } catch (error) { console.warn('[KLAP] notification', error); }
}

async function afterRefresh(snapshot, previous) {
  const settings = await getSettings();
  const now = Date.now();
  const urgent = dueItems(snapshot, 3, now);
  await setBadge(urgent.length ? String(urgent.length) : '', urgent.some(i => i.dueAt - now < DAY) ? '#d93025' : '#1a73e8');

  const store = await chrome.storage.local.get(['seenNotices', 'notified']);
  const notified = store.notified || {};
  const links = {};

  // New notices (skip on the very first sync so we don't flood).
  const keys = [];
  for (const course of snapshot.courses) {
    for (const n of course.notices?.value || []) keys.push({ key: `${course.id}:${n.boardNo}:${n.masterNo}`, course, n });
  }
  if (store.seenNotices && previous?.term?.value === snapshot.term.value && settings.notifyNotices) {
    const seen = new Set(store.seenNotices);
    const fresh = keys.filter(k => !seen.has(k.key));
    for (const { key, course, n } of fresh.slice(0, 5)) {
      const id = `notice:${key}`;
      links[id] = { url: noticeURL(snapshot.term.value, course.id, n.boardNo, n.masterNo), courseId: course.id };
      await notify(id, `[공지] ${course.name}`, n.title);
    }
    if (fresh.length > 5) await notify(`notice:more:${now}`, 'KLAP', `새 공지 ${fresh.length - 5}건이 더 있습니다.`);
  }

  // Deadlines within 24h, once per item.
  if (settings.notifyDeadlines) {
    for (const item of dueItems(snapshot, 1, now)) {
      if (notified[item.key]) continue;
      notified[item.key] = now;
      const hours = Math.max(1, Math.round((item.dueAt - now) / 3600000));
      const id = `due:${item.key}`;
      links[id] = { url: item.kind === 'assignment' ? assignmentURL(snapshot.term.value, item.courseId, item.ordseq) : PAGES.lectures, courseId: item.courseId };
      await notify(id, `${item.kind === 'assignment' ? '과제' : '온라인 강의'} 마감 ${hours}시간 전`, `${item.course} · ${item.title}`);
    }
  }
  for (const [key, time] of Object.entries(notified)) if (now - time > 14 * DAY) delete notified[key];

  const { notificationLinks = {} } = await chrome.storage.session.get('notificationLinks');
  await chrome.storage.session.set({ notificationLinks: { ...notificationLinks, ...links } });
  await chrome.storage.local.set({ seenNotices: keys.map(k => k.key), notified });
}

// ---------- opening KLAS pages ----------
async function openPage({ url, term, courseId }) {
  if (!url.startsWith('https://klas.kw.ac.kr/')) throw new Error('KLAS 페이지만 열 수 있습니다.');
  if (term && courseId) {
    await ready;
    await klas.exclusive(() => klas.setCourse(term, courseId));
  }
  await chrome.tabs.create({ url });
}

chrome.notifications.onClicked.addListener(async id => {
  const { notificationLinks = {} } = await chrome.storage.session.get('notificationLinks');
  const link = notificationLinks[id];
  const { snapshot } = await chrome.storage.local.get('snapshot');
  if (link) await openPage({ ...link, term: snapshot?.term?.value }).catch(() => chrome.tabs.create({ url: link.url }));
  chrome.notifications.clear(id);
});

// ---------- lecture viewer helper (from klap-cli chrome-extension) ----------
const FORM_PREFIX = 'lecture-form:';

function handleViewerMessage(message, sender, respond) {
  if (message.type === 'capture') {
    chrome.storage.session.set({ [FORM_PREFIX + sender.tab.id]: { data: message.data, time: Date.now() } }).then(() => respond({ ok: true }));
    return true;
  }
  if (message.type === 'get-form') {
    const ids = [sender.tab.id, sender.tab.openerTabId].filter(id => Number.isInteger(id));
    chrome.storage.session.get(ids.map(id => FORM_PREFIX + id)).then(items => {
      const entries = ids.map(id => items[FORM_PREFIX + id]).filter(item => item && Date.now() - item.time < 120000);
      respond(entries[0]?.data || null);
    });
    return true;
  }
  return false;
}

chrome.tabs.onRemoved.addListener(tabId => { chrome.storage.session.remove(FORM_PREFIX + tabId); });

// ---------- popup API ----------
const handlers = {
  async snapshot({ force }) { return getSnapshot(force); },
  async settings() { return getSettings(); },
  async saveSettings({ patch }) {
    const before = await getSettings();
    const settings = await saveSettings(patch);
    if (patch.term !== undefined && patch.term !== before.term) await chrome.storage.local.remove('snapshot');
    return settings;
  },
  async due({ days }) {
    const snapshot = await getSnapshot(false);
    return { snapshot, items: dueItems(snapshot, days ?? (await getSettings()).dueDays) };
  },
  async assignmentDetail({ term, courseId, ordseq }) { await ready; return klas.assignmentDetail(term, courseId, ordseq); },
  async noticeDetail({ term, courseId, boardNo, masterNo }) { await ready; return klas.noticeDetail(term, courseId, boardNo, masterNo); },
  async open(message) { await openPage(message); return true; },
};

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (sender.tab && sender.url?.startsWith('https://klas.kw.ac.kr/')) return handleViewerMessage(message, sender, respond);
  if (!sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  const handler = handlers[message.type];
  if (!handler) return false;
  handler(message)
    .then(data => respond({ ok: true, data }))
    .catch(error => respond({ ok: false, error: error.message, kind: error.kind }));
  return true;
});

chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) refresh(); });
chrome.runtime.onInstalled.addListener(async () => { await scheduleAlarm(await getSettings()); });
chrome.runtime.onStartup.addListener(async () => { await scheduleAlarm(await getSettings()); });
