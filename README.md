# SDC English Learning App

A modern, full-stack application for English language learning, featuring speed listening, pronunciation verification, and progress tracking with role-based access control.

## 🚀 Key Features

- **Multi-Level Learning:** Topics ranging from daily greetings to specialized travel scenarios.
- **Speed Listening Mode:** Interactive exercises with variable playback speeds (1.0x to 2.0x) and gap-filling tasks.
- **Pronunciation Checker:** Real-time feedback on speaking accuracy.
- **Progress Tracking:** Learning heatmaps, mastery streaks, and detailed quiz history.
- **Role-Based Access:** Specialized dashboards for Students, Teachers, and Administrators.
- **Offline Support:** Built as a Progressive Web App (PWA) with Firebase local caching.

## 🛠️ Tech Stack

- **Frontend:** React 19 (Vite), TypeScript, Tailwind CSS, Framer Motion (animations).
- **Backend:** Firebase (Firestore, Auth, Storage, Cloud Functions, Hosting).
- **Tooling:** ESLint, Prettier, Python (for data generation).

## 📂 Directory Structure

- `src/components/`: Presentational components grouped by domain (auth, dashboard, admin, etc.).
- `src/hooks/`: Business logic, state management, and Firebase interactions.
- `src/types/`: Centralized TypeScript interfaces and types.
- `functions/`: Node.js Firebase Cloud Functions (TypeScript).
- `public/`: Static assets, CSV data sets, and PWA manifest.
- `scripts/`: Utility scripts for data migration and administrative tasks.

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Clone & Install
```bash
git clone <repository-url>
cd sdc-app
npm install
cd functions && npm install && cd ..
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=sdc-app-1d02c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sdc-app-1d02c
VITE_FIREBASE_STORAGE_BUCKET=sdc-app-1d02c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_USE_EMULATOR=true
```

### 3. Local Development (Emulators)
The project is configured to use Firebase Emulators for safe local testing.
```bash
# Start the emulators in one terminal
firebase emulators:start

# Start the React dev server in another
npm run dev
```

## 🏗️ Architecture Guidelines

- **UI vs Logic:** Components should be presentational. All state and DB logic must reside in custom hooks (`src/hooks/`).
- **Styling:** Use Tailwind CSS utility classes. Avoid complex custom CSS where possible.
- **Typing:** Strict TypeScript is required. Avoid `any`. Refer to `src/types/index.ts` for shared interfaces.
- **Security:** Firestore security rules and Cloud Functions enforce role-based permissions. Always verify roles for administrative UI elements.

## 📄 Documentation
For deeper technical insights, refer to:
- `AGENT.md`: Detailed architecture and database schema.
- `docs/ISE.md`: Technical specification for the Speed Listening engine.
- `PLAN.md`: Implementation roadmap.
