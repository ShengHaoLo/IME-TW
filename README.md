# IME-TW

Input method editor for Taiwanese languages: Hokkien (臺語), Hakka (客語) and Mandarin (華語), with CJK characters, extended Bopomofo (方音符號 ㆠㆣㆦ…) and Latin scripts (Tâi-lô, Pinyin).

It is a static, offline-capable web app (PWA) with its own on-screen keyboard, so it works on computers (physical keyboard), tablets and smartphones (touch). No build step.

## Run

```sh
npm start        # serves http://localhost:8080
npm test         # engine tests
```

## Usage

One QWERTY keyboard serves all languages. Type Latin letters (Tâi-lô `tai5-uan5`, Hakka pinyin `hak-ga`, Mandarin pinyin `taiwan`) with tone digits, or Zhuyin typed from variants.

- **Variants**: every key carries the extended letters most similar to it (`b` → ㆠ ㄅ, `o` → ㆦ o͘ ㆧ …, `n` → ⁿ ㆭ …, `u` → ṳ …), plus tone marks (á à â ā a̍ ǎ…). The small corner hint shows the top variant.
  - **Long-press** a key to open its variants, then slide to one and release (or tap it).
  - **Shift + key** (on-screen ⇧ or physical Shift) inserts the first variant; repeat the same key to step through the rest, ending on the plain letter. On-screen ⇧ applies to one key at a time; tap it again for another key.
- **Space bar gestures**: tap = space / pick candidate. Long-press, then slide left/right to move through candidates (or the caret when not composing); release to confirm. Long-pressing also opens a language-priority popup: slide up into it and drag a language to reorder (changes variant and candidate priority); release to apply.
- **Menu (☰ 選單)**: a GUI for language priority (drag rows; tap a row to switch a language on/off), the Indigenous language, full-width, native-script and conversion toggles, copy and clear. With the menu open, **W/A/S/D** (or arrows) move focus, A/D change a dropdown, Enter/Space activates; hold **Shift** to grab the focused language and move it with W/S, release Shift to drop. Esc closes.
- **Indigenous languages** (族語): pick one of the 16 languages from the dropdown. Type plain letters (`nga'ay`); long-press `u` → ʉ, `i` → ɨ, `r` → ṟ, `'` → ^ ʼ for the special letters of Kanakanavu, Saaroa, Tsou, Rukai, Atayal and Amis. Special letters are matched by their plain forms.
- **English**: the 20,000 most frequent words are offered as candidates (capitalised if you type a capital).
- **Punctuation**: `,` `.` and the 符 layer give full-width marks （，。？！：；「」『』（）【】《》“”…～—）; long-press or Shift+key switches to half-width and related forms (`.` → 。 ． … ‧ ·). The 全形標點 button (or 全/半 on the 符 layer) turns full-width off; "3.14" and "10:30" always keep half-width marks. On a physical keyboard Shift+digit/punctuation types the normal symbols, Shift+letter cycles variants, `"` alternates “ ”.
- **Editing keys**: `Aa` is a one-shot capital (double-tap to lock; CapsLock on a physical keyboard); ← → on the 符 layer move the caret.
- Space commits the highlighted candidate, Enter commits the raw text, arrows change selection, Esc cancels. `Aa` = one-shot capital (CapsLock on a physical keyboard). 轉換 turns conversion off for direct typing.
- Typing extended characters explicitly (e.g. ㆠ) commits them as typed first. Candidates always include the Tâi-lô → 方音符號 and tone-marked TL conversions for Hokkien.

Limits: dictionary lookup ignores tones, and standard Bopomofo mixed with Latin letters in one syllable isn't converted.

## Dictionary

Real Ministry of Education (Taiwan) data, imported from the g0v MOE-derived JSON mirrors by `tools/build-dict.mjs` (see `data/NOTICE.md` for sources, CC BY-ND 3.0 Taiwan licence and attribution):

- 臺灣閩南語常用詞辭典: ~16.7k Hokkien entries (Tâi-lô readings)
- 臺灣客家語常用詞辭典: ~15k Hakka entries; matches all five dialects' spellings (四縣, 海陸, 大埔, 饒平, 詔安), shows 四縣
- 重編國語辭典修訂本: ~157k Mandarin words up to 4 characters, found by pinyin or Zhuyin

Lookup ignores tones and hyphens (`taiuan` = `tai5-uan5`). Without word-frequency data, results are ranked exact match first, shorter words first. Dictionaries load in the background (about 7 MB plus one ~30–150 KB file for the chosen Indigenous language, cached for offline use).

The MOE site <https://mhi.moe.edu.tw/resource/index.html> could not be reached from the build environment, so the mirrors were used.

- **Indigenous languages**: 16 word lists (~28k words) from the 學習詞表 of 族語E樂園 (ILRDF, <https://web.klokah.tw/>) via the FormosanBank mirror, built by `tools/build-formosan.mjs`. This data is **CC BY-NC-SA 4.0 (non-commercial)**. Dialects of a language are merged and results are word lists, not full dictionaries. Presbyterian-church (Bible-romanisation) and Academia Sinica sources are not imported yet.
- **English**: top 20,000 words of FrequencyWords (CC BY-SA 4.0), built by `tools/build-english.mjs`.

Have the data reviewed by native speakers before relying on it.
