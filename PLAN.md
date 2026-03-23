# 프로젝트 백엔드 분리 및 Firebase 이관 아키텍처 설계 (PLAN.md)

이 문서는 기존 프로젝트의 기능을 Firebase 기반 서버리스 아키텍처로 전환하고, 관리자 및 학습자 기능을 구현하기 위한 상세 계획서입니다.

---

## 1. 기술 스택 (Tech Stack)

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 19 + Tailwind CSS v4 | 현재 사용 중 |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions v2) | Serverless |
| TTS API | Google Cloud TTS | $4/1M characters - OpenAI TTS보다 저렴 |
| Notification | Firebase Cloud Messaging (FCM) | 이메일은 SendGrid 연동 가능 |
| Offline | Firestore Persistence + Service Worker | PWA 지원 |

---

## 2. 데이터 모델링 (Firestore Structure)

### 2.1 설계 원칙

- **Subcollection 활용**: 1MB 문서 제한 회피, 개별 쿼리 가능
- **Denormalization**: 읽기 최적화를 위해 일부 데이터 중복 허용
- **Atomic Updates**: 카운터는 `FieldValue.increment()` 사용

### 2.2 컬렉션 구조

```
firestore-root/
├── access_codes/{codeId}
├── users/{uid}
│   ├── (user document)
│   ├── progress/{sentenceId}        # 문장별 학습 진행
│   ├── daily_stats/{YYYY-MM-DD}     # 일별 통계 (히트맵용)
│   └── quiz_results/{quizResultId}  # 스피드리스닝 결과
├── learning_sets/{setId}
│   ├── (set metadata)
│   └── sentences/{sentenceId}       # 개별 문장 (subcollection)
└── speed_listening_sets/{setId}
    ├── (set metadata)
    └── sentences/{sentenceId}
```

### 2.3 상세 스키마

#### `access_codes/{codeId}`
관리자가 생성하는 로그인용 코드

```typescript
interface AccessCode {
  code: string;              // "ABCD-1234" (unique index)
  role: 'admin' | 'teacher' | 'student';
  status: 'available' | 'used' | 'revoked';
  assignedTo: string | null; // uid
  createdAt: Timestamp;
  usedAt: Timestamp | null;
  
  // 만료 정책: admin은 만료 없음, student는 30일 기본 (관리자가 연장 가능)
  expiresAt: Timestamp | null;  // null = 만료 없음 (admin 코드)
  extendedBy: string | null;    // 연장한 관리자 uid
  extendedAt: Timestamp | null; // 연장 시점
}
```

#### `users/{uid}`
사용자 프로필 및 집계 통계

```typescript
interface User {
  uid: string;
  profile: {
    name: string;
    goal: string;
    phone?: string;
    email?: string;
    age?: number;
    createdAt: Timestamp;
  };
  profileCompleted: boolean;
  role: 'admin' | 'teacher' | 'student';
  accessCode: string;  // 사용한 코드 (역참조)
  teacherId: string | null; // 학생용: 배정된 선생님의 UID
  
  // 집계 통계 (Cloud Function으로 주기적 계산 또는 트리거 업데이트)
  stats: {
    totalStudyTimeSeconds: number;
    totalMasteredCount: number;
    currentStreak: number;        // 연속 학습일
    longestStreak: number;
    lastActiveDate: string;       // "YYYY-MM-DD" (streak 계산용)
  };
  
  // 학습 위치 (이어하기용)
  lastPosition: {
    setId: string;
    sentenceId: string;
    mode: 'repetition' | 'speed_listening';
  } | null;
}
```

#### `users/{uid}/progress/{sentenceId}`
문장별 학습 진행 상황 (핵심 subcollection)

```typescript
interface SentenceProgress {
  sentenceId: string;
  setId: string;                    // 역참조 (쿼리 편의)
  
  studyTimeSeconds: number;         // 누적 학습 시간
  repeatCount: number;              // 반복 횟수
  
  status: 'new' | 'learning' | 'mastered';
  masteredAt: Timestamp | null;
  
  lastStudiedAt: Timestamp;
  firstStudiedAt: Timestamp;
}
```

**Mastery 기준**: `studyTimeSeconds >= 300` (5분) OR `repeatCount >= 10`

#### `users/{uid}/daily_stats/{YYYY-MM-DD}`
일별 학습 통계 (히트맵, streak 계산용)

```typescript
interface DailyStats {
  date: string;                     // "2024-01-15"
  studyTimeSeconds: number;
  sentencesStudied: number;
  sentencesMastered: number;
  sessionsCount: number;
}
```

#### `users/{uid}/quiz_results/{resultId}`
스피드 리스닝 퀴즈 결과

```typescript
interface QuizResult {
  setId: string;
  level: number;
  
  score: number;                    // 정답 비율 (0-100)
  blanksTotal: number;
  blanksCorrect: number;
  
  completedAt: Timestamp;
  timeSpentSeconds: number;
}
```

#### `learning_sets/{setId}`
학습 세트 메타데이터

```typescript
interface LearningSet {
  setId: string;
  title: string;
  description: string;
  
  sentenceCount: number;            // denormalized count
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;                // admin uid
  
  status: 'processing' | 'ready' | 'error';
  processingError: string | null;
}
```

#### `learning_sets/{setId}/sentences/{sentenceId}`
개별 문장 (subcollection)

