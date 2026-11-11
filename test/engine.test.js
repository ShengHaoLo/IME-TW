import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tlToTps, tlMarked, toLatinKey, candidates } from '../src/engine.js';
import { parseTsv } from '../src/dictdata.js';
import { variantsFor, cycleList, FULLWIDTH } from '../src/layout.js';

const load = (lang) => parseTsv(readFileSync(new URL(`../data/${lang}.tsv`, import.meta.url), 'utf8'), lang);
const loadFile = (lang, file) => parseTsv(readFileSync(new URL(`../data/${file}.tsv`, import.meta.url), 'utf8'), lang);
const dicts = { nan: load('nan'), hak: load('hak'), cmn: load('cmn'), ind: loadFile('ind', 'ind/ami'), eng: loadFile('eng', 'eng') };

test('TL to extended Bopomofo and tone marks', () => {
  assert.equal(tlToTps('tai5-uan5'), 'ㄉㄞˊ ㄨㄢˊ');
  assert.equal(tlToTps('khuann3'), 'ㄎㄨㆩ˪');
  assert.equal(tlToTps('ng5'), 'ㆭˊ');
  assert.equal(tlToTps('xyz'), null);
  assert.equal(tlMarked('tai5-uan5'), 'tâi-uân');
  assert.equal(tlMarked('kui7'), 'kuī');
});

test('mixed input normalises to a toneless Latin key', () => {
  assert.equal(toLatinKey('tsuí'), 'tsui');
  assert.equal(toLatinKey('goo7'), 'goo');
  assert.equal(toLatinKey('go\u0358'), 'goo');
  assert.equal(toLatinKey('khuaⁿ'), 'khuann');
  assert.equal(toLatinKey('ㆠo'), 'bo');
});

test('variants are ordered by language priority', () => {
  const first = (key, order) => variantsFor(key, order)[0].text;
  assert.equal(first('b', ['nan', 'hak', 'cmn']), 'ㆠ');
  assert.equal(first('b', ['cmn', 'nan', 'hak']), 'ㄅ');
  assert.equal(first('u', ['hak', 'nan', 'cmn']), 'ṳ');
  // every extended Bopomofo letter is reachable from some key
  const all = 'abcdefghijklmnopqrstuvwxyz'.split('').flatMap((k) => variantsFor(k).map((v) => v.text)).join('');
  for (let c = 0x31a0; c <= 0x31bf; c++) assert.ok(all.includes(String.fromCharCode(c)), `U+${c.toString(16)}`);
  const list = cycleList('a', ['nan', 'hak', 'cmn']);
  assert.equal(list.at(-1), 'a');
  assert.equal(new Set(list).size, list.length);
});

test('candidates come from every language, primary first, with badges', () => {
  const find = (buf, order, text) => candidates(buf, dicts, order).find((c) => c.text === text);

  const sui = find('sui', ['hak', 'nan', 'cmn'], '水');
  assert.deepEqual(sui.langs, ['hak', 'nan']);
  assert.match(sui.src, /教育部/);
  // tone digits and hyphens are ignored; Hokkien readings keep their tone marks
  assert.equal(find('tsui2', ['nan', 'hak', 'cmn'], '水').label, 'tsuí');
  assert.ok(find('tsui2', ['nan', 'hak', 'cmn'], 'ㄗㄨㄧˋ'));

  // Hakka dialect spellings all match (Sixian "sui", Hailu "shui", Raoping "fi")
  assert.ok(find('shui', ['hak', 'nan', 'cmn'], '水').langs.includes('hak'));
  assert.ok(find('fi', ['hak', 'nan', 'cmn'], '水'));

  // Language order decides which language's words come first
  assert.ok(candidates('sui', dicts, ['hak', 'nan', 'cmn'])[0].langs.includes('hak'));
  assert.ok(candidates('sui', dicts, ['nan', 'hak', 'cmn'])[0].langs.includes('nan'));
  assert.ok(find('taiwan', ['cmn', 'nan', 'hak'], '臺灣').langs.includes('cmn'));
});

test('typed tone digits rank the matching Hokkien reading first; Hakka stops can be typed p/t/k', () => {
  const nan = candidates('tsiah8', dicts, ['nan', 'hak', 'cmn']).filter((c) => c.langs.includes('nan'));
  assert.equal(nan[0].text, '食');
  assert.equal(nan[0].label, 'tsia̍h');
  const hak = candidates('hakga', dicts, ['hak', 'nan', 'cmn']);
  assert.ok(hak.some((c) => c.text === '客家' && c.langs.includes('hak')));
});

test('Zhuyin and explicit special characters', () => {
  assert.ok(candidates('ㄋㄧˇ', dicts).slice(0, 5).some((c) => c.text === '你'));
  assert.ok(candidates('ㄊㄞㄨㄢ', dicts).some((c) => c.text === '臺灣'));
  // explicitly typed extended letters commit as typed first
  assert.equal(candidates('ㆠ', dicts)[0].text, 'ㆠ');
});

test('lookup ranks exact matches before completions', () => {
  const c = candidates('tsui', dicts, ['nan', 'hak', 'cmn']);
  const first = c.findIndex((x) => x.langs.includes('nan'));
  assert.equal(first, 0);
  assert.ok(c.length <= 40);
});

test('English vocabulary: common words, frequency order, capitalisation follows the buffer', () => {
  const c = candidates('hel', dicts, ['eng', 'nan', 'hak', 'cmn']);
  assert.ok(c.some((x) => x.text === 'help' && x.langs.includes('eng')));
  const top = candidates('the', dicts, ['eng', 'nan', 'hak', 'cmn'])[0];
  assert.equal(top.text, 'the');
  assert.equal(candidates('Hello', dicts, ['eng', 'nan', 'hak', 'cmn'])[0].text, 'Hello');
  assert.ok(!candidates('fuck', dicts).some((x) => x.langs.includes('eng')));
});

test('Indigenous words: typed with plain or special letters, shown with Chinese gloss', () => {
  const ami = candidates('cecay', dicts, ['ind', 'nan', 'hak', 'cmn']);
  assert.equal(ami[0].text, 'cecay');
  assert.equal(ami[0].label, '一');
  assert.deepEqual(ami[0].langs, ['ind']);
  // ʉ is folded to u, so typing either spelling reaches the same word
  const sxr = loadFile('ind', 'ind/sxr');
  const words = sxr.lookup('u', 200).map((e) => e.text).filter((t) => t.includes('ʉ'));
  assert.ok(words.length > 0);
  assert.ok(sxr.lookup(toLatinKey(words[0])).some((e) => e.text === words[0]));
  assert.equal(toLatinKey('rʉ'), 'ru');
  // the primary language's completions come before other languages' exact matches
  assert.ok(candidates('ru', { ...dicts, ind: sxr }, ['ind', 'nan', 'hak', 'cmn', 'eng'])[0].langs.includes('ind'));
  assert.ok(variantsFor('u', ['ind', 'nan', 'hak', 'cmn'])[0].text === 'ʉ');
});

test('full-width punctuation table and punctuation variants', () => {
  assert.equal(FULLWIDTH[','], '，');
  assert.equal(FULLWIDTH['.'], '。');
  assert.equal(FULLWIDTH['?'], '？');
  assert.ok(variantsFor('，').some((v) => v.text === ','));
  assert.equal(cycleList('.').at(-1), '.');
});
