// Input engine: script conversion + dictionary lookup. No DOM access, so it is testable in Node.

// nan Hokkien, hak Hakka, cmn Mandarin, ind the selected Indigenous language, eng English.
export const LANGS = ['nan', 'hak', 'cmn', 'ind', 'eng'];

// ---- Taiwanese Hokkien: Tâi-lô (TL) -> Taiwan Phonetic Symbols (extended Bopomofo) ----

const INITIALS = [
  ['tsh', 'ㄘ'], ['ts', 'ㄗ'], ['ph', 'ㄆ'], ['th', 'ㄊ'], ['kh', 'ㄎ'], ['ng', 'ㄫ'],
  ['p', 'ㄅ'], ['b', 'ㆠ'], ['m', 'ㄇ'], ['t', 'ㄉ'], ['n', 'ㄋ'], ['l', 'ㄌ'],
  ['k', 'ㄍ'], ['g', 'ㆣ'], ['h', 'ㄏ'], ['s', 'ㄙ'], ['j', 'ㆡ'],
];

// Longest match first.
const FINALS = [
  ['ainn', 'ㆮ'], ['aunn', 'ㆯ'], ['ann', 'ㆩ'], ['enn', 'ㆥ'], ['onn', 'ㆧ'],
  ['inn', 'ㆪ'], ['unn', 'ㆫ'], ['ang', 'ㄤ'], ['ong', 'ㆲ'], ['ing', 'ㄧㄥ'],
  ['ung', 'ㄨㄥ'], ['eng', 'ㄧㄥ'], ['ok', 'ㆦㆶ'], ['am', 'ㆰ'], ['im', 'ㆬ'],
  ['om', 'ㆱ'], ['an', 'ㄢ'], ['in', 'ㄧㄣ'], ['un', 'ㄨㄣ'], ['ai', 'ㄞ'],
  ['au', 'ㄠ'], ['oo', 'ㆦ'], ['ir', 'ㆨ'], ['ee', 'ㆤ'], ['ng', 'ㆭ'],
  ['a', 'ㄚ'], ['i', 'ㄧ'], ['u', 'ㄨ'], ['e', 'ㆤ'], ['o', 'ㄜ'], ['m', 'ㆬ'],
  ['p', 'ㆴ'], ['t', 'ㆵ'], ['k', 'ㆶ'], ['h', 'ㆷ'],
];

const TPS_TONES = { 1: '', 2: 'ˋ', 3: '˪', 4: '', 5: 'ˊ', 7: '˫', 8: '˙' };
const TL_MARKS = { 2: '\u0301', 3: '\u0300', 5: '\u0302', 7: '\u0304', 8: '\u030D' };

export function splitSyllables(text) {
  return text.toLowerCase().match(/[a-z]+[1-9]?/g) || [];
}

function parseSyllable(syl) {
  const m = /^([a-z]+)([1-9])?$/.exec(syl);
  if (!m) return null;
  let body = m[1];
  const tone = m[2] ? Number(m[2]) : 1;
  let initial = '';
  // A bare "ng" is a syllabic nasal, not an initial.
  for (const [latin, bpmf] of body === 'ng' ? [] : INITIALS) {
    if (body.startsWith(latin) && body.length > latin.length) {
      initial = bpmf;
      body = body.slice(latin.length);
      break;
    }
  }
  let final = '';
  while (body) {
    const hit = FINALS.find(([latin]) => body.startsWith(latin));
    if (!hit) return null;
    final += hit[1];
    body = body.slice(hit[0].length);
  }
  return { initial, final, tone };
}

export function tlToTps(text) {
  const syls = splitSyllables(text);
  if (!syls.length) return '';
  const out = [];
  for (const s of syls) {
    const p = parseSyllable(s);
    if (!p) return null;
    out.push(p.initial + p.final + TPS_TONES[p.tone]);
  }
  return out.join(' ');
}

