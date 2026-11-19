// Buitencontrole van het niveaumodel: nepkinderen met een bekend niveau. Vindt het model dat niveau terug, en klopt de 80%-marge?
const L = require('../../level.js'), E = require('../../engine.js'), D = E.data;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) * Math.SQRT2; };
const sig = x => 1 / (1 + Math.exp(-x));
const all = [...new Set(D.weeks.flatMap(w => (w.words || []).concat(D.pools[w.n] || [])))].map(w => ({ w, d: L.difficulty(w) }));
const non = [...new Set(D.weeks.flatMap(w => w.nonwords || []))].map(w => ({ w, d: L.difficulty(w, true), pseudo: true }));
function kid(Mtrue) {
  const dev = { een: gauss() * .5, twee: gauss() * .5, drie: gauss() * .5, vier: gauss() * .5, onzin: gauss() * .6 };
  // het echte kind: iets andere vorm dan het model (misspecificatie), plus eigen sterke en zwakke woordsoorten
  return (it, task) => { const off = task.offset || 0, theta = Mtrue + L.OFF + dev[L.structure(it.w, it.pseudo)]; const p = (task.guess || 0) + (1 - (task.guess || 0) - .06) * sig(1.0 * (theta - it.d - off * .85)); return rnd() < p ? 1 : 0; };
}
const res = { c: [], 1: [], 3: [], 10: [] }, cov = { c: [], 1: [], 3: [], 10: [] };
for (let k = 0; k < 300; k++) {
  const groep = 6, Mtrue = 2 + rnd() * 8, answer = kid(Mtrue), s = L.newSkill(groep); let ms = 700, streak = 0;
  if (process.env.CHECK) { const seen = []; for (let i = 0; i < 20; i++) { const it = L.pickInformative(s, all.concat(non), rnd, seen); seen.push(it.w); L.update(s, it.d, answer(it, L.TASK.check), L.TASK.check); } if (res.c) { res.c.push(Math.abs(L.mastery(s) - Mtrue)); const iv = L.interval(s); cov.c.push(Mtrue >= iv[0] && Mtrue <= iv[1]); } }
  for (let day = 1; day <= 10; day++) {
    const near = (pool, n) => pool.slice().sort((a, b) => Math.abs(a.d - L.mastery(s)) - Math.abs(b.d - L.mastery(s)) + (rnd() - .5) * 2).slice(0, n);
    near(all.filter(x => E.syllables(x.w).length >= 2), 6).forEach(it => L.update(s, it.d, answer(it, L.TASK.hak), L.TASK.hak));
    near(all, 7).concat(near(non, 3)).forEach(it => { const t = L.flashTask(ms), x = answer(it, t); L.update(s, it.d, x, t); if (x) { if (++streak >= 2) { ms = Math.max(120, ms * .85); streak = 0; } } else { streak = 0; ms = Math.min(2500, ms * 1.2); } });
    if (day % 2 === 0) near(all, 40).forEach(it => L.update(s, it.d, answer(it, L.TASK.luid), L.TASK.luid));
    if (res[day]) { res[day].push(Math.abs(L.mastery(s) - Mtrue)); const iv = L.interval(s); cov[day].push(Mtrue >= iv[0] && Mtrue <= iv[1]); }
  }
}
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
if (res.c.length) console.log(`na de niveaucheck (20 woorden): fout mediaan ${med(res.c).toFixed(2)} stap (${(med(res.c) * 5).toFixed(0)} schoolmaanden), 80%-marge klopt ${Math.round(100 * cov.c.filter(Boolean).length / cov.c.length)}%`);
for (const d of [1, 3, 10]) console.log(`na ${d} ${d === 1 ? 'dag' : 'dagen'}: fout mediaan ${med(res[d]).toFixed(2)} stap (${(med(res[d]) * 5).toFixed(0)} schoolmaanden), 80%-marge klopt ${Math.round(100 * cov[d].filter(Boolean).length / cov[d].length)}%`);
