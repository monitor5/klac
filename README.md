# KLAP Chrome Extension

광운대 KLAS 수강 관리를 브라우저에서 바로 하는 Manifest V3 확장 프로그램입니다. [KLAP-cli](https://github.com/leehyowon14/KLAP-cli)(MIT License)의 KLAS adapter(endpoint·payload·마감 판정 규칙)를 JavaScript로 옮겼고, 강의 뷰어 자동 진도 기능은 KLAP-cli의 `chrome-extension/`을 그대로 가져왔습니다. 자세한 출처는 [라이선스와 출처](#라이선스와-출처)를 보세요.

## 기능

| 탭 | 내용 | CLI 대응 |
| --- | --- | --- |
| 마감 | 미제출 과제와 미수강 온라인 강의를 마감순으로 합쳐 표시 (오늘 / 3일 이내 / 4일 이후) | `klap due` |
| 과목 | 과목별 미제출 과제·미수강 강의·새 공지 수, 강의실 바로가기 | `klap dashboard` |
| 과제 | 과목별 과제 목록, 상세(본문·제출물·점수·피드백) | `klap assignment list/detail/open` |
| 공지 | 전 과목 공지 최신순, 상세 본문 | `klap notice list/detail/open` |
| 강의 | 온라인 강의 진도·수강 기간 | `klap lecture status` |
| 시간표 | 주간 시간표, 칸 클릭 시 강의실 열기 | `klap timetable` |

- **배지/알림**: 30분(설정 가능)마다 백그라운드 갱신. 3일 이내 마감 개수를 아이콘 배지로, 새 공지와 마감 24시간 전 항목을 Chrome 알림으로 보냅니다. 알림을 누르면 해당 KLAS 페이지가 열립니다.
- **강의 뷰어 자동 진도**: KLAS 강의 뷰어에 기존 `chrome-extension/`의 자동 진도 갱신 패널이 그대로 포함됩니다.
- **학기 선택**: 상단에서 지난 학기로 바꿀 수 있습니다.
- **새 탭 보기**: ⤢ 버튼으로 팝업을 넓은 화면에서 엽니다.

## 설치

1. `chrome://extensions` → **개발자 모드** 켜기
2. **압축해제된 확장 프로그램을 로드합니다** → 이 폴더(`manifest.json`이 있는 폴더) 선택
3. 브라우저에서 KLAS에 로그인한 뒤 툴바의 KLAP 아이콘 클릭

## 동작 방식과 주의점

- 비밀번호를 받거나 저장하지 않습니다. 브라우저에 로그인된 KLAS 세션 쿠키를 그대로 사용하며, 세션이 만료되면 팝업이 로그인 버튼을 보여줍니다.
- KLAS는 “선택 과목”을 서버 세션에 저장합니다(`LctrumHomeStdInfo.do`). 확장은 과목별로 컨텍스트를 바꾼 뒤 조회하므로 요청을 직렬화하며, 그 사이 열어 둔 KLAS 탭의 선택 과목이 바뀔 수 있습니다. 해당 탭은 새로고침하세요.
- 확장 service worker의 요청에만 `Origin`/`Referer`를 KLAS로 맞추는 `declarativeNetRequest` 세션 규칙을 씁니다(`tabIds: [-1]`). 일반 탭 탐색은 건드리지 않습니다.
- 공지는 과목당 최근 3페이지까지만 가져옵니다.
- 데이터는 `chrome.storage.local`에 5분 캐시됩니다.

## 구조

```
manifest.json
src/klas.js        KLAS API client + 응답 정규화 (internal/klas 포팅)
src/views.js       마감 목록 계산 (klap due)
src/background.js  service worker: 캐시, 직렬화, 알람, 배지, 알림, 헤더 규칙, 뷰어 메시지
popup/             팝업 UI (새 탭 모드 겸용)
viewer/            강의 뷰어 자동 진도 content script (KLAP-cli/chrome-extension에서 이동)
test/              unit test, fake KLAS 서버 기반 E2E
```

## 테스트

```sh
npm test                                  # node:test, 응답 정규화·직렬화·마감 계산
node test/e2e.mjs cert.pem key.pem out/   # Playwright + Chromium, klas.kw.ac.kr을 로컬 fake 서버로 매핑
```

E2E는 `klas.kw.ac.kr` 인증서용 self-signed cert/key가 필요합니다
(`openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 2 -subj /CN=klas.kw.ac.kr -addext subjectAltName=DNS:klas.kw.ac.kr`).
실제 KLAS 계정으로는 검증하지 않았습니다. 응답 형태는 KLAP-cli fixture를 기준으로 합니다.

## 라이선스와 출처

이 프로젝트는 [MIT License](LICENSE)로 배포합니다.

이 프로젝트는 [leehyowon14/KLAP-cli](https://github.com/leehyowon14/KLAP-cli/tree/codex/shared-core)의 코드를 사용하고 변형했습니다. KLAP-cli는 MIT License(Copyright (c) 2026 KLAP contributors)로 배포되며, 원 저작권 고지와 라이선스 전문을 [LICENSE](LICENSE)에 함께 실었습니다. 어떤 파일이 어디서 왔는지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 정리했습니다.
