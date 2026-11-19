// Simuleer 7 dagen achter elkaar in dezelfde week: hoeveel herhaling zit er in woorden en teksten?
global.window = {}; global.localStorage = { getItem: () => null, setItem: () => {} };
const E = require('../../engine.js'), D = E.data;
const DAY = 864e5;
for (const n of [1, 3, 5, 8, 11, 12]) {
  const seen = {}; let prev = null, prevText = null, rep = [], textRep = 0, texts = new Set();
  for (let d = 0; d < 7; d++) {
    const now = Date.UTC(2026, 9, 19) + d * DAY, r = Math.random;
    const words = E.wordsFor(n, r), used = [];
    const pick = (list, k) => { const out = E.fresh(list.filter(x => !used.includes(x)), k, seen, r, now); used.push(...out); return out; };
    pick(words.filter(w => E.syllables(w).length >= 2), 6); pick(words, 7); pick(E.nonwordsFor(n, r), 3);
    const sp = []; E.ruleWeeks(n).forEach(w => (w.spell || []).forEach(x => sp.push(x))); (E.week(n).spell || []).forEach(x => sp.includes(x) || sp.push(x)); pick(sp, 4);
    E.markSeen(seen, used, now);
    const tk = E.fresh(E.textsFor(n).map(x => 't:' + x.title), 1, seen, r, now)[0]; E.markSeen(seen, [tk], now); texts.add(tk);
    if (prev) rep.push(used.filter(x => prev.includes(x)).length / used.length);
    if (tk === prevText) textRep++;
    prev = used; prevText = tk;
  }
  console.log(`week ${n}: woorden dag-op-dag hetzelfde ${Math.round(100 * Math.max(...rep))}% (max), verschillende teksten in 7 dagen: ${texts.size}, zelfde tekst als gisteren: ${textRep}x`);
}
