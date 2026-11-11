// Loads the generated data/*.tsv files (see tools/build-dict.mjs) into Dictionary instances.
import { Dictionary, stripBpmfTone } from './engine.js';

export const SOURCES = {
  nan: '教育部《臺灣閩南語常用詞辭典》',
  hak: '教育部《臺灣客家語常用詞辭典》',
  cmn: '教育部《重編國語辭典修訂本》',
};

// Row: text <TAB> reading <TAB> comma-separated keys. Mandarin also gets its bopomofo key.
export function parseTsv(tsv, lang) {
  const src = SOURCES[lang];
  const entries = [];
  for (const line of tsv.split('\n')) {
    if (!line) continue;
    const [text, reading, keys = ''] = line.split('\t');
    const k = keys ? keys.split(',') : [];
    if (lang === 'cmn') k.push(stripBpmfTone(reading));
    entries.push({ text, reading, src, keys: k });
  }
  return new Dictionary(entries);
}

export async function loadDictionary(lang, base = '../data/') {
  const url = new URL(`${base}${lang}.tsv`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${lang}: HTTP ${res.status}`);
  return parseTsv(await res.text(), lang);
}
