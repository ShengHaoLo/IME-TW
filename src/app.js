import { Dictionary, candidates } from './engine.js';
import { loadDictionary } from './dictdata.js';
import {
  LANGS, LANG_NAME, LANG_BADGE, IND_LANGS, ROWS, SYM_ROWS, FULLWIDTH, QUOTES, variantsFor, hasVariants, cycleList,
} from './layout.js';

// Dictionaries load in the background; typing works (conversions only) before they arrive.
const dicts = Object.fromEntries(LANGS.map((l) => [l, new Dictionary([])]));
const loading = new Set(LANGS);

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
  caps: false,    // capital for the next letter (or until switched off when locked)
  lock: false,    // caps locked (double-tap Aa)
  cycle: null,    // {key, i, len, upper, direct}: last Shift-cycle, valid until anything else happens
  native: false,
  layer: 'abc',   // 'abc' letters | 'sym' punctuation and symbols
  fullwidth: true, // type full-width punctuation (，。？) while converting
  ind: 'ami',     // the Indigenous language whose word list is used
  off: [],        // languages switched off in the priority list
};

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(`ime-tw-${k}`)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`ime-tw-${k}`, JSON.stringify(v)); } catch { /* ignore */ } },
};

const savedOrder = store.get('order');
if (Array.isArray(savedOrder)) {
  const known = savedOrder.filter((l) => LANGS.includes(l));
  state.order = [...new Set([...known, ...LANGS])];
}
const savedOff = store.get('off');
if (Array.isArray(savedOff)) state.off = savedOff.filter((l) => LANGS.includes(l)).slice(0, LANGS.length - 1);
if (IND_LANGS.some(([c]) => c === store.get('ind'))) state.ind = store.get('ind');
if (store.get('fullwidth') === false) state.fullwidth = false;

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

