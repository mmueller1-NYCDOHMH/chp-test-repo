/**
 * FILE: searchSuggestions.js
 *
 * Query-aware suggestions for IndicatorSearch's "No indicators found" state
 * (2026-09-30 per Morgan — replaced a fixed chip list that never changed).
 *
 * Given the query and the entries currently searchable, returns up to `limit`
 * suggestion terms, each GUARANTEED to return at least one result when
 * clicked. Three tiers, best first:
 *
 *   1. Word match   — a multi-word query where one of the words matches on
 *                     its own ("asthma rates" → asthma).
 *   2. Close match  — typos and word-stem overlap ("diabtes" → diabetes,
 *                     "asthmatic" → asthma, "vaccines" → vaccination).
 *   3. Related      — plain-language synonyms for the indicator vocabulary
 *                     ("crime" → assault, "kids" → child, "money" → poverty).
 *
 * If none of those hit, a fallback set is picked from popular terms, seeded
 * by the query so it changes as the user types.
 *
 * Returns { kind: 'close' | 'fallback', terms: string[] } — the component
 * uses `kind` to label the chips ("Did you mean" vs "Try searching for").
 */

// Same predicate IndicatorSearch filters with — kept here so suggestions and
// results can never disagree.
export function matchesQuery(ind, q) {
  return (
    ind.title.toLowerCase().includes(q) ||
    ind.subtitle.toLowerCase().includes(q) ||
    ind.subcategoryLabel.toLowerCase().includes(q) ||
    ind.categoryLabel.toLowerCase().includes(q)
  );
}

const STOPWORDS = new Set([
  'with', 'from', 'than', 'that', 'this', 'into', 'other', 'reporting',
  'related', 'visits', 'rate', 'rates', 'total', 'new', 'any', 'late',
  'glance', 'some', 'higher', 'more', 'less', 'have', 'their', 'nyc',
]);

// Plain-language word → indicator vocabulary. Targets that aren't in the
// current index (or category filter) are dropped automatically, so this can
// list more than exists today.
const SYNONYMS = {
  money: ['poverty', 'rent'], income: ['poverty'], poor: ['poverty'], wealth: ['poverty'],
  job: ['unemployment'], jobs: ['unemployment'], work: ['unemployment'], employment: ['unemployment'],
  crime: ['assault', 'incarceration'], violence: ['assault'], police: ['incarceration'],
  jail: ['incarceration'], prison: ['incarceration'], shooting: ['assault'], safe: ['safety'],
  kid: ['child'], kids: ['child'], children: ['child'], youth: ['child', 'teen'], teens: ['teen'],
  baby: ['infant'], babies: ['infant'], newborn: ['infant'],
  pregnancy: ['prenatal', 'preterm'], pregnant: ['prenatal'], mother: ['maternal', 'prenatal'],
  mothers: ['maternal'], birth: ['births'],
  weight: ['obesity'], overweight: ['obesity'], fat: ['obesity'], bmi: ['obesity'],
  sugar: ['sugary', 'diabetes'], soda: ['sugary'],
  food: ['fruits', 'farmers', 'sugary'], nutrition: ['fruits', 'food'], diet: ['fruits', 'sugary'],
  vegetables: ['veggies'], grocery: ['farmers'],
  cigarette: ['smoking'], cigarettes: ['smoking'], tobacco: ['smoking'], vape: ['smoking'],
  alcohol: ['binge'], drinking: ['binge'], drunk: ['binge'], drugs: ['substance'],
  blood: ['hypertension'], pressure: ['hypertension'], heart: ['hypertension'],
  mental: ['psychiatric'], depression: ['psychiatric'], anxiety: ['psychiatric'],
  vaccine: ['vaccination'], vaccines: ['vaccination'], shots: ['vaccination'], immunization: ['vaccination'],
  housing: ['homes', 'rent'], landlord: ['homes'], mold: ['homes'], pests: ['cockroaches'],
  roaches: ['cockroaches'], rats: ['homes'], apartment: ['homes'],
  pollution: ['air'], smog: ['air'], climate: ['heat'], hot: ['heat'], cooling: ['heat', 'ac'],
  doctor: ['medical', 'insurance'], insurance: ['insurance'], medicaid: ['insurance'],
  hospital: ['hospitalizations'], er: ['asthma', 'hospitalizations'],
  school: ['school', 'graduation'], college: ['college'], graduate: ['graduation'],
  dropout: ['high school'], education: ['school', 'college'],
  death: ['premature death', 'mortality'], deaths: ['premature death', 'avertable'],
  dying: ['premature death'], lifespan: ['life expectancy'], cancer: ['premature death'],
  lung: ['asthma', 'smoking'], breathing: ['asthma', 'air'],
  bike: ['bicycle'], biking: ['bicycle'], cycling: ['bicycle'], traffic: ['pedestrian'],
  car: ['pedestrian'], cars: ['pedestrian'], walking: ['pedestrian'],
  immigrant: ['born outside'], immigrants: ['born outside'], immigration: ['born outside'],
  language: ['english'], languages: ['english'],
  covid: ['vaccination', 'flu'], flu: ['flu'], sick: ['self-reported health'], health: ['self-reported health'],
  aids: ['hiv'], std: ['hiv'], sti: ['hiv'], hepatitis: ['hep c'],
  elderly: ['age', 'falls'], seniors: ['age', 'falls'], older: ['falls', 'age'],
  race: ['race'], ethnicity: ['race'], demographics: ['population'], people: ['population'],
  neighbors: ['neighbors'], community: ['neighbors', 'safety'],
};

