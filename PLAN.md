# SDC App 개선 플랜

Firebase + Capacitor 기반 영어 학습 앱의 단계별 개선 로드맵

-----

## Phase 1. 안정성 & 품질 기반 (1–2주) — Critical

### 테스트 인프라 구축

Vitest + React Testing Library 도입. `hooks/` 디렉토리의 커스텀 훅부터 단위 테스트 작성. Cloud Functions는 Firebase Test SDK로 통합 테스트.

### 에러 바운더리 & 글로벌 에러 핸들링

React Error Boundary를 주요 라우트 단위로 적용. React Query의 `onError` 글로벌 핸들러에서 Firebase 에러코드→사용자 메시지 매핑을 일원화.

### Firestore 보안 규칙 테스트

`@firebase/rules-unit-testing`으로 역할별(Admin/Teacher/Student) CRUD 시나리오 테스트. 현재 rules만 있고 테스트가 없으면 배포 시 regression 위험.

### CI/CD 파이프라인

GitHub Actions: lint → typecheck → test → build → PR preview deploy. Firebase branch deploy로 staging 환경 분리.

-----

## Phase 2. 성능 최적화 (2–3주) — High

### 번들 사이즈 분석 & 코드 스플리팅

`rollup-plugin-visualizer`로 번들 분석. `React.lazy` + `Suspense`로 라우트 기반 코드 스플리팅.

### Firestore 쿼리 최적화

복합 인덱스 점검. 랭킹 조회 시 `users` 컬렉션 전체 스캔 대신 stats 서브필드에 인덱스 적용.

### ~~React Query staleTime/cacheTime 튜닝~~ ✅ 완료

main.tsx에서 staleTime 5분, useData에서 30분/60분 설정 완료.

### ~~TTS 오디오 캐싱 강화~~ ✅ 완료

Workbox CacheFirst, 30일/2000건 설정 완료.

### 이미지/에셋 최적화

아이콘은 SVG 스프라이트로 통합. Vite의 asset inlining 임계값 조정.

-----

## Phase 3. 사용자 경험 개선 (3–4주) — High

### ~~오프라인 모드 & PWA 강화~~ ✅ 완료

Firestore persistence + Service Worker 구현 완료.

### ~~음성 인식 안정성 개선~~ ✅ 완료

모바일 브라우저 getUserMedia 제스처 대응, 재시도 로직, 에러 피드백 UI 구현 완료.

### 학습 진도 시각화

대시보드에 일별/주별 학습 시간, 마스터리 진행률 차트 추가. Recharts 등 가벼운 차트 라이브러리 활용.

### 접근성(a11y) 감사

axe-core 또는 Lighthouse 접근성 감사. ARIA 라벨 점검.

-----

## Phase 4. 아키텍처 개선 (4–6주) — Medium

### 상태 관리 정리

클라이언트 상태(UI 토글, 폼 등)가 prop drilling 되고 있다면 Zustand 도입. Context API 남용 제거.

### Cloud Functions 모듈화 강화

공통 미들웨어(인증 검증, 에러 래핑, 로깅) 추출. Callable Function 래퍼 유틸 생성.

### 타입 안전성 강화

Firestore 문서 타입을 `withConverter`로 강제. Cloud Function ↔ 클라이언트 간 공유 타입 패키지 생성.

### 환경 설정 통합

환경별(dev/staging/prod) Firebase 프로젝트 분리. `.env.development`, `.env.production` 명확히 관리.

-----

## Phase 5. 기능 확장 (6–8주) — Medium

### ~~Teacher 대시보드~~ ✅ 기본 완료

학생 검색, 배정, 기본 통계 구현 완료. 향후 차트/상세 통계 추가 가능.

### 콘텐츠 관리 UI

웹 UI에서 직접 학습 세트의 문장 추가/수정/삭제. 미리보기 & TTS 테스트 기능.

### 푸시 알림

FCM으로 학습 리마인더, 스트릭 유지 알림. Capacitor Push Notifications 플러그인으로 iOS/Android 대응.

### 다국어(i18n) 지원

`react-i18next` 도입. 하드코딩된 문자열을 번역 키로 전환.

-----

## Phase 6. iOS 네이티브 안정화 (Phase 1과 병렬 진행) — High

### Capacitor 플러그인 관리 자동화

빌드 스크립트에 post-sync hook 추가하여 `CapApp-SPM/Package.swift` 자동 복원.

### ~~Auth Persistence 안정화~~ ✅ 완료

`initializeAuth()` + platform 분기 구현 완료.

### 네이티브 성능 프로파일링

Xcode Instruments로 메모리/CPU 프로파일링. 대용량 학습 세트에서의 성능 테스트.

-----

## 추천 실행 순서

**Phase 1 + 6** 병렬 시작 → **Phase 2 → 3** 순서로 성능과 UX 개선. **Phase 4**는 점진적 진행. **Phase 5**는 앞 단계 안정화 후 착수.
