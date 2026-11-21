// Balans: speel duizenden levels met gesimuleerde kinderen en kijk hoe vaak ze winnen en hoeveel sterren ze halen.
import * as LG from '../../leger.mjs';
const KIDS = { sterk: { p: .95, hard: .5, gate: .95 }, gemiddeld: { p: .85, hard: .25, gate: .8 }, zwak: { p: .65, hard: .05, gate: .6 } };
const team = [{ id: 0, group: 0, rarity: 'common' }, { id: 1, group: 14, rarity: 'common' }, { id: 2, group: 4, rarity: 'rare' }];
function play(n, groep, kid, powers, r = Math.random) {
  const run = LG.newRun(n, groep, team);
  while (!run.done) {
    if (powers) for (const l of run.leaders) if (LG.canUse(run, l) && r() < .3) LG.usePower(run, l);
    if (run.phase === 'recruit') { const hard = r() < kid.hard; LG.answerRecruit(run, r() < (hard ? kid.p - .1 : kid.p), hard); }
    else if (run.phase === 'gate') { const o = LG.gateOptions(run.army, groep, r); const pick = r() < kid.gate ? o.find(x => x.best) : o.find(x => !x.best); LG.chooseGate(run, pick); }
    else if (run.phase === 'battle') LG.battle(run);
    else if (run.phase === 'boss') LG.answerBoss(run, r() < kid.p);
  }
  return run;
}
const N = 3000, out = [];
for (const groep of [3, 6]) for (const n of [1, 3, 10, 20, 30]) for (const [name, kid] of Object.entries(KIDS)) for (const powers of [true]) {
  let win = 0, st = [0, 0, 0, 0], army = 0, sums = 0;
  for (let i = 0; i < N; i++) { const r = play(n, groep, kid, powers); if (r.won) win++; st[LG.stars(r)]++; army += r.army; sums += r.correct + r.wrong; }
  out.push(`groep ${groep} level ${String(n).padStart(2)} ${name.padEnd(9)} ${powers ? 'krachten' : 'zonder  '}  winst ${String(Math.round(100 * win / N)).padStart(3)}%  sterren 1/2/3: ${st.slice(1).map(x => Math.round(100 * x / N) + '%').join(' / ')}  sommen ${Math.round(sums / N)}`);
}
console.log(out.join('\n'));
