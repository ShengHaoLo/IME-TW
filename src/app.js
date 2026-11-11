import { Dictionary, buildEntries, candidates, ZHUYIN_LAYOUT } from './engine.js';
import { NAN_RAW, HAK_RAW, CMN_RAW } from '../data/dict.js';

const dicts = {
  nan: new Dictionary(buildEntries(NAN_RAW, 'nan')),
  hak: new Dictionary(buildEntries(HAK_RAW, 'hak')),
  cmn: new Dictionary(buildEntries(CMN_RAW, 'cmn')),
};

const $ = (id) => document.getElementById(id);
const pad = $('pad');
const state = { mode: 'nan', buffer: '', cands: [], sel: 0 };

const HINTS = {
  nan: '輸入臺羅，數字為聲調（如 tai5-uan5）。候選含漢字、方音符號與 Tâi-lô。',
  hak: '輸入客語拼音（如 hak-ga）。候選含漢字與拼音。',
  cmn: '以標準注音鍵盤輸入，空白鍵選字。',
  raw: '不轉換，直接輸入。',
};

const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];

const EXT_BOPOMOFO = 'ㆠㆡㆢㆣㆤㆥㆦㆧㆨㆩㆪㆫㆬㆭㆮㆯㆰㆱㆲㆳㆴㆵㆶㆷㆸㆹㆺㆻㆼㆽㆾㆿ'.split('');
const TONES_BPMF = ['ˊ', 'ˇ', 'ˋ', '˙', '˪', '˫'];
const LATIN_EXTRA = ['ê', 'û', 'ô', 'ṳ', 'ŭ', 'ɨ', 'o͘', 'O͘', 'ⁿ', 'ū', 'ō', 'ǎ', 'à', 'á', 'â', 'ā', 'a̍', 'è', 'é', 'ē', 'e̍', 'ì', 'í', 'ī', 'i̍', 'ò', 'ó', 'o̍', 'ù', 'ú', 'u̍', 'm̀', 'ḿ', 'm̄', 'm̍', 'ǹ', 'ń', 'n̄', 'n̍'];

function insert(text) {
  pad.setRangeText(text, pad.selectionStart, pad.selectionEnd, 'end');
  pad.dispatchEvent(new Event('input'));
}

function refresh() {
  state.cands = candidates(state.mode, state.buffer, dicts);
  state.sel = 0;
  render();
}

function render() {
  $('buffer').textContent = state.buffer;
  const list = $('cands');
  list.replaceChildren(...state.cands.map((c, i) => {
    const li = document.createElement('li');
    li.textContent = c.text;
    if (c.label) {
      const s = document.createElement('small');
      s.textContent = c.label;
      li.append(s);
    }
    if (c.src) li.title = c.src;
    if (i === state.sel) li.className = 'sel';
    li.addEventListener('pointerdown', (e) => { e.preventDefault(); commit(i); });
    return li;
  }));
  list.querySelector('.sel')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function commit(i = state.sel) {
  const c = state.cands[i];
  if (c) insert(c.text);
  state.buffer = '';
  refresh();
}

function commitRaw() {
  if (state.buffer) insert(state.buffer);
  state.buffer = '';
  refresh();
}

// Single entry point for physical and on-screen keys. Returns true if handled.
function press(key) {
  const { mode, buffer } = state;
  if (mode === 'raw') return false;

  if (key === 'Backspace') {
    if (!buffer) return false;
    state.buffer = [...buffer].slice(0, -1).join('');
    refresh();
    return true;
  }
  if (key === 'Escape') { if (!buffer) return false; state.buffer = ''; refresh(); return true; }
  if (key === 'Enter') { if (!buffer) return false; commitRaw(); return true; }
  if (key === ' ') {
    if (!buffer) return false;
    commit();
    return true;
  }
  if (buffer && (key === 'ArrowRight' || key === 'ArrowDown')) { state.sel = (state.sel + 1) % state.cands.length; render(); return true; }
  if (buffer && (key === 'ArrowLeft' || key === 'ArrowUp')) { state.sel = (state.sel - 1 + state.cands.length) % state.cands.length; render(); return true; }
  if (key.length !== 1) return false;

  if (mode === 'cmn') {
    const z = ZHUYIN_LAYOUT[key.toLowerCase()];
    if (!z) return false;
    state.buffer += z;
  } else if (/[a-z]/i.test(key) || (buffer && /[1-9'-]/.test(key))) {
    state.buffer += key.toLowerCase();
  } else {
    if (buffer) commitRaw();
    return false;
  }
  refresh();
  return true;
}

pad.addEventListener('keydown', (e) => {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (press(e.key)) e.preventDefault();
});

function keyButton(label, sub, onPress, cls = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `key ${cls}`.trim();
  b.textContent = label;
  if (sub) {
    const s = document.createElement('small');
    s.textContent = sub;
    b.append(s);
  }
  // pointerdown + preventDefault keeps focus (and the caret) in the textarea.
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); onPress(); });
  return b;
}

