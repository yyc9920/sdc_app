# Training Sequence Design — 새 데이터셋 기반 학습 시퀀스

**Date**: 2026-04-09
**Status**: Approved
**Scope**: 기존 3개 모드 전면 리디자인 + 신규 3개 모드 개발

---

## 1. 배경 — 데이터셋 구조 차이

### frequent_30_patterns.csv (기존 레거시)

| 컬럼 | 설명 |
|---|---|
| English Sentence | 영어 문장 |
| Korean Pronounce | 한국어 발음 |
| Direct Comprehension | 직독직해 |
| Comprehension | 자연스러운 해석 |

- 30개 독립 문장, 플랫 리스트, 메타데이터 없음

### english_dataset.csv (신규)

| 컬럼 | 설명 |
|---|---|
| SetCode | 세트 식별자 (L1_SPK_001) |
| SetTitle | 세트 제목 |
| RowType | 콘텐츠 유형 (prompt/script/reading/vocab/question/task/expression/meta) |
| RowSeq | 세트 내 순번 |
| Speaker | 화자 이름 |
| EnglishSentence | 영어 문장 |
| KoreanPronounce | 한국어 발음 |
| DirectComprehension | 직독직해 |
| Comprehension | 자연스러운 해석 |
| Note | 비고 |

- 2,771행, 122+ 세트
- 계층 구조: Level(L1-L5) > Category(SPK, BTEW, CONV...) > Set > Row
- 8가지 RowType으로 다양한 콘텐츠 유형 지원
- Speaker 필드로 다자 대화 지원

---

## 2. 아키텍처 — 통합 Training Engine 패턴

모든 학습 모드가 공유하는 코어 엔진 위에 각 모드가 플러그인/설정으로 동작합니다.

```
TrainingEngine (코어)
├── DataAdapter (RowType별 필터링/매핑)
├── SessionManager (진행 상태, 라운드, 타이머)
├── AudioManager (TTS, 음성인식 통합)
└── ProgressTracker (마스터리, 통계)

각 모드 = Engine Config + Mode-specific UI
├── RepetitionMode
├── SpeedListeningMode
├── InfiniteSpeakingMode
├── RolePlayMode
├── VocabMode
└── FreeResponseMode
```

---

## 3. 데이터 레이어 & 타입 시스템

### 핵심 타입

```typescript
type RowType = 'prompt' | 'script' | 'reading' | 'vocab' | 'question' | 'task' | 'expression' | 'meta';

type TrainingMode = 'repetition' | 'speedListening' | 'infiniteSpeaking'
  | 'rolePlay' | 'vocab' | 'freeResponse';

interface TrainingRow {
  id: string;
  rowType: RowType;
  rowSeq: number;
  speaker: string;
  english: string;
  koreanPronounce: string;
  directComprehension: string;
  comprehension: string;
  note: string;
}

interface TrainingSet {
  setId: string;              // SetCode (L1_SPK_001)
  title: string;
  level: number;              // 1-5
  category: string;           // SPK, BTEW, CONV...
  categoryLabel: string;
  sentenceCount: number;
  rowTypes: RowType[];        // 이 세트가 포함하는 RowType 목록
  speakers: string[];         // 이 세트의 화자 목록
  supportedModes: TrainingMode[];  // 자동 계산
}
```

### DataAdapter — RowType 기반 필터링

```typescript
const MODE_ROW_FILTERS: Record<TrainingMode, RowType[]> = {
  repetition:       ['script', 'reading'],
  speedListening:   ['script', 'reading'],
  infiniteSpeaking: ['script'],
  rolePlay:         ['script'],           // speaker 필드 필수
  vocab:            ['vocab', 'expression'],
  freeResponse:     ['prompt', 'script'], // prompt = 질문, script = 모범답안
};

function getSupportedModes(rows: TrainingRow[]): TrainingMode[] {
  // 세트의 rowType/speaker 조합으로 지원 모드 자동 판별
}
```

---

## 4. TrainingEngine 코어 훅

### useTrainingSession — 통합 세션 관리

```typescript
interface TrainingSession {
  setId: string;
  mode: TrainingMode;
  rows: TrainingRow[];
  currentIndex: number;
  round: number;
  phase: SessionPhase;
  startedAt: number;
  elapsedSeconds: number;
}

type SessionPhase = 'setup' | 'active' | 'review' | 'complete';

function useTrainingSession(config: {
  setId: string;
  mode: TrainingMode;
  options?: ModeOptions;
}): {
  session: TrainingSession;
  rows: TrainingRow[];
  currentRow: TrainingRow;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  pause: () => void;
  resume: () => void;
  complete: () => void;
  elapsed: number;
};
```

### useTrainingAudio — TTS + 음성인식 통합

