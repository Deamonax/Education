/* LeesRijk engine: pure functies zonder DOM, te testen met node (tools/tests/engine.test.js).
   - lettergrepen, klankpatronen (tags) voor foutanalyse
   - lijkt-op-woorden (afleiders) voor het flitsen
   - flitstijd die zich aanpast (2-omlaag-1-omhoog trap, komt uit op ongeveer 71% goed)
   - herhaling verspreid over dagen (Leitner)
   - weekvoortgang en woorden per minuut */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./content.js') : root.LR_DATA;
  var XT = (typeof module !== 'undefined' && module.exports) ? require('./texts-extra.js') : root.LR_TEXTS;
  if (XT) D.weeks.forEach(function (w) {
    var add = XT[w.n]; if (!add) return;
    if (!w.texts) w.texts = [[w.text_title, w.text]];
    add.forEach(function (t) { if (!w.texts.some(function (o) { return o[0] === t[0]; })) w.texts.push(t); });
  });
  var VOW = /[aeiouyáéíóúëïöü]/;
  var DIGRAPH = ['aai', 'ooi', 'oei', 'ieuw', 'eeuw', 'uw', 'ui', 'eu', 'ou', 'au', 'ei', 'ij', 'oe', 'ie', 'aa', 'ee', 'oo', 'uu'];

  function rngFrom(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a, r) { return a[Math.floor(r() * a.length)]; }

  /* ---------- lettergrepen ---------- */
  function syllables(w) {
    var k = String(w).toLowerCase();
    if (D && D.syl && D.syl[k]) return D.syl[k].slice();
    /* eenvoudige reserve: splits voor een medeklinker tussen twee klinkergroepen */
    var parts = [], cur = '', i = 0, groups = k.match(/[aeiouy]+|[^aeiouy]+/g) || [k];
    for (i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (VOW.test(g[0])) { cur += g; continue; }
      var next = groups[i + 1];
      if (!cur || !next) { cur += g; continue; }
      if (!VOW.test(cur)) { cur += g; continue; }
      if (g.length === 1 || g === 'ch') { parts.push(cur); cur = g; }
      else { var cut = g.length - 1; if (g.slice(-2) === 'ch') cut = g.length - 2; parts.push(cur + g.slice(0, cut)); cur = g.slice(cut); }
    }
    if (cur) parts.push(cur);
    return parts;
  }
  /* open: lettergreep eindigt op een klinker; voor de open-dicht-regel tellen alleen a, e, o, u als enkele letter */
  function syllableType(s) { return /[aeiouy]$/.test(s) ? 'open' : 'dicht'; }

  /* ---------- klankpatronen voor foutanalyse ---------- */
  var TAG_INFO = {
    tweeteken: 'twee letters, één klank (ui, eu, ou, ei, ie, oe...)', clusterBegin: 'veel medeklinkers aan het begin (str, spr, schr)', clusterEind: 'veel medeklinkers aan het eind (rfst, rst, nkt)',
    open: 'open lettergreep: lange klank met één letter (ma-ken)', dicht: 'dichte lettergreep: korte klank (mak-ker)', chng: 'ch en ng na een korte klank (la-chen, zin-gen)',
    eindje: 'vaste eindjes (-ig, -lijk, -tje, -el, -er, -en)', voorvoegsel: 'vaste beginstukjes (be-, ge-, ver-, ont-, her-)', achtervoegsel: 'vaste eindstukken (-heid, -ing, -baar, -tie, -isch)',
    lang: 'lange woorden (3 of meer lettergrepen)', leen: 'woorden uit andere talen (c, ch, eau, g)', bd: 'b en d', kort: 'korte woorden'
  };
  var leenSet = null;
  function tags(w) {
    w = String(w).toLowerCase(); var t = [], sy = syllables(w);
    if (/ui|eu|ou|au|ei|ij|oe|ie/.test(w)) t.push('tweeteken');
    if (/^(schr|spr|str|sch|[^aeiouy]{3,})/.test(w) || /^[bdfgkpstvwz][lrnw]/.test(w)) t.push('clusterBegin');
    if (/[^aeiouyj]{3,}$/.test(w) || /(rst|nkt|rfst|lft|mst|ngst)$/.test(w)) t.push('clusterEind');
    if (sy.length >= 2) {
      var s0 = sy[0];
      if ((/[^aeiou][aeou]$/.test(s0) || /^[aeou]$/.test(s0)) && !/^ch/.test(sy[1])) t.push('open');
      if (/([bdfgklmnprstvz])\1/.test(w)) t.push('dicht');
    }
    if (/[aeiou](ch|ng)[aeiou]/.test(w)) t.push('chng');
    if (/(lijk|ig|tje|pje|je|el|er|en)$/.test(w) && sy.length >= 2) t.push('eindje');
    if (/^(be|ge|ver|ont|her)/.test(w) && sy.length >= 2) t.push('voorvoegsel');
    if (/(heid|ing|baar|tie|isch)$/.test(w)) t.push('achtervoegsel');
    if (sy.length >= 3) t.push('lang');
    if (!leenSet && D) { leenSet = {}; (D.weeks || []).forEach(function (wk) { if (wk.mode === 'manual') (wk.words || []).forEach(function (x) { leenSet[x] = 1; }); }); }
    if (leenSet && leenSet[w]) t.push('leen');
    if (/[bd]/.test(w)) t.push('bd');
    if (sy.length === 1 && w.length <= 4) t.push('kort');
    return t;
  }

  /* ---------- lijkt-op-woorden voor flitsen ---------- */
  var SWAPS = [['ui', 'eu'], ['eu', 'ui'], ['ou', 'ui'], ['ei', 'ie'], ['ie', 'ei'], ['oe', 'eo'], ['au', 'ua'], ['ij', 'ie'], ['oe', 'ou'], ['ou', 'oe'], ['eu', 'ue']];
  var LETTERS = { b: ['d', 'p'], d: ['b', 'p'], p: ['b', 'd'], m: ['n', 'w'], n: ['m', 'u'], u: ['n'], f: ['v'], v: ['f', 'w'], w: ['v'], s: ['z'], z: ['s'], g: ['k'], k: ['g'], h: ['n'], l: ['r'], r: ['l'], t: ['d'] };
  function mutations(w, cats) {
    var out = [], i, sy = syllables(w), cat = 'klinker';
    cats = cats || {};
    function add(x) { if (x && x !== w && /^[a-zëïéèöü]+$/.test(x) && out.indexOf(x) < 0) { out.push(x); cats[x] = cat; } }
    /* klinkers: lang/kort en open/dicht (bomen/bommen, maan/man) */
    add(w.replace(/([^aeiou])([aeou])([bdfgklmnprstvz])(?=[aeiou])/, '$1$2$3$3'));
    add(w.replace(/([aeou])([bdfgklmnprstvz])\2/, '$1$2'));
    add(w.replace(/(aa|ee|oo|uu)/, function (m) { return m[0]; }));
    add(w.replace(/([^aeiou])([aou])([^aeiou]+)$/, function (m, a, b, c) { return a + b + b + c; }));
    cat = 'tweeteken';
    /* tweetekenklanken verwisselen */
    SWAPS.forEach(function (p) { if (w.indexOf(p[0]) >= 0) add(w.replace(p[0], p[1])); });
    cat = 'letter';
    /* letters die op elkaar lijken */
    for (i = 0; i < w.length; i++) { var L = LETTERS[w[i]]; if (L) L.forEach(function (c) { add(w.slice(0, i) + c + w.slice(i + 1)); }); }
    cat = 'cluster';
    /* medeklinkers weglaten of omdraaien in een cluster */
    var m = w.match(/[^aeiouy]{2,}/g) || [];
    m.forEach(function (cl) { var at = w.indexOf(cl); for (var j = 0; j < cl.length; j++) add(w.slice(0, at + j) + w.slice(at + j + 1)); if (cl.length >= 2) add(w.slice(0, at) + cl[1] + cl[0] + cl.slice(2) + w.slice(at + cl.length)); });
    cat = 'volgorde';
    /* letters omdraaien */
    for (i = 0; i + 1 < w.length; i++) add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    cat = 'greep';
    /* lange woorden: een lettergreep weglaten of omwisselen */
    if (sy.length >= 3) { for (i = 0; i < sy.length; i++) add(sy.slice(0, i).concat(sy.slice(i + 1)).join('')); for (i = 0; i + 1 < sy.length; i++) { var c = sy.slice(); var t = c[i]; c[i] = c[i + 1]; c[i + 1] = t; add(c.join('')); } }
    return out;
  }
  /* kies n afleiders: verschillende soorten, zo veel mogelijk van dezelfde lengte */
  function distractors(w, n, r) {
    r = r || Math.random; n = n || 3;
    var cats = {}, all = mutations(w, cats).filter(function (x) { return Math.abs(x.length - w.length) <= 1 || syllables(w).length >= 3; });
    if (all.length < n) all = mutations(w, cats);
    /* eerst de leerzame soorten (klinkerlengte, tweetekenklank, cluster), uit elke soort hoogstens een, dan de rest */
    var order = ['klinker', 'tweeteken', 'cluster', 'greep', 'letter', 'volgorde'], out = [], byCat = {};
    shuffle(all, r).forEach(function (x) { (byCat[cats[x]] = byCat[cats[x]] || []).push(x); });
    var cs = order.filter(function (c) { return byCat[c]; });
    var first = cs.slice(0, 4).filter(function (c) { return c !== 'letter' && c !== 'volgorde'; });
    shuffle(first, r).forEach(function (c) { if (out.length < n) out.push(byCat[c].shift()); });
    var rest = shuffle([].concat.apply([], cs.map(function (c) { return byCat[c]; })), r);
    for (var i = 0; i < rest.length && out.length < n; i++) if (out.indexOf(rest[i]) < 0) out.push(rest[i]);
    while (out.length < n) out.push(w + 'e'.repeat(out.length + 1));
    return out;
  }

  /* ---------- flitstijd (trap) ---------- */
  var FLASH = { start: 700, min: 120, max: 2500, down: 0.85, up: 1.2 };
  function newFlash(ms) { return { ms: ms || FLASH.start, start: ms || FLASH.start, streak: 0, n: 0, ok: 0, hist: [] }; }
  /* 2 goed op rij: korter; 1 fout: langer (Levitt, 1971: komt uit rond 71% goed) */
  function flashStep(f, correct, now) {
    f.n++; if (correct) f.ok++;
    if (correct) { f.streak++; if (f.streak >= 2) { f.ms = Math.max(FLASH.min, Math.round(f.ms * FLASH.down)); f.streak = 0; } }
    else { f.streak = 0; f.ms = Math.min(FLASH.max, Math.round(f.ms * FLASH.up)); }
    var day = new Date(now || Date.now()).toISOString().slice(0, 10);
    var last = f.hist[f.hist.length - 1];
    if (last && last[0] === day) last[1] = f.ms; else f.hist.push([day, f.ms]);
    if (f.hist.length > 200) f.hist.shift();
    return f.ms;
  }

  /* ---------- herhaling over dagen (Leitner) ---------- */
  var IV = [1, 3, 7, 21];
  function reviewMiss(rev, word, now) { if (now == null) now = Date.now(); rev[word] = { box: 0, due: now + 16 * 36e5, miss: ((rev[word] || {}).miss || 0) + 1 }; }
  function reviewHit(rev, word, now) {
    if (now == null) now = Date.now(); var e = rev[word]; if (!e) return;
    e.box++; if (e.box >= IV.length) { delete rev[word]; return; }
    e.due = now + IV[e.box] * 864e5;
  }
  function dueWords(rev, now, max) {
    if (now == null) now = Date.now();
    return Object.keys(rev).filter(function (k) { return rev[k].due <= now; }).sort(function (a, b) { return rev[a].due - rev[b].due; }).slice(0, max || 6);
  }

  /* ---------- patroonstatistiek ---------- */
  function notePattern(stats, word, ok) {
    tags(word).forEach(function (t) { var s = stats[t] || (stats[t] = { n: 0, err: 0 }); s.n++; if (!ok) s.err++; });
  }
  function hardPatterns(stats, min) {
    min = min || 6;
    return Object.keys(stats).filter(function (k) { return stats[k].n >= min && TAG_INFO[k] && k !== 'bd' && k !== 'kort'; })
      .map(function (k) { return { tag: k, info: TAG_INFO[k], n: stats[k].n, rate: stats[k].err / stats[k].n }; })
      .sort(function (a, b) { return b.rate - a.rate; });
  }

  /* ---------- lezen op tijd ---------- */
  function wpm(wordsRead, errors, seconds) { if (!seconds) return 0; return Math.round(Math.max(0, wordsRead - errors) * 60 / seconds); }
  function words(text) { return String(text).split(/\s+/).filter(Boolean); }

  /* ---------- week en sessie ---------- */
  function week(n) { return (D.weeks || []).find(function (w) { return w.n === n; }); }
  function ruleWeeks(n) { var w = week(n); if (!w) return []; return w.review ? w.review.map(week).filter(function (x) { return x && !x.review; }) : [w]; }
  function wordsFor(n, r) {
    var ws = ruleWeeks(n), out = [];
    ws.forEach(function (w) { out = out.concat(w.words || []); });
    if (ws.length === 1 && D.pools && D.pools[n]) out = out.concat(D.pools[n]);
    out = out.filter(function (x, i) { return out.indexOf(x) === i; });
    return shuffle(out, r || Math.random);
  }
  function nonwordsFor(n, r) { var out = []; ruleWeeks(n).forEach(function (w) { out = out.concat(w.nonwords || []); }); return shuffle(out, r || Math.random); }
  /* regex-match posities voor "zoek het stukje" */
  function patternSpans(w, wk) {
    var spans = [];
    if (wk.mode === 'regex') { var re = new RegExp(wk.pattern, 'g'), m; while ((m = re.exec(w)) !== null) { if (!m[0]) { re.lastIndex++; continue; } spans.push([m.index, m.index + m[0].length]); } }
    else if (wk.mode === 'manual') { var rest = 0; (wk.manual[w] || []).forEach(function (sub) { var i = w.indexOf(sub, rest); if (i >= 0) { spans.push([i, i + sub.length]); rest = i + sub.length; } }); }
    return spans;
  }
  /* lang of kort: woorden waarvan de eerste lettergreep a, e, o of u als klinker heeft */
  function vowelLength(w) {
    var sy = syllables(w); if (sy.length < 2) return null;
    var s0 = sy[0], m = s0.match(/[aeiouy]+/g); if (!m || m.length !== 1) return null;
    var v = m[0]; if (!/^[aeou]$/.test(v)) return null;
    if (/(ch)$/.test(s0) || /^ch/.test(sy[1])) return 'kort';
    return syllableType(s0) === 'open' ? 'lang' : 'kort';
  }
  /* weekscore: zijn de oefeningen van deze week goed genoeg om door te gaan?
     - minstens 4 oefeningen deze week
     - gemiddeld 80% goed bij hakken, zoeken, lang/kort en dictee, gemeten over de laatste 20 pogingen per onderdeel
     Flitsen telt niet mee: de flitstijd past zich zelf aan tot een kind ongeveer 7 van de 10 goed heeft,
     dus dat percentage blijft altijd rond de 70%. Vroeger trok dat het gemiddelde omlaag en bleef een kind hangen. */
  var READY = { sessions: 4, acc: 0.8, recent: 20, minN: 6, kinds: ['hak', 'zoek', 'lang', 'dictee'] };
  function weekProgress(ws) {
    var parts = READY.kinds.map(function (k) {
      var r = ws && ws.recent && ws.recent[k], x = ws && ws[k];
      if (r && r.length >= READY.minN) return { k: k, n: r.length, acc: r.reduce(function (a, b) { return a + b; }, 0) / r.length };
      if (x && x.n >= READY.minN) return { k: k, n: x.n, acc: x.ok / x.n };
      return null;
    }).filter(Boolean);
    var acc = parts.length ? parts.reduce(function (a, b) { return a + b.acc; }, 0) / parts.length : null;
    var sessions = ws ? ws.sessions || 0 : 0;
    return { sessions: sessions, needSessions: READY.sessions, acc: acc, needAcc: READY.acc, parts: parts, ready: sessions >= READY.sessions && acc !== null && acc >= READY.acc - 1e-9 };
  }
  function weekReady(ws) { return weekProgress(ws).ready; }

  /* ---------- afwisseling: kies eerst wat het langst niet (of nog nooit) is geweest ---------- */
  function dayNo(now) { return Math.floor((now == null ? Date.now() : now) / 864e5); }
  function fresh(list, n, seen, r, now) {
    seen = seen || {}; var d = dayNo(now), uniq = list.filter(function (x, i) { return list.indexOf(x) === i; });
    var sh = shuffle(uniq, r || Math.random);
    sh.sort(function (a, b) { var A = seen[a] == null ? -1e9 : seen[a], B = seen[b] == null ? -1e9 : seen[b]; return A - B; });
    return sh.slice(0, n);
  }
  function markSeen(seen, items, now) {
    var d = dayNo(now); items.forEach(function (x) { seen[x] = d; });
    var keys = Object.keys(seen); if (keys.length > 3000) keys.sort(function (a, b) { return seen[a] - seen[b]; }).slice(0, keys.length - 3000).forEach(function (k) { delete seen[k]; });
  }
  function textsFor(n) { var out = []; ruleWeeks(n).concat(week(n).review ? [week(n)] : []).forEach(function (w) { (w.texts || [[w.text_title, w.text]]).forEach(function (t) { out.push({ title: t[0], text: t[1], week: w.n }); }); }); var wk = week(n); if (wk.review) (wk.texts || []).forEach(function (t) { if (!out.some(function (o) { return o.title === t[0]; })) out.push({ title: t[0], text: t[1], week: n }); }); return out; }

  var E = { dayNo: dayNo, fresh: fresh, markSeen: markSeen, textsFor: textsFor, syllables: syllables, syllableType: syllableType, tags: tags, TAG_INFO: TAG_INFO, mutations: mutations, distractors: distractors,
    FLASH: FLASH, newFlash: newFlash, flashStep: flashStep, reviewMiss: reviewMiss, reviewHit: reviewHit, dueWords: dueWords,
    notePattern: notePattern, hardPatterns: hardPatterns, wpm: wpm, words: words, week: week, ruleWeeks: ruleWeeks, wordsFor: wordsFor,
    nonwordsFor: nonwordsFor, patternSpans: patternSpans, vowelLength: vowelLength, weekReady: weekReady, weekProgress: weekProgress, READY: READY, shuffle: shuffle, pick: pick, rngFrom: rngFrom, data: D };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.LE = E;
})(this);