```typescript
interface Sentence {
  id: number;                       // 순서 (0-based)
  english: string;
  koreanPronounce: string;
  directComprehension: string;
  comprehension: string;
  
  ttsUrls: {
    female: string;
    male: string;
    child_female: string;
    child_male: string;
    elderly_female: string;
    elderly_male: string;
  };
}
```

#### `speed_listening_sets/{setId}`
스피드 리스닝 세트

```typescript
interface SpeedListeningSet {
  setId: string;
  theme: string;
  level: number;
  parentSetId: string;              // learning_sets 참조
  
  sentenceCount: number;
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
  };
  
  createdAt: Timestamp;
}
```

---

## 3. 인증 설계 (Authentication)

### 3.1 Custom Token 기반 인증 (권장)

Anonymous Auth 대신 **Custom Token**을 사용하는 이유:
- 브라우저 캐시 삭제 시에도 동일 계정 유지
- 코드와 사용자 간 명확한 1:1 매핑
- role 정보를 Custom Claims에 포함 가능

### 3.2 인증 Flow (Sequence Diagram)

```
┌──────────┐          ┌──────────────┐          ┌──────────┐
│  Client  │          │Cloud Function│          │ Firebase │
│ (React)  │          │  validateCode│          │   Auth   │
└────┬─────┘          └──────┬───────┘          └────┬─────┘
     │                       │                       │
     │ 1. POST /validateCode │                       │
     │   { code: "ABCD-1234"}│                       │
     │──────────────────────>│                       │
     │                       │                       │
     │                       │ 2. Check access_codes │
     │                       │    (status, expiry)   │
     │                       │───────────┐           │
     │                       │<──────────┘           │
     │                       │                       │
     │                       │ 3. If new: createUser │
     │                       │    If existing: getUser│
     │                       │──────────────────────>│
     │                       │                       │
     │                       │ 4. createCustomToken  │
     │                       │    with claims {role} │
     │                       │──────────────────────>│
     │                       │<──────────────────────│
     │                       │                       │
     │ 5. Return customToken │                       │
     │<──────────────────────│                       │
     │                       │                       │
     │ 6. signInWithCustomToken                      │
     │─────────────────────────────────────────────>│
     │                       │                       │
     │ 7. Firebase session established              │
     │<─────────────────────────────────────────────│
     │                       │                       │
```

### 3.3 Cloud Function: `validateCode`

```typescript
// functions/src/auth/validateCode.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const validateCode = onCall(async (request) => {
  const { code } = request.data;
  
  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Code is required');
  }
  
  const db = getFirestore();
  const auth = getAuth();
  
  // 1. Find access code
  const codesRef = db.collection('access_codes');
  const snapshot = await codesRef.where('code', '==', code).limit(1).get();
  
  if (snapshot.empty) {
    throw new HttpsError('not-found', 'Invalid code');
  }
  
  const codeDoc = snapshot.docs[0];
  const codeData = codeDoc.data();
  
  // 2. Validate status
  if (codeData.status === 'revoked') {
    throw new HttpsError('permission-denied', 'Code has been revoked');
  }
  
  // Check expiration (student codes only - admin codes have expiresAt: null)
  if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
    throw new HttpsError(
      'permission-denied', 
      'Code has expired. Please contact your administrator to extend the expiration date.'
    );
  }
  
  let uid: string;
  
  // 3. Handle used vs new code
  if (codeData.status === 'used' && codeData.assignedTo) {
    // Returning user - use existing UID
    uid = codeData.assignedTo;
  } else {
    // New user - create Firebase Auth user
    const userRecord = await auth.createUser({});
    uid = userRecord.uid;
    
    // Update access code
    await codeDoc.ref.update({
      status: 'used',
      assignedTo: uid,
      usedAt: FieldValue.serverTimestamp(),
    });
    
    // Create user document
    await db.collection('users').doc(uid).set({
      uid,
      profile: { name: '', goal: '', createdAt: FieldValue.serverTimestamp() },
      role: codeData.role,
      accessCode: code,
      stats: {
        totalStudyTimeSeconds: 0,
        totalMasteredCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
      },
      lastPosition: null,
    });
  }
  
  // 4. Create custom token with role claim
  const customToken = await auth.createCustomToken(uid, {
    role: codeData.role,
  });
  
  return { customToken, role: codeData.role };
});
```

### 3.4 Cloud Function: `extendCodeExpiration` (Admin Only)

```typescript
// functions/src/auth/extendCodeExpiration.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export const extendCodeExpiration = onCall(async (request) => {
  // Verify admin role
  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  
  const { codeId, extensionDays } = request.data;
  
  if (!codeId || typeof extensionDays !== 'number' || extensionDays < 1) {
    throw new HttpsError('invalid-argument', 'Valid codeId and extensionDays required');
  }
  
  const db = getFirestore();
  const codeRef = db.collection('access_codes').doc(codeId);
  const codeDoc = await codeRef.get();
  
  if (!codeDoc.exists) {
    throw new HttpsError('not-found', 'Code not found');
  }
  
  const codeData = codeDoc.data()!;
  
  // Admin codes cannot be extended (they don't expire)
  if (codeData.role === 'admin') {
    throw new HttpsError('invalid-argument', 'Admin codes do not expire');
  }
  
  // Calculate new expiration date
  const currentExpiry = codeData.expiresAt?.toDate() || new Date();
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);
  
  await codeRef.update({
    expiresAt: Timestamp.fromDate(newExpiry),
    extendedBy: request.auth.uid,
    extendedAt: FieldValue.serverTimestamp(),
  });
  
  return { 
    success: true, 
    newExpiresAt: newExpiry.toISOString(),
    message: `Code extended by ${extensionDays} days`
  };
});
```