```typescript
function useTrainingAudio(session: TrainingSession): {
  play: (row: TrainingRow, voice?: VoiceKey) => void;
  playSequence: (rows: TrainingRow[]) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  startRecording: () => void;
  stopRecording: () => void;
  transcript: string;
  isRecording: boolean;
  speakerVoiceMap: Record<string, VoiceKey>;
};
```

### useTrainingProgress — 통합 진행 추적

```typescript
function useTrainingProgress(session: TrainingSession): {
  saveProgress: () => void;
  saveDailyStats: () => void;
  saveResult: (score?: number) => void;
  rowTypeProgress: Record<RowType, number>;
  modeHistory: ModeResult[];
};
```

---

## 5. 모드별 상세 설계

### 5.1 반복 학습 (Repetition) — 리디자인

**기존**: 플랫 문장 리스트를 카드로 넘기며 반복
**신규**: RowType 인식, 세트 구조 기반 맥락 학습

변경점:
- prompt 타입 → 세트 시작 시 "주제 소개" 카드로 표시
- script 타입 → 기존처럼 학습 카드 (메인)
- reading 타입 → 읽기 모드 카드 (배경색 구분, 긴 텍스트 레이아웃)
- Speaker 표시 → 대화형 세트에서 화자 이름 + 색상 구분
- 카드 그룹핑 → prompt 1개 + script N개를 논리적 그룹으로 묶어 표시
- 진행 바 → RowType별 색상 구분 (script=파랑, reading=초록, vocab=주황)

파일 소유:
- `src/components/learning/Repetition/*`
- `src/hooks/useRepetition.ts`

### 5.2 속청 퀴즈 (Speed Listening) — 리디자인

**기존**: 무작위 문장에서 빈칸 채우기
**신규**: 세트 맥락 내에서 연속 듣기 + 빈칸

변경점:
- 세트 단위 퀴즈 → 하나의 세트 전체를 연속 듣기 후 빈칸 출제
- reading 타입 지원 → 긴 지문도 속청 대상
- Speaker별 음성 → 대화형 세트에서 화자마다 다른 TTS 음성 자동 할당
- 문맥 힌트 → 빈칸 주변 문장도 함께 표시
- 난이도 자동 조정 → Level(L1-L5)에 따라 빈칸 비율 자동 스케일링

파일 소유:
- `src/components/learning/SpeedListening/*`
- `src/hooks/useSpeedListening.ts`

### 5.3 무한 스피킹 (Infinite Speaking) — 리디자인

**기존**: 독립 문장을 듣고 따라 말하기 4라운드
**신규**: 세트 흐름을 따라 문맥 속 발화 연습

변경점:
- prompt 인식 → 라운드 시작 시 주제/상황 설명으로 표시
- script 순서 유지 → 세트 내 자연스러운 흐름 (이야기/대화 순서)
- Speaker 기반 턴 → 대화형 세트에서 화자별 턴 구분
- 라운드 구성 변경:
  - R1: 전체 듣기 (prompt + script 연속 재생)
  - R2: 문장별 따라 말하기
  - R3: 빈 상태에서 기억하며 말하기
  - R4: 전체 스크립트 연속 발화

파일 소유:
- `src/components/learning/InfiniteSpeaking/*`
- `src/hooks/useInfiniteSpeaking.ts`

### 5.4 대화 롤플레이 (Role Play) — 신규

Speaker 필드를 활용한 역할극 모드. 대화형 세트(BTEW, INT, CONV, B6ME, BEP) 대상.

플로우:
1. **SETUP** → 세트 선택, 화자 목록 표시, 내 역할 선택
2. **DEMO** → 전체 대화 TTS 재생 (화자별 다른 음성)
3. **GUIDED** → 상대 턴: TTS 재생, 내 턴: 스크립트 보며 따라 말하기
4. **PRACTICE** → 상대 턴: TTS 재생, 내 턴: 스크립트 없이 말하기
5. **FREE** → 상대 턴: TTS 재생, 내 턴: 자유롭게 응답 (유사도 비교)
6. **REVIEW** → 전체 대화 리플레이 + 내 발화 정확도 리포트

UI 요소:
- 채팅 버블 형태 (상대=왼쪽, 나=오른쪽)
- 화자별 아바타/색상
- 현재 턴 하이라이트
- 실시간 음성인식 자막 표시

파일 소유:
- `src/components/learning/RolePlay/*`
- `src/hooks/useRolePlay.ts`

### 5.5 어휘 집중 학습 (Vocab) — 신규

vocab, expression 타입 활용. 어휘 풍부한 세트(BTEW, BEP) 대상.

플로우:
1. **INTRODUCE** → 표현/어휘 카드 (영어 + 뜻 + 발음)
2. **CONTEXT** → 해당 표현이 사용된 script 문장 하이라이트 표시
3. **PRACTICE** → 빈칸에 표현 채우기 (문맥 속 활용)
4. **PRODUCE** → 표현을 사용해 문장 만들어 말하기
5. **REVIEW** → 학습한 표현 요약 + 스페이스드 리피티션 스케줄링