// Put the TL tone mark on the right letter: a > o > e > second of "iu"/"ui" > syllabic nasal.
function markSyllable(syl) {
  const m = /^([a-z]+)([1-9])?$/.exec(syl);
  if (!m) return syl;
  const body = m[1];
  const mark = TL_MARKS[m[2]];
  if (!mark) return body;
  let idx = -1;
  for (const v of ['a', 'o', 'e']) {
    idx = body.indexOf(v);
    if (idx >= 0) break;
  }
  if (idx < 0) {
    if (body.includes('iu')) idx = body.indexOf('iu') + 1;
    else if (body.includes('ui')) idx = body.indexOf('ui') + 1;
    else idx = Math.max(body.lastIndexOf('i'), body.lastIndexOf('u'));
  }
  if (idx < 0) idx = body.startsWith('ng') ? 0 : body.indexOf('m');
  if (idx < 0) return body;
  return (body.slice(0, idx + 1) + mark + body.slice(idx + 1)).normalize('NFC');
}

export function tlMarked(text) {
  const syls = splitSyllables(text);
  return syls.length ? syls.map(markSyllable).join('-') : '';
}

// ---- Normalising mixed input (Latin, diacritics, extended Bopomofo) ----

export const stripBpmfTone = (s) => s.replace(/[ˇˋˊ˙ˉ˪˫]/g, '');

// Extended Bopomofo letters -> the Tâi-lô letters they stand for.
const EXT_TO_TL = {
  'ㆠ': 'b', 'ㆡ': 'j', 'ㆢ': 'j', 'ㆣ': 'g', 'ㆤ': 'e', 'ㆥ': 'enn', 'ㆦ': 'oo', 'ㆧ': 'onn',
  'ㆨ': 'ir', 'ㆩ': 'ann', 'ㆪ': 'inn', 'ㆫ': 'unn', 'ㆬ': 'im', 'ㆭ': 'ng', 'ㆮ': 'ainn',
  'ㆯ': 'aunn', 'ㆰ': 'am', 'ㆱ': 'om', 'ㆲ': 'ong', 'ㆳ': 'innn', 'ㆴ': 'p', 'ㆵ': 't',
  'ㆶ': 'k', 'ㆷ': 'h', 'ㆸ': 'gh', 'ㆹ': 'lh', 'ㆺ': 'zy', 'ㆻ': 'g', 'ㆼ': 'gw', 'ㆽ': 'kw',
  'ㆾ': 'oe', 'ㆿ': 'ah',
};

const STD_BPMF = /[\u3105-\u312F]/;
const letters = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

// Toneless lowercase Latin lookup key: o͘ -> oo, ⁿ -> nn, tone marks and tone digits dropped.
export function toLatinKey(buffer) {
  let s = buffer.replace(/o\u0358/gi, 'oo').replace(/ⁿ/g, 'nn').replace(/ʉ/gi, 'u').replace(/ɨ/gi, 'i');
  s = [...s].map((c) => EXT_TO_TL[c] ?? c).join('');
  return letters(s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

// ---- Dictionary ----

export class Dictionary {
  constructor(entries) {
    this.index = new Map();
    this.entries = entries;
    this.textList = null;
    entries.forEach((e, i) => { e.o = i; });
    for (const e of entries) {
      for (const k of e.keys) {
        if (!this.index.has(k)) this.index.set(k, []);
        this.index.get(k).push(e);
      }
    }
    this.sortedKeys = [...this.index.keys()].sort();
    this.maxKey = Math.min(32, this.sortedKeys.reduce((m, k) => Math.max(m, k.length), 0));
  }

  // `freq` maps headword -> corpus count; homophones then come out most frequent first.
  applyFreq(freq) {
    for (const e of this.entries) {
      const f = freq.get(e.text);
      if (f !== undefined) e.f = f;
    }
    for (const list of this.index.values()) list.sort((a, b) => (b.f || 0) - (a.f || 0) || a.o - b.o);
  }

  // Entries whose text starts with `prefix` and is longer than it, most frequent first.
  continuations(prefix, limit = 24) {
    if (!this.textList) this.textList = [...this.entries].sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
    const list = this.textList;
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].text < prefix) lo = mid + 1; else hi = mid;
    }
    const out = [];
    for (let i = lo; i < list.length && list[i].text.startsWith(prefix); i++) {
      if (list[i].text !== prefix) out.push(list[i]);
    }
    return out.sort((a, b) => (b.f || 0) - (a.f || 0) || a.o - b.o).slice(0, limit);
  }

  // Exact key matches first (file order: short or frequent words first), then completions of the key,
  // nearest completion (shortest key, then file order) first.
  lookup(key, limit = 30) {
    if (!key) return [];
    const out = [...(this.index.get(key) || [])];
    if (out.length < limit) {
      const keys = this.sortedKeys;
      let lo = 0;
      let hi = keys.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (keys[mid] < key) lo = mid + 1; else hi = mid;
      }
      const near = [];
      for (let i = lo; i < keys.length && keys[i].startsWith(key) && near.length < 3000; i++) {
        if (keys[i] !== key) near.push(keys[i]);
      }
      near.sort((a, b) => a.length - b.length || (this.index.get(b)[0].f || 0) - (this.index.get(a)[0].f || 0) || this.index.get(a)[0].o - this.index.get(b)[0].o);
      for (const k of near) out.push(...this.index.get(k));
    }
    return [...new Set(out)].slice(0, limit);
  }
}

