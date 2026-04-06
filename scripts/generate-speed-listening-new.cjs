/**
 * Speed Listening Set Generator for english_dataset.csv
 *
 * Reads english_dataset.csv, groups by SetCode, and generates
 * speed_listening JSON files per learning set.
 *
 * RowType handling:
 *   - script, reading, expression, prompt, task → listenable sentences
 *   - question → used for quiz generation (Tier 1)
 *   - vocab → used for quiz generation (Tier 2)
 *   - meta → skipped
 *   - unknown → treated as script
 *
 * Usage:
 *   node scripts/generate-speed-listening-new.cjs
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const PUBLIC_DIR = path.join(__dirname, '../public');
const OUTPUT_DIR = path.join(PUBLIC_DIR, 'speed_listening_new');

// RowTypes that become listenable sentences
const LISTENABLE_ROW_TYPES = new Set(['script', 'reading', 'expression', 'prompt', 'task']);
// RowTypes that are excluded from sentences
const EXCLUDED_ROW_TYPES = new Set(['vocab', 'question', 'meta']);

// --- Helpers ---

function parseSetCode(setCode) {
  const parts = setCode.split('_');
  const level = parseInt(parts[0].substring(1), 10);
  const category = parts[1];
  return { level, category };
}

function extractProperNouns(sentence) {
  const words = sentence.split(' ');
  const indices = [];
  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[^\w]/g, '');
    if (!clean) continue;
    if ((clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase() && i > 0) || clean === 'I') {
      indices.push(i);
    }
  }
  return indices;
}

function calculateLevel(sentences) {
  const wordCounts = sentences.map(s => s.english.split(' ').length);
  const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  if (avg <= 3) return 1;
  if (avg <= 5) return 2;
  if (avg <= 7) return 3;
  if (avg <= 9) return 4;
  if (avg <= 12) return 5;
  return 6;
}

function chunkSentences(sentences, targetSize = 5, minSize = 4, maxSize = 7) {
  if (sentences.length <= maxSize) return [sentences];

  const chunks = [];
  for (let i = 0; i < sentences.length; i += targetSize) {
    chunks.push(sentences.slice(i, i + targetSize));
  }

  // Rebalance if last chunk is too small
  if (chunks.length > 1 && chunks[chunks.length - 1].length < minSize) {
    const lastTwo = [...chunks[chunks.length - 2], ...chunks[chunks.length - 1]];
    if (lastTwo.length <= maxSize + 3) {
      // Merge into one
      chunks[chunks.length - 2] = lastTwo;
      chunks.pop();
    } else {
      // Rebalance evenly
      const half = Math.ceil(lastTwo.length / 2);
      chunks[chunks.length - 2] = lastTwo.slice(0, half);
      chunks[chunks.length - 1] = lastTwo.slice(half);
    }
  }

  return chunks;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Quiz Generation ---

/**
 * Tier 2: Use vocab rows for vocabulary quiz
 */
function generateQuizFromVocab(vocabRows) {
  if (vocabRows.length < 4) return null;

  const shuffled = shuffleArray(vocabRows);
  const correct = shuffled[0];
  const distractors = shuffled.slice(1, 4);

  // For vocab rows: Speaker column has the English term,
  // EnglishSentence has the Korean meaning, Comprehension has Korean description
  const correctEnglish = correct.Speaker || correct.EnglishSentence || '';
  const correctKorean = correct.Comprehension || correct.EnglishSentence || '';

  if (!correctEnglish || !correctKorean) return null;

  const options = shuffleArray([
    correctEnglish,
    ...distractors.map(d => d.Speaker || d.EnglishSentence || '')
  ].filter(Boolean));

  const answerIndex = options.indexOf(correctEnglish);

  return {
    question: `What does '${correctKorean}' mean in English?`,
    options,
    answer: answerIndex >= 0 ? answerIndex : 0
  };
}

/**
 * Tier 3: Topic-based quiz (fallback)
 */
function generateQuizFromTopic(setTitle, allTitlesInCategory) {
  const distractors = shuffleArray(
    allTitlesInCategory.filter(t => t !== setTitle)
  ).slice(0, 3);

  // If not enough titles in category, use generic distractors
  const genericTopics = [
    'Weather and Seasons', 'Food and Cooking', 'Sports and Exercise',
    'Travel and Tourism', 'Health and Medicine', 'Technology and Innovation',
    'Education and Learning', 'Business and Finance', 'Art and Culture',
    'Environment and Nature', 'History and Politics', 'Science and Research'
  ];

  while (distractors.length < 3) {
    for (const g of shuffleArray(genericTopics)) {
      if (g !== setTitle && !distractors.includes(g) && distractors.length < 3) {
        distractors.push(g);
      }
    }
  }

  const options = shuffleArray([setTitle, ...distractors.slice(0, 3)]);
  const answerIndex = options.indexOf(setTitle);

  return {
    question: 'What is the main topic of this passage?',
    options,
    answer: answerIndex >= 0 ? answerIndex : 0
  };
}

