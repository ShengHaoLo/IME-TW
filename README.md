# IME-TW

Input method editor for Taiwanese languages: Hokkien (臺語), Hakka (客語) and Mandarin (華語), with CJK characters, extended Bopomofo (方音符號 ㆠㆣㆦ…) and Latin scripts (Tâi-lô, Pinyin).

It is a static, offline-capable web app (PWA) with its own on-screen keyboard, so it works on computers (physical keyboard), tablets and smartphones (touch). No build step.

## Run

```sh
npm start        # serves http://localhost:8080
npm test         # engine tests
```

## Usage

- **臺語 TL**: type Tâi-lô with tone digits (`tai5-uan5`). Candidates: Han characters, extended Bopomofo (`ㄉㄞˊ ㄨㄢˊ`), and tone-marked TL (`tâi-uân`).
- **客語 Pinyin**: type Hakka pinyin (`hak-ga`).
- **華語 ㄅㄆㄇ**: standard Zhuyin keyboard layout (the on-screen keys show the symbols).
- Space commits the highlighted candidate, Enter commits the raw text, arrows change selection, Esc cancels.
- The **符號** panel inserts extended Bopomofo, tone marks, and Latin letters with diacritics directly.

## Dictionary

`data/dict.js` is a **small hand-entered seed** for demonstrating the engine. Readings follow the Ministry of Education (Taiwan) dictionaries:

- 臺灣閩南語常用詞辭典 <https://sutian.moe.edu.tw/>
- 臺灣客家語常用詞辭典 <https://hakka.dict.moe.edu.tw/>
- 重編國語辭典修訂本 <https://dict.revised.moe.edu.tw/>

The seed has not been reviewed against these sources; Hakka tone/variant handling in particular is not implemented. Before relying on it, import the full MOE datasets (check each dataset's licence terms) and have the entries reviewed by native speakers. Indigenous languages are not yet included.
