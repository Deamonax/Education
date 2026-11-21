/* Rekenleger: schermen. De spelregels staan in leger.mjs. */
import * as LG from './leger.mjs';
import * as PZ from './puzzles.mjs';
import { createStage } from './leger-stage.mjs';
import * as RN from './runner.mjs';
import { createRunnerGame } from './runner-game.mjs';

const KNIGHT = (cls = '') => `<svg class="lg-knight ${cls}" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 2c5 0 8 4 8 9v6H4v-6c0-5 3-9 8-9z" class="helm"/><rect x="5" y="11" width="14" height="3" rx="1" class="visor"/><path d="M12 2v-1.5" class="plume"/><path d="M4 18h16l-2 9H6z" class="body"/></svg>`;
const BOSS = `<svg class="lg-boss-svg" viewBox="0 0 120 120" aria-hidden="true"><path d="M60 10c28 0 46 22 46 50v30H14V60c0-28 18-50 46-50z" class="helm"/><path d="M22 52h76v12H22z" class="visor"/><circle cx="44" cy="58" r="4" class="eye"/><circle cx="76" cy="58" r="4" class="eye"/><path d="M30 14l-8-12 18 8M90 14l8-12-18 8" class="horn"/><path d="M14 90h92l-8 26H22z" class="body"/></svg>`;

