// Sanitized payload shapes, modeled on klap-cli fixtures and adapter tests.
const now = Date.now();
const kst = ms => {
  const d = new Date(ms + 9 * 3600000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00`;
};
const H = 3600000, D = 24 * H;
export const TERM = '2026,2';
export const terms = [
  { label: '2026년도 2학기', value: TERM, subjList: [
    { name: '운영체제 (0000-1-1111-01)', value: 'U2026201234' },
    { name: '컴퓨터네트워크 (0000-1-2222-01)', value: 'U2026205678' },
    { name: '', value: 'skip-me' },
  ] },
  { label: '2026년도 1학기', value: '2026,1', subjList: [] },
];
export const assignments = {
  U2026201234: [
    { ordseq: 3, weeklyseq: 5, weeklysubseq: 0, title: '스케줄러 구현', startdate: kst(now - 5 * D), expiredate: kst(now + 10 * H), submityn: 'N' },
    { ordseq: 2, weeklyseq: 3, weeklysubseq: 0, title: '프로세스 보고서', startdate: kst(now - 20 * D), expiredate: kst(now - 2 * D), submityn: 'Y' },
  ],
  U2026205678: [
    { ordseq: '7', title: 'TCP 실습', startdate: kst(now - D), expiredate: kst(now + 5 * D), submityn: 'N' },
  ],
};
export const notices = {
  U2026201234: { list: [
    { boardNo: 11, masterNo: 1, title: '중간고사 안내', userNm: '김교수', registDt: kst(now - D), topAt: 'Y', readCnt: 40, fileCnt: 1 },
    { boardNo: 10, masterNo: 1, title: '휴강 공지', userNm: '김교수', registDt: kst(now - 30 * D), topAt: 'N', readCnt: 90, fileCnt: 0 },
  ], page: { currentPage: 0, totalPages: 1 } },
  U2026205678: { list: [], page: { totalPages: 1 } },
};
const lecture = (subj, extra) => ({ grcode: 'N000003', subj, year: '2026', hakgi: '2', bunban: '01', module: '1', lesson: '1', oid: 'o1', ptime: '1800', weekNo: '9', weeklyseq: '0', ...extra });
export const lectures = {
  U2026201234: [
    lecture('U2026201234', { sbjt: '9주차 가상메모리', prog: '40', startDate: kst(now - 3 * D), endDate: kst(now + 2 * D), mvpLink: 'https://kwcommons.kw.ac.kr/em/abc123def456' }),
    lecture('U2026201234', { sbjt: '8주차 페이징', prog: '100', startDate: kst(now - 10 * D), endDate: kst(now + 2 * D), mvpLink: 'https://kwcommons.kw.ac.kr/em/zzz' }),
    { evltnSe: 'proj', sbjt: '과제 항목', subj: 'U2026201234' },
    lecture('U2026205678', { sbjt: '다른 과목 행', prog: '0' }),
  ],
  U2026205678: [],
};
export const timetable = [
  { wtTime: 1, wtHasSchedule: 'Y', wtSubj_1: 'U2026201234', wtSubjNm_1: '운영체제', wtLocHname_1: '새빛관 101', wtSpan_1: 2, wtProfNm_1: '김교수' },
  { wtTime: 2, wtHasSchedule: 'Y' },
  { wtTime: 3, wtHasSchedule: 'Y', wtSubj_3: 'U2026205678', wtSubjNm_3: '컴퓨터네트워크', wtLocHname_3: '참빛관 302', wtSpan_3: 1 },
  { wtTime: 4, wtHasSchedule: 'N' },
];
export const assignmentDetail = { rpt: { ordseq: 3, title: '스케줄러 구현', contents: '<p>RR 스케줄러를 구현하라.</p><ul><li>C 언어</li><li>보고서 포함</li></ul>', startdate: kst(now - 5 * D), expiredate: kst(now + 10 * H), reptype: '1', submityn: 'N', filelimit: 20 }, smt: {} };
export const noticeDetail = { board: { boardNo: 11, masterNo: 1, title: '중간고사 안내', content: '시험은 <b>10/30</b> 입니다.<br>범위: 1~8주차', userNm: '김교수', registDt: kst(now - D) } };
