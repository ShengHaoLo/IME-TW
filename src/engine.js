// Input engine: script conversion + dictionary lookup. No DOM access, so it is testable in Node.

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

// ---- Mandarin: standard Zhuyin keyboard layout ----

export const ZHUYIN_LAYOUT = {
  '1': 'ㄅ', q: 'ㄆ', a: 'ㄇ', z: 'ㄈ', '2': 'ㄉ', w: 'ㄊ', s: 'ㄋ', x: 'ㄌ',
  e: 'ㄍ', d: 'ㄎ', c: 'ㄏ', r: 'ㄐ', f: 'ㄑ', v: 'ㄒ', '5': 'ㄓ', t: 'ㄔ',
  g: 'ㄕ', b: 'ㄖ', y: 'ㄗ', h: 'ㄘ', n: 'ㄙ', u: 'ㄧ', j: 'ㄨ', m: 'ㄩ',
  '8': 'ㄚ', i: 'ㄛ', k: 'ㄜ', ',': 'ㄝ', '9': 'ㄞ', o: 'ㄟ', l: 'ㄠ', '.': 'ㄡ',
  '0': 'ㄢ', p: 'ㄣ', ';': 'ㄤ', '/': 'ㄥ', '-': 'ㄦ',
  '3': 'ˇ', '4': 'ˋ', '6': 'ˊ', '7': '˙',
};

export const stripBpmfTone = (s) => s.replace(/[ˇˋˊ˙ˉ\u02EA\u02EB]/g, '');

// ---- Dictionary ----

export class Dictionary {
  constructor(entries) {
    this.index = new Map();
    for (const e of entries) {
      if (!this.index.has(e.key)) this.index.set(e.key, []);
      this.index.get(e.key).push(e);
    }
    this.keys = [...this.index.keys()].sort();
  }

  // Exact matches first, then entries whose key starts with the buffer.
  lookup(key, limit = 30) {
    if (!key) return [];
    const out = [...(this.index.get(key) || [])];
    for (const k of this.keys) {
      if (out.length >= limit) break;
      if (k !== key && k.startsWith(key)) out.push(...this.index.get(k));
    }
    return out.slice(0, limit);
  }
}

// ---- Candidate generation ----

const letters = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

// Raw rows: [text, reading, source]. `key` is the toneless lookup key.
export function buildEntries(raw, mode) {
  return raw.map(([text, reading, src]) => ({
    text,
    reading,
    src,
    key: mode === 'cmn' ? stripBpmfTone(reading) : letters(reading),
  }));
}

export function candidates(mode, buffer, dicts) {
  if (!buffer) return [];
  const out = [];
  const seen = new Set();
  const push = (c) => {
    if (seen.has(c.text)) return;
    seen.add(c.text);
    out.push(c);
  };

  if (mode === 'cmn') {
    for (const e of dicts.cmn.lookup(stripBpmfTone(buffer))) push({ text: e.text, label: e.reading, src: e.src });
    push({ text: buffer, label: '注音' });
    return out;
  }

  const dict = mode === 'nan' ? dicts.nan : dicts.hak;
  for (const e of dict.lookup(letters(buffer))) push({ text: e.text, label: e.reading, src: e.src });
  if (mode === 'nan') {
    const tps = tlToTps(buffer);
    const marked = tlMarked(buffer);
    if (tps) push({ text: tps, label: '方音符號' });
    if (marked) push({ text: marked, label: 'Tâi-lô' });
  } else {
    push({ text: buffer.replace(/[0-9]/g, ''), label: 'Pinyin' });
  }
  return out;
}
