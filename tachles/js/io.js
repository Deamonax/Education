/* Tachles I/O: text-to-speech, WAV recorder, browser speech recognition, server API. Exposes window.TIO. */
(function () {
  // ---------- text to speech (American voice) ----------
  var PREF = ["Samantha", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Ava", "Allison", "Alex", "Microsoft Guy"];
  function voices() {
    try { return speechSynthesis.getVoices().filter(function (v) { return /^en[-_]US/i.test(v.lang); }); } catch (e) { return []; }
  }
  function pickVoice(name) {
    var vs = voices();
    if (name) { var f = vs.filter(function (v) { return v.name === name; })[0]; if (f) return f; }
    for (var i = 0; i < PREF.length; i++) { var m = vs.filter(function (v) { return v.name.indexOf(PREF[i]) >= 0; })[0]; if (m) return m; }
    return vs[0] || null;
  }
  var ttsCfg = { voice: "", rate: 1 };
  function speak(text, opt) {
    opt = opt || {};
    return new Promise(function (res) {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return res(false);
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        var v = pickVoice(ttsCfg.voice); if (v) u.voice = v;
        u.rate = (opt.rate || 1) * (ttsCfg.rate || 1);
        var done = false, finish = function () { if (!done) { done = true; res(true); } };
        u.onend = finish; u.onerror = finish;
        setTimeout(finish, 2000 + text.length * 120);
        speechSynthesis.speak(u);
      } catch (e) { res(false); }
    });
  }
  function stopSpeak() { try { speechSynthesis.cancel(); } catch (e) { } }
  if (window.speechSynthesis) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () { }; } catch (e) { } }

  // ---------- browser speech recognition (fallback, may auto-correct) ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function BrowserASR() {
    var rec = null, finalText = "", interim = "", active = false, onText = null;
    return {
      available: !!SR,
      start: function (cb) {
        if (!SR) return false;
        onText = cb; finalText = ""; interim = ""; active = true;
        var run = function () {
          try {
            rec = new SR(); rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
            rec.onresult = function (e) {
              interim = "";
              for (var i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) finalText += (finalText ? " " : "") + e.results[i][0].transcript.trim();
                else interim += e.results[i][0].transcript;
              }
              if (onText) onText((finalText + " " + interim).trim());
            };
            rec.onend = function () { if (active) setTimeout(run, 100); };
            rec.onerror = function (e) { if (e.error === "not-allowed" || e.error === "service-not-allowed") active = false; };
            rec.start();
          } catch (e) { active = false; }
        };
        run();
        return true;
      },
      stop: function () {
        active = false;
        try { if (rec) rec.stop(); } catch (e) { }
        return new Promise(function (res) { setTimeout(function () { res((finalText + " " + interim).trim()); }, 600); });
      }
    };
  }

  // ---------- WAV recorder (16 kHz mono PCM, for Whisper and Azure) ----------
  function Recorder() {
    var ctx, src, node, stream, chunks = [], rate = 44100, t0 = 0, levelCb = null, peak = 0;
    function encode(samples, inRate) {
      var outRate = 16000, ratio = inRate / outRate, len = Math.floor(samples.length / ratio), out = new Int16Array(len);
      for (var i = 0; i < len; i++) {
        var a = Math.floor(i * ratio), b = Math.min(samples.length, Math.floor((i + 1) * ratio)), s = 0, n = 0;
        for (var j = a; j < b; j++) { s += samples[j]; n++; }
        var v = n ? s / n : 0; v = Math.max(-1, Math.min(1, v));
        out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
      var buf = new ArrayBuffer(44 + out.length * 2), dv = new DataView(buf);
      function str(o, s) { for (var k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k)); }
      str(0, "RIFF"); dv.setUint32(4, 36 + out.length * 2, true); str(8, "WAVE"); str(12, "fmt ");
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, outRate, true);
      dv.setUint32(28, outRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, "data");
      dv.setUint32(40, out.length * 2, true);
      for (var q = 0; q < out.length; q++) dv.setInt16(44 + q * 2, out[q], true);
      return new Blob([buf], { type: "audio/wav" });
    }
    return {
      start: function (onLevel) {
        levelCb = onLevel; chunks = []; peak = 0;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("no_mic"));
        // create the audio context inside the tap itself (iOS Safari keeps it suspended otherwise)
        var AC = window.AudioContext || window.webkitAudioContext;
        try { ctx = new AC(); } catch (e) { return Promise.reject(e); }
        return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }).then(function (s) {
          stream = s;
          if (ctx.state === "suspended" && ctx.resume) ctx.resume();
          rate = ctx.sampleRate;
          src = ctx.createMediaStreamSource(s);
          node = ctx.createScriptProcessor(4096, 1, 1);
          node.onaudioprocess = function (e) {
            var d = e.inputBuffer.getChannelData(0), c = new Float32Array(d.length), sum = 0;
            for (var i = 0; i < d.length; i++) { c[i] = d[i]; sum += d[i] * d[i]; }
            chunks.push(c);
            var rms = Math.sqrt(sum / d.length); if (rms > peak) peak = rms;
            if (levelCb) levelCb(Math.min(1, rms * 6));
          };
          src.connect(node); node.connect(ctx.destination);
          t0 = Date.now();
          return true;
        });
      },
      stop: function () {
        var seconds = (Date.now() - t0) / 1000;
        try { node.disconnect(); src.disconnect(); } catch (e) { }
        try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
        var total = 0; chunks.forEach(function (c) { total += c.length; });
        var all = new Float32Array(total), o = 0; chunks.forEach(function (c) { all.set(c, o); o += c.length; });
        var r = rate; try { ctx.close(); } catch (e) { }
        return { blob: encode(all, r), seconds: Math.round(seconds * 10) / 10, silent: peak < 0.01 };
      }
    };
  }

  // ---------- server API ----------
  var status = null, passcode = "";
  function headers(extra) { var h = Object.assign({}, extra || {}); if (passcode) h["x-app-passcode"] = passcode; return h; }
  function getStatus(force) {
    if (status && !force) return Promise.resolve(status);
    if (location.protocol === "file:") { status = { claude: false, whisper: false, azure: false, offline: true }; return Promise.resolve(withDirect(status)); }
    return fetch("api/status", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { status = d && typeof d.claude === "boolean" ? d : { claude: false, whisper: false, azure: false, offline: true }; return withDirect(status); })
      .catch(function () { status = { claude: false, whisper: false, azure: false, offline: true }; return withDirect(status); });
  }
  function withDirect(st) { if (!st.claude && direct.key) { st = Object.assign({}, st, { claude: true, direct: true }); status = st; } return st; }
  function fail(r) {
    return r.json().catch(function () { return {}; }).then(function (d) { var e = new Error(d.error || ("http_" + r.status)); e.code = d.error || r.status; throw e; });
  }
  // Direct mode: the browser calls Anthropic with a key stored on this device (no server timeouts).
  var direct = { key: "", main: "", fast: "" };
  function aiDirect(body) {
    var req = TP.request(body, { main: direct.main, fast: direct.fast });
    if (!req) return Promise.reject(new Error("unknown_task"));
    return fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "x-api-key": direct.key, "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify(req) })
      .then(function (r) { if (!r.ok) { var e = new Error(r.status === 401 ? "bad_key" : "upstream"); e.code = r.status === 401 ? "bad_key" : r.status; throw e; } return r.json(); })
      .then(function (d) { return TP.finish(TP.extractJson((d.content || []).filter(function (c) { return c.type === "text"; }).map(function (c) { return c.text; }).join(""))); });
  }
  function ai(task, payload) {
    var body = Object.assign({ task: task }, payload || {});
    if (direct.key) return aiDirect(body);
    return fetch("api/claude", { method: "POST", headers: headers({ "content-type": "application/json" }), body: JSON.stringify(body) })
      .then(function (r) { return r.ok ? r.json() : fail(r); });
  }
  // Server bodies are limited to about 6 MB, so long WAV files go up in 150-second pieces.
  var CHUNK_SEC = 150;
  function wavPieces(buf) {
    var dv = new DataView(buf), rate = dv.getUint32(24, true), bytes = rate * 2 * CHUNK_SEC, data = buf.byteLength - 44, out = [];
    for (var o = 0; o < data; o += bytes) {
      var len = Math.min(bytes, data - o), b = new ArrayBuffer(44 + len), v = new DataView(b);
      new Uint8Array(b).set(new Uint8Array(buf, 0, 44)); v.setUint32(4, 36 + len, true); v.setUint32(40, len, true);
      new Uint8Array(b, 44).set(new Uint8Array(buf, 44 + o, len));
      out.push({ blob: new Blob([b], { type: "audio/wav" }), offset: o / (rate * 2) });
    }
    return out;
  }
  function transcribeOne(blob) {
    return fetch("api/transcribe", { method: "POST", headers: headers({ "content-type": "audio/wav" }), body: blob })
      .then(function (r) { return r.ok ? r.json() : fail(r); });
  }
  function transcribe(blob) {
    if (blob.size < 5.5e6) return transcribeOne(blob);
    return blob.arrayBuffer().then(function (buf) {
      var parts = wavPieces(buf), res = { text: "", segments: [], duration: 0 };
      return parts.reduce(function (p, part) {
        return p.then(function () { return transcribeOne(part.blob).then(function (d) {
          res.text += (res.text ? " " : "") + (d.text || "");
          (d.segments || []).forEach(function (sg) { res.segments.push({ start: sg.start + part.offset, end: sg.end + part.offset, text: sg.text }); });
          res.duration = part.offset + (d.duration || 0);
        }); });
      }, Promise.resolve()).then(function () { return res; });
    });
  }
  function pronounce(blob, ref) {
    return fetch("api/pronounce?ref=" + encodeURIComponent(ref), { method: "POST", headers: headers({ "content-type": "audio/wav" }), body: blob })
      .then(function (r) { return r.ok ? r.json() : fail(r); });
  }

  window.TIO = {
    speak: speak, stopSpeak: stopSpeak, voices: voices, pickVoice: pickVoice, tts: ttsCfg,
    BrowserASR: BrowserASR, hasBrowserASR: !!SR, Recorder: Recorder,
    getStatus: getStatus, ai: ai, transcribe: transcribe, pronounce: pronounce,
    setPasscode: function (p) { passcode = p || ""; },
    setDirect: function (key, main, fast) { direct.key = key || ""; direct.main = main || ""; direct.fast = fast || ""; },
    _wavPieces: wavPieces
  };
})();
