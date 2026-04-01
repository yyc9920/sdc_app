# Agent Guidelines: SDC English Learning App

## 1. Project Overview
English learning app with speed listening, pronunciation checks, and progress tracking. Role-based access for Students, Teachers, and Admins.

## 2. Tech Stack
- Frontend: React 19 (Vite), TypeScript
- Backend: Firebase (Auth, Firestore, Storage, Hosting, Functions v2)
- Styling: Tailwind CSS v4
- Utilities: Node.js, Python, Google Cloud TTS

## 3. Directory Structure
- src/components/: Grouped by domain features (admin, auth, dashboard, speed-listening, layout, shared, teacher)
- src/hooks/: Business and Firebase logic
- src/types/: Global TypeScript types
- src/constants/: Static data and configuration
- functions/src/: Firebase Cloud Functions (v2, grouped by domain)
- scripts/: Migration and maintenance scripts

## 4. Database Schema (Firestore)
- users/{userId}: User profile and aggregated stats. Owner read/write; Admin/Teacher read
  - progress/{sentenceId}: Sentence mastery (setId, studyTimeSeconds, repeatCount, status)
  - daily_stats/{YYYY-MM-DD}: Daily activity (studyTimeSeconds, sentencesStudied)
  - quiz_results/{resultId}: Speed listening scores
- access_codes/{codeId}: System entry (code, role, status, expiresAt, assignedTo). Admin read/write only
- learning_sets/{setId}: Learning materials. Public read; Admin write
  - sentences/{sentenceId}: Sentence data (english, koreanPronounce, ttsUrls)
- speed_listening_sets/{setId}: Speed listening data. Public read; Admin write
  - sentences/{sentenceId}: Quiz data and metadata

## 5. Coding Conventions
- TypeScript: Strict typing. Avoid any. Centralize types in src/types/index.ts
- Architecture: UI components are presentational. State and DB logic MUST use custom hooks in src/hooks/
- Firebase: Import from src/firebase.ts. Respect Firestore security rules
- Styling: Use Tailwind CSS v4 classes. Prefer utility-first approach.

## 6. Workflows
- Roles: Logic depends on Admin, Teacher, or Student roles (checked via Custom Claims).
- Mastery: Criteria is `studyTimeSeconds >= 300` OR `repeatCount >= 10`.
- Access Codes: Handled via `validateCode`, `createAccessCode`, `extendCodeExpiration` Cloud Functions.
- Metrics: Integrate new features with `useDailyStats` and `useStudySession`.

## 7. AI Instructions
- Plan: Write a brief plan before major changes or refactoring.
- Context: Place new files in matching feature directories.
- Dependencies: Use existing stack (React Query, Framer Motion, Lucide). Do not add new libraries unless necessary.

## 8. Maintenance Policy
- Constants: All magic numbers, region strings, and UI constants must be in src/constants/.
- State Management: Use React Query for server state. Use custom hooks for all Firebase data fetching.
- Offline Support: Firestore Persistence and Service Worker (TTS caching) are mandatory.
- Error Handling: Use centralized error constants and display user-friendly messages.
