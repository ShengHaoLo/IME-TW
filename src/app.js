import { Dictionary, buildEntries, candidates } from './engine.js';
import { LANGS, LANG_NAME, LANG_BADGE, ROWS, variantsFor, hasVariants, cycleList } from './layout.js';
import { NAN_RAW, HAK_RAW, CMN_RAW } from '../data/dict.js';

const dicts = {
  nan: new Dictionary(buildEntries(NAN_RAW, 'nan')),
  hak: new Dictionary(buildEntries(HAK_RAW, 'hak')),
  cmn: new Dictionary(buildEntries(CMN_RAW, 'cmn')),
};

const $ = (id) => document.getElementById(id);
const pad = $('pad');
const popup = $('popup');
const LONG_PRESS_MS = 380;

const state = {
  order: [...LANGS],
  on: true,       // conversion on/off
  buffer: '',     // composing text
  cands: [],
  sel: 0,
  shift: false,   // on-screen Shift latch (variant cycling)
  caps: false,    // one-shot capital
  cycle: null,    // {key, i, len, upper}: last Shift-cycle, valid until anything else happens
  native: false,
};

try {
  const saved = JSON.parse(localStorage.getItem('ime-tw-order'));
  if (Array.isArray(saved) && saved.length === LANGS.length && LANGS.every((l) => saved.includes(l))) state.order = saved;
} catch { /* ignore */ }

const graphemes = (s) => (typeof Intl.Segmenter === 'function'
  ? Array.from(new Intl.Segmenter().segment(s), (x) => x.segment)
  : [...s]);

// ---- Text output ----

function insert(text) {
  pad.setRangeText(text, pad.selectionStart, pad.selectionEnd, 'end');
  pad.dispatchEvent(new Event('input'));
}

function deleteBeforeCaret() {
  const s = pad.selectionStart;
  if (s !== pad.selectionEnd) pad.setRangeText('', s, pad.selectionEnd, 'end');
  else if (s > 0) {
    const last = graphemes(pad.value.slice(0, s)).pop();
    pad.setRangeText('', s - last.length, s, 'end');
  }
  pad.dispatchEvent(new Event('input'));
}

// With conversion on, characters go to the composing buffer; off, straight into the text.
function emit(text) {
  if (state.on) { state.buffer += text; refresh(); } else insert(text);
}

function retract(len) {
  if (state.on) { state.buffer = state.buffer.slice(0, -len); refresh(); } else {
    const s = pad.selectionStart;
    pad.setRangeText('', s - len, s, 'end');
  }
}

// ---- Composition ----

function refresh() {
  state.cands = candidates(state.buffer, dicts, state.order);
  state.sel = 0;
  render();
}

function render() {
  $('buffer').textContent = state.buffer;
  const list = $('cands');
  list.replaceChildren(...state.cands.map((c, i) => {
    const li = document.createElement('li');
    li.append(c.text);
    if (c.label) {
      const s = document.createElement('small');
      s.textContent = c.label;
      li.append(s);
    }
    if (c.langs.length) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = c.langs.map((l) => LANG_BADGE[l]).join('');
      b.title = c.langs.map((l) => LANG_NAME[l]).join('、');
      li.append(b);
    }
    if (c.src) li.title = c.src;
    if (i === state.sel) li.className = 'sel';
    li.addEventListener('pointerdown', (e) => { e.preventDefault(); commit(i); });
    return li;
  }));
  list.querySelector('.sel')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function commit(i = state.sel) {
  state.cycle = null;
  const c = state.cands[i];
  if (c) insert(c.text);
  state.buffer = '';
  refresh();
}

function commitRaw() {
  state.cycle = null;
  if (state.buffer) insert(state.buffer);
  state.buffer = '';
  refresh();
}

// ---- Key handling ----

