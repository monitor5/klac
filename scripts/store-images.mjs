// Renders Chrome Web Store images from docs/images into store/images.
//   node scripts/store-images.mjs   (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'store', 'images');
mkdirSync(out, { recursive: true });
const img = name => `data:image/png;base64,${readFileSync(join(root, name)).toString('base64')}`;

const shots = [
  { file: 'due', images: ['due'],
    ko: ['마감이 먼저 보입니다', '미제출 과제와 아직 안 들은 온라인 강의를 전 과목에서 모아 마감 순서대로 보여줍니다.'],
    en: ['Deadlines first', 'Unsubmitted assignments and unwatched online lectures from every course, sorted by due date.'] },
  { file: 'courses', images: ['courses'],
    ko: ['과목별 현황을 한 화면에', '과목마다 미제출 과제, 미수강 강의, 새 공지 개수를 요약하고 강의실로 바로 이동합니다.'],
    en: ['Every course at a glance', 'Pending assignments, lectures and new notices per course, with a shortcut to each course room.'] },
  { file: 'assignments', images: ['assignments', 'assignment-detail'],
    ko: ['과제 목록과 상세', '제출 여부와 마감일을 확인하고, 과제 내용을 팝업에서 바로 읽습니다.'],
    en: ['Assignments and details', 'Check submission status and due dates, and read the assignment right in the popup.'] },
  { file: 'notices', images: ['notices'],
    ko: ['새 공지는 알림으로', '새 공지가 올라오거나 마감이 24시간 남으면 Chrome 알림을 보냅니다.'],
    en: ['New notices, notified', 'Get a Chrome notification for new notices and for deadlines within 24 hours.'] },
  { file: 'timetable', images: ['timetable', 'lectures'],
    ko: ['시간표와 온라인 강의 진도', '이번 학기 시간표와 주차별 온라인 강의 진도를 확인합니다.'],
    en: ['Timetable and lecture progress', "This term's timetable and weekly online lecture progress."] },
];

const css = `*{margin:0;box-sizing:border-box}body{font-family:'Noto Sans CJK KR','Noto Sans KR',system-ui,sans-serif;color:#fff;
background:radial-gradient(120% 120% at 0% 0%,#c2185b 0%,#8b1538 45%,#3d0a1c 100%);overflow:hidden}
.k{width:72px;height:72px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center;color:#8b1538;font:900 46px system-ui}
.shot{border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.35);background:#fff;display:block}`;

function screenshotHTML(s, lang) {
  const [title, body] = s[lang];
  const scale = s.images.length > 1 ? 0.98 : 1.18;
  const imgs = s.images.map((n, i) => `<img class="shot" src="${img(`docs/images/${n}.png`)}" style="width:${420 * scale}px;${i ? 'margin-left:-40px;margin-top:90px' : ''}">`).join('');
  return `<style>${css}</style><div style="display:flex;width:1280px;height:800px;align-items:center;padding:0 64px;gap:48px">
<div style="flex:1;min-width:360px;word-break:keep-all"><div class="k">K</div><h1 style="font-size:46px;line-height:1.25;margin:36px 0 20px;font-weight:800;letter-spacing:-.5px">${title}</h1>
<p style="font-size:22px;line-height:1.6;opacity:.88">${body}</p></div><div style="display:flex;align-items:flex-start">${imgs}</div></div>`;
}

const promo = (w, h, big) => `<style>${css}</style><div style="width:${w}px;height:${h}px;display:flex;flex-direction:column;justify-content:center;padding:0 ${big ? 90 : 36}px">
<div style="display:flex;align-items:center;gap:${big ? 28 : 16}px"><div class="k" style="${big ? '' : 'width:56px;height:56px;font-size:36px;border-radius:14px'}">K</div>
<div style="font-size:${big ? 96 : 52}px;font-weight:900;letter-spacing:-1px">KLAP</div></div>
<div style="font-size:${big ? 34 : 21}px;font-weight:700;margin-top:${big ? 28 : 18}px">KLAS 마감·공지·강의를 툴바 하나로</div>
<div style="font-size:${big ? 22 : 14}px;opacity:.75;margin-top:10px">비공식 수강 관리 도우미 · Unofficial</div></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(html, w, h, name) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html);
  await page.waitForLoadState('load');
  await page.screenshot({ path: join(out, name), type: 'png' });
  console.log(name);
}
for (const [i, s] of shots.entries()) for (const lang of ['ko', 'en']) await render(screenshotHTML(s, lang), 1280, 800, `screenshot-${lang}-${i + 1}-${s.file}.png`);
await render(promo(440, 280, false), 440, 280, 'promo-small-440x280.png');
await render(promo(1400, 560, true), 1400, 560, 'promo-marquee-1400x560.png');
await browser.close();