function insertKey(ch) {
  if (!press(ch)) insert(ch);
}

function buildKeyboard() {
  const kbd = $('kbd');
  kbd.replaceChildren();
  if (state.mode === 'raw') {
    // Direct mode: only editing helpers; typing uses the system/physical keyboard.
    const row = document.createElement('div');
    row.className = 'row';
    row.append(keyButton('空白', '', () => insert(' '), 'wide'), keyButton('⌫', '', backspace, 'fn'), keyButton('↵', '', () => insert('\n'), 'fn'));
    kbd.append(row);
    return;
  }
  for (const r of ROWS) {
    const row = document.createElement('div');
    row.className = 'row';
    for (const k of r) {
      const z = ZHUYIN_LAYOUT[k];
      if (state.mode === 'cmn') row.append(keyButton(z || k, k, () => insertKey(k)));
      else row.append(keyButton(k, '', () => insertKey(k)));
    }
    if (r === ROWS[3]) {
      row.append(keyButton('⌫', '', backspace, 'fn'));
    }
    kbd.append(row);
  }
  const last = document.createElement('div');
  last.className = 'row';
  if (state.mode !== 'cmn') last.append(keyButton('-', '', () => insertKey('-')));
  last.append(
    keyButton('空白 / 選字', '', () => { if (!press(' ')) insert(' '); }, 'wide'),
    keyButton('↹', '下一個', () => press('ArrowRight'), 'fn'),
    keyButton('↵', '', () => { if (!press('Enter')) insert('\n'); }, 'fn'),
  );
  kbd.append(last);
}

function backspace() {
  if (press('Backspace')) return;
  const s = pad.selectionStart;
  if (s !== pad.selectionEnd) pad.setRangeText('', s, pad.selectionEnd, 'end');
  else if (s > 0) {
    const prev = [...pad.value.slice(0, s)].pop();
    pad.setRangeText('', s - prev.length, s, 'end');
  }
}

function buildSymbols() {
  const box = $('symbols');
  const addGroup = (chars) => {
    for (const ch of chars) box.append(keyButton(ch, '', () => insert(ch), 'sym'));
    const sep = document.createElement('span');
    sep.className = 'sep';
    box.append(sep);
  };
  addGroup(EXT_BOPOMOFO);
  addGroup(TONES_BPMF);
  addGroup(LATIN_EXTRA);
  for (const b of box.querySelectorAll('.key')) b.className = '';
}

function setMode(mode) {
  commitRaw();
  state.mode = mode;
  for (const b of document.querySelectorAll('#modes button')) b.setAttribute('aria-selected', String(b.dataset.mode === mode));
  $('hint').textContent = HINTS[mode];
  buildKeyboard();
  refresh();
  pad.focus({ preventScroll: true });
}

function setNative(on) {
  $('toggle-native').setAttribute('aria-pressed', String(on));
  $('kbd').hidden = on;
  // inputmode=none stops phones/tablets from popping up their own keyboard over ours.
  pad.setAttribute('inputmode', on ? 'text' : 'none');
}

for (const b of document.querySelectorAll('#modes button')) b.addEventListener('click', () => setMode(b.dataset.mode));
$('toggle-symbols').addEventListener('click', (e) => {
  const open = $('symbols').hidden;
  $('symbols').hidden = !open;
  e.currentTarget.setAttribute('aria-pressed', String(open));
});
$('toggle-native').addEventListener('click', () => setNative($('toggle-native').getAttribute('aria-pressed') !== 'true'));
$('copy').addEventListener('click', () => navigator.clipboard?.writeText(pad.value));
$('clear').addEventListener('click', () => { pad.value = ''; state.buffer = ''; refresh(); pad.focus(); });

const coarse = matchMedia('(pointer: coarse)').matches;
buildSymbols();
setNative(false);
if (!coarse) pad.setAttribute('inputmode', 'text'); // desktop: physical keyboard is the primary path
setMode('nan');

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