// Letters, tone marks and the apostrophe/hyphen/^ used in spellings belong to the composing buffer;
// punctuation and symbols commit it and go straight into the text.
const BUFFERABLE = /^[\p{L}\p{M}\p{Sk}0-9'-]/u;

// Returns true when the text went straight into the text area (needed to undo it when cycling).
function emit(text) {
  if (state.on && BUFFERABLE.test(text)) { state.buffer += text; refresh(); return false; }
  if (state.on && state.buffer) commit();
  insert(text);
  return true;
}

function retract(len, direct) {
  if (!direct) { state.buffer = state.buffer.slice(0, -len); refresh(); } else {
    const s = pad.selectionStart;
    pad.setRangeText('', s - len, s, 'end');
    pad.dispatchEvent(new Event('input'));
  }
}

const prevChar = () => pad.value[pad.selectionStart - 1] ?? '';

// Typed punctuation: full-width in Chinese mode, but "3.14" and "10:30" keep their half-width marks.
function punctText(ch) {
  if (!state.fullwidth) return ch;
  if (QUOTES[ch]) return QUOTES[ch][/^$|[\s（「『【《“‘([]/.test(prevChar()) ? 0 : 1];
  if (/\d/.test(prevChar()) && /[.,:]/.test(ch)) return ch;
  return FULLWIDTH[ch] ?? ch;
}

function typePunct(ch) {
  state.cycle = null;
  if (state.on && state.buffer) commit();
  insert(state.on ? punctText(ch) : ch);
}

function moveCaret(d) {
  state.cycle = null;
  if (state.buffer) commit();
  const p = Math.max(0, Math.min(pad.value.length, pad.selectionStart + d));
  pad.setSelectionRange(p, p);
}

// ---- Composition ----

// Languages in priority order, without the ones switched off.
const activeOrder = () => state.order.filter((l) => !state.off.includes(l));

function refresh() {
  state.cands = candidates(state.buffer, dicts, activeOrder());
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
  if (/[A-Za-z]/.test(c) || c === "'" || (state.buffer && /[0-9^-]/.test(c))) { state.buffer += c; refresh(); return; }
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
    retract(c.len, c.direct);
    i = (c.i + 1) % list.length;
    upper = c.upper;
  }
  releaseCaps();
  const text = upper ? list[i].toUpperCase() : list[i];
  const direct = emit(text);
  state.cycle = { key, i, len: text.length, upper, direct };
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

// Physical keyboard. Shift+letter cycles variants; CapsLock gives capitals; Shift+digit/punctuation types
// the usual symbols (full-width in Chinese mode).
pad.addEventListener('keydown', (e) => {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || MODIFIERS.includes(e.key)) return;
  const m = /^Key([A-Z])$/.exec(e.code);
  if (m && e.shiftKey && hasVariants(m[1].toLowerCase())) { e.preventDefault(); cycleVariant(m[1].toLowerCase()); return; }
  if (state.on) {
    if (/^[A-Za-z0-9]$/.test(e.key) || e.key === "'" || (state.buffer && /^[-^]$/.test(e.key))) { e.preventDefault(); typePlain(e.key); return; }
    if (FULLWIDTH[e.key] || e.key === '"') { e.preventDefault(); typePunct(e.key); return; }
    if (state.buffer && e.key.length === 1 && e.key !== ' ') { commit(); return; }
  }
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
  if (!on) state.lock = false;
  capsBtn?.setAttribute('aria-pressed', String(on));
  if (capsBtn) capsBtn.textContent = state.lock ? 'AA' : 'Aa';
  $('kbd').classList.toggle('caps', on);
}

// A one-shot capital ends after a key; a locked one (double-tap Aa) stays.
function releaseCaps() {
  if (!state.lock) setCaps(false);
}

let lastCapsTap = 0;

function toggleCaps() {
  const now = Date.now();
  if (state.caps && !state.lock && now - lastCapsTap < 400) {
    state.lock = true;
    setCaps(true);
  } else setCaps(!state.caps);
  lastCapsTap = now;
}

// `tap` types the key's own character when it is neither cycled nor popped up.
function tapKey(base, tap = typePlain) {
  if (state.shift && hasVariants(base)) {
    if (!state.cycle || state.cycle.key === base) { cycleVariant(base); return; }
  }
  setShift(false);
  const c = state.caps && /[a-z]/.test(base) ? base.toUpperCase() : base;
  releaseCaps();
  tap(c);
}

const tapSymbol = (c) => { state.cycle = null; emit(c); };

function pickVariant(text) {
  state.cycle = null;
  setShift(false);
  releaseCaps();
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
function characterKey(base, tap = typePlain) {
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
    if (!opened) { if (!cancelled) tapKey(base, tap); return; }
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

// ---- Space bar: tap = space / pick; long-press + slide = move through candidates or text;
// slide up into the popup = reorder language priority ----

const STEP_PX = 22; // horizontal slide per step

function moveSelection(d) {
  if (state.on && state.buffer && state.cands.length > 1) {
    state.sel = Math.max(0, Math.min(state.cands.length - 1, state.sel + d));
    render();
  } else if (!state.buffer) moveCaret(d);
}

function spaceKey() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'key wide';
  b.textContent = '空白 / 選字';
  let timer = null;
  let held = false;
  let anchor = 0;
  let steps = 0;

  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(b, e);
    b.classList.add('down');
    held = false;
    anchor = e.clientX;
    steps = 0;
    timer = setTimeout(() => { held = true; openPrioPop(b); }, LONG_PRESS_MS);
  });
  b.addEventListener('pointermove', (e) => {
    if (!held) return;
    const r = prioPop.getBoundingClientRect();
    const inPop = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (inPop || drag.li) {
      if (!drag.li) {
        const li = document.elementFromPoint(e.clientX, e.clientY)?.closest('#prio-pop li');
        if (li) dragStart(prioPop, li);
      }
      dragMove(e.clientX, e.clientY);
      return;
    }
    const target = Math.trunc((e.clientX - anchor) / STEP_PX);
    while (steps !== target) {
      const d = Math.sign(target - steps);
      steps += d;
      moveSelection(d);
    }
  });
  const finish = (cancelled) => {
    clearTimeout(timer);
    b.classList.remove('down');
    if (!held) { if (!cancelled) { state.cycle = null; if (!press(' ')) insert(' '); } return; }
    held = false;
    if (drag.li) dragEnd();
    else if (!cancelled && state.on && state.buffer) commit(); // release confirms the selection
    closePrioPop();
  };
  b.addEventListener('pointerup', () => finish(false));
  b.addEventListener('pointercancel', () => finish(true));
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
  capsBtn = actionKey(state.lock ? 'AA' : 'Aa', 'fn', toggleCaps);
  capsBtn.setAttribute('aria-pressed', String(state.caps));
  capsBtn.setAttribute('aria-label', '大寫（連點兩下鎖定）');

  const chars = (s, tap) => [...s].map((c) => characterKey(c, tap));
  const layer = (name) => () => { state.layer = name; state.cycle = null; setShift(false); buildKeyboard(); };
  const enter = actionKey('↵', 'fn', () => { if (!press('Enter')) insert('\n'); });
  const space = spaceKey();
  const back = actionKey('⌫', 'fn', backspace, { repeat: true });

  if (state.layer === 'sym') {
    const fw = actionKey(state.fullwidth ? '全' : '半', 'fn', () => setFullwidth(!state.fullwidth));
    fw.setAttribute('aria-label', '全形／半形標點');
    $('kbd').replaceChildren(
      row(...chars(SYM_ROWS[0], tapSymbol)),
      row(...chars(SYM_ROWS[1], tapSymbol)),
      row(...chars(SYM_ROWS[2], tapSymbol)),
      row(shiftBtn, ...chars(SYM_ROWS[3], tapSymbol), back),
      row(
        actionKey('ABC', 'fn', layer('abc')),
        fw,
        actionKey('←', 'fn', () => moveCaret(-1), { repeat: true }),
        space,
        actionKey('→', 'fn', () => moveCaret(1), { repeat: true }),
        enter,
      ),
    );
    return;
  }
  $('kbd').replaceChildren(
    row(...chars(ROWS[0])),
    row(...chars(ROWS[1])),
    row(...chars(ROWS[2])),
    row(shiftBtn, ...chars(ROWS[3]), back),
    row(
      capsBtn,
      actionKey('符', 'fn', layer('sym')),
      characterKey(',', typePunct),
      characterKey("'"),
      space,
      characterKey('-'),
      characterKey('.', typePunct),
      enter,
    ),
  );
}

// ---- Settings ----

function updateHint() {
  const order = activeOrder().map(langLabel).join(' › ');
  const status = loading.size ? `字典載入中（${[...loading].map((l) => LANG_NAME[l]).join('、')}）…` : '';
  $('hint').textContent = state.native
    ? '使用系統鍵盤：不進行轉換。'
    : `${status}優先順序：${order}。長按按鍵或 ⇧＋按鍵 選擇擴充字母與標點，空白鍵選字。`;
}

function setOrder(list) {
  state.order = list;
  store.set('order', list);
  renderPriority();
  buildKeyboard();
  updateHint();
  refresh();
}

function setActive(lang, on) {
  const off = new Set(state.off);
  if (on) off.delete(lang); else if (LANGS.length - off.size > 1) off.add(lang);
  state.off = [...off];
  store.set('off', state.off);
  renderPriority();
  updateHint();
  refresh();
}

// ---- Language priority: draggable list in the menu and in the space-bar popup ----

const prioPop = $('prio-pop');
const prioList = $('prio-list');
const drag = { ol: null, li: null };

function langLabel(l) {
  return l === 'ind' ? `族語（${IND_LANGS.find(([c]) => c === state.ind)[1]}）` : LANG_NAME[l];
}

function renderPriority() {
  for (const ol of [prioList, prioPop]) {
    ol.replaceChildren(...state.order.map((l, i) => {
      const li = document.createElement('li');
      const on = !state.off.includes(l);
      li.dataset.lang = l;
      li.tabIndex = ol === prioList ? 0 : -1;
      li.setAttribute('role', 'checkbox');
      li.setAttribute('aria-checked', String(on));
      li.innerHTML = '<span class="n"></span><span class="name"></span><span class="st"></span>';
      li.querySelector('.n').textContent = i + 1;
      li.querySelector('.name').textContent = langLabel(l);
      li.querySelector('.st').textContent = on ? '啟用' : '停用';
      return li;
    }));
  }
  $('prio-strip').textContent = `優先：${activeOrder().map((l) => LANG_BADGE[l]).join(' › ')}`;
}

function dragStart(ol, li) {
  drag.ol = ol;
  drag.li = li;
  li.classList.add('grab');
}

// Moves the grabbed item to the slot under the pointer.
function dragMove(x, y) {
  const over = document.elementFromPoint(x, y)?.closest('li');
  if (!drag.li || !over || over === drag.li || over.parentElement !== drag.ol) return;
  const items = [...drag.ol.children];
  if (items.indexOf(drag.li) < items.indexOf(over)) over.after(drag.li); else over.before(drag.li);
}

function dragEnd() {
  const lang = drag.li?.dataset.lang;
  const list = drag.ol ? [...drag.ol.children].map((li) => li.dataset.lang) : state.order;
  drag.ol = null;
  drag.li = null;
  if (list.join() !== state.order.join()) setOrder(list); else renderPriority();
  if (!menu.hidden) prioList.querySelector(`[data-lang="${lang}"]`)?.focus({ preventScroll: true });
}

// Direct dragging inside the menu list: a short press toggles the language, moving drags it.
let press0 = null;
prioList.addEventListener('pointerdown', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  press0 = { li, x: e.clientX, y: e.clientY, moved: false };
  capture(prioList, e);
});
prioList.addEventListener('pointermove', (e) => {
  if (!press0) return;
  if (!press0.moved && Math.hypot(e.clientX - press0.x, e.clientY - press0.y) > 6) {
    press0.moved = true;
    dragStart(prioList, press0.li);
  }
  if (press0.moved) dragMove(e.clientX, e.clientY);
});
const endPress = (cancelled) => {
  if (!press0) return;
  const { li, moved } = press0;
  press0 = null;
  if (moved) dragEnd();
  else if (!cancelled) setActive(li.dataset.lang, li.getAttribute('aria-checked') !== 'true');
};
prioList.addEventListener('pointerup', () => endPress(false));
prioList.addEventListener('pointercancel', () => endPress(true));

function openPrioPop(anchorEl) {
  renderPriority();
  prioPop.hidden = false;
  const r = anchorEl.getBoundingClientRect();
  const w = prioPop.offsetWidth;
  const h = prioPop.offsetHeight;
  prioPop.style.left = `${Math.max(4, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 4))}px`;
  prioPop.style.top = `${Math.max(4, r.top - h - 8)}px`;
}

function closePrioPop() {
  prioPop.hidden = true;
}

// ---- Menu (GUI) with W A S D / arrow navigation; hold Shift to grab a language and move it ----

const menu = $('menu');
let grabbed = null;

function openMenu() {
  commitRaw();
  renderPriority();
  menu.hidden = false;
  prioList.firstElementChild?.focus();
}

function closeMenu() {
  grabbed = null;
  menu.hidden = true;
  pad.focus();
}

const navRows = () => [...menu.querySelectorAll('#prio-list li, .navrow')]
  .map((el) => (el.matches('li') ? [el] : [...el.querySelectorAll('button, select')]))
  .filter((r) => r.length);

function navigate(dr, dc) {
  const rows = navRows();
  let r = rows.findIndex((row) => row.includes(document.activeElement));
  if (r < 0) { rows[0][0].focus(); return; }
  let c = rows[r].indexOf(document.activeElement);
  if (dr) {
    r = Math.max(0, Math.min(rows.length - 1, r + dr));
    c = Math.min(c, rows[r].length - 1);
  } else {
    const el = rows[r][c];
    if (el.tagName === 'SELECT') {
      el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + dc));
      el.dispatchEvent(new Event('change'));
      return;
    }
    c = Math.max(0, Math.min(rows[r].length - 1, c + dc));
  }
  rows[r][c].focus();
}

