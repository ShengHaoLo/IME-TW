// Builds data/freq.tsv: word frequencies for the Han headwords of data/{nan,hak,cmn}.tsv.
//
//   node tools/build-freq.mjs <jieba dict.txt.big>
//
// Source: jieba's extra_dict/dict.txt.big (Traditional Chinese word counts, MIT licence),
// https://github.com/fxsjy/jieba. Only the counts of words that appear in our dictionaries are kept.

import { readFileSync, writeFileSync } from 'node:fs';

const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: node tools/build-freq.mjs <dict.txt.big>');
  process.exit(1);
}

const wanted = new Set();
for (const lang of ['nan', 'hak', 'cmn']) {
  const tsv = readFileSync(new URL(`../data/${lang}.tsv`, import.meta.url), 'utf8');
  for (const line of tsv.split('\n')) if (line) wanted.add(line.split('\t')[0]);
}

const counts = new Map();
for (const line of readFileSync(file, 'utf8').split('\n')) {
  const [word, n] = line.split(' ');
  if (!wanted.has(word)) continue;
  counts.set(word, (counts.get(word) || 0) + Number(n));
}

const rows = [...counts].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}\t${n}`);
writeFileSync(new URL('../data/freq.tsv', import.meta.url), `${rows.join('\n')}\n`);
console.log(`${rows.length} words with frequency`);
