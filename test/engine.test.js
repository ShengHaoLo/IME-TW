import test from 'node:test';
import assert from 'node:assert/strict';
import { tlToTps, tlMarked, toLatinKey, candidates, Dictionary, buildEntries } from '../src/engine.js';
import { variantsFor, cycleList } from '../src/layout.js';
import { NAN_RAW, HAK_RAW, CMN_RAW } from '../data/dict.js';

const dicts = {
  nan: new Dictionary(buildEntries(NAN_RAW, 'nan')),
  hak: new Dictionary(buildEntries(HAK_RAW, 'hak')),
  cmn: new Dictionary(buildEntries(CMN_RAW, 'cmn')),
};

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
  const nanFirst = candidates('tsui2', dicts, ['nan', 'hak', 'cmn']);
  assert.equal(nanFirst[0].text, '水');
  assert.deepEqual(nanFirst[0].langs, ['nan']);
  assert.ok(nanFirst.some((c) => c.text === 'ㄗㄨㄧˋ'));

  const shared = candidates('sui', dicts, ['hak', 'nan', 'cmn']).find((c) => c.text === '水');
  assert.deepEqual(shared.langs, ['hak']);

  const hakFirst = candidates('sit', dicts, ['hak', 'nan', 'cmn']);
  assert.equal(hakFirst[0].text, '食');
  const cmn = candidates('taiwan', dicts, ['cmn', 'nan', 'hak']);
  assert.equal(cmn[0].text, '臺灣');
  assert.ok(cmn[0].langs.includes('cmn'));
});

test('Zhuyin and explicit special characters', () => {
  assert.equal(candidates('ㄋㄧˇ', dicts)[0].text, '你');
  assert.equal(candidates('ㄊㄞ', dicts)[0].text, '臺灣');
  // explicitly typed extended letters commit as typed first
  assert.equal(candidates('ㆠ', dicts)[0].text, 'ㆠ');
});