### 3.5 Cloud Function: `createAccessCode` (Admin Only)

```typescript
// functions/src/auth/createAccessCode.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

export const createAccessCode = onCall(async (request) => {
  // Verify admin role
  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  
  const { role } = request.data;
  
  if (!role || !['admin', 'student'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Valid role required (admin or student)');
  }
  
  const db = getFirestore();
  
  // Generate unique code: XXXX-XXXX format
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: 0,O,1,I
    let code = '';
    const bytes = randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
      if (i === 3) code += '-';
    }
    return code;
  };
  
  const code = generateCode();
  
  // Set expiration based on role
  const expiresAt = role === 'admin' 
    ? null  // Admin codes never expire
    : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days for students
  
  const codeDoc = await db.collection('access_codes').add({
    code,
    role,
    status: 'available',
    assignedTo: null,
    createdAt: FieldValue.serverTimestamp(),
    usedAt: null,
    expiresAt,
    extendedBy: null,
    extendedAt: null,
  });
  
  return { 
    success: true,
    codeId: codeDoc.id,
    code,
    role,
    expiresAt: expiresAt?.toDate().toISOString() || null,
  };
});
```

### 3.6 Client-side Auth Hook

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { getAuth, signInWithCustomToken, onAuthStateChanged, User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface AuthState {
  user: User | null;
  role: 'admin' | 'student' | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
    error: null,
  });
  
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        setState({
          user,
          role: token.claims.role as 'admin' | 'student',
          loading: false,
          error: null,
        });
      } else {
        setState({ user: null, role: null, loading: false, error: null });
      }
    });
  }, []);
  
  const loginWithCode = async (code: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    
    try {
      const functions = getFunctions();
      const validateCode = httpsCallable(functions, 'validateCode');
      const result = await validateCode({ code });
      const { customToken } = result.data as { customToken: string };
      
      const auth = getAuth();
      await signInWithCustomToken(auth, customToken);
    } catch (error: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: error.message || 'Login failed',
      }));
    }
  };
  
  const logout = async () => {
    const auth = getAuth();
    await auth.signOut();
  };
  
  return { ...state, loginWithCode, logout };
};
```

---

## 4. 오프라인 지원 전략 (Offline Support)

### 4.1 Firestore Persistence

```typescript
// src/firebase.ts
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
```

### 4.2 오프라인 시나리오별 처리

| 시나리오 | 처리 방식 |
|---------|----------|
| 학습 진행 기록 | Firestore 오프라인 큐에 자동 저장, 온라인 복귀 시 동기화 |
| TTS 재생 | Service Worker 캐시 우선, 없으면 네트워크 요청 |
| 새 학습 세트 로드 | 캐시된 데이터 표시 + "오프라인" 배너 |
| 퀴즈 제출 | 로컬 저장 후 온라인 시 일괄 동기화 |

### 4.3 Service Worker 전략

```typescript
// public/sw.js (Workbox 사용 권장)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Pre-cache app shell
precacheAndRoute(self.__WB_MANIFEST);

