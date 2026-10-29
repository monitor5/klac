// KLAS API client. Endpoints and payloads follow klap-cli internal/klas.
// Ported from KLAP-cli (https://github.com/leehyowon14/KLAP-cli),
// MIT License, Copyright (c) 2026 KLAP contributors. See THIRD_PARTY_NOTICES.md.
export const BASE = 'https://klas.kw.ac.kr';

const NOTICE_ROUTE = '/std/lis/sport/d052b8f845784c639f036b102fdc3023';
const MATERIAL_ROUTE = '/std/lis/sport/6972896bfe72408eb72926780e85d041';

export class KlasError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // network | http | session | remote | schema
  }
}

export function looksLikeLoginHTML(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('<')) return false;
  const lower = trimmed.toLowerCase();
  return lower.includes('<html') || lower.includes('loginform.do') || lower.includes('/usr/cmn/login');
}

export function checkCommonError(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  if (value.loginRequired === true) throw new KlasError('session', 'KLAS 로그인이 필요합니다.');
  if (Number(value.errorCount) > 0) {
    const message = (value.fieldErrors || []).map(e => e && e.message).find(m => m && m.trim());
    throw new KlasError('remote', message || 'KLAS API 오류가 발생했습니다.');
  }
}

export function str(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

const KST_OFFSET = '+09:00';

// "2026-10-29 23:59:00", "2026-10-29 23:59", or RFC3339 → epoch ms.
export function parseDateTime(value) {
  const text = str(value);
  if (!text) return null;
  const local = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (local) {
    const [, y, mo, d, h, mi, s = '00'] = local;
    return Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}${KST_OFFSET}`);
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseLectureDateTime(dateTime, compactDate, hour, minute) {
  const parsed = parseDateTime(dateTime);
  if (parsed !== null) return parsed;
  const date = str(compactDate);
  if (!/^\d{8}$/.test(date)) return null;
  const h = (str(hour) || '00').padStart(2, '0');
  const m = (str(minute) || '00').padStart(2, '0');
  return parseDateTime(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${h}:${m}`);
}