// ---- Candidate generation ----

// With tone digits typed (tsiah8), put entries whose tone-marked reading matches exactly first.
function preferTone(hits, buffer) {
  const want = tlMarked(buffer).toLowerCase();
  const norm = (r) => r.toLowerCase().replace(/\s+/g, '-');
  return [...hits.filter((e) => norm(e.reading) === want), ...hits.filter((e) => norm(e.reading) !== want)];
}

// ---- Sentence inference ----

const LOG_TOTAL = Math.log(1e8);
const MIN_FREQ = 30; // headwords the corpus never saw still count as ordinary words
const SPACED = new Set(['eng', 'ind']); // languages whose sentences are written with spaces

// Splits a toneless key into dictionary words with the lowest total cost (a unigram language model:
// frequent words are cheap, each extra word costs). `prefer(text)` lowers the cost of words the user chose before.
// Returns { words: [entry], rest } where `rest` is an unfinished tail, or null if fewer than two words fit.
export function segment(key, dict, prefer = () => 0) {
  const n = key.length;
  if (n < 3 || n > 60 || !dict.maxKey) return null;
  const best = new Array(n + 1).fill(Infinity);
  const back = new Array(n + 1).fill(null);
  best[0] = 0;
  for (let i = 0; i < n; i++) {
    if (best[i] === Infinity) continue;
    for (let j = i + 1; j <= Math.min(n, i + dict.maxKey); j++) {
      const hits = dict.index.get(key.slice(i, j));
      if (!hits) continue;
      const e = hits[0];
      const cost = best[i] + LOG_TOTAL - Math.log(Math.max(e.f || 0, MIN_FREQ)) - prefer(e.text);
      if (cost < best[j]) { best[j] = cost; back[j] = [i, e]; }
    }
  }
  let end = n;
  while (end > 0 && best[end] === Infinity) end--;
  if (end === 0 || n - end > 8) return null;
  const words = [];
  for (let k = end; k > 0; k = back[k][0]) words.push(back[k][1]);
  words.reverse();
  return words.length >= 2 ? { words, rest: key.slice(end) } : null;
}

