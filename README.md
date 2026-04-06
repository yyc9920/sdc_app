# SDC English Learning App

A modern, full-stack application for English language learning, featuring speed listening, pronunciation verification, and progress tracking with role-based access control.

## Key Features

- Multi-Level Learning: Topics ranging from daily greetings to specialized travel scenarios.
- Speed Listening Mode: Interactive exercises with variable playback speeds 1.0x to 2.0x and gap-filling tasks.
- Pronunciation Checker: Real-time feedback on speaking accuracy.
- Progress Tracking: Learning heatmaps, mastery streaks, and detailed quiz history.
- Leaderboards & Rankings: Global and weekly rankings based on study time and mastery.
- Admin Dashboard: Automated CSV-to-TTS processing, user management, and access code generation.
- Offline Support: Built as a Progressive Web App PWA with Firebase local caching and Workbox TTS pre-fetching.

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion.
- State Management: React Query @tanstack/react-query.
- Backend: Firebase Firestore, Auth, Storage, Cloud Functions v2, Hosting.
- Offline: Vite PWA Plugin, Firestore Persistence.
- Tooling: ESLint, Prettier, Python for data generation.

## Directory Structure

- src/components/: Presentational components grouped by domain auth, dashboard, admin, etc.
- src/hooks/: Business logic, state management React Query, and Firebase interactions.
- src/types/: Centralized TypeScript interfaces and types.
- src/constants/: Centralized static configuration thresholds, audio paths, etc.
- functions/: Node.js Firebase Cloud Functions v2, TypeScript.
- public/: Static assets, CSV data sets, and PWA manifest.
- scripts/: Utility scripts for data migration, recalculation, and administrative tasks.

## Setup & Installation

### Prerequisites
- Node.js v18+
- Firebase CLI npm install -g firebase-tools

### 1. Clone & Install
```bash
git clone <repository-url>
cd sdc-app
npm install
cd functions && npm install && cd ..
```

### 2. Environment Variables
Create a .env file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=sdc-app-1d02c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sdc-app-1d02c
VITE_FIREBASE_STORAGE_BUCKET=sdc-app-1d02c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_USE_EMULATOR=true
```

### 3. Local Development Emulators
The project is configured to use Firebase Emulators for safe local testing.
```bash
# Start the emulators in one terminal
firebase emulators:start

# Start the React dev server in another
npm run dev
```

## Architecture Guidelines

- UI vs Logic: Components are presentational. All state and DB logic resides in custom hooks src/hooks/.
- Server State: React Query is used for all asynchronous data management.
- Styling: Tailwind CSS v4 utility classes are preferred.
- Typing: Strict TypeScript is required. Refer to src/types/index.ts for shared interfaces.
- Security: Firestore security rules and Cloud Functions enforce role-based permissions.

## Documentation
For deeper technical insights, refer to:
- AGENT.md: Detailed architecture, schema, and agent mandates.
- docs/ISE.md: Technical specification for the Speed Listening engine.
- docs/PLAN.md: Implementation roadmap and completed phases.
- docs/REFACTOR.md: Codebase refactoring strategy.
