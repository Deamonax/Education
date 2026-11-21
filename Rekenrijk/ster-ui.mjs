/* Rekenster: schermen. Links of rechts: kies steeds het kledingstuk met de meeste likes. */
import * as ST from './ster.mjs';
import { avatar, NAMES, SKINS, itemName } from './ster-art.mjs';
import * as PZ from './puzzles.mjs';

const RIVALS = ['Lola', 'Noor', 'Mila', 'Yara', 'Fien', 'Sam', 'Jade', 'Liv'];

export function createSter(ctx) {
  const I = ctx.icon;
  let q = null, st = null, phase = 'sum', lastOk = null;
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

  /* ---------- fotoshoot: eerst een som, dan kiezen (of iets lelijks) ---------- */
  function start(n) {
    level = n; shoot = ST.newShoot(n, user().groep); view = 'shoot'; saved = false; egged = false;
    rivalName = RIVALS[Math.floor(Math.random() * RIVALS.length)];
    rivalLook = Object.fromEntries(ST.ROUNDS.map(c => [c, Math.floor(Math.random() * ST.VARIANTS[c])]));
    newSum(); ctx.render(); window.scrollTo(0, 0);
  }
  function newSum() {
    const steps = ctx.steps(), t = ST.sumTypes(user().groep);
    let nq; for (let i = 0; i < 10; i++) { nq = PZ.quickPuzzle(t[Math.floor(Math.random() * t.length)], steps); if (!q || nq.key !== q.key) break; }
    q = nq; st = PZ.newState(q); phase = 'sum'; lastOk = null; qStart = performance.now();
    const x = shoot.rounds[shoot.i];
    ctx.speak(`${ST.ROUND_NAME[x.cat]}. ${q.spoken}`);
  }
  function shootView() {
    const x = shoot.rounds[shoot.i], d = data(), cur = { ...shoot.outfit };
    const top = `<div class="st-top"><button class="quiet" data-action="st-quit">${I('back')} <span>Stop</span></button><div class="st-round">${shoot.rounds.map((y, i) => `<i class="${y.ok === null ? (i === shoot.i ? 'now' : '') : y.ok ? 'good' : 'meh'}"></i>`).join('')}</div><b class="st-count" aria-label="${shoot.likes} likes">❤ ${fmt(shoot.likes)}</b></div>`;
    if (phase === 'sum') return `<div class="st-shoot">${top}<h2 class="st-ask">${ST.ROUND_NAME[x.cat]}: reken goed, dan mag jij kiezen!</h2>
      <div class="st-sumrow"><div class="st-center small">${avatar(cur, d.skin, { cls: 'st-big' })}</div><section class="st-sum"><div class="lg-sum">${PZ.view(q, st)}${PZ.padHtml(q, st, { submit: 'st-check' })}</div><div class="st-sum-actions"><button class="listen-label" data-action="st-read">${I('volume')} Lees voor</button><button class="button purple" data-action="st-check">${I('check')} Kijk na</button></div><p class="small-note">Fout? Dan krijg je iets lelijks...</p></section></div></div>`;
    if (phase === 'choose') {
      const card = side => { const look = { ...cur, [x.cat]: x.items[side] }; return `<button class="st-card ${side ? 'right' : 'left'}" data-action="st-pick" data-side="${side}"><span class="st-arrow">${side ? 'RECHTS ▶' : '◀ LINKS'}</span>${avatar(look, d.skin, { cls: 'st-card-av', label: itemName(x.cat, x.items[side]) })}<span class="st-item big">${itemName(x.cat, x.items[side])}</span></button>`; };
      return `<div class="st-shoot">${top}<div class="st-verdict good"><b>Goed gerekend!</b> Kies maar: links of rechts?</div><h2 class="st-ask">${ST.ROUND_NAME[x.cat]}</h2><div class="st-stage" id="st-stage">${card(0)}<div class="st-center">${avatar(cur, d.skin, { cls: 'st-big' })}</div>${card(1)}</div><p class="st-help">Veeg naar links of rechts, tik op een kaart, of gebruik ← →.</p></div>`;
    }
    // lelijk of net gekozen
    const ugly = phase === 'ugly';
    return `<div class="st-shoot">${top}<div class="st-reveal ${ugly ? 'ugly' : 'nice'}"><div class="st-center">${avatar(cur, d.skin, { cls: 'st-big' })}</div><div>
      <h2>${ugly ? 'Oei! ' + itemName(x.cat, ST.UGLY) + '...' : 'Mooi! ' + itemName(x.cat, x.items[x.choice])}</h2>
      <p class="st-likegain">+${x.likes} ❤</p>
      ${ugly ? `<div class="st-explain"><b>Zo had het gemoeten:</b> ${q.explanation}</div>` : ''}
      <button class="button purple big" data-action="st-next">${shoot.i >= shoot.rounds.length - 1 ? 'Naar de fotoshoot!' : 'Volgende ronde'} ${I('arrow')}</button></div></div></div>`;
  }
  function check() {
    if (phase !== 'sum') return;
    const res = PZ.check(q, st);
    if (!res.complete) { ctx.toast('Vul eerst je antwoord in.'); return; }
    ctx.record(q, res.ok, performance.now() - qStart);
    ST.answered(shoot, res.ok);
    if (res.ok) { phase = 'choose'; ctx.sound('correct'); ctx.speak('Goed gerekend! Kies maar: links of rechts.'); }
    else { phase = 'ugly'; PZ.reveal(q, st); ctx.speak(`Oei, dat was niet goed. Je krijgt: ${itemName(shoot.rounds[shoot.i].cat, ST.UGLY)}. ${q.explanation}`); }
    ctx.save(); ctx.render(); window.scrollTo(0, 0);
  }
  function pick(side) {
    if (phase !== 'choose') return;
    const x = ST.choose(shoot, side); if (!x) return;
    phase = 'picked'; ctx.sound('correct'); ctx.speak(`Mooi! ${itemName(x.cat, x.items[side])}. ${x.likes} likes.`);
    ctx.save(); ctx.render();
    clearTimeout(timer); timer = setTimeout(() => { if (phase === 'picked' && view === 'shoot') next(); }, 2600);
  }
  function next() {
    clearTimeout(timer);
    if (phase === 'sum' || phase === 'choose') return;
    ST.nextRound(shoot);
    if (shoot.done) { finish(); return; }
    newSum(); ctx.render(); window.scrollTo(0, 0);
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
      <p class="small-note">${shoot.good} van de ${shoot.rounds.length} sommen goed · +${fmt(shoot.gained)} volgers</p>
      <ul class="st-rules"><li class="${s >= 1 ? 'on' : ''}">★ Meer likes dan je rivaal</li><li class="${s >= 2 ? 'on' : ''}">★★ En hooguit 2 sommen fout</li><li class="${s >= 3 ? 'on' : ''}">★★★ Alle sommen goed</li></ul>
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
    el.addEventListener('pointerdown', e => { if (phase !== 'choose') return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    el.addEventListener('pointermove', e => { if (!drag || !av) return; const dx = e.clientX - drag.x; av.style.transform = `translateX(${dx * .6}px) rotate(${dx / 20}deg)`; el.classList.toggle('lean-left', dx < -30); el.classList.toggle('lean-right', dx > 30); });
    const up = e => { if (!drag) return; const dx = e.clientX - drag.x; drag = null; if (av) av.style.transform = ''; el.classList.remove('lean-left', 'lean-right'); if (Math.abs(dx) > 60) { e.preventDefault(); pick(dx > 0 ? 1 : 0); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => { drag = null; if (av) av.style.transform = ''; });
  }

  if (typeof window !== 'undefined') window.__st = { state: () => ({ view, shoot, phase, q, st }), solve: () => { if (q && st) { PZ.reveal(q, st); ctx.render(); } } };
  function html() {
    sync();
    if (view === 'shoot' && shoot) { queueMicrotask(bindSwipe); return shootView(); }
    if (view === 'result' && shoot) return resultView();
    return home();
  }
  function handle(b) {
    const a = b.dataset.action; if (!a) return false;
    if (a.startsWith('pz-')) { if (view !== 'shoot' || phase !== 'sum' || !q) return false; if (a === 'pz-cell') { st.active = b.dataset.cell; ctx.render(); } else if (a === 'pz-key') { if (PZ.input(q, st, b.dataset.k)) ctx.render(); } else if (a === 'pz-x') { if (PZ.act(q, st, b.dataset.op, b.dataset.a)) ctx.render(); } else if (a === 'pz-check') check(); return true; }
    if (!a.startsWith('st-')) return false;
    switch (a) {
      case 'st-level': { const n = +b.dataset.n; if (ST.unlocked(data(), n)) start(n); break; }
      case 'st-skin': data().skin = +b.dataset.i; ctx.save(); ctx.render(); break;
      case 'st-pick': if (Math.abs((drag && drag.moved) || 0) < 1) pick(+b.dataset.side); break;
      case 'st-next': next(); break;
      case 'st-check': check(); break;
      case 'st-read': if (q) ctx.speak(q.spoken, true); break;
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
    key: e => { if (view !== 'shoot' || !shoot) return; if (phase === 'sum') { if (e.key === 'Enter') { e.preventDefault(); check(); return; } if (PZ.onKey(q, st, e)) ctx.render(); return; } if (phase === 'choose' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); pick(e.key === 'ArrowRight' ? 1 : 0); } else if ((phase === 'ugly' || phase === 'picked') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); } },
    active: () => view === 'shoot' && !!shoot,
    stop: () => { clearTimeout(timer); }
  };
}
