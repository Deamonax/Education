/* Rekenleger: bouw met sommen een leger ridders, versla 10 golven en daarna de eindbaas.
   Dit bestand is puur spelregels (geen scherm), zodat het te testen en te balanceren is.
   Rekenen is het spel zelf: goede sommen werven ridders, poorten zijn een rekenkeuze,
   en elk gevecht is een minsom (jouw ridders min hun ridders). */

export const WAVES = 10, HEARTS = 3, LEVELS = 30;

/* Getallen passen bij de groep: groep 3-4 blijft onder de 100, groep 5 en hoger wordt groter. */
export const scaleFor = groep => groep <= 3 ? 1 : groep === 4 ? 2 : groep === 5 ? 3 : 5;
export const sumTypes = groep => groep <= 3 ? ['plus', 'minus'] : groep === 4 ? ['plus', 'minus', 'times'] : ['plus', 'minus', 'times', 'divide'];

/* Kracht per vriendje: gewoon 1, zeldzaam 2, geheim 3. */
export const RARITY_POWER = { common: 1, rare: 2, secret: 3 };

/* Elke familie heeft een eigen kracht die je één keer per level mag inzetten. */
export const POWERS = [
  { id: 'extra5', name: 'Versterking', text: '+5 ridders erbij.', when: 'any' },
  { id: 'hint', name: 'Fluistertip', text: 'Een tip bij de som die je nu maakt.', when: 'sum' },
  { id: 'wave5', name: 'Vloedgolf', text: 'Deze golf heeft 5 vijanden minder.', when: 'battle' },
  { id: 'skip', name: 'Wolkendek', text: 'Deze golf vliegt over je heen: geen gevecht.', when: 'battle' },
  { id: 'fire10', name: 'Vuurbal', text: '10 vijanden minder in deze golf.', when: 'battle' },
  { id: 'freeze', name: 'Bevriezen', text: 'De helft van deze golf bevriest en doet niet mee.', when: 'battle' },
  { id: 'candy', name: 'Snoepregen', text: '+1 ridder voor elke goede som tot nu toe.', when: 'any' },
  { id: 'rocket', name: 'Raket', text: 'De eindbaas verliest 10 levens.', when: 'any' },
  { id: 'dino10', name: 'Dinostamp', text: '+10 ridders erbij.', when: 'any' },
  { id: 'shield', name: 'Schild', text: 'Je volgende fout telt niet mee.', when: 'any' },
  { id: 'heal', name: 'Genezen', text: '+1 kasteelhart.', when: 'any' },
  { id: 'mirror', name: 'Kristalspiegel', text: 'Je volgende goede som geeft dubbel zoveel ridders.', when: 'any' },
  { id: 'scare', name: 'Spookschrik', text: 'Een derde van deze golf rent weg.', when: 'battle' },
  { id: 'roar', name: 'Brul', text: 'Een kwart van deze golf schrikt en rent weg.', when: 'battle' },
  { id: 'double', name: 'Verdubbelaar', text: 'Je leger wordt twee keer zo groot.', when: 'any' },
  { id: 'chest', name: 'Schatkist', text: '+3 ridders voor elk kasteelhart.', when: 'any' },
  { id: 'spell', name: 'Toverspreuk', text: 'De volgende poort telt dubbel.', when: 'any' },
  { id: 'harvest', name: 'Oogst', text: '+2 ridders voor elke golf die je al won.', when: 'any' },
  { id: 'song', name: 'Strijdlied', text: 'In dit gevecht telt elke ridder dubbel.', when: 'battle' },
  { id: 'dream', name: 'Droomslaap', text: 'De eindbaas verliest een kwart van zijn levens.', when: 'any' }
];
export const powerFor = group => POWERS[group % POWERS.length];

