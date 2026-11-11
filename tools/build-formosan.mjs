// Builds data/ind/<code>.tsv (Indigenous word lists) from the ePark (族語E樂園, Klokah) vocabulary
// XML as published in FormosanBank: Corpora/ePark/XML/xue_xi_ci_biao_learning_vocabulary.
// Usage: node tools/build-formosan.mjs <vocabulary-dir> [out-dir]
// Row: word <TAB> Chinese gloss (English if there is none). Dialects of one language are merged.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [src, out = 'data/ind'] = process.argv.slice(2);
if (!src) throw new Error('usage: node tools/build-formosan.mjs <vocabulary-dir> [out-dir]');

const CODES = {
  Amis: 'ami', Atayal: 'tay', Bunun: 'bnn', Kanakanavu: 'xnb', Kavalan: 'ckv', Paiwan: 'pwn', Puyuma: 'pyu',
  Rukai: 'dru', Saaroa: 'sxr', Saisiyat: 'xsy', Sakizaya: 'szy', Seediq: 'trv', Thao: 'ssf', Truku: 'trk',
  Tsou: 'tsu', Yami: 'tao',
};

const unescapeXml = (s) => s.replace(/&(amp|lt|gt|quot|apos|#\d+);/g, (_, e) => (
  { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e] ?? String.fromCodePoint(Number(e.slice(1)))));

// Single words or short phrases of letters; drops notes, punctuation-only rows and Chinese text.
const WORD = /^[\p{L}\p{M}'’ʼ^-]+(?: [\p{L}\p{M}'’ʼ^-]+){0,2}$/u;
const CJK = /[\u3400-\u9fff]/;

function tag(block, name, attr) {
  const re = new RegExp(`<${name}\\s+${attr}[^>]*>([^<]*)</${name}>`);
  const m = re.exec(block);
  return m ? unescapeXml(m[1]).trim() : '';
}

mkdirSync(out, { recursive: true });
for (const dir of readdirSync(src, { withFileTypes: true })) {
  const code = CODES[dir.name];
  if (!dir.isDirectory() || !code) continue;
  const words = new Map(); // word -> { glosses: Set, dialects: number }
  for (const f of readdirSync(join(src, dir.name)).filter((n) => n.endsWith('.xml'))) {
    const xml = readFileSync(join(src, dir.name, f), 'utf8');
    for (const [, block] of xml.matchAll(/<S\b[^>]*>([\s\S]*?)<\/S>/g)) {
      let form = tag(block, 'FORM', 'kindOf="standard"').normalize('NFC').replace(/[.,]+$/, '').replace(/’|ʼ/g, "'");
      if (!WORD.test(form) || CJK.test(form) || form.length > 32) continue;
      const gloss = tag(block, 'TRANSL', 'xml:lang="zho"') || tag(block, 'TRANSL', 'xml:lang="eng"');
      const e = words.get(form) ?? { glosses: new Set(), dialects: new Set() };
      if (gloss && gloss.length <= 24) e.glosses.add(gloss);
      e.dialects.add(f);
      words.set(form, e);
    }
  }
  // Short words first; words shared by more dialects are more likely to be everyday vocabulary.
  const rows = [...words].sort((a, b) => a[0].length - b[0].length || b[1].dialects.size - a[1].dialects.size || (a[0] < b[0] ? -1 : 1))
    .map(([w, e]) => `${w}\t${[...e.glosses].slice(0, 2).join('；')}`);
  writeFileSync(join(out, `${code}.tsv`), `${rows.join('\n')}\n`);
  console.log(code, rows.length);
}
