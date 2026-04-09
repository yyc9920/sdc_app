export const SPEAKER_COLOR_PALETTE = [
  { colorClass: 'text-blue-600 dark:text-blue-400',      bgClass: 'bg-blue-50 dark:bg-blue-900/20' },
  { colorClass: 'text-rose-600 dark:text-rose-400',       bgClass: 'bg-rose-50 dark:bg-rose-900/20' },
  { colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { colorClass: 'text-amber-600 dark:text-amber-400',     bgClass: 'bg-amber-50 dark:bg-amber-900/20' },
  { colorClass: 'text-violet-600 dark:text-violet-400',   bgClass: 'bg-violet-50 dark:bg-violet-900/20' },
  { colorClass: 'text-teal-600 dark:text-teal-400',       bgClass: 'bg-teal-50 dark:bg-teal-900/20' },
] as const;

export const ROUND_DESCRIPTIONS = [
  {
    round: 1 as const,
    title: 'Round 1',
    subtitle: '전체 듣기',
    description: '모든 문장을 순서대로 들어보세요. 말하지 않아도 됩니다.',
  },
  {
    round: 2 as const,
    title: 'Round 2',
    subtitle: '따라 말하기',
    description: '한 문장씩 듣고 바로 따라 말하세요.',
  },
  {
    round: 3 as const,
    title: 'Round 3',
    subtitle: '기억해서 말하기',
    description: '문장이 숨겨집니다. 힌트 없이 기억에서 말하세요.',
  },
  {
    round: 4 as const,
    title: 'Round 4',
    subtitle: '전체 스피킹',
    description: '전체 텍스트가 보입니다. 각 문장을 자연스럽게 말하세요.',
  },
] as const;

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