/* ---------- de smederij: met munten koop je betere spullen, zodat de sommen niet moeilijker hoeven ---------- */
export const GEAR = [
  { id: 'zwaard', name: 'Scherpe zwaarden', icon: '⚔️', text: n => `Elke goede som geeft ${n} ${n === 1 ? 'ridder' : 'ridders'} extra.`, cost: [15, 30, 50, 80, 120] },
  { id: 'boog', name: 'Boogschutters', icon: '🏹', text: n => `Voor elk gevecht schieten ze ${n} vijanden weg.`, cost: [20, 40, 70, 110, 160] },
  { id: 'schild', name: 'Schildwacht', icon: '🛡️', text: n => `Je begint met ${n} ridders extra.`, cost: [10, 25, 45, 70, 100] },
  { id: 'kanon', name: 'Kanon', icon: '💣', text: n => `De eindbaas begint met ${n} levens minder.`, cost: [25, 50, 90, 140, 200] },
  { id: 'muur', name: 'Stenen muur', icon: '🧱', text: n => `${n} extra ${n === 1 ? 'kasteelhart' : 'kasteelharten'}.`, cost: [60, 150] }
];
// wat een stuk uitrusting op niveau k oplevert, in ridders of vijanden (met de schaal van de groep)
export function gearValue(id, k, scale) {
  if (!k) return 0;
  return { zwaard: k * scale, boog: 2 * k * scale, schild: 5 * k * scale, kanon: 6 * k * scale, muur: k }[id] || 0;
}
export function buy(leger, id) {
  const g = GEAR.find(x => x.id === id); if (!g) return false;
  const k = leger.gear[id] || 0, cost = g.cost[k];
  if (cost === undefined || leger.coins < cost) return false;
  leger.coins -= cost; leger.gear[id] = k + 1; return true;
}
export const coinsFor = run => run.correct + 5 * stars(run) + (run.won ? 5 : 0);

/* ---------- level-opbouw ---------- */
// Vijanden per golf groeien met het level en binnen het level. Getallen zijn in 'eenheden' en worden met de schaal vermenigvuldigd.
export function levelPlan(n, groep) {
  const s = scaleFor(groep), L = Math.max(1, Math.min(LEVELS, n));
  const perSum = s * (3 + Math.floor((L - 1) / 4));           // ridders voor een gewone goede som
  // latere levels worden pittiger, maar met betere spullen hou je het bij
  const waves = Array.from({ length: WAVES }, (_, i) => Math.round(s * (2 + L * .8 + i * (1.1 + L * .12))));
  const boss = Math.round(s * (8 + L * 4));
  const gates = [2, 5, 8];                                       // na welke golven (0-telling) een poort komt
  return { n: L, scale: s, perSum, waves, boss, gates, bossSums: 3, bossHit: Math.round(perSum * 1.5) };
}

/* ---------- poorten: kies de poort die meer ridders oplevert ---------- */
export function gateOptions(army, groep, r = Math.random) {
  const s = scaleFor(groep), big = groep >= 5;
  const opts = [];
  const add = k => ({ op: '+', k, label: '+' + k, apply: a => a + k });
  const mul = k => ({ op: '×', k, label: '×' + k, apply: a => a * k });
  const sub = k => ({ op: '−', k, label: '−' + k, apply: a => Math.max(0, a - k) });
  const half = () => ({ op: ':', k: 2, label: ': 2', apply: a => Math.ceil(a / 2) });
  const pool = big
    ? [() => mul(2), () => mul(3), () => add(s * (2 + Math.floor(r() * 6))), () => add(s * (5 + Math.floor(r() * 8))), () => sub(s * (1 + Math.floor(r() * 4))), () => half()]
    : [() => mul(2), () => add(5 + Math.floor(r() * 6)), () => add(10), () => add(2 + Math.floor(r() * 4)), () => sub(2 + Math.floor(r() * 4))];
  for (let i = 0; i < 30 && opts.length < 2; i++) {
    const g = pool[Math.floor(r() * pool.length)]();
    if (opts.some(o => o.label === g.label)) continue;
    if (opts.length === 1 && opts[0].apply(army) === g.apply(army)) continue; // geen gelijkspel
    opts.push(g);
  }
  if (opts.length < 2) opts.push(add(s * 3));
  const best = opts[0].apply(army) >= opts[1].apply(army) ? 0 : 1;
  return opts.map((o, i) => ({ op: o.op, k: o.k, label: o.label, result: o.apply(army), best: i === best }));
}

/* ---------- een level spelen (toestand) ---------- */
export function newRun(n, groep, leaders, gear = {}) {
  const plan = levelPlan(n, groep), sc = plan.scale;
  plan.perSum += gearValue('zwaard', gear.zwaard, sc); plan.archers = gearValue('boog', gear.boog, sc);
  plan.boss = Math.max(3 * sc, plan.boss - gearValue('kanon', gear.kanon, sc));
  const power = leaders.reduce((a, l) => a + (RARITY_POWER[l.rarity] || 1), 0);
  return {
    n: plan.n, groep, plan, leaders: leaders.map(l => ({ id: l.id, group: l.group, rarity: l.rarity, used: false })),
    army: power * sc * 2 + gearValue('schild', gear.schild, sc), startArmy: power * sc * 2 + gearValue('schild', gear.schild, sc), teamPower: power,
    hearts: HEARTS + gearValue('muur', gear.muur, sc), maxHearts: HEARTS + gearValue('muur', gear.muur, sc), wave: 0, phase: 'recruit', sumIn: 0, correct: 0, wrong: 0, wavesWon: 0,
    boss: plan.boss, bossLeft: plan.boss, bossSum: 0,
    extraEnemies: 0, fx: { shield: false, mirror: false, spell: false, song: false, waveCut: 0, skip: false },
    log: [], done: false, won: false, gate: null
  };
}

