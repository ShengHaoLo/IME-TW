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
- **Priority language** (臺語 / 客語 / 華語 buttons): orders each key's variants and the candidate list. Candidates from the other languages are still shown, marked with 臺/客/華 badges.
- Space commits the highlighted candidate, Enter commits the raw text, arrows change selection, Esc cancels. `Aa` = one-shot capital (CapsLock on a physical keyboard). 轉換 turns conversion off for direct typing.
- Typing extended characters explicitly (e.g. ㆠ) commits them as typed first. Candidates always include the Tâi-lô → 方音符號 and tone-marked TL conversions for Hokkien.

Limits: dictionary lookup ignores tones, and standard Bopomofo mixed with Latin letters in one syllable isn't converted.

## Dictionary

`data/dict.js` is a **small hand-entered seed** for demonstrating the engine. Readings follow the Ministry of Education (Taiwan) dictionaries:

- 臺灣閩南語常用詞辭典 <https://sutian.moe.edu.tw/>
- 臺灣客家語常用詞辭典 <https://hakka.dict.moe.edu.tw/>
- 重編國語辭典修訂本 <https://dict.revised.moe.edu.tw/>

The seed has not been reviewed against these sources; Hakka tone/variant handling in particular is not implemented. Before relying on it, import the full MOE datasets (check each dataset's licence terms) and have the entries reviewed by native speakers. Indigenous languages are not yet included.