UI 요소:
- 플래시카드 (앞: 영어 표현, 뒤: 뜻 + 예문)
- 문맥 뷰 (스크립트 속 해당 표현 하이라이트)
- 난이도별 퀴즈 (선택지 → 타이핑 → 발화)

파일 소유:
- `src/components/learning/Vocab/*`
- `src/hooks/useVocab.ts`

### 5.6 프롬프트 기반 자유 스피킹 (Free Response) — 신규

prompt 타입을 질문으로, script 타입을 모범답안으로 활용. SPK, TRES, ACA 세트 대상.

플로우:
1. **PROMPT** → 주제/질문 표시 (prompt 타입) + TTS 읽기
2. **THINK** → 30초 준비 시간 (타이머 + 키워드 힌트 선택 가능)
3. **RECORD** → 자유 발화 녹음 (60~120초)
4. **COMPARE** → 내 발화 vs 모범답안(script) 나란히 비교
   - 사용한 어휘 겹침률
   - 문장 구조 유사도
   - 핵심 키워드 포함 여부
5. **STUDY** → 모범답안 문장별 따라 말하기 (InfiniteSpeaking 방식)
6. **RETRY** → 다시 자유 발화 (선택)

UI 요소:
- 프롬프트 카드 (큰 글씨, 눈에 띄는 디자인)
- 녹음 인디케이터 + 파형
- 비교 뷰 (좌: 내 답변 transcript, 우: 모범답안)
- 키워드 매칭 하이라이트

파일 소유:
- `src/components/learning/FreeResponse/*`
- `src/hooks/useFreeResponse.ts`

---

## 6. 모드-세트 호환성 매트릭스

```
              SPK  BTEW  ELLO  INT  B6ME  TRES  ACA  BEP  CONV  LEC  TAL  TED
반복학습        ✓    ✓     ✓    ✓    ✓     ✓    ✓    ✓    ✓     ✓    ✓    ✓
속청퀴즈        ✓    ✓     ✓    ✓    ✓     ✓    ✓    ✓    ✓     ✓    ✓    ✓
무한스피킹      ✓    ✓     ✓    ✓    ✓     ✓    ✓    ✓    ✓     ✓    ✓    ✓
대화롤플레이    ·    ✓     ·    ✓    ✓     ·    ·    ✓    ✓     ·    ·    ·
어휘학습        ·    ✓     ·    ·    ·     ·    ·    ✓    ·     ·    ·    ·
자유스피킹      ✓    ·     ·    ·    ·     ✓    ✓    ·    ·     ·    ·    ·
```

---

## 7. Phase 계획

### Phase 1: 데이터 레이어 & TrainingEngine 코어 (순차)

모든 모드의 기반. 단일 세션으로 진행.

- 타입 정의 (`src/types/index.ts` 확장)
- `useTrainingSession` 코어 훅
- `useTrainingAudio` 코어 훅
- `useTrainingProgress` 코어 훅
- DataAdapter (MODE_ROW_FILTERS, getSupportedModes)
- 코어 훅 단위 테스트

### Phase 2 + 3: 6개 모드 병렬 개발 (Agent Team)

Phase 1 완료 후 Agent Team으로 6개 모드 동시 개발.

### Phase 4: 통합 (순차)

- 라우팅 통합 (React Router)
- LearningPage 리디자인 (모드 선택 UI)
- E2E 테스트
- 기존 레거시 코드 정리

---

## 8. Agent Team 구성

### 팀 구조 (8 Teammates)

