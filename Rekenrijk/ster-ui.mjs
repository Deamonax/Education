/* Rekenster: schermen. Links of rechts: kies steeds het kledingstuk met de meeste likes. */
import * as ST from './ster.mjs';
import { avatar, NAMES, SKINS } from './ster-art.mjs';

const RIVALS = ['Lola', 'Noor', 'Mila', 'Yara', 'Fien', 'Sam', 'Jade', 'Liv'];

export function createSter(ctx) {
  const I = ctx.icon;
  let view = 'home', who = null, shoot = null, level = 1, reveal = null, timer = null, drag = null, rivalName = 'Lola', rivalLook = {}, saved = false, qStart = 0, egged = false;
  const user = () => ctx.user();
  const data = () => { const u = user(); u.ster = ST.cleanSter(u.ster); return u.ster; };
  function sync() { const u = user(); if (u && u.id !== who) { who = u.id; view = 'home'; shoot = null; } }
  const fmt = n => n.toLocaleString('nl-NL');

  /* ---------- start ---------- */
  function home() {
    const d = data(), last = d.looks[d.looks.length - 1];
    const nodes = Array.from({ length: ST.LEVELS }, (_, i) => { const n = i + 1, s = d.stars[n] || 0, open = ST.unlocked(d, n); return `<button class="st-node ${open ? '' : 'locked'} ${s ? 'done' : ''}" data-action="st-level" data-n="${n}" ${open ? '' : 'disabled'} aria-label="Fotoshoot ${n}${open ? `, ${s} sterren` : ', op slot'}"><b>${open ? n : I('lock')}</b><span>${[1, 2, 3].map(k => `<i class="${k <= s ? 'on' : ''}">★</i>`).join('')}</span></button>`; }).join('');
    return `<div class="page-heading"><div><div class="eyebrow">MINI-GAME · LINKS OF RECHTS</div><h1>Rekenster</h1><p>Style je blogger. Elk kledingstuk is een som: kies steeds de kant met de meeste likes en versla je rivaal.</p></div></div>
      <section class="st-profile"><div class="st-me">${avatar(last ? last.outfit : {}, d.skin)}</div><div><span class="eyebrow">JOUW BLOGGER</span><h2>${ST.titleFor(d.followers)}</h2><p class="st-followers"><b>${fmt(d.followers)}</b> volgers</p>
        <div class="st-skins" role="group" aria-label="Huidskleur">${SKINS.map((c, i) => `<button class="${d.skin === i ? 'on' : ''}" style="background:${c}" data-action="st-skin" data-i="${i}" aria-label="Huidskleur ${i + 1}"></button>`).join('')}</div>
        <p class="small-note">Volgende titel: ${(() => { const t = ST.TITLES.find(x => x[0] > d.followers); return t ? `${t[1]} bij ${fmt(t[0])} volgers` : 'je bent een Superster!'; })()}</p></div></section>
      <div class="section-title"><h2>Fotoshoots</h2></div><div class="st-map">${nodes}</div>
      ${d.looks.length ? `<div class="section-title"><h2>Mijn looks</h2></div><div class="st-looks">${d.looks.slice().reverse().map(l => `<div class="st-look">${avatar(l.outfit, d.skin, { cls: 'st-mini' })}<span>${fmt(l.likes)} ❤</span></div>`).join('')}</div>` : ''}`;
  }

  /* ---------- fotoshoot ---------- */
  function start(n) {
    level = n; const steps = ctx.steps();
    shoot = ST.newShoot(n, user().groep, steps); view = 'shoot'; reveal = null; saved = false; egged = false;
    rivalName = RIVALS[Math.floor(Math.random() * RIVALS.length)];
    rivalLook = Object.fromEntries(ST.ROUNDS.map(c => [c, Math.floor(Math.random() * ST.VARIANTS[c])]));
    qStart = performance.now(); ctx.render(); window.scrollTo(0, 0);
    speakRound();
  }
  function speakRound() { const x = shoot.rounds[shoot.i]; if (x) ctx.speak(`${ST.ROUND_NAME[x.cat]}. Links: ${x.left.text.replace('×', 'keer').replace(':', 'gedeeld door').replace('−', 'min')}. Rechts: ${x.right.text.replace('×', 'keer').replace(':', 'gedeeld door').replace('−', 'min')}. Welke geeft meer likes?`); }
  function shootView() {
    const x = shoot.rounds[shoot.i] || shoot.rounds[shoot.rounds.length - 1], d = data();
    const cur = { ...shoot.outfit };
    const r = reveal, rx = r ? r.round : x;
    const card = side => { const e = side ? rx.right : rx.left, look = { ...cur, [rx.cat]: rx.items[side] }, picked = r && r.side === side, better = r && rx.best === side;
      return `<button class="st-card ${side ? 'right' : 'left'} ${r ? (better ? 'better' : 'worse') : ''} ${picked ? 'picked' : ''}" data-action="st-pick" data-side="${side}" ${r ? 'disabled' : ''}>
        <span class="st-arrow">${side ? 'RECHTS ▶' : '◀ LINKS'}</span>${avatar(look, d.skin, { cls: 'st-card-av', label: NAMES[rx.cat][rx.items[side]] })}
        <span class="st-item">${NAMES[rx.cat][rx.items[side]]}</span><b class="st-expr">${e.text}${r ? ` = ${fmt(e.v)}` : ''}</b>${r ? `<span class="st-likes">${fmt(e.v)} ❤</span>` : '<span class="st-likes">? ❤</span>'}</button>`; };
    return `<div class="st-shoot"><div class="st-top"><button class="quiet" data-action="st-quit">${I('back')} <span>Stop</span></button><div class="st-round">${shoot.rounds.map((y, i) => `<i class="${y.choice === null ? (i === shoot.i ? 'now' : '') : y.choice === y.best ? 'good' : 'meh'}"></i>`).join('')}</div><b class="st-count" aria-label="${shoot.likes} likes">❤ ${fmt(shoot.likes)}</b></div>
      <h2 class="st-ask">${ST.ROUND_NAME[rx.cat]}: welke kant geeft de meeste likes?</h2>
      <div class="st-stage" id="st-stage">${card(0)}<div class="st-center">${avatar(cur, d.skin, { cls: 'st-big' })}</div>${card(1)}</div>
      ${r ? `<div class="st-verdict ${r.ok ? 'good' : 'meh'}" role="status"><b>${r.ok ? 'Goed gekozen!' : 'De andere kant had meer likes'}</b> ${fmt(r.got)} ${r.ok ? '>' : '<'} ${fmt(r.other)}<button class="button purple" data-action="st-next">${shoot.done ? 'Naar de fotoshoot!' : 'Volgende'} ${I('arrow')}</button></div>` : '<p class="st-help">Veeg naar links of rechts, tik op een kaart, of gebruik ← →.</p>'}</div>`;
  }
  function pick(side) {
    if (!shoot || reveal || shoot.done && !reveal && shoot.i >= shoot.rounds.length) return;
    const round = shoot.rounds[shoot.i]; const res = ST.choose(shoot, side); if (!res) return;
    const e = round.best ? round.right : round.left;
    ctx.record({ topic: e.topic, kind: 'compare', level: Math.max(1, Math.round(shoot.level / 3)), cells: [{}], key: 'st' + round.left.text + round.right.text }, res.ok, performance.now() - qStart);
    reveal = { round, side, ...res };
    ctx.sound(res.ok ? 'correct' : 'tap'); ctx.speak(res.ok ? `Goed! ${res.got} likes.` : `Oei, de andere kant had ${res.other} likes.`);
    ctx.save(); ctx.render();
    clearTimeout(timer); timer = setTimeout(() => { if (reveal && reveal.round === round && view === 'shoot') next(); }, res.ok ? 2200 : 3600);
  }
  function next() {
    clearTimeout(timer); reveal = null; qStart = performance.now();
    if (shoot.done) { finish(); return; }
    ctx.render(); speakRound();
  }
  /* ---------- uitslag ---------- */
  function finish() {
    const d = data(), s = ST.stars(shoot), win = ST.won(shoot);
    if (s > (d.stars[shoot.level] || 0)) d.stars[shoot.level] = s;
    shoot.gained = ST.followersFor(shoot); d.followers += shoot.gained;
    view = 'result'; ctx.save(); ctx.render(); window.scrollTo(0, 0);
    ctx.speak(win ? `Je foto heeft ${shoot.likes} likes. Dat is meer dan ${rivalName}. Je wint!` : `Je foto heeft ${shoot.likes} likes. ${rivalName} heeft er ${shoot.rival}. Bijna!`);
  }
  function resultView() {
    const d = data(), s = ST.stars(shoot), win = ST.won(shoot);
    return `<section class="st-result ${win ? 'won' : ''}"><span class="eyebrow">FOTOSHOOT ${shoot.level}</span><h1>${win ? 'Jij bent de ster!' : 'Net niet...'}</h1>
      <div class="st-duel"><figure class="st-photo me">${avatar(shoot.outfit, d.skin, { cls: 'st-photo-av' })}<figcaption><b>Jij</b><span>❤ ${fmt(shoot.likes)}</span></figcaption></figure><span class="st-vs">VS</span><figure class="st-photo">${avatar(rivalLook, (d.skin + 2) % 4, { cls: 'st-photo-av', label: 'Rivaal ' + rivalName })}<figcaption><b>${rivalName}</b><span>❤ ${fmt(shoot.rival)}</span></figcaption></figure></div>
      <p class="st-sum">${win ? `${fmt(shoot.likes)} − ${fmt(shoot.rival)} = <b>${fmt(shoot.likes - shoot.rival)}</b> likes meer dan ${rivalName}` : `${fmt(shoot.rival)} − ${fmt(shoot.likes)} = <b>${fmt(shoot.rival - shoot.likes)}</b> likes te weinig`}</p>
      <div class="st-bigstars">${[1, 2, 3].map(k => `<i class="${k <= s ? 'on' : ''}">★</i>`).join('')}</div>
      <p class="small-note">${shoot.good} van de ${shoot.rounds.length} keer de kant met de meeste likes gekozen · +${fmt(shoot.gained)} volgers</p>
      <ul class="st-rules"><li class="${s >= 1 ? 'on' : ''}">★ Meer likes dan je rivaal</li><li class="${s >= 2 ? 'on' : ''}">★★ En hooguit 2 keer de minste kant</li><li class="${s >= 3 ? 'on' : ''}">★★★ Elke keer de kant met de meeste likes</li></ul>
      ${win && !egged ? '<button class="button yellow big" data-action="st-egg">🥚 Je kreeg een ei als cadeau!</button>' : ''}
      ${!saved ? '<button class="button secondary" data-action="st-save">📸 Bewaar deze look</button>' : '<p class="small-note">Look bewaard!</p>'}
      <button class="button ${win ? 'secondary' : 'purple big'}" data-action="st-again">${I('play')} ${win ? 'Nog een keer' : 'Probeer opnieuw'}</button>
      ${win && shoot.level < ST.LEVELS ? `<button class="button secondary" data-action="st-nextlevel">Volgende fotoshoot ${I('arrow')}</button>` : ''}
      <button class="text-button" data-action="st-home">Terug naar het overzicht</button></section>`;
  }

  /* ---------- vegen ---------- */
  function bindSwipe() {
    const el = document.getElementById('st-stage'); if (!el || el.dataset.bound) return; el.dataset.bound = 1;
    const av = el.querySelector('.st-center');
    el.addEventListener('pointerdown', e => { if (reveal) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    el.addEventListener('pointermove', e => { if (!drag || !av) return; const dx = e.clientX - drag.x; av.style.transform = `translateX(${dx * .6}px) rotate(${dx / 20}deg)`; el.classList.toggle('lean-left', dx < -30); el.classList.toggle('lean-right', dx > 30); });
    const up = e => { if (!drag) return; const dx = e.clientX - drag.x; drag = null; if (av) av.style.transform = ''; el.classList.remove('lean-left', 'lean-right'); if (Math.abs(dx) > 60) { e.preventDefault(); pick(dx > 0 ? 1 : 0); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => { drag = null; if (av) av.style.transform = ''; });
  }

  if (typeof window !== 'undefined') window.__st = { state: () => ({ view, shoot, reveal }) };
  function html() {
    sync();
    if (view === 'shoot' && shoot) { queueMicrotask(bindSwipe); return shootView(); }
    if (view === 'result' && shoot) return resultView();
    return home();
  }
  function handle(b) {
    const a = b.dataset.action; if (!a || !a.startsWith('st-')) return false;
    switch (a) {
      case 'st-level': { const n = +b.dataset.n; if (ST.unlocked(data(), n)) start(n); break; }
      case 'st-skin': data().skin = +b.dataset.i; ctx.save(); ctx.render(); break;
      case 'st-pick': if (Math.abs((drag && drag.moved) || 0) < 1) pick(+b.dataset.side); break;
      case 'st-next': next(); break;
      case 'st-quit': clearTimeout(timer); view = 'home'; shoot = null; ctx.render(); break;
      case 'st-save': if (!saved) { const d = data(); d.looks.push({ outfit: { ...shoot.outfit }, likes: shoot.likes, level: shoot.level }); d.looks = d.looks.slice(-12); saved = true; ctx.save(); ctx.render(); } break;
      case 'st-again': start(shoot.level); break;
      case 'st-nextlevel': start(Math.min(ST.LEVELS, shoot.level + 1)); break;
      case 'st-home': view = 'home'; ctx.render(); break;
      case 'st-egg': if (ST.won(shoot) && !egged) { egged = true; ctx.egg(ST.stars(shoot)); } break;
      default: return false;
    }
    return true;
  }
  return {
    html, handle,
    key: e => { if (view !== 'shoot' || !shoot) return; if (!reveal && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); pick(e.key === 'ArrowRight' ? 1 : 0); } else if (reveal && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); } },
    active: () => view === 'shoot' && !!shoot,
    stop: () => { clearTimeout(timer); }
  };
}
