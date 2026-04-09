# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start Vite dev server
npm run build            # TypeScript compile + Vite production build
npm run build:native     # Build + Capacitor sync for iOS/Android
npx eslint .             # Lint (ESLint v9 flat config)
npx tsc --noEmit         # Type check without emitting

# Firebase
npm --prefix functions run build    # Build Cloud Functions
firebase emulators:start            # Start all emulators (Auth:9099, Firestore:8080, Functions:5001, Storage:9199, UI:4000)
firebase deploy --only hosting      # Deploy web app
firebase deploy --only functions    # Deploy Cloud Functions

# Mobile
npm run open:ios         # Open Xcode
npm run open:android     # Open Android Studio
```

## Workflow
- Pre-commit: 커밋 전 반드시 아래 4개 검증을 **모두** 통과해야 합니다. 하나라도 실패하면 커밋/푸시 금지.
  1. `npx eslint .` — 린트
  2. `npx tsc --noEmit` — 타입 체크
  3. `npm run build` — 프로덕션 빌드 (tsc -b + vite build)
  4. `npx vitest run` — 전체 테스트
- Git Worktree: 코드 수정 작업 시 `superpowers:using-git-worktrees` 스킬을 사용하여 `.worktrees/` 디렉토리에 격리된 worktree를 생성하고 작업합니다. 독립적인 이슈는 병렬 worktree에서 동시 작업 후 main에 병합합니다.

## UI/UX
- UI/UX 관련 수정(레이아웃, 스타일, 컴포넌트 디자인, 인터랙션 변경 등)이 있을 경우 반드시 `ui-ux-pro-max` 스킬을 사용하여 디자인 가이드를 참고합니다.

## E2E 검증 (Playwright)
- 기능 구현 후 Playwright MCP 도구를 사용하여 실제 브라우저에서 동작을 검증합니다.
- 로컬 dev 서버(`npm run dev`, localhost:5173)를 띄우고, 프로덕션 Firebase 백엔드를 사용합니다.
- 로그인 액세스 코드: `.env.local`의 `VITE_TEST_ACCESS_CODE` 값을 사용합니다.
- 검증 흐름: 스플래시 클릭 → 액세스 코드 입력 → 로그인 → 해당 기능 탐색 → 동작 확인

## Architecture

### Frontend Pattern
Components are **presentational only**. All data fetching and business logic lives in custom hooks (`src/hooks/`). React Query (`@tanstack/react-query`) manages all server state (Firestore/Cloud Function calls).

### Firebase Initialization (`src/firebase.ts`)
Platform-aware singleton. **Never use `getAuth()` directly** — always import `auth`, `db`, `storage` from `src/firebase.ts`.
- Native (Capacitor): Uses `initializeAuth()` with explicit persistence; Firestore uses `memoryLocalCache()`
- Web: Default `getAuth()`; Firestore uses `persistentLocalCache()` with multi-tab manager
- Emulators: Enabled only when `DEV && VITE_USE_EMULATOR !== 'false' && !isNative`

### Speech Recognition (`src/services/speechService.ts`)
Factory pattern creating platform-specific implementations:
- **Native**: `@capacitor-community/speech-recognition` Capacitor plugin
- **Web**: Chrome Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- **Mobile browsers**: `getUserMedia` requires user gesture context. Use `isMobileBrowser()` from `src/utils/platform.ts` to gate auto-start behavior.

### Cloud Functions (`functions/src/`)
Firebase Cloud Functions v2, domain-grouped: `auth/` (validateCode, createAccessCode, extendCodeExpiration), `progress/` (checkMastery), `stats/` (getRankings, resetWeeklyRankings, updateStreaks), `tts/` (textToSpeech). Region: `asia-northeast3`.

### Roles & Security
Three roles verified via Firebase Custom Claims: Admin, Teacher, Student. Firestore security rules (`firestore.rules`) enforce role-based access using helper functions: `isAuthenticated()`, `isAdmin()`, `isTeacher()`, `isOwner()`.

## Database Schema (Firestore)

- `users/{userId}`: Profiles and aggregate stats (role-based security)
  - `progress/{sentenceId}`: Mastery data (setId, studyTimeSeconds, repeatCount, status)
  - `daily_stats/{YYYY-MM-DD}`: Daily activity tracking
  - `quiz_results/{resultId}`: Speed listening performance
  - `speaking_results/{resultId}`: Speaking practice results
- `access_codes/{codeId}`: System entry management (Admin only)
- `learning_sets/{setId}`, `speed_listening_sets/{setId}`: Learning content (authenticated read, Admin write)

## Coding Conventions

- **TypeScript**: Strict mode. No `any`. Centralize types in `src/types/index.ts`.
- **Styling**: Utility-first Tailwind CSS v4. No custom CSS.
- **Constants**: No magic numbers or hardcoded strings. Centralize in `src/constants/`.
- **Errors**: User-friendly messages mapped from Firebase error codes (see `src/constants/firebase.ts`).
- **PWA**: All new assets (especially TTS audio) must be handled by Service Worker caching strategy (Workbox CacheFirst for TTS, 30-day expiry, max 2000 entries).

## Key Business Rules

- **Mastery Criteria**: `studyTimeSeconds >= 300` OR `repeatCount >= 10` → Mastered status
- **Rankings**: Weekly and global, computed via Cloud Functions, stored in `users/{userId}` stats
- **Access Control**: Validated via `validateCode` and `createAccessCode` Cloud Functions

## Capacitor iOS Notes

- **Firebase Auth**: iOS WKWebView(`capacitor://`)에서 `getAuth()`의 기본 persistence(IndexedDB)가 hang됨. `src/firebase.ts`에서 `initializeAuth()`로 persistence를 명시적으로 지정. 모든 파일에서 `getAuth()` 대신 `src/firebase.ts`에서 export된 `auth` 인스턴스를 사용할 것.
- **Firestore Cache**: iOS 네이티브에서는 `memoryLocalCache()` 사용. `persistentLocalCache`의 IndexedDB가 `capacitor://` 스킴에서 block될 수 있음.
- **Speech Recognition Plugin**: `@capacitor-community/speech-recognition`은 SPM 미지원. 플러그인 소스를 `ios/App/App/`에 직접 복사하고 Xcode App 타겟에 수동 추가. Bridging Header에 `#import "SpeechRecognitionPlugin.h"` 필요.
- **getUserMedia**: iOS WKWebView에서 미지원. 네이티브에서는 Capacitor 플러그인을 통해 마이크 접근. `Capacitor.isNativePlatform()` 분기 필수.
- **`cap sync` 안전 사용**: `ios/App/App/public/`(웹 빌드 결과)만 덮어쓰며, 수동 추가한 네이티브 파일과 Xcode 타겟 설정은 영향 없음. 단, `CapApp-SPM/Package.swift`는 덮어쓰여지므로 sync 후 재설정 필요.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
