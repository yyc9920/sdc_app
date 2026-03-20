# SDC APP Plan

## Data migration

Read @direct_comprehension.xlsx , @korean_guide.xlsx and migrate it to one ultimate_speaking_beginner_1_1050.csv file.
Exchange column like below.
영어 문장 => English Sentence
한글 발음 => Korean Pronounce
직독직해(한글) => Direct Comprehension
한국어 표현 => Comprehension

For example, index 1 to 3 should be like below.
English Sentence,Korean Pronounce,Direct Comprehension,Comprehension
"Hi, Sarah.","하이, 새롸.","안녕 / 사라","안녕, 사라."
"Hi, David.","하이, 데이빗.","안녕 / 데이빗","안녕, 데이빗."
"Good morning.","굿 모어닝.","좋은 / 아침","좋은 아침입니다."

## Building App

This appliaction is for studying english with repeat listening sentences.

### Pre-build

- Make TTS files for each 1050 sentences with high quality TTS tool.

### Requirements

- Keep it SPA
- Cards: Render sentence cards from ultimate_speaking_beginner_1_1050.csv
- Pagination: Implement pagination to avoid memory overload during rendering cards
- Let users to choose the range of learning sentences, repeat count(1~100), random or not.
- Repeat tts for english sentence according to repeat count.
- Night mode
- Keep UI/UX simple and intuitively
