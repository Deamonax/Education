/* LeesRijk: dagelijkse leesoefening volgens de Leesroute (12 weken).
   Gewone scripts (geen modules), zodat index.html ook werkt als je hem dubbelklikt. */
(function () {
  'use strict';
  var E = window.LE, D = window.LR_DATA, V = window.LR_PETS, LL = window.LL, LS = window.LS;
  var KEY = 'leesrijk-v1';
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var today = function () { return new Date().toISOString().slice(0, 10); };
  var uid = function () { return Math.random().toString(36).slice(2, 10); };

  /* ---------- opslag ---------- */
  var DEF_SET = { spacing: 'extra', size: 'L', bg: 'creme', syl: true, read: true, rate: 0.85 };
  function newPlayer(name) {
    return { id: uid(), name: name, week: 1, created: Date.now(), flashW: E.newFlash(700), flashP: E.newFlash(900), rev: {}, pat: {}, weeks: {}, days: {}, tests: [], stars: 0, books: [], pets: [], inv: {}, seen: {}, today: null, groep: 6, lv: { lezen: LL.newSkill(6), spelling: LL.newSkill(6) }, struct: {}, scat: {}, readx: { words: 0, err: 0, self: 0 }, begrip: { n: 0, ok: 0 }, checks: [], eggs: 0, eggGroup: 0, fav: null, settings: Object.assign({}, DEF_SET) };
  }
  function clean(p) {
    if (!p || typeof p !== 'object') return null;
    var o = newPlayer(String(p.name || 'Lezer').replace(/[<>&"]/g, '').slice(0, 20) || 'Lezer');
    o.id = typeof p.id === 'string' ? p.id : o.id; o.week = Math.min(12, Math.max(1, p.week | 0 || 1)); o.created = +p.created || Date.now();
    ['flashW', 'flashP'].forEach(function (k) { if (p[k] && isFinite(p[k].ms)) o[k] = { ms: Math.min(2500, Math.max(120, p[k].ms)), start: +p[k].start || (p[k].hist && p[k].hist[0] ? p[k].hist[0][1] : p[k].ms), streak: p[k].streak | 0, n: p[k].n | 0, ok: p[k].ok | 0, hist: Array.isArray(p[k].hist) ? p[k].hist.slice(-200) : [] }; });
    ['rev', 'pat', 'weeks', 'days'].forEach(function (k) { if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k])) o[k] = p[k]; });
    if (Array.isArray(p.tests)) o.tests = p.tests.filter(function (t) { return t && t.date; }).slice(-60);
    if (Array.isArray(p.books)) o.books = p.books.slice(-400);
    o.stars = p.stars | 0;
    if (p.seen && typeof p.seen === 'object' && !Array.isArray(p.seen)) o.seen = p.seen;
    o.groep = Math.min(8, Math.max(3, p.groep | 0 || 6));
    o.lv = { lezen: LL.clean(p.lv && p.lv.lezen, o.groep), spelling: LL.clean(p.lv && p.lv.spelling, o.groep) };
    ['struct', 'scat'].forEach(function (k) { if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k])) o[k] = p[k]; });
    if (p.readx && isFinite(p.readx.words)) o.readx = { words: p.readx.words | 0, err: p.readx.err | 0, self: p.readx.self | 0 };
    if (p.begrip && isFinite(p.begrip.n)) o.begrip = { n: p.begrip.n | 0, ok: p.begrip.ok | 0 };
    if (Array.isArray(p.checks)) o.checks = p.checks.slice(-30);
    if (p.today && typeof p.today === 'object') o.today = p.today;
    if (Array.isArray(p.pets)) o.pets = p.pets.filter(function (x) { return Number.isInteger(x) && x >= 0 && x < V.pets.length; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    if (p.inv && typeof p.inv === 'object') o.pets.forEach(function (x) { o.inv[x] = Math.max(1, p.inv[x] | 0); });
    o.eggs = Math.max(0, Math.min(400, p.eggs | 0)); o.eggGroup = Math.min(V.groups.length - 1, Math.max(0, p.eggGroup | 0)); o.fav = o.pets.indexOf(p.fav) >= 0 ? p.fav : (o.pets[0] !== undefined ? o.pets[0] : null);
    o.settings = Object.assign({}, DEF_SET, p.settings || {});
    return o;
  }
  var store = { players: [], active: null };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && Array.isArray(raw.players)) { store.players = raw.players.map(clean).filter(Boolean); store.active = raw.active; } } catch (e) { }
  var canSave = true;
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { if (canSave) toast('Bewaren lukt niet in deze browser. Je voortgang blijft tot je het venster sluit.'); canSave = false; } }
  function save() { saveLocal(); if (SY) SY.changed(); }
  /* ---------- zelfde voortgang op elk apparaat ---------- */
  var SY = null;
  function busy() { return page === 'sessie' || page === 'samen' || page === 'toets' || (page === 'check' && chk && chk.phase !== 'intro' && chk.phase !== 'done') || (page === 'eieren' && hatch && !hatch.revealed); }
  function syncScore(p) { var n = 0; for (var d in (p.days || {})) n += (p.days[d] && p.days[d].n) | 0; return n * 1000 + ((p.stars | 0) % 1000); }
  function syncStart() {
    if (!window.RijkSync) return;
    SY = window.RijkSync.create({
      key: 'leesrijk-sync', players: function () { return store.players; }, score: syncScore, busy: busy,
      apply: function (data, localId) {
        var np = clean(data); if (!np) return null;
        store.players = store.players.filter(function (x) { return x.id !== np.id || x.id === localId; });
        var i = store.players.findIndex(function (x) { return x.id === (localId || np.id); });
        if (i >= 0) store.players[i] = np; else store.players.push(np);
        if (!store.active || store.active === localId) store.active = np.id;
        saveLocal(); return np;
      },
      remove: function (id) { store.players = store.players.filter(function (x) { return x.id !== id; }); if (store.active === id) store.active = store.players[0] ? store.players[0].id : null; saveLocal(); },
      refresh: function () { var d = $('#modal'); if (!busy() && !(d && d.open) && !(document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) render(); },
      onStatus: function () { var el = $('#syncstate'); if (el) el.innerHTML = syncLine(); }
    });
  }
  function syncLine() {
    var st = SY ? SY.state() : null;
    if (!st || st.online === null) return 'Bezig met verbinden…';
    if (!st.online) return 'Nu geen verbinding. Je voortgang wordt bijgewerkt zodra er weer internet is.';
    return 'Bijgewerkt om ' + new Date(st.last).toTimeString().slice(0, 5) + '.';
  }
  function syncLink(input, localId, done) {
    if (!SY) { toast('Synchroniseren werkt niet in deze browser.'); return; }
    var el = $(input), v = el ? el.value : '';
    if (!v.trim()) { toast('Vul eerst de code in.'); if (el) el.focus(); return; }
    SY.link(v, localId).then(function (np) { if (!np) { toast('Die code kon niet worden geladen.'); return; } store.active = np.id; saveLocal(); closeModal(); sess = null; done && done(np); go('home'); toast('Gelukt! Dit is de voortgang van ' + np.name + '.'); }, function (e) { toast(e.message); });
  }
  function P() { return store.players.find(function (p) { return p.id === store.active; }) || store.players[0] || null; }
  function W(p, n) { p = p || P(); n = n || p.week; return p.weeks[n] || (p.weeks[n] = { sessions: 0, hak: { n: 0, ok: 0 }, zoek: { n: 0, ok: 0 }, lang: { n: 0, ok: 0 }, flits: { n: 0, ok: 0 }, dictee: { n: 0, ok: 0 }, reads: [], lists: [] }); }
  function tally(kind, ok) { var w = W(); var x = w[kind] || (w[kind] = { n: 0, ok: 0 }); x.n++; if (ok) x.ok++; var rc = w.recent || (w.recent = {}), l = rc[kind] || (rc[kind] = []); l.push(ok ? 1 : 0); if (l.length > E.READY.recent) l.splice(0, l.length - E.READY.recent); }
  /* ---------- niveau bijwerken ---------- */
  function noteStruct(p, w, pseudo, ok) { var k = LL.structure(w, pseudo), x = p.struct[k] || (p.struct[k] = { n: 0, ok: 0 }); x.n++; if (ok) x.ok++; }
  function lvRead(w, ok, task, pseudo) { var p = P(), x = typeof ok === 'number' ? ok : ok ? 1 : 0; LL.update(p.lv.lezen, LL.difficulty(w, pseudo), x, task); noteStruct(p, w, pseudo, x >= .99); }
  function lvSpell(d, ok, cats, errCat) { var p = P(); LL.update(p.lv.spelling, d, ok ? 1 : 0, LL.TASK.spel); (cats || []).forEach(function (c) { var x = p.scat[c] || (p.scat[c] = { n: 0, err: 0 }); x.n++; if (!ok && (!errCat || errCat === c)) x.err++; }); if (!ok && errCat && (cats || []).indexOf(errCat) < 0) { var y = p.scat[errCat] || (p.scat[errCat] = { n: 0, err: 0 }); y.n++; y.err++; } }
  /* hardop gelezen woorden: fout = 0, zelf verbeterd = 0,7 (een goed teken), goed = 1 */
  function lvAloud(words, errIdx, selfIdx, upTo, pseudo) {
    var p = P(); for (var i = 0; i <= upTo && i < words.length; i++) { var w = cleanWord(words[i]); if (w.length < 2) continue; var e = errIdx.indexOf(i) >= 0, sc = selfIdx.indexOf(i) >= 0; lvRead(w, e ? 0 : sc ? .7 : 1, LL.TASK.luid, pseudo); p.readx.words++; if (e) p.readx.err++; if (sc) p.readx.self++; }
  }
  function noteDay(min) { var p = P(), d = p.days[today()] || (p.days[today()] = { min: 0, n: 0 }); d.n++; d.min += min || 0; }

  /* ---------- stem ---------- */
  var synth = window.speechSynthesis, voices = [];
  function loadVoices() { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
  function nlVoice() { return voices.find(function (v) { return /^nl[-_]NL/i.test(v.lang); }) || voices.find(function (v) { return /^nl/i.test(v.lang); }) || null; }
  function canSpeak() { return !!synth && !!nlVoice(); }
  function speak(text, opts) {
    opts = opts || {};
    if (!synth) { if (opts.force) toast('Voorlezen werkt niet in deze browser.'); return null; }
    try { synth.cancel(); } catch (e) { }
    var u = new SpeechSynthesisUtterance(text), v = nlVoice(); u.lang = 'nl-NL'; if (v) u.voice = v;
    var p = P(); u.rate = opts.rate || (p ? p.settings.rate : .85);
    if (opts.onboundary) u.onboundary = opts.onboundary;
    if (opts.onend) u.onend = opts.onend;
    synth.speak(u); return u;
  }
  function stopSpeak() { try { if (synth) synth.cancel(); } catch (e) { } }

  /* ---------- weergave ---------- */
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 3200); }
  function applyLook() {
    var p = P(), s = p ? p.settings : DEF_SET, b = document.body;
    b.dataset.spacing = s.spacing; b.dataset.size = s.size; b.dataset.bg = s.bg;
  }
  function sylHtml(w, on) {
    var sy = E.syllables(w);
    if (on === false || sy.length < 2 || sy.join('').length !== w.length) return esc(w);
    var at = 0; /* hoofdletters van het origineel houden */
    return sy.map(function (s, i) { var part = w.slice(at, at + s.length); at += s.length; return '<span class="s' + (i % 2) + '">' + esc(part) + '</span>'; }).join('');
  }
  function weekHelp(w, wk) {
    if (!wk || wk.review) return sylHtml(w);
    if (wk.mode === 'syll') return sylHtml(w);
    var spans = E.patternSpans(w, wk); if (!spans.length) return esc(w);
    var out = '', at = 0; spans.forEach(function (sp) { out += esc(w.slice(at, sp[0])) + '<b class="hl">' + esc(w.slice(sp[0], sp[1])) + '</b>'; at = sp[1]; });
    return out + esc(w.slice(at));
  }
  var ICON = {
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13"/>',
    play: '<path d="M7 4v16l13-8z"/>', star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>', back: '<path d="M15 5l-7 7 7 7"/>',
    check: '<path d="m5 12 5 5L20 7"/>', chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>', eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    egg: '<path d="M12 3c3.6 0 6.5 5.3 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.3 8.4 3 12 3z"/>',
    split: '<path d="M12 3v18M5 8l-3 4 3 4M19 8l3 4-3 4"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  function icon(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[n] || '') + '</svg>'; }

  /* ---------- navigatie ---------- */
  var page = 'home', sess = null, samen = null, toets = null, bieb = null, hatch = null, chk = null;
  function go(pg) { stopSpeak(); stopTimers(); page = pg; render(); window.scrollTo(0, 0); }
  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function stopTimers() { timers.forEach(clearTimeout); timers = []; if (tick) { clearInterval(tick); tick = null; } }
  var tick = null;

  function render() {
    applyLook();
    var p = P(), app = $('#app');
    if (!p) { app.innerHTML = onboarding(); return; }
    var body = { home: home, sessie: sessieView, samen: samenView, toets: toetsView, bieb: biebView, groei: groeiView, rapport: rapportView, instellingen: instellingenView, eieren: eierenView, vriendjes: vriendjesView, check: checkView }[page] || home;
    var focus = page === 'sessie' || (page === 'check' && chk && chk.phase !== 'intro' && chk.phase !== 'done') || (page === 'eieren' && hatch && !hatch.revealed) || (page === 'samen' && samen && (samen.phase === 'run' || samen.phase === 'last')) || (page === 'toets' && toets && (toets.phase === 'run' || toets.phase === 'last'));
    app.innerHTML = (focus ? '' : topbar(p)) + '<main class="main ' + page + '">' + body(p) + '</main>' + (focus ? '' : navbar());
    after();
  }
  function topbar(p) {
    return '<header class="top"><button class="brand" data-a="nav" data-p="home"><span class="logo">L</span>LeesRijk</button><button class="who" data-a="players">' + icon('users') + '<span>' + esc(p.name) + '</span></button></header>';
  }
  function navbar() {
    var items = [['home', 'Vandaag', 'play'], ['samen', 'Samen', 'heart'], ['bieb', 'Boeken', 'book'], ['vriendjes', 'Vriendjes', 'egg'], ['groei', 'Groei', 'star'], ['rapport', 'Ouders', 'chart']];
    return '<nav class="nav">' + items.map(function (it) { return '<button data-a="nav" data-p="' + it[0] + '" class="' + (page === it[0] ? 'on' : '') + '">' + icon(it[2]) + '<span>' + it[1] + '</span></button>'; }).join('') + '</nav>';
  }
  var afterFns = [];
  function after() { var f = afterFns; afterFns = []; f.forEach(function (fn) { fn(); }); fitAll(); }
  /* Maak lange woorden kleiner tot ze in hun vak passen. Bij keuzeknoppen krijgen alle knoppen dezelfde grootte,
     zodat de lengte van de letters niet verraadt welk woord het goede is. */
  /* hoeveel ruimte heeft de tekst, en hoeveel heeft hij nodig? (bij knoppen meten we de tekst zelf, in <span class="t">) */
  function need(el) { var t = el.querySelector(':scope > .t'); return t ? t.getBoundingClientRect().width : el.scrollWidth; }
  function room(el) { var cs = getComputedStyle(el); return el.querySelector(':scope > .t') ? el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : el.clientWidth; }
  function shrink(el, minPx) {
    for (var k = 0; k < 8 && need(el) > room(el) + 1; k++) {
      var fs = parseFloat(getComputedStyle(el).fontSize), nf = Math.max(minPx, fs * (room(el) / need(el)) * .96); el.style.fontSize = nf + 'px';
      if (nf <= minPx) break;
    }
  }
  function fitAll() {
    var q = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
    q('.fword, .bigword, .word.big, .lvcard b').forEach(function (el) { shrink(el, 12); });
    /* tik-rijen (hakken, zoeken): eerst kleiner, maar niet kleiner dan een vingertop; past het dan nog niet, dan op twee regels */
    q('.hakword, .lrow').forEach(function (el) { el.classList.remove('wrap'); shrink(el, el.classList.contains('lrow') ? 23 : 26); if (need(el) > room(el) + 1) el.classList.add('wrap'); });
    [['.opts', '.opt'], ['.tcard', '.tw']].forEach(function (g) {
      q(g[0]).forEach(function (box) {
        var items = Array.prototype.slice.call(box.querySelectorAll(g[1])); if (!items.length) return;
        for (var k = 0; k < 6; k++) {
          var ratio = 1; items.forEach(function (el) { var r = room(el) / Math.max(1, need(el)); if (r < ratio) ratio = r; });
          if (ratio >= 1) break;
          var fs = parseFloat(getComputedStyle(items[0]).fontSize) * ratio * .96; if (fs < 11) fs = 11;
          items.forEach(function (el) { el.style.fontSize = fs + 'px'; });
          if (fs <= 11) break;
        }
      });
    });
  }
  /* bij draaien of een ander venster: opnieuw passend maken, zonder het scherm opnieuw op te bouwen (dan blijft getypte tekst staan) */
  window.addEventListener('resize', function () { clearTimeout(fitAll.t); fitAll.t = setTimeout(function () { Array.prototype.slice.call(document.querySelectorAll('.fword, .bigword, .word.big, .hakword, .lrow, .lvcard b, .opt, .tcard .tw, .qopt')).forEach(function (el) { el.style.fontSize = ''; }); fitAll(); }, 150); });

  /* ---------- start en spelers ---------- */
  function onboarding() {
    return '<main class="main welcome"><div class="card hero"><span class="logo big">L</span><h1>Welkom bij LeesRijk</h1><p>Elke dag een kwartiertje lezen oefenen, stap voor stap. Eerst precies, dan sneller.</p>' +
      '<label class="field"><span>Hoe heet je?</span><input id="newname" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Bijvoorbeeld Emmanuel"></label>' +
      '<label class="field"><span>In welke groep zit je?</span><select id="newgroep">' + [3, 4, 5, 6, 7, 8].map(function (g) { return '<option value="' + g + '"' + (g === 6 ? ' selected' : '') + '>Groep ' + g + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn big" data-a="create">' + icon('play') + ' Beginnen</button><p class="small">Je voortgang wordt bewaard onder een eigen code, zodat je op elk apparaat verder kunt lezen.</p></div>' +
      '<div class="card hero sync-join"><h2>Lees je al op een ander apparaat?</h2><p class="small">Kijk daar bij Instellingen, onder Op andere apparaten. Vul die code hier in.</p><label class="field"><span>Code</span><input id="joincode" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="KBTQ-7M4X"></label><button class="btn ghost" data-a="syncadd">Voortgang ophalen</button></div></main>';
  }
  function playersModal() {
    modal('<h2>Wie gaat er lezen?</h2><div class="plist">' + store.players.map(function (p) { return '<button class="pbtn ' + (p.id === P().id ? 'on' : '') + '" data-a="pick" data-id="' + p.id + '"><b>' + esc(p.name) + '</b><small>Week ' + p.week + ' · ' + p.stars + ' sterren</small></button>'; }).join('') +
      '</div><label class="field"><span>Nieuwe lezer</span><input id="newname" maxlength="20" autocomplete="off" placeholder="Naam"></label><label class="field"><span>Groep</span><select id="newgroep">' + [3, 4, 5, 6, 7, 8].map(function (g) { return '<option value="' + g + '">Groep ' + g + '</option>'; }).join('') + '</select></label><button class="btn" data-a="create">Toevoegen</button><details class="sync-more"><summary>Lezer van een ander apparaat toevoegen</summary><label class="field"><span>Code</span><input id="joincode" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="KBTQ-7M4X"></label><button class="btn ghost" data-a="syncadd">Voortgang ophalen</button></details><button class="btn ghost" data-a="nav" data-p="instellingen">' + icon('gear') + ' Instellingen van ' + esc(P().name) + '</button>');
  }
  function modal(html) { var d = $('#modal'); d.innerHTML = '<button class="x" data-a="close" aria-label="Sluiten">' + icon('x') + '</button>' + html; if (!d.open) d.showModal(); }
  function closeModal() { var d = $('#modal'); if (d.open) d.close(); }

  /* ---------- home ---------- */
  function home(p) {
    var wk = E.week(p.week), ws = W(p), done = p.days[today()], streak = streakDays(p), due = E.dueWords(p.rev, Date.now(), 99).length;
    var ready = E.weekReady(ws) && p.week < 12;
    var needCheck = !p.checks.length || Date.now() - new Date(p.checks[p.checks.length - 1].date).getTime() > 28 * 864e5;
    return (needCheck ? '<button class="card go test" data-a="checkstart">' + icon('eye') + '<div><b>' + (p.checks.length ? 'Tijd voor een nieuwe niveaucheck' : 'Doe eerst de niveaucheck') + '</b><small>5 minuten. Zo weet LeesRijk welke woorden bij jou passen. Je krijgt 2 eieren.</small></div></button>' : '') + (p.eggs ? '<button class="card go eggs" data-a="nav" data-p="eieren"><span class="egg-mini" style="--c1:' + V.groups[p.eggGroup].tint + ';--c2:' + V.groups[p.eggGroup].color + '"></span><div><b>Je hebt ' + p.eggs + (p.eggs === 1 ? ' ei' : ' eieren') + ' om open te maken!</b><small>Wie zit erin? Tik hier.</small></div></button>' : '') +
      '<section class="card hello">' + (p.fav !== null ? '<img class="hello-pet" src="' + V.pets[p.fav].image + '" alt="' + esc(V.pets[p.fav].name) + '">' : '') + '<div><p class="eyebrow">WEEK ' + p.week + ' VAN 12</p><h1>' + esc(wk.short || wk.title) + '</h1><p>' + esc(wk.title) + '</p></div>' +
      '<div class="weekdots">' + Array.from({ length: 12 }, function (_, i) { var n = i + 1; return '<i class="' + (n < p.week ? 'done' : n === p.week ? 'now' : '') + '" title="Week ' + n + '"></i>'; }).join('') + '</div></section>' +
      (done ? '<div class="card today-done">' + icon('check') + '<div><b>Je hebt vandaag geoefend. Goed gedaan!</b><small>Morgen komt er een nieuwe oefening.</small></div><button class="btn ghost" data-a="start">Nog een keer</button></div>'
        : '<button class="card go primary" data-a="start"><span class="playdot">' + icon('play') + '</span><div><b>Start de oefening van vandaag</b><small>Ongeveer 10 minuten' + (due ? ' · ' + due + ' herhaalwoorden' : '') + '</small></div></button>') +
      '<button class="card go alt" data-a="nav" data-p="samen">' + icon('heart') + '<div><b>Samen lezen</b><small>5 minuten hardop lezen met papa of mama. Zij luisteren en tikken fouten aan.</small></div></button>' +
      '<div class="row3"><div class="stat">' + icon('star') + '<b>' + p.stars + '</b><span>sterren</span></div><div class="stat">' + icon('flag') + '<b>' + streak + '</b><span>' + (streak === 1 ? 'dag' : 'dagen') + ' op rij</span></div><div class="stat">' + icon('book') + '<b>' + p.books.length + '</b><span>' + (p.books.length === 1 ? 'boek' : 'boeken') + ' in je kast</span></div></div>' +
      (ready ? '<div class="card note good">' + icon('flag') + '<div><b>Klaar voor week ' + (p.week + 1) + '!</b><p>Deze week ging goed. Wil je door naar de volgende stap?</p><button class="btn" data-a="nextweek">Naar week ' + (p.week + 1) + '</button></div></div>' : p.week < 12 ? weekGoal(ws, p.week + 1) : '') +
      (testDue(p) ? '<button class="card go test" data-a="nav" data-p="toets">' + icon('timer') + '<div><b>Leestoets van deze week</b><small>2 minuten met papa of mama: hoeveel woorden lees je in één minuut?</small></div></button>' : '');
  }
  /* laat zien wat er nog nodig is voor de volgende week, zodat niemand zich afvraagt waarom het niet doorgaat */
  function weekGoal(ws, next) {
    var g = E.weekProgress(ws), pct = g.acc === null ? null : Math.round(g.acc * 100), need = Math.round(g.needAcc * 100);
    var s1 = g.sessions >= g.needSessions, s2 = pct !== null && pct >= need;
    return '<div class="card goal"><b>Op weg naar week ' + next + '</b><ul>' +
      '<li class="' + (s1 ? 'ok' : '') + '">' + (s1 ? icon('check') : '') + 'Oefeningen deze week: <b>' + Math.min(g.sessions, g.needSessions) + ' van ' + g.needSessions + '</b></li>' +
      '<li class="' + (s2 ? 'ok' : '') + '">' + (s2 ? icon('check') : '') + 'Goed bij hakken, zoeken, lang/kort en dictee: <b>' + (pct === null ? 'nog niet genoeg gedaan' : pct + '%') + '</b> (' + need + '% nodig, laatste 20 per onderdeel)</li></ul>' +
      '<p class="small">Flitsen telt niet mee: dat wordt vanzelf moeilijker als het goed gaat. </p><button class="btn ghost" data-a="nextweek" data-ask="1">Ouders: door naar week ' + next + '</button></div>';
  }
  function streakDays(p) { var n = 0, d = new Date(); for (var i = 0; i < 400; i++) { var k = d.toISOString().slice(0, 10); if (p.days[k]) n++; else if (i > 0) break; d.setDate(d.getDate() - 1); } return n; }
  function testDue(p) { var t = p.tests[p.tests.length - 1]; return !t || (Date.now() - new Date(t.date).getTime()) > 6 * 864e5; }

  /* ================= DE OEFENING VAN VANDAAG ================= */
  /* Elke dag andere woorden: we kiezen steeds eerst wat het langst niet (of nog nooit) aan bod is geweest. */
  function buildSession(p) {
    var n = p.week, wk = E.week(n), r = Math.random, rules = E.ruleWeeks(n), steps = [], seen = p.seen, used = [];
    var pick = function (list, k) { var out = E.fresh(list.filter(function (x) { return used.indexOf(x) < 0; }), k, seen, r); used = used.concat(out); return out; };
    /* op niveau: uit de woorden die het langst niet geweest zijn, kies die het dichtst bij haar niveau liggen (ongeveer 80% kans) */
    var target = LL.mastery(p.lv.lezen) - .4;
    var pickNear = function (list, k, pseudo) { var c = E.fresh(list.filter(function (x) { return used.indexOf(x) < 0; }), k * 3, seen, r); c.sort(function (a, b) { return Math.abs(LL.difficulty(a, pseudo) - target) - Math.abs(LL.difficulty(b, pseudo) - target) + (r() - .5) * .8; }); var out = c.slice(0, k); used = used.concat(out); return out; };
    steps.push({ type: 'regel' });
    var syllWeeks = rules.some(function (w) { return w.mode === 'syll'; }), patWeeks = rules.filter(function (w) { return w.mode !== 'syll'; });
    var words = E.wordsFor(n, r);
    if (syllWeeks) steps.push({ type: 'hak', items: pickNear(words.filter(function (w) { return E.syllables(w).length >= 2; }), 6) });
    if (patWeeks.length) {
      var pw = E.fresh(patWeeks.map(function (w) { return 'wk' + w.n; }), 1, seen, r)[0], pwk = E.week(+pw.slice(2)); E.markSeen(seen, [pw]);
      var cand = (pwk.words || []).concat(D.pools[pwk.n] || []).filter(function (w) { return E.patternSpans(w, pwk).length; });
      steps.push({ type: 'zoek', wk: pwk.n, items: pick(cand, 6) });
    }
    var lk = words.filter(function (w) { return E.vowelLength(w); }), lkWeek = rules.some(function (w) { return w.n === 3 || w.n === 4; });
    if (lkWeek || (n >= 5 && lk.length >= 4)) {
      if (n <= 5) (E.week(3).sort_task || []).forEach(function (w) { if (lk.indexOf(w) < 0) lk.push(w); });
      steps.push({ type: 'lang', items: pick(lk, lkWeek ? 6 : 4) });
    }
    var due = E.dueWords(p.rev, Date.now(), 3);
    var fl = due.map(function (w) { return { w: w, pseudo: false, review: true }; });
    pickNear(words.filter(function (w) { return due.indexOf(w) < 0; }), 7 - Math.min(due.length, 2)).forEach(function (w) { fl.push({ w: w, pseudo: false }); });
    pickNear(E.nonwordsFor(n, r), 3, true).forEach(function (w) { fl.push({ w: w, pseudo: true }); });
    steps.push({ type: 'flits', items: E.shuffle(fl, r) });
    var sp = [];
    rules.forEach(function (w) { (w.spell || []).forEach(function (x) { sp.push(x); }); });
    (wk.spell || []).forEach(function (x) { if (sp.indexOf(x) < 0) sp.push(x); });
    var dict = pick(sp, p.groep >= 5 ? 3 : 4);
    if (p.groep >= 5) dict = dict.concat([LS.verbItem(r), LS.verbItem(r)]);
    steps.push({ type: 'dictee', items: dict });
    steps.push({ type: 'klaar' });
    E.markSeen(seen, used); save();
    return { week: n, steps: steps, si: 0, ii: 0, st: {}, started: Date.now(), right: 0, total: 0 };
  }
  function cur() { return sess.steps[sess.si]; }
  function item() { var s = cur(); return s.items ? s.items[sess.ii] : null; }
  var STEP_NAMES = { regel: 'De regel', hak: 'Hakken', zoek: 'Zoek het stukje', lang: 'Lang of kort?', flits: 'Flitsen', dictee: 'Dictee', klaar: 'Klaar!' };
  function sessieView(p) {
    if (!sess) sess = buildSession(p);
    var s = cur(), n = sess.steps.length - 1;
    var head = '<div class="shead"><button class="ghost" data-a="quit">' + icon('back') + ' Stoppen</button><div class="sprog">' + sess.steps.slice(0, n).map(function (x, i) { return '<i class="' + (i < sess.si ? 'done' : i === sess.si ? 'now' : '') + '"></i>'; }).join('') + '</div><span class="sname">' + STEP_NAMES[s.type] + (s.items ? ' ' + (sess.ii + 1) + '/' + s.items.length : '') + '</span></div>';
    return head + '<section class="card ex ex-' + s.type + '">' + ({ regel: exRegel, hak: exHak, zoek: exZoek, lang: exLang, flits: exFlits, dictee: exDictee, klaar: exKlaar }[s.type])(p, s) + '</section>';
  }
  function nextItem() {
    var s = cur(); sess.st = {};
    if (s.items && sess.ii < s.items.length - 1) { sess.ii++; }
    else { sess.si++; sess.ii = 0; }
    render(); autoRead();
  }
  function autoRead() {
    var p = P(), s = cur(); if (!p.settings.read || !s) return;
    var t = { regel: null, hak: 'Hak het woord in stukjes. Tik tussen de letters.', zoek: 'Tik de letters van het lastige stukje aan.', lang: 'Klinkt de eerste klank lang of kort?', flits: null, dictee: null }[s.type];
    if (t && sess.ii === 0) speak(t);
    if (s.type === 'dictee') later(function () { sayDictee(); }, 400);
  }

  /* -- regel -- */
  function exRegel(p) {
    var wk = E.week(sess.week), rules = E.ruleWeeks(sess.week);
    if (wk.review) {
      return '<p class="eyebrow">HERHALING</p><h2>' + esc(wk.title) + '</h2><ul class="rules">' + rules.map(function (r) { return '<li><b>Week ' + r.n + ': ' + esc(r.short || r.title) + '.</b> ' + r.rule[0] + '</li>'; }).join('') + '</ul>' +
        '<div class="actions"><button class="btn ghost" data-a="sayrule">' + icon('sound') + ' Lees voor</button><button class="btn" data-a="next">Begin ' + icon('play') + '</button></div>';
    }
    return '<p class="eyebrow">DE REGEL VAN WEEK ' + wk.n + '</p><h2>' + esc(wk.title) + '</h2><ul class="rules">' + wk.rule.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
      '<div class="examples">' + wk.examples.map(function (e) { var w = e[0].indexOf('|') >= 0 ? e[0].split('|').map(function (s, i) { return '<span class="s' + (i % 2) + '">' + s + '</span>'; }).join('') : e[0].replace(/<u>/g, '<b class="hl">').replace(/<\/u>/g, '</b>'); return '<div class="exw"><span class="word">' + w + '</span>' + (e[1] ? '<small>' + esc(e[1]) + '</small>' : '') + '</div>'; }).join('') + '</div>' +
      '<p class="tip">' + icon('eye') + ' ' + esc(wk.tip) + '</p><div class="actions"><button class="btn ghost" data-a="sayrule">' + icon('sound') + ' Lees voor</button><button class="btn" data-a="next">Begrepen, begin ' + icon('play') + '</button></div>';
  }
  function sayRule() { var wk = E.week(sess.week), rules = E.ruleWeeks(sess.week); var t = wk.review ? rules.map(function (r) { return r.rule[0]; }).join(' ') : wk.rule.join(' '); speak(t.replace(/<[^>]+>/g, ''), { force: true }); }

  /* -- hakken: tik tussen de letters -- */
  function exHak(p) {
    var w = item(), st = sess.st; st.cuts = st.cuts || [];
    var letters = w.split(''), html = '';
    letters.forEach(function (c, i) {
      html += '<span class="lt">' + esc(c) + '</span>';
      if (i < letters.length - 1) html += '<button class="gap ' + (st.cuts.indexOf(i + 1) >= 0 ? 'on' : '') + (st.show ? ' lock' : '') + '" data-a="gap" data-i="' + (i + 1) + '" aria-label="Knip na letter ' + (i + 1) + '"><i></i></button>';
    });
    var fb = '';
    if (st.show) fb = '<div class="fb ' + (st.ok ? 'good' : 'oops') + '"><b>' + (st.ok ? 'Goed gehakt!' : 'Zo hak je het:') + '</b><span class="word big">' + sylHtml(w, true) + '</span><small>' + hakWhy(w) + '</small></div>';
    return '<p class="ask">Hak het woord in stukjes. Tik tussen de letters waar je wilt knippen.</p><div class="hakword">' + html + '</div>' + fb +
      '<div class="actions">' + (st.show ? '<button class="btn" data-a="next">Volgende ' + icon('play') + '</button>' : '<button class="btn ghost" data-a="sayword">' + icon('sound') + ' Hoor het woord</button><button class="btn" data-a="checkhak" ' + (st.cuts.length ? '' : 'disabled') + '>' + icon('check') + ' Kijk na</button>') + '</div>';
  }
  function hakWhy(w) {
    var sy = E.syllables(w), v = (w.match(/[aeiouy]+|ij/g) || []).length;
    return sy.length + ' stukjes. In elk stukje zit één klinkerklank.' + (/([bdfgklmnprstvz])\1/.test(w) ? ' Twee dezelfde medeklinkers? Daar hak je tussen.' : '');
  }
  function checkHak() {
    var w = item(), st = sess.st, sy = E.syllables(w), want = [], at = 0;
    sy.slice(0, -1).forEach(function (s) { at += s.length; want.push(at); });
    var got = st.cuts.slice().sort(function (a, b) { return a - b; });
    st.ok = got.length === want.length && got.every(function (x, i) { return x === want[i]; });
    st.show = true; tally('hak', st.ok); E.notePattern(P().pat, w, st.ok); lvRead(w, st.ok, LL.TASK.hak); score(st.ok); save(); render();
    if (P().settings.read) speak(sy.join(' ... ') + ' ... ' + w);
  }

  /* -- zoek het stukje: tik de letters van het patroon -- */
  function exZoek(p, s) {
    var w = item(), wk = E.week(s.wk), st = sess.st; st.sel = st.sel || [];
    var spans = E.patternSpans(w, wk), want = [];
    spans.forEach(function (sp) { for (var i = sp[0]; i < sp[1]; i++) want.push(i); });
    var letter = function (c, i) { var on = st.sel.indexOf(i) >= 0, mark = st.show ? (want.indexOf(i) >= 0 ? (on ? 'right' : 'missed') : (on ? 'wrong' : '')) : (on ? 'on' : ''); return '<button class="lbtn ' + mark + '" data-a="sel" data-i="' + i + '" ' + (st.show ? 'disabled' : '') + '>' + esc(c) + '</button>'; };
    /* lange woorden: per lettergreep bij elkaar houden, zodat de rij netjes afbreekt tussen de stukjes */
    var html = '', at0 = 0; E.syllables(w).forEach(function (sy) { html += '<span class="lgrp">' + sy.split('').map(function (c, k) { return letter(c, at0 + k); }).join('') + '</span>'; at0 += sy.length; }); if (at0 !== w.length) html = w.split('').map(letter).join('');
    var fb = st.show ? '<div class="fb ' + (st.ok ? 'good' : 'oops') + '"><b>' + (st.ok ? 'Precies goed!' : 'Kijk, dit is het stukje:') + '</b><span class="word big">' + weekHelp(w, wk) + '</span><small>' + esc(wk.tip) + '</small></div>' : '';
    return '<p class="ask">' + esc(zoekVraag(wk)) + '</p><div class="lrow">' + html + '</div>' + fb +
      '<div class="actions">' + (st.show ? '<button class="btn" data-a="next">Volgende ' + icon('play') + '</button>' : '<button class="btn ghost" data-a="sayword">' + icon('sound') + ' Hoor het woord</button><button class="btn" data-a="checkzoek" ' + (st.sel.length ? '' : 'disabled') + '>' + icon('check') + ' Kijk na</button>') + '</div>';
  }
  function zoekVraag(wk) {
    return { 1: 'Tik de letters aan van de klank met twee letters, of van de medeklinkers op een rij.', 6: 'Tik het vaste eindje aan.', 7: 'Tik het vaste begin- of eindstuk aan.', 11: 'Tik de letters aan die je anders uitspreekt.' }[wk.n] || 'Tik de letters van het lastige stukje aan.';
  }
  function checkZoek() {
    var s = cur(), w = item(), wk = E.week(s.wk), st = sess.st, want = [];
    E.patternSpans(w, wk).forEach(function (sp) { for (var i = sp[0]; i < sp[1]; i++) want.push(i); });
    st.ok = want.length === st.sel.length && want.every(function (i) { return st.sel.indexOf(i) >= 0; });
    st.show = true; tally('zoek', st.ok); E.notePattern(P().pat, w, st.ok); score(st.ok); save(); render();
  }

  /* -- lang of kort -- */
  function exLang(p) {
    var w = item(), st = sess.st, sy = E.syllables(w), v = (sy[0].match(/[aeou]/) || ['a'])[0], ans = E.vowelLength(w);
    var fb = '';
    if (st.show) fb = '<div class="fb ' + (st.ok ? 'good' : 'oops') + '"><b>' + (st.ok ? 'Goed!' : 'Het is ' + ans + '.') + '</b><span class="word big">' + sylHtml(w, true) + '</span><small>' + langWhy(w, ans) + '</small></div>';
    return '<p class="ask">Hoe klinkt de <b>' + v + '</b> in het eerste stukje?</p><div class="bigword">' + esc(w) + '</div>' + fb +
      '<div class="actions two">' + (st.show ? '<button class="btn" data-a="next">Volgende ' + icon('play') + '</button>' : '<button class="btn choice" data-a="lk" data-v="lang"><b>' + v + v + '</b>lang</button><button class="btn choice" data-a="lk" data-v="kort"><b>' + v + '</b>kort</button>') + '</div>';
  }
  function langWhy(w, ans) {
    var sy = E.syllables(w);
    if (/^ch/.test(sy[1] || '')) return 'Bij ch is de klank ervoor kort: ' + sy.join('-') + '.';
    return 'Het eerste stukje is ' + (ans === 'lang' ? 'open (het eindigt op een klinker), dus de klank is lang' : 'dicht (het eindigt op een medeklinker), dus de klank is kort') + ': ' + sy.join('-') + '.';
  }
  function answerLang(v) {
    var w = item(), st = sess.st; if (st.show) return;
    st.ok = E.vowelLength(w) === v; st.show = true; tally('lang', st.ok); E.notePattern(P().pat, w, st.ok); score(st.ok); save(); render();
    if (P().settings.read) speak(w);
  }

  /* -- flitsen: woord kort zien, dan kiezen -- */
  function exFlits(p) {
    var it = item(), st = sess.st, f = it.pseudo ? p.flashP : p.flashW;
    if (!st.phase) st.phase = 'ready';
    if (st.phase === 'ready') return '<p class="ask">' + (it.pseudo ? 'Een <b>onzinwoord</b>. Kijk goed: het is maar heel even te zien.' : 'Kijk naar het kruisje. Het woord is maar heel even te zien.') + '</p><div class="flashbox"><span class="fix">+</span></div><p class="small center">' + f.ms + ' milliseconden' + (it.review ? ' · herhaalwoord' : '') + '</p><div class="actions"><button class="btn big" data-a="flash">' + icon('eye') + ' Ik ben klaar</button></div>';
    if (st.phase === 'fix') return '<div class="flashbox"><span class="fix">+</span></div>';
    if (st.phase === 'show') return '<div class="flashbox"><span class="fword">' + esc(it.w) + '</span></div>';
    if (st.phase === 'mask') return '<div class="flashbox"><span class="fword mask">' + '#'.repeat(Math.max(4, it.w.length)) + '</span></div>';
    var opts = st.opts || (st.opts = E.shuffle([it.w].concat(E.distractors(it.w, 3)), Math.random));
    var fb = st.show ? '<div class="fb ' + (st.ok ? 'good' : 'oops') + '"><b>' + (st.ok ? 'Goed gezien!' : 'Het was:') + '</b><span class="word big">' + sylHtml(it.w, true) + '</span></div>' : '';
    return '<p class="ask">Welk woord zag je?</p><div class="opts' + (Math.max.apply(null, opts.map(function (o) { return o.length; })) > 11 ? ' one' : '') + '">' + opts.map(function (o) { var cls = st.show ? (o === it.w ? 'right' : o === st.pickd ? 'wrong' : 'dim') : ''; return '<button class="opt ' + cls + '" data-a="fpick" data-w="' + esc(o) + '" ' + (st.show ? 'disabled' : '') + '><span class="t">' + esc(o) + '</span></button>'; }).join('') + '</div>' + fb +
      (st.show ? '<div class="actions"><button class="btn" data-a="next">Volgende ' + icon('play') + '</button></div>' : '');
  }
  function runFlash() {
    var it = item(), st = sess.st, p = P(), f = it.pseudo ? p.flashP : p.flashW;
    st.phase = 'fix'; st.ms = st.ms || f.ms; render();
    later(function () { st.phase = 'show'; render(); later(function () { st.phase = 'mask'; render(); later(function () { st.phase = 'pick'; render(); }, 250); }, f.ms); }, 600);
  }
  function pickFlash(w) {
    var it = item(), st = sess.st, p = P(); if (st.show) return;
    st.pickd = w; st.ok = w === it.w; st.show = true;
    E.flashStep(it.pseudo ? p.flashP : p.flashW, st.ok); lvRead(it.w, st.ok, LL.flashTask(st.ms || 700), it.pseudo);
    tally('flits', st.ok); if (!it.pseudo) { E.notePattern(p.pat, it.w, st.ok); if (st.ok) E.reviewHit(p.rev, it.w); else E.reviewMiss(p.rev, it.w); }
    score(st.ok); save(); render();
    if (p.settings.read && !it.pseudo) speak(it.w);
  }

  /* -- dictee: woorden met spellingcategorie, en werkwoordspelling in een zin -- */
  function sayDictee() {
    var it = item(); if (!it || !canSpeak()) return; var r = Math.min(.85, P().settings.rate);
    if (typeof it === 'string') speak(it + '. ... ' + it + '.', { rate: r });
    else speak((it.before + it.answer + it.after).replace(/\s+/g, ' ') + ' ... ' + it.answer + '.', { rate: r });
  }
  function exDictee(p) {
    var it = item(), st = sess.st, voice = canSpeak(), ww = typeof it !== 'string', w = ww ? it.answer : it;
    if (!voice && !st.seen && !ww) {
      return '<p class="ask">Kijk goed naar het woord. Zo meteen verdwijnt het en schrijf jij het op.</p><div class="bigword">' + sylHtml(w, p.settings.syl) + '</div><div class="actions"><button class="btn" data-a="seen">Ik heb het goed bekeken</button></div>';
    }
    var fb = '';
    if (st.show) {
      var why = ww ? (st.ok ? it.hint : LS.verbDiagnose(st.val, it)) : (st.ok ? '' : (st.cat ? '<b>' + esc(LS.CAT[st.cat].name) + ':</b> ' + esc(LS.CAT[st.cat].rule) : spellTip(w)));
      fb = '<div class="fb ' + (st.ok ? 'good' : 'oops') + '"><b>' + (st.ok ? 'Goed geschreven!' : 'Zo schrijf je het:') + '</b><span class="word big">' + (ww ? esc(it.display || it.answer) : sylHtml(w, true)) + '</span>' + (st.ok && !ww ? '' : '<small>' + (st.ok ? '' : 'Jij schreef: <span class="diff">' + diffHtml(st.val, w.toLowerCase()) + '</span>. ') + why + '</small>') + '</div>';
    }
    var copy = st.show && !st.ok && !st.copied;
    var input = '<input id="dict" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text" enterkeyhint="done" aria-label="Typ het woord" placeholder="' + (ww ? '...' : copy ? 'Nog een keer, goed' : 'Typ hier') + '">';
    var body = ww ? '<p class="ask">Vul het werkwoord in: <b>' + esc(it.inf) + '</b></p><div class="wwline">' + esc(it.before) + (st.show && !copy ? '<b class="wwans">' + esc(it.display || it.answer) + '</b>' : '<span class="typebox inline">' + input + '</span>') + esc(it.after) + '</div>'
      : '<p class="ask">' + (voice ? 'Luister en schrijf het woord op.' : 'Schrijf het woord op dat je net zag.') + '</p>' + (st.show && !copy ? '' : '<div class="typebox">' + input + '</div>');
    return body + (voice ? '<div class="actions"><button class="btn ghost" data-a="dictsay">' + icon('sound') + ' ' + (ww ? 'Lees de zin voor' : 'Nog een keer horen') + '</button></div>' : '') + fb +
      '<div class="actions">' + (st.show && !copy ? '<button class="btn" data-a="next">Volgende ' + icon('play') + '</button>' : '<button class="btn" data-a="checkdict">' + icon('check') + ' ' + (copy ? 'Klaar' : 'Kijk na') + '</button>') + '</div>';
  }
  function spellTip(w) {
    var sy = E.syllables(w), t = E.tags(w);
    if (t.indexOf('dicht') >= 0) return 'Korte klank in een dicht stukje: twee medeklinkers (' + sy.join('-') + ').';
    if (t.indexOf('open') >= 0) return 'Lange klank aan het eind van een stukje: één letter (' + sy.join('-') + ').';
    if (/(ig|lijk)$/.test(w)) return 'Het eindje klinkt als "ug" of "luk", maar je schrijft -ig of -lijk.';
    if (sy.length >= 2) return 'Schrijf het stukje voor stukje: ' + sy.join(' - ') + '.';
    return 'Zeg het woord langzaam en schrijf elke klank op.';
  }
  function diffHtml(a, b) { a = a || ''; var out = ''; for (var i = 0; i < Math.max(a.length, 0); i++) out += a[i] === b[i] ? esc(a[i]) : '<b class="bad">' + esc(a[i]) + '</b>'; return out || '(leeg)'; }
  function checkDict() {
    var el = $('#dict'), it = item(), st = sess.st, ww = typeof it !== 'string', w = (ww ? it.answer : it).toLowerCase(), v = (el ? el.value : '').trim().toLowerCase();
    if (!v) { if (el) el.focus(); return; }
    if (st.show && !st.ok && !st.copied) { if (v === w) { st.copied = true; render(); toast('Goed overgeschreven!'); } else { toast('Kijk nog eens goed.'); el.select(); } return; }
    st.val = v; st.ok = v === w; st.show = true; tally('dictee', st.ok);
    if (ww) { var dd = it.form === 'inv' ? 7.5 : it.form === 'inf' ? 5.5 : /d$/.test(LS.VERBS.find(function (x) { return x[0] === it.inf; })[1]) && it.form === 'stamt' ? 7.8 : 6.5; lvSpell(dd, st.ok, ['ww'], st.ok ? null : 'ww'); }
    else { var cs = LS.cats(w); st.cat = st.ok ? null : LS.diagnose(v, w); lvSpell(LL.difficulty(w), st.ok, cs, st.cat); E.notePattern(P().pat, w, st.ok); if (!st.ok) E.reviewMiss(P().rev, w); }
    score(st.ok); save(); render();
  }

  /* -- klaar -- */
  function score(ok) { sess.total++; if (ok) sess.right++; }
  function finishSession() {
    var p = P(), ws = W(p, sess.week), min = Math.round((Date.now() - sess.started) / 60000);
    ws.sessions++; p.stars += 3 + (sess.total && sess.right / sess.total >= .8 ? 2 : 0);
    p.books.push({ d: today(), w: sess.week }); p.eggs += 4; noteDay(min); save();
  }
  function exKlaar(p) {
    if (!sess.finished) { finishSession(); sess.finished = true; }
    var pct = sess.total ? Math.round(100 * sess.right / sess.total) : 0, ws = W(p, sess.week);
    return '<div class="done"><div class="burst">' + icon('star') + '</div><h2>Klaar voor vandaag!</h2><p>Je deed ' + sess.total + ' oefeningen en had er ' + sess.right + ' goed (' + pct + '%).</p>' +
      '<p class="small">Er staat een nieuw boek in je boekenkast. Flitstijd nu: <b>' + p.flashW.ms + ' ms</b>.</p>' +
      '<div class="egg-row">' + [0, 1, 2, 3].map(function () { return '<span class="egg-mini" style="--c1:' + V.groups[p.eggGroup].tint + ';--c2:' + V.groups[p.eggGroup].color + '"></span>'; }).join('') + '</div><p><b>Je hebt 4 eieren verdiend!</b></p>' +
      '<div class="actions col"><button class="btn big" data-a="nav" data-p="eieren">' + icon('egg') + ' Maak je 4 eieren open</button><button class="btn ghost" data-a="nav" data-p="samen">' + icon('heart') + ' Eerst samen hardop lezen</button><button class="btn ghost" data-a="nav" data-p="home">Terug naar het begin</button></div>' +
      (E.weekReady(ws) && p.week < 12 ? '<p class="small">Deze week ging goed. Op het beginscherm kun je naar week ' + (p.week + 1) + '.</p>' : '') + '</div>';
  }

  /* ================= NIVEAUCHECK: 20 woorden, steeds het woord dat het meest vertelt ================= */
  /* woordenbank: oefenwoorden van alle weken plus extra meetwoorden van heel makkelijk tot groep 8 */
  function checkPool() {
    if (checkPool.c) return checkPool.c; var seen = {}, out = [];
    var add = function (x, pseudo) { if (!seen[x]) { seen[x] = 1; out.push({ w: x, d: LL.difficulty(x, pseudo), pseudo: pseudo }); } };
    D.weeks.forEach(function (w) { (w.words || []).concat(D.pools[w.n] || []).forEach(function (x) { add(x, false); }); (w.nonwords || []).forEach(function (x) { add(x, true); }); });
    (D.bank || []).forEach(function (x) { add(x, false); }); (D.bankPseudo || []).forEach(function (x) { add(x, true); });
    return (checkPool.c = out);
  }
  function startCheck() { chk = { i: 0, seen: [], phase: 'intro', ok: 0 }; go('check'); }
  function nextCheckItem() {
    var p = P(), nx = LL.checkNext(chk, p.lv.lezen, checkPool(), p.groep, Math.random);
    chk.cur = nx.item; chk.ms = nx.ms; chk.task = nx.task; chk.seen.push(nx.item.w); chk.opts = null; chk.show = false; chk.phase = 'fix'; render();
    later(function () { chk.phase = 'show'; render(); later(function () { chk.phase = 'mask'; render(); later(function () { chk.phase = 'pick'; render(); }, 250); }, chk.ms); }, 600);
  }
  /* welke week van de Leesroute past bij dit niveau? */
  function weekAdvice(M) { return M < 1.5 ? 1 : M < 2.5 ? 2 : M < 3.5 ? 3 : M < 4.2 ? 4 : M < 4.8 ? 6 : M < 5.5 ? 7 : M < 6.5 ? 8 : M < 7.5 ? 9 : 11; }
  function checkView(p) {
    if (!chk) return '<section class="card"><h1>Niveaucheck</h1><div class="actions"><button class="btn" data-a="checkstart">Begin</button></div></section>';
    var max = LL.CHECK.max, head = '<div class="shead"><button class="ghost" data-a="checkquit">' + icon('back') + ' Stoppen</button><div class="sprog"><i class="done" style="flex:' + chk.i + '"></i><i class="now" style="flex:1"></i><i style="flex:' + Math.max(0, LL.CHECK.min - chk.i - 1) + '"></i></div><span class="sname">woord ' + (chk.i + 1) + '</span></div>';
    if (chk.phase === 'intro') return '<section class="card ex"><p class="eyebrow">NIVEAUCHECK · ONGEVEER 5 MINUTEN</p><h1>Hoe goed lees jij woorden?</h1><p>Je ziet steeds een woord heel even. Kies daarna welk woord je zag. Gaat het goed, dan worden de woorden moeilijker. Gaat het mis, dan makkelijker. Fouten maken hoort erbij: zo vinden we precies jouw niveau. Na 16 tot 30 woorden ben je klaar.</p><div class="actions"><button class="btn big" data-a="checkgo">' + icon('eye') + ' Start</button></div></section>';
    if (chk.phase === 'done') {
      var ds = LL.describe(p.lv.lezen), wk = weekAdvice(ds.M);
      return '<section class="card ex done"><div class="burst">' + icon('star') + '</div><h2>Klaar!</h2><p>Je las ' + chk.i + ' woorden en had er ' + chk.ok + ' goed.</p><div class="lvcard"><span>Woorden lezen</span><b>' + ds.label + '</b><small>' + ds.detail + '</small></div>' +
        (ds.above ? '<p class="small">Dit is meer dan de check kan meten. Technisch lezen gaat goed; oefen vooral met begrijpend lezen en veel lezen in de bibliotheek.</p>' : ds.below ? '<p class="small">Begin met week 1 van de Leesroute, samen met een volwassene. Oefen eerst de letters en klanken als die nog niet vlot gaan.</p>' : '<p class="small">Een goede plek om te oefenen in de Leesroute: <b>week ' + wk + '</b>' + (wk !== p.week ? ' (nu week ' + p.week + '). <button class="linkbtn" data-a="setweek" data-n="' + wk + '">Naar week ' + wk + '</button>' : '.') + '</p>') +
        '<p class="small">Dit wordt steeds preciezer als je elke dag oefent. Je krijgt 2 eieren!</p><div class="actions col"><button class="btn" data-a="nav" data-p="eieren">' + icon('egg') + ' Eieren openmaken</button><button class="btn ghost" data-a="nav" data-p="home">Terug</button></div></section>';
    }
    var c = chk.cur, body;
    if (chk.phase === 'fix') body = '<div class="flashbox"><span class="fix">+</span></div>';
    else if (chk.phase === 'show') body = '<div class="flashbox"><span class="fword">' + esc(c.w) + '</span></div>';
    else if (chk.phase === 'mask') body = '<div class="flashbox"><span class="fword mask">' + '#'.repeat(Math.max(4, c.w.length)) + '</span></div>';
    else { var opts = chk.opts || (chk.opts = E.shuffle([c.w].concat(E.distractors(c.w, 3)), Math.random)); body = '<p class="ask">Welk woord zag je?' + (c.pseudo ? ' (een onzinwoord)' : '') + '</p><div class="opts' + (Math.max.apply(null, opts.map(function (o) { return o.length; })) > 11 ? ' one' : '') + '">' + opts.map(function (o) { var cls = chk.show ? (o === c.w ? 'right' : o === chk.pickd ? 'wrong' : 'dim') : ''; return '<button class="opt ' + cls + '" data-a="cpick" data-w="' + esc(o) + '" ' + (chk.show ? 'disabled' : '') + '><span class="t">' + esc(o) + '</span></button>'; }).join('') + '</div>' + (chk.show ? '<div class="actions"><button class="btn" data-a="cnext">Volgende ' + icon('play') + '</button></div>' : ''); }
    return head + '<section class="card ex ex-flits">' + body + '</section>';
  }
  function pickCheck(w) {
    var p = P(), c = chk.cur; if (chk.show) return; chk.pickd = w; chk.show = true; var ok = w === c.w; if (ok) chk.ok++;
    LL.update(p.lv.lezen, c.d, ok ? 1 : 0, chk.task); noteStruct(p, c.w, c.pseudo, ok); save(); render();
  }
  function nextCheck() {
    chk.i++;
    var p = P(), s = p.lv.lezen;
    if (LL.checkDone(chk, s)) { var iv = LL.interval(s), ds = LL.describe(s); p.checks.push({ date: new Date().toISOString(), M: +LL.mastery(s).toFixed(2), lo: +iv[0].toFixed(2), hi: +iv[1].toFixed(2), ok: chk.ok, n: chk.i, label: ds.label }); p.eggs += 2; noteDay(5); save(); chk.phase = 'done'; render(); speak('Klaar! Goed gedaan.'); return; }
    nextCheckItem();
  }

  /* ================= EIEREN EN VRIENDJES (dezelfde 200 vriendjes als in RekenRijk) ================= */
  function petImg(id, cls) { var x = V.pets[id]; return '<img class="pet ' + (cls || '') + '" src="' + x.image + '" alt="' + esc(x.name) + '" loading="lazy" decoding="async" width="320" height="320">'; }
  function eggHtml(g, cls, extra) { var G = V.groups[g]; return '<span class="egg ' + (cls || '') + '" style="--c1:' + G.tint + ';--c2:' + G.color + '"' + (extra || '') + '><i class="spot a"></i><i class="spot b"></i><i class="spot c"></i><i class="crack"></i></span>'; }
  function groupCount(p, g) { return V.groups[g] ? p.pets.filter(function (x) { return V.pets[x].group === g; }).length : 0; }
  /* zelfde kansen als RekenRijk: 3% geheim, 20% zeldzaam, 77% gewoon */
  function rollPet(p, g, r) {
    r = r || Math.random; var roll = r(), rar = roll < .03 ? 'secret' : roll < .23 ? 'rare' : 'common';
    var pool = V.pets.filter(function (x) { return x.group === g && x.rarity === rar; });
    return pool[Math.floor(r() * pool.length)];
  }
  function addPet(p, pet) { var isNew = p.pets.indexOf(pet.id) < 0; if (isNew) p.pets.push(pet.id); p.inv[pet.id] = (p.inv[pet.id] || 0) + 1; if (p.fav === null) p.fav = pet.id; return isNew; }
  function openEgg() {
    var p = P(); if (!p.eggs || (hatch && !hatch.revealed)) return;
    var g = p.eggGroup, pet = rollPet(p, g); p.eggs--; var isNew = addPet(p, pet); save();
    hatch = { pet: pet, isNew: isNew, stage: 0, revealed: false, group: g };
    render(); speak('Ssst. Wie zit er in jouw ei?');
    later(function () { hatch.stage = 1; render(); }, 900);
    later(function () { hatch.stage = 2; render(); }, 1800);
    later(function () { hatch.revealed = true; render(); speak((pet.rarity === 'secret' && isNew ? 'Wauw! Een geheim vriendje! ' : '') + 'Hallo ' + pet.name + '! ' + pet.tag); }, 2700);
  }
  function eierenView(p) {
    if (hatch && !hatch.revealed) {
      var msg = ['Er beweegt iets...', 'Het ei kraakt!', 'Bijna...'][hatch.stage];
      return '<section class="card hatchbox"><h1>' + msg + '</h1>' + eggHtml(hatch.group, 'big wobble s' + hatch.stage) + '<div class="hsteps">' + [0, 1, 2].map(function (i) { return '<i class="' + (i <= hatch.stage ? 'lit' : '') + '"></i>'; }).join('') + '</div></section>';
    }
    if (hatch && hatch.revealed) {
      var x = hatch.pet, G = V.groups[x.group], n = groupCount(p, x.group);
      return '<section class="card hatchbox reveal ' + x.rarity + '" style="--c1:' + G.tint + ';--c2:' + G.color + '"><p class="eyebrow">' + (x.rarity === 'secret' ? 'GEHEIM VRIENDJE' : x.rarity === 'rare' ? 'ZELDZAAM' : G.name.toUpperCase()) + '</p><h1>Hallo, ' + esc(x.name) + '!</h1>' +
        '<div class="petframe">' + petImg(x.id) + '<span class="badge ' + (hatch.isNew ? 'new' : 'dup') + '">' + (hatch.isNew ? 'NIEUW' : 'DUBBEL · ' + p.inv[x.id] + '×') + '</span></div><p class="tagline">' + esc(x.tag) + '</p>' +
        '<div class="gprog"><b>' + esc(G.name) + '</b><span>' + n + ' van de 10</span><div class="bar"><i style="width:' + n * 10 + '%"></i></div></div>' +
        (n === 10 && hatch.isNew ? '<p class="fbline good">' + icon('check') + ' Groep compleet! Kies in je vriendjesboek een nieuwe wereld voor je eieren.</p>' : '') +
        '<div class="actions col">' + (p.eggs ? '<button class="btn big" data-a="nextegg">' + icon('egg') + ' Volgend ei (' + p.eggs + ' over)</button>' : '<button class="btn big" data-a="nav" data-p="vriendjes">' + icon('book') + ' Naar mijn vriendjesboek</button>') +
        (p.fav !== x.id ? '<button class="btn ghost" data-a="fav" data-id="' + x.id + '">' + icon('heart') + ' Maak ' + esc(x.name) + ' mijn maatje</button>' : '') + '</div></section>';
    }
    if (!p.eggs) return '<section class="card center"><h1>Geen eieren meer</h1><p>Na elke oefening van vandaag krijg je 4 nieuwe eieren.</p><div class="actions col"><button class="btn" data-a="start">' + icon('play') + ' Start de oefening</button><button class="btn ghost" data-a="nav" data-p="vriendjes">Naar mijn vriendjesboek</button></div></section>';
    var G2 = V.groups[p.eggGroup];
    return '<section class="card center"><p class="eyebrow">' + esc(G2.name.toUpperCase()) + '</p><h1>Je hebt ' + p.eggs + (p.eggs === 1 ? ' ei' : ' eieren') + '!</h1><p>Tik op een ei om het open te maken.</p><div class="eggs">' +
      Array.from({ length: Math.min(p.eggs, 8) }, function (_, i) { return '<button class="eggbtn" data-a="openegg" aria-label="Maak ei ' + (i + 1) + ' open">' + eggHtml(p.eggGroup, 'idle d' + (i % 4)) + '</button>'; }).join('') + '</div>' +
      (p.eggs > 8 ? '<p class="small">en nog ' + (p.eggs - 8) + ' meer</p>' : '') + '<p class="small">Je eieren komen uit <b>' + esc(G2.name) + '</b> (' + groupCount(p, p.eggGroup) + ' van de 10 gevonden). <button class="linkbtn" data-a="nav" data-p="vriendjes">Andere wereld kiezen</button></p></section>';
  }
  function vriendjesView(p) {
    var found = p.pets.length, secrets = p.pets.filter(function (x) { return V.pets[x].rarity === 'secret'; }).length, done = V.groups.filter(function (g) { return groupCount(p, g.id) === 10; }).length;
    var pickG = '<details class="card gpick"' + (found ? '' : ' open') + '><summary>' + icon('egg') + ' Mijn eieren komen uit: <b>' + esc(V.groups[p.eggGroup].name) + '</b></summary><div class="gchoices">' + V.groups.map(function (g) { return '<button class="gchoice ' + (g.id === p.eggGroup ? 'on' : '') + '" data-a="egggroup" data-g="' + g.id + '" style="--c1:' + g.tint + ';--c2:' + g.color + '">' + eggHtml(g.id, 'tiny') + '<span><b>' + esc(g.name) + '</b><small>' + groupCount(p, g.id) + ' / 10</small></span></button>'; }).join('') + '</div></details>';
    var book = V.groups.map(function (g) {
      var n = groupCount(p, g.id);
      return '<section class="family" style="--c1:' + g.tint + ';--c2:' + g.color + '"><div class="fhead"><h2>' + esc(g.name) + '</h2><span>' + n + ' / 10</span></div><p class="small">' + esc(g.description) + (n < 10 ? '' : ' ' + icon('check') + ' Compleet!') + '</p><div class="pgrid">' +
        V.pets.filter(function (x) { return x.group === g.id; }).map(function (x) {
          var own = p.pets.indexOf(x.id) >= 0, hid = !own && x.rarity === 'secret';
          return '<button class="pcard ' + (own ? 'own' : 'not') + ' ' + x.rarity + (p.fav === x.id ? ' fav' : '') + '" data-a="pet" data-id="' + x.id + '" ' + (own ? '' : 'disabled') + ' aria-label="' + (own ? esc(x.name) : 'Nog niet gevonden') + '">' + (own ? petImg(x.id) : hid ? '<span class="mystery">✦</span>' : '<span class="mystery egged">' + eggHtml(g.id, 'tiny') + '</span>') + '<b>' + (own ? esc(x.name) : '?') + '</b>' + (own && p.inv[x.id] > 1 ? '<em>' + p.inv[x.id] + '×</em>' : '') + '</button>';
        }).join('') + '</div></section>';
    }).join('');
    return '<section class="card"><p class="eyebrow">MIJN VERZAMELING</p><h1>Vriendjesboek</h1><div class="row3"><div class="stat"><b>' + found + '</b><span>van de ' + V.pets.length + '</span></div><div class="stat"><b>' + done + '</b><span>groepen compleet</span></div><div class="stat"><b>' + secrets + '</b><span>geheim</span></div></div>' +
      (p.eggs ? '<button class="btn" data-a="nav" data-p="eieren">' + icon('egg') + ' ' + p.eggs + (p.eggs === 1 ? ' ei' : ' eieren') + ' openmaken</button>' : '<p class="small">Na elke oefening krijg je 4 eieren.</p>') + '</section>' + pickG + book;
  }
  function petModal(id) {
    var p = P(), x = V.pets[id], G = V.groups[x.group], c = p.inv[id] || 1;
    var missing = V.pets.filter(function (y) { return y.group === x.group && p.pets.indexOf(y.id) < 0; });
    modal('<div class="petmodal" style="--c1:' + G.tint + ';--c2:' + G.color + '"><div class="petframe">' + petImg(id) + '</div><p class="eyebrow">' + esc(G.name) + ' · ' + esc(x.kind) + '</p><h2>' + esc(x.name) + '</h2><p>' + esc(x.tag) + '</p><p class="small">Je hebt ' + c + (c === 1 ? ' exemplaar' : ' exemplaren') + '.</p>' +
      '<div class="actions col">' + (p.fav !== id ? '<button class="btn" data-a="fav" data-id="' + id + '">' + icon('heart') + ' Maak mijn maatje</button>' : '<p class="fbline good">' + icon('heart') + ' Dit is je maatje</p>') +
      (c >= 4 && missing.length ? '<button class="btn ghost" data-a="trade" data-id="' + id + '">Ruil 3 ' + esc(x.name) + ' voor een nieuw vriendje uit ' + esc(G.name) + '</button>' : c >= 2 && missing.length ? '<p class="small">Heb je er 4? Dan kun je er 3 ruilen voor een vriendje dat je nog niet hebt.</p>' : '') + '</div></div>');
    speak(x.name + '. ' + x.tag);
  }
  function trade(id) {
    var p = P(), x = V.pets[id], missing = V.pets.filter(function (y) { return y.group === x.group && p.pets.indexOf(y.id) < 0; });
    if ((p.inv[id] || 0) < 4 || !missing.length) return;
    p.inv[id] -= 3; var pet = missing[Math.floor(Math.random() * missing.length)]; addPet(p, pet); save(); closeModal();
    hatch = { pet: pet, isNew: true, stage: 0, revealed: false, group: x.group }; page = 'eieren'; render();
    later(function () { hatch.stage = 1; render(); }, 900); later(function () { hatch.stage = 2; render(); }, 1800);
    later(function () { hatch.revealed = true; render(); speak('Geruild! Hallo ' + pet.name + '! ' + pet.tag); }, 2700);
  }

  /* ================= SAMEN LEZEN (ouder luistert) ================= */
  function samenView(p) {
    if (!samen) return samenMenu(p);
    return samen.kind === 'lijst' ? lijstView(p) : tekstView(p);
  }
  /* Tekst van vandaag: elke dag een andere, maar dezelfde dag dezelfde (voor herhaald lezen) */
  function todayTexts(p, next) {
    var d = E.dayNo(), t = p.today;
    if (!t || t.day !== d || t.week !== p.week || next) {
      var list = E.textsFor(p.week), keys = list.map(function (x) { return 't:' + x.title; });
      if (next && t && t.text) keys = keys.filter(function (k) { return k !== 't:' + t.text; });
      var tk = E.fresh(keys, 1, p.seen)[0];
      var gl = D.weeks.map(function (w) { return 'g:' + w.g6.title; }), own = 'g:' + E.week(p.week).g6.title;
      if (next && t && t.g6) gl = gl.filter(function (k) { return k !== 'g:' + t.g6; });
      var gk = p.seen[own] == null && !next ? own : E.fresh(gl, 1, p.seen)[0];
      E.markSeen(p.seen, [tk, gk]);
      p.today = { day: d, week: p.week, text: tk.slice(2), g6: gk.slice(2) }; save();
    }
    var tx = E.textsFor(p.week).find(function (x) { return x.title === p.today.text; }) || E.textsFor(p.week)[0];
    var gw = D.weeks.find(function (w) { return w.g6.title === p.today.g6; }) || E.week(p.week);
    return { text: tx, g6: { title: gw.g6.title, text: gw.g6.text, vocab: gw.g6.vocab, q: gw.g6.q } };
  }
  function samenMenu(p) {
    var tt = todayTexts(p), last = W(p).reads.slice(-1)[0];
    return '<section class="card"><p class="eyebrow">VOOR PAPA OF MAMA</p><h1>Samen lezen</h1><p>Uw kind leest hardop, u luistert mee. Tik een woord aan als het fout gelezen wordt. Verbeter rustig: zeg het woord goed en laat het kind het nazeggen. Herhaald lezen van dezelfde tekst maakt het lezen vlotter.</p></section>' +
      '<button class="card go" data-a="samen" data-k="tekst" data-t="week">' + icon('book') + '<div><b>Tekst van vandaag: ' + esc(tt.text.title) + '</b><small>3 keer lezen, elke keer met de klok' + (last ? ' · vorige keer ' + last.wpm.join(' → ') + ' woorden per minuut' : '') + '</small></div></button>' +
      '<button class="card go alt" data-a="samen" data-k="tekst" data-t="g6">' + icon('book') + '<div><b>Groep 6-tekst: ' + esc(tt.g6.title) + '</b><small>Moeilijker. Eerst samen luisteren, dan lezen.</small></div></button>' +
      '<button class="card go" data-a="samen" data-k="lijst">' + icon('timer') + '<div><b>Woordenrij: 1 minuut</b><small>Losse woorden van deze week, elke keer andere.</small></div></button>' +
      '<div class="actions"><button class="btn ghost" data-a="othertext">Andere teksten kiezen</button></div>';
  }
  function startSamen(kind, t) {
    var p = P();
    if (kind === 'lijst') {
      var pool = E.wordsFor(p.week, Math.random), prev = p.week > 1 ? E.wordsFor(p.week - 1, Math.random) : [];
      var ws = E.fresh(pool, 50, p.seen).concat(E.fresh(prev.filter(function (x) { return pool.indexOf(x) < 0; }), 30, p.seen)).slice(0, 80);
      E.markSeen(p.seen, ws); save();
      samen = { kind: 'lijst', words: E.shuffle(ws, Math.random), err: [], last: null, phase: 'ready', secs: 60 };
    } else {
      var tt = todayTexts(p), o = t === 'g6' ? tt.g6 : tt.text;
      samen = { kind: 'tekst', which: t, title: o.title, words: E.words(o.text), err: [], round: 1, times: [], wpm: [], errs: [], phase: 'ready', vocab: t === 'g6' ? o.vocab : null, q: t === 'g6' ? o.q : null };
    }
    render();
  }
  function lijstView(p) {
    var s = samen, cols = s.words.map(function (w, i) { var cls = (s.err.indexOf(i) >= 0 ? 'err ' : '') + (s.last !== null && i > s.last ? 'after ' : '') + (s.last === i ? 'last' : ''); return '<button class="rw ' + cls + '" data-a="rw" data-i="' + i + '">' + (p.settings.syl ? sylHtml(w, true) : esc(w)) + '</button>'; }).join('');
    var top = '';
    if (s.phase === 'ready') top = '<p>Zeg tegen uw kind: <i>"Lees de woorden van boven naar beneden, zo goed en zo snel als je kunt."</i> Druk dan op Start.</p><div class="actions"><button class="btn big" data-a="lstart">' + icon('timer') + ' Start de minuut</button><button class="btn ghost" data-a="samenmenu">Terug</button></div>';
    if (s.phase === 'run') top = '<div class="clock" id="clock">' + s.secs + '</div><p class="small center">Tik 1 keer = fout, 2 keer = zelf verbeterd.</p>';
    if (s.phase === 'last') top = '<p class="ask">De tijd is om. <b>Tik op het laatste woord dat gelezen is.</b></p>' + (s.last !== null ? '<div class="actions"><button class="btn" data-a="lsave">' + icon('check') + ' Opslaan</button></div>' : '');
    if (s.phase === 'done') { top = '<div class="fb good"><b>' + s.result + ' woorden goed in één minuut</b><small>' + (s.err.length ? s.err.length + ' fout. De foute woorden komen terug bij het flitsen.' : 'Geen fouten!') + '</small></div><div class="actions"><button class="btn" data-a="samenmenu">Klaar</button></div>'; }
    return '<section class="card">' + top + '</section><div class="rlist ' + (s.phase === 'ready' ? 'blur' : '') + '">' + cols + '</div>';
  }
  function tekstView(p) {
    var s = samen;
    var words = s.words.map(function (w, i) { return '<button class="tw ' + (s.err.indexOf(i) >= 0 ? 'err' : '') + '" data-a="tw" data-i="' + i + '">' + (p.settings.syl && s.phase !== 'ready' ? sylText(w) : esc(w)) + '</button>'; }).join(' ');
    var top = '<p class="eyebrow">' + (s.which === 'g6' ? 'GROEP 6-TEKST' : 'OEFENTEKST') + ' · KEER ' + Math.min(3, s.phase === 'between' || s.phase === 'done' ? s.times.length : s.round) + ' VAN 3</p><h2>' + esc(s.title) + '</h2>';
    var ctl = '';
    if (s.phase === 'ready') ctl = '<div class="actions"><button class="btn ghost" data-a="listen">' + icon('sound') + ' Eerst luisteren</button><button class="btn" data-a="tstart">' + icon('timer') + ' Start keer ' + s.round + '</button></div>';
    if (s.phase === 'run') ctl = '<div class="actions"><span class="clock small" id="clock">0:00</span><button class="btn" data-a="tstop">' + icon('check') + ' Klaar met lezen</button></div>';
    if (s.phase === 'between' || s.phase === 'done') ctl = '<div class="fb good"><b>Keer ' + s.times.length + ': ' + fmtT(s.times[s.times.length - 1]) + ' · ' + s.wpm[s.wpm.length - 1] + ' woorden per minuut</b><small>' + s.wpm.map(function (x, i) { return 'keer ' + (i + 1) + ': ' + x; }).join(' · ') + (s.wpm.length > 1 && s.wpm[s.wpm.length - 1] > s.wpm[0] ? ' · ' + Math.round(100 * (s.wpm[s.wpm.length - 1] / s.wpm[0] - 1)) + '% sneller dan de eerste keer!' : '') + '</small></div>' +
      '<div class="actions">' + (s.phase === 'between' ? '<button class="btn" data-a="tagain">Nog een keer lezen (keer ' + s.round + ')</button><button class="btn ghost" data-a="tsave">Stoppen en opslaan</button>' : '<button class="btn" data-a="samenmenu">Klaar</button>') + '</div>';
    var vocab = s.vocab ? '<details class="vocab"><summary>Moeilijke woorden (' + s.vocab.length + ')</summary><ul>' + s.vocab.map(function (v) { return '<li><b>' + esc(v[0]) + '</b> ' + esc(v[1]) + ' <button class="mini" data-a="sayw" data-w="' + esc(v[0]) + '">' + icon('sound') + '</button></li>'; }).join('') + '</ul></details>' : '';
    return '<section class="card">' + top + ctl + '</section>' + vocab + '<section class="card reading">' + words + '</section>' + (s.q && (s.phase === 'between' || s.phase === 'done') ? qPanel(s) : '') + (s.phase === 'run' ? '<p class="small center">Tik 1 keer = fout, 2 keer = zelf verbeterd.</p>' : '');
  }
  function sylText(w) { var m = w.match(/^([^A-Za-zÀ-ÿ]*)([A-Za-zÀ-ÿ]+)([^A-Za-zÀ-ÿ]*)$/); if (!m) return esc(w); return esc(m[1]) + sylHtml(m[2], true) + esc(m[3]); }
  function fmtT(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function cleanWord(w) { return w.toLowerCase().replace(/[^a-zà-ÿ]/g, ''); }

  /* ================= LEESTOETS (1 minuut echte woorden, 1 minuut onzinwoorden) ================= */
  function toetsView(p) {
    if (!toets) {
      var last = p.tests.slice(-1)[0];
      return '<section class="card"><p class="eyebrow">ELKE WEEK, VOOR PAPA OF MAMA</p><h1>Leestoets</h1><p>Twee kaarten van één minuut: <b>echte woorden</b> en <b>onzinwoorden</b>. Zo ziet u week na week of het lezen vlotter en preciezer wordt. Het lijkt op de DMT en de Klepel van school, maar het is een eigen oefentoets: de scores zijn niet te vergelijken met de normen van school.</p>' +
        '<ol class="steps"><li>Zeg: <i>"Lees zo snel en zo goed als je kunt. Als je een fout maakt, mag je gewoon doorgaan."</i></li><li>Tik 1 keer = fout, 2 keer = zelf verbeterd. Verbeter niet tijdens de toets.</li><li>Na een minuut tikt u het laatste gelezen woord aan.</li></ol>' +
        (last ? '<p class="small">Vorige keer (' + new Date(last.date).toLocaleDateString('nl-NL') + '): ' + last.real + ' echte woorden en ' + last.pseudo + ' onzinwoorden goed per minuut.</p>' : '') +
        '<div class="actions"><button class="btn big" data-a="tbegin">' + icon('timer') + ' Begin met kaart 1</button></div></section>';
    }
    var t = toets, card = t.card === 'real' ? t.realWords : D.cards.P;
    var top = '';
    if (t.phase === 'ready') top = '<h2>Kaart ' + (t.card === 'real' ? '1: echte woorden' : '2: onzinwoorden') + '</h2><p>' + (t.card === 'real' ? 'Lees de woorden van boven naar beneden, kolom voor kolom.' : 'Deze woorden bestaan niet. Lees ze zoals ze er staan.') + '</p><div class="actions"><button class="btn big" data-a="tgo">' + icon('timer') + ' Start de minuut</button></div>';
    if (t.phase === 'run') top = '<div class="clock" id="clock">' + t.secs + '</div>';
    if (t.phase === 'last') top = '<p class="ask">De tijd is om. <b>Tik op het laatste gelezen woord.</b></p>' + (t.last !== null ? '<div class="actions"><button class="btn" data-a="tnext">' + icon('check') + ' ' + (t.card === 'real' ? 'Naar kaart 2' : 'Opslaan') + '</button></div>' : '');
    var grid = '<div class="tcard ' + (t.phase === 'ready' ? 'blur' : '') + '">' + card.map(function (w, i) { var c = (t.err.indexOf(i) >= 0 ? 'err ' : '') + (t.last === i ? 'last ' : '') + (t.last !== null && i > t.last ? 'after' : ''); return '<button class="tw ' + c + '" data-a="tcw" data-i="' + i + '"><span class="t">' + esc(w) + '</span></button>'; }).join('') + '</div>';
    if (t.phase === 'saved') return '<section class="card"><h2>Opgeslagen</h2><div class="row3"><div class="stat"><b>' + t.res.real + '</b><span>echte woorden per minuut</span></div><div class="stat"><b>' + t.res.pseudo + '</b><span>onzinwoorden per minuut</span></div></div>' + testCompare(p) + '<div class="actions"><button class="btn" data-a="nav" data-p="rapport">Bekijk het rapport</button></div></section>';
    return '<section class="card">' + top + '</section>' + grid;
  }
  function testCompare(p) {
    if (p.tests.length < 2) return '<p class="small">Volgende week doet u de toets weer. Dan ziet u de groei.</p>';
    var a = p.tests[p.tests.length - 2], b = p.tests[p.tests.length - 1];
    return '<p>Vergeleken met de vorige keer: echte woorden <b>' + sign(b.real - a.real) + '</b>, onzinwoorden <b>' + sign(b.pseudo - a.pseudo) + '</b>.</p>';
  }
  function sign(n) { return (n > 0 ? '+' : '') + n; }

  /* ================= BIBLIOTHEEK (meelezen met de stem) ================= */
  function biebView(p) {
    if (bieb) {
      var words = E.words(bieb.text).map(function (w, i) { return '<span class="bw" data-i="' + i + '">' + (p.settings.syl && bieb.syl ? sylText(w) : esc(w)) + '</span>'; }).join(' ');
      return '<section class="card"><button class="ghost" data-a="biebback">' + icon('back') + ' Alle teksten</button><h1>' + esc(bieb.title) + '</h1><div class="actions"><button class="btn" data-a="readalong">' + icon('sound') + ' Lees voor en lees mee</button><button class="btn ghost" data-a="stopread">Stop</button><button class="btn ghost" data-a="togsyl">' + (bieb.syl ? 'Zonder' : 'Met') + ' kleurstukjes</button></div></section>' +
        (bieb.vocab ? '<details class="vocab" open><summary>Moeilijke woorden</summary><ul>' + bieb.vocab.map(function (v) { return '<li><b>' + esc(v[0]) + '</b> ' + esc(v[1]) + '</li>'; }).join('') + '</ul></details>' : '') +
        '<section class="card reading lib" id="libtext">' + words + '</section>' + (bieb.q ? qPanel(bieb) : '');
    }
    return '<section class="card"><h1>Bibliotheek</h1><p>Alle teksten. Laat ze voorlezen en lees mee: het woord dat je hoort, licht op. Zo leer je nieuwe woorden en houd je de groep 6-teksten bij.</p></section>' +
      '<div class="libgrid">' + D.weeks.map(function (w) { return (w.texts || [[w.text_title]]).map(function (t, i) { return '<button class="libitem" data-a="open" data-n="' + w.n + '" data-t="week" data-i="' + i + '"><small>Week ' + w.n + ' · oefentekst</small><b>' + esc(t[0]) + '</b></button>'; }).join('') + '<button class="libitem g6" data-a="open" data-n="' + w.n + '" data-t="g6"><small>Week ' + w.n + ' · groep 6</small><b>' + esc(w.g6.title) + '</b></button>'; }).join('') + '</div>';
  }
  function readAlong() {
    var words = E.words(bieb.text), starts = [], at = 0;
    words.forEach(function (w) { starts.push(at); at += w.length + 1; });
    var spans = document.querySelectorAll('#libtext .bw');
    var mark = function (i) { spans.forEach(function (s) { s.classList.remove('now'); }); if (spans[i]) { spans[i].classList.add('now'); spans[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
    var u = speak(words.join(' '), { force: true, onboundary: function (e) { if (e.name && e.name !== 'word') return; var i = 0; while (i + 1 < starts.length && starts[i + 1] <= e.charIndex) i++; mark(i); }, onend: function () { mark(-1); } });
    if (!u) return;
    if (!canSpeak()) toast('Er is geen Nederlandse stem gevonden. Kijk bij de spraakinstellingen van het apparaat.');
  }

  /* ================= MIJN GROEI (kind) ================= */
  function groeiView(p) {
    var books = p.books.slice(-60), first = p.flashW.hist.length ? [null, p.flashW.start || p.flashW.hist[0][1]] : null, now = p.flashW.ms;
    var shelf = '<div class="shelf">' + books.map(function (b) { var wk = E.week(b.w); return '<i style="--c:' + (wk ? wk.color : '#888') + '" title="' + b.d + ' · week ' + b.w + '"></i>'; }).join('') + (books.length ? '' : '<span class="small">Na elke oefening komt hier een boek bij.</span>') + '</div>';
    var sl = p.lv.lezen, sec = LL.secured(sl), known = sl.n >= 12, fill = known ? Math.max(0, Math.min(12, Math.floor(sec))) : 0, soon = Math.max(fill, Math.min(12, Math.floor(LL.mastery(sl))));
    var mine = '<section class="card"><p class="eyebrow">MIJN LEESNIVEAU</p><h2>' + icon('star') + ' ' + (known ? (LL.describe(sl).above ? 'Je leest woorden boven groep 8-niveau!' : 'Woorden van ' + LL.levelInfo(sec).label.toLowerCase() + ' heb je binnen!') : 'Je niveau wordt gemeten...') + '</h2><div class="ldots">' + Array.from({ length: 12 }, function (_, i) { return '<i class="' + (i < fill ? 'on' : i < soon ? 'soon' : '') + (i % 2 ? '' : ' gs') + '"></i>'; }).join('') + '</div><div class="ldlabels">' + [3, 4, 5, 6, 7, 8].map(function (g) { return '<span>groep ' + g + '</span>'; }).join('') + '</div><p class="small">Volle bolletjes heb je echt binnen, die gaan nooit meer weg. Gestreepte ben je aan het veroveren.</p></section>';
    return mine + '<section class="card"><p class="eyebrow">KIJK HOE JE GROEIT</p><h1>Mijn boekenkast</h1>' + shelf + '<p class="small">' + p.books.length + ' keer geoefend · ' + p.stars + ' sterren</p></section>' +
      '<section class="card"><h2>' + icon('eye') + ' Je ogen worden sneller</h2>' + (first ? '<p>Je begon met <b>' + first[1] + ' ms</b> flitstijd. Nu lees je een woord in <b>' + now + ' ms</b>.' + (now < first[1] ? ' Dat is ' + Math.round(100 * (1 - now / first[1])) + '% sneller!' : '') + '</p>' + lineChart([{ name: 'Flitstijd (ms)', pts: p.flashW.hist.map(function (h) { return [h[0], h[1]]; }), color: '#2b7a78' }], { invert: true, unit: 'ms' }) : '<p>Na het flitsen zie je hier hoe snel je ogen worden.</p>') + '</section>' +
      '<section class="card"><h2>' + icon('flag') + ' Mijn route</h2><div class="route">' + D.weeks.map(function (w) { return '<div class="rstep ' + (w.n < p.week ? 'done' : w.n === p.week ? 'now' : '') + '"><b>' + w.n + '</b><span>' + esc(w.short || w.title) + '</span></div>'; }).join('') + '</div></section>';
  }

  /* ================= RAPPORT (ouders) ================= */
  /* ================= NIVEAU ================= */
  function levelScale(M, exp, iv) {
    var pct = function (v) { return Math.max(0, Math.min(100, (v - .5) / 12 * 100)); };
    return '<div class="lscale" role="img" aria-label="Niveau op de schaal van groep 3 tot 8">' + [3, 4, 5, 6, 7, 8].map(function (g) { return '<span>' + g + '</span>'; }).join('') +
      (iv ? '<em class="band" style="left:' + pct(iv[0]) + '%;width:' + (pct(iv[1]) - pct(iv[0])) + '%"></em>' : '') + '<i class="exp" style="left:' + pct(exp) + '%"></i>' + (M === null ? '' : '<b style="left:' + pct(M) + '%"></b>') + '</div>';
  }
  function skillCard(p, key, title, what) {
    var s = p.lv[key], M = LL.mastery(s), iv = LL.interval(s), exp = LL.expected(p.groep), mo = LL.monthsBehind(M, p.groep), enough = s.n >= 8;
    return '<div class="skill"><div class="shead2"><h3>' + title + '</h3><small>' + s.n + ' antwoorden · ' + LL.sure(s) + '</small></div>' + levelScale(enough ? M : null, exp, enough ? iv : null) +
      (enough ? '<p><b>' + LL.describe(s).label + '</b> <span class="small">(' + (LL.describe(s).above || LL.describe(s).below ? LL.describe(s).detail : '80% zeker ' + LL.describe(s).detail) + ')</span><br><span class="small">Verwacht in groep ' + p.groep + ' nu: ' + LL.levelInfo(exp).label.toLowerCase() + '. ' + (LL.sd(s) >= 1 ? 'Nog te onzeker om te zeggen hoeveel maanden.' : mo >= 3 ? 'Ongeveer ' + mo + ' schoolmaanden achter.' : mo <= -3 ? 'Ongeveer ' + (-mo) + ' schoolmaanden voor.' : 'Ongeveer op niveau.') + '</span></p>' : '<p class="small">Nog te weinig gegevens. ' + (key === 'lezen' ? 'Doe de niveaucheck of een paar oefeningen.' : 'Na een paar dictees verschijnt hier het niveau.') + '</p>') +
      '<p class="small what">' + what + '</p></div>';
  }
  function niveauHtml(p) {
    var reads = []; Object.keys(p.weeks).forEach(function (n) { (p.weeks[n].reads || []).forEach(function (r) { if (r.which === 'week') reads.push(r); }); });
    reads.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var rx = p.readx, acc = rx.words ? Math.round(100 * (1 - rx.err / rx.words)) : null, selfShare = rx.err + rx.self ? Math.round(100 * rx.self / (rx.err + rx.self)) : null;
    var structRows = ['een', 'twee', 'drie', 'vier', 'onzin'].filter(function (k) { return p.struct[k] && p.struct[k].n >= 3; }).map(function (k) { var x = p.struct[k], pc = Math.round(100 * x.ok / x.n); return '<tr><td>' + LL.STRUCT_NAMES[k] + '</td><td>' + x.n + '</td><td><span class="bar good"><i style="width:' + pc + '%"></i></span> ' + pc + '%</td></tr>'; }).join('');
    var sc = Object.keys(p.scat).filter(function (k) { return p.scat[k].n >= 3 && LS.CAT[k]; }).map(function (k) { return { k: k, n: p.scat[k].n, r: p.scat[k].err / p.scat[k].n }; }).sort(function (a, b) { return b.r - a.r; }).slice(0, 8);
    var hl = p.lv.lezen.hist, hs = p.lv.spelling.hist, expPts = (hl.length ? hl : hs).map(function (h) { return [h[0], LL.expected(p.groep, new Date(h[0]))]; });
    var chart = hl.length + hs.length >= 2 ? lineChart([{ name: 'Woorden lezen', pts: hl.map(function (h) { return [h[0], h[1]]; }), color: '#2b7a78' }, { name: 'Spelling', pts: hs.map(function (h) { return [h[0], h[1]]; }), color: '#c0582a' }, { name: 'Verwacht voor groep ' + p.groep, pts: expPts, color: '#b9b2c9' }], { unit: 'niveau' }) : '';
    return '<section class="card niveau"><p class="eyebrow">NIVEAU OP BASIS VAN HAAR ANTWOORDEN</p><h2>Waar staat ' + esc(p.name) + '?</h2>' +
      skillCard(p, 'lezen', 'Woorden lezen (technisch lezen)', 'Gemeten met flitsen, hakken, de niveaucheck en het hardop lezen. Niveau = de moeilijkste woordsoort die ze voor ongeveer 3 van de 4 woorden goed leest.') +
      skillCard(p, 'spelling', 'Spelling', 'Gemeten met het dictee en de werkwoordspelling.') +
      '<div class="skill"><div class="shead2"><h3>Tekst lezen</h3><small>' + reads.length + ' teksten</small></div>' + (reads.length ? '<p>Eerste keer lezen: <b>' + reads.slice(-5).map(function (r) { return r.wpm[0]; }).join(' → ') + '</b> woorden per minuut. Na 3 keer: ' + reads.slice(-5).map(function (r) { return r.wpm[r.wpm.length - 1]; }).join(', ') + '.</p>' : '<p class="small">Nog niet samen gelezen.</p>') +
      (acc !== null ? '<p class="small">Hardop gelezen woorden goed: <b>' + acc + '%</b> (van ' + rx.words + ').' + (selfShare !== null ? ' Zelf verbeterd: <b>' + selfShare + '%</b> van de struikelingen. Zelf verbeteren is een goed teken: ze controleert of het klopt.' : '') + '</p>' : '') + '</div>' +
      '<div class="skill"><div class="shead2"><h3>Begrijpen</h3><small>' + p.begrip.n + ' vragen</small></div>' + (p.begrip.n ? '<p><b>' + Math.round(100 * p.begrip.ok / p.begrip.n) + '%</b> goed bij de vragen over de groep 6-teksten.</p>' : '<p class="small">Na een groep 6-tekst verschijnen er drie vragen.</p>') + '</div>' +
      chart +
      (structRows ? '<h3>Per woordsoort</h3><table class="tbl"><tr><th>Woordsoort</th><th>Aantal</th><th>Goed</th></tr>' + structRows + '</table>' : '') +
      (sc.length ? '<h3>Spelling per categorie</h3><table class="tbl"><tr><th>Categorie</th><th>Geoefend</th><th>Fout</th></tr>' + sc.map(function (x) { return '<tr><td>' + esc(LS.CAT[x.k].name) + '</td><td>' + x.n + '</td><td><span class="bar"><i style="width:' + Math.round(x.r * 100) + '%"></i></span> ' + Math.round(x.r * 100) + '%</td></tr>'; }).join('') + '</table>' : '') +
      (p.checks.length ? '<p class="small">Niveauchecks: ' + p.checks.slice(-4).map(function (c) { return new Date(c.date).toLocaleDateString('nl-NL') + ': ' + (c.label || LL.levelInfo(c.M).label).toLowerCase(); }).join(' · ') + '</p>' : '') +
      '<div class="actions no-print"><button class="btn" data-a="checkstart">' + icon('eye') + ' Niveaucheck doen (5 min)</button></div>' +
      '<p class="small note2">Dit niveau is een schatting op basis van woordstructuur (zoals de opbouw van de DMT-kaarten: eenlettergrepig, tweelettergrepig, meerlettergrepig) en haar antwoorden in LeesRijk. Het is geen genormeerde toets. Vergelijk met de DMT en AVI van school.</p></section>';
  }
  function rapportView(p) {
    var hp = E.hardPatterns(p.pat, 6), rev = Object.keys(p.rev).sort(function (a, b) { return (p.rev[b].miss || 0) - (p.rev[a].miss || 0); }).slice(0, 20);
    var tests = p.tests, reads = [];
    Object.keys(p.weeks).forEach(function (n) { (p.weeks[n].reads || []).forEach(function (r) { reads.push(r); }); });
    reads.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var weeksDone = Object.keys(p.weeks).map(Number).sort(function (a, b) { return a - b; });
    var rows = weeksDone.map(function (n) { var w = p.weeks[n], pc = function (x) { return x && x.n ? Math.round(100 * x.ok / x.n) + '%' : '·'; }; return '<tr><td>' + n + '</td><td>' + w.sessions + '</td><td>' + pc(w.hak) + '</td><td>' + pc(w.zoek) + '</td><td>' + pc(w.lang) + '</td><td>' + pc(w.flits) + '</td><td>' + pc(w.dictee) + '</td></tr>'; }).join('');
    var days7 = Object.keys(p.days).filter(function (d) { return Date.now() - new Date(d).getTime() < 7 * 864e5; }), d28 = Object.keys(p.days).filter(function (d) { return Date.now() - new Date(d).getTime() < 28 * 864e5; }), min28 = d28.reduce(function (a, d) { return a + (p.days[d].min || 0); }, 0);
    var advice = [];
    if (days7.length < 4) advice.push('Oefen liever kort en vaak: 4 tot 5 keer per week een kwartier werkt beter dan één keer lang. Dagelijks oefenen is de kern van elke dyslexiebehandeling.');
    if (hp[0] && hp[0].rate >= .25) advice.push('Het lastigst nu: <b>' + esc(hp[0].info) + '</b> (' + Math.round(hp[0].rate * 100) + '% fout). Laat bij zulke woorden eerst het stukje aanwijzen, dan pas het hele woord lezen.');
    if (tests.length >= 2 && tests[tests.length - 1].pseudo <= tests[0].pseudo) advice.push('De onzinwoorden gaan nog niet sneller. Dat meet het precies verklanken (zonder te raden). Doe de hak-oefening hardop en laat uw kind bij twijfel elke klank zeggen.');
    if (reads.length && reads[reads.length - 1].wpm.length >= 2) advice.push('Herhaald lezen werkt: bij de laatste tekst ging het van ' + reads[reads.length - 1].wpm[0] + ' naar ' + reads[reads.length - 1].wpm.slice(-1)[0] + ' woorden per minuut. Prijs vooral de inzet en het precies lezen.');
    if (!advice.length) advice.push('Blijf elke dag oefenen. Gaat een week goed (80% of meer), dan stelt de app voor om naar de volgende week te gaan.');
    return '<section class="card"><p class="eyebrow">RAPPORT VOOR OUDERS · ' + new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) + '</p><h1>' + esc(p.name) + ' · week ' + p.week + ' van 12</h1>' +
      '<p>' + p.books.length + ' keer geoefend, waarvan ' + days7.length + ' dagen in de afgelopen week. Laatste 4 weken: ' + d28.length + ' dagen, ongeveer ' + min28 + ' minuten. Groep ' + p.groep + '. Huidige flitstijd: ' + p.flashW.ms + ' ms voor echte woorden, ' + p.flashP.ms + ' ms voor onzinwoorden.</p><div class="actions no-print"><button class="btn" data-a="nav" data-p="toets">' + icon('timer') + ' Leestoets doen</button><button class="btn ghost" data-a="print">Print</button><button class="btn ghost" data-a="nav" data-p="instellingen">' + icon('gear') + ' Instellingen</button></div></section>' +
      niveauHtml(p) + '<section class="card"><h2>Leestoets per week</h2>' + (tests.length ? lineChart([{ name: 'Echte woorden per minuut', pts: tests.map(function (t) { return [t.date.slice(0, 10), t.real]; }), color: '#2b7a78' }, { name: 'Onzinwoorden per minuut', pts: tests.map(function (t) { return [t.date.slice(0, 10), t.pseudo]; }), color: '#c0582a' }], {}) + '<table class="tbl"><tr><th>Datum</th><th>Kaart</th><th>Echt</th><th>Fout</th><th>Onzin</th><th>Fout</th></tr>' + tests.slice(-8).reverse().map(function (t) { return '<tr><td>' + new Date(t.date).toLocaleDateString('nl-NL') + '</td><td>' + t.form + '</td><td>' + t.real + '</td><td>' + t.realErr + '</td><td>' + t.pseudo + '</td><td>' + t.pseudoErr + '</td></tr>'; }).join('') + '</table>' : '<p>Nog geen leestoets gedaan. Doe hem één keer per week, op een vaste dag.</p>') + '</section>' +
      '<section class="card"><h2>Hardop lezen (samen)</h2>' + (reads.length ? '<table class="tbl"><tr><th>Datum</th><th>Tekst</th><th>Woorden per minuut (keer 1, 2, 3)</th><th>Fouten</th></tr>' + reads.slice(-10).reverse().map(function (r) { return '<tr><td>' + new Date(r.date).toLocaleDateString('nl-NL') + '</td><td>' + esc(r.title) + '</td><td>' + r.wpm.join(' → ') + '</td><td>' + r.errs.join(', ') + '</td></tr>'; }).join('') + '</table>' : '<p>Nog niet samen gelezen.</p>') + '</section>' +
      '<section class="card"><h2>Klankpatronen</h2>' + (hp.length ? '<p class="small">Uit alle oefeningen: welk soort woorden gaat het vaakst mis?</p><table class="tbl"><tr><th>Patroon</th><th>Geoefend</th><th>Fout</th></tr>' + hp.slice(0, 8).map(function (h) { return '<tr><td>' + esc(h.info) + '</td><td>' + h.n + '</td><td><span class="bar"><i style="width:' + Math.round(h.rate * 100) + '%"></i></span> ' + Math.round(h.rate * 100) + '%</td></tr>'; }).join('') + '</table>' : '<p>Na een paar oefeningen ziet u hier welke klanken nog lastig zijn.</p>') + '</section>' +
      '<section class="card"><h2>Woorden die terugkomen</h2>' + (rev.length ? '<p class="small">Deze woorden gingen fout. Ze komen terug na 1, 3, 7 en 21 dagen tot ze vast zitten.</p><div class="chips">' + rev.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join('') + '</div>' : '<p>Nog geen.</p>') + '</section>' +
      '<section class="card"><h2>Per week</h2>' + (rows ? '<div class="scroll"><table class="tbl"><tr><th>Week</th><th>Keer</th><th>Hakken</th><th>Zoeken</th><th>Lang/kort</th><th>Flitsen</th><th>Dictee</th></tr>' + rows + '</table></div>' : '<p>Nog geen oefeningen.</p>') + '</section>' +
      '<section class="card advice"><h2>Tips</h2><ul>' + advice.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul></section>' +
      '<p class="small note2">LeesRijk is een oefenprogramma, geen diagnose of behandeling. Het volgt de aanpak van de Leesroute: eerst precies verklanken met regels, dan vlotter lezen door flitsen en herhaald lezen, elke dag kort. Zit uw kind in een vergoede dyslexiebehandeling? Laat de behandelaar weten dat u dit thuis oefent. De echte toets van de groei is de DMT en de Klepel van school.</p>';
  }
  /* eenvoudige lijngrafiek in SVG */
  function lineChart(series, o) {
    var all = []; series.forEach(function (s) { s.pts.forEach(function (p) { all.push(p); }); });
    if (all.length < 2) return '<p class="small">Na nog een meting zie je hier een lijn.</p>';
    var dates = all.map(function (p) { return new Date(p[0]).getTime(); }), t0 = Math.min.apply(null, dates), t1 = Math.max.apply(null, dates) || t0 + 1;
    var vals = all.map(function (p) { return p[1]; }), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
    lo = Math.max(0, lo - (hi - lo) * .15); hi = hi + (hi - lo) * .1;
    var Wd = 600, H = 200, L = 44, R = 12, T = 12, B = 26, x = function (d) { return L + (t1 === t0 ? .5 : (new Date(d).getTime() - t0) / (t1 - t0)) * (Wd - L - R); }, y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var grid = [0, .5, 1].map(function (f) { var v = Math.round(lo + f * (hi - lo)); return '<line x1="' + L + '" x2="' + (Wd - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="g"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" class="ax" text-anchor="end">' + v + '</text>'; }).join('');
    var lines = series.map(function (s) { if (!s.pts.length) return ''; var d = s.pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1); }).join(' '); return '<path d="' + d + '" stroke="' + s.color + '" fill="none" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' + s.pts.map(function (p) { return '<circle cx="' + x(p[0]).toFixed(1) + '" cy="' + y(p[1]).toFixed(1) + '" r="4" fill="' + s.color + '"/>'; }).join(''); }).join('');
    var legend = series.length > 1 || o.unit ? '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('') + (o.invert ? '<span class="small">lager is sneller</span>' : '') + '</div>' : '';
    return '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + H + '" role="img" aria-label="' + esc(series.map(function (s) { return s.name; }).join(', ')) + '">' + grid + lines + '<text x="' + L + '" y="' + (H - 6) + '" class="ax">' + new Date(t0).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) + '</text><text x="' + (Wd - R) + '" y="' + (H - 6) + '" class="ax" text-anchor="end">' + new Date(t1).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) + '</text></svg>' + legend;
  }

  /* ================= INSTELLINGEN ================= */
  function instellingenView(p) {
    var s = p.settings, opt = function (key, val, label) { return '<button class="seg ' + (s[key] === val ? 'on' : '') + '" data-a="set" data-k="' + key + '" data-v="' + val + '">' + label + '</button>'; };
    return '<section class="card"><h1>Instellingen voor ' + esc(p.name) + '</h1>' +
      '<div class="setrow"><label for="groepsel">Groep op school</label><select id="groepsel">' + [3, 4, 5, 6, 7, 8].map(function (g) { return '<option value="' + g + '"' + (g === p.groep ? ' selected' : '') + '>Groep ' + g + '</option>'; }).join('') + '</select><small>Het vergelijkpunt in het rapport. Het niveau zelf meet LeesRijk aan haar antwoorden.</small></div>' +
      '<div class="setrow"><label for="weeksel">Week van de Leesroute</label><select id="weeksel">' + D.weeks.map(function (w) { return '<option value="' + w.n + '" ' + (w.n === p.week ? 'selected' : '') + '>Week ' + w.n + ': ' + esc(w.short || w.title) + '</option>'; }).join('') + '</select></div>' +
      '<div class="setrow"><span>Letterafstand</span><div class="segs">' + opt('spacing', 'normal', 'Normaal') + opt('spacing', 'extra', 'Extra ruim') + '</div><small>Extra ruimte tussen letters helpt veel kinderen met dyslexie sneller en preciezer te lezen (Zorzi e.a., 2012).</small></div>' +
      '<div class="setrow"><span>Lettergrootte</span><div class="segs">' + opt('size', 'M', 'Gewoon') + opt('size', 'L', 'Groot') + opt('size', 'XL', 'Heel groot') + '</div></div>' +
      '<div class="setrow"><span>Achtergrond</span><div class="segs">' + opt('bg', 'wit', 'Wit') + opt('bg', 'creme', 'Crème') + opt('bg', 'blauw', 'Zachtblauw') + '</div></div>' +
      '<div class="setrow"><span>Kleurstukjes (lettergrepen in twee kleuren)</span><div class="segs">' + opt('syl', true, 'Aan') + opt('syl', false, 'Uit') + '</div><small>Bij het samen lezen en in de bibliotheek. Zet uit als het lezen goed gaat, zodat uw kind het zonder hulp leert.</small></div>' +
      '<div class="setrow"><span>Opdrachten voorlezen</span><div class="segs">' + opt('read', true, 'Aan') + opt('read', false, 'Uit') + '</div></div>' +
      '<div class="setrow"><label for="rate">Tempo van de stem</label><input type="range" id="rate" min="0.6" max="1.1" step="0.05" value="' + s.rate + '"><button class="btn ghost" data-a="testvoice">' + icon('sound') + ' Test</button><small>' + (canSpeak() ? 'Nederlandse stem gevonden.' : 'Geen Nederlandse stem gevonden. Het dictee laat het woord dan kort zien in plaats van het voor te lezen.') + '</small></div>' +
      '<div class="setrow"><label for="pname">Naam</label><input id="pname" value="' + esc(p.name) + '" maxlength="20"><button class="btn ghost" data-a="rename">Bewaar</button></div>' +
      '<div class="setrow sync"><span>Op andere apparaten</span><b class="sync-code">' + (SY ? SY.code(p) : '–') + '</b><small>Vul deze code op een andere telefoon, tablet of computer in, dan ziet ' + esc(p.name) + ' daar dezelfde voortgang. <span id="syncstate">' + syncLine() + '</span></small>' +
      '<details class="sync-more"><summary>Ik heb een code van een ander apparaat</summary><p class="small">De voortgang van ' + esc(p.name) + ' op dit apparaat wordt dan vervangen door die van de code. Gebruik de code van het apparaat waar het meest op geoefend is.</p><input id="linkcode" aria-label="Code van een ander apparaat" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="KBTQ-7M4X"><button class="btn ghost" data-a="synclink">Koppelen</button></details></div>' +
      '<div class="setrow danger"><button class="btn ghost" data-a="resetflash">Flitstijd opnieuw bepalen</button><button class="btn ghost red" data-a="delete">Verwijder deze lezer</button></div></section>';
  }

  /* ================= KLOKKEN ================= */
  function runMinute(state, onEnd) {
    state.secs = 60; state.t0 = Date.now(); state.phase = 'run'; render();
    tick = setInterval(function () { var left = Math.max(0, 60 - Math.floor((Date.now() - state.t0) / 1000)); state.secs = left; var el = $('#clock'); if (el) el.textContent = left; if (!left) { clearInterval(tick); tick = null; onEnd(); } }, 250);
  }

  /* ================= ACTIES ================= */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.dataset.a, p = P(), s, i;
    switch (a) {
      case 'nav': closeModal(); if (b.dataset.p !== 'eieren' || (hatch && hatch.revealed)) hatch = null; if (b.dataset.p === 'samen') samen = null; if (b.dataset.p === 'toets') toets = null; if (b.dataset.p === 'bieb') bieb = null; go(b.dataset.p); break;
      case 'close': closeModal(); break;
      case 'openegg': openEgg(); break;
      case 'qpick': { var qs = page === 'samen' ? samen : bieb; if (!qs || !qs.qa) return; var qi = +b.dataset.q, oi = +b.dataset.o; if (qs.qa.ans[qi] !== undefined) return; qs.qa.ans[qi] = oi; p.begrip.n++; if (oi === 0) p.begrip.ok++; save(); render(); speak(oi === 0 ? 'Goed!' : 'Het goede antwoord is: ' + qs.q[qi][1][0]); break; }
      case 'sayq': { var qs2 = page === 'samen' ? samen : bieb, q = qs2.q[+b.dataset.q]; speak(q[0] + ' ... ' + qs2.qa.order[+b.dataset.q].map(function (o) { return q[1][o]; }).join('. Of: '), { force: true }); break; }
      case 'checkstart': startCheck(); break;
      case 'checkgo': nextCheckItem(); break;
      case 'cpick': pickCheck(b.dataset.w); break;
      case 'cnext': nextCheck(); break;
      case 'setweek': p.week = +b.dataset.n; sess = null; save(); toast('Week ' + p.week + ' gekozen.'); render(); break;
      case 'checkquit': if (chk && chk.i > 0 && chk.phase !== 'done' && !confirm('Stoppen met de niveaucheck? Wat je al deed, telt mee.')) return; chk = null; go('home'); break;
      case 'nextegg': hatch = null; openEgg(); break;
      case 'fav': p.fav = +b.dataset.id; save(); closeModal(); toast(V.pets[p.fav].name + ' is nu je maatje!'); render(); break;
      case 'pet': petModal(+b.dataset.id); break;
      case 'trade': trade(+b.dataset.id); break;
      case 'egggroup': p.eggGroup = +b.dataset.g; save(); toast('Je volgende eieren komen uit ' + V.groups[p.eggGroup].name + '.'); render(); break;
      case 'create': { var el = $('#newname'), nm = (el && el.value || '').replace(/[<>&"]/g, '').trim().slice(0, 20); if (!nm) { toast('Vul eerst een naam in.'); if (el) el.focus(); return; } var np = newPlayer(nm), gs = $('#newgroep'); if (gs) { np.groep = +gs.value; np.lv = { lezen: LL.newSkill(np.groep), spelling: LL.newSkill(np.groep) }; } store.players.push(np); store.active = np.id; save(); closeModal(); go('home'); speak('Welkom ' + nm + '! Tik op de groene knop om te beginnen.'); break; }
      case 'players': playersModal(); break;
      case 'syncadd': syncLink('#joincode', null); break;
      case 'synclink': syncLink('#linkcode', p.id); break;
      case 'pick': store.active = b.dataset.id; save(); closeModal(); sess = null; go('home'); break;
      case 'start': sess = buildSession(p); go('sessie'); later(function () { if (P().settings.read) sayRule(); }, 300); break;
      case 'quit': if (sess && sess.total && !confirm('Stoppen? Wat je al gedaan hebt, is bewaard.')) return; sess = null; go('home'); break;
      case 'next': if (cur().type === 'regel') stopSpeak(); nextItem(); break;
      case 'sayrule': sayRule(); break;
      case 'sayword': speak(item(), { force: true }); break;
      case 'gap': s = sess.st; if (s.show) return; i = +b.dataset.i; s.cuts = s.cuts.indexOf(i) >= 0 ? s.cuts.filter(function (x) { return x !== i; }) : s.cuts.concat(i); render(); break;
      case 'checkhak': checkHak(); break;
      case 'sel': s = sess.st; i = +b.dataset.i; s.sel = s.sel.indexOf(i) >= 0 ? s.sel.filter(function (x) { return x !== i; }) : s.sel.concat(i); render(); break;
      case 'checkzoek': checkZoek(); break;
      case 'lk': answerLang(b.dataset.v); break;
      case 'flash': runFlash(); break;
      case 'fpick': pickFlash(b.dataset.w); break;
      case 'dictsay': sayDictee(); break;
      case 'seen': sess.st.seen = true; render(); break;
      case 'checkdict': checkDict(); break;
      case 'nextweek': if (b.dataset.ask && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Zeker weten? Tik nog eens'; return; } p.week = Math.min(12, p.week + 1); sess = null; save(); toast('Op naar week ' + p.week + '!'); render(); break;
      /* samen lezen */
      case 'samen': startSamen(b.dataset.k, b.dataset.t); break;
      case 'othertext': todayTexts(p, true); toast('Er staan nieuwe teksten klaar.'); render(); break;
      case 'samenmenu': stopTimers(); stopSpeak(); samen = null; render(); break;
      case 'lstart': runMinute(samen, function () { samen.phase = 'last'; render(); }); break;
      case 'rw': i = +b.dataset.i; if (samen.phase === 'run') { cycleMark(samen, i, b); } else if (samen.phase === 'last') { samen.last = i; render(); } break;
      case 'lsave': { var errs = samen.err.filter(function (x) { return x <= samen.last; }); samen.result = Math.max(0, samen.last + 1 - errs.length); errs.forEach(function (x) { var w = samen.words[x]; E.reviewMiss(p.rev, w); E.notePattern(p.pat, w, false); }); samen.words.slice(0, samen.last + 1).forEach(function (w, x) { if (errs.indexOf(x) < 0) E.notePattern(p.pat, w, true); }); lvAloud(samen.words, errs, samen.self || [], samen.last, false); W(p).lists.push({ date: new Date().toISOString(), wpm: samen.result, err: errs.length, self: (samen.self || []).filter(function (x) { return x <= samen.last; }).length }); noteDay(1); p.stars += 2; save(); samen.phase = 'done'; render(); break; }
      case 'tw': if (!samen || samen.phase !== 'run') return; i = +b.dataset.i; cycleMark(samen, i, b); break;
      case 'listen': speak(samen.words.join(' '), { force: true }); break;
      case 'tstart': stopSpeak(); samen.err = []; samen.self = []; samen.t0 = Date.now(); samen.phase = 'run'; render(); tick = setInterval(function () { var el = $('#clock'); if (el) el.textContent = fmtT((Date.now() - samen.t0) / 1000); }, 500); break;
      case 'tstop': { clearInterval(tick); tick = null; var secs = (Date.now() - samen.t0) / 1000; samen.times.push(secs); samen.errs.push(samen.err.length); samen.wpm.push(E.wpm(samen.words.length, samen.err.length, secs)); samen.selfs = (samen.selfs || []).concat((samen.self || []).length); if (samen.round === 1) lvAloud(samen.words, samen.err, samen.self || [], samen.words.length - 1, false); samen.err.forEach(function (x) { var raw = samen.words[x].replace(/^[^A-Za-zÀ-ÿ]+/, ''), w = cleanWord(raw), known = !!D.syl[w] || D.textwords.indexOf(w) >= 0; if (w.length > 2 && (known || raw[0] === w[0])) { /* namen (Sanne) niet herhalen */ E.reviewMiss(p.rev, w); E.notePattern(p.pat, w, false); } }); samen.round++; samen.phase = samen.round > 3 ? 'done' : 'between'; if (samen.phase === 'done') saveRead(); render(); break; }
      case 'tagain': samen.phase = 'ready'; samen.err = []; samen.self = []; render(); break;
      case 'tsave': saveRead(); samen.phase = 'done'; render(); break;
      case 'sayw': speak(b.dataset.w, { force: true }); break;
      /* toets */
      case 'tbegin': { var form = p.tests.length % 2 ? 'B' : 'A'; toets = { card: 'real', form: form, realWords: D.cards[form], err: [], last: null, phase: 'ready', res: {} }; render(); break; }
      case 'tgo': runMinute(toets, function () { toets.phase = 'last'; render(); }); break;
      case 'tcw': i = +b.dataset.i; if (toets.phase === 'run') { cycleMark(toets, i, b); } else if (toets.phase === 'last') { toets.last = i; render(); } break;
      case 'tnext': { var errsT = toets.err.filter(function (x) { return x <= toets.last; }), good = Math.max(0, toets.last + 1 - errsT.length); lvAloud(toets.card === 'real' ? toets.realWords : D.cards.P, errsT, (toets.self || []).filter(function (x) { return x <= toets.last; }), toets.last, toets.card !== 'real'); if (toets.card === 'real') { toets.res.real = good; toets.res.realErr = errsT.length; errsT.forEach(function (x) { E.notePattern(p.pat, toets.realWords[x], false); }); toets.card = 'pseudo'; toets.err = []; toets.self = []; toets.last = null; toets.phase = 'ready'; } else { toets.res.pseudo = good; toets.res.pseudoErr = errsT.length; p.tests.push({ date: new Date().toISOString(), form: toets.form, real: toets.res.real, realErr: toets.res.realErr, pseudo: good, pseudoErr: errsT.length, week: p.week }); p.stars += 3; save(); toets.phase = 'saved'; } render(); break; }
      /* bibliotheek */
      case 'open': { var wk = E.week(+b.dataset.n); bieb = b.dataset.t === 'g6' ? { title: wk.g6.title, text: wk.g6.text, vocab: wk.g6.vocab, q: wk.g6.q, syl: false } : (function () { var t = (wk.texts || [[wk.text_title, wk.text]])[+b.dataset.i || 0]; return { title: t[0], text: t[1], syl: true }; })(); render(); break; }
      case 'biebback': stopSpeak(); bieb = null; render(); break;
      case 'readalong': readAlong(); break;
      case 'stopread': stopSpeak(); break;
      case 'togsyl': bieb.syl = !bieb.syl; render(); break;
      /* instellingen */
      case 'set': { var v = b.dataset.v; p.settings[b.dataset.k] = v === 'true' ? true : v === 'false' ? false : v; save(); render(); break; }
      case 'testvoice': speak('Hallo ' + p.name + '. Zo klink ik. Lezen is oefenen, en oefenen maakt je sterker.', { force: true }); break;
      case 'rename': { var nv = ($('#pname').value || '').replace(/[<>&"]/g, '').trim().slice(0, 20); if (nv) { p.name = nv; save(); render(); toast('Bewaard.'); } break; }
      case 'resetflash': p.flashW = E.newFlash(700); p.flashP = E.newFlash(900); save(); toast('De flitstijd begint weer bij 700 ms.'); render(); break;
      case 'delete': if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Zeker weten? Tik nog eens.'; return; } store.players = store.players.filter(function (x) { return x.id !== p.id; }); if (SY) SY.forget(p.id); store.active = store.players[0] ? store.players[0].id : null; save(); go('home'); break;
      case 'print': window.print(); break;
    }
  });
  /* tikken bij hardop lezen: 1 keer = fout, 2 keer = zelf verbeterd, 3 keer = toch goed */
  function cycleMark(st, i, el) {
    st.self = st.self || [];
    if (st.err.indexOf(i) >= 0) { st.err = st.err.filter(function (x) { return x !== i; }); st.self.push(i); }
    else if (st.self.indexOf(i) >= 0) st.self = st.self.filter(function (x) { return x !== i; });
    else st.err.push(i);
    if (el) { el.classList.toggle('err', st.err.indexOf(i) >= 0); el.classList.toggle('self', st.self.indexOf(i) >= 0); }
  }
  /* begripsvragen bij de groep 6-teksten */
  function qPanel(st) {
    st.qa = st.qa || { ans: {}, order: st.q.map(function (q) { return E.shuffle(q[1].map(function (_, i) { return i; }), Math.random); }) };
    var done = Object.keys(st.qa.ans).length, good = Object.keys(st.qa.ans).filter(function (k) { return st.qa.ans[k] === 0; }).length;
    return '<section class="card qpanel"><h2>' + icon('check') + ' Vragen bij de tekst</h2><p class="small">Je mag de tekst erbij houden, of eerst nog eens laten voorlezen.</p>' + st.q.map(function (q, qi) {
      var a = st.qa.ans[qi];
      return '<div class="q"><p><b>' + (qi + 1) + '. ' + esc(q[0]) + '</b> <button class="mini" data-a="sayq" data-q="' + qi + '">' + icon('sound') + '</button></p><div class="qopts">' + st.qa.order[qi].map(function (oi) { var cls = a === undefined ? '' : oi === 0 ? 'right' : oi === a ? 'wrong' : 'dim'; return '<button class="qopt ' + cls + '" data-a="qpick" data-q="' + qi + '" data-o="' + oi + '" ' + (a !== undefined ? 'disabled' : '') + '>' + esc(q[1][oi]) + '</button>'; }).join('') + '</div></div>';
    }).join('') + (done === st.q.length ? '<p class="fbline good">' + good + ' van de ' + st.q.length + ' goed!</p>' : '') + '</section>';
  }
  function saveRead() {
    var p = P(); if (!samen || samen.saved || !samen.wpm.length) return; samen.saved = true;
    W(p).reads.push({ date: new Date().toISOString(), title: samen.title, which: samen.which, wpm: samen.wpm, errs: samen.errs, selfs: samen.selfs || [], times: samen.times.map(Math.round) });
    noteDay(Math.round(samen.times.reduce(function (a, b) { return a + b; }, 0) / 60)); p.stars += 2 + samen.wpm.length; save();
  }
  document.addEventListener('change', function (e) {
    var p = P(); if (!p) return;
    if (e.target.id === 'weeksel') { p.week = +e.target.value; sess = null; save(); toast('Week ' + p.week + ' gekozen.'); }
    if (e.target.id === 'rate') { p.settings.rate = +e.target.value; save(); }
    if (e.target.id === 'groepsel') { p.groep = +e.target.value; save(); toast('Groep ' + p.groep + ' bewaard.'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'dict') { e.preventDefault(); checkDict(); }
    if (e.key === 'Enter' && e.target.id === 'newname') { e.preventDefault(); var c = document.querySelector('[data-a=create]'); if (c) c.click(); }
  });
  /* focus op het typvak in het dictee */
  var obs = new MutationObserver(function () { var el = $('#dict'); if (el && document.activeElement !== el && !el.dataset.f) { el.dataset.f = '1'; el.focus(); } });
  obs.observe(document.getElementById('app'), { childList: true, subtree: true });

  /* offline (alleen via internet, niet bij dubbelklikken) */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); }); }
  syncStart();
  window.__lr = { store: function () { return store; }, sess: function () { return sess; }, chk: function () { return chk; }, render: function () { render(); }, E: E, sync: function () { return SY; } };
  render();
})();