export const SUMS_PER_WAVE = 2;

/* Een goed of fout antwoord op een wervingssom. hard = de kind koos de lastige kaart. */
export function answerRecruit(run, ok, hard) {
  let gain = 0;
  if (ok) {
    gain = run.plan.perSum * (hard ? 2 : 1);
    if (run.fx.mirror) { gain *= 2; run.fx.mirror = false; }
    run.army += gain; run.correct++;
  } else if (run.fx.shield) { run.fx.shield = false; } else { run.wrong++; run.extraEnemies += Math.ceil(run.plan.perSum / 2); }
  run.sumIn++;
  if (run.sumIn >= SUMS_PER_WAVE) { run.sumIn = 0; run.phase = run.plan.gates.includes(run.wave) ? 'gate' : 'battle'; }
  return gain;
}

export function chooseGate(run, opt) {
  let res = opt.result;
  if (run.fx.spell) { if (res > run.army) res += res - run.army; run.fx.spell = false; }
  const before = run.army; run.army = Math.max(0, res); run.phase = 'battle';
  return { before, after: run.army, best: opt.best };
}

export function enemiesNow(run) {
  let e = run.plan.waves[run.wave] + run.extraEnemies - run.fx.waveCut - (run.plan.archers || 0);
  return Math.max(0, e);
}

/* Het gevecht: jouw ridders min hun ridders. Wie overblijft, gaat door. */
export function battle(run) {
  const enemies = enemiesNow(run), mine = run.army * (run.fx.song ? 2 : 1);
  let result;
  if (run.fx.skip) result = { enemies, mine, left: run.army, won: true, skipped: true };
  else if (mine > enemies) { const left = run.fx.song ? Math.ceil((mine - enemies) / 2) : mine - enemies; result = { enemies, mine, left, won: true }; run.army = left; }
  else { result = { enemies, mine, left: 0, won: false }; run.army = 0; run.hearts--; }
  if (result.won) run.wavesWon++;
  run.fx.song = false; run.fx.skip = false; run.fx.waveCut = 0; run.extraEnemies = 0;
  run.log.push(result);
  run.wave++;
  if (run.hearts <= 0) { run.done = true; run.won = false; run.phase = 'end'; }
  else run.phase = run.wave >= WAVES ? 'boss' : 'recruit';
  return result;
}

/* Eindbaas: drie extra sommen. Elke goede som is een aanval; daarna vecht je hele leger. */
export function answerBoss(run, ok) {
  if (ok) { run.bossLeft = Math.max(0, run.bossLeft - run.plan.bossHit); run.correct++; }
  else if (run.fx.shield) run.fx.shield = false; else run.wrong++;
  run.bossSum++;
  if (run.bossSum >= run.plan.bossSums) return finalFight(run);
  return null;
}
export function finalFight(run) {
  const mine = run.army, need = run.bossLeft, won = mine > need;
  run.done = true; run.won = won; run.phase = 'end';
  run.army = won ? mine - need : 0;
  return { mine, need, won };
}

/* Sterren: 1 = eindbaas verslagen, 2 = en hooguit 4 fouten, 3 = en hooguit 1 fout en geen hart kwijt.
   Elke fout maakt de volgende golf ook sterker: te veel fouten en je leger is te klein. */
export function stars(run) {
  if (!run.won) return 0;
  if (run.wrong <= 1 && run.hearts >= (run.maxHearts || HEARTS)) return 3;
  if (run.wrong <= 4) return 2;
  return 1;
}

