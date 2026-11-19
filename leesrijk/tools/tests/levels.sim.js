// Buitencontrole over alle niveaus: nagebootste lezers van "kan nog niet lezen" tot volwassen.
// Elke lezer doet de niveaucheck zoals de app hem afneemt. Vindt de check het echte niveau, klopt de marge, en worden boven- en ondergrens eerlijk gemeld?
global.window = {};
const L = require('../../level.js'), E = require('../../engine.js'), D = E.data;
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) * Math.SQRT2; };
const sig = x => 1 / (1 + Math.exp(-x));
const seen = {}, pool = [];
const add = (w, pseudo) => { if (!seen[w]) { seen[w] = 1; pool.push({ w, d: L.difficulty(w, pseudo), pseudo }); } };
D.weeks.forEach(w => { (w.words || []).concat(D.pools[w.n] || []).forEach(x => add(x, false)); (w.nonwords || []).forEach(x => add(x, true)); });
(D.bank || []).forEach(x => add(x, false)); (D.bankPseudo || []).forEach(x => add(x, true));
function reader(M) {
  const dev = { een: gauss() * .4, twee: gauss() * .4, drie: gauss() * .4, vier: gauss() * .4, onzin: gauss() * .5 };
  return (it, task) => { if (M < -.5) return rnd() < .25 ? 1 : 0; const th = M + L.OFF + dev[L.structure(it.w, it.pseudo)]; const p = .25 + (1 - .25 - .05) * sig(1.0 * (th - it.d - task.offset * .9)); return rnd() < p ? 1 : 0; };
}
const rows = [];
for (const Mtrue of [-1, .5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 14]) {
  const err = [], cov = [], items = [], flags = { above: 0, below: 0 };
  for (let k = 0; k < 200; k++) {
    const groep = Mtrue < 0 ? 3 : Math.max(3, Math.min(8, 3 + Math.floor((Mtrue - .5) / 2) + (rnd() < .3 ? 1 : 0)));
    const s = L.newSkill(groep), ans = reader(Mtrue), st = { i: 0, seen: [] };
    while (!L.checkDone(st, s)) { const nx = L.checkNext(st, s, pool, groep, rnd); st.seen.push(nx.item.w); L.update(s, nx.item.d, ans(nx.item, nx.task), nx.task); st.i++; }
    const dsc = L.describe(s); items.push(st.i);
    if (dsc.above) flags.above++; else if (dsc.below) flags.below++;
    else { err.push(Math.abs(L.mastery(s) - Mtrue)); const iv = L.interval(s); cov.push(Mtrue >= iv[0] && Mtrue <= iv[1]); }
  }
  const med = a => a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : NaN;
  const lab = Mtrue < 0 ? 'kan nog niet lezen' : Mtrue > 13 ? 'volwassen lezer' : L.levelInfo(Mtrue).label;
  rows.push({ 'echt niveau': lab, 'woorden (mediaan)': med(items), 'fout (maanden)': isNaN(med(err)) ? '-' : Math.round(med(err) * 5), 'marge klopt': cov.length ? Math.round(100 * cov.filter(Boolean).length / cov.length) + '%' : '-', 'boven bereik': Math.round(flags.above / 2) + '%', 'onder bereik': Math.round(flags.below / 2) + '%' });
}
console.table(rows);
