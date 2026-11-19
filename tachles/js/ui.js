/* Tachles UI core: state, DOM helpers, shared components (Hebrew note, diff, drill card, speech box, charts).
   Exposes window.T. Depends on TC, TE, TS, TIO. */
(function () {
  var T = window.T = {};
  T.S = TS.load();
  T.save = function () { TS.save(T.S); };
  T.today = function () { return TE.dayNo(); };
  T.status = { claude: false, whisper: false, azure: false, offline: true };
  TIO.setPasscode(T.S.settings.passcode);
  TIO.setDirect(T.S.settings.apiKey, T.S.settings.model, T.S.settings.modelFast);
  TIO.tts.voice = T.S.settings.voice; TIO.tts.rate = T.S.settings.rate;

  // ---------- DOM ----------
  function el(tag, props) {
    var n = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    kids.forEach(function add(c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return n;
  }
  T.el = el;
  T.btn = function (text, on, cls, attrs) { return el("button", Object.assign({ class: "btn " + (cls || ""), type: "button", onclick: on }, attrs || {}), text); };
  T.put = function (host) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) host.appendChild(arguments[i]); return host; };
  T.clear = function (n) { while (n.firstChild) n.removeChild(n.firstChild); return n; };
  T.toast = function (msg) {
    var t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(T._tt); T._tt = setTimeout(function () { t.classList.remove("show"); }, 2600);
  };
  T.fmtTime = function (s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); };
  T.cat = function (c) { return TC.CATS[c] || TC.CATS.other; };
  T.go = function (hash) { if (location.hash === hash) T.route(); else location.hash = hash; };

  // Hebrew note: collapsible, right-to-left. Open or closed by setting.
  T.he = function (text, label) {
    if (!text) return null;
    var d = el("details", { class: "he", open: T.S.settings.heOpen ? true : null },
      el("summary", null, label || "בעברית"),
      el("p", { dir: "rtl", lang: "he" }, text));
    return d;
  };
  T.explain = function (item) {
    var c = T.cat(item.cat);
    return el("div", { class: "explain" },
      el("p", { class: "en" }, item.en || c.en),
      T.he(item.hx || item.he_note || c.he));
  };

  // her text vs. the model, word by word
  T.diffView = function (mine, model) {
    var d = TE.diff(mine, model);
    return el("p", { class: "diff" }, d.map(function (x) {
      if (x.t === "same") return [el("span", null, x.w), " "];
      if (x.t === "case") return [el("ins", { title: "capital letter" }, x.w), " "];
      if (x.t === "del") return [el("del", null, x.w), " "];
      return [el("ins", null, x.w), " "];
    }));
  };
  T.say = function (text, rate) { return T.btn("▶ Listen", function () { TIO.speak(text, { rate: rate }); }, "ghost small", { "aria-label": "Listen" }); };

  // ---------- results bookkeeping ----------
  // first-attempt result counts for the profile and the logbook
  T.record = function (item, ok, verdict, kind) {
    var d = T.today(), S = T.S;
    S.log.push({ d: d, k: kind || "drill", c: item.cat, ok: !!ok, v: verdict, id: item.id });
    S.profile = TE.addEvidence(S.profile, item.cat, 1, ok ? 0 : 1);
    var s = S.srs[item.id];
    if (!s && !ok) s = TE.newSrs(d);                 // wrong answer -> new card in the logbook
    if (s) S.srs[item.id] = TE.review(s, ok, d);
    T.save();
  };
  T.addOwn = function (orig, fix, cat, en, he, src) {
    var c = TE.ownCard(orig, fix, cat, en, he, src), S = T.S, d = T.today();
    if (!S.own[c.id]) { S.own[c.id] = c; S.srs[c.id] = TE.newSrs(d + 1); }
    return c;
  };
  T.itemById = function (id) {
    if (T.S.own[id]) return T.S.own[id];
    for (var i = 0; i < TC.DRILLS.length; i++) if (TC.DRILLS[i].id === id) return TC.DRILLS[i];
    return null;
  };
  T.pickDrills = function (cats, n, opts) {
    opts = opts || {};
    var S = T.S, d = T.today();
    var pool = TC.DRILLS.filter(function (x) { return (!cats || cats.indexOf(x.cat) >= 0) && (!opts.he || x.he) && (!opts.fix || !x.he); });
    pool = pool.map(function (x) { return { x: x, last: S.seen["d:" + x.id] || -999, r: Math.random() }; })
      .sort(function (a, b) { return a.last - b.last || a.r - b.r; }).slice(0, n).map(function (o) { return o.x; });
    pool.forEach(function (x) { S.seen["d:" + x.id] = d; });
    return pool;
  };

  // ---------- drill card ----------
  // mode: 'translate' (Hebrew -> English), 'fix' (rewrite the wrong sentence), 'own' (her own sentence)
  T.drill = function (item, onDone, opts) {
    opts = opts || {};
    var own = item.kind === "own";
    var mode = own ? "own" : item.he && !opts.forceFix ? "translate" : "fix";
    var tries = 0, firstOk = null, firstVerdict = null;
    var input = el("textarea", { class: "answer", rows: 2, autocapitalize: mode === "fix" || item.cat === "caps" ? "off" : "sentences", spellcheck: "false",
      "aria-label": "Your answer", placeholder: mode === "translate" ? "Say it or type it in English" : "Type the corrected sentence" });
    var fb = el("div", { class: "feedback", "aria-live": "polite" });
    var actions = el("div", { class: "row" });
    var prompt;
    if (mode === "translate") prompt = el("div", { class: "prompt" }, el("p", { class: "label" }, "Say it in English"), el("p", { class: "hebrew", dir: "rtl", lang: "he" }, item.he));
    else prompt = el("div", { class: "prompt" }, el("p", { class: "label" }, own ? "From your own " + (item.src || "work") + ": fix it" : "Fix this sentence"), el("p", { class: "wrongline" }, item.wrong));
    if (mode === "fix" && !own) input.value = "";
    var mic = T.dictate(input);
    var checkBtn = T.btn("Check", go, "primary");
    var showBtn = T.btn("Show answer", function () { finish("shown"); }, "ghost");
    actions.appendChild(checkBtn); if (mic) actions.appendChild(mic); actions.appendChild(showBtn);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } });

    function verdictOf(ans) { return own ? TE.checkOwn(item, ans) : TE.check(item, ans); }
    function go() {
      var ans = input.value;
      var r = verdictOf(ans);
      if (r.verdict === "empty") { input.focus(); return; }
      if (r.verdict === "miss" && T.status.claude) {
        checkBtn.disabled = true; T.clear(fb).appendChild(el("p", { class: "muted" }, "Checking…"));
        TIO.ai("judge", { he: item.he, task: mode, trap: item.wrong, model: item.right[0], answer: ans })
          .then(function (j) { checkBtn.disabled = false; if (j && j.ok) r = { verdict: "good", ok: true, model: r.model, judged: true }; else if (j && j.fix) r.aiFix = j; settle(r, ans); })
          .catch(function () { checkBtn.disabled = false; settle(r, ans); });
        return;
      }
      settle(r, ans);
    }
    function settle(r, ans) {
      tries++;
      if (firstOk === null) { firstOk = r.ok; firstVerdict = r.verdict; }
      if (r.ok) return finish(r.verdict, ans, r);
      if (tries === 1) {
        T.clear(fb).appendChild(el("div", { class: "hint" },
          el("p", null, r.verdict === "trap" ? "Almost. That's the Hebrew way of saying it. Try once more." : "Not quite. Try once more."),
          el("p", { class: "muted" }, "Hint: " + T.cat(item.cat).label.toLowerCase() + "."),
          T.he(r.verdict === "trap" ? "כמעט. זו הדרך העברית להגיד את זה. נסי שוב." : "לא בדיוק. נסי שוב.", "רמז")));
        input.focus();
        return;
      }
      finish(r.verdict, ans, r);
    }
    function finish(verdict, ans, r) {
      if (firstOk === null) { firstOk = false; firstVerdict = verdict; }
      input.disabled = true; T.clear(actions);
      var model = (r && r.model) || item.right[0];
      var ok = r && r.ok;
      T.clear(fb).appendChild(el("div", { class: "result " + (ok ? "ok" : "no") },
        el("p", { class: "verdict" }, ok ? (verdict === "exact" ? "Correct." : r.judged ? "Correct, and natural." : "Right chunk. Compare with the model:") : verdict === "shown" ? "Here's the answer:" : "Here's how to say it:"),
        ans && !(ok && verdict === "exact") ? T.diffView(ans, model) : null,
        el("p", { class: "model" }, model, " ", T.say(model)),
        r && r.aiFix && r.aiFix.en ? el("p", { class: "muted" }, r.aiFix.en) : null,
        T.explain(item)));
      T.record(item, firstOk, firstVerdict, own ? "own" : mode);
      var next = T.btn(opts.nextLabel || "Next", function () { onDone({ ok: firstOk, verdict: firstVerdict, item: item }); }, "primary");
      actions.appendChild(next); setTimeout(function () { next.focus(); }, 30);
    }
    var node = el("section", { class: "card drill" }, el("div", { class: "row between tagrow" }, el("p", { class: "tag" }, T.cat(item.cat).label), opts.counter ? el("span", { class: "muted small" }, opts.counter) : null), prompt, input, actions, fb);
    setTimeout(function () { if (!("ontouchstart" in window)) input.focus(); }, 30);
    return node;
  };

  // mic button that fills a text field (short dictation)
  T.dictate = function (input) {
    if (!T.status.whisper && !TIO.hasBrowserASR) return null;
    var rec = null, asr = null, on = false;
    var b = T.btn("🎤 Speak", function () {
      if (!on) {
        on = true; b.textContent = "■ Stop"; b.classList.add("rec");
        if (T.status.whisper) {
          rec = TIO.Recorder();
          rec.start().catch(function () { on = false; b.textContent = "🎤 Speak"; b.classList.remove("rec"); T.toast("Microphone not available."); });
        } else {
          asr = TIO.BrowserASR(); asr.start(function (t) { input.value = t; });
        }
      } else {
        on = false; b.textContent = "🎤 Speak"; b.classList.remove("rec");
        if (rec) {
          var r = rec.stop(); rec = null; b.disabled = true; input.placeholder = "Transcribing…";
          TIO.transcribe(r.blob).then(function (d) { input.value = d.text || ""; }).catch(function () { T.toast("Could not transcribe. Type it instead."); })
            .then(function () { b.disabled = false; input.placeholder = ""; input.focus(); });
        } else if (asr) { asr.stop().then(function (t) { if (t) input.value = t; input.focus(); }); asr = null; }
      }
    }, "ghost", { "aria-label": "Speak your answer" });
    return b;
  };

  // ---------- speech box: record a longer answer, get a verbatim transcript ----------
  // opts: {maxSec, kind, prompt, keep (store recording), ref (for pronunciation), onDone(res)}
  T.speechBox = function (opts) {
    var state = "idle", rec = null, asr = null, timer = null, t0 = 0, live = "";
    var lvl = el("div", { class: "level" }, el("i"));
    var time = el("span", { class: "time" }, opts.maxSec ? T.fmtTime(opts.maxSec) : "0:00");
    var liveP = el("p", { class: "live muted" });
    var main = T.btn("● Record", toggle, "primary big rec-btn", { "aria-label": "Record" });
    var box = el("div", { class: "speech" }, el("div", { class: "row center" }, main, time), lvl, liveP);
    var noMic = function (msg) {
      T.clear(box).appendChild(el("div", null, el("p", { class: "muted" }, msg || "No microphone here. Type what you would say instead:"),
        typed()));
    };
    function typed() {
      var ta = el("textarea", { rows: 4, class: "answer", placeholder: "Type your answer" });
      return el("div", null, ta, T.btn("Done", function () { if (ta.value.trim()) opts.onDone({ text: ta.value.trim(), seconds: 0, source: "typed" }); }, "primary"));
    }
    function tick() {
      var s = (Date.now() - t0) / 1000;
      time.textContent = opts.maxSec ? T.fmtTime(opts.maxSec - s) : T.fmtTime(s);
      if (opts.maxSec && s >= opts.maxSec) toggle();
    }
    function toggle() {
      if (state === "idle") {
        rec = TIO.Recorder();
        rec.start(function (v) { lvl.firstChild.style.width = Math.round(v * 100) + "%"; }).then(function () {
          state = "rec"; t0 = Date.now(); main.textContent = "■ Stop"; main.classList.add("on");
          timer = setInterval(tick, 250);
          if (!T.status.whisper && TIO.hasBrowserASR) { asr = TIO.BrowserASR(); asr.start(function (t) { live = t; liveP.textContent = t; }); }
        }).catch(function () { noMic(); });
      } else if (state === "rec") {
        state = "busy"; clearInterval(timer); main.disabled = true; main.textContent = "Working…"; main.classList.remove("on");
        var r = rec.stop();
        var asrP = asr ? asr.stop() : Promise.resolve("");
        asrP.then(function (browserText) {
          var tp = T.status.whisper ? TIO.transcribe(r.blob).then(function (d) { return { text: d.text, segments: d.segments, source: "whisper" }; })
            .catch(function () { return { text: browserText, source: browserText ? "browser" : "none" }; })
            : Promise.resolve({ text: browserText, source: browserText ? "browser" : "none" });
          return tp.then(function (tr) {
            var res = { blob: r.blob, seconds: r.seconds, silent: r.silent, text: (tr.text || "").trim(), segments: tr.segments || null, source: tr.source };
            var store = opts.keep ? TS.Rec.put({ id: "r" + Date.now(), t: Date.now(), day: T.today(), kind: opts.kind || "speak", prompt: opts.prompt || "", seconds: r.seconds, text: res.text, blob: r.blob }).then(function () { }) : Promise.resolve();
            return store.then(function () {
              if (!res.text && res.source === "none") {
                // no transcription available: let her type what she said, keep the audio
                T.clear(box).appendChild(el("div", null, el("p", { class: "muted" }, "Recorded (" + Math.round(r.seconds) + "s). No speech-to-text here, so type roughly what you said:"),
                  (function () { var ta = el("textarea", { rows: 4, class: "answer" }); return el("div", null, ta, T.btn("Done", function () { res.text = ta.value.trim(); res.source = "typed"; opts.onDone(res); }, "primary")); })()));
                return;
              }
              opts.onDone(res);
            });
          });
        });
      }
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) setTimeout(function () { noMic(); }, 0);
    box.stop = function () { if (state === "rec") toggle(); };
    box.cancel = function () { if (state === "rec") { clearInterval(timer); try { rec.stop(); } catch (e) { } if (asr) asr.stop(); state = "idle"; } };
    return box;
  };
  T.audioPlayer = function (blob) {
    var url = URL.createObjectURL(blob);
    return el("audio", { controls: true, src: url, preload: "metadata", class: "player" });
  };

  // ---------- small SVG line chart ----------
  // series: [{label, color, pts:[{x, y}]}], opts: {yLabel, lowerIsBetter}
  function dayLabel(d) { return new Date(d * 864e5 + 432e5).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  T.chart = function (series, opts) {
    opts = opts || {};
    var W = 420, H = 200, L = 38, R = 10, Tp = 12, B = 26;
    var all = []; series.forEach(function (s) { all = all.concat(s.pts); });
    if (all.length < 2) return el("p", { class: "muted" }, opts.empty || "Not enough data yet. This fills in as you practice.");
    var xs = all.map(function (p) { return p.x; }), ys = all.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs); if (x1 === x0) x1 = x0 + 1;
    var y0 = opts.min !== undefined ? opts.min : Math.min(0, Math.min.apply(null, ys)), y1 = Math.max.apply(null, ys) * 1.1 || 1;
    var sx = function (x) { return L + (x - x0) / (x1 - x0) * (W - L - R); }, sy = function (y) { return H - B - (y - y0) / (y1 - y0) * (H - Tp - B); };
    var ns = "http://www.w3.org/2000/svg";
    function s(tag, a) { var n = document.createElementNS(ns, tag); Object.keys(a || {}).forEach(function (k) { n.setAttribute(k, a[k]); }); return n; }
    var svg = s("svg", { viewBox: "0 0 " + W + " " + H, class: "chart", role: "img", "aria-label": opts.yLabel || "chart" });
    for (var g = 0; g <= 4; g++) {
      var yv = y0 + (y1 - y0) * g / 4, yy = sy(yv);
      svg.appendChild(s("line", { x1: L, x2: W - R, y1: yy, y2: yy, class: "grid" }));
      var tx = s("text", { x: L - 6, y: yy + 4, "text-anchor": "end", class: "axis" }); tx.textContent = Math.round(yv * 10) / 10; svg.appendChild(tx);
    }
    var base = s("text", { x: L, y: H - 8, class: "axis" }); base.textContent = opts.xStart || dayLabel(x0); svg.appendChild(base);
    var end = s("text", { x: W - R, y: H - 8, "text-anchor": "end", class: "axis" }); end.textContent = opts.xEnd || (x1 - x0 < 1.5 && Math.max.apply(null, xs) === x0 ? "" : dayLabel(Math.max.apply(null, xs))); svg.appendChild(end);
    series.forEach(function (se, i) {
      var pts = se.pts.slice().sort(function (a, b) { return a.x - b.x; });
      svg.appendChild(s("polyline", { points: pts.map(function (p) { return sx(p.x) + "," + sy(p.y); }).join(" "), class: "line s" + i }));
      pts.forEach(function (p) { var c = s("circle", { cx: sx(p.x), cy: sy(p.y), r: 3.5, class: "dot s" + i }); var tt = s("title"); tt.textContent = se.label + ": " + p.y; c.appendChild(tt); svg.appendChild(c); });
    });
    var legend = series.length > 1 ? el("p", { class: "legend" }, series.map(function (se, i) { return el("span", { class: "key s" + i }, se.label); })) : null;
    return el("figure", { class: "chartwrap" }, svg, legend, opts.yLabel ? el("figcaption", null, opts.yLabel) : null);
  };
})();