/* ---------- krachten ---------- */
export function canUse(run, leader) {
  if (!leader || leader.used || run.done) return false;
  const p = powerFor(leader.group);
  if (p.when === 'battle') return run.phase === 'battle';
  if (p.when === 'sum') return run.phase === 'recruit' || run.phase === 'boss';
  if ((p.id === 'rocket' || p.id === 'dream') && run.bossLeft <= 0) return false;
  return true;
}
export function usePower(run, leader) {
  if (!canUse(run, leader)) return null;
  const p = powerFor(leader.group), a = run.army; let msg = '';
  switch (p.id) {
    case 'extra5': run.army += 5 * run.plan.scale; msg = `${a} + ${5 * run.plan.scale} = ${run.army} ridders`; break;
    case 'dino10': run.army += 10 * run.plan.scale; msg = `${a} + ${10 * run.plan.scale} = ${run.army} ridders`; break;
    case 'candy': run.army += run.correct; msg = `${a} + ${run.correct} = ${run.army} ridders`; break;
    case 'double': run.army *= 2; msg = `${a} × 2 = ${run.army} ridders`; break;
    case 'chest': run.army += 3 * run.hearts * run.plan.scale; msg = `${a} + ${run.hearts} × ${3 * run.plan.scale} = ${run.army} ridders`; break;
    case 'harvest': run.army += 2 * run.wavesWon * run.plan.scale; msg = `${a} + ${run.wavesWon} × ${2 * run.plan.scale} = ${run.army} ridders`; break;
    case 'heal': run.hearts = Math.min((run.maxHearts || HEARTS) + 1, run.hearts + 1); msg = `Je hebt nu ${run.hearts} harten`; break;
    case 'shield': run.fx.shield = true; msg = 'Je volgende fout telt niet mee'; break;
    case 'mirror': run.fx.mirror = true; msg = 'Je volgende goede som telt dubbel'; break;
    case 'spell': run.fx.spell = true; msg = 'De volgende poort telt dubbel'; break;
    case 'song': run.fx.song = true; msg = 'Elke ridder telt dubbel in dit gevecht'; break;
    case 'skip': run.fx.skip = true; msg = 'Deze golf vliegt over je heen'; break;
    case 'hint': msg = 'Kijk naar de tip bij je som'; break;
    case 'wave5': { const e = enemiesNow(run), c = Math.min(e, 5 * run.plan.scale); run.fx.waveCut += c; msg = `${e} − ${c} = ${e - c} vijanden`; break; }
    case 'fire10': { const e = enemiesNow(run), c = Math.min(e, 10 * run.plan.scale); run.fx.waveCut += c; msg = `${e} − ${c} = ${e - c} vijanden`; break; }
    case 'freeze': { const e = enemiesNow(run), c = Math.floor(e / 2); run.fx.waveCut += c; msg = `${e} : 2 = ${e - c} vijanden doen nog mee`; break; }
    case 'scare': { const e = enemiesNow(run), c = Math.floor(e / 3); run.fx.waveCut += c; msg = `Een derde van ${e} is ${c}. Er blijven ${e - c} over`; break; }
    case 'roar': { const e = enemiesNow(run), c = Math.floor(e / 4); run.fx.waveCut += c; msg = `Een kwart van ${e} is ${c}. Er blijven ${e - c} over`; break; }
    case 'rocket': { const b = run.bossLeft, c = Math.min(b, 10 * run.plan.scale); run.bossLeft -= c; msg = `Eindbaas: ${b} − ${c} = ${run.bossLeft} levens`; break; }
    case 'dream': { const b = run.bossLeft, c = Math.floor(b / 4); run.bossLeft -= c; msg = `Eindbaas: ${b} − ${c} = ${run.bossLeft} levens`; break; }
  }
  leader.used = true;
  return { power: p, msg };
}

/* ---------- opslag per kind ---------- */
export function cleanLeger(x) {
  const out = { stars: {}, plays: 0, wins: 0, team: [], coins: 0, gear: {} };
  if (!x || typeof x !== 'object') return out;
  if (x.stars && typeof x.stars === 'object') for (const [k, v] of Object.entries(x.stars)) { const n = +k, s = +v; if (n >= 1 && n <= LEVELS && s >= 0 && s <= 3) out.stars[n] = Math.floor(s); }
  out.plays = Math.max(0, x.plays | 0); out.wins = Math.max(0, x.wins | 0); out.coins = Math.max(0, Math.min(1e6, x.coins | 0));
  if (x.gear && typeof x.gear === 'object') for (const g of GEAR) { const k = x.gear[g.id] | 0; if (k > 0) out.gear[g.id] = Math.min(g.cost.length, k); }
  if (Array.isArray(x.team)) out.team = x.team.filter(t => Number.isInteger(t)).slice(0, 3);
  return out;
}
export const unlocked = (leger, n) => n === 1 || (leger.stars[n - 1] || 0) >= 1;
export const totalStars = leger => Object.values(leger.stars).reduce((a, b) => a + b, 0);
