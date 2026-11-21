// Speel de hele campagne (30 levels) zoals een kind: verlies = opnieuw, munten gaan naar de smederij.
import * as LG from '../../leger.mjs';
const KIDS = { sterk: { p: .95, hard: .5, gate: .95 }, gemiddeld: { p: .85, hard: .25, gate: .8 }, zwak: { p: .7, hard: .05, gate: .6 } };
const team = [{ id: 0, group: 0, rarity: 'common' }, { id: 1, group: 14, rarity: 'common' }, { id: 2, group: 4, rarity: 'rare' }];
function play(n, groep, kid, gear) {
  const run = LG.newRun(n, groep, team, gear), r = Math.random;
  while (!run.done) {
    for (const l of run.leaders) if (LG.canUse(run, l) && r() < .3) LG.usePower(run, l);
    if (run.phase === 'recruit') { const hard = r() < kid.hard; LG.answerRecruit(run, r() < (hard ? kid.p - .1 : kid.p), hard); }
    else if (run.phase === 'gate') { const o = LG.gateOptions(run.army, groep, r); LG.chooseGate(run, r() < kid.gate ? o.find(x => x.best) : o.find(x => !x.best)); }
    else if (run.phase === 'battle') LG.battle(run); else if (run.phase === 'boss') LG.answerBoss(run, r() < kid.p);
  }
  return run;
}
const cheapest = d => LG.GEAR.map(g => ({ id: g.id, c: g.cost[d.gear[g.id] || 0] })).filter(x => x.c !== undefined).sort((a, b) => a.c - b.c)[0];
for (const groep of [3, 6]) for (const [name, kid] of Object.entries(KIDS)) {
  const T = 300, tries = Array(31).fill(0), firstWin = Array(31).fill(0);
  for (let t = 0; t < T; t++) {
    const d = LG.cleanLeger({});
    for (let n = 1; n <= 30; n++) {
      let k = 0, run;
      do { run = play(n, groep, kid, d.gear); d.coins += LG.coinsFor(run); k++; let c; while ((c = cheapest(d)) && d.coins >= c.c) LG.buy(d, c.id); } while (!run.won && k < 8);
      tries[n] += k; if (k === 1) firstWin[n]++;
      if (!run.won) break;
    }
  }
  console.log(`groep ${groep} ${name.padEnd(9)} winst bij eerste poging per level: ` + [1, 3, 5, 10, 15, 20, 25, 30].map(n => `L${n}:${Math.round(100 * firstWin[n] / T)}%`).join(' '));
}
