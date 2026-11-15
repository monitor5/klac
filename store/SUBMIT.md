# Chrome Web Store 제출 절차

## 0. 사전 준비 (한 번만)

1. https://chrome.google.com/webstore/devconsole 에 Google 계정으로 로그인
2. 개발자 등록비 **US$5** 결제 (1회)
3. Account 탭에서 연락 이메일 인증. 개인 개발자는 publisher name을 지정할 수 있습니다.
   - 2단계 인증(2SV)이 켜져 있어야 게시할 수 있습니다.

## 1. 개인정보처리방침 공개 (GitHub Pages)

1. GitHub `monitor5/klac` → Settings → Pages
2. Source: **Deploy from a branch**, Branch: `main`, Folder: `/docs` → Save
3. 1~2분 뒤 https://monitor5.github.io/klac/privacy.html 이 열리는지 확인

## 2. 업로드 zip 만들기

```bash
npm run build:store     # dist/klap-<version>-store.zip (강의 뷰어 자동 진도 제외)
```

`npm run build:full`은 viewer까지 포함한 개발자 모드용 zip입니다. **Store에는 올리지 않습니다.**

## 3. 업로드와 등록 정보 입력

1. Developer Dashboard → **New item** → `dist/klap-<version>-store.zip` 업로드
2. **Store listing** 탭: `store/LISTING.md`의 설명, 카테고리, 이미지 입력. 언어 드롭다운에서 English를 골라 영문 설명과 영문 스크린샷도 입력
3. **Privacy practices** 탭: single purpose, permission justification, remote code, data usage를 `store/LISTING.md`대로 입력, privacy policy URL 입력
4. **Distribution** 탭: 처음에는 Visibility를 **Unlisted** 로 두는 것을 권장 (링크를 아는 사람만 설치 가능, 검색 노출 없음). 지역은 South Korea 또는 전체
5. **Submit for review**. 보통 며칠 걸리며, `declarativeNetRequest` 사용 때문에 조금 더 걸릴 수 있습니다.

## 4. 리뷰어 안내 (Test instructions 칸)

리뷰어는 KLAS 계정이 없어 실제 동작을 확인할 수 없습니다. 다음 문구를 넣어 두면 반려 가능성이 줄어듭니다.

```
This extension only works for students with a Kwangwoon University KLAS account, so test credentials cannot be provided.
Without a KLAS session the popup shows a "please sign in to KLAS" message, which is the expected behaviour.
All network requests go to https://klas.kw.ac.kr only. Source code: https://github.com/monitor5/klac
```

## 5. 업데이트

`manifest.json`과 `package.json`의 version을 올리고 `npm run build:store` → Dashboard의 Package 탭에서 새 zip 업로드 → 다시 Submit.

---

## 리스크와 대응

| 리스크 | 내용 | 대응 |
| --- | --- | --- |
| 학교 측 이의 제기 | KLAS의 비공개 내부 API를 쓰는 비공식 도구입니다. 학교가 이용약관 위반이나 서버 부하를 이유로 Google에 신고하면 내려갈 수 있습니다. | 요청은 사용자 본인 세션으로, 30분 주기·5분 캐시로 제한. 처음에는 Unlisted로 배포하고, 가능하면 학교 정보통신처에 미리 알리는 것을 권장 |
| 상표·사칭 (Impersonation 정책) | 이름에 "광운대", "KLAS"를 쓰면 공식 앱으로 오인될 수 있습니다. | 이름을 "KLAP - KLAS 수강 관리 도우미 (비공식)"로 바꾸고 학교 이름은 이름에서 뺌. 설명 첫 줄과 끝에 비공식·비제휴 문구. 학교 로고·UI 이미지를 쓰지 않음 |
| 강의 자동 진도 기능 | 실제 시청 없이 출석 진도를 올리는 기능은 학칙 위반 소지가 크고 Store 정책상 신고 대상이 될 수 있습니다. | Store판(`build:store`)에서 제외. GitHub 소스에만 남김 |
| 권한 리뷰 | `declarativeNetRequest`로 헤더를 바꾸는 점이 리뷰에서 질문 받을 수 있습니다. | `tabIds: [-1]`로 확장 자신의 요청에만 적용됨을 justification에 명시 |
| KLAS 변경 | KLAS API가 바뀌면 동작이 멈춥니다. 아직 실제 KLAS에서 검증되지 않았습니다(KLAP-cli fixture 기준). | **제출 전에 실제 KLAS 계정으로 개발자 모드 설치 후 각 탭 동작을 꼭 확인** |
| 개인 정보 노출 | 개인 개발자 계정은 Store에 연락 이메일이 공개될 수 있습니다. | 공개용 별도 이메일 사용 권장 |
