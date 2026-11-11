// Input engine: script conversion + dictionary lookup. No DOM access, so it is testable in Node.

export const LANGS = ['nan', 'hak', 'cmn'];

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
  let s = buffer.replace(/o\u0358/gi, 'oo').replace(/ⁿ/g, 'nn');
  s = [...s].map((c) => EXT_TO_TL[c] ?? c).join('');
  return letters(s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

// ---- Dictionary ----

export class Dictionary {
  constructor(entries) {
    this.index = new Map();
    for (const e of entries) {
      for (const k of e.keys) {
        if (!this.index.has(k)) this.index.set(k, []);
        this.index.get(k).push(e);
      }
    }
    this.sortedKeys = [...this.index.keys()].sort();
  }

  // Exact matches first, then entries whose key starts with the buffer.
  lookup(key, limit = 30) {
    if (!key) return [];
    const out = [...(this.index.get(key) || [])];
    for (const k of this.sortedKeys) {
      if (out.length >= limit) break;
      if (k !== key && k.startsWith(key)) out.push(...this.index.get(k));
    }
    return [...new Set(out)].slice(0, limit);
  }
}

// Raw rows: [text, reading, source, pinyin?]. Mandarin is also findable by pinyin.
export function buildEntries(raw, mode) {
  return raw.map(([text, reading, src, pinyin]) => ({
    text,
    reading,
    src,
    keys: mode === 'cmn' ? [stripBpmfTone(reading), letters(pinyin || '')].filter(Boolean) : [letters(reading)],
  }));
}

// ---- Candidate generation ----

// `order` is the user's language priority; hits from every language are shown, best-ranked first.
export function candidates(buffer, dicts, order = LANGS, limit = 40) {
  if (!buffer) return [];
  const merged = new Map();
  const add = (text, label, lang, src) => {
    let c = merged.get(text);
    if (!c) {
      c = { text, label, src, langs: [] };
      merged.set(text, c);
    }
    if (!c.langs.includes(lang)) c.langs.push(lang);
  };

  const bpmfOnly = STD_BPMF.test(buffer) && !/[a-z]/i.test(buffer);
  const latin = bpmfOnly ? '' : toLatinKey(buffer);
  for (const lang of order) {
    let hits = [];
    if (bpmfOnly) hits = lang === 'cmn' ? dicts.cmn.lookup(stripBpmfTone(buffer)) : [];
    else if (latin) hits = dicts[lang].lookup(latin);
    for (const e of hits) add(e.text, e.reading, lang, e.src);
  }
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
