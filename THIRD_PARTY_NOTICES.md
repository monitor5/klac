# Third-party notices

## KLAP-cli

- Source: https://github.com/leehyowon14/KLAP-cli (branch `codex/shared-core`)
- License: MIT, Copyright (c) 2026 KLAP contributors. The full text is in [LICENSE](LICENSE).

What this project uses from KLAP-cli:

| This project | KLAP-cli origin | How |
| --- | --- | --- |
| `viewer/capture-main.js`, `viewer/capture.js`, `viewer/core.js`, `viewer/viewer.js`, `viewer/viewer.css` | `chrome-extension/` | Copied; only a license header comment added |
| Lecture-viewer message handling in `src/background.js` | `chrome-extension/background.js` | Adapted |
| `src/klas.js` | `internal/klas/*.go`, `internal/kwcommons/client.go` | Ported from Go to JavaScript: KLAS endpoints, request payloads, response normalization, error detection |
| `lectureNeedsAttendance` in `src/klas.js`, `src/views.js` | `internal/app/lecture.go`, `internal/app/due.go` | Ported: attendance-eligibility and deadline rules |
| `test/fixtures.js` | `fixtures/`, `internal/klas/*_test.go` | Payload shapes modeled on the sanitized fixtures |