// TTS files: Cache-first (immutable)
registerRoute(
  ({ url }) => url.pathname.startsWith('/tts/'),
  new CacheFirst({
    cacheName: 'tts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 2000,        // ~2000 sentences
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// API/Firestore: Network-first with fallback
registerRoute(
  ({ url }) => url.hostname.includes('firestore.googleapis.com'),
  new StaleWhileRevalidate({
    cacheName: 'firestore-cache',
  })
);
```

### 4.4 TTS Pre-fetching 로직

```typescript
// src/hooks/useTTSPrefetch.ts
export const useTTSPrefetch = (sentences: Sentence[], currentIndex: number) => {
  useEffect(() => {
    // Prefetch next 3 sentences
    const prefetchCount = 3;
    const toFetch = sentences.slice(currentIndex + 1, currentIndex + 1 + prefetchCount);
    
    toFetch.forEach(sentence => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = sentence.ttsUrls.female; // or selected voice
      // Browser will cache via Service Worker
    });
  }, [sentences, currentIndex]);
};
```

### 4.5 충돌 해결 (Conflict Resolution)

Firestore의 "last-write-wins" 정책을 따르되, 학습 시간은 **누적**이므로 충돌 가능성 낮음.

```typescript
// 학습 시간 업데이트는 항상 increment 사용
await updateDoc(progressRef, {
  studyTimeSeconds: increment(elapsedSeconds),
  repeatCount: increment(1),
  lastStudiedAt: serverTimestamp(),
});
```

---

## 5. TTS 최적화 (<100ms 재생 목표)

### 5.1 저장 구조

```
Firebase Storage:
gs://project-id.appspot.com/
└── tts/
    └── {setId}/
        └── {voice}/
            └── {sentenceId}.mp3
```

### 5.2 최적화 전략

1. **CDN 캐싱**: Firebase Hosting을 통해 Storage 파일 서빙 (자동 CDN)
2. **Pre-fetching**: 현재 문장 재생 중 다음 3개 문장 미리 로드
3. **Service Worker**: 재생한 파일은 로컬 캐시에 30일 보관
4. **압축**: MP3 64kbps mono (음성에 충분, 파일 크기 최소화)

### 5.3 예상 성능

| 조건 | 예상 지연 |
|-----|----------|
| Service Worker 캐시 히트 | <10ms |
| CDN 캐시 히트 (한국) | 30-50ms |
| CDN 캐시 미스 | 100-200ms |
| Pre-fetch 완료 | <10ms |

---

## 6. 관리자 기능: CSV 업로드 및 자동 처리

### 6.1 처리 Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │     │  Storage    │     │  Cloud Fn   │     │  TTS API    │
│  Dashboard  │     │  (upload)   │     │ processCSV  │     │  (Google)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ 1. Upload CSV     │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │ 2. Trigger        │                   │
       │                   │──────────────────>│                   │
       │                   │                   │                   │
       │                   │                   │ 3. Parse CSV      │
       │                   │                   │───────┐           │
       │                   │                   │<──────┘           │
       │                   │                   │                   │
       │                   │                   │ 4. Generate TTS   │
       │                   │                   │   (batch, parallel)
       │                   │                   │──────────────────>│
       │                   │                   │<──────────────────│
       │                   │                   │                   │
       │                   │                   │ 5. Save to Storage│
       │                   │                   │──────────────────>│
       │                   │                   │                   │
       │                   │                   │ 6. Update Firestore
       │                   │                   │───────┐           │
       │                   │                   │<──────┘           │
       │                   │                   │                   │
       │ 7. FCM/Email notification             │                   │
       │<──────────────────────────────────────│                   │
```

### 6.2 Cloud Function: `processCSV`

```typescript
// functions/src/admin/processCSV.ts
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import Papa from 'papaparse';

export const processCSV = onObjectFinalized(
  { 
    bucket: 'project-id.appspot.com',
    timeoutSeconds: 540,  // 9 minutes (max)
    memory: '1GiB',
  },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath.startsWith('uploads/csv/')) return;
    
    const db = getFirestore();
    const storage = getStorage();
    const ttsClient = new TextToSpeechClient();
    
    // 1. Download and parse CSV
    const bucket = storage.bucket(event.data.bucket);
    const [csvContent] = await bucket.file(filePath).download();
    const { data: rows } = Papa.parse(csvContent.toString(), { header: true });
    
    // 2. Create learning_set document
    const setId = generateSetId(filePath);
    const setRef = db.collection('learning_sets').doc(setId);
    
    await setRef.set({
      setId,
      title: extractTitle(filePath),
      description: '',
      sentenceCount: rows.length,
      status: 'processing',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: event.data.metadata?.uploadedBy || 'unknown',
      processingError: null,
    });
    
    // 3. Process sentences in batches
    const BATCH_SIZE = 10;
    const voices = ['female', 'male', 'child_female', 'child_male', 'elderly_female', 'elderly_male'];
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (row, idx) => {
        const sentenceId = i + idx;
        const ttsUrls: Record<string, string> = {};
        
        // Generate TTS for each voice
        for (const voice of voices) {
          const audioContent = await generateTTS(ttsClient, row.english, voice);
          const ttsPath = `tts/${setId}/${voice}/${sentenceId}.mp3`;
          
          await bucket.file(ttsPath).save(audioContent, {
            contentType: 'audio/mpeg',
            metadata: { cacheControl: 'public, max-age=31536000' },
          });
          
          ttsUrls[voice] = `https://storage.googleapis.com/${event.data.bucket}/${ttsPath}`;
        }
        
        // Save sentence document
        await setRef.collection('sentences').doc(String(sentenceId)).set({
          id: sentenceId,
          english: row['English Sentence'],
          koreanPronounce: row['Korean Pronounce'],
          directComprehension: row['Direct Comprehension'],
          comprehension: row['Comprehension'],
          ttsUrls,
        });
      }));
    }
    
    // 4. Mark as ready
    await setRef.update({ status: 'ready', updatedAt: FieldValue.serverTimestamp() });
    
    // 5. Send notification
    await sendCompletionNotification(event.data.metadata?.uploadedBy, setId);
  }
);
```

---

## 7. 학습자 대시보드 (Visual Dashboard)

### 7.1 주요 지표 (Main Metrics)

| 지표 | 데이터 소스 | 업데이트 주기 |
|-----|-----------|-------------|
| 오늘의 학습 시간 | `daily_stats/{today}` | 실시간 |
| 전체 학습 시간 | `users/{uid}.stats.totalStudyTimeSeconds` | 세션 종료 시 |
| 마스터한 문장 수 | `users/{uid}.stats.totalMasteredCount` | 마스터 시 즉시 |
| 연속 학습일 (Streak) | `users/{uid}.stats.currentStreak` | 일 1회 계산 |
| 학습 진행률 | `progress` subcollection count / total sentences | 실시간 |

### 7.2 실시간 트래킹 로직

```typescript
// src/hooks/useStudySession.ts
export const useStudySession = (sentenceId: string, setId: string) => {
  const [isActive, setIsActive] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  
  // Visibility change detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isActive) {
        pauseSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isActive]);
  
  const startSession = () => {
    startTimeRef.current = Date.now();
    setIsActive(true);
  };
  
  const pauseSession = () => {
    if (startTimeRef.current) {
      accumulatedRef.current += (Date.now() - startTimeRef.current) / 1000;
      startTimeRef.current = null;
    }
    setIsActive(false);
  };
  
  const endSession = async () => {
    pauseSession();
    const totalSeconds = Math.floor(accumulatedRef.current);
    
    if (totalSeconds > 0) {
      await saveProgress(sentenceId, setId, totalSeconds);
      accumulatedRef.current = 0;
    }
  };
  
  return { isActive, startSession, pauseSession, endSession };
};

