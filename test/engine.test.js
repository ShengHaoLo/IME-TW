import test from 'node:test';
import assert from 'node:assert/strict';
import { tlToTps, tlMarked, candidates, Dictionary, buildEntries } from '../src/engine.js';
import { NAN_RAW, HAK_RAW, CMN_RAW } from '../data/dict.js';

const dicts = {
  nan: new Dictionary(buildEntries(NAN_RAW, 'nan')),
  hak: new Dictionary(buildEntries(HAK_RAW, 'hak')),
  cmn: new Dictionary(buildEntries(CMN_RAW, 'cmn')),
};

test('TL to extended Bopomofo', () => {
  assert.equal(tlToTps('tai5-uan5'), 'ㄉㄞˊ ㄨㄢˊ');
  assert.equal(tlToTps('bue7'), 'ㆠㄨㆤ˫');
  assert.equal(tlToTps('khuann3'), 'ㄎㄨㆩ˪');
  assert.equal(tlToTps('tsiah8'), 'ㄗㄧㄚㆷ˙');
  assert.equal(tlToTps('ng5'), 'ㆭˊ');
  assert.equal(tlToTps('xyz'), null);
});

test('TL tone marks', () => {
  assert.equal(tlMarked('tai5-uan5'), 'tâi-uân');
  assert.equal(tlMarked('tsiu2'), 'tsiú');
  assert.equal(tlMarked('kui7'), 'kuī');
  assert.equal(tlMarked('goo7'), 'gōo');
  assert.equal(tlMarked('ng5'), 'n̂g');
  assert.equal(tlMarked('tsiah8'), 'tsia̍h');
});

test('Hokkien lookup ignores tones and offers scripts', () => {
  const c = candidates('nan', 'tsui2', dicts).map((x) => x.text);
  assert.equal(c[0], '水');
  assert.ok(c.includes('ㄗㄨㄧˋ'));
  assert.ok(c.includes('tsuí'));
});

test('Mandarin Zhuyin lookup ignores tone marks', () => {
  assert.equal(candidates('cmn', 'ㄋㄧˇ', dicts)[0].text, '你');
  assert.equal(candidates('cmn', 'ㄊㄞ', dicts)[0].text, '臺灣');
});
