// Builds data/eng.tsv: the most frequent English words, most frequent first.
// Usage: node tools/build-english.mjs <en_50k.txt> <words_alpha.txt> [out] [count]
//   en_50k.txt     hermitdave/FrequencyWords content/2018/en/en_50k.txt (CC BY-SA 4.0)
//   words_alpha.txt dwyl/english-words words_alpha.txt (used only to keep real dictionary words)
import { readFileSync, writeFileSync } from 'node:fs';

const [freqFile, wordsFile, out = 'data/eng.tsv', count = '20000'] = process.argv.slice(2);
if (!freqFile || !wordsFile) throw new Error('usage: node tools/build-english.mjs <en_50k.txt> <words_alpha.txt> [out] [count]');

const real = new Set(readFileSync(wordsFile, 'utf8').split(/\s+/));
// Subtitle-derived frequency lists contain profanity; a candidate bar should not volunteer it.
const BLOCK = new Set(('fuck fucked fucker fucking fucks motherfucker shit shitty bullshit asshole bitch bitches bastard dick '
  + 'dicks cock pussy cunt slut whore damn goddamn nigger nigga fag faggot piss pissed crap douche retard retarded '
  + 'bloody tits boobs porn sex sexy nude naked').split(' '));

const words = [];
for (const line of readFileSync(freqFile, 'utf8').split('\n')) {
  const w = line.split(' ')[0];
  if (!/^[a-z]+$/.test(w) || BLOCK.has(w) || !real.has(w)) continue;
  if (w.length < 2 && w !== 'a' && w !== 'i') continue;
  words.push(w);
  if (words.length >= Number(count)) break;
}
writeFileSync(out, `${words.join('\n')}\n`);
console.log('eng', words.length);
