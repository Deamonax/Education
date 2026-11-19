/* Tachles main: home, intake, daily session, check-in, logbook, progress, settings, router. */
(function () {
  var el = T.el, btn = T.btn, V = T.views = T.views || {};
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function weekDays() { // day numbers of this week, Monday first
    var t = T.today(), wd = (new Date().getDay() + 6) % 7, out = [];
    for (var i = 0; i < 7; i++) out.push(t - wd + i);
    return out;
  }
  function practiced(d) { var x = T.S.days[d]; return !!(x && (x.done || (x.blocks && Object.keys(x.blocks).length))); }
  function lastMeasureDay() { var m = T.S.measures; return m.length ? m[m.length - 1].d : (T.S.intake ? T.S.intake.d : null); }
  function dueCount() { return TE.dueCards(T.S.srs, T.today(), 999).length; }

  // ---------- home ----------
  V.home = function (host) {
    var S = T.S, t = T.today();
    var hour = new Date().getHours();
    host.appendChild(el("header", { class: "hello" }, el("h1", null, hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"),
      el("p", { class: "muted" }, new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))));
    if (!S.intake) {
      host.appendChild(el("section", { class: "card hero" }, el("h2", null, "Start here"),
        el("p", null, "A 20-minute intake: you talk about your work, paste a few real emails, and do a short quiz. The app then knows which mistakes are yours."),
        T.he("אבחון של 20 דקות: מדברים על העבודה, מדביקים כמה מיילים אמיתיים ועושים חידון קצר. ככה האפליקציה יודעת אילו טעויות הן שלך."),
        btn("Start the intake", function () { T.go("#intake"); }, "primary big")));
    }
    var today = S.days[t] || {};
    var nBlocks = today.blocks ? Object.keys(today.blocks).length : 0;
    host.appendChild(el("section", { class: "card today" },
      el("div", { class: "row between" }, el("h2", null, "Today"), today.done ? el("span", { class: "pill ok" }, "done") : nBlocks ? el("span", { class: "pill" }, nBlocks + " of " + (today.short ? 2 : 5) + " blocks") : null),
      el("p", null, today.done ? "Session done. Anything extra is a bonus." : "30 minutes: review, today's trap, writing, speaking, pronunciation."),
      el("div", { class: "row wrap" }, btn(nBlocks && !today.done ? "Continue session" : today.done ? "Do another round" : "Start 30-minute session", function () { T.go("#session"); }, "primary big"),
        btn("10-minute version", function () { T.go("#session/short"); }, "ghost")),
      el("div", { class: "week", "aria-label": "This week" }, weekDays().map(function (d, i) {
        return el("span", { class: "day" + (practiced(d) ? " on" : "") + (d === t ? " now" : "") }, DAYS[i]);
      }))));
    // check-in and weekly confidence
    var lm = lastMeasureDay();
    if (S.intake && lm !== null && t - lm >= 14) host.appendChild(el("section", { class: "card note" }, el("h3", null, "Check-in due"),
      el("p", null, "Every two weeks: 10 minutes to measure your speaking and writing on new topics, so you can see real progress."), btn("Do the check-in", function () { T.go("#measure"); }, "primary")));
    var lastConf = S.conf.length ? S.conf[S.conf.length - 1].d : -99;
    if (S.intake && t - lastConf >= 6 && (new Date().getDay() >= 5 || t - lastConf >= 9)) {
      var row = el("div", { class: "scale" });
      for (var v = 1; v <= 10; v++) (function (v) { row.appendChild(btn(String(v), function () { S.conf.push({ d: t, v: v }); T.save(); T.toast("Thanks. See it in Progress."); T.route(); }, "num")); })(v);
      host.appendChild(el("section", { class: "card note" }, el("h3", null, "How confident did you feel in English at work this week?"), row,
        el("p", { class: "muted small" }, "1 = not at all, 10 = completely")));
    }
    var due = dueCount();
    host.appendChild(el("div", { class: "grid tools" },
      tile("#check", "Mail check", "Before you hit send"),
      tile("#prepare", "Prepare", "A meeting or call coming up"),
      tile("#talk", "Speaking", "Work conversations, 4/3/2"),
      tile("#write", "Writing lab", "Tasks, fix it, dictation"),
      tile("#translate", "Say it in English", "Beat the Hebrew traps"),
      tile("#pron", "Pronunciation", "Stress, sounds, shadowing"),
      tile("#log", "Logbook", due ? due + " cards due" : "Your own mistakes"),
      tile("#progress", "Progress", "Then vs. now")));
    host.appendChild(el("p", { class: "status muted small" }, statusLine()));
  };
  function tile(href, title, sub) { return el("a", { class: "tile", href: href }, el("b", null, title), el("span", null, sub)); }
  function statusLine() {
    var s = T.status;
    if (s.claude) return "AI connected" + (s.whisper ? " · verbatim speech-to-text on" : " · browser speech recognition") + (s.azure ? " · pronunciation scoring on" : "") + ".";
    return "Offline mode: drills, pronunciation, logbook and recordings work. Mail check and conversations need the AI connection (see Settings).";
  }

  // ---------- daily session ----------
  // blocks: {id, title, min, run(host, ctx)} ; ctx.done(), ctx.timeUp()
  function plan(short) {
    var S = T.S, t = T.today();
    var used = S.valkuil.filter(function (v) { return t - v.d <= 2; }).map(function (v) { return v.c; });
    var trap = (S.days[t] && S.days[t].trap) || (TE.weakCats(S.profile, used).filter(function (x) { return TC.DRILLS.some(function (d) { return d.cat === x.cat && d.he; }); })[0] || { cat: "prep" }).cat;
    var monday = new Date().getDay() === 1;
    var review = { id: "review", title: "Review", min: 5, run: function (h, c) {
      var ids = TE.dueCards(S.srs, t, 12), items = ids.map(T.itemById).filter(Boolean);
      if (items.length < 4) items = items.concat(T.pickDrills(TE.weakCats(S.profile).slice(0, 5).map(function (x) { return x.cat; }), 6 - items.length, { he: true }));
      h.appendChild(intro("Review", "Your own mistakes that are due today. Say or type the right version.", "חזרה על הטעויות שלך שהגיע הזמן לחזור עליהן."));
      T.drillLoop(h, items, { timeUp: c.timeUp, onEnd: c.done });
    } };
    var blocks = [review];
    if (short) {
      blocks.push({ id: "mail", title: "Mail check", min: 5, run: function (h, c) {
        if (T.status.claude) V.check(h, { title: "Check one real email", onDone: c.done });
        else { h.appendChild(intro("Fix it", "Six quick writing fixes.", "שישה תיקונים קצרים בכתיבה.")); T.write.fix(h, { n: 6, timeUp: c.timeUp, onEnd: c.done }); }
      } });
      return blocks;
    }
    blocks.push({ id: "trap", title: "Today's trap", min: 5, run: function (h, c) {
      if (!S.days[t]) S.days[t] = { blocks: {} };
      S.days[t].trap = trap; S.valkuil.push({ d: t, c: trap }); T.save();
      var ex = TC.DRILLS.filter(function (d) { return d.cat === trap; })[0];
      var cat = T.cat(trap);
      h.appendChild(el("section", { class: "card intro" }, el("p", { class: "tag" }, "Today's trap"), el("h3", null, cat.label),
        el("p", null, cat.en), T.he(cat.he),
        ex ? el("div", { class: "pair" }, el("p", null, el("del", null, ex.wrong)), el("p", null, el("ins", null, ex.right[0]), " ", T.say(ex.right[0]))) : null));
      var go = btn("Practice it", function () { go.remove(); T.drillLoop(h, T.pickDrills([trap], 6, { he: true }).concat(T.pickDrills([trap], 2, { fix: true })).slice(0, 6), { timeUp: c.timeUp, onEnd: c.done }); }, "primary");
      h.appendChild(go);
    } });
    blocks.push({ id: "write", title: "Writing", min: 8, run: function (h, c) {
      if (T.status.claude) {
        var pick = el("div", { class: "row wrap" },
          btn("Check a real email", function () { T.clear(h); V.check(h, { title: "Check a real email", onDone: c.done }); }, "primary"),
          btn("Writing task", function () { T.clear(h); T.write.task(h, { onDone: c.done }); }, "ghost"));
        h.appendChild(intro("Writing", "Use something you really have to write today. No email today? Do a writing task.", "הכי טוב: מייל אמיתי שאת צריכה לשלוח היום. אין? תעשי משימת כתיבה."));
        h.appendChild(pick);
      } else {
        h.appendChild(intro("Writing", "Dictation and quick fixes: capitals, commas, articles and sound-alike words.", "הכתבה ותיקונים קצרים: אותיות גדולות, פסיקים, a/the ומילים שנשמעות דומה."));
        T.write.dict(h, { timeUp: c.timeUp, onEnd: function () { T.clear(h); T.write.fix(h, { n: 6, timeUp: c.timeUp, onEnd: c.done }); } });
      }
    } });
    blocks.push({ id: "speak", title: "Speaking", min: 8, run: function (h, c) {
      if (T.status.claude && monday) {
        h.appendChild(intro("Speaking", "Monday: rehearse something that's really on your calendar this week.", "יום שני: מתרגלים משהו אמיתי מהלו״ז של השבוע."));
        V.prepare(h, { onDone: c.done });
      } else if (T.status.claude) {
        var sc = TC.SCENARIOS[S.idx.scen % TC.SCENARIOS.length]; S.idx.scen++; T.save();
        V.roleplay(h, { scenario: sc, onDone: c.done });
      } else {
        V.flu(h, { short: true, onDone: c.done });
      }
    } });
    blocks.push({ id: "pron", title: "Pronunciation and wrap-up", min: 4, run: function (h, c) {
      h.appendChild(intro("Pronunciation", "Five work words: where's the stress?", "חמש מילים מהעבודה: איפה ההטעמה?"));
      T.pron.stress(h, { n: 5, onEnd: function () {
        T.clear(h);
        var wrongToday = S.log.filter(function (l) { return l.d === t && !l.ok && l.id && l.k !== "pron" && l.k !== "dict"; }).map(function (l) { return l.id; });
        var uniq = wrongToday.filter(function (x, i) { return wrongToday.indexOf(x) === i; }).slice(0, 3).map(T.itemById).filter(Boolean);
        if (!uniq.length) return c.done();
        h.appendChild(intro("One more time", "Today's misses, once more. Say them out loud.", "הטעויות של היום, עוד פעם אחת. בקול."));
        T.drillLoop(h, uniq, { onEnd: c.done });
      } });
    } });
    return blocks;
  }
  function intro(title, en, he) { return el("div", { class: "blockintro" }, el("h3", null, title), el("p", { class: "muted" }, en), T.he(he)); }

  V.session = function (host) {
    var short = location.hash.split("/")[1] === "short";
    var S = T.S, t = T.today();
    if (!S.days[t]) S.days[t] = { blocks: {} };
    var day = S.days[t]; day.short = short; if (!day.blocks) day.blocks = {};
    var blocks = plan(short), idx = 0;
    if (!day.done) while (idx < blocks.length && day.blocks[blocks[idx].id]) idx++;
    if (idx >= blocks.length) idx = 0;
    var bar = el("div", { class: "sessionbar" }), area = el("div"), timer = null;
    host.appendChild(bar); host.appendChild(area);
    function run() {
      clearInterval(timer);
      if (idx >= blocks.length) return finish();
      var b = blocks[idx], start = Date.now(), limit = b.min * 60, warned = false;
      var clock = el("span", { class: "clock" }, T.fmtTime(limit));
      T.clear(bar).appendChild(el("div", { class: "row between" },
        el("span", null, el("b", null, (idx + 1) + "/" + blocks.length + " "), b.title), clock));
      bar.appendChild(el("div", { class: "steps" }, blocks.map(function (x, i) { return el("i", { class: i < idx ? "done" : i === idx ? "now" : "" }); })));
      var skip = btn("Next block →", function () { done(); }, "ghost small");
      bar.firstChild.appendChild(skip);
      T.clear(area);
      var h = el("div"); area.appendChild(h);
      var finished = false;
      function done() {
        if (finished) return; finished = true;
        day.blocks[b.id] = true; day.min = (day.min || 0) + Math.round((Date.now() - start) / 60000); T.save();
        TIO.stopSpeak(); idx++; run();
      }
      timer = setInterval(function () {
        var left = limit - (Date.now() - start) / 1000;
        clock.textContent = left > 0 ? T.fmtTime(left) : "+" + T.fmtTime(-left);
        if (left <= 0 && !warned) { warned = true; clock.classList.add("over"); T.toast("Time's up for this block. Finish this item, then move on."); }
      }, 500);
      b.run(h, { done: done, timeUp: function () { return (Date.now() - start) / 1000 > limit; } });
    }
    function finish() {
      clearInterval(timer);
      day.done = true; T.save();
      var log = S.log.filter(function (l) { return l.d === t && l.k !== "pron"; });
      var ok = log.filter(function (l) { return l.ok; }).length;
      T.clear(bar);
      T.clear(area).appendChild(el("section", { class: "card done" }, el("h2", null, "Session done"),
        el("p", null, log.length ? ok + " of " + log.length + " right the first time today." : "Nice work."),
        el("p", { class: "muted" }, "Your mistakes from today come back in the review tomorrow and later this week."),
        T.he("הטעויות של היום יחזרו בחזרה מחר ובהמשך השבוע."),
        btn("Home", function () { T.go("#home"); }, "primary")));
    }
    run();
    return function () { clearInterval(timer); };
  };

  // ---------- intake ----------
  V.intake = function (host) {
    var S = T.S, step = 0, data = { speak: [], mails: [], quiz: null };
    var body = el("div"); host.appendChild(el("h2", null, "Intake")); host.appendChild(body);
    var steps = [welcome, speak, mails, quiz, stress, analyze];
    function next() { step++; steps[step](); window.scrollTo(0, 0); }
    function head(n, title, en, he) {
      return el("div", null, el("p", { class: "tag" }, "Step " + n + " of 5 · " + title), el("p", null, en), T.he(he));
    }
    function welcome() {
      T.clear(body).appendChild(el("section", { class: "card" },
        el("p", null, "Twenty minutes, five steps. There are no grades. The goal is to find your personal mistakes, so the daily practice is about you and not about a textbook."),
        T.he("עשרים דקות, חמישה שלבים. אין ציונים. המטרה היא למצוא את הטעויות האישיות שלך, כדי שהתרגול היומי יהיה עלייך ולא על ספר לימוד."),
        el("ol", null, el("li", null, "Talk about your work: 3 questions, up to 2 minutes each."), el("li", null, "Paste up to 3 real emails or messages."),
          el("li", null, "A short quiz: 16 sentences."), el("li", null, "Word stress: 8 words."), el("li", null, "Your profile.")),
        el("p", { class: "muted" }, "Your answers to the first question are saved, so in a few months you can hear the difference."),
        btn("Let's go", next, "primary big")));
    }
    function speak() {
      var i = data.speak.length;
      if (i >= TC.INTAKE_SPEAK.length) return next();
      var q = TC.INTAKE_SPEAK[i];
      T.clear(body).appendChild(el("section", { class: "card" }, head(1, "Speaking " + (i + 1) + "/3", "Answer out loud. Talk like you would in a meeting. Don't prepare, just talk.", "עני בקול, כמו בפגישה. בלי הכנה, פשוט לדבר."),
        el("p", { class: "quote" }, q), btn("▶ Hear the question", function () { TIO.speak(q); }, "ghost small"),
        T.speechBox({ maxSec: 120, kind: i === 0 ? "compare" : "intake", keep: true, prompt: q, onDone: function (r) { data.speak.push({ q: q, text: r.text, seconds: r.seconds, segments: r.segments }); speak(); } }),
        btn("Skip this question", function () { data.speak.push({ q: q, text: "", seconds: 0 }); speak(); }, "ghost small")));
    }
    function mails() {
      var tas = [0, 1, 2].map(function (i) { return el("textarea", { class: "answer", rows: 5, spellcheck: "false", placeholder: "Email or message " + (i + 1) }); });
      var anon = el("input", { type: "checkbox" });
      T.clear(body).appendChild(el("section", { class: "card" }, head(2, "Writing", "Paste up to 3 emails or Slack messages you wrote yourself in English, as they were sent. No need to clean them up.", "הדביקי עד 3 מיילים או הודעות שכתבת בעצמך באנגלית, כמו שנשלחו. לא לתקן קודם."),
        tas, el("label", { class: "check" }, anon, " Hide names, amounts and emails first"),
        el("div", { class: "row" }, btn("Next", function () {
          data.mails = tas.map(function (t) { return t.value.trim(); }).filter(Boolean);
          if (anon.checked) data.mails = data.mails.map(function (m) { return TE.anonymize(m, S.settings.names).text; });
          next();
        }, "primary"), btn("Skip", function () { data.mails = []; next(); }, "ghost"))));
    }
    function quiz() {
      var cats = ["prep", "calque", "article", "perfect", "question", "ifwhen", "tone", "colloc"];
      var items = [];
      cats.forEach(function (c) { items = items.concat(T.pickDrills([c], 1, { he: true })); });
      ["runon", "caps", "homophone", "agreement", "spelling"].forEach(function (c) { items = items.concat(T.pickDrills([c], 1)); });
      items = items.concat(T.pickDrills(["prep", "article", "calque"], 3, { he: true }));
      T.clear(body).appendChild(head(3, "Quiz", "16 short sentences. Answer as you naturally would; don't look anything up.", "16 משפטים קצרים. עני כמו שאת עונה בדרך כלל, בלי לחפש."));
      T.drillLoop(body, TE.shuffle(items), { onEnd: function (r) { data.quiz = r; next(); } });
    }
    function stress() {
      T.clear(body).appendChild(head(4, "Word stress", "Tap the stressed syllable.", "הקישי על ההברה המוטעמת."));
      T.pron.stress(body, { n: 8, onEnd: function (r) { data.stress = r; S.profile = TE.addEvidence(S.profile, "pron", r.done, r.done - r.ok); next(); } });
    }
    function analyze() {
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "tag" }, "Step 5 of 5 · Your profile"), el("p", { class: "muted" }, T.status.claude ? "Analyzing your speaking and writing. This takes about half a minute…" : "Building your profile…")));
      var speakText = data.speak.map(function (s) { return s.text; }).filter(Boolean).join("\n");
      var speakSec = data.speak.reduce(function (a, s) { return a + (s.seconds || 0); }, 0);
      var speakWords = TE.wordCount(speakText);
      var mailText = data.mails.join("\n\n");
      var m = { d: T.today(), baseline: true, speakWords: speakWords, speakErr: null, writeWords: TE.wordCount(mailText), writeErr: null, calques: null, wpm: TE.wpm(speakWords, speakSec), cats: {} };
      var segs = data.speak[0] && data.speak[0].segments; m.pauses = segs ? TE.pauses(segs) : null;
      var jobs = [];
      function take(src, d) {
        (d.issues || []).forEach(function (x) {
          m.cats[x.cat] = (m.cats[x.cat] || 0) + 1;
          S.profile = TE.addEvidence(S.profile, x.cat, 1, 1);
          if (x.severity >= 2 && Object.keys(S.own).length < 25) T.addOwn(x.original, x.fix, x.cat, x.en, x.he, src === "speech" ? "speaking" : "email");
        });
        var calq = (d.issues || []).filter(function (x) { return x.cat === "calque" || x.cat === "prep"; }).length;
        if (src === "speech") m.speakErr = (d.issues || []).length; else m.writeErr = (d.issues || []).length;
        m.calques = (m.calques || 0) + calq;
      }
      if (T.status.claude && speakWords > 10) jobs.push(TIO.ai("analyze", { text: speakText, source: "speech" }).then(function (d) { take("speech", d); }).catch(function () { }));
      if (T.status.claude && m.writeWords > 10) jobs.push(TIO.ai("analyze", { text: mailText, source: "writing" }).then(function (d) { take("writing", d); }).catch(function () { }));
      Promise.all(jobs).then(function () {
        // categories that showed no errors in long enough samples count as evidence too
        if (speakWords + m.writeWords > 150) ["article", "prep", "calque", "perfect", "runon", "caps", "tone"].forEach(function (c) { if (!m.cats[c]) S.profile = TE.addEvidence(S.profile, c, 2, 0); });
        S.measures.push(m);
        S.intake = { d: T.today(), done: true, speakWords: speakWords, mails: data.mails.length };
        T.save();
        result(m);
      });
    }
    function result(m) {
      var top = TE.weakCats(S.profile).slice(0, 5);
      T.clear(body).appendChild(el("section", { class: "card" }, el("h3", null, "Your top 5 to work on"),
        el("ol", { class: "profile" }, top.map(function (x) { var c = T.cat(x.cat); return el("li", null, el("b", null, c.label), el("p", { class: "muted" }, c.en), T.he(c.he)); })),
        m.wpm ? el("p", null, "Speaking speed: ", el("b", null, m.wpm + " words per minute"), m.speakErr !== null && m.speakWords ? " · " + TE.per100(m.speakErr, m.speakWords) + " errors per 100 words" : "", ".") : null,
        m.writeErr !== null && m.writeWords ? el("p", null, "Writing: ", el("b", null, TE.per100(m.writeErr, m.writeWords) + " errors per 100 words"), ".") : null,
        el("p", { class: "muted" }, "This is your starting point. Every two weeks a short check-in measures again on new topics."),
        el("p", null, "Daily plan: 30 minutes, five blocks. Your own mistakes are already in your logbook."),
        btn("Start today's session", function () { T.go("#session"); }, "primary big")));
    }
    if (S.intake && location.hash !== "#intake/redo") {
      body.appendChild(el("section", { class: "card" }, el("p", null, "You did the intake on " + new Date(S.intake.d * 864e5).toLocaleDateString("en-US", { month: "long", day: "numeric" }) + "."),
        el("p", { class: "muted" }, "Doing it again adds to your profile; it doesn't erase it."),
        btn("Do it again", function () { T.go("#intake/redo"); }, "ghost")));
      return;
    }
    welcome();
  };

  // ---------- check-in every two weeks ----------
  V.measure = function (host) {
    var S = T.S, body = el("div"), r = {};
    host.appendChild(el("h2", null, "Check-in"));
    host.appendChild(body);
    var used = (S.seen.measureSpeak || 0);
    var fresh = TC.SPEAK[(used + 7) % TC.SPEAK.length];
    var task = TC.WRITE_TASKS[(S.idx.write + 3) % TC.WRITE_TASKS.length];
    function s1() {
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "tag" }, "1 of 3 · The same question as always"), el("p", { class: "quote" }, TC.COMPARE),
        el("p", { class: "muted" }, "Up to 2 minutes. This one is always the same, so you can compare recordings over time."),
        T.speechBox({ maxSec: 120, kind: "compare", keep: true, prompt: TC.COMPARE, onDone: function (x) { r.a = x; s2(); } })));
    }
    function s2() {
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "tag" }, "2 of 3 · A new question"), el("p", { class: "quote" }, fresh),
        T.speechBox({ maxSec: 120, kind: "measure", keep: true, prompt: fresh, onDone: function (x) { r.b = x; s3(); } })));
    }
    function s3() {
      var ta = el("textarea", { class: "answer tall", rows: 8, spellcheck: "false" });
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "tag" }, "3 of 3 · Writing, without help"), el("p", null, task.task), ta,
        btn("Finish", function () { if (TE.wordCount(ta.value) < 15) { T.toast("A few more sentences, please."); return; } r.w = ta.value; calc(); }, "primary")));
    }
    function calc() {
      T.clear(body).appendChild(el("p", { class: "muted" }, "Measuring…"));
      S.seen.measureSpeak = used + 1;
      var speakText = [r.a.text, r.b.text].join("\n"), sec = (r.a.seconds || 0) + (r.b.seconds || 0);
      var m = { d: T.today(), speakWords: TE.wordCount(speakText), writeWords: TE.wordCount(r.w), speakErr: null, writeErr: null, calques: null, cats: {} };
      m.wpm = TE.wpm(m.speakWords, sec);
      var segs = (r.a.segments || []).concat(r.b.segments || []); m.pauses = r.a.segments ? TE.pauses(r.a.segments) + TE.pauses(r.b.segments || []) : null;
      var jobs = [];
      if (T.status.claude) {
        jobs.push(TIO.ai("analyze", { text: speakText, source: "speech" }).then(function (d) { m.speakErr = (d.issues || []).length; tally(d); }).catch(function () { }));
        jobs.push(TIO.ai("analyze", { text: r.w, source: "writing" }).then(function (d) { m.writeErr = (d.issues || []).length; tally(d); }).catch(function () { }));
      }
      function tally(d) { (d.issues || []).forEach(function (x) { m.cats[x.cat] = (m.cats[x.cat] || 0) + 1; if (x.cat === "calque" || x.cat === "prep") m.calques = (m.calques || 0) + 1; }); if (m.calques === null) m.calques = 0; }
      Promise.all(jobs).then(function () {
        S.measures.push(m); T.save();
        var base = S.measures.filter(function (x) { return x.baseline; })[0] || S.measures[0];
        var row = function (label, a, b, lower) {
          var better = a !== null && b !== null && a !== undefined && b !== undefined ? (lower ? b < a : b > a) : null;
          return el("tr", null, el("td", null, label), el("td", null, a === null || a === undefined ? "?" : String(a)), el("td", { class: better === null ? "" : better ? "up" : "down" }, b === null || b === undefined ? "?" : String(b)));
        };
        var p = function (e, w) { return e === null || e === undefined || !w ? null : TE.per100(e, w); };
        T.clear(body).appendChild(el("section", { class: "card" }, el("h3", null, "Then vs. now"),
          el("table", { class: "mini" }, el("tr", null, el("th", null, ""), el("th", null, "Start"), el("th", null, "Today")),
            row("Speaking: errors / 100 words", p(base.speakErr, base.speakWords), p(m.speakErr, m.speakWords), true),
            row("Writing: errors / 100 words", p(base.writeErr, base.writeWords), p(m.writeErr, m.writeWords), true),
            row("Literal translations / 100 words", p(base.calques, base.speakWords + base.writeWords), p(m.calques, m.speakWords + m.writeWords), true),
            row("Speaking speed (words / min)", base.wpm || null, m.wpm || null, false)),
          el("p", { class: "muted" }, "Green = better than at the start. Hear the recordings side by side in Progress."),
          btn("See progress", function () { T.go("#progress"); }, "primary")));
      });
    }
    s1();
  };

  // ---------- logbook ----------
  V.log = function (host) {
    var S = T.S, t = T.today();
    var ids = Object.keys(S.srs), active = ids.filter(function (k) { return !S.srs[k].retired; }), retired = ids.length - active.length;
    var due = TE.dueCards(S.srs, t, 999);
    host.appendChild(el("h2", null, "Logbook"));
    host.appendChild(el("p", { class: "muted" }, "Every mistake you make becomes a card. A card comes back after 1, 3, 7 and 21 days, and leaves once you get it right 3 times in a row."));
    host.appendChild(T.he("כל טעות הופכת לכרטיס. הכרטיס חוזר אחרי 1, 3, 7 ו-21 ימים, ויוצא אחרי 3 תשובות נכונות ברצף."));
    host.appendChild(el("div", { class: "stats" }, stat(due.length, "due now"), stat(active.length, "active"), stat(retired, "fixed for good")));
    var body = el("div"); host.appendChild(body);
    if (due.length) body.appendChild(btn("Review " + Math.min(due.length, 15) + " now", function () {
      T.clear(body); T.drillLoop(body, due.slice(0, 15).map(T.itemById).filter(Boolean), { onEnd: function (r) { body.appendChild(T.loopSummary(r)); body.appendChild(btn("Back to logbook", function () { T.route(); }, "ghost")); } });
    }, "primary big"));
    var byCat = {};
    active.forEach(function (k) { var it = T.itemById(k); if (it) (byCat[it.cat] = byCat[it.cat] || []).push({ it: it, s: S.srs[k] }); });
    Object.keys(byCat).sort(function (a, b) { return byCat[b].length - byCat[a].length; }).forEach(function (c) {
      body.appendChild(el("details", { class: "logcat" }, el("summary", null, T.cat(c).label + " (" + byCat[c].length + ")"),
        el("ul", null, byCat[c].map(function (x) {
          var when = x.s.due <= t ? "due" : "in " + (x.s.due - t) + (x.s.due - t === 1 ? " day" : " days");
          return el("li", null, el("p", null, el("del", null, x.it.wrong), " → ", el("ins", null, x.it.right[0])),
            el("p", { class: "muted small" }, (x.it.kind === "own" ? "from your " + (x.it.src || "work") + " · " : "") + when + " · " + x.s.streak + "/3 in a row",
              " ", btn("Remove", function (e) { delete S.srs[x.it.id]; if (S.own[x.it.id]) delete S.own[x.it.id]; T.save(); e.target.closest("li").remove(); }, "link small")));
        }))));
    });
    if (!ids.length) body.appendChild(el("p", { class: "muted" }, "Empty for now. Cards appear as soon as you practice."));
  };
  function stat(n, label) { return el("div", { class: "stat" }, el("b", null, String(n)), el("span", null, label)); }

  // ---------- progress ----------
  V.progress = function (host) {
    var S = T.S, t = T.today();
    host.appendChild(el("h2", null, "Progress"));
    // practice days, last 8 weeks
    var start = weekDays()[0] - 49, cells = [];
    for (var d = start; d < start + 56; d++) cells.push(el("i", { class: (practiced(d) ? "on" : "") + (d > t ? " future" : ""), title: new Date(d * 864e5).toDateString() }));
    var weekCount = weekDays().filter(practiced).length;
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Practice"), el("p", null, el("b", null, weekCount + " of 7"), " days this week. Goal: 5."),
      el("div", { class: "heat" }, cells), el("p", { class: "muted small" }, "Last 8 weeks, Monday to Sunday.")));
    // writing errors per 100 words (mail checks + check-ins)
    var wpts = S.checks.filter(function (c) { return c.words >= 20; }).map(function (c) { return { x: c.d, y: TE.per100(c.errors, c.words) }; });
    var mw = S.measures.filter(function (m) { return m.writeErr !== null && m.writeWords; }).map(function (m) { return { x: m.d, y: TE.per100(m.writeErr, m.writeWords) }; });
    var clean = S.checks.filter(function (c) { return c.words >= 20; }), cleanPct = clean.length ? Math.round(clean.filter(function (c) { return c.errors === 0; }).length / clean.length * 100) : null;
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Writing"),
      T.chart([{ label: "Real emails", pts: wpts }, { label: "Check-ins", pts: mw }], { yLabel: "Errors per 100 words (lower is better)", min: 0 }),
      cleanPct !== null ? el("p", null, el("b", null, cleanPct + "%"), " of checked texts had no errors at all. Goal: 1 in 3.") : null));
    // speaking
    var ms = S.measures.filter(function (m) { return m.speakErr !== null && m.speakWords; }).map(function (m) { return { x: m.d, y: TE.per100(m.speakErr, m.speakWords) }; });
    var tk = S.talks.filter(function (x) { return x.errors !== null && x.words >= 20; }).map(function (x) { return { x: x.d, y: TE.per100(x.errors, x.words) }; });
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Speaking accuracy"),
      T.chart([{ label: "Check-ins", pts: ms }, { label: "Conversations", pts: tk }], { yLabel: "Errors per 100 words (lower is better)", min: 0 })));
    var sp = S.measures.filter(function (m) { return m.wpm; }).map(function (m) { return { x: m.d, y: m.wpm }; });
    var fl = S.flu.filter(function (f) { return f.wpm[2]; }).map(function (f) { return { x: f.d, y: f.wpm[2] }; });
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Speaking speed"),
      T.chart([{ label: "Check-ins", pts: sp }, { label: "4/3/2 last round", pts: fl }], { yLabel: "Words per minute" })));
    var pr = S.pron.slice(-60).map(function (p) { return { x: p.d, y: p.score }; });
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Pronunciation"), T.chart([{ label: "Score", pts: pr }], { yLabel: T.status.azure ? "Pronunciation score (0-100)" : "Words recognized (%)", min: 0 })));
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Confidence at work"), T.chart([{ label: "Confidence", pts: S.conf.map(function (c) { return { x: c.d, y: c.v }; }) }], { yLabel: "Weekly, 1 to 10", min: 0 })));
    // categories
    var w = TE.weakCats(S.profile).filter(function (x) { return x.n > 0; }).slice(0, 8);
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Where the mistakes are"),
      w.length ? el("div", { class: "bars" }, w.map(function (x) { var r = Math.round(TE.rate(S.profile.cats[x.cat]) * 100); return el("div", { class: "bar" }, el("span", null, T.cat(x.cat).label), el("i", { style: { width: Math.max(4, r) + "%" } }), el("b", null, r + "%")); })) : el("p", { class: "muted" }, "Fills in as you practice."),
      el("p", { class: "muted small" }, "Share of chances where this mistake showed up.")));
    // recordings: then vs now
    var rec = el("section", { class: "card" }, el("h3", null, "Hear the difference"), el("p", { class: "muted" }, "\"" + TC.COMPARE + "\""));
    host.appendChild(rec);
    TS.Rec.all().then(function (all) {
      var cmp = all.filter(function (r) { return r.kind === "compare"; });
      if (!cmp.length) { rec.appendChild(el("p", { class: "muted" }, "Your first recording appears after the intake.")); return; }
      var pick = cmp.length > 1 ? [cmp[0], cmp[cmp.length - 1]] : [cmp[0]];
      pick.forEach(function (m, i) {
        var slot = el("div", { class: "recrow" }, el("p", null, el("b", null, i === 0 ? "First" : "Latest"), " · " + new Date(m.t).toLocaleDateString("en-US", { month: "short", day: "numeric" })));
        rec.appendChild(slot);
        TS.Rec.get(m.id).then(function (full) { if (full && full.blob) slot.appendChild(T.audioPlayer(full.blob)); });
      });
      var others = all.filter(function (r) { return r.kind !== "compare" && r.kind !== "word"; }).slice(-10).reverse();
      if (others.length) rec.appendChild(el("details", null, el("summary", null, "Other recordings (" + others.length + ")"),
        el("ul", { class: "reclist" }, others.map(function (m) {
          var li = el("li", null, el("p", null, el("b", null, m.prompt || m.kind), el("span", { class: "muted small" }, " · " + new Date(m.t).toLocaleDateString("en-US", { month: "short", day: "numeric" }))));
          li.appendChild(btn("Load", function (e) { var b = e.target; TS.Rec.get(m.id).then(function (f) { if (f && f.blob) b.replaceWith(T.audioPlayer(f.blob)); }); }, "ghost small"));
          return li;
        }))));
    });
  };

  // ---------- settings ----------
  V.settings = function (host) {
    var S = T.S, st = S.settings;
    host.appendChild(el("h2", null, "Settings"));
    var heT = el("input", { type: "checkbox", checked: st.heOpen ? true : null, onchange: function (e) { st.heOpen = e.target.checked; T.save(); } });
    var vs = TIO.voices();
    var voice = el("select", { onchange: function (e) { st.voice = e.target.value; TIO.tts.voice = st.voice; T.save(); TIO.speak("Let's circle back on this after the stand-up."); } },
      el("option", { value: "" }, "Automatic (American)"), vs.map(function (v) { return el("option", { value: v.name, selected: v.name === st.voice ? true : null }, v.name); }));
    var rate = el("input", { type: "range", min: "0.7", max: "1.2", step: "0.05", value: String(st.rate), "aria-label": "Speech speed", onchange: function (e) { st.rate = +e.target.value; TIO.tts.rate = st.rate; T.save(); TIO.speak("This is the new speed."); } });
    var pass = el("input", { type: "password", value: st.passcode || "", placeholder: "Only if you set APP_PASSCODE", autocomplete: "off" });
    var names = el("input", { type: "text", value: (st.names || []).join(", "), placeholder: "Names to hide, comma separated" });
    var key = el("input", { type: "password", value: st.apiKey || "", placeholder: "sk-ant-… (optional)", autocomplete: "off" });
    var stat = el("ul", { class: "svc" });
    function showStatus() {
      var s = T.status;
      T.clear(stat).appendChild(el("li", { class: s.claude ? "on" : "" }, "AI (mail check, conversations): " + (s.claude ? (s.direct ? "connected (direct, key on this device)" : "connected") : "not connected")));
      stat.appendChild(el("li", { class: s.whisper ? "on" : "" }, "Verbatim speech-to-text: " + (s.whisper ? "on" : TIO.hasBrowserASR ? "using the browser's (may hide some errors)" : "not available, you'll type")));
      stat.appendChild(el("li", { class: s.azure ? "on" : "" }, "Pronunciation scoring: " + (s.azure ? "on" : "off (you compare by ear)")));
    }
    showStatus();
    host.appendChild(el("section", { class: "card form" },
      el("label", { class: "check" }, heT, " Show Hebrew explanations open by default"),
      el("label", null, "American voice", voice),
      el("label", null, "Voice speed", rate),
      el("label", null, "Passcode", pass),
      el("label", null, "Names to hide when anonymizing", names),
      el("label", null, "Claude API key, direct mode (optional)", key),
      el("p", { class: "muted small" }, "Only needed if the server has no key or its answers time out. The key stays on this device and is never in a backup."),
      btn("Save", function () {
        st.passcode = pass.value.trim(); TIO.setPasscode(st.passcode);
        st.names = names.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
        st.apiKey = key.value.trim(); TIO.setDirect(st.apiKey, st.model, st.modelFast); T.save();
        TIO.getStatus(true).then(function (s) { T.status = s; showStatus(); T.toast("Saved."); });
      }, "primary")));
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Connection"), stat,
      el("p", { class: "muted small" }, "Keys live on the server (Netlify environment variables), never in the app. See README.")));
    var file = el("input", { type: "file", accept: "application/json", style: { display: "none" }, onchange: function (e) {
      var f = e.target.files[0]; if (!f) return;
      f.text().then(function (txt) { var d = JSON.parse(txt); if (!d || d.v !== 1) throw new Error("bad"); d.settings = d.settings || {}; d.settings.apiKey = S.settings.apiKey; d.settings.passcode = S.settings.passcode; T.S = TS.migrate(d); T.save(); T.toast("Imported."); T.route(); }).catch(function () { T.toast("That file doesn't look like a Tachles backup."); });
    } });
    host.appendChild(el("section", { class: "card" }, el("h3", null, "Your data"),
      el("p", { class: "muted" }, "Everything is stored on this device. Make a backup now and then (recordings are not included in the file)."),
      el("div", { class: "row wrap" },
        btn("Download backup", function () {
          var copy = JSON.parse(JSON.stringify(S)); copy.settings.apiKey = ""; copy.settings.passcode = "";
          var blob = new Blob([JSON.stringify(copy)], { type: "application/json" });
          var a = el("a", { href: URL.createObjectURL(blob), download: "tachles-backup-" + new Date().toISOString().slice(0, 10) + ".json" }); document.body.appendChild(a); a.click(); a.remove();
        }, "ghost"),
        btn("Restore backup", function () { file.click(); }, "ghost"), file,
        btn("Delete all recordings", function () { if (confirmBox("Delete all recordings?")) TS.Rec.clear().then(function () { T.toast("Recordings deleted."); }); }, "ghost danger"),
        btn("Reset everything", function () { if (confirmBox("Erase all progress on this device?")) { T.S = TS.reset(); TS.Rec.clear(); T.save(); T.go("#home"); } }, "ghost danger"))));
  };
  // two-tap confirm instead of a browser dialog
  var armed = null;
  function confirmBox(msg) {
    if (armed === msg) { armed = null; return true; }
    armed = msg; T.toast(msg + " Tap again to confirm."); setTimeout(function () { if (armed === msg) armed = null; }, 4000);
    return false;
  }

  // ---------- router ----------
  var cleanup = null;
  T.route = function () {
    var hash = location.hash || "#home", name = hash.slice(1).split("/")[0] || "home";
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    TIO.stopSpeak();
    var app = T.clear(document.getElementById("app"));
    var nav = el("nav", { class: "top" }, el("a", { href: "#home", class: "brand", "aria-label": "Home" }, "Tachles"),
      el("div", { class: "links" }, el("a", { href: "#session", class: name === "session" ? "on" : "" }, "Today"), el("a", { href: "#log", class: name === "log" ? "on" : "" }, "Logbook"),
        el("a", { href: "#progress", class: name === "progress" ? "on" : "" }, "Progress"), el("a", { href: "#settings", class: name === "settings" ? "on" : "", "aria-label": "Settings" }, "⚙")));
    app.appendChild(nav);
    var main = el("main", { id: "main" }); app.appendChild(main);
    var view = V[name] || V.home;
    if (name !== "home" && name !== "session") main.appendChild(el("a", { href: "#home", class: "back" }, "← Home"));
    cleanup = view(main) || null;
    window.scrollTo(0, 0);
  };
  window.addEventListener("hashchange", T.route);
  T.boot = function () {
    var started = false;
    function start() { if (started) return; started = true; T.route(); }
    TIO.getStatus().then(function (s) { T.status = s; if (started) { var n = (location.hash || "#home").slice(1).split("/")[0]; if (n === "home" || n === "" || n === "settings") T.route(); } else start(); });
    setTimeout(start, 2500);
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(function () { });
  };
})();
