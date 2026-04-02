export const FUNCTION_WORDS = new Set([
  // Pronouns
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  // Determiners
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'some', 'any', 'every', 'each', 'all', 'both', 'few', 'more', 'most',
  'other', 'another', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  // Prepositions
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'along', 'until', 'without', 'about', 'against',
  'among', 'around', 'behind', 'beside', 'beyond', 'near', 'toward', 'upon',
  // Auxiliaries / Modals
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  // Conjunctions
  'and', 'but', 'or', 'if', 'so', 'yet', 'because', 'since', 'while',
  'when', 'where', 'how', 'what', 'which', 'who', 'whom', 'whose',
  'whether', 'although', 'though', 'unless', 'than', 'that',
  // Common adverbs / particles
  'up', 'out', 'off', 'down', 'over', 'away',
  'here', 'there', 'then', 'now', 'just', 'also', 'too', 'very',
  'well', 'back', 'even', 'still', 'already',
  // Contractions (base forms)
  "i'm", "i've", "i'd", "i'll",
  "you're", "you've", "you'd", "you'll",
  "he's", "he'd", "he'll",
  "she's", "she'd", "she'll",
  "it's", "it'd", "it'll",
  "we're", "we've", "we'd", "we'll",
  "they're", "they've", "they'd", "they'll",
  "that's", "there's", "here's", "what's", "who's",
  "isn't", "aren't", "wasn't", "weren't",
  "don't", "doesn't", "didn't",
  "won't", "wouldn't", "can't", "couldn't", "shouldn't", "mustn't",
  "haven't", "hasn't", "hadn't",
  "let's",
]);

export const ROUND_DESCRIPTIONS = [
  { round: 1 as const, title: 'Round 1', subtitle: 'Listen & Repeat', description: '영어 문장을 보고 듣고 따라 말하세요.' },
  { round: 2 as const, title: 'Round 2', subtitle: 'Key Blanks', description: '핵심 표현이 빈칸으로 바뀝니다. 기억해서 말하세요.' },
  { round: 3 as const, title: 'Round 3', subtitle: 'Korean Hint', description: '핵심 표현 빈칸 + 한국어 해석을 듣고 영어로 말하세요.' },
  { round: 4 as const, title: 'Round 4', subtitle: 'Full Recall', description: '모든 단어가 빈칸! 한국어 해석만 듣고 영어로 말하세요.' },
] as const;

export const TIMEOUTS = {
  ROUND_INTRO_MS: 2500,
  AUTO_ADVANCE_MS: 2000,
  ROUND_COMPLETE_ADVANCE_MS: 3000,
  HINT_DISMISS_MS: 2500,
  HINT_DEBOUNCE_MS: 500,
  SPEAKING_TIMEOUT_MS: 15000,
  TTS_MAX_RETRIES: 3,
  TTS_BASE_DELAY_MS: 1000,
  MIC_MAX_RETRIES: 3,
  MIC_RETRY_DELAY_MS: 500,
} as const;

export const RANGE_OPTIONS = [5, 10, 15, 20, 25] as const;