// Likely continuations of the text before the caret: compounds in the dictionaries that begin with its last
// 1-4 characters, longest context first, then by language priority and frequency.
export function predictNext(before, dicts, order = LANGS, limit = 8) {
  const chars = [...before];
  const out = [];
  const seen = new Set();
  for (let len = Math.min(4, chars.length); len >= 1 && out.length < limit; len--) {
    const prefix = chars.slice(-len).join('');
    if (!/\p{Script=Han}/u.test(prefix)) continue;
    for (const lang of order) {
      if (SPACED.has(lang) || !dicts[lang]) continue;
      for (const e of dicts[lang].continuations(prefix)) {
        const next = e.text.slice(prefix.length);
        if (seen.has(next)) continue;
        seen.add(next);
        out.push({ text: next, label: e.text, langs: [lang] });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

// English has so many short words that any letters split into some; keep only splits of common words.
const plausibleEnglish = ({ words, rest }) => !rest
  && words.every((e) => e.f >= 1e4 && (e.text.length > 1 || /^[ai]$/i.test(e.text)));

const PER_LANG = 6; // completions shown per language before the rest, so no language crowds out the others
const capitalise = (t) => t[0].toUpperCase() + t.slice(1);

// `order` is the user's language priority; hits from every language are shown, best-ranked first:
// the primary language's matches, other languages' exact matches, a few completions each, then the remainder.
export function candidates(buffer, dicts, order = LANGS, limit = 40, prefer = () => 0) {
  if (!buffer) return [];
  const merged = new Map();
  const add = (text, label, lang, src) => {
    if ((lang === 'eng' || lang === 'ind') && /^[A-Z]/.test(buffer) && /^[a-z]/.test(text)) text = capitalise(text);
    let c = merged.get(text);
    if (!c) {
      c = { text, label, src, langs: [] };
      merged.set(text, c);
    }
    if (!c.langs.includes(lang)) c.langs.push(lang);
  };

  const bpmfOnly = STD_BPMF.test(buffer) && !/[a-z]/i.test(buffer);
  const latin = bpmfOnly ? '' : toLatinKey(buffer);
  const firstEx = [];
  const first = [];
  const exact = [];
  const sentences = [];
  const near = [];
  const rest = [];
  for (const lang of order) {
    const dict = dicts[lang];
    let hits = [];
    if (!dict) hits = [];
    else if (bpmfOnly) hits = lang === 'cmn' ? dict.lookup(stripBpmfTone(buffer)) : [];
    else if (latin) hits = dict.lookup(latin);
    if (lang === 'nan' && /[1-9]/.test(buffer) && /^[A-Za-z0-9'-]+$/.test(buffer)) hits = preferTone(hits, buffer);
    const key = bpmfOnly ? stripBpmfTone(buffer) : latin;
    const isExact = (e) => e.keys.includes(key);
    const ex = hits.filter(isExact);
    const others = hits.filter((e) => !isExact(e));
    if (!bpmfOnly && !ex.length && dict && lang !== 'ind') {
      const seg = segment(latin, dict, prefer);
      if (seg && (lang !== 'eng' || plausibleEnglish(seg))) {
        const text = seg.words.map((e) => e.text).join(SPACED.has(lang) ? ' ' : '') + (seg.rest ? (SPACED.has(lang) ? ' ' : '') + seg.rest : '');
        sentences.push([{ text, reading: '整句', src: dict.entries[0]?.src }, lang]);
      }
    }
    if (lang === order[0]) {
      firstEx.push(...ex.map((e) => [e, lang]));
      first.push(...others.slice(0, PER_LANG).map((e) => [e, lang]));
      rest.push(...others.slice(PER_LANG).map((e) => [e, lang]));
      continue;
    }
    exact.push(...ex.map((e) => [e, lang]));
    near.push(...others.slice(0, PER_LANG).map((e) => [e, lang]));
    rest.push(...others.slice(PER_LANG).map((e) => [e, lang]));
  }
  // A whole-key dictionary match beats an inferred sentence; with none, the sentence leads.
  const anyExact = firstEx.length || exact.length;
  const ordered = anyExact
    ? [...firstEx, ...first, ...exact, ...sentences, ...near, ...rest]
    : [...sentences, ...first, ...near, ...rest];
  for (const [e, lang] of ordered) add(e.text, e.reading, lang, e.src);
  const dictList = [...merged.values()];
  const extras = [];
  if (/^[A-Za-z0-9'-]+$/.test(buffer)) {
    const tps = tlToTps(buffer);
    if (tps) extras.push({ text: tps, label: '方音符號', langs: [] });
    let marked = tlMarked(buffer);
    if (marked && /^[A-Z]/.test(buffer)) marked = marked[0].toUpperCase() + marked.slice(1);
    if (marked) extras.push({ text: marked, label: 'Tâi-lô', langs: [] });
  }
  const raw = { text: buffer, label: '原樣', langs: [] };

  // Explicitly typed special characters (ㆠ, ⁿ, tone marks...) should commit as typed first.
  const explicit = /[^\x00-\x7F]/.test(buffer) && !bpmfOnly;
  const all = explicit ? [raw, ...dictList, ...extras] : [...dictList, ...extras, raw];
  const seen = new Set();
  return all.filter((c) => !seen.has(c.text) && seen.add(c.text)).slice(0, limit);
}
