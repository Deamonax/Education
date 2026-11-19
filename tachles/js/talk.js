/* Tachles speaking: conversation hub, role-play with AI, prepare for a real situation, 4/3/2 fluency. */
(function () {
  var el = T.el, btn = T.btn;
  T.views = T.views || {};

  T.views.talk = function (host) {
    var S = T.S;
    host.appendChild(el("h2", null, "Speaking"));
    host.appendChild(el("div", { class: "grid" },
      el("a", { class: "tile accent", href: "#prepare" }, el("b", null, "Prepare for something real"), el("span", null, "A meeting or call coming up? Get the sentences and rehearse it.")),
      el("a", { class: "tile", href: "#flu" }, el("b", null, "4 / 3 / 2 fluency"), el("span", null, "Tell the same story three times, faster each time."))));
    host.appendChild(el("h3", null, "Work conversations"));
    if (!T.status.claude) host.appendChild(el("p", { class: "muted" }, "Without the AI connection these run as solo rehearsals: you record yourself and listen back."));
    host.appendChild(el("div", { class: "grid" }, TC.SCENARIOS.map(function (s) {
      var n = S.talks.filter(function (t) { return t.id === s.id; }).length;
      return el("a", { class: "tile", href: "#roleplay/" + s.id }, el("b", null, s.title), el("span", null, s.brief), n ? el("span", { class: "pill" }, n + "× done") : null);
    })));
  };

  // ---------- role-play ----------
  T.views.roleplay = function (host, opts) {
    opts = opts || {};
    var id = location.hash.split("/")[1];
    var sc = opts.scenario || TC.SCENARIOS.filter(function (s) { return s.id === id; })[0] || TC.SCENARIOS[0];
    if (!T.status.claude) return solo(host, sc, opts);
    var S = T.S, hist = [{ role: "partner", text: sc.open }], seconds = 0, voiceOn = true, ended = false;
    var chat = el("div", { class: "chat", "aria-live": "polite" });
    var dock = el("div", { class: "dock" });
    var endBtn = btn("End and get feedback", end, "ghost");
    host.appendChild(el("section", { class: "card" }, el("p", { class: "tag" }, sc.title), el("p", null, sc.brief), el("p", { class: "muted" }, "You're talking to " + sc.partner.split(".")[0] + ". Answer out loud; feedback comes at the end, not during."),
      T.he("עונים בקול. התיקונים מגיעים רק בסוף השיחה, כדי לא לקטוע את השטף.")));
    host.appendChild(chat); host.appendChild(dock);
    var vt = el("label", { class: "check" }, el("input", { type: "checkbox", checked: true, onchange: function (e) { voiceOn = e.target.checked; if (!voiceOn) TIO.stopSpeak(); } }), " Read partner lines aloud");
    host.appendChild(el("div", { class: "row between" }, vt, endBtn));
    function bubble(m) {
      chat.appendChild(el("div", { class: "msg " + (m.role === "me" ? "me" : "them") }, el("p", null, m.text),
        m.role !== "me" ? btn("▶", function () { TIO.speak(m.text); }, "ghost small", { "aria-label": "Play line" }) : null));
      chat.scrollTop = chat.scrollHeight;
    }
    function partnerSays(text) { bubble({ role: "partner", text: text }); if (voiceOn) TIO.speak(text); }
    function myTurn() {
      if (ended) return;
      T.clear(dock);
      var ta = el("textarea", { rows: 2, class: "answer", placeholder: "Or type your answer" });
      dock.appendChild(T.speechBox({ maxSec: 90, kind: "talk", onDone: function (r) { seconds += r.seconds || 0; send(r.text); } }));
      dock.appendChild(el("details", { class: "typed" }, el("summary", null, "Type instead"), ta, btn("Send", function () { if (ta.value.trim()) send(ta.value.trim()); }, "primary")));
    }
    function send(text) {
      if (!text) { myTurn(); return; }
      TIO.stopSpeak();
      hist.push({ role: "me", text: text }); bubble({ role: "me", text: text });
      T.clear(dock).appendChild(el("p", { class: "muted" }, "…"));
      TIO.ai("roleplay", { scenario: sc, history: hist }).then(function (d) {
        hist.push({ role: "partner", text: d.reply }); partnerSays(d.reply);
        if (d.done && hist.filter(function (m) { return m.role === "me"; }).length >= 3) { T.clear(dock).appendChild(btn("Get feedback", end, "primary")); return; }
        myTurn();
      }).catch(function () { T.clear(dock).appendChild(el("p", null, "The connection dropped.")); dock.appendChild(btn("Try again", function () { hist.pop(); chat.removeChild(chat.lastChild); send(text); }, "primary")); });
    }
    function end() {
      if (ended) return;
      var mine = hist.filter(function (m) { return m.role === "me"; });
      if (!mine.length) { if (opts.onDone) opts.onDone(); else T.go("#talk"); return; }
      ended = true; TIO.stopSpeak(); endBtn.disabled = true;
      T.clear(dock).appendChild(el("p", { class: "muted" }, "Writing your feedback…"));
      TIO.ai("debrief", { scenario: sc, history: hist }).then(function (d) {
        var words = mine.reduce(function (a, m) { return a + TE.wordCount(m.text); }, 0);
        S.talks.push({ d: T.today(), id: sc.id, words: words, errors: d.errors || (d.fixes || []).length, seconds: Math.round(seconds) });
        (d.fixes || []).forEach(function (x) { S.profile = TE.addEvidence(S.profile, x.cat, 1, 1); });
        T.ownFromIssues(d.fixes || [], function (x) {
          var line = mine.map(function (m) { return m.text; }).filter(function (t) { return t.indexOf(x.original) >= 0; })[0];
          return line && line.length < 200 ? line : x.original;
        }, "conversation");
        T.save();
        T.clear(dock).appendChild(el("section", { class: "card" }, el("h3", null, "Feedback"),
          (d.good || []).length ? el("div", null, el("h4", null, "What went well"), el("ul", null, d.good.map(function (g) { return el("li", null, g); }))) : null,
          (d.fixes || []).length ? el("div", null, el("h4", null, "What to fix"), el("ol", { class: "issues" }, d.fixes.map(function (x) {
            return el("li", null, el("p", null, el("del", null, x.original), " → ", el("ins", null, x.fix), " ", T.say(x.fix)), el("p", { class: "en" }, x.en), T.he(x.he));
          }))) : null,
          d.phrase ? el("div", { class: "natural" }, el("h4", null, "Phrase to steal"), el("p", null, el("b", null, d.phrase), " ", T.say(d.phrase)), el("p", { class: "muted" }, d.phrase_why || "")) : null,
          el("p", { class: "muted" }, "Say each fix out loud twice. They're in your logbook now."),
          el("div", { class: "row" }, opts.onDone ? btn("Continue", opts.onDone, "primary") : btn("Back to speaking", function () { T.go("#talk"); }, "primary"),
            opts.onDone ? null : btn("Do it again", function () { T.route(); }, "ghost"))));
      }).catch(function () { T.clear(dock).appendChild(el("p", null, "Couldn't get feedback right now.")); if (opts.onDone) dock.appendChild(btn("Continue", opts.onDone, "primary")); });
    }
    partnerSays(sc.open);
    myTurn();
  };

  // offline: solo rehearsal with self-review
  function solo(host, sc, opts) {
    var out = el("div");
    T.put(host, el("section", { class: "card" }, el("p", { class: "tag" }, sc.title + " · solo rehearsal"), el("p", null, sc.brief),
      el("p", { class: "quote" }, "\"" + sc.open + "\""), btn("▶ Hear the opening line", function () { TIO.speak(sc.open); }, "ghost"),
      el("p", { class: "muted" }, "Answer out loud for up to 2 minutes, as if you're in the meeting."),
      T.speechBox({ maxSec: 120, kind: "talk", keep: true, prompt: sc.title, onDone: function (r) {
        T.S.talks.push({ d: T.today(), id: sc.id, words: TE.wordCount(r.text), errors: null, seconds: Math.round(r.seconds || 0) }); T.save();
        T.clear(out).appendChild(el("section", { class: "card" }, el("h4", null, "Listen back"), r.blob ? T.audioPlayer(r.blob) : null,
          r.text ? el("p", { class: "pre" }, r.text) : null,
          el("p", null, "While listening, check:"), T.checklist(),
          el("div", { class: "row" }, btn("Record again", function () { T.route(); }, "ghost"), opts.onDone ? btn("Continue", opts.onDone, "primary") : null)));
      } })), out);
  }

  // ---------- prepare for a real situation ----------
  T.views.prepare = function (host, opts) {
    opts = opts || {};
    var ta = el("textarea", { class: "answer", rows: 3, placeholder: "For example: call with our partner bank tomorrow about delayed payouts; I need to explain the cause and ask for two more weeks." });
    var out = el("div");
    T.put(host, el("section", { class: "card" }, el("h2", null, "Prepare for something real"),
      el("p", { class: "muted" }, "What's coming up this week? A meeting, a call, a presentation. Describe it in a sentence or two, in English or Hebrew."),
      ta, el("div", { class: "row" }, btn("Prepare me", function () {
        if (!ta.value.trim()) return;
        if (!T.status.claude) { T.clear(out).appendChild(el("p", { class: "muted" }, "This needs the AI connection. Meanwhile: write the 5 sentences you'll need, then record yourself saying them in the Speaking section.")); return; }
        T.clear(out).appendChild(el("p", { class: "muted" }, "Preparing…"));
        TIO.ai("prepare", { situation: ta.value }).then(function (d) { show(d); }).catch(function () { T.clear(out).appendChild(el("p", null, "Didn't work right now. Try again.")); });
      }, "primary"), opts.onDone ? btn("Skip", opts.onDone, "ghost") : null)), out);
    function show(d) {
      T.S.prepared = d; T.save();
      T.clear(out).appendChild(el("section", { class: "card" }, el("h3", null, "Sentences you'll need"),
        el("ol", { class: "sentences" }, (d.sentences || []).map(function (s) { return el("li", null, el("p", null, el("b", null, s.en), " ", T.say(s.en)), el("p", { class: "muted" }, s.why)); })),
        el("p", { class: "muted" }, "Say each one out loud until it feels easy. Then rehearse the real conversation."),
        el("div", { class: "row" }, btn("Shadow them", function () { T.clear(out); T.pron.shadow(out, { sentences: (d.sentences || []).map(function (s) { return s.en; }), onEnd: function () { show(d); } }); }, "ghost"),
          d.scenario ? btn("Rehearse the conversation", function () { T.clear(host); T.views.roleplay(host, { scenario: Object.assign({ id: "custom" }, d.scenario), onDone: opts.onDone }); }, "primary") : null)));
    }
  };

  // ---------- 4/3/2 fluency ----------
  T.views.flu = function (host, opts) {
    opts = opts || {};
    var S = T.S;
    var secs = opts.short ? [120, 90, 60] : [240, 180, 120];
    var prompt = opts.prompt || TC.SPEAK[S.idx.speak % TC.SPEAK.length];
    var round = 0, res = [];
    var body = el("div");
    T.put(host, el("section", { class: "card" }, el("h2", null, "4 / 3 / 2 fluency"),
      el("p", { class: "muted" }, "Tell the same story " + (opts.short ? "in 2 minutes, then 1.5, then 1." : "in 4 minutes, then 3, then 2.") + " Same content, less time. Your speed grows without thinking about grammar."),
      T.he("מספרים את אותו סיפור שלוש פעמים, כל פעם בפחות זמן. זה בונה שטף בלי לחשוב על דקדוק."),
      el("p", { class: "quote" }, prompt), btn("Other topic", function () { S.idx.speak++; T.save(); T.clear(host); T.views.flu(host, opts); }, "ghost small")), body);
    function next() {
      if (round >= 3) return done();
      T.clear(body).appendChild(el("section", { class: "card" }, el("p", { class: "tag" }, "Round " + (round + 1) + " of 3 · " + T.fmtTime(secs[round])),
        T.speechBox({ maxSec: secs[round], kind: "432", keep: round === 0 || round === 2, prompt: prompt, onDone: function (r) {
          var w = TE.wordCount(r.text);
          res.push({ text: r.text, seconds: r.seconds, words: w, wpm: TE.wpm(w, r.seconds), pauses: r.segments ? TE.pauses(r.segments) : null, blob: r.blob });
          round++; next();
        } })));
    }
    function done() {
      S.idx.speak++;
      S.flu.push({ d: T.today(), wpm: res.map(function (r) { return r.wpm; }), pauses: res.map(function (r) { return r.pauses; }) });
      T.save();
      var view = el("section", { class: "card" }, el("h3", null, "Your speed"),
        el("table", { class: "mini" }, el("tr", null, el("th", null, "Round"), el("th", null, "Words / min"), el("th", null, "Long pauses")),
          res.map(function (r, i) { return el("tr", null, el("td", null, String(i + 1)), el("td", null, r.wpm ? String(r.wpm) : "?"), el("td", null, r.pauses === null ? "?" : String(r.pauses))); })),
        el("p", { class: "muted" }, "Natural work speech is around 130 to 160 words per minute. What matters is that round 3 is faster than round 1."),
        res[2] && res[2].blob ? el("div", null, el("p", null, "Round 3:"), T.audioPlayer(res[2].blob)) : null);
      var fx = el("div");
      T.clear(body).appendChild(view); body.appendChild(fx);
      if (T.status.claude && res[2] && TE.wordCount(res[2].text) > 20) {
        fx.appendChild(el("p", { class: "muted" }, "Looking for your top errors…"));
        TIO.ai("analyze", { text: res.map(function (r) { return r.text; }).join("\n"), source: "speech" }).then(function (d) {
          var top = (d.issues || []).sort(function (a, b) { return b.severity - a.severity; }).slice(0, 3);
          top.forEach(function (x) { S.profile = TE.addEvidence(S.profile, x.cat, 1, 1); T.addOwn(x.original, x.fix, x.cat, x.en, x.he, "speaking"); });
          T.save();
          T.clear(fx).appendChild(el("section", { class: "card" }, el("h4", null, top.length ? "Top fixes" : "No real errors found."),
            el("ol", { class: "issues" }, top.map(function (x) { return el("li", null, el("p", null, el("del", null, x.original), " → ", el("ins", null, x.fix)), el("p", { class: "en" }, x.en), T.he(x.he)); }))));
        }).catch(function () { T.clear(fx); });
      }
      body.appendChild(opts.onDone ? btn("Continue", opts.onDone, "primary") : btn("Back to speaking", function () { T.go("#talk"); }, "primary"));
    }
    next();
  };
})();
