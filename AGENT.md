# Agent Guidelines: SDC English Learning App

## 1. Project Overview
English learning app with speed listening, pronunciation checks, and progress tracking. Role-based access for Students, Teachers, and Admins.

## 2. Tech Stack
- Frontend: React (Vite), TypeScript
- Backend: Firebase (Auth, Firestore, Storage, Hosting, Functions)
- Styling: CSS
- Utilities: Node.js, Python

## 3. Directory Structure
- src/components/: Grouped by domain features
- src/hooks/: Business and Firebase logic
- src/types/: Global TypeScript types
- src/constants/: Static data
- functions/: Firebase Cloud Functions

## 4. Database Schema
- users/{userId}: User profile and stats. Owner read/write; Admin/Teacher read
  - progress/{setId_sentenceId}: Sentence mastery
  - daily_stats/{YYYY-MM-DD}: Daily activity
  - quiz_results/{resultId}: Quiz scores
- access_codes/{codeId}: System entry. Admin read/write only
- learning_sets/{setId}: Learning materials. Public read; Admin write
  - sentences/{sentenceId}: Sentence data
- speed_listening_sets/{setId}: Speed listening data. Public read; Admin write
  - sentences/{sentenceId}: Sentence data

## 5. Coding Conventions
- TypeScript: Strict typing. Avoid any. Use src/types/index.ts
- Architecture: UI components are presentational. State and DB logic must use custom hooks in src/hooks/
- Firebase: Import from src/firebase.ts. Respect Firestore security rules

## 6. Workflows
- Roles: Logic depends on Admin, Teacher, or Student roles. Verify roles for UI and routing
- Access Codes: Handled securely via Firebase Functions
- Metrics: Integrate new features with existing tracking hooks (useDailyStats, useStudySession)

## 7. AI Instructions
- Plan: Write a brief plan before major changes or refactoring
- Context: Place new files in matching feature directories
- Dependencies: Use existing stack. Do not add new libraries unless necessary

