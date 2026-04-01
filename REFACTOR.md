# Codebase Refactoring Plan

## 1. Apply Single Responsibility Principle (SRP) & Split Components
**Target:** `src/components/SpeedListeningQuiz.tsx`
* **Action 1 (UI Separation):** Extract the `renderWord` logic into a separate component (e.g., `WordInput.tsx` or `SentenceWord.tsx`).
* **Action 2 (UI Separation):** Extract the playback and speed controls into an `AudioControls.tsx` component.
* **Action 3 (Logic Separation):** Extract blank generation, answer validation, and scoring logic into a custom hook (e.g., `useQuizLogic`).

## 2. Implement State Machine & Refactor Audio Logic
**Target:** `src/components/SpeedListeningQuiz.tsx`
* **Action 1 (State Consolidation):** Replace scattered boolean states (`isPlaying`, `isAnnouncementPlaying`, `isTransitionChimePlaying`, `audioFinished`, `isReviewMode`) with a single union type or state machine.
  * *Example:* `type AudioState = 'IDLE' | 'ANNOUNCEMENT' | 'PLAYING_SENTENCE' | 'TRANSITION' | 'FINISHED' | 'REVIEW';`
* **Action 2 (Logic Separation):** Extract `audioRef` management and event binding logic into a dedicated custom hook (e.g., `useSpeedListeningAudio`).

## 3. Resolve React Hook Purity Violations
**Target:** `src/components/SpeedListeningQuiz.tsx`
* **Action:** Remove `Math.random()` usage inside `useMemo` (currently bypassing lint with `// eslint-disable-next-line react-hooks/purity`).
* **Solution:** Move side effects like `Math.random()` to `useEffect` for state initialization (`useState`), or process data via pure utility functions outside the component.

## 4. Optimize Data Fetching & Remove Boilerplate
**Target:** `src/hooks/useData.ts`, `src/hooks/useAuth.ts`
* **Action 1 (Server State Management):** Replace manual `loading`, `error`, and `data` states in `useData.ts` with a data fetching library like React Query (`@tanstack/react-query`).
* **Action 2 (Error Handling):** In `useAuth.ts`, replace hardcoded string comparisons (e.g., `error.message.includes('not-found')`) with explicit Firebase error code constants.

## 5. Extract Magic Numbers & Hardcoded Values
**Target:** Global
* **Action:** Create a `constants` directory (e.g., `src/constants/`) and move hardcoded values there.
* **Targets to extract:**
  * `SPEEDS = [1, 1.2, 1.5, 2]`
  * `AVAILABLE_VOICES = ['female', 'male', ...]`
  * Cloud function region: `'asia-northeast3'` (in `useAuth.ts`)
  * Audio file paths: `'tts/announcement.mp3'`, `'tts/dingdong.wav'`

## Recommended Execution Order
1. Create `constants` directory and extract hardcoded values.
2. Fix `useMemo` purity violations by migrating `Math.random()` logic to `useEffect`.
3. Extract audio playback logic and states into a custom hook.
4. Split large JSX rendering blocks (e.g., `renderWord`) into smaller sub-components.
5. Introduce React Query to refactor data fetching hooks.
6. Update the maintenance policy specified here in AGENT.md
