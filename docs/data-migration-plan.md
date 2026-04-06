# english_dataset.csv 기반 전체 데이터 구조 Migration
 
## Context
 
현재 앱은 3개의 레거시 CSV(1050+100+30문장)을 Firestore `learning_sets/{setId}/sentences/{id}` 구조로 제공 중. 새 `english_dataset.csv`는 ~122개 세트, ~4000행을 포함하며 5개 레벨(L1~L5), 13개 출처코드, 7개 RowType, Speaker 정보 등 훨씬 풍부한 구조를 가짐.
 
**목표**: 새 데이터셋을 기존 Firestore 스키마에 통합하고, 기존 3개 레거시 세트와 공존시키며, UI에서 **Level > Category > Set** 계층 탐색을 지원.
 
### CSV 컬럼 (확정, 탭 구분)
`SetCode | SetTitle | RowType | RowSeq | Speaker | EnglishSentence | KoreanPronounce | DirectComprehension | Comprehension | Note`
 
SetCode 형식: `L{레벨}_{출처코드}_{3자리시퀀스}` (e.g., `L1_SPK_001`)  
SetCode 파싱: `_`로 split → `[레벨, 출처, 시퀀스]`
 
---
 
## Architecture
 
```
english_dataset.csv (tab-delimited, ~4000 rows)
        │
        ▼  PapaParse, group by SetCode
┌──────────────────────────┐
│ migrate-new-dataset.cjs  │──── Phase 2
│  ~122 sets → batch write │
└──────────┬───────────────┘
           │
           ▼
┌───────────────────────────────────────────────────────┐
│ Firestore: learning_sets/{SetCode}                    │
│   setId, title, level, category, categoryLabel,       │
│   sentenceCount, isLegacy: false, status: 'ready'     │
│   └─ sentences/{RowSeq-1}                             │
│       id, rowType, speaker, english, koreanPronounce,  │
│       directComprehension, comprehension, note         │
├───────────────────────────────────────────────────────┤
│ (기존) learning_sets/{legacySetId}                     │
│   + level: 0, category: 'LEGACY', isLegacy: true     │
│   └─ sentences/{id}  (기존 구조 불변)                  │
└──────────┬────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ useLearningSetsBrowser()     │──── Phase 3
│  React Query, staleTime 1hr  │
│  groups: level → category    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ RepetitionLearningPage.tsx   │──── Phase 4
│ LearningPage.tsx             │
│  Level > Category > Set nav  │
│  replaces DATA_SETS grid     │
└──────────────────────────────┘
```
 
---
 
## Phase 1: 타입 & 상수 정의
 
### 1-1. `src/types/index.ts` — 타입 추가, 기존 인터페이스 확장
 
**추가할 타입들:**
```typescript
export type RowType = 'script' | 'reading' | 'prompt' | 'task' | 'vocab' | 'expression' | 'question';
export type LearningLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type CategoryCode = 'LEGACY' | 'SPK' | 'INT' | 'CONV' | 'ACA' | 'LEC' | 'TED' | 'BTEW' | 'B6ME' | 'ELLO' | 'TRES' | 'BEP' | 'TAL' | 'EXT';
```
 
**DataSet 확장** (기존 필드 100% 유지, 새 필드 optional):
- `level?: LearningLevel`, `category?: CategoryCode`, `isLegacy?: boolean` 추가
 
**SentenceData 확장** (기존 필드 유지):
- `rowType?: RowType`, `speaker?: string`, `note?: string` 추가
 
**LearningSetMeta 신규 인터페이스:**
- `setId, title, level, category, categoryLabel, sentenceCount, isLegacy` — Firestore 메타 문서에 대응
 
### 1-2. `src/constants/categories.ts` — 신규 생성
 
13개 출처코드 + LEGACY에 대한 `CATEGORY_MAP` (label/description), `LEVEL_LABELS` (0~5 한글 라벨).  
사용자 제공 출처코드 테이블에서 확정:
 
| 출처코드 | 라벨 | 레벨 범위 |
|---|---|---|
| SPK | TOEFL Speaking 독립형 | L1 |
| INT | TOEFL Speaking 통합형 | L2 |
| CONV | TOEFL Listening 대화 | L3 |
| ACA | TOEFL Speaking Q4 | L3 |
| LEC | TOEFL Listening 강의 | L4 |
| TED | TED Talk | L4~L5 |
| BTEW | BBC TEWS | L2~L3 |
| B6ME | BBC 6 Minute English | L2~L4 |
| ELLO | ELLLO Mixer | L2 |
| TRES | TOEFL Resources | L2~L4 |
| BEP | Business English Pod | L4 |
| TAL | This American Life | L5 |
| EXT | 확장 콘텐츠 | L1~L5 |
 