const saveProgress = async (sentenceId: string, setId: string, seconds: number) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  
  const progressRef = doc(db, `users/${uid}/progress/${sentenceId}`);
  const dailyRef = doc(db, `users/${uid}/daily_stats/${getTodayString()}`);
  
  const batch = writeBatch(db);
  
  // Update sentence progress
  batch.set(progressRef, {
    sentenceId,
    setId,
    studyTimeSeconds: increment(seconds),
    repeatCount: increment(1),
    lastStudiedAt: serverTimestamp(),
  }, { merge: true });
  
  // Update daily stats
  batch.set(dailyRef, {
    date: getTodayString(),
    studyTimeSeconds: increment(seconds),
    sentencesStudied: increment(1),
  }, { merge: true });
  
  await batch.commit();
};
```

### 7.3 Mastery 판정 (Cloud Function Trigger)

```typescript
// functions/src/progress/checkMastery.ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

export const checkMastery = onDocumentWritten(
  'users/{uid}/progress/{sentenceId}',
  async (event) => {
    const after = event.data?.after.data();
    const before = event.data?.before.data();
    
    if (!after) return; // deleted
    
    const wasMastered = before?.status === 'mastered';
    const shouldBeMastered = 
      after.studyTimeSeconds >= 300 || // 5 minutes
      after.repeatCount >= 10;
    
    if (shouldBeMastered && !wasMastered) {
      const db = getFirestore();
      const { uid } = event.params;
      
      // Update progress status
      await event.data.after.ref.update({
        status: 'mastered',
        masteredAt: FieldValue.serverTimestamp(),
      });
      
      // Increment user's mastered count
      await db.doc(`users/${uid}`).update({
        'stats.totalMasteredCount': FieldValue.increment(1),
      });
    }
  }
);
```

### 7.4 Streak 계산 (Scheduled Function)

```typescript
// functions/src/stats/updateStreaks.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const updateStreaks = onSchedule('0 0 * * *', async () => { // Daily at midnight
  const db = getFirestore();
  const yesterday = getYesterdayString();
  
  const usersSnapshot = await db.collection('users').get();
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const lastActive = userData.stats.lastActiveDate;
    
    let newStreak = userData.stats.currentStreak;
    
    if (lastActive === yesterday) {
      // Studied yesterday - streak continues (will increment when they study today)
    } else if (lastActive !== getTodayString()) {
      // Missed a day - reset streak
      newStreak = 0;
    }
    
    if (newStreak !== userData.stats.currentStreak) {
      await userDoc.ref.update({
        'stats.currentStreak': newStreak,
      });
    }
  }
});
```

### 7.5 스피드 리스닝 레벨 추천 시스템

```typescript
// src/hooks/useLevelRecommendation.ts
import { useMemo } from 'react';
import { useCollection } from './useFirestore';

interface QuizResult {
  setId: string;
  level: number;
  score: number;
  completedAt: Timestamp;
}

interface LevelRecommendation {
  recommendedLevel: number;
  reason: 'high_performance' | 'maintain' | 'needs_practice';
  confidence: number; // 0-1, based on data sufficiency
  recentAvgScore: number;
}

export const useLevelRecommendation = (uid: string, currentLevel: number): LevelRecommendation | null => {
  const { data: quizResults } = useCollection<QuizResult>(
    `users/${uid}/quiz_results`,
    { orderBy: ['completedAt', 'desc'], limit: 5 }
  );
  
  return useMemo(() => {
    if (!quizResults || quizResults.length === 0) {
      return null; // Not enough data
    }
    
    const recentAvgScore = quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length;
    const confidence = Math.min(quizResults.length / 5, 1); // Full confidence at 5 results
    
    let recommendedLevel: number;
    let reason: LevelRecommendation['reason'];
    
    if (recentAvgScore >= 90) {
      recommendedLevel = Math.min(currentLevel + 1, 5); // Max level 5
      reason = 'high_performance';
    } else if (recentAvgScore >= 70) {
      recommendedLevel = currentLevel;
      reason = 'maintain';
    } else {
      recommendedLevel = Math.max(currentLevel - 1, 1); // Min level 1
      reason = 'needs_practice';
    }
    
    return {
      recommendedLevel,
      reason,
      confidence,
      recentAvgScore: Math.round(recentAvgScore),
    };
  }, [quizResults, currentLevel]);
};
```

### 7.6 추천 UI 컴포넌트

```typescript
// src/components/speed-listening/LevelRecommendation.tsx
import { useLevelRecommendation } from '../../hooks/useLevelRecommendation';

interface Props {
  uid: string;
  currentLevel: number;
  onSelectLevel: (level: number) => void;
}