function typePlain(c) {
  state.cycle = null;
  if (!state.on) { insert(c); return; }
  if (/[A-Za-z]/.test(c) || (state.buffer && /[0-9'-]/.test(c))) { state.buffer += c; refresh(); return; }
  if (state.buffer) commit();
  insert(c);
}

// Shift+key: insert the best variant; repeating the same key swaps it for the next, ending on the plain key.
function cycleVariant(key) {
  const list = cycleList(key, state.order);
  let i = 0;
  let upper = state.caps;
  const c = state.cycle;
  if (c && c.key === key) {
    retract(c.len);
    i = (c.i + 1) % list.length;
    upper = c.upper;
  }
  setCaps(false);
  const text = upper ? list[i].toUpperCase() : list[i];
  emit(text);
  state.cycle = { key, i, len: text.length, upper };
}

// Non-character keys. Returns true when handled.
function press(key) {
  state.cycle = null;
  setShift(false);
  if (!state.on || !state.buffer) return false;
  const n = state.cands.length;
  switch (key) {
    case 'Backspace':
      state.buffer = graphemes(state.buffer).slice(0, -1).join('');
      refresh();
      return true;
    case 'Escape': state.buffer = ''; refresh(); return true;
    case 'Enter': commitRaw(); return true;
    case ' ': commit(); return true;
    case 'ArrowRight': case 'ArrowDown': state.sel = (state.sel + 1) % n; render(); return true;
    case 'ArrowLeft': case 'ArrowUp': state.sel = (state.sel - 1 + n) % n; render(); return true;
    default: return false;
  }
}

const MODIFIERS = ['Shift', 'CapsLock', 'Control', 'Alt', 'Meta', 'AltGraph'];

// Physical keyboard. Shift+key cycles variants; CapsLock gives capitals.
pad.addEventListener('keydown', (e) => {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || MODIFIERS.includes(e.key)) return;
  const m = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(e.code);
  if (m) {
    const base = (m[1] || m[2]).toLowerCase();
    if (e.shiftKey && hasVariants(base)) { e.preventDefault(); cycleVariant(base); return; }
    if (state.on && /^[A-Za-z0-9]$/.test(e.key)) { e.preventDefault(); typePlain(e.key); return; }
  }
  if (state.on && state.buffer && /^['-]$/.test(e.key)) { e.preventDefault(); typePlain(e.key); return; }
  if (state.on && state.buffer && e.key.length === 1 && e.key !== ' ') { commit(); return; }
  if (press(e.key)) e.preventDefault();
});
pad.addEventListener('click', () => { state.cycle = null; });

// ---- On-screen keyboard ----

let shiftBtn;
let capsBtn;

function setShift(on) {
  state.shift = on;
  shiftBtn?.setAttribute('aria-pressed', String(on));
}

function setCaps(on) {
  state.caps = on;
  capsBtn?.setAttribute('aria-pressed', String(on));
  $('kbd').classList.toggle('caps', on);
}

function tapKey(base) {
  if (state.shift && hasVariants(base)) {
    if (!state.cycle || state.cycle.key === base) { cycleVariant(base); return; }
  }
  setShift(false);
  const c = state.caps && /[a-z]/.test(base) ? base.toUpperCase() : base;
  setCaps(false);
  typePlain(c);
}

function pickVariant(text) {
  state.cycle = null;
  setShift(false);
  setCaps(false);
  emit(text);
}

let popupItems = [];

// Pointer capture keeps move/up events on the key while the popup is used; it can throw for stale pointers.
function capture(el, e) {
  try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
}

function hidePopup() {
  popup.hidden = true;
  popupItems = [];
}

function showPopup(btn, base) {
  const upper = state.caps;
  popup.replaceChildren(...variantsFor(base, state.order).map((v) => {
    const s = document.createElement('span');
    s.textContent = upper ? v.text.toUpperCase() : v.text;
    s.title = v.langs.map((l) => LANG_NAME[l]).join('、');
    s.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pickVariant(s.textContent); hidePopup(); });
    return s;
  }));
  popupItems = [...popup.children];
  popup.hidden = false;
  const r = btn.getBoundingClientRect();
  const w = popup.offsetWidth;
  const h = popup.offsetHeight;
  popup.style.left = `${Math.max(4, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 4))}px`;
  popup.style.top = `${r.top - h - 6 < 4 ? r.bottom + 6 : r.top - h - 6}px`;
}

const itemAt = (x, y) => {
  const el = document.elementFromPoint(x, y);
  return popupItems.includes(el) ? el : null;
};

// A character key: tap types it; long-press opens the variant popup (release over one to choose it).
function characterKey(base) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'key';
  const lbl = document.createElement('span');
  lbl.className = 'lbl';
  lbl.textContent = base;
  b.append(lbl);
  const top = variantsFor(base, state.order)[0];
  if (top) {
    const h = document.createElement('span');
    h.className = 'hint';
    h.textContent = top.text;
    b.append(h);
  }

  let timer = null;
  let active = false;
  let opened = false;

  b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // keep focus and caret in the textarea
    capture(b, e);
    active = true;
    opened = false;
    b.classList.add('down');
    if (hasVariants(base)) {
      timer = setTimeout(() => { opened = true; showPopup(b, base); }, LONG_PRESS_MS);
    }
  });
  b.addEventListener('pointermove', (e) => {
    if (!opened) return;
    const hit = itemAt(e.clientX, e.clientY);
    popupItems.forEach((s) => s.classList.toggle('on', s === hit));
  });
  const finish = (e, cancelled) => {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    b.classList.remove('down');
    if (!opened) { if (!cancelled) tapKey(base); return; }
    const hit = cancelled ? null : itemAt(e.clientX, e.clientY);
    // Released elsewhere: leave the popup open so a variant can still be tapped.
    if (hit) { pickVariant(hit.textContent); hidePopup(); }
  };
  b.addEventListener('pointerup', (e) => finish(e, false));
  b.addEventListener('pointercancel', (e) => finish(e, true));
  return b;
}

