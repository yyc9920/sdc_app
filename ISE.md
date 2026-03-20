1. Context & Goal
제공된 영어 학습 데이터(./public/essential_travel_english_phrases_100.csv, ./public/ultimate_speaking_beginner_1_1050.csv)를 분석하여, 유저가 리스닝 연습 모드에서 선택할 수 있는 '주제별 씬(Scene)'과 '난이도(Level)'가 결합된 구조화된 데이터를 생성하고 유저가 리스닝 모드를 활용하여 학습하도록 하는 것이 목표입니다.

2. Technical Requirements
* Home Screen 에서 반복 학습 / Speed Listening 모드를 선택할 수 있도록 변경. 각 모드 선택 시 Sentence set 선택할 수 있도록 변경.
* Input Handling: CSV 파일 파싱 시 문장 내 쉼표(,)로 인한 열 어긋남 오류를 방지할 수 있도록 quoting=csv.QUOTE_ALL 옵션을 사용하거나 예외 처리를 포함할 것.
* Language: Python (Pandas/JSON library 활용).
* Output Format: 각 연습 세트를 담은 JSON 배열 형태.
* Quiz Format:
    - 영어 문장을 대화 형식 또는 순서에 맞게 배열.
    - 고유명사를 제외한 단어를 랜덤하게 빈칸으로 표시.
    - 빈칸 갯수는 레벨이 높을수록 많아짐.
    - 영어 문장을 처음에는 1배속, 1.2배속, 1.5배속, 2배속으로 4번 재생하며 듣고 빈칸을 채우도록 함. (L)
    - Chunk의 내용을 고려한 간단한 문제를 하나 제공.
    - 정답 제출 버튼을 누르면 채점 및 결과 표시 후 다음 문제로 이동 가능.

3. Processing Logic

Step 1: 주제별 씬(Scene) 그룹화 (Sequential Grouping)
데이터가 대화 흐름순으로 정렬되어 있으므로, 다음 인덱스 범위를 참고하여 theme 필드를 할당하세요.
(Examples for ./public/essential_travel_english_phrases_100.csv)
* Greetings: 0~30번 행 (인사 및 작별)
* Introduction: 100~110번 행 (자기소개 및 소개하기)
* Possession: 115~132번 행 (물건의 소유 확인)
* Shopping: 500~535번 행 (가격 문의 및 쇼핑)
* Health: 536~545번 행 (건강 상태 및 처방)

Step 2: 문장 복잡도에 따른 난이도(Level) 분류
English Sentence의 단어 수(Word Count), 내용의 복잡도(Complexity)를 기준으로 레벨을 자동 태깅하세요.
문장 셋의 크기에 따라 레벨을 3개에서 6개로 분류하세요.

4. Constraint
* 각 대화 세트(set_id)는 최소 4개 이상, 최대 15개의 문장을 넘지 않도록 Chunking 하세요.
* 동일한 테마 안에서도 레벨이 섞여 있다면, 레벨별로 별도의 세트를 구성하여 유저가 난이도별로 선택할 수 있게 하세요.
* 레벨이 높아질수록 문장 갯수와 빈칸의 갯수도 많아지도록 해주세요.
