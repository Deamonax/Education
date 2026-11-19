/* Tachles storage: app state in localStorage, recordings in IndexedDB. Exposes window.TS. */
(function () {
  var KEY = "tachles.v1";
  var mem = null; // fallback when localStorage is blocked

  function fresh() {
    return {
      v: 1, created: Date.now(),
      settings: { heOpen: true, voice: "", rate: 1, passcode: "", names: [], short: false, apiKey: "", model: "", modelFast: "" },
      intake: null,          // {day, done:true, ...}
      profile: { cats: {}, updated: null },
      srs: {},               // id -> srs state (drill ids and own card ids)
      own: {},               // own cards from her real corrections
      log: [],               // [{d: day, k: kind, c: cat, ok, v: verdict, id}]
      days: {},              // day -> {min, blocks:{}, done, short}
      valkuil: [],           // [{d, c}]
      checks: [],            // mail checks: [{d, words, errors, cats:{}, tone}]
      talks: [],             // role-plays: [{d, id, words, errors, seconds}]
      flu: [],               // 4/3/2: [{d, wpm:[a,b,c]}]
      pron: [],              // shadowing / pron scores: [{d, score, src}]
      measures: [],          // check-ins: [{d, speakWords, speakErr, writeWords, writeErr, calques, wpm, pauses, cats:{}}]
      conf: [],              // weekly confidence [{d, v}]
      seen: {},              // rotation: key -> last day used
      idx: { write: 0, scen: 0, speak: 0, shadow: 0 }
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); return migrate(s); }
    } catch (e) { if (mem) return mem; }
    return mem || fresh();
  }
  function migrate(s) {
    var f = fresh();
    Object.keys(f).forEach(function (k) { if (s[k] === undefined) s[k] = f[k]; });
    Object.keys(f.settings).forEach(function (k) { if (s.settings[k] === undefined) s.settings[k] = f.settings[k]; });
    Object.keys(f.idx).forEach(function (k) { if (s.idx[k] === undefined) s.idx[k] = f.idx[k]; });
    return s;
  }
  function save(s) {
    if (s.log.length > 4000) s.log = s.log.slice(-4000);
    mem = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } mem = null; return fresh(); }

  // ---------- recordings (IndexedDB) ----------
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error("no indexedDB"));
      var r = indexedDB.open("tachles", 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains("rec")) d.createObjectStore("rec", { keyPath: "id" }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction("rec", mode), st = t.objectStore("rec"), out = fn(st);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  var Rec = {
    put: function (rec) { return tx("readwrite", function (st) { return st.put(rec); }).catch(function () { return null; }); },
    get: function (id) { return tx("readonly", function (st) { return st.get(id); }).catch(function () { return null; }); },
    all: function () {
      return tx("readonly", function (st) { return st.getAll(); }).then(function (l) {
        return (l || []).map(function (r) { return { id: r.id, day: r.day, kind: r.kind, prompt: r.prompt, seconds: r.seconds, text: r.text, t: r.t }; })
          .sort(function (a, b) { return a.t - b.t; });
      }).catch(function () { return []; });
    },
    del: function (id) { return tx("readwrite", function (st) { return st.delete(id); }).catch(function () { return null; }); },
    clear: function () { return tx("readwrite", function (st) { return st.clear(); }).catch(function () { return null; }); }
  };

  window.TS = { KEY: KEY, fresh: fresh, load: load, save: save, reset: reset, migrate: migrate, Rec: Rec };
})();