function grabbedMove(d) {
  const li = grabbed;
  const sib = d < 0 ? li.previousElementSibling : li.nextElementSibling;
  if (!sib) return;
  if (d < 0) sib.before(li); else sib.after(li);
  li.focus();
  for (const [i, x] of [...prioList.children].entries()) x.querySelector('.n').textContent = i + 1;
}

const NAV_KEYS = { KeyW: [-1, 0], KeyS: [1, 0], KeyA: [0, -1], KeyD: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

document.addEventListener('keydown', (e) => {
  if (menu.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
  if (e.key === 'Shift') {
    const li = document.activeElement.closest?.('#prio-list li');
    if (li && !e.repeat) { grabbed = li; li.classList.add('grab'); drag.ol = prioList; drag.li = li; }
    return;
  }
  const dir = NAV_KEYS[e.code];
  if (dir) {
    e.preventDefault();
    if (grabbed) { if (dir[0]) grabbedMove(dir[0]); } else navigate(...dir);
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && document.activeElement.matches?.('#prio-list li')) {
    e.preventDefault();
    const li = document.activeElement;
    setActive(li.dataset.lang, li.getAttribute('aria-checked') !== 'true');
    prioList.querySelector(`[data-lang="${li.dataset.lang}"]`)?.focus();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key !== 'Shift' || !grabbed) return;
  grabbed = null;
  dragEnd();
});

$('menu-btn').addEventListener('click', openMenu);
$('prio-strip').addEventListener('click', openMenu);
$('menu-close').addEventListener('click', closeMenu);
menu.addEventListener('pointerdown', (e) => { if (e.target === menu) closeMenu(); });

function setFullwidth(on) {
  state.fullwidth = on;
  store.set('fullwidth', on);
  $('toggle-fw').setAttribute('aria-pressed', String(on));
  if (state.layer === 'sym') buildKeyboard();
}

let indToken = 0;

async function setInd(code) {
  state.ind = code;
  store.set('ind', code);
  $('ind-lang').value = code;
  renderPriority();
  const token = ++indToken;
  loading.add('ind');
  updateHint();
  let d = new Dictionary([]);
  try { d = await loadDictionary('ind', `ind/${code}`); } catch (err) { console.error(err); }
  if (token !== indToken) return; // a newer choice is loading
  dicts.ind = d;
  loading.delete('ind');
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

$('ind-lang').replaceChildren(...IND_LANGS.map(([code, name]) => new Option(name, code)));
$('ind-lang').addEventListener('change', (e) => setInd(e.target.value));
$('toggle-ime').addEventListener('click', (e) => {
  commitRaw();
  state.on = !state.on;
  e.currentTarget.setAttribute('aria-pressed', String(state.on));
});
$('toggle-fw').addEventListener('click', () => setFullwidth(!state.fullwidth));
$('toggle-native').addEventListener('click', () => setNative(!state.native));
$('copy').addEventListener('click', () => navigator.clipboard?.writeText(pad.value));
$('clear').addEventListener('click', () => { pad.value = ''; state.buffer = ''; state.cycle = null; refresh(); pad.focus(); });
document.addEventListener('pointerdown', (e) => { if (!popup.hidden && !popup.contains(e.target)) hidePopup(); }, true);
$('kbd').addEventListener('contextmenu', (e) => e.preventDefault());

setNative(false);
setFullwidth(state.fullwidth);
setOrder(state.order);

for (const lang of LANGS.filter((l) => l !== 'ind')) {
  loadDictionary(lang)
    .then((d) => { dicts[lang] = d; })
    .catch((err) => console.error(err))
    .finally(() => { loading.delete(lang); updateHint(); refresh(); });
}
setInd(state.ind);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
