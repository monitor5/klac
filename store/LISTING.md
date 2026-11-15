# Chrome Web Store 등록 정보

Developer Dashboard의 각 칸에 그대로 붙여 넣는 문구입니다. 요약(summary)과 이름은 `_locales/*/messages.json`에서 자동으로 들어갑니다.

- **Category**: Education (교육)
- **Language**: 한국어(기본), English
- **Homepage URL**: https://github.com/monitor5/klac
- **Support URL**: https://github.com/monitor5/klac/issues
- **Privacy policy URL**: https://monitor5.github.io/klac/privacy.html
- **Visibility**: 처음에는 Unlisted(링크가 있는 사람만) 권장. 아래 SUBMIT.md 참고.

## 이미지

| 칸 | 파일 |
| --- | --- |
| Store icon (128x128) | `icons/icon128.png` |
| Screenshots 1280x800 (한국어) | `store/images/screenshot-ko-1..5-*.png` |
| Screenshots 1280x800 (English) | `store/images/screenshot-en-1..5-*.png` |
| Small promo tile 440x280 | `store/images/promo-small-440x280.png` |
| Marquee promo tile 1400x560 (선택) | `store/images/promo-marquee-1400x560.png` |

이미지는 `node scripts/store-images.mjs`로 `docs/images`에서 다시 만들 수 있습니다.

---

## 상세 설명 (한국어)

```
KLAP은 KLAS의 과제, 공지, 온라인 강의 마감을 Chrome 툴바 팝업 하나로 모아 보여주는 비공식 도우미입니다.

KLAS에서 마감을 확인하려면 과목마다 강의실에 들어가 메뉴를 하나씩 눌러야 합니다. KLAP은 전 과목의 정보를 한 화면에 모읍니다.

주요 기능
• 마감: 미제출 과제와 아직 듣지 않은 온라인 강의를 마감 순서(오늘 / 3일 이내 / 그 이후)로 정리
• 과목: 과목별 미제출 과제, 미수강 강의, 새 공지 개수 요약과 강의실 바로가기
• 과제·공지: 목록과 상세 내용을 팝업에서 바로 확인
• 강의: 주차별 온라인 강의 진도 확인
• 시간표: 이번 학기 시간표
• 알림: 새 공지가 올라오거나 마감이 24시간 남으면 Chrome 알림 (설정에서 끌 수 있음)

개인정보
• KLAS 아이디·비밀번호를 묻거나 저장하지 않습니다. 브라우저에 이미 로그인된 KLAS 세션만 사용합니다.
• 모든 데이터는 내 브라우저에만 저장되며, 개발자나 제3자 서버로 전송하지 않습니다.
• 접속하는 곳은 klas.kw.ac.kr 하나뿐입니다.

사용 방법
1. Chrome에서 KLAS(klas.kw.ac.kr)에 로그인합니다.
2. 툴바의 KLAP 아이콘을 누릅니다.

안내
KLAP은 광운대학교와 제휴하거나 승인받지 않은 비공식 도구입니다. KLAS 화면이나 API가 바뀌면 일부 기능이 동작하지 않을 수 있습니다. 소스 코드는 GitHub(monitor5/klac)에 MIT 라이선스로 공개되어 있으며, KLAP-cli(MIT)의 코드를 바탕으로 합니다.
```

## Detailed description (English)

```
KLAP is an unofficial helper that gathers your KLAS assignments, notices and online lecture deadlines into a single Chrome toolbar popup.

Checking deadlines in KLAS means opening each course room and clicking through every menu. KLAP puts all of your courses on one screen.

Features
• Due: unsubmitted assignments and unwatched online lectures, sorted by deadline (today / within 3 days / later)
• Courses: per-course counts of pending assignments, lectures and new notices, with a shortcut to each course room
• Assignments & notices: lists and full details right in the popup
• Lectures: weekly online lecture progress
• Timetable: this term's schedule
• Alerts: Chrome notifications for new notices and deadlines within 24 hours (can be turned off)

Privacy
• Never asks for or stores your KLAS ID or password. It only uses the KLAS session you are already signed in to in Chrome.
• All data stays in your browser. Nothing is sent to the developer or any third party.
• The only site it contacts is klas.kw.ac.kr.

How to use
1. Sign in to KLAS (klas.kw.ac.kr) in Chrome.
2. Click the KLAP icon in the toolbar.

Note
KLAP is not affiliated with or endorsed by Kwangwoon University. Some features may break if KLAS changes. Source code is available on GitHub (monitor5/klac) under the MIT License, based on KLAP-cli (MIT).
```

---

## Privacy practices 탭

### Single purpose (단일 목적)

```
Shows the signed-in user's KLAS (Kwangwoon University LMS) assignments, notices, online lectures and timetable in one popup, and alerts the user about new notices and upcoming deadlines.
```

### Permission justification

| Permission | Justification (붙여 넣을 문구) |
| --- | --- |
| `storage` | Caches the user's KLAS course data, settings, and the list of notices/alerts already shown, locally on the device, so the popup opens instantly and alerts are not repeated. |
| `alarms` | Refreshes KLAS data periodically (default every 30 minutes, user-configurable) so deadline and new-notice alerts are delivered on time. |
| `notifications` | Shows a Chrome notification when a new course notice is posted or an assignment/online lecture is due within 24 hours. Can be turned off in settings. |
| `declarativeNetRequestWithHostAccess` | KLAS rejects requests whose Origin is chrome-extension://. A session rule sets Origin/Referer to klas.kw.ac.kr only for requests the extension itself makes (tabIds: [-1]) to klas.kw.ac.kr. Pages the user browses are not modified. |
| Host `https://klas.kw.ac.kr/*` | The extension's only data source: it reads the user's own course list, assignments, notices, lectures and timetable from KLAS using the existing signed-in session. No other host is accessed. |

### Remote code

```
No, I am not using remote code.
```
(모든 JS는 패키지 안에 있고, `eval`/원격 script를 쓰지 않습니다.)

### Data usage (체크 항목)

- 수집하는 데이터 종류: **Website content** 만 체크 (KLAS의 과목·과제·공지 내용. 기기 안에서만 처리)
  - 나머지(Personally identifiable information, Health, Financial, Authentication information, Personal communications, Location, Web history, User activity)는 체크하지 않음
  - 참고: Chrome 정책상 "수집"은 기기 밖으로 보내지 않아도 확장이 다루는 데이터를 포함하므로 Website content는 체크하는 편이 안전합니다.
- 세 가지 인증 문구 모두 체크:
  - I do not sell or transfer user data to third parties, outside of the approved use cases
  - I do not use or transfer user data for purposes that are unrelated to my item's single purpose
  - I do not use or transfer user data to determine creditworthiness or for lending purposes
