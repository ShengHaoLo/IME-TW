// Single merged keyboard: every key can carry the extended letters most similar to it.
// Variants are ordered by the user's language priority.

import { LANGS } from './engine.js';

export { LANGS };
export const LANG_NAME = { nan: '臺語', hak: '客語', cmn: '華語' };
export const LANG_BADGE = { nan: '臺', hak: '客', cmn: '華' };

const ALL = 'nan hak cmn';

// Tone marks as combining characters, with the languages that use them.
const MARKS = [
  ['\u0301', ALL], ['\u0300', ALL], ['\u0302', 'nan hak'],
  ['\u0304', 'nan cmn'], ['\u030D', 'nan'], ['\u030C', 'hak cmn'],
];
const MARKED_BASES = 'aeioumn';

// [variant, languages]. Extended letters first, then Bopomofo, so tone marks come last within a language.
const EXTRA = {
  a: [['ㆩ', 'nan'], ['ㆮ', 'nan'], ['ㆯ', 'nan'], ['ㆰ', 'nan'], ['ㆿ', 'nan'], ['ㄚ', 'nan cmn'], ['ㄞ', 'nan cmn'], ['ㄠ', 'nan cmn'], ['ㄢ', 'nan cmn'], ['ㄤ', 'nan cmn']],
  b: [['ㆠ', 'nan'], ['ㄅ', 'nan cmn']],
  c: [['ㄘ', 'nan cmn'], ['ㄔ', 'cmn']],
  d: [['ㄉ', 'nan cmn']],
  e: [['ㆤ', 'nan'], ['ㆥ', 'nan'], ['ㄜ', 'nan cmn'], ['ㄥ', 'nan cmn'], ['ㄝ', 'cmn'], ['ㄟ', 'cmn'], ['ㄦ', 'cmn']],
  f: [['ㄈ', 'cmn']],
  g: [['ㆣ', 'nan'], ['ㆸ', 'nan'], ['ㆻ', 'nan'], ['ㆼ', 'nan'], ['ㄍ', 'nan cmn']],
  h: [['ㆷ', 'nan'], ['ㄏ', 'nan cmn']],
  i: [['ㆪ', 'nan'], ['ㆨ', 'nan'], ['ㆳ', 'nan'], ['ㄧ', 'nan cmn'], ['ɨ', 'hak']],
  j: [['ㆡ', 'nan'], ['ㆢ', 'nan'], ['ㄐ', 'cmn']],
  k: [['ㆶ', 'nan'], ['ㆽ', 'nan'], ['ㄎ', 'nan cmn']],
  l: [['ㆹ', 'nan'], ['ㄌ', 'nan cmn']],
  m: [['ㆬ', 'nan'], ['ㆱ', 'nan'], ['ㄇ', 'nan cmn']],
  n: [['ㆭ', 'nan'], ['ⁿ', 'nan'], ['ㄫ', 'nan'], ['ㄋ', 'nan cmn'], ['ㄣ', 'nan cmn']],
  o: [['ㆦ', 'nan'], ['ㆧ', 'nan'], ['o\u0358', 'nan'], ['ㆲ', 'nan'], ['ㆾ', 'nan'], ['ㄛ', 'cmn'], ['ㄡ', 'cmn']],
  p: [['ㆴ', 'nan'], ['ㄆ', 'nan cmn']],
  q: [['ㄑ', 'cmn']],
  r: [['ㄖ', 'cmn']],
  s: [['ㄙ', 'nan cmn'], ['ㄕ', 'cmn']],
  t: [['ㆵ', 'nan'], ['ㄊ', 'nan cmn']],
  u: [['ㆫ', 'nan'], ['ṳ', 'hak'], ['ㄨ', 'nan cmn'], ['ü', 'cmn']],
  x: [['ㄒ', 'cmn']],
  y: [['ㄩ', 'cmn']],
  z: [['ㆺ', 'nan'], ['ㄗ', 'nan cmn'], ['ㄓ', 'cmn']],
  2: [['ˋ', 'nan'], ['ˊ', 'cmn']],
  3: [['˪', 'nan'], ['ˇ', 'cmn']],
  4: [['ˋ', 'cmn']],
  5: [['ˊ', 'nan'], ['˙', 'cmn']],
  7: [['˫', 'nan']],
  8: [['˙', 'nan']],
};

function rank(langs, order) {
  return Math.min(...langs.map((l) => order.indexOf(l)).filter((i) => i >= 0), order.length);
}

// Variants for a base key, best-ranked for the given language priority first.
export function variantsFor(key, order = LANGS) {
  const list = (EXTRA[key] || []).map(([text, langs]) => ({ text, langs: langs.split(' ') }));
  if (MARKED_BASES.includes(key)) {
    for (const [mark, langs] of MARKS) list.push({ text: (key + mark).normalize('NFC'), langs: langs.split(' ') });
  }
  // Array.prototype.sort is stable, so definition order is kept within a language.
  return list.sort((a, b) => rank(a.langs, order) - rank(b.langs, order));
}

export const hasVariants = (key) => (EXTRA[key] || MARKED_BASES.includes(key)) ? variantsFor(key).length > 0 : false;

// Shift+key walks this list; the plain key is last so the cycle can return to it.
export const cycleList = (key, order = LANGS) => [...variantsFor(key, order).map((v) => v.text), key];

export const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
