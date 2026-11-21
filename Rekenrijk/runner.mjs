/* Rekenleger als renspel: je leger rent over de weg. Boven verschijnt een som,
   op de weg staan drie poorten met antwoorden. Stuur naar het goede antwoord.
   Daartussen: tonnen met +/× en groepjes vijanden. Aan het eind de eindbaas.
   Puur spelregels; tekenen en besturen zit in leger-stage.mjs en leger-ui.mjs. */
import { scaleFor, gateOptions, gearValue, POWERS, powerFor, RARITY_POWER, HEARTS } from './leger.mjs';

export const QUESTIONS = 12;

/* De weg: een rij gebeurtenissen. q = som, g = ton-poort, e = vijanden, c = munten, b = eindbaas. */
export function makeTrack(n, groep) {
  const s = scaleFor(groep), L = Math.max(1, Math.min(30, n));
  const per = s * (3 + Math.floor((L - 1) / 4));
  const out = [];
  for (let i = 0; i < QUESTIONS; i++) {
    out.push({ t: 'q' });
    if (i % 2 === 0) out.push({ t: 'c', n: 3 });
    if (i === 2 || i === 6 || i === 9) out.push({ t: 'g' });
    if (i === 3 || i === 7 || i === 10) { const k = i === 3 ? 1 : i === 7 ? 2 : 3; out.push({ t: 'e', n: Math.round(s * (2 + L * 1.05) * k + per * k * 1.35) }); }
  }
  out.push({ t: 'b' });
  return { per, scale: s, boss: Math.round(s * (6 + L * 4.6)), bossQ: 3, bossHit: Math.round(per * 1.5), events: out };
}

export function newRun(n, groep, leaders, gear = {}) {
  const tr = makeTrack(n, groep), sc = tr.scale;
  tr.per += gearValue('zwaard', gear.zwaard, sc);
  tr.archers = gearValue('boog', gear.boog, sc);
  tr.boss = Math.max(3 * sc, tr.boss - gearValue('kanon', gear.kanon, sc));
  const power = leaders.reduce((a, l) => a + (RARITY_POWER[l.rarity] || 1), 0);
  const start = power * sc * 2 + gearValue('schild', gear.schild, sc);
  const hearts = HEARTS + gearValue('muur', gear.muur, sc);
  return {
    n: Math.max(1, Math.min(30, n)), groep, plan: { scale: sc, perSum: tr.per, bossHit: tr.bossHit, archers: tr.archers }, track: tr, i: 0,
    leaders: leaders.map(l => ({ id: l.id, group: l.group, rarity: l.rarity, used: false })), teamPower: power,
    army: start, startArmy: start, hearts, maxHearts: hearts, correct: 0, wrong: 0, coins: 0, wavesWon: 0, extraEnemies: 0,
    boss: tr.boss, bossLeft: tr.boss, bossQ: 0, phase: 'run', done: false, won: false,
    fx: { shield: false, mirror: false, spell: false, song: false, waveCut: 0, skip: false, hint: false }
  };
}
export const current = run => run.track.events[run.i];

/* Een som met drie antwoorden: het goede en twee die erop lijken. */
export function choices(answer, r = Math.random) {
  const a = answer, cand = [a + 1, a - 1, a + 2, a - 2, a + 10, a - 10, a + 5, Number(String(a).split('').reverse().join(''))]
    .filter(x => Number.isInteger(x) && x >= 0 && x !== a);
  const pick = [...new Set(cand)].sort(() => r() - .5).slice(0, 2);
  while (pick.length < 2) pick.push(a + pick.length + 3);
  const all = [a, ...pick].sort(() => r() - .5);
  return { options: all, right: all.indexOf(a) };
}

export function answer(run, ok) {
  let gain = 0;
  if (run.phase === 'boss') {
    if (ok) { run.bossLeft = Math.max(0, run.bossLeft - run.plan.bossHit); run.correct++; run.coins++; }
    else if (run.fx.shield) run.fx.shield = false; else run.wrong++;
    run.bossQ++;
    return { gain: 0, boss: true };
  }
  if (ok) { gain = run.plan.perSum; if (run.fx.mirror) { gain *= 2; run.fx.mirror = false; } run.army += gain; run.correct++; run.coins++; }
  else if (run.fx.shield) run.fx.shield = false;
  else { run.wrong++; const loss = Math.min(run.army, Math.ceil(run.plan.perSum / 2)); run.army -= loss; run.extraEnemies += Math.ceil(run.plan.perSum / 2); gain = -loss; }
  run.i++;
  return { gain };
}
export function gate(run, opt) {
  let res = opt.result;
  if (run.fx.spell) { if (res > run.army) res += res - run.army; run.fx.spell = false; }
  const before = run.army; run.army = Math.max(0, res); run.i++;
  return { before, after: run.army, best: opt.best };
}
export const gates = (run, r) => gateOptions(run.army, run.groep, r);
export function coins(run, n) { run.coins += n; run.i++; }

