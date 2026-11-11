// Converts the MOE dictionaries (as JSON by the g0v/moedict-data* projects) into compact TSV for the IME.
//
//   node tools/build-dict.mjs <dir containing twblg.json hakka.json revised.json>
//
// Output rows: text <TAB> reading <TAB> lookup keys (comma separated), shortest words first.
// Dictionary text is not altered; only the format changes (see data/NOTICE.md).

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toLatinKey } from '../src/engine.js';

const [dir] = process.argv.slice(2);
if (!dir) {
  console.error('usage: node tools/build-dict.mjs <raw-dir>');
  process.exit(1);
}

const load = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const MAX_TITLE = 6;
const usable = (title) => title && [...title].length <= MAX_TITLE && !/[\ue000-\uf8ff{}\u20de]/.test(title);

// Rows keyed by text+reading, so heteronyms repeated in the source are written once.
function collect(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const id = `${r.text}\t${r.reading}`;
    if (seen.has(id) || !r.keys.length) continue;
    seen.add(id);
    out.push(r);
  }
  // Stable sort: short words first, since there is no frequency data to rank by.
  return out.sort((a, b) => [...a.text].length - [...b.text].length);
}

function write(name, rows) {
  const body = rows.map((r) => `${r.text}\t${r.reading}\t${[...new Set(r.keys)].join(',')}`).join('\n');
  writeFileSync(new URL(`../data/${name}.tsv`, import.meta.url), `${body}\n`);
  console.log(name, rows.length);
}

// Hokkien: trs is Tâi-lô with tone marks; "a/b" lists alternative pronunciations.
const nan = [];
for (const e of load('twblg.json')) {
  if (!usable(e.title)) continue;
  for (const h of e.heteronyms) {
    for (const trs of (h.trs || '').split('/')) {
      const reading = trs.trim().replace(/\s+/g, ' ').normalize('NFC');
      const key = toLatinKey(reading);
      if (key) nan.push({ text: e.title, reading, keys: [key] });
    }
  }
}
write('nan', collect(nan));

// Hakka: one token per dialect, "四⃞hag²ga²⁴" (四縣 海陸 大埔 饒平 詔安 南四縣). Show 四縣, match all dialects.
const hak = [];
for (const e of load('hakka.json')) {
  if (!usable(e.title)) continue;
  for (const h of e.heteronyms) {
    const toks = (h.pinyin || '').split(/\s+/).map((t) => /^(.)\u20de(.+)$/.exec(t)).filter(Boolean);
    if (!toks.length) continue;
    const shown = (toks.find((m) => m[1] === '四') || toks[0])[2];
    const keys = toks.flatMap((m) => {
      const plain = toLatinKey(m[2].replace(/[\u2070-\u209f\u00b2\u00b3\u00b9]/g, ''));
      // MOE writes syllable-final stops as b/d/g; people usually type p/t/k.
      const stops = m[2].split(/[\u2070-\u209f\u00b2\u00b3\u00b9]+/).map((syl) => syl.replace(/(?<=[aeiouy])([bdg])$/i, (c) => ({ b: 'p', d: 't', g: 'k' })[c.toLowerCase()])).join('');
      return [plain, toLatinKey(stops)];
    }).filter(Boolean);
    hak.push({ text: e.title, reading: shown, keys });
  }
}
write('hak', collect(hak));

// Mandarin: searchable by pinyin; bopomofo is searchable too (key derived on load).
const cmn = [];
for (const e of load('revised.json')) {
  if (!usable(e.title) || [...e.title].length > 4) continue;
  for (const h of e.heteronyms) {
    const bpmf = (h.bopomofo || '').trim();
    if (!bpmf || /[（(]/.test(bpmf)) continue;
    const keys = [toLatinKey(h.pinyin || '')].filter(Boolean); // the bopomofo key is derived from the reading on load
    cmn.push({ text: e.title, reading: bpmf.replace(/\s+/g, ''), keys });
  }
}
write('cmn', collect(cmn));
