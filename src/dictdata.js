// Loads the generated data/*.tsv files (see tools/build-dict.mjs) into Dictionary instances.
import { Dictionary, stripBpmfTone, toLatinKey } from './engine.js';

export const SOURCES = {
  nan: '教育部《臺灣閩南語常用詞辭典》',
  hak: '教育部《臺灣客家語常用詞辭典》',
  cmn: '教育部《重編國語辭典修訂本》',
  ind: '原住民族語言研究發展基金會《族語E樂園》學習詞表',
  eng: 'FrequencyWords (OpenSubtitles) 英語常用字',
};

// Row: text <TAB> reading <TAB> comma-separated keys. Mandarin also gets its bopomofo key.
// Indigenous and English rows have no keys column: the key is the word itself folded to plain letters.
export function parseTsv(tsv, lang) {
  const src = SOURCES[lang];
  const entries = [];
  for (const line of tsv.split('\n')) {
    if (!line) continue;
    const [text, reading = '', keys = ''] = line.split('\t');
    const k = keys ? keys.split(',') : [];
    if (lang === 'cmn') k.push(stripBpmfTone(reading));
    if (lang === 'ind' || lang === 'eng') k.push(toLatinKey(text));
    entries.push({ text, reading, src, keys: k });
  }
  return new Dictionary(entries);
}

// `file` is the path under data/ without extension: 'nan', 'ind/ami', ...
export async function loadDictionary(lang, file = lang, base = '../data/') {
  const url = new URL(`${base}${file}.tsv`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return parseTsv(await res.text(), lang);
}