export const LevelRecommendationBadge: React.FC<Props> = ({ uid, currentLevel, onSelectLevel }) => {
  const recommendation = useLevelRecommendation(uid, currentLevel);
  
  if (!recommendation || recommendation.confidence < 0.4) {
    return null; // Not enough data to recommend
  }
  
  const messages = {
    high_performance: '실력이 늘었어요! 한 단계 높은 레벨에 도전해보세요.',
    maintain: '현재 레벨이 딱 맞아요. 계속 연습하세요!',
    needs_practice: '조금 더 연습이 필요해요. 쉬운 레벨로 복습해볼까요?',
  };
  
  const colors = {
    high_performance: 'bg-green-100 text-green-800 border-green-300',
    maintain: 'bg-blue-100 text-blue-800 border-blue-300',
    needs_practice: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };
  
  return (
    <div className={`p-4 rounded-lg border ${colors[recommendation.reason]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{messages[recommendation.reason]}</p>
          <p className="text-sm opacity-75">
            최근 평균 점수: {recommendation.recentAvgScore}%
          </p>
        </div>
        {recommendation.recommendedLevel !== currentLevel && (
          <button
            onClick={() => onSelectLevel(recommendation.recommendedLevel)}
            className="px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow transition-shadow"
          >
            Level {recommendation.recommendedLevel} 선택
          </button>
        )}
      </div>
    </div>
  );
};
```

### 7.7 컴포넌트 구조

```
src/components/dashboard/
├── DashboardPage.tsx          # 메인 대시보드 페이지
├── StatsOverview.tsx          # 오늘 학습시간, 마스터 수, 스트릭
├── ProgressRing.tsx           # 원형 진행률 차트
├── LearningHeatmap.tsx        # GitHub 스타일 히트맵
├── SentenceList.tsx           # 학습중/마스터 문장 목록
└── QuizHistory.tsx            # 스피드리스닝 결과 목록

src/components/speed-listening/
├── SpeedListeningQuiz.tsx     # 기존 퀴즈 컴포넌트
├── LevelRecommendation.tsx    # 레벨 추천 배지
└── SetSelector.tsx            # 세트 선택 (추천 표시 포함)
```

---

## 8. 비용 추정 (Cost Estimation)

### 8.1 가정

- 활성 사용자: 100명
- 일 평균 학습 시간: 30분/사용자
- 학습 세트: 3개 (총 ~1,200 문장)
- TTS 음성: 6종류 (female, male, child_female, child_male, elderly_female, elderly_male)

### 8.2 Firestore

| 작업 | 일일 예상량 | 월간 비용 |
|-----|-----------|----------|
| 읽기 | 100 users × 50 reads/session × 2 sessions = 10,000 | 무료 (50K/일 무료) |
| 쓰기 | 100 users × 30 writes/session × 2 sessions = 6,000 | 무료 (20K/일 무료) |
| 저장 | ~10MB (작음) | 무료 |

**예상 월 비용: $0** (무료 티어 내)

### 8.3 Cloud Functions

| 함수 | 호출 빈도 | 월간 비용 |
|-----|----------|----------|
| validateCode | ~200/월 (로그인) | 무료 |
| createAccessCode | ~20/월 (관리자) | 무료 |
| extendCodeExpiration | ~10/월 (관리자) | 무료 |
| processCSV | ~5/월 (CSV 업로드) | 무료 |
| checkMastery | ~3,000/월 (progress 업데이트) | 무료 |
| updateStreaks | 30/월 (daily cron) | 무료 |

**예상 월 비용: $0** (2M 호출/월 무료)

### 8.4 Cloud Storage

| 항목 | 용량 | 월간 비용 |
|-----|-----|----------|
| TTS 파일 | 1,200 sentences × 6 voices × 50KB = 360MB | 무료 (5GB 무료) |
| CSV 업로드 | ~1MB | 무료 |
| 대역폭 | 100 users × 200 files/day × 50KB = 300GB/월 | ~$3.60 |

**예상 월 비용: ~$4**

### 8.5 TTS API (Google Cloud)

| 항목 | 수량 | 비용 |
|-----|-----|-----|
| 초기 생성 | 1,200 sentences × 100 chars × 6 voices = 720K chars | 무료 (1M chars/월 무료) |
| 신규 세트 추가 | ~60K chars/세트 (6 voices) | 무료 |

**예상 월 비용: $0** (무료 티어 내, 대량 추가 시 $2.88/세트)

### 8.6 총 예상 비용

| 항목 | 월간 비용 |
|-----|----------|
| Firestore | $0 |
| Cloud Functions | $0 |
| Cloud Storage | $4 |
| TTS API | $0 |
| **합계** | **~$4/월** |

> **주의**: 사용자가 1,000명 이상으로 확장 시 Firestore 읽기 비용 발생 가능. 그 시점에 캐싱 전략 재검토 필요.

---

## 9. 마이그레이션 계획 (Migration Plan)

### 9.1 현재 상태

```
현재 (Static):
├── public/
│   ├── *.csv                    # 학습 데이터
│   ├── speed_listening_*.json   # 스피드리스닝 데이터
│   └── tts/{setId}/{voice}/*.mp3 # TTS 파일
└── src/
    └── hooks/useData.ts         # CSV fetch 로직
```

### 9.2 마이그레이션 단계

#### Phase 0: 병행 운영 준비 (1주)

```typescript
// src/hooks/useData.ts - Feature Flag 추가
const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';

export const useData = (filename: string | undefined) => {
  if (USE_FIREBASE) {
    return useFirestoreData(filename);
  }
  return useLegacyCSVData(filename);
};
```

#### Phase 1: 데이터 마이그레이션 (1주)

```bash
# 마이그레이션 스크립트 실행
node scripts/migrate-to-firebase.js

# 스크립트 내용:
# 1. CSV 파싱 → Firestore learning_sets 생성
# 2. TTS 파일 → Firebase Storage 업로드
# 3. speed_listening JSON → Firestore 변환
```

#### Phase 2: 병행 운영 (2주)

- `VITE_USE_FIREBASE=false` 로 기존 시스템 유지
- 내부 테스트용 빌드에서 `VITE_USE_FIREBASE=true` 검증
- A/B 테스트로 성능 비교

#### Phase 3: 완전 전환 (1일)

```bash
# 환경 변수 전환
VITE_USE_FIREBASE=true

# 배포
npm run build && firebase deploy
```

#### Phase 4: 정리 (1주)

- `/public` 에서 데이터 파일 제거
- Legacy 코드 삭제
- 문서 업데이트

### 9.3 롤백 계획

```typescript
// 문제 발생 시 즉시 롤백
// 1. Vercel/Firebase Hosting에서 이전 빌드로 롤백
// 2. 또는 환경 변수만 변경하여 재배포
VITE_USE_FIREBASE=false
```

### 9.4 데이터 무결성 검증

```typescript
// scripts/verify-migration.js
async function verify() {
  const csvData = await loadCSV('ultimate_speaking_beginner_1_1050.csv');
  const firestoreData = await loadFirestore('ultimate_speaking_beginner_1_1050');
  
  // 1. 문장 수 일치 확인
  assert(csvData.length === firestoreData.length);
  
  // 2. 각 문장 내용 일치 확인
  csvData.forEach((csv, i) => {
    const fs = firestoreData[i];
    assert(csv.english === fs.english);
    assert(csv.koreanPronounce === fs.koreanPronounce);
  });
  
  // 3. TTS 파일 존재 확인
  for (const sentence of firestoreData) {
    const exists = await checkStorageFile(sentence.ttsUrls.female);
    assert(exists);
  }
  
  console.log('Migration verified successfully!');
}
```

---

## 10. 보안 규칙 (Firebase Security Rules)

### 10.1 Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && request.auth.token.role == 'admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Access codes: Admin only
    match /access_codes/{codeId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    
    // Users: Owner only (except admin can read all)
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId);
      
      // Progress subcollection
      match /progress/{sentenceId} {
        allow read, write: if isOwner(userId);
      }
      
      // Daily stats subcollection
      match /daily_stats/{date} {
        allow read, write: if isOwner(userId);
      }
      
      // Quiz results subcollection
      match /quiz_results/{resultId} {
        allow read, write: if isOwner(userId);
      }
    }
    
    // Learning sets: Public read, admin write
    match /learning_sets/{setId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
      
      match /sentences/{sentenceId} {
        allow read: if isAuthenticated();
        allow write: if isAdmin();
      }
    }
    
    // Speed listening sets: Same as learning sets
    match /speed_listening_sets/{setId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
      
      match /sentences/{sentenceId} {
        allow read: if isAuthenticated();
        allow write: if isAdmin();
      }
    }
  }
}
```

### 10.2 Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // TTS files: Public read, admin write
    match /tts/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }
    
    // CSV uploads: Admin only
    match /uploads/csv/{fileName} {
      allow read: if request.auth.token.role == 'admin';
      allow write: if request.auth.token.role == 'admin'
                   && request.resource.size < 10 * 1024 * 1024  // 10MB limit
                   && request.resource.contentType == 'text/csv';
    }
  }
}
```

