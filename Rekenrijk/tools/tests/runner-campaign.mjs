// Balans van het renspel: hele campagne met munten en smederij, per soort kind.
import * as RN from '../../runner.mjs';
import * as LG from '../../leger.mjs';
const KIDS = { sterk: { p: .95, gate: .95 }, gemiddeld: { p: .85, gate: .8 }, zwak: { p: .7, gate: .6 } };
const team = [{ id: 0, group: 0, rarity: 'common' }, { id: 1, group: 14, rarity: 'common' }, { id: 2, group: 4, rarity: 'rare' }];
export function play(n, groep, kid, gear, r = Math.random) {
  const run = RN.newRun(n, groep, team, gear);
  while (!run.done) {
    for (const l of run.leaders) if (RN.canUse(run, l) && r() < .15) RN.usePower(run, l);
    const ev = RN.current(run);
    if (run.phase === 'boss') { if (run.bossQ < run.track.bossQ) RN.answer(run, r() < kid.p); else RN.finalFight(run); continue; }
    if (ev.t === 'q') RN.answer(run, r() < kid.p);
    else if (ev.t === 'g') { const o = RN.gates(run, r); RN.gate(run, r() < kid.gate ? o.find(x => x.best) : o.find(x => !x.best)); }
    else if (ev.t === 'c') RN.coins(run, r() < .7 ? ev.n : 0);
    else if (ev.t === 'e') RN.clash(run);
    else if (ev.t === 'b') RN.startBoss(run);
  }
  return run;
}
const cheapest = d => LG.GEAR.map(g => ({ id: g.id, c: g.cost[d.gear[g.id] || 0] })).filter(x => x.c !== undefined).sort((a, b) => a.c - b.c)[0];
for (const groep of [3, 6]) for (const [name, kid] of Object.entries(KIDS)) {
  const T = 300, first = Array(31).fill(0), st = Array(31).fill(0);
  for (let t = 0; t < T; t++) {
    const d = LG.cleanLeger({});
    for (let n = 1; n <= 30; n++) {
      let k = 0, run;
      do { run = play(n, groep, kid, d.gear); d.coins += RN.coinsFor(run); k++; let c; while ((c = cheapest(d)) && d.coins >= c.c) LG.buy(d, c.id); } while (!run.won && k < 8);
      if (k === 1) first[n]++; st[n] += RN.stars(run);
      if (!run.won) break;
    }
  }
  console.log(`groep ${groep} ${name.padEnd(9)} 1e poging: ` + [1, 3, 5, 10, 15, 20, 25, 30].map(n => `L${n}:${Math.round(100 * first[n] / T)}%`).join(' ') + `  sterren L1:${(st[1] / T).toFixed(1)} L10:${(st[10] / T).toFixed(1)}`);
}