```
Team Lead (메인 세션)
├── 작업 분배 + 진행 모니터링 + 최종 통합
│
│ ── 아키텍처 & 품질 ──────────────────────────
│
├── Teammate 1: "architect"
│   → TrainingEngine 코어 설계 검증 + 모드 간 일관성 감시
│   → 각 모드 teammate의 plan을 기술적으로 리뷰
│   → 공유 타입/훅 인터페이스 변경 시 영향 분석
│   → 파일 소유권 충돌 감지 + 의존성 방향 검증
│   → 코어 훅 수정이 필요할 때 Lead에게 제안
│   → 구현하지 않음 — 리뷰 및 조언만
│
├── Teammate 2: "devil"
│   → 각 모드의 설계/구현에 반론 제기
│   → 엣지 케이스 발굴:
│     - 빈 세트, Speaker 1명뿐인 롤플레이
│     - vocab 없는 세트에서 어휘모드 진입
│     - prompt 없는 세트에서 자유스피킹 진입
│   → 성능 우려 (6개 모드 동시 로드, TTS 요청 폭발)
│   → UX 모순 지적 (모드 간 조작 불일치, 학습 흐름 단절)
│   → 다른 teammate들과 직접 토론하여 설계 강화
│
│ ── 구현 (6개 모드 병렬) ──────────────────────
│
├── Teammate 3: "repetition"
│   → 반복학습 리디자인
│   → src/components/learning/Repetition/*, src/hooks/useRepetition.ts
│
├── Teammate 4: "speed-listening"
│   → 속청퀴즈 리디자인
│   → src/components/learning/SpeedListening/*, src/hooks/useSpeedListening.ts
│
├── Teammate 5: "infinite-speaking"
│   → 무한스피킹 리디자인
│   → src/components/learning/InfiniteSpeaking/*, src/hooks/useInfiniteSpeaking.ts
│
├── Teammate 6: "role-play"
│   → 대화 롤플레이 신규 개발
│   → src/components/learning/RolePlay/*, src/hooks/useRolePlay.ts
│
├── Teammate 7: "vocab"
│   → 어휘 집중 학습 신규 개발
│   → src/components/learning/Vocab/*, src/hooks/useVocab.ts
│
└── Teammate 8: "free-response"
    → 자유 스피킹 신규 개발
    → src/components/learning/FreeResponse/*, src/hooks/useFreeResponse.ts
```

### 소통 흐름

```
                    ┌──────────┐
                    │   Lead   │
                    └────┬─────┘
                         │ 조율/승인
              ┌──────────┼──────────┐
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │ architect│◄───────►│  devil   │
        └────┬─────┘  토론   └────┬─────┘
             │                    │
             │ 리뷰/가이드         │ 반론/엣지케이스
             ▼                    ▼
    ┌────┬────┬────┬────┬────┐
    │ T3 │ T4 │ T5 │ T6 │ T7 │ T8
    │반복│속청│무한│롤플│어휘│자유│
    └────┴────┴────┴────┴────┘
```

architect와 devil이 구현 teammate의 plan을 리뷰 → 피드백 반영 후 Lead가 승인 → 구현 시작.

### Teammate 당 Task 구조 (5-6개)

```
Task 1: 모드 전용 훅 구현 (useTrainingSession 기반)
Task 2: 메인 페이지 컴포넌트
Task 3: Phase별 서브 컴포넌트 (턴/카드/비교 뷰 등)
Task 4: Speaker/RowType별 UI 분기
Task 5: 모드 전용 결과 저장 로직
Task 6: 테스트 (훅 단위 테스트)
```

### 팀 생성 프롬프트

```
Create an agent team for parallel development of 6 learning modes
with architecture review and adversarial validation.

Teammates:
1. "architect" — Technical architecture guardian. Review every
   teammate's plan for consistency with TrainingEngine core,
   shared types, and file ownership boundaries. Flag interface
   mismatches, dependency issues, and suggest improvements.
   Do NOT implement — only review and advise.

2. "devil" — Devil's advocate. Challenge every design decision.
   Find edge cases, performance risks, UX contradictions, and
   failure modes. Debate directly with other teammates to
   strengthen their designs.

3. "repetition" — Redesign RepetitionLearningPage.
   Own files: src/components/learning/Repetition/*, hooks/useRepetition.ts
4. "speed-listening" — Redesign SpeedListeningQuiz.
   Own files: src/components/learning/SpeedListening/*, hooks/useSpeedListening.ts
5. "infinite-speaking" — Redesign InfiniteSpeakingPage.
   Own files: src/components/learning/InfiniteSpeaking/*, hooks/useInfiniteSpeaking.ts
6. "role-play" — Build new RolePlay mode.
   Own files: src/components/learning/RolePlay/*, hooks/useRolePlay.ts
7. "vocab" — Build new Vocab mode.
   Own files: src/components/learning/Vocab/*, hooks/useVocab.ts
8. "free-response" — Build new FreeResponse mode.
   Own files: src/components/learning/FreeResponse/*, hooks/useFreeResponse.ts

Require plan approval for teammates 3-8.
Architect and devil review each plan before lead approves.
Use Sonnet for implementation teammates (3-8).

Each teammate must read this spec at:
docs/superpowers/specs/2026-04-09-training-sequence-design.md
and src/hooks/useTrainingSession.ts before starting.
No teammate should edit files outside their owned paths.
```

### 대안: 3 Teammate 구성 (토큰 절약)

```
Teammate 1: "architect" (아키텍처 + 품질)
Teammate 2: "devil" (반론 + 엣지케이스)
Teammate 3: "existing-modes" → 반복학습 + 속청퀴즈 + 무한스피킹 (순차)
Teammate 4: "dialogue-modes" → 롤플레이 + 자유스피킹 (Speaker/음성인식 공통)
Teammate 5: "vocab-mode" → 어휘학습 (독립)
```

추천: 8 teammate 구성 (최대 병렬성 + 아키텍처 품질 보장).