---

## 11. 단계별 구현 로드맵 (Roadmap)

### Phase 0: 마이그레이션 준비 (Week 1) ✅ 완료

- [x] Firebase 프로젝트 생성 및 초기 설정
- [x] 마이그레이션 스크립트 작성 (`scripts/migrate-to-firestore-prod.cjs`)
- [x] Feature flag 시스템 구현 (`VITE_USE_FIREBASE`, `VITE_USE_EMULATOR`)
- [x] 기존 데이터를 Firebase로 복사 (CSV → Firestore, TTS → Storage)
- [x] 데이터 무결성 검증 (운영 테스트 완료)

### Phase 1: 인증 시스템 (Week 2) ✅ 완료

- [x] Cloud Function: `validateCode` 구현
- [x] Cloud Function: `createAccessCode` 구현
- [x] Cloud Function: `extendCodeExpiration` 구현
- [x] `useAuth` 훅 구현
- [x] `LoginOverlay` 컴포넌트 구현
- [x] Admin 코드 생성 UI (`AdminCodeGenerator`)
- [x] Admin 코드 연장 UI (`CodeExpirationManager`)
- [x] Firestore/Storage 보안 규칙 배포

### Phase 2: 데이터 레이어 전환 (Week 3) ✅ 완료

- [x] `useData` 훅 구현 (learning_sets 읽기)
- [x] `useSpeedListeningData` 훅 구현
- [x] Service Worker 설정 (TTS 캐싱) - vite-plugin-pwa + Workbox
- [x] Firestore persistence 설정 (오프라인 지원)
- [x] 병행 운영 테스트

### Phase 3: 학습 진행 트래킹 (Week 4) ✅ 완료

- [x] `useStudySession` 훅 구현 (시간 트래킹)
- [x] `progress` subcollection 쓰기 로직
- [x] `daily_stats` 자동 업데이트
- [x] Cloud Function: `checkMastery` (마스터 판정)
- [x] Cloud Function: `updateStreaks` (streak 계산)

### Phase 4: 대시보드 UI (Week 5) ✅ 완료

- [x] `ProfilePage` 컴포넌트 (부분)
- [x] `DashboardPage` 레이아웃
- [x] `StatsOverview` 컴포넌트 (오늘 학습시간, 마스터 수)
- [x] `ProgressRing` 컴포넌트 (진행률 차트)
- [x] `LearningHeatmap` 컴포넌트 (GitHub 스타일)
- [x] `QuizHistory` 컴포넌트 (스피드리스닝 기록)
- [x] `useLevelRecommendation` 훅 구현 (스피드리스닝 추천)
- [x] `LevelRecommendationBadge` 컴포넌트

