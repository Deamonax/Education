/* Kangoeroe-modus: schermen voor oefenen, wedstrijd, uitslag en de ouderweergave. */
import * as KG from './kangoeroe.mjs';

export function createKangoeroe(ctx) {
  const I = ctx.icon, esc = ctx.escape;
  let view = 'home', who = null, prac = null, contest = null, result = null, review = null, timer = null, parentFor = null, confirmSubmit = false;

  const user = () => ctx.user();
  function K() { const u = user(); if (!u.kanga) u.kanga = KG.freshKanga(u.groep); return u.kanga; }
  const lvl = () => K().level;
  function syncUser() { const u = user(); if (u && u.id !== who) { stopTimer(); who = u.id; view = 'home'; prac = null; contest = null; result = null; review = null; parentFor = null; } }
  function stopTimer() { clearInterval(timer); timer = null; }
  const active = () => !!(contest && !contest.finished);
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const left = () => contest ? Math.max(0, Math.ceil((contest.deadline - Date.now()) / 1000)) : 0;
  const bandDots = b => `<span class="kg-band" aria-label="moeilijkheid ${b} van 3">${[1, 2, 3].map(i => `<i class="${i <= b ? 'on' : ''}"></i>`).join('')}</span>`;
  const optionInner = (o, i) => `<span class="kg-letter">${KG.LETTERS[i]}</span><span class="kg-opt-body">${o.svg || ''}${o.text ? `<span class="kg-opt-text">${esc(o.text)}</span>` : ''}</span>`;
  const optClass = it => it.options.some(o => o.svg) ? 'pics' : it.options.some(o => !/^\d+$/.test(o.text || '')) ? 'words' : '';
  const masteryBar = m => `<span class="kg-bar"><i style="width:${Math.max(3, m)}%"></i></span>`;
  const readItem = it => { ctx.speak(`${it.text} ${it.options.every(o => o.text && !o.svg) ? it.options.map((o, i) => `${KG.LETTERS[i]}: ${o.text}.`).join(' ') : 'Kijk goed naar de plaatjes.'}`, true); };

  // ---------------- startscherm ----------------
  function home() {
    const k = K(), L = KG.LEVELS[k.level], f = KG.contestFormat(k.level, user().groep), sk = k.skill[k.level] || {};
    const last = k.contests.filter(c => c.level === k.level).slice(-1)[0];
    return `<div class="page-heading"><div><div class="eyebrow">KANGOEROE · ${L.name.toUpperCase()} · ${L.groups.toUpperCase()}</div><h1>Kangoeroe-training <span class="heading-star">✦</span></h1><p>Puzzels zoals bij de Kangoeroewedstrijd. Elke opgave is nieuw.</p>
      <label class="kg-level">Niveau <select data-kg-level><option value="fun" ${k.level === 'fun' ? 'selected' : ''}>wizFUN (groep 3-4)</option><option value="kid" ${k.level === 'kid' ? 'selected' : ''}>wizKID (groep 5-6)</option></select></label></div></div>
    <div class="kg-modes">
      <section class="kg-mode practice"><span class="kg-mode-icon">${I('bulb')}</span><h2>Oefenen</h2><p>Het spel kiest de puzzelsoort die jij nog het lastigst vindt. Na elk antwoord zie je hoe het zit.</p><button class="button yellow big" data-action="kg-practice">${I('play')} Oefenen</button></section>
      <section class="kg-mode contest"><span class="kg-mode-icon">${I('clock')}</span><h2>Wedstrijd</h2><p>${f.n} vragen in ${f.minutes} minuten, net als de echte. Twijfel je? Dan mag je overslaan.</p><button class="button purple big" data-action="kg-contest-intro">${I('flag')} Naar de wedstrijd</button>${last ? `<small>Vorige keer: ${fmtScore(last)}</small>` : ''}</section>
    </div>
    <div class="section-title"><h2>Jouw puzzelsoorten</h2><button class="quiet kg-parents-link" data-action="kg-parents">${I('chart')} Voor ouders</button></div>
    <div class="kg-patterns">${L.patterns.map(([id, name, desc]) => { const s = sk[id], m = KG.mastery(s); return `<div class="kg-pattern"><strong>${esc(name)}</strong><small>${esc(desc)}</small>${masteryBar(s ? m : 0)}<span class="kg-pattern-meta">${s ? `${m}% · ${s.n} gedaan` : 'Nog niet geprobeerd'}</span></div>`; }).join('')}</div>`;
  }
  const fmtScore = c => `${Math.round(c.total * 4) / 4} van ${c.max} punten`;

  // ---------------- oefenen ----------------
  function startPractice() { prac = { item: KG.nextPractice(K(), lvl()), chosen: null, n: 1, ok: 0 }; view = 'practice'; ctx.save(); }
  function practice() {
    const it = prac.item, done = prac.chosen !== null, good = done && prac.chosen === it.answer;
    return `<div class="game-top"><button class="quiet" data-action="kg-home">${I('back')} Stoppen</button><span class="kg-count">Opgave ${prac.n} · ${prac.ok} goed</span></div>
    <section class="question-card kg-card"><div class="question-meta"><span class="pill">${esc(KG.patternName(it.level, it.pattern))} ${bandDots(it.band)}</span><button class="listen-label" data-action="kg-read">${I('volume')} Lees voor</button></div>
      <h2 class="kg-q">${esc(it.text)}</h2>${it.svg ? `<div class="kg-figure">${it.svg}</div>` : ''}
      <div class="kg-options ${optClass(it)}" role="group" aria-label="Antwoorden">${it.options.map((o, i) => `<button class="kg-option ${done ? (i === it.answer ? 'right' : i === prac.chosen ? 'wrong' : 'dim') : ''}" data-action="kg-pick" data-i="${i}" ${done ? 'disabled' : ''} aria-label="Antwoord ${KG.LETTERS[i]}${o.text ? ': ' + esc(o.text) : ''}">${optionInner(o, i)}</button>`).join('')}</div>
      ${done ? `<div class="kg-feedback ${good ? 'good' : 'bad'}" role="status"><strong>${good ? 'Goed zo!' : `Het goede antwoord is ${KG.LETTERS[it.answer]}.`}</strong><p>${esc(it.explain)}</p>${it.explainSvg ? `<div class="kg-figure small">${it.explainSvg}</div>` : ''}<button class="button yellow" data-action="kg-next">${I('arrow')} Volgende puzzel</button></div>` : ''}
    </section>`;
  }
  function pick(i) {
    if (!prac || prac.chosen !== null) return;
    const it = prac.item, ok = i === it.answer;
    prac.chosen = i; if (ok) { prac.ok++; ctx.star(); }
    KG.update(K(), it.level, it.pattern, it.band, ok);
    ctx.sound(ok ? 'win' : 'tap'); ctx.save(); ctx.render();
    ctx.speak(ok ? 'Goed zo!' : `Het goede antwoord is ${KG.LETTERS[it.answer]}. ${it.explain}`);
  }

  // ---------------- wedstrijd ----------------
  function contestIntro() {
    const f = KG.contestFormat(lvl(), user().groep), per = f.n / 3, sc = K().scoring || 'kangoeroe';
    return `<div class="page-heading"><div><div class="eyebrow">WEDSTRIJD · ${esc(f.label.toUpperCase())}</div><h1>Klaar voor de wedstrijd?</h1><p>${f.n} vragen · ${f.minutes} minuten · eerst makkelijk, daarna steeds moeilijker</p></div></div>
    <section class="kg-rules"><h2>Zo tellen de punten</h2>
      ${sc === 'kangoeroe' ? `<ul><li>Je begint met <b>${f.n} punten</b>.</li><li>Goed: vraag 1 tot ${per} geven <b>3</b> punten, vraag ${per + 1} tot ${2 * per} <b>4</b> punten, de laatste ${per} <b>5</b> punten.</li><li>Fout: er gaat <b>een kwart</b> van die punten af.</li><li>Overslaan: <b>0</b> punten. Je verliest niks.</li></ul>`
      : `<ul><li>Goed: <b>5</b> punten.</li><li>Overslaan ("weet niet"): <b>1</b> punt.</li><li>Fout: <b>0</b> punten.</li></ul><p class="kg-note">Dit is de telling uit het reglement van W4Kangoeroe.</p>`}
      <div class="kg-tip">${I('bulb')}<p><b>Twijfel je? Sla over!</b> Een fout antwoord kost punten. Kun je twee of meer antwoorden wegstrepen omdat ze echt niet kunnen? Dan is gokken wel slim. Tik op het kruisje naast een antwoord om het weg te strepen.</p></div>
      <div class="kg-scoring" role="radiogroup" aria-label="Puntentelling"><button data-action="kg-scoring" data-v="kangoeroe" aria-pressed="${sc === 'kangoeroe'}" class="${sc === 'kangoeroe' ? 'selected' : ''}">3-4-5 punten, fout kost punten</button><button data-action="kg-scoring" data-v="w4" aria-pressed="${sc === 'w4'}" class="${sc === 'w4' ? 'selected' : ''}">W4-telling (5 / 1 / 0)</button></div>
      <button class="button yellow big" data-action="kg-contest-start">${I('play')} Start de klok</button><button class="button secondary" data-action="kg-home">Terug</button></section>`;
  }
  function startContest() {
    const k = K(), paper = KG.makePaper(lvl(), user().groep, (k.seed + Date.now()) >>> 0);
    contest = { paper, answers: new Array(paper.items.length).fill(null), struck: paper.items.map(() => []), idx: 0, deadline: Date.now() + paper.minutes * 60000, started: Date.now(), scoring: k.scoring || 'kangoeroe', finished: false };
    confirmSubmit = false; view = 'contest'; stopTimer(); timer = setInterval(tick, 500); ctx.cancelVoice();
  }
  function tick() {
    if (!contest || contest.finished) return stopTimer();
    const s = left(); if (!s) { finishContest(true); return; }
    if (!ctx.isOpen()) return;
    const el = document.querySelector('#kg-clock'); if (el) { el.textContent = fmt(s); el.classList.toggle('urgent', s <= 60); }
  }
  function contestView() {
    const c = contest, it = c.paper.items[c.idx], n = c.paper.items.length, answered = c.answers.filter(a => a !== null).length;
    const nav = c.paper.items.map((x, i) => `<button class="kg-num ${i === c.idx ? 'now' : ''} ${c.answers[i] !== null ? 'done' : ''}" data-action="kg-go" data-i="${i}" aria-label="Vraag ${i + 1}${c.answers[i] !== null ? ', beantwoord' : ''}">${i + 1}</button>`).join('');
    return `<div class="game-top"><button class="quiet" data-action="kg-submit">${I('flag')} Inleveren</button><strong id="kg-clock" class="sprint-clock ${left() <= 60 ? 'urgent' : ''}">${fmt(left())}</strong><span class="kg-count">${answered} van ${n} beantwoord</span></div>
    ${confirmSubmit ? `<div class="kg-confirm" role="alert"><p><b>Inleveren?</b> ${n - answered ? `Je hebt ${n - answered} ${n - answered === 1 ? 'vraag' : 'vragen'} overgeslagen. Dat mag!` : 'Je hebt alles beantwoord.'}</p><div><button class="button yellow" data-action="kg-submit-yes">Ja, inleveren</button><button class="button secondary" data-action="kg-submit-no">Nog even verder</button></div></div>` : ''}
    <nav class="kg-nav" aria-label="Vragen">${nav}</nav>
    <section class="question-card kg-card"><div class="question-meta"><span class="pill">VRAAG ${c.idx + 1} · ${c.scoring === 'kangoeroe' ? it.points : 5} PUNTEN</span><button class="listen-label" data-action="kg-read">${I('volume')} Lees voor</button></div>
      <h2 class="kg-q">${esc(it.text)}</h2>${it.svg ? `<div class="kg-figure">${it.svg}</div>` : ''}
      <div class="kg-options ${optClass(it)}" role="group" aria-label="Antwoorden">${it.options.map((o, i) => { const struck = c.struck[c.idx].includes(i), sel = c.answers[c.idx] === i; return `<div class="kg-opt-wrap ${struck ? 'struck' : ''}"><button class="kg-option ${sel ? 'selected' : ''}" data-action="kg-answer" data-i="${i}" aria-pressed="${sel}" ${struck ? 'disabled' : ''} aria-label="Antwoord ${KG.LETTERS[i]}${o.text ? ': ' + esc(o.text) : ''}">${optionInner(o, i)}</button><button class="kg-strike" data-action="kg-strike" data-i="${i}" aria-label="${struck ? 'Terugzetten' : 'Wegstrepen'} ${KG.LETTERS[i]}" aria-pressed="${struck}">${struck ? '↺' : '✕'}</button></div>`; }).join('')}</div>
      <div class="kg-step"><button class="button secondary" data-action="kg-prev" ${c.idx === 0 ? 'disabled' : ''}>${I('back')} Vorige</button><button class="button secondary" data-action="kg-skip">${c.answers[c.idx] !== null ? 'Antwoord wissen' : 'Overslaan'}</button><button class="button purple" data-action="kg-nextq" ${c.idx === n - 1 ? 'disabled' : ''}>Volgende ${I('arrow')}</button></div>
    </section>`;
  }
  function finishContest(timeUp = false) {
    const c = contest; if (!c || c.finished) return;
    c.finished = true; stopTimer();
    const res = KG.scorePaper(c.paper, c.answers, c.scoring), k = K();
    c.paper.items.forEach((it, i) => { if (c.answers[i] !== null) KG.update(k, it.level, it.pattern, it.band, c.answers[i] === it.answer, .7); });
    const rec = { t: Date.now(), level: c.paper.level, label: c.paper.label, scoring: c.scoring, total: res.total, max: res.max, secs: Math.round((Date.now() - c.started) / 1000), per: Object.fromEntries(Object.entries(res.per).map(([p, v]) => [p, { got: v.got, max: v.max, ok: v.ok, wrong: v.wrong, skip: v.skip }])) };
    k.contests.push(rec); if (k.contests.length > 30) k.contests.splice(0, k.contests.length - 30);
    result = { res, rec, timeUp }; view = 'result'; ctx.save();
    if (!ctx.isOpen()) return;
    ctx.render(); window.scrollTo(0, 0);
    ctx.speak(timeUp ? 'De tijd is om! Kijk hoe je het deed per puzzelsoort.' : 'Ingeleverd! Kijk hoe je het deed per puzzelsoort.');
  }
  function resultView() {
    const { res, rec, timeUp } = result, L = rec.level, rows = Object.entries(res.per).sort((a, b) => (b[1].got / b[1].max) - (a[1].got / a[1].max));
    const wrong = rows.reduce((a, [, v]) => a + v.wrong, 0), skip = rows.reduce((a, [, v]) => a + v.skip, 0);
    const best = rows[0], worst = rows[rows.length - 1];
    return `<div class="page-heading"><div><div class="eyebrow">${timeUp ? 'DE TIJD IS OM' : 'INGELEVERD'} · ${esc(rec.label.toUpperCase())}</div><h1>Zo ging het per puzzelsoort</h1><p>Sterkst: <b>${esc(KG.patternName(L, best[0]))}</b>. Hier valt het meest te winnen: <b>${esc(KG.patternName(L, worst[0]))}</b>.</p></div></div>
    <section class="kg-result"><table class="kg-table"><thead><tr><th>Puzzelsoort</th><th aria-label="goed">✓</th><th aria-label="fout">✗</th><th aria-label="overgeslagen">–</th><th>Punten</th></tr></thead><tbody>
      ${rows.map(([p, v]) => `<tr><td>${esc(KG.patternName(L, p))}</td><td>${v.ok}</td><td>${v.wrong}</td><td>${v.skip}</td><td><span class="kg-pts">${fmtPts(v.got)} / ${v.max}</span>${masteryBar(Math.max(0, Math.round(100 * v.got / v.max)))}</td></tr>`).join('')}
    </tbody></table>
    <p class="kg-total">${rec.scoring === 'kangoeroe' ? `Met de ${result.res.max - rows.reduce((a, [, v]) => a + v.max, 0)} startpunten kom je samen op ${fmtPts(res.total)} van de ${res.max} punten.` : `Samen ${fmtPts(res.total)} van de ${res.max} punten.`}</p>
    ${wrong > skip && rec.scoring === 'kangoeroe' ? `<div class="kg-tip">${I('bulb')}<p>Je had ${wrong} ${wrong === 1 ? 'antwoord' : 'antwoorden'} fout. Bij twijfel overslaan houdt je punten vast.</p></div>` : ''}
    <button class="button yellow big" data-action="kg-review">Bekijk alle vragen met uitleg</button><button class="button secondary" data-action="kg-contest-intro">Nog een wedstrijd</button><button class="button secondary" data-action="kg-home">Terug</button></section>`;
  }
  const fmtPts = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
  function reviewView() {
    const c = contest;
    return `<div class="game-top"><button class="quiet" data-action="kg-back-result">${I('back')} Terug naar de uitslag</button></div><div class="kg-review">${c.paper.items.map((it, i) => { const a = c.answers[i], ok = a === it.answer; return `<details class="kg-rev ${a === null ? 'skip' : ok ? 'good' : 'bad'}"><summary><span class="kg-num done">${i + 1}</span><span>${esc(KG.patternName(it.level, it.pattern))}</span><b>${a === null ? 'overgeslagen' : ok ? 'goed' : 'fout'}</b></summary><p class="kg-q">${esc(it.text)}</p>${it.svg ? `<div class="kg-figure">${it.svg}</div>` : ''}<div class="kg-options ${optClass(it)}">${it.options.map((o, j) => `<div class="kg-option static ${j === it.answer ? 'right' : j === a ? 'wrong' : 'dim'}">${optionInner(o, j)}</div>`).join('')}</div><div class="kg-feedback ${ok ? 'good' : 'bad'}"><p>${esc(it.explain)}</p>${it.explainSvg ? `<div class="kg-figure small">${it.explainSvg}</div>` : ''}</div></details>`; }).join('')}</div>`;
  }

  // ---------------- ouders ----------------
  function spark(hist) {
    if (!hist || hist.length < 2) return '<span class="kg-spark-empty">nog te weinig</span>';
    const pts = hist.slice(-30), x0 = pts[0][0], x1 = pts[pts.length - 1][0] || x0 + 1, W = 120, H = 32;
    const X = d => 2 + (W - 4) * (x1 === x0 ? 0 : (d - x0) / (x1 - x0)), Y = m => H - 3 - (H - 6) * m / 100;
    return `<svg class="kg-spark" viewBox="0 0 ${W} ${H}" aria-label="beheersing in de tijd"><line x1="0" x2="${W}" y1="${Y(50)}" y2="${Y(50)}" stroke="#eae6f1"/><polyline fill="none" stroke="#7550ce" stroke-width="2" points="${pts.map(([d, m]) => `${X(d).toFixed(1)},${Y(m).toFixed(1)}`).join(' ')}"/><circle cx="${X(pts[pts.length - 1][0])}" cy="${Y(pts[pts.length - 1][1])}" r="3" fill="#7550ce"/></svg>`;
  }
  function parents() {
    const users = ctx.users(), sel = users.find(u => u.id === parentFor) || user(), k = sel.kanga || KG.freshKanga(sel.groep), L = KG.LEVELS[k.level], sk = k.skill[k.level] || {}, hist = k.hist[k.level] || {};
    const contests = k.contests.filter(c => c.level === k.level).slice(-8).reverse();
    return `<div class="page-heading"><div><div class="eyebrow">VOOR OUDERS · KANGOEROE</div><h1>Beheersing per puzzelsoort</h1><p>Per kind, per patroon, door de tijd heen.</p></div></div>
    <div class="kg-kids" role="tablist">${users.map(u => `<button role="tab" aria-selected="${u.id === sel.id}" class="${u.id === sel.id ? 'selected' : ''}" data-action="kg-parent-kid" data-id="${u.id}">${esc(u.name)} <small>groep ${u.groep}</small></button>`).join('')}</div>
    <section class="kg-parent"><h2>${esc(sel.name)} · ${L.name} (${L.groups})</h2>
      <table class="kg-table parent"><thead><tr><th>Patroon</th><th>Beheersing</th><th>Verloop</th><th>Gedaan</th></tr></thead><tbody>
      ${L.patterns.map(([id, name, desc]) => { const s = sk[id], m = s ? KG.mastery(s) : null; return `<tr><td><strong>${esc(name)}</strong><small>${esc(desc)}</small></td><td>${m === null ? '<span class="kg-muted">nog niet</span>' : `${masteryBar(m)}<b>${m}%</b>`}</td><td>${spark(hist[id])}</td><td>${s ? `${s.n}× · ${Math.round(100 * s.ok / s.n)}% goed` : '–'}</td></tr>`; }).join('')}
      </tbody></table>
      <p class="kg-note">Beheersing is de geschatte kans dat ${esc(sel.name)} een middelzware opgave van dit patroon echt snapt (gokken eruit gerekend). Het model past zich na elk antwoord aan: makkelijke opgaven tellen minder zwaar dan moeilijke. Bij oefenen krijgt ${esc(sel.name)} steeds het zwakste patroon, op een niveau waar ongeveer 7 van de 10 lukken.</p>
      <h3>Wedstrijden</h3>${contests.length ? `<table class="kg-table"><thead><tr><th>Datum</th><th>Score</th><th>Sterkst</th><th>Zwakst</th></tr></thead><tbody>${contests.map(c => { const rows = Object.entries(c.per).sort((a, b) => b[1].got / b[1].max - a[1].got / a[1].max); return `<tr><td>${new Date(c.t).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</td><td>${fmtPts(c.total)} / ${c.max}<small>${c.scoring === 'w4' ? 'W4-telling' : '3-4-5 telling'} · ${Math.round(c.secs / 60)} min</small></td><td>${esc(KG.patternName(c.level, rows[0][0]))}</td><td>${esc(KG.patternName(c.level, rows[rows.length - 1][0]))}</td></tr>`; }).join('')}</tbody></table>` : '<p class="kg-muted">Nog geen wedstrijd gespeeld.</p>'}
      <button class="button secondary" data-action="kg-home">Terug</button></section>`;
  }

  // ---------------- koppeling met de app ----------------
  function html() {
    syncUser();
    if (view === 'practice' && prac) return practice();
    if (view === 'contest-intro') return contestIntro();
    if (view === 'contest' && contest && !contest.finished) return contestView();
    if (view === 'result' && result) return resultView();
    if (view === 'review' && contest) return reviewView();
    if (view === 'parents') return parents();
    view = 'home'; return home();
  }
  function handle(b) {
    const a = b.dataset.action; if (!a || !a.startsWith('kg-')) return false;
    syncUser();
    const c = contest;
    switch (a) {
      case 'kg-home': if (active()) { contest = null; stopTimer(); } view = 'home'; prac = null; ctx.cancelVoice(); break;
      case 'kg-practice': startPractice(); break;
      case 'kg-pick': pick(+b.dataset.i); return true;
      case 'kg-next': prac.item = KG.nextPractice(K(), lvl()); prac.chosen = null; prac.n++; ctx.cancelVoice(); ctx.save(); break;
      case 'kg-read': { const it = view === 'practice' ? prac.item : c.paper.items[c.idx]; readItem(it); return true; }
      case 'kg-contest-intro': view = 'contest-intro'; result = null; break;
      case 'kg-scoring': K().scoring = b.dataset.v === 'w4' ? 'w4' : 'kangoeroe'; ctx.save(); break;
      case 'kg-contest-start': startContest(); break;
      case 'kg-answer': if (c && !c.finished) c.answers[c.idx] = +b.dataset.i; break;
      case 'kg-strike': if (c && !c.finished) { const s = c.struck[c.idx], i = +b.dataset.i; c.struck[c.idx] = s.includes(i) ? s.filter(x => x !== i) : [...s, i]; if (c.answers[c.idx] === i) c.answers[c.idx] = null; } break;
      case 'kg-skip': if (c && !c.finished) { const had = c.answers[c.idx] !== null; c.answers[c.idx] = null; if (!had && c.idx < c.paper.items.length - 1) c.idx++; } break;
      case 'kg-prev': if (c && c.idx > 0) c.idx--; break;
      case 'kg-nextq': if (c && c.idx < c.paper.items.length - 1) c.idx++; break;
      case 'kg-go': if (c) c.idx = +b.dataset.i; break;
      case 'kg-submit': confirmSubmit = true; break;
      case 'kg-submit-no': confirmSubmit = false; break;
      case 'kg-submit-yes': confirmSubmit = false; finishContest(false); return true;
      case 'kg-review': view = 'review'; break;
      case 'kg-back-result': view = 'result'; break;
      case 'kg-parents': ctx.closeModal(); ctx.goPage(); view = 'parents'; parentFor = user().id; break;
      case 'kg-parent-kid': parentFor = b.dataset.id; break;
      default: return false;
    }
    ctx.render();
    if (['kg-go', 'kg-nextq', 'kg-prev', 'kg-skip', 'kg-next', 'kg-practice', 'kg-contest-start'].includes(a)) document.querySelector('.kg-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return true;
  }
  function change(el) {
    if (el.matches && el.matches('[data-kg-level]')) { K().level = el.value === 'kid' ? 'kid' : 'fun'; prac = null; ctx.save(); ctx.render(); return true; }
    return false;
  }
  function key(e) {
    const k = e.key.toLowerCase(), i = ['1', '2', '3', '4', '5'].indexOf(k) >= 0 ? +k - 1 : ['a', 'b', 'c', 'd', 'e'].indexOf(k);
    if (view === 'practice' && prac) {
      if (prac.chosen === null && i >= 0 && i < prac.item.options.length) { pick(i); e.preventDefault(); }
      else if (prac.chosen !== null && e.key === 'Enter') { handle({ dataset: { action: 'kg-next' } }); e.preventDefault(); }
    } else if (view === 'contest' && active()) {
      const c = contest;
      if (i >= 0 && i < c.paper.items[c.idx].options.length && !c.struck[c.idx].includes(i)) { c.answers[c.idx] = i; ctx.render(); e.preventDefault(); }
      else if (e.key === 'ArrowRight' && c.idx < c.paper.items.length - 1) { c.idx++; ctx.render(); }
      else if (e.key === 'ArrowLeft' && c.idx > 0) { c.idx--; ctx.render(); }
    }
  }
  // Bij het wisselen van pagina loopt een wedstrijdklok gewoon door; terugkomen kan.
  function stop() { stopTimer(); }
  function reset() { stopTimer(); who = null; }
  return { html, handle, change, key, active, stop, reset, openParents: () => { view = 'parents'; parentFor = user()?.id; } };
}
