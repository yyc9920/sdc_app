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

## 8. Maintenance Policy
- Constants: NEVER use magic numbers or hardcoded strings. Centralize in src/constants/.
- Errors: Use user-friendly error messages mapped from Firebase error codes.
- PWA: Ensure all new assets especially TTS are handled by the Service Worker strategy.