### Phase 5: 관리자 기능 (Week 6) 🔄 40% 완료

- [x] Admin 대시보드 페이지 (`AdminDashboard`)
- [x] 사용자 관리 UI (`UserManager`)
- [ ] CSV 업로드 UI
- [ ] Cloud Function: `processCSV` (자동 TTS 생성)
- [ ] 처리 상태 실시간 표시
- [ ] 완료 알림 (FCM/이메일)

### Phase 6: 최적화 및 정리 (Week 7) ❌ 미완료

- [ ] 성능 테스트 및 최적화
- [ ] Legacy 코드 제거
- [ ] 문서 최종 업데이트
- [x] 프로덕션 배포 (2026-03-22)

---

## 12. 결정 사항 (Decisions Made)

### [DECISION-1] 액세스 코드 만료 기능 - **결정 완료**

| 역할 | 정책 |
|-----|-----|
| **Admin** | 만료 없음 (`expiresAt: null`) |
| **Student** | 30일 기본 만료, 관리자가 연장 가능 |

**구현 요구사항**:
- 관리자 대시보드에 "코드 연장" 기능 추가
- 만료 7일 전 사용자에게 알림 (FCM)
- 만료된 코드로 로그인 시도 시 "관리자에게 연장 요청하세요" 메시지

---

### [DECISION-2] TTS 음성 종류 - **결정 완료**

**선택: C (6종)** - 현재 SpeedListening과 동일하게 유지

| Voice ID | 설명 |
|----------|------|
| `female` | 성인 여성 |
| `male` | 성인 남성 |
| `child_female` | 어린이 여성 |
| `child_male` | 어린이 남성 |
| `elderly_female` | 노인 여성 |
| `elderly_male` | 노인 남성 |

**비용 영향**: 저장 용량 360MB, TTS 생성 비용 3배 (하지만 1회성이므로 허용 가능)

---

### [DECISION-3] 마스터 기준 - **결정 완료**

**선택: C (복합 OR 조건)**

```typescript
const isMastered = studyTimeSeconds >= 300 || repeatCount >= 10;
```

- 5분 이상 학습 **또는** 10회 이상 반복 시 마스터 처리
- 다양한 학습 스타일 수용 (짧게 여러 번 vs 길게 집중)

---

### [DECISION-4] 실시간 구독 범위 - **결정 완료**

**선택: B (user + progress)**

| 컬렉션 | 구독 방식 |
|-------|----------|
| `users/{uid}` | 실시간 (`onSnapshot`) |
| `users/{uid}/progress/*` | 실시간 (`onSnapshot`) |
| `users/{uid}/daily_stats/*` | 실시간 (`onSnapshot`) |
| `learning_sets/*` | 1회 fetch + 캐시 |
| `speed_listening_sets/*` | 1회 fetch + 캐시 |

---

### [DECISION-5] 스피드리스닝 난이도 자동 조절 - **결정 완료**

**선택: B (추천 시스템)**

**구현 방식**:
1. 사용자의 최근 5개 퀴즈 결과 분석
2. 평균 점수 기반 추천 레벨 계산:
   - 90% 이상: 현재 레벨 + 1 추천
   - 70-89%: 현재 레벨 유지
   - 70% 미만: 현재 레벨 - 1 추천
3. UI에 "추천" 배지 표시, 사용자가 최종 선택

```typescript
interface LevelRecommendation {
  recommendedLevel: number;
  reason: 'high_performance' | 'maintain' | 'needs_practice';
  confidence: number; // 0-1, 데이터 충분도
}
```

---

## Appendix A: 폴더 구조 (최종)

```
sdc_app/
├── functions/                      # Firebase Cloud Functions
│   ├── src/
│   │   ├── auth/
│   │   │   ├── validateCode.ts
│   │   │   ├── createAccessCode.ts
│   │   │   └── extendCodeExpiration.ts
│   │   ├── admin/
│   │   │   └── processCSV.ts
│   │   ├── progress/
│   │   │   └── checkMastery.ts
│   │   └── stats/
│   │       └── updateStreaks.ts
│   └── package.json
├── scripts/
│   ├── migrate-to-firebase.js
│   └── verify-migration.js
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginOverlay.tsx
│   │   │   └── AdminCodeGenerator.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   └── CodeExpirationManager.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── StatsOverview.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   ├── LearningHeatmap.tsx
│   │   │   └── QuizHistory.tsx
│   │   ├── speed-listening/
│   │   │   ├── SpeedListeningQuiz.tsx
│   │   │   ├── LevelRecommendation.tsx
│   │   │   └── SetSelector.tsx
│   │   └── ...existing components
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useFirestoreData.ts
│   │   ├── useStudySession.ts
│   │   ├── useTTSPrefetch.ts
│   │   ├── useLevelRecommendation.ts
│   │   └── ...existing hooks
│   ├── firebase.ts                 # Firebase 초기화
│   └── ...
├── firestore.rules
├── storage.rules
├── firebase.json
└── PLAN.md
```

---

## Appendix B: 환경 변수

```bash
# .env.local
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# Feature flags
VITE_USE_FIREBASE=true
```

---

*문서 최종 수정: 2026-03-22*
*작성자: Architecture Review*