export function createLeger(ctx) {
  const I = ctx.icon, esc = ctx.escape;
  const stage = createStage();
  const game = createRunnerGame({ speak: t => ctx.speak(t), sound: s => ctx.sound(s), record: (q, ok, ms) => ctx.record(q, ok, ms), steps: h => ctx.steps(h), types: () => LG.sumTypes(ctx.user().groep) });
  const srcOf = id => (ctx.petImg(id).match(/src="([^"]+)"/) || [])[1] || '';
  let anim = false;
  let view = 'map', who = null, level = 1, team = [], run = null, q = null, st = null, card = null, last = null, busy = false, gate = null, fx = null, battleRes = null, endRes = null, qStart = 0;

  const user = () => ctx.user();
  const data = () => { const u = user(); u.leger = LG.cleanLeger(u.leger); return u.leger; };
  function sync() { const u = user(); if (u && u.id !== who) { who = u.id; view = 'map'; run = null; } }
  const pets = () => ctx.profile().pets.map(id => ctx.PETS[id]).filter(Boolean);
  const types = () => LG.sumTypes(user().groep);

  /* ---------- kaart ---------- */
  function mapView() {
    const d = data(), tot = LG.totalStars(d);
    const nodes = Array.from({ length: LG.LEVELS }, (_, i) => {
      const n = i + 1, s = d.stars[n] || 0, open = LG.unlocked(d, n), boss = n % 5 === 0;
      return `<button class="lg-node ${open ? '' : 'locked'} ${s ? 'done' : ''} ${boss ? 'big' : ''}" data-action="lg-level" data-n="${n}" ${open ? '' : 'disabled'} aria-label="Level ${n}${open ? `, ${s} van 3 sterren` : ', nog op slot'}"><b>${open ? n : I('lock')}</b><span class="lg-stars">${[1, 2, 3].map(k => `<i class="${k <= s ? 'on' : ''}">★</i>`).join('')}</span></button>`;
    }).join('');
    return `<div class="page-heading"><div><div class="eyebrow">MINI-GAME · ${tot} VAN ${LG.LEVELS * 3} STERREN</div><h1>Rekenleger</h1><p>Elke goede som geeft je ridders. Versla 10 golven en de eindbaas.</p></div></div>
      <section class="lg-how"><div>${KNIGHT()}<span><b>Werven</b>Goede som = nieuwe ridders</span></div><div><span class="lg-gate-mini">×2</span><span><b>Poort</b>Kies de poort met de meeste ridders</span></div><div>${KNIGHT('enemy')}<span><b>Gevecht</b>Jouw ridders min hun ridders</span></div><div><span class="lg-heart">♥</span><span><b>3 harten</b>Te weinig ridders? Dan verlies je een hart</span></div></section>
      <div class="lg-map">${nodes}</div>${shopView()}`;
  }
  function shopView() {
    const d = data(), sc = LG.scaleFor(user().groep);
    return `<section class="lg-shop"><div class="lg-shop-head"><h2>De smederij</h2><b class="lg-coins" aria-label="${d.coins} munten">🪙 ${d.coins}</b></div>
      <p class="lg-intro">Met munten koop je betere spullen. Dan kun je de lastige levels aan, zonder dat de sommen moeilijker worden. Munten verdien je met elke goede som en elke ster.</p>
      <div class="lg-gear">${LG.GEAR.map(g => { const k = d.gear[g.id] || 0, cost = g.cost[k], max = cost === undefined, now = LG.gearValue(g.id, k, sc), nxt = LG.gearValue(g.id, k + 1, sc);
        return `<div class="lg-item"><span class="lg-item-ico" aria-hidden="true">${g.icon}</span><div><b>${g.name}</b><span class="lg-lvl">${Array.from({ length: g.cost.length }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span><small>${k ? 'Nu: ' + g.text(now) : 'Nog niet gekocht.'}${max ? '' : `<br>Straks: ${g.text(nxt)}`}</small></div>${max ? '<span class="lg-max">Maximaal</span>' : `<button class="button ${d.coins >= cost ? 'purple' : 'secondary'}" data-action="lg-buy" data-id="${g.id}" ${d.coins >= cost ? '' : 'disabled'}>🪙 ${cost}</button>`}</div>`; }).join('')}</div></section>`;
  }

  /* ---------- team kiezen ---------- */
  function teamView() {
    const all = pets(), sel = team.map(id => ctx.PETS[id]).filter(Boolean);
    const power = sel.reduce((a, p) => a + (LG.RARITY_POWER[p.rarity] || 1), 0), plan = LG.levelPlan(level, user().groep);
    return `<div class="lg-top"><button class="quiet" data-action="lg-map">${I('back')} <span>Kaart</span></button><h1>Level ${level}: kies je 3 aanvoerders</h1></div>
      <p class="lg-intro">Elk vriendje heeft een eigen kracht. Zeldzame vriendjes zijn sterker. ${all.length < 3 ? 'Je hebt nog niet zoveel vriendjes, dus een vriendje mag vaker meedoen.' : ''}</p>
      <div class="lg-team-sel">${[0, 1, 2].map(i => { const p = sel[i]; return p ? `<button class="lg-leader on" data-action="lg-unpick" data-i="${i}">${ctx.petImg(p.id)}<b>${esc(p.name)}</b><small>${LG.powerFor(p.group).name}</small></button>` : `<div class="lg-leader empty">Plek ${i + 1}</div>`; }).join('')}</div>
      <div class="lg-power-sum">${sel.length ? `Teamkracht: ${sel.map(p => LG.RARITY_POWER[p.rarity] || 1).join(' + ')} = <b>${power}</b>. Je begint met ${power} × ${2 * plan.scale} = <b>${power * 2 * plan.scale} ridders</b>.` : 'Tik op drie vriendjes.'}</div>
      <button class="button purple big" data-action="lg-go" ${sel.length === 3 ? '' : 'disabled'}>${I('play')} Ten strijde!</button>
      <div class="lg-pets">${all.map(p => { const pw = LG.powerFor(p.group); return `<button class="lg-pet ${p.rarity}" data-action="lg-pick" data-id="${p.id}" ${team.includes(p.id) && all.length >= 3 ? 'aria-pressed="true"' : ''}>${ctx.petImg(p.id)}<span><b>${esc(p.name)}</b><small>${esc(ctx.GROUPS[p.group].name)} · ${p.rarity === 'secret' ? 'geheim, kracht 3' : p.rarity === 'rare' ? 'zeldzaam, kracht 2' : 'kracht 1'}</small><em>${pw.name}: ${pw.text}</em></span></button>`; }).join('')}</div>`;
  }

  /* ---------- het leger tekenen: 100 = kasteelvlag, 10 = vaandel, 1 = ridder ---------- */
  function armyHtml(n, enemy = false) {
    const h = Math.floor(n / 100), t = Math.floor(n % 100 / 10), o = n % 10, lead = run.leaders;
    const face = i => enemy ? '' : ctx.petImg(lead[i % lead.length].id);
    return `<div class="lg-army ${enemy ? 'enemy' : ''}" role="img" aria-label="${n} ${enemy ? 'vijanden' : 'ridders'}">${Array.from({ length: Math.min(h, 9) }, (_, i) => `<span class="lg-flag hundred">${face(i)}<b>100</b></span>`).join('')}${Array.from({ length: t }, (_, i) => `<span class="lg-flag">${face(i)}<b>10</b></span>`).join('')}${Array.from({ length: o }, () => KNIGHT(enemy ? 'enemy' : '')).join('')}${n === 0 ? '<span class="lg-none">niemand</span>' : ''}</div>`;
  }
  function hud() {
    const w = Math.min(run.wave, LG.WAVES);
    return `<div class="lg-hud"><button class="quiet" data-action="lg-quit">${I('back')} <span>Stop</span></button>
      <div class="lg-waves" aria-label="Golf ${w + 1} van ${LG.WAVES}">${Array.from({ length: LG.WAVES }, (_, i) => `<i class="${i < run.wave ? (run.log[i]?.won ? 'won' : 'lost') : i === run.wave && run.phase !== 'boss' ? 'now' : ''}"></i>`).join('')}<i class="boss ${run.phase === 'boss' || run.phase === 'end' ? 'now' : ''}">👑</i></div>
      <span class="lg-hearts" aria-label="${run.hearts} harten">${Array.from({ length: Math.max(run.maxHearts || LG.HEARTS, run.hearts) }, (_, i) => `<i class="${i < run.hearts ? 'on' : ''}">♥</i>`).join('')}</span></div>
      <div class="lg-stage-slot" id="lg-stage-slot" aria-label="Jouw leger: ${run.army} ridders"></div>
      <div class="lg-powers">${run.leaders.map((l, i) => { const p = LG.powerFor(l.group), ok = LG.canUse(run, l); return `<button class="lg-pow ${l.used ? 'used' : ''}" data-action="lg-power" data-i="${i}" ${ok ? '' : 'disabled'} title="${esc(p.text)}">${ctx.petImg(l.id)}<span><b>${p.name}</b><small>${l.used ? 'gebruikt' : esc(p.text)}</small></span></button>`; }).join('')}</div>
      ${fx ? `<div class="lg-fx" role="status">${I('sparkles')} <b>${fx.power.name}!</b> ${fx.msg}</div>` : ''}`;
  }

  /* ---------- werven ---------- */
  function newSum(hard) {
    const steps = ctx.steps(hard), t = types();
    let nq; for (let i = 0; i < 8; i++) { nq = PZ.quickPuzzle(t[Math.floor(Math.random() * t.length)], steps); if (!q || nq.key !== q.key) break; }
    q = nq; st = PZ.newState(q); qStart = performance.now(); last = null;
    ctx.speak(q.spoken);
  }
  function recruitView() {
    const plan = run.plan, label = run.phase === 'boss' ? `Eindbaas-som ${run.bossSum + 1} van ${plan.bossSums}` : `Golf ${run.wave + 1} · werven ${run.sumIn + 1} van ${LG.SUMS_PER_WAVE}`;
    if (run.phase === 'recruit' && !card && !last) return `<section class="lg-panel"><h2>${label}</h2><p>Welke som kies je?</p><div class="lg-cards">
      <button class="lg-card" data-action="lg-card" data-hard="0"><span>Gewone som</span><b>+${plan.perSum}</b><small>ridders</small></button>
      <button class="lg-card hard" data-action="lg-card" data-hard="1"><span>Lastige som</span><b>+${plan.perSum * 2}</b><small>ridders</small></button></div></section>`;
    const leaderHint = run.hintOn ? `<p class="lg-hint">${I('bulb')} ${esc(q.hint || q.explanation)}</p>` : '';
    if (last) return `<section class="lg-panel ${last.ok ? 'good' : 'bad'}"><h2>${last.ok ? (last.boss ? `Raak! De eindbaas verliest ${plan.bossHit} levens` : `Goed! +${last.gain} ridders`) : last.boss ? 'Mis! De eindbaas blijft staan' : 'Helaas, geen nieuwe ridders'}</h2><p>${esc(q.explanation)}</p>${!last.ok && !last.shield && !last.boss ? `<p class="small-note">Door je foutje krijgt de volgende golf ${Math.ceil(plan.perSum / 2)} vijanden extra.</p>` : ''}${last.shield ? '<p class="small-note">Je schild ving deze fout op.</p>' : ''}<button class="button purple big" data-action="lg-next">${run.phase === 'end' ? 'Het laatste gevecht!' : 'Verder'} ${I('arrow')}</button></section>`;
    return `<section class="lg-panel"><h2>${label}${card && card.hard ? ' · lastig' : ''}</h2>${run.phase === 'boss' ? `<p>Elke goede som is een aanval van ${plan.bossHit} op de eindbaas.</p>` : ''}<div class="lg-sum">${PZ.view(q, st)}${PZ.padHtml(q, st)}</div>${leaderHint}<div class="lg-sum-actions"><button class="listen-label" data-action="lg-read">${I('volume')} Lees voor</button><button class="button purple" data-action="pz-check">${I('check')} Kijk na</button></div></section>`;
  }
  function answer() {
    const res = PZ.check(q, st);
    if (!res.complete) { ctx.toast('Vul eerst je antwoord in.'); return; }
    const ms = performance.now() - qStart, shield = !res.ok && run.fx.shield;
    ctx.record(q, res.ok, ms);
    let gain = 0, bossFight = null; const wasBoss = run.phase === 'boss';
    if (run.phase === 'boss') { bossFight = LG.answerBoss(run, res.ok); }
    else gain = LG.answerRecruit(run, res.ok, !!(card && card.hard));
    last = { ok: res.ok, gain, shield, boss: wasBoss };
    run.hintOn = false; card = null; st.locked = true;
    if (res.ok) ctx.sound('correct');
    if (res.ok && gain) stage.recruit(gain); else if (res.ok && wasBoss) stage.hit(run.bossLeft); else stage.say('Mis!', '#ffb4a8');
    ctx.speak(res.ok ? (gain ? `Goed! ${gain} ridders erbij.` : 'Raak!') : `Helaas. ${q.explanation}`);
    if (bossFight) { endRes = bossFight; }
    ctx.save(); ctx.render();
  }
  function next() {
    fx = null;
    if (run.phase === 'end') {
      if (endRes && !endRes.played) { endRes.played = true; anim = true; ctx.render(); stage.final(endRes.mine, endRes.need + 0, endRes.won).then(() => { anim = false; finish(); }); return; }
      finish(); return;
    }
    last = null; battleRes = null;
    if (run.phase === 'boss') newSum(false);
    else if (run.phase === 'battle') stage.preview(LG.enemiesNow(run));
    else if (run.phase === 'gate') { gate = LG.gateOptions(run.army, user().groep); stage.gates(gate); ctx.speak(`Je hebt ${run.army} ridders. Door welke poort ga je? ${gate.map(g => g.label.replace('×', 'keer').replace(':', 'gedeeld door').replace('−', 'min').replace('+', 'plus')).join(' of ')}?`); }
    ctx.render(); window.scrollTo(0, 0);
  }

  /* ---------- poort ---------- */
  function gateView() {
    if (gate.chosen) { const c = gate.chosen, other = gate.find(g => g !== c.opt); return `<section class="lg-panel ${c.best ? 'good' : ''}"><h2>${c.before} ${c.opt.label.replace(':', ':')} = ${c.after} ridders</h2><p>${c.best ? 'Slim gekozen! Dat was de beste poort.' : `De andere poort (${other.label}) had ${other.result} ridders gegeven.`}</p><button class="button purple big" data-action="lg-next">Naar het gevecht ${I('arrow')}</button></section>`; }
    if (anim) return `<section class="lg-panel"><h2>Door de ton!</h2></section>`;
    return `<section class="lg-panel"><h2>Je hebt ${run.army} ridders. Door welke ton?</h2><p>Reken uit welke ton de meeste ridders geeft. Tik op de ton of op de knop.</p><div class="lg-gates">${gate.map((g, i) => `<button class="lg-gate" data-action="lg-gate" data-i="${i}"><b>${g.label}</b></button>`).join('')}</div></section>`;
  }
  /* ---------- gevecht ---------- */
  function battleView() {
    const e = LG.enemiesNow(run);
    if (battleRes) {
      const r = battleRes;
      return `<section class="lg-panel ${r.won ? 'good' : 'bad'}"><h2>${r.skipped ? 'De golf vloog over je heen!' : r.won ? `${r.mine} − ${r.enemies} = ${r.mine - r.enemies}` : `${r.mine} is niet meer dan ${r.enemies}`}</h2><p>${r.skipped ? `Je houdt al je ${r.left} ridders.` : r.won ? `Gewonnen! ${r.left} ridders gaan door.` : `De vijand breekt door je muur. Je verliest een hart${run.hearts > 0 ? `, je hebt er nog ${run.hearts}.` : '.'}`}</p><button class="button purple big" data-action="lg-next">${run.phase === 'end' ? 'Bekijk de uitslag' : run.phase === 'boss' ? 'Naar de eindbaas!' : 'Volgende golf'} ${I('arrow')}</button></section>`;
    }
    if (anim) return `<section class="lg-panel"><h2>${run.log.length && run.wave > 0 && run.log[run.log.length - 1] ? '' : ''}Gevecht!</h2><p>${run.army} tegen ${e}...</p></section>`;
    const ar = run.plan.archers || 0, raw = e + ar;
    return `<section class="lg-panel"><h2>Golf ${run.wave + 1}: ${e} vijanden komen eraan!</h2>${ar ? `<p class="lg-archers">🏹 Je boogschutters schoten er al ${ar} weg: ${raw} − ${ar} = ${e}</p>` : ''}<p>Jij hebt ${run.army} ridders. ${run.army > e ? 'Je bent sterker!' : 'Pas op, zij zijn sterker. Gebruik een kracht?'}</p><button class="button purple big" data-action="lg-fight">⚔️ Ten aanval!</button></section>`;
  }
  /* ---------- eindbaas ---------- */
  function bossView() {
    const pct = Math.round(100 * run.bossLeft / run.boss);
    return `<section class="lg-boss"><div><h2>De eindbaas: ${run.bossLeft} levens</h2><div class="lg-hp"><i style="width:${pct}%"></i></div><p>Jouw ${run.army} ridders moeten méér zijn dan zijn levens.</p></div></section>${recruitView()}`;
  }
  /* ---------- uitslag ---------- */
  function finish() {
    const d = data(), s = (run.track ? RN : LG).stars(run);
    if (run.track) game.stop();
    d.plays++; if (run.won) d.wins++;
    const S = run.track ? RN : LG;
    run.earned = S.coinsFor(run); d.coins += run.earned;
    if (s > (d.stars[run.n] || 0)) d.stars[run.n] = s;
    d.team = team.slice();
    view = 'end'; ctx.save(); ctx.render();
    ctx.speak(run.won ? `Gewonnen! Je haalt ${s} ${s === 1 ? 'ster' : 'sterren'}.` : 'Helaas, de eindbaas was te sterk. Probeer het nog eens!');
  }
  function endView() {
    const s = (run.track ? RN : LG).stars(run), total = run.correct + run.wrong, short = endRes && !endRes.won ? endRes.need - endRes.mine + 1 : 0;
    return `<section class="lg-end ${run.won ? 'won' : 'lost'}"><span class="eyebrow">LEVEL ${run.n}</span><h1>${run.won ? 'Gewonnen!' : 'Net niet...'}</h1>
      <div class="lg-bigstars">${[1, 2, 3].map(k => `<i class="${k <= s ? 'on' : ''}">★</i>`).join('')}</div>
      <p>${run.won ? `Je ${endRes ? endRes.mine : run.army} ridders versloegen de eindbaas.` : run.hearts <= 0 ? 'Je kasteel had geen harten meer.' : `Je had nog ${short} ${short === 1 ? 'ridder' : 'ridders'} meer nodig.`}</p>
      <p class="lg-stats">${run.correct} van de ${total} sommen goed${run.track ? '' : ` · ${run.wavesWon} van de ${LG.WAVES} golven gewonnen`}</p>
      <div class="lg-earn"><b>+${run.earned} 🪙</b><span>${run.track ? run.coins + ' opgeraapt en verdiend' : run.correct + ' voor je goede sommen'}${s ? ` + ${s} × 5 voor je sterren` : ''}${run.won ? ' + 5 voor de winst' : ''}</span></div>
      ${!run.won ? '<p class="small-note">Tip: koop in de smederij betere spullen en probeer het dan nog eens.</p>' : ''}
      <ul class="lg-starrules"><li class="${s >= 1 ? 'on' : ''}">★ Versla de eindbaas</li><li class="${s >= 2 ? 'on' : ''}">★★ En hooguit 4 foutjes</li><li class="${s >= 3 ? 'on' : ''}">★★★ En hooguit 1 foutje, geen hart kwijt</li></ul>
      ${run.won ? `<button class="button yellow big" data-action="lg-egg">🥚 De eindbaas liet een ei achter!</button>` : ''}
      <button class="button ${run.won ? 'secondary' : 'purple big'}" data-action="lg-retry">${I('play')} ${run.won ? 'Nog een keer' : 'Probeer opnieuw'}</button>
      ${run.won && LG.unlocked(data(), run.n + 1) && run.n < LG.LEVELS ? `<button class="button secondary" data-action="lg-nextlevel">Naar level ${run.n + 1} ${I('arrow')}</button>` : ''}
      <button class="text-button" data-action="lg-map">Naar de kaart en de smederij</button></section>`;
  }

  stage.canvas.addEventListener('click', e => { if (!run || run.phase !== 'gate' || !gate || gate.chosen || anim) return; const r = stage.canvas.getBoundingClientRect(); handle({ dataset: { action: 'lg-gate', i: e.clientX - r.left < r.width / 2 ? '0' : '1' } }); });
  function startRun() {
    const g = user().groep;
    run = RN.newRun(level, g, team.map(id => ctx.PETS[id]), data().gear);
    view = 'run'; fx = null; endRes = null;
    const speed = (g <= 3 ? .62 : g === 4 ? .7 : .78) + Math.min(30, level) * .008;
    game.start(run, { team: team.map(id => ({ src: srcOf(id), hue: (ctx.PETS[id].group * 37 + 200) % 360 })), pace: data().pace || (g <= 3 ? 1.15 : 1), onPace: v => { data().pace = Math.round(v * 100) / 100; }, speed, onEnd: () => { endRes = run.finalRes || null; finish(); }, onChange: () => { const el = document.getElementById('lg-army-now'); if (el) el.textContent = run.army; } });
    ctx.render(); window.scrollTo(0, 0);
    ctx.speak(`Level ${level}. Stuur je leger naar het goede antwoord. Veeg of tik naar links of rechts.`);
  }
  function runnerView() {
    queueMicrotask(() => game.mount(document.getElementById('lg-stage-slot')));
    return `<div class="lg-run runner"><div class="lg-run-top"><button class="quiet" data-action="lg-quit">${I('back')} <span>Stop</span></button><b>Level ${run.n}</b><button class="icon-button" data-action="lg-pause" aria-label="Pauze">⏸</button></div>
      <div class="lg-stage-slot big" id="lg-stage-slot"></div>
      <div class="lg-powers">${run.leaders.map((l, i) => { const p = RN.powerFor(l.group), ok = RN.canUse(run, l); return `<button class="lg-pow ${l.used ? 'used' : ''}" data-action="lg-power" data-i="${i}" ${ok ? '' : 'disabled'} title="${esc(p.text)}">${ctx.petImg(l.id)}<span><b>${p.name}</b><small>${l.used ? 'gebruikt' : esc(p.text)}</small></span></button>`; }).join('')}</div>
      ${fx ? `<div class="lg-fx" role="status">${I('sparkles')} <b>${fx.power.name}!</b> ${fx.msg}</div>` : ''}
      <p class="lg-controls">Veeg of tik naar links en rechts, of tik op het antwoord. Toetsenbord: ← →</p></div>`;
  }

  function pickTeamDefaults() {
    const owned = ctx.profile().pets, fav = ctx.profile().favorite;
    const order = [...data().team, fav, ...owned.slice().reverse()].filter(id => owned.includes(id));
    team = [...new Set(order)].slice(0, 3);
    while (team.length < 3) team.push(team[team.length % Math.max(1, team.length)] ?? fav);
  }

  function html() {
    sync();
    if (view === 'map' || !run && view !== 'team') return mapView();
    if (view === 'team') return teamView();
    if (view === 'end') return endView();
    if (run && run.track) return runnerView();
    const body = battleRes ? battleView() : run.phase === 'boss' || run.phase === 'end' || (last && last.boss) ? bossView() : last ? recruitView() : run.phase === 'gate' ? gateView() : run.phase === 'battle' ? battleView() : recruitView();
    queueMicrotask(() => stage.mount(document.getElementById('lg-stage-slot')));
    return `<div class="lg-run">${hud()}${body}</div>`;
  }

  function handle(b) {
    const a = b.dataset.action;
    if (!a) return false;
    if (a.startsWith('pz-')) {
      if (!ctx.isOpen() || !run || !q || st.locked || view !== 'run' || anim) return !!(run && view === 'run');
      if (a === 'pz-check') answer();
      else if (a === 'pz-cell') { st.active = b.dataset.cell; ctx.render(); }
      else if (a === 'pz-key') { if (PZ.input(q, st, b.dataset.k)) ctx.render(); }
      else if (a === 'pz-x') { if (PZ.act(q, st, b.dataset.op, b.dataset.a)) ctx.render(); }
      return true;
    }
    if (!a.startsWith('lg-')) return false;
    switch (a) {
      case 'lg-map': view = 'map'; run = null; ctx.render(); break;
      case 'lg-level': { const n = +b.dataset.n; if (!LG.unlocked(data(), n)) break; level = n; pickTeamDefaults(); view = 'team'; ctx.render(); window.scrollTo(0, 0); break; }
      case 'lg-pick': { const id = +b.dataset.id; if (team.length >= 3) { ctx.toast('Je team is vol. Tik eerst op een aanvoerder om hem te wisselen.'); break; } if (pets().length >= 3 && team.includes(id)) { ctx.toast('Dit vriendje zit al in je team.'); break; } team.push(id); ctx.render(); break; }
      case 'lg-unpick': team.splice(+b.dataset.i, 1); ctx.render(); break;
      case 'lg-go': if (team.length === 3) startRun(); break;
      case 'lg-card': card = { hard: b.dataset.hard === '1' }; newSum(card.hard); ctx.render(); break;
      case 'lg-buy': { const d = data(), g = LG.GEAR.find(x => x.id === b.dataset.id); if (LG.buy(d, b.dataset.id)) { ctx.sound('correct'); ctx.speak(`${g.name} gekocht!`); ctx.save(); ctx.render(); } break; }
      case 'lg-read': if (q) ctx.speak(q.spoken, true); break;
      case 'lg-next': if (!anim) next(); break;
      case 'lg-gate': { if (!gate || gate.chosen || anim) break; const i = +b.dataset.i, opt = gate[i], r = LG.chooseGate(run, opt); anim = true; ctx.render(); stage.choose(i, run.army).then(() => { anim = false; gate.chosen = { ...r, opt }; ctx.sound(r.best ? 'correct' : 'tap'); ctx.speak(r.best ? 'Slim gekozen!' : 'De andere ton was beter.'); ctx.save(); ctx.render(); }); break; }
      case 'lg-fight': { if (anim) break; const res = LG.battle(run); anim = true; ctx.render(); stage.battle(res.mine, res.enemies, res.skipped).then(() => { anim = false; stage.set(run.army); battleRes = res; ctx.sound(res.won ? 'correct' : 'tap'); ctx.speak(res.skipped ? 'De golf vloog over je heen.' : res.won ? `${res.mine} min ${res.enemies} is ${res.mine - res.enemies}. Gewonnen!` : 'Oei, de vijand was sterker. Je verliest een hart.'); ctx.save(); ctx.render(); }); break; }
      case 'lg-power': { if (anim) break; const l = run && run.leaders[+b.dataset.i], res = l && (run.track ? RN : LG).usePower(run, l); if (res && run.track) { fx = res; game.powerUsed(); ctx.sound('correct'); ctx.speak(`${res.power.name}! ${res.msg}`); ctx.render(); break; } if (res) { fx = res; stage.set(run.army); if (run.phase === 'battle') stage.preview(LG.enemiesNow(run)); if (run.bossShown) stage.setBossHp(run.bossLeft); if (res.power.id === 'hint') run.hintOn = true; ctx.sound('correct'); ctx.speak(`${res.power.name}! ${res.msg}`); ctx.render(); } break; }
      case 'lg-quit': game.pause(true); ctx.modal(`<h2>Stoppen met dit level?</h2><p>Je oefenstappen zijn bewaard, maar dit level telt dan niet.</p><button class="button purple" data-action="close">Verder spelen</button><button class="button secondary" data-action="lg-quit-yes">Stoppen</button>`); break;
      case 'lg-quit-yes': ctx.closeModal(); game.stop(); view = 'map'; run = null; ctx.render(); break;
      case 'lg-retry': startRun(); break;
      case 'lg-nextlevel': level = Math.min(LG.LEVELS, run.n + 1); view = 'team'; ctx.render(); break;
      case 'lg-egg': if (run && run.won && !run.egged) { run.egged = true; ctx.egg((run.track ? RN : LG).stars(run)); } break;
      case 'lg-pause': game.pause(!game.paused()); break;
      default: return false;
    }
    return true;
  }
  // voor tests: vul het juiste antwoord in
  if (typeof window !== 'undefined') window.__lg = { game, stage, render: () => ctx.render(), state: () => ({ view, run, q, st, gate, battleRes, last, anim }), solve: () => { if (q && st && !st.locked) { PZ.reveal(q, st); st.locked = false; ctx.render(); } } };
  function onBoss() { if (run && view === 'run' && run.phase === 'boss' && !anim && !battleRes && !run.bossShown) { run.bossShown = true; stage.boss(run.boss, run.bossLeft); }
    if (run && view === 'run' && run.phase === 'boss' && !anim && !battleRes && (!q || st.locked) && !last) newSum(false); }
  return {
    html: () => { onBoss(); return html(); }, handle,
    key: e => { if (run && run.track && view === 'run') { if (game.key(e)) e.preventDefault(); return; } if (!run || !q || !st || st.locked || view !== 'run') return; if (e.key === 'Enter') { e.preventDefault(); answer(); return; } if (PZ.onKey(q, st, e)) ctx.render(); },
    active: () => !!run && view === 'run' && !run.done,
    stop: () => { }
  };
}
