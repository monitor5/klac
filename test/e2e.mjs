// End-to-end smoke test: loads the unpacked extension in Chromium and points
// klas.kw.ac.kr at a local fake server. Usage: node test/e2e.mjs <cert.pem> <key.pem> <outDir>
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as F from './fixtures.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [cert, key, outDir = '.'] = process.argv.slice(2);
const extensionPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sessions = new Map();
const log = [];
const server = https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) }, (req, res) => {
  let raw = '';
  req.on('data', c => { raw += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'https://klas.kw.ac.kr');
    const sid = /JSESSIONID=([^;]+)/.exec(req.headers.cookie || '')?.[1];
    log.push({ path: url.pathname, origin: req.headers.origin, referer: req.headers.referer, sid });
    const send = (value, type = 'application/json') => { res.writeHead(200, { 'Content-Type': type }); res.end(typeof value === 'string' ? value : JSON.stringify(value)); };
    if (req.method === 'GET') return send(`<html><body><h1>KLAS page ${url.pathname}</h1></body></html>`, 'text/html');
    if (!sid) return send('<html><body><form action="/usr/cmn/login/LoginConfirm.do"></form></body></html>', 'text/html');
    const body = raw ? JSON.parse(raw) : {};
    const name = url.pathname.split('/').pop();
    const selected = sessions.get(sid);
    switch (name) {
      case 'YearhakgiAtnlcSbjectList.do': return send(F.terms);
      case 'LctrumHomeStdInfo.do': sessions.set(sid, body.selectSubj); return send({});
      case 'TaskStdList.do': return send(body.selectSubj === selected ? F.assignments[selected] : { errorCount: 1, fieldErrors: [{ message: 'context mismatch' }] });
      case 'BoardStdList.do': return send(F.notices[selected]);
      case 'SelectOnlineCntntsStdList.do': return send(F.lectures[selected]);
      case 'TimetableStdList.do': return send(F.timetable);
      case 'TaskStdView.do': return send(F.assignmentDetail);
      case 'BoardStdView.do': return send(F.noticeDetail);
      default: res.writeHead(404); res.end();
    }
  });
});
await new Promise(r => server.listen(8443, '127.0.0.1', r));

const context = await chromium.launchPersistentContext('', {
  headless: true,
  channel: 'chromium',
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--host-resolver-rules=MAP klas.kw.ac.kr:443 127.0.0.1:8443',
    '--ignore-certificate-errors',
    '--no-proxy-server',
  ],
  viewport: { width: 420, height: 600 },
});
const failures = [];
const check = (cond, message) => { if (!cond) failures.push(message); console.log(`${cond ? 'ok  ' : 'FAIL'} ${message}`); };

let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker');
const extId = new URL(worker.url()).host;
const popupURL = `chrome-extension://${extId}/popup/popup.html`;

// 1) logged out → login view
let page = await context.newPage();
page.on('console', m => console.log('[popup]', m.text()));
page.on('pageerror', e => console.log('[popup error]', e.message));
worker.on('console', m => console.log('[sw]', m.text()));
await page.goto(popupURL);
try { await page.getByText('KLAS 로그인이 필요합니다').waitFor({ timeout: 15000 }); }
catch (error) { console.log(await page.locator('body').innerText(), log); throw error; }
check(true, 'logged-out state shows login prompt');
await page.screenshot({ path: path.join(outDir, '0-login.png') });

// 2) log in (cookie) → data
await context.addCookies([{ name: 'JSESSIONID', value: 'test-session', domain: 'klas.kw.ac.kr', path: '/', secure: true, httpOnly: true }]);
await page.click('#refresh');
await page.getByText('스케줄러 구현').waitFor({ timeout: 15000 });
const dueTitles = await page.$$eval('#view .item .title', els => els.map(e => e.textContent));
check(JSON.stringify(dueTitles) === JSON.stringify(['스케줄러 구현', '9주차 가상메모리', 'TCP 실습']), `due tab order: ${dueTitles.join(' | ')}`);
await page.screenshot({ path: path.join(outDir, '1-due.png') });

const apiCalls = log.filter(l => l.path.endsWith('.do') && l.sid);
check(apiCalls.every(l => l.origin === 'https://klas.kw.ac.kr'), `Origin rewritten on ${apiCalls.length} API calls (${[...new Set(apiCalls.map(l => l.origin))].join(',')})`);

const badge = await worker.evaluate(() => chrome.action.getBadgeText({}));
check(badge === '2', `badge shows urgent count (got "${badge}")`);

for (const [tab, shot, expect] of [['courses', '2-courses', '운영체제'], ['assignments', '3-assignments', 'TCP 실습'], ['notices', '4-notices', '중간고사 안내'], ['lectures', '5-lectures', '9주차 · 9주차 가상메모리'], ['timetable', '6-timetable', '새빛관 101']]) {
  await page.click(`.tabs button[data-tab="${tab}"]`);
  const text = await page.locator('#view').innerText();
  check(text.includes(expect), `${tab} tab shows "${expect}"`);
  await page.screenshot({ path: path.join(outDir, `${shot}.png`) });
}

// detail views
await page.click('.tabs button[data-tab="assignments"]');
await page.getByText('스케줄러 구현').click();
await page.getByText('RR 스케줄러를 구현하라.').waitFor({ timeout: 5000 });
check((await page.locator('#detail-body').innerText()).includes('- C 언어'), 'assignment detail renders HTML as text');
await page.screenshot({ path: path.join(outDir, '7-assignment-detail.png') });
await page.click('#back');
await page.click('.tabs button[data-tab="notices"]');
await page.getByText('중간고사 안내').click();
await page.getByText('범위: 1~8주차').waitFor({ timeout: 5000 });
check(true, 'notice detail renders');

// open in KLAS sets course context first
const before = log.length;
const [tab] = await Promise.all([context.waitForEvent('page'), page.click('#detail-open')]);
await tab.waitForLoadState();
const after = log.slice(before).map(l => l.path.split('/').pop());
check(after[0] === 'LctrumHomeStdInfo.do' && tab.url().includes('BoardViewStdPage.do'), `open: ${after.join(' → ')} → ${new URL(tab.url()).pathname}`);
await tab.close();

// normal page browsing must not be rewritten
const browse = await context.newPage();
await browse.goto('https://klas.kw.ac.kr/std/cmn/frame/Frame.do');
const nav = log.filter(l => l.path === '/std/cmn/frame/Frame.do').pop();
check(nav && nav.origin === undefined, 'tab navigation headers untouched');

await context.close();
server.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall e2e checks passed');
process.exit(failures.length ? 1 : 0);