/* Vijanden op de weg: jouw ridders min hun ridders. */
export function squadSize(run, ev = current(run)) { return Math.max(0, ev.n + run.extraEnemies - run.fx.waveCut - (run.plan.archers || 0)); }
export function clash(run) {
  const ev = current(run), enemies = squadSize(run, ev), mine = run.army * (run.fx.song ? 2 : 1);
  let res;
  if (run.fx.skip) res = { enemies, mine: run.army, left: run.army, won: true, skipped: true };
  else if (mine > enemies) res = { enemies, mine, left: run.fx.song ? Math.ceil((mine - enemies) / 2) : mine - enemies, won: true };
  else { run.hearts--; res = { enemies, mine, left: Math.max(2, Math.ceil(run.startArmy / 2)), won: false }; }
  run.army = res.left; if (res.won) run.wavesWon++;
  run.fx.song = false; run.fx.skip = false; run.fx.waveCut = 0; run.extraEnemies = 0;
  run.i++;
  if (run.hearts <= 0) { run.done = true; run.won = false; run.phase = 'end'; }
  return res;
}
export function startBoss(run) { run.phase = 'boss'; }
export function finalFight(run) {
  const mine = run.army, need = run.bossLeft, won = mine > need;
  run.done = true; run.won = won; run.phase = 'end'; run.army = won ? mine - need : 0;
  run.finalRes = { mine, need, won };
  return run.finalRes;
}
export function stars(run) {
  if (!run.won) return 0;
  if (run.wrong <= 1 && run.hearts >= run.maxHearts) return 3;
  if (run.wrong <= 3) return 2;
  return 1;
}
export const coinsFor = run => run.coins + 5 * stars(run) + (run.won ? 5 : 0);

/* Krachten werken ook tijdens het rennen. Krachten 'voor het gevecht' gelden voor de volgende vijanden. */
export function canUse(run, l) {
  if (!l || l.used || run.done) return false;
  const p = powerFor(l.group);
  if ((p.id === 'rocket' || p.id === 'dream')) return run.bossLeft > 0;
  return true;
}
export function nextSquad(run) { for (let k = run.i; k < run.track.events.length; k++) if (run.track.events[k].t === 'e') return run.track.events[k]; return null; }
export function usePower(run, l) {
  if (!canUse(run, l)) return null;
  const p = powerFor(l.group), a = run.army, sc = run.plan.scale; let msg = '';
  const sq = nextSquad(run), e = sq ? squadSize(run, sq) : 0;
  const cut = c => { run.fx.waveCut += c; return `${e} − ${c} = ${e - c} vijanden straks`; };
  switch (p.id) {
    case 'extra5': run.army += 5 * sc; msg = `${a} + ${5 * sc} = ${run.army} ridders`; break;
    case 'dino10': run.army += 10 * sc; msg = `${a} + ${10 * sc} = ${run.army} ridders`; break;
    case 'candy': run.army += run.correct; msg = `${a} + ${run.correct} = ${run.army} ridders`; break;
    case 'double': run.army *= 2; msg = `${a} × 2 = ${run.army} ridders`; break;
    case 'chest': run.army += 3 * run.hearts * sc; msg = `${a} + ${run.hearts} × ${3 * sc} = ${run.army} ridders`; break;
    case 'harvest': run.army += 2 * run.correct * sc; msg = `${a} + ${run.correct} × ${2 * sc} = ${run.army} ridders`; break;
    case 'heal': run.hearts = Math.min(run.maxHearts + 1, run.hearts + 1); msg = `Je hebt nu ${run.hearts} harten`; break;
    case 'shield': run.fx.shield = true; msg = 'Je volgende fout telt niet mee'; break;
    case 'mirror': run.fx.mirror = true; msg = 'Je volgende goede som telt dubbel'; break;
    case 'spell': run.fx.spell = true; msg = 'De volgende ton telt dubbel'; break;
    case 'song': run.fx.song = true; msg = 'In het volgende gevecht telt elke ridder dubbel'; break;
    case 'skip': run.fx.skip = true; msg = 'De volgende vijanden vliegen over je heen'; break;
    case 'hint': run.fx.hint = true; msg = 'Het goede antwoord gaat straks even glimmen'; break;
    case 'wave5': msg = sq ? cut(Math.min(e, 5 * sc)) : 'Geen vijanden meer'; break;
    case 'fire10': msg = sq ? cut(Math.min(e, 10 * sc)) : 'Geen vijanden meer'; break;
    case 'freeze': msg = sq ? cut(Math.floor(e / 2)) : 'Geen vijanden meer'; break;
    case 'scare': msg = sq ? cut(Math.floor(e / 3)) : 'Geen vijanden meer'; break;
    case 'roar': msg = sq ? cut(Math.floor(e / 4)) : 'Geen vijanden meer'; break;
    case 'rocket': { const b = run.bossLeft, c = Math.min(b, 10 * sc); run.bossLeft -= c; msg = `Eindbaas: ${b} − ${c} = ${run.bossLeft} levens`; break; }
    case 'dream': { const b = run.bossLeft, c = Math.floor(b / 4); run.bossLeft -= c; msg = `Eindbaas: ${b} − ${c} = ${run.bossLeft} levens`; break; }
  }
  l.used = true;
  return { power: p, msg };
}
export { POWERS, powerFor };