export function splitTerm(value) {
  const parts = str(value).split(/[,-]/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  if (parts.length === 1 && parts[0].length >= 5) return [parts[0].slice(0, 4), parts[0].slice(4)];
  return [str(value), ''];
}

export function termLabel(label, value) {
  const [year, hakgi] = splitTerm(value);
  if (hakgi === '3') return `${year}년도 여름학기`;
  if (hakgi === '4') return `${year}년도 겨울학기`;
  return str(label) || `${year}년도 ${hakgi}학기`;
}

export function htmlToText(html) {
  return str(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>\s*<t[dh](\s+[^>]*)?>/gi, ' ')
    .replace(/<li(\s+[^>]*)?>/gi, '\n- ')
    .replace(/<\/?(p|div|section|article|header|footer|h[1-6]|ul|ol|table|thead|tbody|tr)(\s+[^>]*)?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- normalizers (pure, tested) ----------

export function normalizeTerms(response) {
  if (!Array.isArray(response)) throw new KlasError('schema', '수업 목록 응답 형식이 올바르지 않습니다.');
  return response.map(item => ({
    value: str(item.value),
    label: termLabel(item.label, item.value),
    courses: (item.subjList || [])
      .filter(c => str(c.name) && str(c.value))
      .map(c => ({ name: str(c.name), id: str(c.value) })),
  }));
}

export function normalizeAssignments(response) {
  if (!Array.isArray(response)) throw new KlasError('schema', '과제 목록 응답 형식이 올바르지 않습니다.');
  return response
    .filter(item => str(item.ordseq))
    .map(item => ({
      ordseq: str(item.ordseq),
      weeklyseq: str(item.weeklyseq),
      weeklysubseq: str(item.weeklysubseq),
      title: str(item.title) || '제목 없음',
      startAt: parseDateTime(item.startdate),
      dueAt: parseDateTime(item.expiredate),
      submitted: str(item.submityn).toUpperCase() === 'Y',
    }));
}

export function normalizeAssignmentDetail(response) {
  const rpt = response && response.rpt;
  const smt = (response && response.smt) || {};
  if (!rpt || (!str(rpt.title) && !str(rpt.contents))) throw new KlasError('schema', '과제 상세 응답에 본문이 없습니다.');
  const score = smt.finalscore;
  return {
    title: str(rpt.title) || '제목 없음',
    content: htmlToText(rpt.contents),
    startAt: parseDateTime(rpt.startdate),
    dueAt: parseDateTime(rpt.expiredate),
    submitted: str(rpt.submityn).toUpperCase() === 'Y',
    type: { 1: '개인', P: '개인', 2: '팀' }[str(rpt.reptype)] || str(rpt.reptype),
    fileLimitMB: str(rpt.filelimit),
    submittedTitle: str(smt.title),
    submittedText: htmlToText(smt.contents),
    score: score === undefined || score === null ? '' : str(score),
    feedback: htmlToText(smt.tutorcontents),
  };
}

export function normalizeBoardList(response) {
  if (!response || !Array.isArray(response.list)) throw new KlasError('schema', '게시판 목록 응답 형식이 올바르지 않습니다.');
  const totalPages = Math.max(1, parseInt(str(response.page && response.page.totalPages), 10) || 1);
  const posts = response.list
    .filter(item => str(item.boardNo) && str(item.masterNo))
    .map(item => ({
      boardNo: str(item.boardNo),
      masterNo: str(item.masterNo),
      title: str(item.title) || '제목 없음',
      author: str(item.userNm),
      registeredAt: parseDateTime(item.registDt),
      pinned: str(item.topAt).toUpperCase() === 'Y',
      readCount: str(item.readCnt),
      fileCount: parseInt(str(item.fileCnt), 10) || 0,
    }));
  return { posts, totalPages };
}

export function normalizeBoardPost(response) {
  const board = response && response.board;
  if (!board || (!str(board.title) && !str(board.content))) throw new KlasError('schema', '게시글 상세 응답에 본문이 없습니다.');
  return {
    title: str(board.title) || '제목 없음',
    author: str(board.userNm),
    registeredAt: parseDateTime(board.registDt),
    content: htmlToText(board.content),
  };
}

// Mirrors klap-cli kwcommons.ExtractKWCommonsContentID.
export function kwcommonsContentID(...links) {
  for (const link of links) {
    const text = str(link).replace(/&amp;/g, '&');
    for (const marker of ['/em/', 'em/', 'content_id=', 'contentId=', 'contentID=', 'contents=']) {
      const index = text.indexOf(marker);
      if (index < 0) continue;
      let id = text.slice(index + marker.length).split(/[&?#/'") ]/)[0];
      try { id = decodeURIComponent(id); } catch {}
      if (id.trim()) return id.trim();
    }
  }
  return '';
}

export function normalizeLectures(response, courseId) {
  if (!Array.isArray(response)) throw new KlasError('schema', '강의 목록 응답 형식이 올바르지 않습니다.');
  return response
    .filter(item => str(item.evltnSe).toLowerCase() !== 'proj')
    .filter(item => !str(item.subj) || !courseId || str(item.subj) === courseId)
    .map(item => {
      const contentId = kwcommonsContentID(item.mvpLink, item.starting);
      const learningSeq = str(item.lrnSn);
      return {
        key: contentId || (learningSeq ? `lrn-${learningSeq}` : `${str(item.weekNo)}-${str(item.lesson)}-${str(item.oid)}`),
        week: str(item.weekNo),
        title: str(item.sbjt) || '제목 없음',
        moduleTitle: str(item.moduletitle),
        progress: Number.isFinite(Number(str(item.prog))) && str(item.prog) !== '' ? Number(str(item.prog)) : null,
        requiredTime: str(item.rcognTime) || str(item.totRcognTime) || str(item.ptime),
        achievedTime: str(item.achivTime) || str(item.learnTime) || str(item.totAchivTime),
        startAt: parseLectureDateTime(item.startDate, item.sdateY, item.sdateH, item.sdateM),
        endAt: parseLectureDateTime(item.endDate, item.edateY, item.edateH, item.edateM),
        isActivity: !contentId && !!learningSeq,
        playable: !!contentId || ['grcode', 'subj', 'year', 'hakgi', 'bunban', 'oid'].every(f => str(item[f])),
      };
    });
}

// Mirrors klap-cli app.lectureNeedsAttendance.
export function lectureNeedsAttendance(lecture, now = Date.now()) {
  if (lecture.startAt !== null && now < lecture.startAt) return false;
  if (lecture.endAt !== null && now > lecture.endAt) return false;
  if (lecture.isActivity) {
    const done = Number(lecture.achievedTime), need = Number(lecture.requiredTime);
    return !(Number.isFinite(done) && Number.isFinite(need) && need > 0 && done >= need);
  }
  if (lecture.progress !== null && lecture.progress >= 100) return false;
  return lecture.playable;
}

export function normalizeTimetable(response) {
  if (!Array.isArray(response)) throw new KlasError('schema', '시간표 응답 형식이 올바르지 않습니다.');
  const entries = [];
  for (const row of response) {
    if (str(row.wtHasSchedule).toUpperCase() !== 'Y') continue;
    const period = parseInt(str(row.wtTime), 10);
    if (!Number.isFinite(period)) continue;
    for (let weekday = 1; weekday <= 6; weekday++) {
      const id = str(row[`wtSubj_${weekday}`]);
      const name = str(row[`wtSubjNm_${weekday}`]) || id;
      if (!name) continue;
      const room = str(row[`wtLocHname_${weekday}`]);
      entries.push({
        courseId: id, name, weekday, period,
        span: Math.max(1, parseInt(str(row[`wtSpan_${weekday}`]), 10) || 1),
        room, professor: str(row[`wtProfNm_${weekday}`]),
        online: period > 8 || !room,
      });
    }
  }
  return entries;
}

// ---------- page URLs ----------

export function assignmentURL(term, courseId, ordseq) {
  const q = new URLSearchParams({ selectYearhakgi: term, selectSubj: courseId, ordseq });
  return `${BASE}/std/lis/evltn/TaskViewStdPage.do?${q}`;
}

export function noticeURL(term, courseId, boardNo, masterNo) {
  const q = new URLSearchParams({ selectYearhakgi: term, selectSubj: courseId, boardNo, masterNo });
  return `${BASE}${NOTICE_ROUTE}/BoardViewStdPage.do?${q}`;
}

export const PAGES = {
  home: `${BASE}/std/cmn/frame/Frame.do`,
  lectures: `${BASE}/std/lis/evltn/OnlineCntntsStdPage.do`,
  assignments: `${BASE}/std/lis/evltn/TaskStdPage.do`,
  notices: `${BASE}${NOTICE_ROUTE}/BoardListStdPage.do`,
  materials: `${BASE}${MATERIAL_ROUTE}/BoardListStdPage.do`,
  courseHome: `${BASE}/std/lis/evltn/LctrumHomeStdPage.do`,
  login: `${BASE}/usr/cmn/login/LoginForm.do`,
};

// ---------- client ----------

export class KlasClient {
  constructor(fetchImpl = (...args) => fetch(...args)) {
    this.fetch = fetchImpl;
    // KLAS keeps the selected course in the server session, so a context
    // switch and the request that depends on it must not interleave.
    this.lock = Promise.resolve();
  }

  exclusive(task) {
    const run = this.lock.then(task, task);
    this.lock = run.catch(() => {});
    return run;
  }

  async post(path, payload) {
    let response;
    try {
      response = await this.fetch(BASE + path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(payload ?? {}),
      });
    } catch (error) {
      throw new KlasError('network', `KLAS 요청 실패: ${error.message}`);
    }
    if (!response.ok) throw new KlasError('http', `KLAS HTTP 오류: ${response.status}`);
    const text = await response.text();
    if (looksLikeLoginHTML(text) || /\/usr\/cmn\/login/i.test(response.url || '')) {
      throw new KlasError('session', 'KLAS 로그인이 필요합니다.');
    }
    let value;
    try { value = JSON.parse(text); } catch { throw new KlasError('schema', 'KLAS 응답을 읽을 수 없습니다.'); }
    checkCommonError(value);
    return value;
  }

  async terms() {
    return normalizeTerms(await this.post('/std/cmn/frame/YearhakgiAtnlcSbjectList.do', {}));
  }

  setCourse(term, courseId) {
    return this.post('/std/lis/evltn/LctrumHomeStdInfo.do', { selectYearhakgi: term, selectSubj: courseId, selectChangeYn: 'Y' });
  }

  // Runs fn while the server-side course context is pinned to courseId.
  withCourse(term, courseId, fn) {
    return this.exclusive(async () => {
      await this.setCourse(term, courseId);
      return fn();
    });
  }

  async assignmentsRaw(term, courseId) {
    return normalizeAssignments(await this.post('/std/lis/evltn/TaskStdList.do', { selectYearhakgi: term, selectSubj: courseId, currentPage: 0 }));
  }

  async boardRaw(route, term, courseId, maxPages = 3) {
    const posts = [];
    const seen = new Set();
    for (let page = 0; page < maxPages; page++) {
      const result = normalizeBoardList(await this.post(`${route}/BoardStdList.do`, {
        selectYearhakgi: term, selectSubj: courseId, currentPage: page, searchCondition: 'ALL', searchKeyword: null,
      }));
      for (const post of result.posts) {
        const key = `${post.boardNo}:${post.masterNo}`;
        if (seen.has(key)) continue;
        seen.add(key);
        posts.push(post);
      }
      if (page >= result.totalPages - 1) break;
    }
    return posts;
  }

  async lecturesRaw(courseId) {
    return normalizeLectures(await this.post('/std/lis/evltn/SelectOnlineCntntsStdList.do', {}), courseId);
  }

  // Everything the popup shows for one course, under a single context switch.
  courseBundle(term, courseId) {
    return this.withCourse(term, courseId, async () => {
      const settle = p => p.then(value => ({ value }), error => ({ error: error.message, kind: error.kind }));
      const assignments = await settle(this.assignmentsRaw(term, courseId));
      const notices = await settle(this.boardRaw(NOTICE_ROUTE, term, courseId));
      const lectures = await settle(this.lecturesRaw(courseId));
      for (const part of [assignments, notices, lectures]) {
        if (part.kind === 'session') throw new KlasError('session', part.error);
      }
      return { assignments, notices, lectures };
    });
  }

  assignmentDetail(term, courseId, ordseq) {
    return this.withCourse(term, courseId, async () =>
      normalizeAssignmentDetail(await this.post('/std/lis/evltn/TaskStdView.do', { selectYearhakgi: term, selectSubj: courseId, ordseq })));
  }

  noticeDetail(term, courseId, boardNo, masterNo) {
    return this.withCourse(term, courseId, async () =>
      normalizeBoardPost(await this.post(`${NOTICE_ROUTE}/BoardStdView.do`, {
        selectYearhakgi: term, selectSubj: courseId, boardNo, masterNo, cmd: 'select',
      })));
  }

  async timetable(term) {
    const [year, hakgi] = splitTerm(term);
    return normalizeTimetable(await this.post('/std/cps/atnlc/TimetableStdList.do', { searchYear: year, searchHakgi: hakgi, searchPgmNo: '' }));
  }
}
