---
title: KLAP 개인정보처리방침 / Privacy Policy
---

# KLAP 개인정보처리방침

시행일: 2026-11-15

KLAP(이하 "확장 프로그램")은 광운대학교 KLAS 사용자를 위한 **비공식** Chrome 확장 프로그램입니다. 광운대학교와 제휴하거나 승인받지 않았습니다.

## 1. 수집하는 정보

확장 프로그램은 개발자나 제3자 서버로 **어떤 정보도 전송하지 않습니다.** 개발자는 사용자 데이터를 받거나 볼 수 없습니다.

동작을 위해 사용자의 브라우저 안에서만 다음 정보를 다룹니다.

| 정보 | 출처 | 저장 위치 | 용도 |
| --- | --- | --- | --- |
| 수강 과목, 과제, 공지, 온라인 강의, 시간표 | `https://klas.kw.ac.kr` (사용자의 로그인된 세션) | `chrome.storage.local` | 팝업 표시, 마감 계산, 알림 |
| 확인한 공지·보낸 알림 목록 | 확장 프로그램 내부 | `chrome.storage.local` | 중복 알림 방지 (14일 후 정리) |
| 설정 (학기, 갱신 주기, 알림 여부) | 사용자 입력 | `chrome.storage.local` | 설정 유지 |
| 알림 클릭 시 열 링크 | 확장 프로그램 내부 | `chrome.storage.session` | 브라우저 종료 시 삭제 |

## 2. 수집하지 않는 정보

- KLAS **아이디와 비밀번호를 묻거나 저장하지 않습니다.** 브라우저에 이미 로그인된 KLAS 세션(쿠키)으로 KLAS에 직접 요청할 뿐이며, 쿠키 값을 읽거나 저장하지 않습니다.
- 방문 기록, 다른 사이트의 내용, 위치, 광고 식별자를 수집하지 않습니다.
- 분석(analytics), 광고, 추적 도구를 쓰지 않습니다.

## 3. 네트워크 통신

확장 프로그램이 접속하는 곳은 `https://klas.kw.ac.kr` 하나입니다. 이 요청에 한해 KLAS가 요구하는 `Origin`/`Referer` 헤더를 붙입니다(`declarativeNetRequest`). 사용자가 보는 일반 웹 페이지의 요청은 바꾸지 않습니다.

## 4. 제3자 제공·판매

사용자 데이터를 판매하거나 제3자에게 제공·전송하지 않으며, 신용도 판단이나 대출 목적으로 사용하지 않습니다. 확장 프로그램의 단일 목적(수강 정보 확인과 마감 알림)과 무관한 용도로 사용하지 않습니다.

## 5. 보관과 삭제

데이터는 사용자의 브라우저에만 남습니다. 확장 프로그램을 삭제하면 Chrome이 저장된 데이터를 모두 지웁니다.

## 6. 문의

[GitHub Issues](https://github.com/monitor5/klac/issues)로 문의해 주세요. 이 방침이 바뀌면 이 페이지와 시행일을 갱신합니다.

---

# KLAP Privacy Policy

Effective: 2026-11-15

KLAP is an **unofficial** Chrome extension for users of Kwangwoon University's KLAS. It is not affiliated with or endorsed by Kwangwoon University.

**What we collect:** nothing is sent to the developer or any third party. The extension reads your courses, assignments, notices, online lectures and timetable from `https://klas.kw.ac.kr` using the KLAS session already signed in in your browser, and keeps them, along with your settings and a list of notices/alerts already shown, only in `chrome.storage` on your device.

**What we don't collect:** your KLAS ID or password (never requested or stored), cookie values, browsing history, content of other sites, location, or advertising identifiers. No analytics, ads or tracking.

**Network:** the only host contacted is `https://klas.kw.ac.kr`. For those requests only, the extension sets the `Origin`/`Referer` headers KLAS expects; normal browsing is not modified.

**Sharing:** user data is never sold, transferred to third parties, used for creditworthiness or lending, or used for anything other than the extension's single purpose.

**Retention:** data stays in your browser and is removed when you uninstall the extension.

**Contact:** [GitHub Issues](https://github.com/monitor5/klac/issues).