function actionKey(label, cls, fn, { repeat = false } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `key ${cls}`.trim();
  b.textContent = label;
  let t = null;
  const stop = () => { clearTimeout(t); clearInterval(t); b.classList.remove('down'); };
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(b, e);
    b.classList.add('down');
    fn();
    if (repeat) t = setTimeout(() => { t = setInterval(fn, 60); }, 400);
  });
  b.addEventListener('pointerup', stop);
  b.addEventListener('pointercancel', stop);
  return b;
}

function row(...keys) {
  const r = document.createElement('div');
  r.className = 'row';
  r.append(...keys);
  return r;
}

function backspace() {
  if (!press('Backspace')) deleteBeforeCaret();
}

function buildKeyboard() {
  shiftBtn = actionKey('⇧', 'fn', () => {
    const on = !state.shift;
    state.cycle = null;
    setShift(on);
  });
  shiftBtn.setAttribute('aria-label', '變體切換 Shift');
  shiftBtn.setAttribute('aria-pressed', String(state.shift));
  capsBtn = actionKey('Aa', 'fn', () => setCaps(!state.caps));
  capsBtn.setAttribute('aria-pressed', String(state.caps));

  const chars = (s) => [...s].map(characterKey);
  $('kbd').replaceChildren(
    row(...chars(ROWS[0])),
    row(...chars(ROWS[1])),
    row(...chars(ROWS[2])),
    row(shiftBtn, ...chars(ROWS[3]), actionKey('⌫', 'fn', backspace, { repeat: true })),
    row(
      capsBtn,
      actionKey(',', '', () => { press(','); typePlain(','); }),
      actionKey('-', '', () => { setShift(false); typePlain('-'); }),
      actionKey('空白 / 選字', 'wide', () => { if (!press(' ')) insert(' '); }),
      actionKey('.', '', () => { press('.'); typePlain('.'); }),
      actionKey('↹', 'fn', () => press('ArrowRight')),
      actionKey('↵', 'fn', () => { if (!press('Enter')) insert('\n'); }),
    ),
  );
}

// ---- Settings ----

function updateHint() {
  const order = state.order.map((l) => LANG_NAME[l]).join(' › ');
  $('hint').textContent = state.native
    ? '使用系統鍵盤：不進行轉換。'
    : `優先順序：${order}。長按按鍵或 ⇧＋按鍵 選擇擴充字母，空白鍵選字。`;
}

function setOrder(first) {
  state.order = [first, ...LANGS.filter((l) => l !== first)];
  try { localStorage.setItem('ime-tw-order', JSON.stringify(state.order)); } catch { /* ignore */ }
  for (const b of document.querySelectorAll('#langs button')) b.setAttribute('aria-pressed', String(b.dataset.lang === first));
  buildKeyboard();
  updateHint();
  refresh();
}

function setNative(on) {
  state.native = on;
  $('toggle-native').setAttribute('aria-pressed', String(on));
  $('kbd').hidden = on;
  // inputmode=none stops phones and tablets from popping up their own keyboard over ours.
  pad.setAttribute('inputmode', on ? 'text' : 'none');
  updateHint();
}

for (const b of document.querySelectorAll('#langs button')) b.addEventListener('click', () => setOrder(b.dataset.lang));
$('toggle-ime').addEventListener('click', (e) => {
  commitRaw();
  state.on = !state.on;
  e.currentTarget.setAttribute('aria-pressed', String(state.on));
});
$('toggle-native').addEventListener('click', () => setNative(!state.native));
$('copy').addEventListener('click', () => navigator.clipboard?.writeText(pad.value));
$('clear').addEventListener('click', () => { pad.value = ''; state.buffer = ''; state.cycle = null; refresh(); pad.focus(); });
document.addEventListener('pointerdown', (e) => { if (!popup.hidden && !popup.contains(e.target)) hidePopup(); }, true);
$('kbd').addEventListener('contextmenu', (e) => e.preventDefault());

setNative(false);
setOrder(state.order[0]);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
