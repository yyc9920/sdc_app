# Agent Guidelines: SDC English Learning App

## 1. Project Overview
A comprehensive English learning application featuring speed listening, pronunciation verification, and detailed progress tracking. Built with role-based access control for Students, Teachers, and Administrators.

## 2. Tech Stack
- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4
- State Management: React Query @tanstack/react-query for server state, custom hooks for local state
- Backend: Firebase Auth, Firestore v9+, Storage, Hosting, Cloud Functions v2
- Offline Support: Vite PWA Plugin, Firestore Persistence, Workbox for TTS caching
- Utilities: Node.js, Python, Google Cloud TTS

## 3. Directory Structure
- src/components/: Domain-driven feature directories
  - admin/: Dashboard, CSV upload, code generation, user management
  - auth/: Login, onboarding, access code validation
  - dashboard/: Stats, heatmaps, progress rings, ranking tables
  - speed-listening/: Refactored sub-components AudioControls.tsx, WordInput.tsx, LevelRecommendationBadge.tsx
  - layout/: Bottom navigation, headers
  - shared/: Modals, spinners, reusable UI
- src/hooks/: Business logic and Firebase integration e.g., useStudySession, useRankings, useQuizLogic
- src/types/: Centralized TypeScript interfaces
- src/constants/: Configuration and static data audio.ts, learning.ts, dataSets.ts
- functions/src/: Firebase Cloud Functions v2, domain-grouped
- scripts/: Maintenance, migration, and recalculation utilities

## 4. Database Schema Firestore
- users/{userId}: Profiles and aggregate stats role-based security
  - stats: totalStudyTimeSeconds, weeklyStudyTimeSeconds, totalMasteredCount, currentStreak, longestStreak
  - progress/{sentenceId}: Mastery data setId, studyTimeSeconds, repeatCount, status
  - daily_stats/{YYYY-MM-DD}: Daily activity tracking
  - quiz_results/{resultId}: Speed listening performance metrics
- access_codes/{codeId}: System entry management Admin only
- learning_sets/{setId}: General learning materials Public read; Admin write
- speed_listening_sets/{setId}: Specialized quiz data

## 5. Coding Conventions
- TypeScript: Strict typing is mandatory. Avoid any. Use src/types/index.ts.
- Architecture: Components MUST be presentational. All data fetching and business logic MUST use custom hooks.
- Server State: Use React Query for all Firestore/Function calls to handle caching, loading, and error states.
- Styling: Utility-first Tailwind CSS v4. Prefer standard utility classes over custom CSS.
- Firebase: Centralized imports via src/firebase.ts. Adhere to security rules for role-based access.

## 6. Key Workflows
- Role Validation: Logic depends on Admin, Teacher, or Student roles verified via Custom Claims.
- Mastery Criteria: studyTimeSeconds >= 300 OR repeatCount >= 10 Mastered status.
- Access Control: Handled via validateCode and createAccessCode Cloud Functions.
- Rankings: Weekly and global rankings computed via Cloud Functions and aggregated in users stats.

## 7. AI Instructions
- Modularity: When modifying features, split large components into sub-components SRP.
- Hooks: Always extract complex logic into domain-specific hooks e.g., useSpeedListeningAudio.
- Safety: Never modify Firestore directly without verifying security rules and role requirements.

## 8. Capacitor iOS Notes
- **Firebase Auth**: iOS WKWebView(`capacitor://`)에서 `getAuth()`의 기본 persistence(IndexedDB)가 hang됨. `src/firebase.ts`에서 `initializeAuth()`로 persistence를 명시적으로 지정. 모든 파일에서 `getAuth()` 대신 `src/firebase.ts`에서 export된 `auth` 인스턴스를 사용할 것.
- **Firestore Cache**: iOS 네이티브에서는 `memoryLocalCache()` 사용. `persistentLocalCache`의 IndexedDB가 `capacitor://` 스킴에서 block될 수 있음.
- **Speech Recognition Plugin**: `@capacitor-community/speech-recognition`은 SPM 미지원. 플러그인 소스(Plugin.swift, Plugin.m, Plugin.h)를 `ios/App/App/`에 직접 복사하고 Xcode App 타겟에 수동 추가. Bridging Header(`App-Bridging-Header.h`)에 `#import "SpeechRecognitionPlugin.h"` 필요.
- **getUserMedia**: iOS WKWebView에서 `navigator.mediaDevices.getUserMedia` 미지원. 네이티브에서는 Capacitor 플러그인을 통해 마이크 접근. `Capacitor.isNativePlatform()` 분기 필수.
- **`cap sync` 안전 사용**: `npm run build && npx cap sync ios`는 안전하게 실행 가능. `cap sync`는 `ios/App/App/public/`(웹 빌드 결과)만 덮어쓰며, 수동 추가한 네이티브 파일(`SpeechRecognitionPlugin.*`, `App-Bridging-Header.h`)과 Xcode 타겟 설정은 영향 없음. 단, `CapApp-SPM/Package.swift`는 덮어쓰여지므로 이 파일에 수동 수정 사항이 있으면 sync 후 재설정 필요. SPM 미지원 플러그인은 항상 App 타겟 직접 추가 방식 사용.

## 9. Maintenance Policy
- Constants: NEVER use magic numbers or hardcoded strings. Centralize in src/constants/.
- Errors: Use user-friendly error messages mapped from Firebase error codes.
- PWA: Ensure all new assets especially TTS are handled by the Service Worker strategy.
