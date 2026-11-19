// node tools/tests/engine.test.js
const E = require('../../engine.js'), D = E.data;
let fail = 0; const bad = (...a) => { fail++; if (fail < 25) console.log('FOUT', ...a); };
// lettergrepen vormen samen het woord
for (const [w, s] of Object.entries(D.syl)) if (s.join('') !== w) bad('syl', w, s);
// elke week: woorden, onzinwoorden, regels
for (const wk of D.weeks) {
  if (wk.review) { if (!E.ruleWeeks(wk.n).length) bad('review leeg', wk.n); continue; }
  if ((wk.words || []).length < 20) bad('weinig woorden', wk.n);
  if (wk.mode === 'regex' || wk.mode === 'manual') { const miss = wk.words.filter(w => !E.patternSpans(w, wk).length); if (miss.length > 3) bad('patroon mist', wk.n, miss); }
}
// afleiders: 3 verschillende, niet het woord zelf, alleen letters
const all = new Set(); D.weeks.forEach(w => (w.words || []).concat(w.nonwords || []).forEach(x => all.add(x)));
D.cards.A.concat(D.cards.B, D.cards.P).forEach(x => all.add(x));
let tooFew = 0;
for (const w of all) {
  const d = E.distractors(w, 3, E.rngFrom(w.length * 7));
  if (d.length !== 3 || new Set(d).size !== 3 || d.includes(w) || d.some(x => !/^[a-zëïéèöü]+$/.test(x))) bad('afleiders', w, d);
  if (E.mutations(w).length < 3) tooFew++;
}
// lang of kort klopt met de voorbeelden uit week 3 en 4
const LK = { maken: 'lang', makker: 'kort', bomen: 'lang', bommen: 'kort', lachen: 'kort', zingen: null, manen: 'lang', kachel: 'kort', lepel: 'lang', pakken: 'kort', vogel: 'lang', vissen: null, boeken: null };
for (const [w, v] of Object.entries(LK)) if (E.vowelLength(w) !== v) bad('langkort', w, E.vowelLength(w), v);
// flitstrap komt uit rond 71% goed bij een gesimuleerde lezer met drempel 400 ms
let ok = 0, n = 0; const f = E.newFlash(900), r = E.rngFrom(3);
for (let i = 0; i < 3000; i++) { const p = 1 / (1 + Math.exp(-(Math.log(f.ms) - Math.log(400)) * 4)) * .95 + .05 * .25; const c = r() < p; E.flashStep(f, c, Date.now()); if (i > 200) { ok += c; n++; } }
if (Math.abs(ok / n - .71) > .05) bad('trap', ok / n);
// herhaling
const rev = {}; E.reviewMiss(rev, 'fiets', 0); if (E.dueWords(rev, 1).length) bad('te vroeg'); if (E.dueWords(rev, 20 * 36e5)[0] !== 'fiets') bad('niet terug');
for (let i = 0; i < 4; i++) E.reviewHit(rev, 'fiets', 0); if (rev.fiets) bad('niet klaar na 4');
// tags
const T = E.tags('straat'); if (!T.includes('clusterBegin')) bad('tags straat', T);
if (!E.tags('lachen').includes('chng')) bad('tags lachen');
if (!E.tags('verjaardag').includes('voorvoegsel')) bad('tags ver');
console.log(`engine: ${Object.keys(D.syl).length} woorden, ${all.size} afleidertests (${tooFew} met weinig varianten), trap ${(ok / n * 100).toFixed(0)}% goed, fouten ${fail}`);
process.exit(fail ? 1 : 0);