// --- Main ---

function main() {
  const filePath = path.join(PUBLIC_DIR, 'english_dataset.csv');
  if (!fs.existsSync(filePath)) {
    console.error('english_dataset.csv not found in public/');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(filePath, 'utf8');
  const { data: rows } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  console.log(`Parsed ${rows.length} rows`);

  // Group rows by SetCode
  const setMap = new Map();
  for (const row of rows) {
    const code = row.SetCode;
    if (!code) continue;
    if (!setMap.has(code)) setMap.set(code, []);
    setMap.get(code).push(row);
  }
  console.log(`Found ${setMap.size} sets`);

  // Build title lookup by category for Tier 3 distractors
  const titlesByCategory = {};
  for (const [setCode, setRows] of setMap) {
    const { category } = parseSetCode(setCode);
    const title = setRows[0].SetTitle || setCode;
    if (!titlesByCategory[category]) titlesByCategory[category] = [];
    if (!titlesByCategory[category].includes(title)) {
      titlesByCategory[category].push(title);
    }
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalFiles = 0;
  let totalSets = 0;
  let totalSentences = 0;
  let skippedSets = 0;

  for (const [setCode, setRows] of setMap) {
    const { category } = parseSetCode(setCode);
    const setTitle = setRows[0].SetTitle || setCode;

    // Separate rows by type
    const listenableRows = [];
    const vocabRows = [];
    const questionRows = [];

    for (const row of setRows) {
      const rowType = (row.RowType || '').toLowerCase().trim();
      if (LISTENABLE_ROW_TYPES.has(rowType)) {
        listenableRows.push(row);
      } else if (rowType === 'vocab') {
        vocabRows.push(row);
      } else if (rowType === 'question') {
        questionRows.push(row);
      } else if (rowType === 'meta') {
        // skip
      } else if (rowType && !EXCLUDED_ROW_TYPES.has(rowType)) {
        // Unknown RowType (e.g., "It's the Person") — treat as script
        listenableRows.push(row);
      }
    }

    // Minimum viable set
    if (listenableRows.length < 3) {
      console.log(`  SKIP ${setCode}: only ${listenableRows.length} listenable sentences`);
      skippedSets++;
      continue;
    }

    // Build sentences
    const sentences = listenableRows.map((row, idx) => ({
      id: idx,
      english: (row.EnglishSentence || '').trim(),
      korean: (row.Comprehension || '').trim(),
      properNounIndices: extractProperNouns((row.EnglishSentence || '').trim())
    })).filter(s => s.english.length > 0);

    if (sentences.length < 3) {
      console.log(`  SKIP ${setCode}: only ${sentences.length} non-empty sentences`);
      skippedSets++;
      continue;
    }

    // Chunk sentences
    const chunks = chunkSentences(sentences);

    // Generate speed listening sets
    const speedSets = chunks.map((chunk, chunkIdx) => {
      const chunkLevel = calculateLevel(chunk);
      const setId = `${setCode}_set${chunkIdx + 1}`;

      // Quiz generation: Tier 2 (vocab) → Tier 3 (topic)
      // Note: question rows from CSV lack answer data, so we skip Tier 1
      let quiz = null;

      if (vocabRows.length >= 4) {
        // Tier 2: vocab-based quiz
        quiz = generateQuizFromVocab(vocabRows);
      }

      if (!quiz) {
        // Tier 3: topic-based
        quiz = generateQuizFromTopic(setTitle, titlesByCategory[category] || []);
      }

      return {
        setId,
        parentSetId: setCode,
        theme: setTitle,
        level: chunkLevel,
        setNumber: chunkIdx + 1,
        sentences: chunk,
        quiz
      };
    });

    // Write JSON
    const outputPath = path.join(OUTPUT_DIR, `${setCode}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(speedSets, null, 2), 'utf8');

    totalFiles++;
    totalSets += speedSets.length;
    totalSentences += sentences.length;
    console.log(`  ${setCode}: ${speedSets.length} sets, ${sentences.length} sentences`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Files generated: ${totalFiles}`);
  console.log(`Total speed listening sets: ${totalSets}`);
  console.log(`Total sentences: ${totalSentences}`);
  console.log(`Skipped sets (< 3 sentences): ${skippedSets}`);
}

main();