### 1-3. `src/constants/dataSets.ts` — 기존 3개 세트에 필드 추가
 
각 세트에 `level: 0 as LearningLevel`, `category: 'LEGACY' as CategoryCode`, `isLegacy: true` 추가. `filename` 유지.
 
---
 
## Phase 2: Migration 스크립트
 
### 2-1. `scripts/migrate-new-dataset.cjs` (에뮬레이터용)
 
기존 `scripts/migrate-to-firestore.cjs`와 동일한 패턴 (firebase-admin, PapaParse, 400개 배치):
 
```
1. PapaParse로 public/english_dataset.csv 파싱
   - delimiter: '\t' (탭 구분)
   - header: true
2. SetCode별로 rows 그룹핑 → Map<string, Row[]>
3. 각 SetCode에 대해:
   a. SetCode 파싱: parts = SetCode.split('_')
      level = parseInt(parts[0].substring(1))  // L1 → 1
      category = parts[1]                       // SPK
   b. learning_sets/{SetCode} 문서 생성:
      {
        setId: SetCode,
        title: rows[0].SetTitle,
        level, category,
        categoryLabel: CATEGORY_MAP[category],
        sentenceCount: rows.length,
        isLegacy: false,
        status: 'ready',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }
   c. sentences 서브컬렉션 (id = String(RowSeq - 1)):
      {
        id: RowSeq - 1,
        rowType: row.RowType,
        speaker: row.Speaker || '',
        english: row.EnglishSentence,
        koreanPronounce: row.KoreanPronounce,
        directComprehension: row.DirectComprehension,
        comprehension: row.Comprehension,
        note: row.Note || '',
      }
4. 기존 3개 레거시 세트 문서에 merge update:
   { level: 0, category: 'LEGACY', categoryLabel: '기존 학습', isLegacy: true }
5. 400개 단위 배치 커밋
```
 
### 2-2. `scripts/migrate-new-dataset-prod.cjs` (프로덕션용)
 
`scripts/migrate-to-firestore-prod.cjs` 패턴 사용 (service-account.json, 에뮬레이터 host 없음). 로직은 2-1과 동일.
 
### CSV 위치
 
`english_dataset.csv`는 `public/` 디렉토리에 배치 (기존 CSV와 동일 위치).
 
### Progress 호환성
 
Progress 키 `users/{uid}/progress/{setId}_{sentenceId}`:
- 레거시: `ultimate_speaking_beginner_1_1050_42` → 불변
- 새 세트: `L1_SPK_001_0` → 새 키, 충돌 없음
 
---
 
## Phase 3: 데이터 레이어
 
### 3-1. `firestore.indexes.json` — 복합 인덱스 추가
 
`learning_sets` 컬렉션에 `level ASC + category ASC` 복합 인덱스 추가.  
(기존 인덱스 유지, 배열에 새 항목 push)
 
### 3-2. `src/hooks/useLearningSetsBrowser.ts` — 신규 생성
 
```typescript
// Firestore learning_sets 컬렉션 메타 문서만 조회 (sentences 서브컬렉션 X)
// React Query: queryKey ['learningSetsBrowser'], staleTime 1시간
// getDocs(collection(db, 'learning_sets'))
// 반환: { setsByLevel, allSets, loading, error }
// setsByLevel: Map<number, { category: string, categoryLabel: string, sets: LearningSetMeta[] }[]>
```
 
### 3-3. `src/hooks/useData.ts` — 파라미터 변경
 
`fetchLearningSetData` 내부에서 `.csv` strip 로직을 하위호환으로 유지:
```typescript
const setId = setIdOrFilename.endsWith('.csv')
  ? setIdOrFilename.replace('.csv', '')
  : setIdOrFilename;
```
 
**호출부 4곳 업데이트** (filename → id):
| 파일 | 줄 | 변경 |
|---|---|---|
| `RepetitionLearningPage.tsx` | L26 | `prefetch(ds.filename)` → `prefetch(ds.id)` |
| `RepetitionLearningPage.tsx` | L43 | `useData(selectedDataSet?.filename)` → `useData(selectedDataSet?.id)` |
| `LearningPage.tsx` | L35 | `prefetch(ds.filename)` → `prefetch(ds.id)` |
| `InfiniteSpeakingPage.tsx` | L31 | `useData(dataSet.filename)` → `useData(dataSet.id)` |
 
---
 
## Phase 4: UI 컴포넌트
 
### 4-1. 신규 presentational 컴포넌트 3개
 
**`src/components/home/LevelSelector.tsx`**
- Props: `levels: { level: number; label: string; setCount: number }[]`, `onSelect: (level: number) => void`
- 카드 그리드 — 기존 데이터셋 버튼과 동일한 Tailwind 스타일
- L0="기존 학습", L1~L5=LEVEL_LABELS
 