// Fallback pool — broad, recognizable terms. Filtered to what's live.
const POPULAR = [
  'asthma', 'poverty', 'obesity', 'infant', 'safety', 'diabetes', 'smoking',
  'air', 'housing', 'insurance', 'vaccination', 'life expectancy', 'rent',
  'school', 'births', 'hypertension', 'heat', 'pedestrian', 'hiv', 'food',
];

// Optimal-string-alignment distance (Levenshtein + adjacent transpositions).
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

const allowedTypos = (len) => (len <= 4 ? 1 : len <= 8 ? 2 : 3);

function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

const tokenize = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Distinct single words (≥3 chars, no stopwords) from titles + subcategories.
function buildVocab(entries) {
  const words = new Set();
  entries.forEach(ind => {
    [...tokenize(ind.title), ...tokenize(ind.subcategoryLabel)].forEach(w => {
      if (w.length >= 3 && !STOPWORDS.has(w)) words.add(w);
    });
  });
  return [...words];
}

// Small deterministic hash so the fallback set shifts as the query changes
// but doesn't flicker between renders of the same query.
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getSearchSuggestions(query, entries, limit = 5) {
  const q = query.trim().toLowerCase();
  const hits = (term) => entries.filter(ind => matchesQuery(ind, term)).length;
  const scored = new Map(); // term → best score (lower is better)
  const add = (term, score) => {
    if (!term || term === q) return;
    if (!scored.has(term) || scored.get(term) > score) scored.set(term, score);
  };

  const vocab  = buildVocab(entries);
  const tokens = tokenize(q).filter(t => !STOPWORDS.has(t));

  tokens.forEach(tok => {
    // 1. Word match — one word of a multi-word query works on its own.
    if (tokens.length > 1 && tok.length >= 3 && hits(tok) > 0) add(tok, 0);

    // 3. Related terms.
    (SYNONYMS[tok] ?? []).forEach(t => add(t, 3));

    if (tok.length < 3) return;
    vocab.forEach(word => {
      // 2a. Typo on the whole word ("diabtes" → diabetes).
      const dist = editDistance(tok, word);
      if (dist <= allowedTypos(Math.min(tok.length, word.length))) {
        add(word, 1 + dist / 10);
        return;
      }
      // 2b. Typo while still typing — compare against the word's prefix
      //     ("diabt" → diabe(tes)).
      if (tok.length >= 4 && word.length > tok.length) {
        const pd = editDistance(tok, word.slice(0, tok.length));
        if (pd <= 1) { add(word, 1.5 + pd / 10); return; }
      }
      // 2c. Shared stem ("asthmatic" → asthma, "vaccines" → vaccination).
      const cp = commonPrefix(tok, word);
      if (cp >= 4 && cp >= 0.6 * Math.min(tok.length, word.length)) {
        add(word, 2 - cp / 100);
      }
    });
  });

  const terms = [...scored.entries()]
    .filter(([term]) => hits(term) > 0)
    .sort((a, b) => a[1] - b[1] || hits(b[0]) - hits(a[0]))
    .map(([term]) => term)
    .slice(0, limit);

  if (terms.length) return { kind: 'close', terms };

  // Fallback — rotate through the popular pool, seeded by the query.
  const pool = POPULAR.filter(t => hits(t) > 0);
  if (!pool.length) return { kind: 'fallback', terms: [] };
  const start = hash(q) % pool.length;
  const n = Math.min(limit, pool.length);
  return {
    kind: 'fallback',
    terms: Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]),
  };
}
