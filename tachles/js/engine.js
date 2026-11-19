/* Tachles engine: answer checking, word diff, spaced repetition, profile, anonymizer, metrics.
   Pure functions, no DOM. Exposes window.TE (and module.exports for Node tests). */
(function (root) {
  var DAY = 86400000;

  function dayNo(d) {
    d = d ? new Date(d) : new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY);
  }

  function norm(s) {
    return String(s || "").replace(/[‘’ʼ`]/g, "'").replace(/[“”]/g, '"')
      .replace(/\s+/g, " ").trim();
  }
  // comparison form: lower case, no end punctuation, contractions expanded
  var CONTR = [[/\bi'm\b/g, "i am"], [/\b(you|we|they)'re\b/g, "$1 are"], [/\b(he|she|it|that|there|what|who)'s\b/g, "$1 is"],
    [/\b(i|you|we|they|he|she|it|that)'ll\b/g, "$1 will"], [/\b(i|you|we|they)'ve\b/g, "$1 have"], [/\b(i|you|we|they|he|she)'d\b/g, "$1 would"],
    [/\bcan't\b/g, "cannot"], [/\bwon't\b/g, "will not"], [/\b(\w+)n't\b/g, "$1 not"]];
  function flat(s) {
    s = norm(s).toLowerCase();
    CONTR.forEach(function (c) { s = s.replace(c[0], c[1]); });
    return s.replace(/[.,!?;:"()]/g, " ").replace(/\s+/g, " ").trim();
  }

  // like flat() but keeps inner punctuation (for run-on sentence drills)
  function punct(s) {
    s = norm(s).toLowerCase();
    CONTR.forEach(function (c) { s = s.replace(c[0], c[1]); });
    return s.replace(/["()]/g, "").replace(/\s*([.,!?;:])\s*/g, "$1 ").replace(/[.!?]+\s*$/, "").trim();
  }

  function words(s) { return norm(s).split(" ").filter(Boolean); }

  // Word-level diff (LCS). Returns [{t:'same'|'del'|'add', w}]
  function diff(a, b) {
    var A = words(a), B = words(b), n = A.length, m = B.length, i, j;
    var key = function (w) { return w.toLowerCase().replace(/[.,!?;:"]/g, ""); };
    var L = [];
    for (i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      L[i][j] = key(A[i]) === key(B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (key(A[i]) === key(B[j])) { out.push({ t: A[i] === B[j] ? "same" : "case", w: B[j], was: A[i] }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ t: "del", w: A[i] }); i++; }
      else { out.push({ t: "add", w: B[j] }); j++; }
    }
    while (i < n) out.push({ t: "del", w: A[i++] });
    while (j < m) out.push({ t: "add", w: B[j++] });
    return out;
  }

  function similarity(a, b) {
    var d = diff(flat(a), flat(b)), same = 0, tot = 0;
    d.forEach(function (x) { tot++; if (x.t === "same" || x.t === "case") same++; });
    return tot ? same / tot : 0;
  }

  function closest(answer, rights) {
    var best = rights[0], bs = -1;
    rights.forEach(function (r) { var s = similarity(answer, r); if (s > bs) { bs = s; best = r; } });
    return best;
  }

  /* Check a drill answer.
     verdict: 'exact' (matches a model answer), 'good' (key chunk right, trap avoided),
              'trap' (made the typical Hebrew-English mistake), 'miss' (key chunk missing), 'empty' */
  function check(item, answer) {
    var a = norm(answer);
    if (!a) return { verdict: "empty", ok: false, model: item.right[0] };
    var cmp = item.cat === "caps" ? function (x) { return norm(x).replace(/[.!?]+$/, ""); }
      : item.cat === "runon" ? punct : flat;
    var ca = cmp(a);
    for (var i = 0; i < item.right.length; i++) {
      if (cmp(item.right[i]) === ca) return { verdict: "exact", ok: true, model: item.right[i] };
    }
    var model = closest(a, item.right);
    if (item.trap && item.trap.test(a)) return { verdict: "trap", ok: false, model: model };
    if (item.need && item.need.test(a)) return { verdict: "good", ok: true, model: model };
    return { verdict: "miss", ok: false, model: model };
  }

  /* Own cards come from her real corrections: {orig, fix}. Build need/trap text from the diff. */
  function ownCard(orig, fix, cat, en, he, src) {
    var d = diff(orig, fix), added = [], removed = [];
    d.forEach(function (x) { if (x.t === "add") added.push(x.w); if (x.t === "del") removed.push(x.w); });
    var id = "own_" + hash(flat(orig) + "|" + flat(fix));
    return { id: id, kind: "own", cat: cat || "other", wrong: norm(orig), right: [norm(fix)],
      needText: added.join(" "), trapText: removed.join(" "), en: en || "", hx: he || "", src: src || "" };
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function cleanW(s) { return flat(s); }
  function checkOwn(card, answer) {
    var a = norm(answer);
    if (!a) return { verdict: "empty", ok: false, model: card.right[0] };
    if (flat(a) === flat(card.right[0])) return { verdict: "exact", ok: true, model: card.right[0] };
    var fa = " " + flat(a) + " ";
    var need = cleanW(card.needText || ""), trap = cleanW(card.trapText || "");
    var hasNeed = !need || fa.indexOf(" " + need + " ") >= 0;
    var hasTrap = trap && new RegExp("\\b" + esc(trap) + "\\b").test(flat(a)) && !(need && need.indexOf(trap) >= 0);
    if (hasTrap && !hasNeed) return { verdict: "trap", ok: false, model: card.right[0] };
    if (hasNeed && similarity(a, card.right[0]) >= 0.7) return { verdict: "good", ok: true, model: card.right[0] };
    return { verdict: "miss", ok: false, model: card.right[0] };
  }

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  // ---------- spaced repetition (Leitner) ----------
  var INTERVALS = [0, 1, 3, 7, 21]; // days per box
  var RETIRE_STREAK = 3;
  function newSrs(today) { return { box: 0, due: today, streak: 0, seen: 0, wrong: 0, retired: false, last: null }; }
  function review(s, ok, today) {
    s = Object.assign({}, s);
    s.seen++; s.last = today;
    if (ok) {
      s.streak++;
      s.box = Math.min(4, s.box + 1);
      s.due = today + INTERVALS[s.box];
      if (s.streak >= RETIRE_STREAK) s.retired = true;
    } else {
      s.streak = 0; s.wrong++; s.box = 1; s.due = today + 1; s.retired = false;
    }
    return s;
  }
  function dueCards(srs, today, max) {
    var list = Object.keys(srs).map(function (k) { return { id: k, s: srs[k] }; })
      .filter(function (x) { return !x.s.retired && x.s.due <= today; })
      .sort(function (a, b) { return a.s.due - b.s.due || b.s.wrong - a.s.wrong; });
    return list.slice(0, max || 12).map(function (x) { return x.id; });
  }

  // ---------- profile ----------
  // importance: how much the category costs at work (1 = low, 3 = high)
  var IMPORTANCE = { prep: 3, calque: 3, tone: 3, article: 3, perfect: 2.5, runon: 3, caps: 2, homophone: 2.5, spelling: 1.5,
    agreement: 2, question: 2, copula: 2, it: 1.5, countable: 2, comparative: 1.5, there: 1.5, order: 2, ifwhen: 2, colloc: 2.5, other: 1, pron: 2 };
  function emptyProfile() { return { cats: {}, updated: null }; }
  // add evidence: n chances, err errors (from drills or from AI analysis)
  function addEvidence(p, cat, n, err) {
    p = JSON.parse(JSON.stringify(p || emptyProfile()));
    var c = p.cats[cat] || { n: 0, err: 0 };
    c.n += n; c.err += err;
    p.cats[cat] = c;
    return p;
  }
  // rate with a mild prior (1 error in 4 chances)
  function rate(c) { return ((c ? c.err : 0) + 1) / ((c ? c.n : 0) + 4); }
  function weakCats(p, exclude) {
    exclude = exclude || [];
    return Object.keys(IMPORTANCE).filter(function (k) { return k !== "other" && k !== "pron" && exclude.indexOf(k) < 0; })
      .map(function (k) { var c = p.cats[k]; return { cat: k, score: rate(c) * IMPORTANCE[k] * (c && c.n ? 1 : 0.6), n: c ? c.n : 0, err: c ? c.err : 0 }; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  // ---------- anonymizer ----------
  var PATTERNS = [
    ["EMAIL", /[\w.+-]+@[\w-]+\.[\w.-]+/g],
    ["URL", /https?:\/\/\S+/g],
    ["IBAN", /\b[A-Z]{2}\d{2}(?:[A-Z0-9]{10,30}|(?: [A-Z0-9]{1,4}){3,8})\b/g],
    ["CARD", /\b(?:\d[ -]?){13,19}\b/g],
    ["AMOUNT", /(?:[$€£₪]|USD|EUR|GBP|ILS)\s?\d[\d,.]*(?:\s?(?:k|m|bn|million|billion|thousand))?\b|\b\d[\d,.]*\s?(?:k|m|bn|million|billion|thousand)?\s?(?:USD|EUR|GBP|ILS|dollars|euros|shekels)\b/gi],
    ["PHONE", /\+?\d[\d ()-]{7,}\d/g]
  ];
  function anonymize(text, names) {
    var map = {}, count = {}, out = String(text || "");
    function sub(kind, re) {
      out = out.replace(re, function (m) {
        for (var k in map) if (map[k] === m) return k;
        count[kind] = (count[kind] || 0) + 1;
        var tok = "[" + kind + "_" + count[kind] + "]";
        map[tok] = m;
        return tok;
      });
    }
    PATTERNS.forEach(function (p) { sub(p[0], p[1]); });
    (names || []).map(function (n) { return n.trim(); }).filter(function (n) { return n.length > 1; })
      .sort(function (a, b) { return b.length - a.length; })
      .forEach(function (n) { sub("NAME", new RegExp("\\b" + esc(n) + "\\b", "g")); });
    return { text: out, map: map };
  }
  function deanonymize(text, map) {
    var out = String(text || "");
    Object.keys(map || {}).forEach(function (k) { out = out.split(k).join(map[k]); });
    return out;
  }

  // ---------- metrics ----------
  function wordCount(s) { return (String(s || "").match(/[A-Za-z][A-Za-z'’-]*/g) || []).length; }
  function per100(errors, words) { return words ? Math.round(errors / words * 1000) / 10 : 0; }
  function wpm(words, seconds) { return seconds >= 5 ? Math.round(words / (seconds / 60)) : 0; }
  // long pauses from timed segments [{start,end}]
  function pauses(segments, min) {
    min = min || 0.5;
    var n = 0;
    for (var i = 1; i < (segments || []).length; i++) if (segments[i].start - segments[i - 1].end >= min) n++;
    return n;
  }
  function shuffle(a, rnd) {
    a = a.slice(); rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  var TE = { DAY: DAY, dayNo: dayNo, norm: norm, flat: flat, diff: diff, similarity: similarity, check: check,
    ownCard: ownCard, checkOwn: checkOwn, hash: hash, INTERVALS: INTERVALS, RETIRE_STREAK: RETIRE_STREAK, newSrs: newSrs,
    review: review, dueCards: dueCards, IMPORTANCE: IMPORTANCE, emptyProfile: emptyProfile, addEvidence: addEvidence,
    rate: rate, weakCats: weakCats, anonymize: anonymize, deanonymize: deanonymize, wordCount: wordCount, per100: per100,
    wpm: wpm, pauses: pauses, shuffle: shuffle };
  root.TE = TE;
  if (typeof module !== "undefined") module.exports = TE;
})(typeof window !== "undefined" ? window : globalThis);