**`src/components/home/CategorySelector.tsx`**
- Props: `categories: { code: string; label: string; setCount: number }[]`, `onSelect: (code: string) => void`, `levelLabel: string`
- 카테고리 카드 리스트
 
**`src/components/home/SetSelector.tsx`**
- Props: `sets: LearningSetMeta[]`, `onSelect: (set: LearningSetMeta) => void`, `categoryLabel: string`
- 세트 리스트 (title + sentenceCount)
 
### 4-2. `src/components/home/RepetitionLearningPage.tsx` — lobby 교체
 
현재 lobby (L191~L246): `DATA_SETS.map()` → 3개 버튼.
 
**변경:**
- state 추가: `selectedLevel: number | null`, `selectedCategory: string | null`
- `useLearningSetsBrowser()` 호출
- lobby 렌더링 교체:
  - `selectedLevel == null` → `<LevelSelector>`
  - `selectedCategory == null` → `<CategorySelector>`
  - `selectedDataSet == null` → `<SetSelector>`
- `handleSetSelect`: `LearningSetMeta` → `DataSet` 변환 (`filename: setId`, id/name/description 매핑) 후 `setSelectedDataSet`
- 뒤로가기: `selectedCategory → null → selectedLevel → null` 순으로 pop
- 기존 학습 뷰 (L253~L346) **변경 없음**
 
### 4-3. `src/components/learning/LearningPage.tsx` — Step 2 교체
 
현재 Step 2 (L188~L214): `DATA_SETS.map()`.  
동일한 Level > Category > Set 계층 네비게이션으로 교체.  
mode 선택(Step 1), Speed Listening(Step 3) **변경 없음**.
 
### 4-4. `src/components/Card.tsx` — speaker 라벨 조건부 추가
 
`sentence.speaker`가 비어있지 않으면 english 텍스트 위에 인라인 badge 표시.  
L77 부근, english 텍스트 `<p>` 앞에:
```tsx
{sentence.speaker && (
  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded mb-1">
    {sentence.speaker}
  </span>
)}
```
 
---
 
## Phase 5: Speed Listening (후속 작업 — 이번 scope 밖)
 
`generate_listening_sets.py` 수정 및 새 세트용 speed listening 생성은 Phase 4 완료 후 별도 진행.  
기존 speed listening은 레거시 세트 기반으로 정상 동작 유지됨.
 
---
 
## 수정 파일 요약
 
| 파일 | 작업 | Phase |
|---|---|---|
| `src/types/index.ts` | 타입 추가 (기존 유지) | 1 |
| `src/constants/categories.ts` | **신규** | 1 |
| `src/constants/dataSets.ts` | 필드 추가 | 1 |
| `scripts/migrate-new-dataset.cjs` | **신규** | 2 |
| `scripts/migrate-new-dataset-prod.cjs` | **신규** | 2 |
| `firestore.indexes.json` | 인덱스 추가 | 3 |
| `src/hooks/useLearningSetsBrowser.ts` | **신규** | 3 |
| `src/hooks/useData.ts` | 파라미터명 변경 | 3 |
| `src/components/home/LevelSelector.tsx` | **신규** | 4 |
| `src/components/home/CategorySelector.tsx` | **신규** | 4 |
| `src/components/home/SetSelector.tsx` | **신규** | 4 |
| `src/components/home/RepetitionLearningPage.tsx` | lobby 교체 | 4 |
| `src/components/learning/LearningPage.tsx` | Step 2 교체 | 4 |
| `src/components/learning/InfiniteSpeaking/InfiniteSpeakingPage.tsx` | useData 호출 변경 | 3 |
| `src/components/Card.tsx` | speaker badge 추가 | 4 |
 
**변경 불필요**: `firestore.rules`, `useStudySession.ts`, `useSpeedListeningData.ts`
 
---
 
## 선행 조건
 
- `public/english_dataset.csv` 파일이 레포에 추가되어야 Phase 2 migration 실행 가능
- Phase 1, 3, 4는 CSV 없이도 구현 가능
 
## 검증 방법
 
1. `npx tsc --noEmit` && `npx eslint .` 통과
2. `firebase emulators:start` → `node scripts/migrate-new-dataset.cjs`
3. Emulator UI (`localhost:4000`) → learning_sets 문서 수 확인 (기존 3 + ~122 = ~125)
4. `npm run dev` → Level > Category > Set 계층 탐색 동작
5. L0 레거시 세트 선택 → 기존 학습 뷰 + progress 정상
6. 새 세트 선택 → 문장 로드, speaker badge 표시

