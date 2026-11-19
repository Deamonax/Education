/* LeesRijk niveaumodel.
   Elke woord krijgt een moeilijkheid op de schaal van de leerlijn (1-2 = groep 3, 3-4 = groep 4, ... 11-12 = groep 8),
   op basis van de woordstructuur (lettergrepen, clusters, tweetekenklanken, open/dicht, voor- en achtervoegsels, leenwoord)
   en hoe vaak het woord voorkomt. Dat volgt de opbouw van de DMT-kaarten en de leerlijn technisch lezen:
   groep 3 eenlettergrepig (ook met clusters), groep 4 tweelettergrepig, groep 5 drie lettergrepen en vaste stukken,
   groep 6 en hoger lange woorden en leenwoorden.
   Per vaardigheid (woorden lezen, spelling) een Bayesiaanse schatting: gemiddelde + onzekerheid (zoals in RekenRijk).
   Het is een schatting op woordstructuur, geen genormeerde toets. */
(function (root) {
  'use strict';
  var Eng = (typeof module !== 'undefined' && module.exports) ? require('./engine.js') : root.LE;
  var D = Eng.data;
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var sig = function (x) { return 1 / (1 + Math.exp(-x)); };
  var A = 1.1, Z80 = 1.2816, V0 = 6, VMIN = .15, VMAX = 9, DRIFT_DAY = .01, DRIFT_ITEM = .002;

  /* ---------- moeilijkheid van een woord ---------- */
  var leen = null;
  function isLoan(w) {
    if (!leen) { leen = {}; D.weeks.forEach(function (wk) { if (wk.mode === 'manual') (wk.words || []).forEach(function (x) { leen[x] = 1; }); }); (D.bankLoan || []).forEach(function (x) { leen[x] = 1; }); }
    return !!leen[w] || (/eau|th|y|é|ë|tion|^c[^h]|ch[aeiou].*e$/.test(w) && !/ij/.test(w.replace(/y/g, '')));
  }
  /* Ijking (eigen inschatting, geen normtabel): groep 3 = 1 lettergreep (eerst kort en klankzuiver, dan clusters),
     groep 4 = 2 lettergrepen, groep 5 = 3 lettergrepen, groep 6 = 4 lettergrepen, groep 7-8 = 5 of meer lettergrepen,
     zeldzame woorden, veel vaste stukken en leenwoorden. */
  function difficulty(word, pseudo) {
    var w = String(word).toLowerCase(), sy = Eng.syllables(w), n = sy.length, d;
    var dig = /ui|eu|ou|au|ei|ij|ie|oe/.test(w);
    var cb = (w.match(/^[^aeiouy]+/) || [''])[0].replace(/^sch/, 'sx').replace(/^ch/, 'x').length;
    var ce = (w.match(/[^aeiouy]+$/) || [''])[0].replace(/ch$/, 'x').replace(/ng$/, 'x').length;
    var nAff = (/^(be|ge|ver|ont|her|on)/.test(w) ? 1 : 0) + (w.match(/(heid|lijk|ing|baar|schap|ig)(?=[a-z]*$)/g) || []).length;
    if (n === 1) {
      d = (w.length <= 2 ? .3 : w.length === 3 && !dig ? .6 : .9) + (dig ? .4 : 0) + (cb >= 3 ? 1.0 : cb === 2 ? .5 : 0) + (ce >= 3 ? 1.0 : ce === 2 ? .5 : 0);
      d = Math.min(d, 3.0);
    } else if (n === 2) {
      d = 3.0 + (/[^aeiou][aeou]$/.test(sy[0]) ? .4 : 0) + (/[aeiou](ch|ng)[aeiou]/.test(w) ? .4 : 0) + (cb >= 2 || ce >= 2 ? .4 : 0) + (dig ? .2 : 0) + (nAff ? .3 : 0);
    } else if (n === 3) {
      d = 4.8 + (nAff ? .3 : 0) + (/(tie|isch)$/.test(w) ? .5 : 0) + (cb >= 2 || ce >= 3 ? .3 : 0);
    } else {
      d = 6.4 + 1.0 * (n - 4) + (nAff >= 2 ? .5 : nAff ? .3 : 0) + (cb >= 2 ? .3 : 0);
    }
    if (!pseudo && isLoan(w)) d += n >= 3 ? 1.3 : 1.0;
    if (pseudo) d += .8;
    else { var z = D.zipf ? D.zipf[w] : null; if (z != null) d += z >= 5 ? -.6 : z >= 4 ? -.3 : z >= 3 ? 0 : z >= 2 ? .5 : .9; }
    return clamp(d, .2, 13);
  }
  /* woordstructuur in vier groepen, zoals de kaarten van de DMT */
  function structure(word, pseudo) {
    if (pseudo) return 'onzin';
    var n = Eng.syllables(word).length; return n === 1 ? 'een' : n === 2 ? 'twee' : n === 3 ? 'drie' : 'vier';
  }
  var STRUCT_NAMES = { een: 'woorden van 1 lettergreep', twee: 'woorden van 2 lettergrepen', drie: 'woorden van 3 lettergrepen', vier: 'woorden van 4 of meer lettergrepen', onzin: 'onzinwoorden (precies verklanken)' };

  /* ---------- schooljaar en groepen ---------- */
  function yearFraction(date) {
    date = date || new Date(); var y = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
    return clamp((date - new Date(y, 8, 1)) / (new Date(y + 1, 6, 15) - new Date(y, 8, 1)), 0, 1);
  }
  function expected(groep, date) { return 2 * (groep - 3) + .5 + 2 * yearFraction(date); }
  function levelInfo(M) {
    var x = M - .5;
    if (x < 0) return { groep: 3, fase: 'begin', label: 'Begin groep 3' };
    if (x >= 12) return { groep: 8, fase: 'eind', label: 'Eind groep 8 of hoger', above: true };
    var g = 3 + Math.floor(x / 2), f = (x % 2) / 2, fase = f < 1 / 3 ? 'begin' : f < 2 / 3 ? 'midden' : 'eind';
    return { groep: g, fase: fase, label: fase[0].toUpperCase() + fase.slice(1) + ' groep ' + g };
  }
  function monthsBehind(M, groep, date) { return Math.round((expected(groep, date) - M) * 5); }

  /* ---------- vaardigheid: gemiddelde + onzekerheid ---------- */
  /* neutrale start: we nemen aan dat het kind op het niveau van zijn groep leest, met veel onzekerheid */
  function newSkill(groep) { return { mu: expected(groep || 6) + OFF, v: V0, n: 0, last: 0, hist: [], secured: 0 }; }
  function clean(s, groep) {
    if (!s || !isFinite(s.mu) || !isFinite(s.v)) return newSkill(groep);
    return { mu: clamp(s.mu, -2, 15), v: clamp(s.v, VMIN, VMAX), n: s.n | 0, last: +s.last || 0, hist: Array.isArray(s.hist) ? s.hist.slice(-200) : [], secured: +s.secured || 0 };
  }
  function pCorrect(theta, d, o) { o = o || {}; var g = o.guess || 0, sl = o.slip == null ? .05 : o.slip; return g + (1 - g - sl) * sig(A * (theta - d - (o.offset || 0))); }
  /* x tussen 0 en 1; opties: guess, slip, offset (taakmoeilijkheid), weight */
  function update(s, d, x, o) {
    o = o || {}; var now = o.now || Date.now();
    if (s.last) s.v = Math.min(VMAX, s.v + DRIFT_DAY * Math.max(0, (now - s.last) / 864e5));
    s.v = Math.min(VMAX, s.v + DRIFT_ITEM);
    var g = o.guess || 0, sl = o.slip == null ? .05 : o.slip, eff = d + (o.offset || 0);
    var p = sig(A * (s.mu - eff)), P = g + (1 - g - sl) * p, dP = (1 - g - sl) * A * p * (1 - p), w = o.weight == null ? 1 : o.weight;
    var info = w * dP * dP / Math.max(.02, P * (1 - P)), vNew = clamp(1 / (1 / s.v + info), VMIN, VMAX);
    s.mu = clamp(s.mu + clamp(vNew * w * dP * (x - P) / Math.max(.02, P * (1 - P)), -1, 1), -2, 15); s.v = vNew; s.n++; s.last = now;
    s.secured = Math.max(s.secured || 0, interval(s)[0]);
    var day = new Date(now).toISOString().slice(0, 10), M = Math.round(mastery(s) * 100) / 100, S = Math.round(Math.sqrt(s.v) * 100) / 100, h = s.hist;
    if (h.length && h[h.length - 1][0] === day) h[h.length - 1] = [day, M, S]; else h.push([day, M, S]);
    if (h.length > 200) h.shift();
    return P;
  }
  /* niveau = de woordmoeilijkheid waarop ze 75% goed leest (zonder tijdsdruk, zonder gokken) */
  var OFF = Math.log(3.75) / A; /* P = .75 bij slip .05: logit(.75/.95) = ln(3.75) */
  function mastery(s) { return s.mu - OFF; }
  /* plus modelfout: een kind is niet bij elke woordsoort even sterk, en het model is een benadering */
  var MODEL_VAR = .3;
  function sd(s) { return Math.sqrt(s.v + MODEL_VAR * (1 + 25 / ((s.n || 0) + 12))); }
  function interval(s) { return [mastery(s) - Z80 * sd(s), mastery(s) + Z80 * sd(s)]; }
  function secured(s) { return Math.max(s.secured || 0, interval(s)[0]); }
  function sure(s) { var x = sd(s); return s.n < 8 ? 'nog te weinig gegevens' : x < .5 ? 'zeker' : x < .9 ? 'redelijk zeker' : 'nog onzeker'; }

  /* ---------- taken: hoe zwaar is de taak bovenop het woord ---------- */
  /* flitsen: hoe korter het woord te zien is, hoe moeilijker. Bij 500 ms telt het als gewoon lezen. */
  function flashTask(ms) { return { guess: .25, slip: .04, weight: .4, offset: clamp(1.2 * Math.log2(500 / ms), -1.2, 2.5) }; }
  var TASK = {
    hak: { guess: .05, slip: .05, offset: -.3, weight: .5 },
    luid: { guess: 0, slip: .03, offset: -1, weight: .08 },   /* hardop lezen, ouder tikt fouten aan */
    spel: { guess: 0, slip: .05, offset: .4 },                  /* spelling van hetzelfde woord is moeilijker dan lezen */
    check: { guess: .25, slip: .04, offset: 0 }
  };
  /* voor de niveaucheck: kies het woord dat het meest vertelt (rond 60% kans) */
  function pickInformative(s, pool, r, seen, offset) {
    var target = s.mu - .3 - (offset || 0), best = null, bd = 1e9;
    pool.forEach(function (it) { if (seen && seen.indexOf(it.w) >= 0) return; var dd = Math.abs(it.d - target) + (r ? r() * .6 : 0); if (dd < bd) { bd = dd; best = it; } });
    return best;
  }
  /* ---------- niveaucheck (adaptief) ---------- */
  var CHECK = { min: 16, max: 30, stopSd: .55 };
  function checkMs(s, groep, hiItem) {
    var base = groep <= 3 ? 1000 : groep === 4 ? 800 : 600, M = mastery(s);
    if (M > hiItem - .3) return 250; if (M > hiItem - 1) return 350; return base;
  }
  function checkNext(st, s, pool, groep, r) {
    var real = pool.filter(function (x) { return !x.pseudo; }), hiItem = Math.max.apply(null, real.map(function (x) { return x.d; }));
    var ms = checkMs(s, groep, hiItem), task = flashTask(ms), wantPseudo = st.i % 5 === 4;
    task.weight = .8; /* losse, adaptief gekozen woorden: bijna volle informatie */
    var it = pickInformative(s, pool.filter(function (x) { return !!x.pseudo === wantPseudo; }), r, st.seen, task.offset);
    return { item: it, ms: ms, task: task };
  }
  function checkDone(st, s) { return st.i >= CHECK.max || (st.i >= CHECK.min && Math.sqrt(s.v) < CHECK.stopSd); }

  /* meetbereik: wat de woordenbank kan meten. Ligt de schatting tegen de rand, dan zeggen we dat eerlijk. */
  var RANGE = null;
  function range() {
    if (RANGE) return RANGE; var ds = [];
    (D.bank || []).forEach(function (w) { ds.push(difficulty(w)); }); (D.bankPseudo || []).forEach(function (w) { ds.push(difficulty(w, true)); });
    ds.sort(function (a, b) { return a - b; });
    /* bovenaan meet de check ook met een kortere flitstijd (250 ms): dat telt als ongeveer 1,2 stap moeilijker */
    return (RANGE = { lo: ds[1], hi: ds[ds.length - 3] + 1.2 * Math.log2(500 / 250) });
  }
  /* label met eerlijke randen */
  function describe(s) {
    var M = mastery(s), iv = interval(s), R = range();
    if (M > R.hi - .8) return { label: 'Boven het meetbereik', detail: 'minstens ' + levelInfo(R.hi - .8).label.toLowerCase(), above: true, M: M };
    if (M < R.lo) return { label: 'Onder het meetbereik', detail: 'nog geen vlot leesniveau van begin groep 3. Kijk eerst of alle letters en klanken bekend zijn.', below: true, M: M };
    return { label: levelInfo(M).label, detail: 'tussen ' + levelInfo(Math.max(iv[0], R.lo)).label.toLowerCase() + ' en ' + (iv[1] > R.hi ? 'groep 8 of hoger' : levelInfo(iv[1]).label.toLowerCase()), M: M };
  }
  var L = { range: range, describe: describe, difficulty: difficulty, structure: structure, STRUCT_NAMES: STRUCT_NAMES, expected: expected, levelInfo: levelInfo, monthsBehind: monthsBehind, yearFraction: yearFraction,
    newSkill: newSkill, clean: clean, pCorrect: pCorrect, update: update, mastery: mastery, sd: sd, interval: interval, secured: secured, sure: sure,
    flashTask: flashTask, TASK: TASK, pickInformative: pickInformative, CHECK: CHECK, checkNext: checkNext, checkDone: checkDone, OFF: OFF, isLoan: isLoan };
  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.LL = L;
})(this);
