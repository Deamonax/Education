/* Tachles tools: drill loop, mail check, writing lab, translation drills, pronunciation lab. */
(function () {
  var el = T.el, btn = T.btn;

  // ---------- drill loop ----------
  // runs items one by one; opts: {timeUp:fn, onEnd(summary), title}
  T.drillLoop = function (host, items, opts) {
    opts = opts || {};
    var i = 0, ok = 0, wrong = [];
    var wrap = el("div", { class: "loop" });
    host.appendChild(wrap);
    function next() {
      if (i >= items.length || (opts.timeUp && opts.timeUp())) return end();
      T.clear(wrap).appendChild(T.drill(items[i], function (r) { if (r.ok) ok++; else wrong.push(items[i]); i++; next(); }, Object.assign({}, opts, { counter: (i + 1) + " / " + items.length })));
    }
    function end() { T.clear(wrap); if (opts.onEnd) opts.onEnd({ done: i, ok: ok, wrong: wrong }); }
    if (!items.length) { wrap.appendChild(el("p", { class: "muted" }, opts.empty || "Nothing here right now.")); if (opts.onEnd) setTimeout(function () { opts.onEnd({ done: 0, ok: 0, wrong: [] }); }, 0); return; }
    next();
  };
  T.loopSummary = function (r, again) {
    return el("div", { class: "card done" }, el("h3", null, r.done ? r.ok + " of " + r.done + " right the first time" : "Done"),
      r.wrong.length ? el("p", { class: "muted" }, "The ones you missed are in your logbook and come back soon.") : null,
      again ? btn("Another round", again, "primary") : null);
  };

  // one card per sentence: all fixes in that sentence applied together
  T.ownFromIssues = function (issues, sentenceOf, src) {
    var groups = {}, order = [];
    issues.forEach(function (x) {
      var sent = sentenceOf(x);
      if (!groups[sent]) { groups[sent] = { fixed: sent, first: x }; order.push(sent); }
      if (groups[sent].fixed.indexOf(x.original) >= 0) groups[sent].fixed = groups[sent].fixed.replace(x.original, x.fix);
    });
    order.forEach(function (sent) { var g = groups[sent]; if (g.fixed !== sent) T.addOwn(sent, g.fixed, g.first.cat, g.first.en, g.first.he, src); });
  };

  // ---------- writing checklist: her top writing errors ----------
  var WRITE_CATS = ["article", "runon", "caps", "prep", "calque", "perfect", "homophone", "spelling", "agreement", "tone", "order", "colloc", "countable"];
  T.checklist = function () {
    var top = TE.weakCats(T.S.profile).filter(function (x) { return WRITE_CATS.indexOf(x.cat) >= 0; }).slice(0, 5);
    return el("details", { class: "checklist", open: true }, el("summary", null, "My checklist before sending"),
      el("ol", null, top.map(function (x) { return el("li", null, el("b", null, T.cat(x.cat).label), " ", el("span", { class: "muted" }, T.cat(x.cat).en.split(". ")[0] + ".")); })));
  };

  // ---------- mail check ----------
  function sentenceAround(text, frag) {
    var i = text.indexOf(frag);
    if (i < 0) return null;
    var a = Math.max(text.lastIndexOf(". ", i), text.lastIndexOf("\n", i), text.lastIndexOf("? ", i), text.lastIndexOf("! ", i));
    a = a < 0 ? 0 : a + 1;
    var ends = [". ", "\n", "? ", "! "].map(function (s) { var k = text.indexOf(s, i + frag.length); return k < 0 ? text.length : k + 1; });
    var b = Math.min.apply(null, ends);
    return text.slice(a, b).trim();
  }
  // Shared by mail check and writing tasks. opts: {text, kind, tone, anonymize, onDone(result), src}
  T.checkFlow = function (host, opts) {
    var S = T.S, map = {}, text = opts.text;
    if (opts.anonymize) { var an = TE.anonymize(text, S.settings.names); text = an.text; map = an.map; }
    T.clear(host).appendChild(el("p", { class: "muted" }, "Reading your text…"));
    TIO.ai("check", { text: text, kind: opts.kind, tone: opts.tone }).then(function (res) {
      var issues = (res.issues || []).filter(function (x) { return text.indexOf(x.original) >= 0; });
      var words = TE.wordCount(opts.text);
      // bookkeeping
      var cats = {};
      issues.forEach(function (x) { cats[x.cat] = (cats[x.cat] || 0) + 1; S.profile = TE.addEvidence(S.profile, x.cat, 1, 1); });
      if (words >= 40) ["article", "prep", "calque", "runon", "caps", "perfect", "tone"].forEach(function (c) { if (!cats[c]) S.profile = TE.addEvidence(S.profile, c, 1, 0); });
      S.checks.push({ d: T.today(), words: words, errors: issues.length, cats: cats, tone: !!(res.tone && res.tone.direct), src: opts.src || "mail" });
      T.ownFromIssues(issues.filter(function (x) { return x.severity >= 2; }), function (x) {
        var sent = sentenceAround(text, x.original);
        return !sent || sent.length > 220 || /\[(NAME|EMAIL|AMOUNT|IBAN|CARD|PHONE|URL)_/.test(sent) ? x.original : sent;
      }, opts.src || "email");
      T.save();
      stage1(issues, res);
    }).catch(function (e) {
      T.clear(host).appendChild(el("div", { class: "card" }, el("p", null, e && e.code === "passcode" ? "Wrong or missing passcode. Check Settings." : "The check didn't work right now. Try again in a minute."),
        btn("Try again", function () { T.checkFlow(host, opts); }, "primary")));
    });

    // Stage 1: she looks for the errors herself first
    function stage1(issues, res) {
      T.clear(host);
      if (!issues.length) return stage2(issues, res, text);
      var counts = {};
      issues.forEach(function (x) { counts[x.cat] = (counts[x.cat] || 0) + 1; });
      var desc = Object.keys(counts).map(function (c) { return counts[c] + " × " + T.cat(c).label.toLowerCase(); }).join(", ");
      var ta = el("textarea", { class: "answer tall", rows: 8, spellcheck: "false" }); ta.value = text;
      host.appendChild(el("section", { class: "card" },
        el("h3", null, issues.length + (issues.length === 1 ? " thing" : " things") + " to fix"),
        el("p", null, desc),
        el("p", { class: "muted" }, "Find and fix them yourself first. That's the skill you need when there's no app."),
        T.he("קודם תמצאי ותתקני בעצמך. זו המיומנות שצריך כשאין אפליקציה."),
        ta,
        el("div", { class: "row" }, btn("I fixed what I could", function () { stage2(issues, res, ta.value); }, "primary"),
          btn("Just show me", function () { stage2(issues, res, text); }, "ghost"))));
    }
    // Stage 2: the answers, which ones she found, the natural version
    function stage2(issues, res, mine) {
      T.clear(host);
      var found = 0;
      var list = issues.map(function (x) {
        var got = mine !== text && mine.indexOf(x.original) < 0 && mine.indexOf(x.fix) >= 0;
        if (got) found++;
        return el("li", { class: got ? "found" : "" },
          el("p", null, el("del", null, TE.deanonymize(x.original, map)), " → ", el("ins", null, TE.deanonymize(x.fix, map)), got ? el("span", { class: "pill ok" }, "you found it") : null),
          el("p", { class: "tag" }, T.cat(x.cat).label), el("p", { class: "en" }, x.en), T.he(x.he));
      });
      var natural = TE.deanonymize(res.natural || "", map);
      var copy = btn("Copy", function () { (navigator.clipboard ? navigator.clipboard.writeText(natural) : Promise.reject()).then(function () { T.toast("Copied."); }, function () { T.toast("Select the text and copy it."); }); }, "ghost small");
      host.appendChild(el("section", { class: "card" },
        el("h3", null, issues.length ? (mine !== text ? "You found " + found + " of " + issues.length : issues.length + " fixes") : "No errors found. Nice."),
        issues.length ? el("ol", { class: "issues" }, list) : null,
        res.tone && (res.tone.note_en || res.tone.direct) ? el("div", { class: "tone" }, el("p", null, el("b", null, "Tone: "), res.tone.note_en || "A bit direct for American work culture."), T.he(res.tone.note_he)) : null,
        natural ? el("div", { class: "natural" }, el("div", { class: "row between" }, el("h4", null, "Natural American version"), copy), el("p", { class: "pre" }, natural)) : null,
        issues.length ? el("p", { class: "muted" }, "The important ones are now cards in your logbook.") : null,
        opts.onDone ? btn("Continue", function () { opts.onDone({ issues: issues, natural: natural }); }, "primary") : null));
    }
  };

  T.views = T.views || {};
  T.views.check = function (host, opts) {
    opts = opts || {};
    var S = T.S;
    if (!T.status.claude) {
      host.appendChild(el("section", { class: "card" }, el("h2", null, "Mail check"),
        el("p", null, "The mail check needs the AI connection, which isn't set up on this device."),
        el("p", { class: "muted" }, "Until then, use your checklist below on every email, and practice in the writing lab."),
        T.checklist(), btn("Go to writing lab", function () { T.go("#write"); }, "primary")));
      if (opts.onDone) host.appendChild(btn("Continue", opts.onDone, "ghost"));
      return;
    }
    var kind = el("select", { "aria-label": "Type of text" }, ["Email", "Slack message", "PRD or doc", "Other"].map(function (k) { return el("option", null, k); }));
    var tone = el("select", { "aria-label": "Tone" }, [["keep", "Keep my tone"], ["more formal", "More formal"], ["friendlier", "Friendlier"], ["shorter", "Shorter"]].map(function (k) { return el("option", { value: k[0] }, k[1]); }));
    var ta = el("textarea", { class: "answer tall", rows: 9, placeholder: "Paste an email, Slack message or part of a doc", spellcheck: "false" });
    var anon = el("input", { type: "checkbox", id: "anon" });
    var out = el("div");
    T.put(host, el("section", { class: "card" },
      el("h2", null, opts.title || "Mail check"),
      el("p", { class: "muted" }, "Paste something you're about to send. You'll find the errors yourself first, then see the fixes."),
      el("div", { class: "row wrap" }, kind, tone),
      ta,
      el("label", { class: "check" }, anon, " Hide names, amounts, emails and account numbers before checking"),
      el("div", { class: "row" }, btn("Check", function () {
        if (TE.wordCount(ta.value) < 3) { ta.focus(); return; }
        T.checkFlow(out, { text: ta.value, kind: kind.value.toLowerCase(), tone: tone.value, anonymize: anon.checked, onDone: opts.onDone, src: kind.value === "Slack message" ? "Slack" : kind.value === "PRD or doc" ? "doc" : "email" });
      }, "primary"), opts.onDone ? btn("Skip", opts.onDone, "ghost") : null)),
      T.checklist(), out);
  };

  // ---------- writing lab ----------
  T.views.write = function (host) {
    var tabs = [["task", "Writing task"], ["fix", "Fix it"], ["dict", "Dictation"], ["rewrite", "Rewrite"]];
    var cur = (location.hash.split("/")[1]) || "task";
    host.appendChild(el("h2", null, "Writing lab"));
    host.appendChild(el("nav", { class: "tabs" }, tabs.map(function (t) { return el("a", { href: "#write/" + t[0], class: t[0] === cur ? "on" : "" }, t[1]); })));
    var body = el("div"); host.appendChild(body);
    T.write[cur] ? T.write[cur](body) : T.write.task(body);
  };
  T.write = {};
  T.write.task = function (body, opts) {
    opts = opts || {};
    var S = T.S;
    var task = TC.WRITE_TASKS[S.idx.write % TC.WRITE_TASKS.length];
    var ta = el("textarea", { class: "answer tall", rows: 8, spellcheck: "false", placeholder: "Write here. No spellcheck on purpose." });
    var out = el("div");
    T.put(body, el("section", { class: "card" }, el("p", { class: "tag" }, task.title), el("p", null, task.task), ta,
      el("div", { class: "row" },
        btn(T.status.claude ? "Check my text" : "Done", function () {
          if (TE.wordCount(ta.value) < 5) { ta.focus(); return; }
          S.idx.write++; S.writings = S.writings || [];
          var entry = { d: T.today(), task: task.id, text: ta.value };
          S.writings.push(entry); T.save();
          if (!T.status.claude) { T.clear(out).appendChild(el("div", { class: "card" }, el("p", null, "Saved. Read it once more with your checklist, then compare next week in Rewrite."), T.checklist(), opts.onDone ? btn("Continue", opts.onDone, "primary") : null)); return; }
          T.checkFlow(out, { text: ta.value, kind: task.title, tone: "keep", src: "writing", onDone: function (r) { entry.natural = r.natural; entry.errors = r.issues.length; T.save(); if (opts.onDone) opts.onDone(); else T.write.task(T.clear(body)); } });
        }, "primary"),
        btn("Other task", function () { S.idx.write++; T.save(); T.write.task(T.clear(body), opts); }, "ghost"))), T.checklist(), out);
  };
  T.write.fix = function (body, opts) {
    opts = opts || {};
    var top = TE.weakCats(T.S.profile).filter(function (x) { return WRITE_CATS.indexOf(x.cat) >= 0; }).slice(0, 6).map(function (x) { return x.cat; });
    var items = T.pickDrills(top, opts.n || 8).map(function (x) { return x; });
    T.drillLoop(body, items, { forceFix: true, timeUp: opts.timeUp, onEnd: function (r) { if (opts.onEnd) return opts.onEnd(r); body.appendChild(T.loopSummary(r, function () { T.write.fix(T.clear(body)); })); } });
  };
  // dictation: hear a correct work sentence, type it exactly
  T.write.dict = function (body, opts) {
    opts = opts || {};
    var top = TE.weakCats(T.S.profile).slice(0, 6).map(function (x) { return x.cat; });
    var pool = T.pickDrills(top, 4).map(function (x) { return { text: x.right[0], cat: x.cat, id: x.id }; })
      .concat(TE.shuffle(TC.SHADOW).slice(0, 2).map(function (s) { return { text: s, cat: "other", id: "sh" }; }));
    var i = 0, ok = 0;
    function one() {
      if (i >= pool.length || (opts.timeUp && opts.timeUp())) { T.clear(body); if (opts.onEnd) return opts.onEnd({ done: i, ok: ok, wrong: [] }); body.appendChild(T.loopSummary({ done: i, ok: ok, wrong: [] }, function () { T.write.dict(T.clear(body)); })); return; }
      var it = pool[i];
      var ta = el("textarea", { class: "answer", rows: 2, spellcheck: "false", autocapitalize: "off", placeholder: "Type exactly what you hear" });
      var fb = el("div");
      var card = el("section", { class: "card" }, el("p", { class: "counter muted" }, (i + 1) + " / " + pool.length), el("p", { class: "tag" }, "Dictation"),
        el("div", { class: "row" }, btn("▶ Play", function () { TIO.speak(it.text); }, "primary"), btn("▶ Slow", function () { TIO.speak(it.text, { rate: 0.75 }); }, "ghost")),
        ta, el("div", { class: "row" }, btn("Check", function () {
          var mine = TE.norm(ta.value), good = mine.replace(/[.!?]+$/, "") === TE.norm(it.text).replace(/[.!?]+$/, "");
          if (good) ok++;
          T.S.log.push({ d: T.today(), k: "dict", c: it.cat, ok: good, id: it.id }); T.save();
          T.clear(fb).appendChild(el("div", { class: "result " + (good ? "ok" : "no") }, el("p", { class: "verdict" }, good ? "Perfect, including capitals and punctuation." : "Compare:"),
            good ? null : T.diffView(ta.value, it.text), el("p", { class: "model" }, it.text),
            btn("Next", function () { i++; one(); }, "primary")));
        }, "primary")), fb);
      T.clear(body).appendChild(card);
      setTimeout(function () { TIO.speak(it.text); }, 300);
    }
    one();
  };
  // rewrite: write the same task again, a week or more later, and compare
  T.write.rewrite = function (body) {
    var S = T.S, d = T.today();
    var old = (S.writings || []).filter(function (w) { return d - w.d >= 7 && !w.rewritten; })[0];
    if (!old) { body.appendChild(el("section", { class: "card" }, el("p", null, "Nothing to rewrite yet. Texts from the writing task come back here after a week, so you can write them again without help and compare."))); return; }
    var task = TC.WRITE_TASKS.filter(function (t) { return t.id === old.task; })[0] || { title: "Your text", task: "" };
    var ta = el("textarea", { class: "answer tall", rows: 8, spellcheck: "false" });
    var out = el("div");
    T.put(body, el("section", { class: "card" }, el("p", { class: "tag" }, task.title + " · from " + (d - old.d) + " days ago"), el("p", null, task.task),
      el("p", { class: "muted" }, "Write it again from scratch, without looking at the old version."), ta,
      btn("Compare", function () {
        if (TE.wordCount(ta.value) < 5) return;
        old.rewritten = true; T.save();
        T.clear(out).appendChild(el("div", { class: "card" }, el("h4", null, "Then"), el("p", { class: "pre" }, old.text), el("h4", null, "Now"), el("p", { class: "pre" }, ta.value),
          old.errors !== undefined ? el("p", { class: "muted" }, "Then: " + old.errors + " errors in " + TE.wordCount(old.text) + " words.") : null));
        if (T.status.claude) { var more = el("div"); out.appendChild(more); T.checkFlow(more, { text: ta.value, kind: task.title, src: "writing" }); }
      }, "primary")), out);
  };

  // ---------- translation drills ----------
  var GROUPS = [["weak", "My weak spots"], ["prep", "Prepositions"], ["calque", "Literal translations"], ["tone", "Tone"], ["colloc", "Fintech phrases"], ["grammar", "Grammar"]];
  var GRAMMAR = ["article", "perfect", "copula", "question", "it", "countable", "comparative", "there", "order", "ifwhen"];
  T.views.translate = function (host) {
    var cur = location.hash.split("/")[1] || "weak";
    host.appendChild(el("h2", null, "Say it in English"));
    host.appendChild(el("p", { class: "muted" }, "Work sentences in Hebrew. Say or type them in natural American English. The goal is to avoid the word-for-word trap."));
    host.appendChild(el("nav", { class: "tabs" }, GROUPS.map(function (g) { return el("a", { href: "#translate/" + g[0], class: g[0] === cur ? "on" : "" }, g[1]); })));
    var body = el("div"); host.appendChild(body);
    function run() {
      var cats = cur === "weak" ? TE.weakCats(T.S.profile).slice(0, 4).map(function (x) { return x.cat; }) : cur === "grammar" ? GRAMMAR : [cur];
      T.drillLoop(body, T.pickDrills(cats, 8, { he: true }), { onEnd: function (r) { body.appendChild(T.loopSummary(r, function () { T.clear(body); run(); })); } });
    }
    run();
  };

  // ---------- pronunciation lab ----------
  T.views.pron = function (host) {
    var tabs = [["stress", "Word stress"], ["pairs", "Sound pairs"], ["cant", "Can / can't"], ["ed", "-ed endings"], ["shadow", "Shadowing"]];
    var cur = location.hash.split("/")[1] || "stress";
    host.appendChild(el("h2", null, "Pronunciation lab"));
    host.appendChild(el("nav", { class: "tabs" }, tabs.map(function (t) { return el("a", { href: "#pron/" + t[0], class: t[0] === cur ? "on" : "" }, t[1]); })));
    var body = el("div"); host.appendChild(body);
    (T.pron[cur] || T.pron.stress)(body, {});
  };
  T.pron = {};
  function pronLog(id, ok) { T.S.log.push({ d: T.today(), k: "pron", c: "pron", ok: ok, id: id }); T.save(); }
  function finishOr(body, opts, r, again) { T.clear(body); if (opts.onEnd) return opts.onEnd(r); body.appendChild(T.loopSummary(r, again)); }

  T.pron.stress = function (body, opts) {
    var S = T.S;
    var list = TC.STRESS.map(function (s) { return { s: s, last: S.seen["st:" + s[0]] || -999, r: Math.random() }; })
      .sort(function (a, b) { return a.last - b.last || a.r - b.r; }).slice(0, opts.n || 8).map(function (o) { return o.s; });
    var i = 0, ok = 0, wrong = [];
    function one() {
      if (i >= list.length || (opts.timeUp && opts.timeUp())) return finishOr(body, opts, { done: i, ok: ok, wrong: wrong }, function () { T.pron.stress(T.clear(body), {}); });
      var w = list[i]; S.seen["st:" + w[0]] = T.today();
      var fb = el("div");
      var sylls = el("div", { class: "sylls" }, w[1].map(function (sy, k) {
        return btn(sy, function () {
          Array.prototype.forEach.call(sylls.children, function (b, j) { b.disabled = true; if (j === w[2]) b.classList.add("right"); });
          var good = k === w[2]; if (good) ok++; else { wrong.push(w); sylls.children[k].classList.add("wrongpick"); }
          pronLog("st:" + w[0], good);
          TIO.speak(w[0]);
          T.clear(fb).appendChild(el("div", { class: "result " + (good ? "ok" : "no") },
            el("p", { class: "verdict" }, good ? "Yes." : "The stress is on " + w[1][w[2]].toUpperCase() + "."),
            el("p", { class: "model" }, w[1].map(function (x, j) { return j === w[2] ? x.toUpperCase() : x; }).join("·"), " ", T.say(w[0], 0.8)),
            el("p", { class: "muted" }, "Say it out loud three times, leaning on the big syllable."),
            btn("Next", function () { i++; one(); }, "primary")));
        }, "syl");
      }));
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "counter muted" }, (i + 1) + " / " + list.length),
        el("p", { class: "tag" }, "Which syllable is stressed?"), el("p", { class: "bigword" }, w[0]), sylls,
        i === 0 ? T.he("בעברית ההטעמה בדרך כלל בסוף המילה. באנגלית היא הרבה פעמים בהתחלה או באמצע, וזה משפיע מאוד על ההבנה.") : null, fb));
    }
    one();
  };

  // listen-and-choose, then say it
  T.pron.pairs = function (body, opts) {
    var setId = location.hash.split("/")[2];
    var set = TC.PAIRS.filter(function (p) { return p.id === setId; })[0];
    if (!set && !opts.set) {
      body.appendChild(el("div", { class: "grid" }, TC.PAIRS.map(function (p) { return el("a", { class: "tile", href: "#pron/pairs/" + p.id }, el("b", null, p.name)); })));
      return;
    }
    set = set || TC.PAIRS.filter(function (p) { return p.id === opts.set; })[0];
    var rounds = TE.shuffle(set.pairs).slice(0, 6), i = 0, ok = 0;
    function one() {
      if (i >= rounds.length || (opts.timeUp && opts.timeUp())) return finishOr(body, opts, { done: i, ok: ok, wrong: [] }, function () { T.pron.pairs(T.clear(body), opts); });
      var pair = rounds[i], target = pair[Math.random() < 0.5 ? 0 : 1];
      var fb = el("div");
      var choices = el("div", { class: "row center" }, TE.shuffle(pair).map(function (w) {
        return btn(w, function () {
          Array.prototype.forEach.call(choices.children, function (b) { b.disabled = true; if (b.textContent === target) b.classList.add("right"); });
          var good = w === target; if (good) ok++;
          pronLog("pair:" + set.id, good);
          T.clear(fb).appendChild(el("div", { class: "result " + (good ? "ok" : "no") }, el("p", { class: "verdict" }, good ? "Yes, " + target + "." : "It was " + target + "."),
            el("div", { class: "row" }, btn("▶ " + pair[0], function () { TIO.speak(pair[0], { rate: 0.8 }); }, "ghost small"), btn("▶ " + pair[1], function () { TIO.speak(pair[1], { rate: 0.8 }); }, "ghost small")),
            el("p", null, "Now say: ", el("b", null, target)), sayIt(target, function () { i++; one(); })));
        }, "choice");
      }));
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "counter muted" }, (i + 1) + " / " + rounds.length),
        el("p", { class: "tag" }, set.name), i === 0 ? T.he(set.he) : null,
        btn("▶ Play the word", function () { TIO.speak(target, { rate: 0.85 }); }, "primary"), el("p", { class: "muted" }, "Which word did you hear?"), choices, fb));
      setTimeout(function () { TIO.speak(target, { rate: 0.85 }); }, 300);
    }
    one();
  };
  // record one word or sentence and score it (Azure if available, else speech recognition match)
  function sayIt(ref, next) {
    var out = el("div");
    var box = T.speechBox({ maxSec: 8, kind: "word", onDone: function (r) {
      T.clear(out);
      if (T.status.azure && r.blob) {
        var sc = el("p", { class: "muted" }, "Scoring…"); out.appendChild(sc);
        TIO.pronounce(r.blob, ref).then(function (p) { out.replaceChild(scoreView(p, ref), sc); T.S.pron.push({ d: T.today(), score: Math.round(p.pron), src: "word" }); T.save(); })
          .catch(function () { sc.textContent = "Couldn't score this one."; });
      } else {
        var heard = (r.text || "").toLowerCase(), hit = heard.indexOf(ref.toLowerCase()) >= 0;
        out.appendChild(el("p", null, hit ? "Recognized as \"" + ref + "\". Good." : heard ? "Recognized as \"" + r.text + "\". Try again, exaggerate the sound." : "Listen to yourself:"));
      }
      if (r.blob) out.appendChild(T.audioPlayer(r.blob));
    } });
    return el("div", null, box, out, btn("Next", next, "primary"));
  }
  function scoreView(p, ref) {
    var cls = function (s) { return s >= 80 ? "good" : s >= 60 ? "mid" : "low"; };
    return el("div", { class: "score" },
      el("p", null, el("b", { class: "big " + cls(p.pron) }, Math.round(p.pron)), " / 100 pronunciation",
        el("span", { class: "muted" }, " · accuracy " + Math.round(p.accuracy) + " · fluency " + Math.round(p.fluency))),
      el("p", { class: "words" }, (p.words || []).map(function (w) {
        var weak = (w.phonemes || []).filter(function (ph) { return ph.score < 60; }).map(function (ph) { return ph.p; });
        return el("span", { class: "w " + cls(w.score), title: w.error !== "None" ? w.error : weak.length ? "weak sounds: " + weak.join(" ") : "" }, w.w, " ");
      })),
      el("p", { class: "muted" }, "Red and orange words need work. Tap Listen, then try again."));
  }
  T.scoreView = scoreView;

  T.pron.cant = function (body, opts) {
    var list = TE.shuffle(TC.CANCANT).slice(0, 6), i = 0, ok = 0;
    function one() {
      if (i >= list.length) return finishOr(body, opts, { done: i, ok: ok, wrong: [] }, function () { T.pron.cant(T.clear(body), opts); });
      var s = list[i], isNeg = /can't/.test(s), fb = el("div");
      var ch = el("div", { class: "row center" }, ["can", "can't"].map(function (w) {
        return btn(w, function () {
          var good = (w === "can't") === isNeg; if (good) ok++; pronLog("cant", good);
          Array.prototype.forEach.call(ch.children, function (b) { b.disabled = true; });
          T.clear(fb).appendChild(el("div", { class: "result " + (good ? "ok" : "no") }, el("p", { class: "verdict" }, good ? "Right." : "Listen again."), el("p", { class: "model" }, s, " ", T.say(s, 0.85)),
            el("p", { class: "muted" }, "In American English, \"can\" is short and quiet (kn). \"Can't\" is long and stressed, and the t is often silent."), btn("Next", function () { i++; one(); }, "primary")));
        }, "choice");
      }));
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "counter muted" }, (i + 1) + " / " + list.length), el("p", { class: "tag" }, "Did you hear can or can't?"),
        btn("▶ Play", function () { TIO.speak(s); }, "primary"), ch, fb));
      setTimeout(function () { TIO.speak(s); }, 300);
    }
    one();
  };

  T.pron.ed = function (body, opts) {
    var list = TE.shuffle(TC.ED).slice(0, 8), i = 0, ok = 0;
    var label = { t: "/t/  like worked", d: "/d/  like signed", id: "/ɪd/  extra syllable, like needed" };
    function one() {
      if (i >= list.length) return finishOr(body, opts, { done: i, ok: ok, wrong: [] }, function () { T.pron.ed(T.clear(body), opts); });
      var w = list[i], fb = el("div");
      var ch = el("div", { class: "stack" }, ["t", "d", "id"].map(function (k) {
        return btn(label[k], function () {
          var good = k === w[1]; if (good) ok++; pronLog("ed", good);
          Array.prototype.forEach.call(ch.children, function (b) { b.disabled = true; });
          T.clear(fb).appendChild(el("div", { class: "result " + (good ? "ok" : "no") }, el("p", { class: "verdict" }, good ? "Right." : w[0] + " ends in " + label[w[1]].split("  ")[0] + "."), T.say(w[0], 0.85),
            el("p", { class: "muted" }, "Only words ending in a t or d sound get the extra syllable (needed, updated). The rest: no extra syllable."), btn("Next", function () { i++; one(); }, "primary")));
        }, "choice");
      }));
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "counter muted" }, (i + 1) + " / " + list.length), el("p", { class: "tag" }, "How does the -ed sound?"), el("p", { class: "bigword" }, w[0]), ch,
        i === 0 ? T.he("בסוף ed לא תמיד יש הברה נוספת. רק אחרי t או d: needed, updated. ב-worked שומעים t, ב-signed שומעים d.") : null, fb));
    }
    one();
  };

  T.pron.shadow = function (body, opts) {
    var S = T.S;
    var list = opts.sentences || [TC.SHADOW[S.idx.shadow % TC.SHADOW.length], TC.SHADOW[(S.idx.shadow + 1) % TC.SHADOW.length]];
    var i = 0;
    function one() {
      if (i >= list.length || (opts.timeUp && opts.timeUp())) return finishOr(body, opts, { done: i, ok: i, wrong: [] }, function () { T.pron.shadow(T.clear(body), {}); });
      var s = list[i]; if (!opts.sentences) { S.idx.shadow++; T.save(); }
      var out = el("div");
      var box = T.speechBox({ maxSec: 15, kind: "shadow", prompt: s, onDone: function (r) {
        T.clear(out);
        if (r.blob) out.appendChild(el("div", { class: "row wrap" }, el("span", { class: "muted" }, "You:"), T.audioPlayer(r.blob), T.say(s)));
        if (T.status.azure && r.blob) {
          var sc = el("p", { class: "muted" }, "Scoring…"); out.appendChild(sc);
          TIO.pronounce(r.blob, s).then(function (p) { out.replaceChild(scoreView(p, s), sc); S.pron.push({ d: T.today(), score: Math.round(p.pron), src: "shadow" }); T.save(); })
            .catch(function () { sc.textContent = "Couldn't score this one."; });
        } else if (r.text) {
          var ref = TE.flat(s).split(" "), got = TE.flat(r.text).split(" "), hit = ref.filter(function (w) { return got.indexOf(w) >= 0; }).length;
          var pct = Math.round(hit / ref.length * 100);
          out.appendChild(el("p", null, "Speech recognition understood " + pct + "% of the words."));
          S.pron.push({ d: T.today(), score: pct, src: "asr" }); T.save();
        }
        out.appendChild(el("div", { class: "row" }, btn("Try again", function () { one(); }, "ghost"), btn("Next", function () { i++; one(); }, "primary")));
      } });
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "counter muted" }, (i + 1) + " / " + list.length), el("p", { class: "tag" }, "Shadowing"),
        el("p", { class: "shadowline" }, s),
        el("div", { class: "row" }, btn("▶ Listen", function () { TIO.speak(s); }, "primary"), btn("▶ Slow", function () { TIO.speak(s, { rate: 0.75 }); }, "ghost")),
        el("p", { class: "muted" }, "Listen two or three times. Then record yourself copying the rhythm: strong words long, small words short."), box, out));
    }
    one();
  };
})();
