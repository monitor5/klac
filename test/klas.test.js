import test from 'node:test';
import assert from 'node:assert/strict';
import * as K from '../src/klas.js';
import { dueItems } from '../src/views.js';
import * as F from './fixtures.js';

test('parseDateTime treats KLAS local times as KST', () => {
  assert.equal(K.parseDateTime('2026-10-29 23:59:00'), Date.parse('2026-10-29T14:59:00Z'));
  assert.equal(K.parseDateTime('2026-10-29 09:00'), Date.parse('2026-10-29T00:00:00Z'));
  assert.equal(K.parseDateTime('2026-10-29T00:00:00Z'), Date.parse('2026-10-29T00:00:00Z'));
  assert.equal(K.parseDateTime(''), null);
});

test('terms drop empty courses and normalize labels', () => {
  const terms = K.normalizeTerms(F.terms);
  assert.equal(terms[0].courses.length, 2);
  assert.deepEqual(terms[0].courses[0], { name: '운영체제 (0000-1-1111-01)', id: 'U2026201234' });
  assert.equal(K.termLabel('', '2026,3'), '2026년도 여름학기');
});

test('assignments normalize numeric ids and submit flag', () => {
  const list = K.normalizeAssignments(F.assignments.U2026201234);
  assert.equal(list[0].ordseq, '3');
  assert.equal(list[0].submitted, false);
  assert.equal(list[1].submitted, true);
});

test('lectures exclude proj rows and other courses', () => {
  const list = K.normalizeLectures(F.lectures.U2026201234, 'U2026201234');
  assert.equal(list.length, 2);
  assert.equal(list[0].key, 'abc123def456');
  assert.equal(list[0].progress, 40);
  assert.equal(K.lectureNeedsAttendance(list[0]), true);
  assert.equal(K.lectureNeedsAttendance(list[1]), false);
});

test('kwcommons content id extraction matches CLI markers', () => {
  assert.equal(K.kwcommonsContentID('', 'https://kwcommons.kw.ac.kr/em/6a1b2c?x=1'), '6a1b2c');
  assert.equal(K.kwcommonsContentID("javascript:play('https://x/viewer?content_id=ABC_1&amp;y=2')"), 'ABC_1');
});

test('timetable expands weekday columns', () => {
  const tt = K.normalizeTimetable(F.timetable);
  assert.equal(tt.length, 2);
  assert.deepEqual([tt[0].weekday, tt[0].period, tt[0].span], [1, 1, 2]);
  assert.equal(tt[1].room, '참빛관 302');
});

test('htmlToText keeps list structure', () => {
  assert.equal(K.htmlToText('<p>A</p><ul><li>x</li><li>y</li></ul>&amp;'), 'A\n\n- x\n- y\n&');
});

test('common error detection', () => {
  assert.throws(() => K.checkCommonError({ loginRequired: true }), e => e.kind === 'session');
  assert.throws(() => K.checkCommonError({ errorCount: 1, fieldErrors: [{ message: '권한 없음' }] }), /권한 없음/);
  assert.equal(K.looksLikeLoginHTML('<html><form action="/usr/cmn/login/LoginConfirm.do">'), true);
  assert.equal(K.looksLikeLoginHTML('[]'), false);
});

function fakeFetch(log) {
  let selected = '';
  return async (url, init) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(init.body);
    log.push(path.split('/').pop());
    const json = value => ({ ok: true, status: 200, url, text: async () => JSON.stringify(value) });
    if (path.endsWith('LctrumHomeStdInfo.do')) { await new Promise(r => setTimeout(r, 5)); selected = body.selectSubj; return json({}); }
    if (path.endsWith('TaskStdList.do')) { assert.equal(body.selectSubj, selected); return json(F.assignments[selected]); }
    if (path.endsWith('BoardStdList.do')) return json(F.notices[selected]);
    if (path.endsWith('SelectOnlineCntntsStdList.do')) return json(F.lectures[selected]);
    if (path.endsWith('YearhakgiAtnlcSbjectList.do')) return { ok: true, status: 200, url, text: async () => '<html>login</html>' };
    throw new Error(path);
  };
}

test('course bundles serialize the server-side course context', async () => {
  const log = [];
  const client = new K.KlasClient(fakeFetch(log));
  const [a, b] = await Promise.all([client.courseBundle(F.TERM, 'U2026201234'), client.courseBundle(F.TERM, 'U2026205678')]);
  assert.equal(a.assignments.value.length, 2);
  assert.equal(b.assignments.value[0].title, 'TCP 실습');
  assert.deepEqual(log.slice(0, 5), ['LctrumHomeStdInfo.do', 'TaskStdList.do', 'BoardStdList.do', 'SelectOnlineCntntsStdList.do', 'LctrumHomeStdInfo.do']);
  await assert.rejects(client.terms(), e => e.kind === 'session');
});

test('dueItems merges unsubmitted assignments and pending lectures by deadline', () => {
  const snapshot = { courses: [
    { id: 'U2026201234', name: '운영체제', assignments: { value: K.normalizeAssignments(F.assignments.U2026201234) }, lectures: { value: K.normalizeLectures(F.lectures.U2026201234, 'U2026201234') } },
    { id: 'U2026205678', name: '네트워크', assignments: { value: K.normalizeAssignments(F.assignments.U2026205678) }, lectures: { value: [] } },
  ] };
  const items = dueItems(snapshot, 14);
  assert.deepEqual(items.map(i => i.title), ['스케줄러 구현', '9주차 가상메모리', 'TCP 실습']);
  assert.equal(dueItems(snapshot, 1).length, 1);
});
