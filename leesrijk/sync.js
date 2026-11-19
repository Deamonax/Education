/* Voortgang synchroniseren tussen apparaten. Gedeeld door LeesRijk en RekenRijk.
   Elke speler krijgt een code (bijv. KBTQ-7M4X). Met die code ziet elk apparaat dezelfde voortgang.
   Werkt zonder internet gewoon door; bij de volgende verbinding wordt alles bijgewerkt.
   Bij een botsing (op twee apparaten tegelijk gespeeld zonder verbinding) wint de versie met de meeste oefening. */
(function (root) {
  'use strict';
  var ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  function makeCode() {
    var a = new Uint32Array(8), s = '';
    (root.crypto || root.msCrypto).getRandomValues(a);
    for (var i = 0; i < 8; i++) { s += ALPH[a[i] % ALPH.length]; if (i === 3) s += '-'; }
    return s;
  }
  function normCode(c) {
    c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : '';
  }
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36) + ':' + s.length; }

  function create(o) {
    var endpoint = o.endpoint || '/api/sync';
    var meta = { codes: {}, h: {}, at: {} };
    try { var m = JSON.parse(localStorage.getItem(o.key) || 'null'); if (m && typeof m === 'object') { meta.codes = m.codes || {}; meta.h = m.h || {}; meta.at = m.at || {}; } } catch (e) { }
    var adopted = false, ready = false, timer = null, running = null, again = false, state = { online: null, last: 0 };

    function persist() { try { localStorage.setItem(o.key, JSON.stringify(meta)); } catch (e) { } }
    function codeFor(p) { if (!meta.codes[p.id]) { meta.codes[p.id] = makeCode(); persist(); } return meta.codes[p.id]; }
    function hashOf(p) { return fnv(JSON.stringify(p)); }
    function mark(ok) { state.online = ok; if (ok) state.last = Date.now(); if (o.onStatus) try { o.onStatus(state); } catch (e) { } }

    function call(method, code, body) {
      var txt = body ? JSON.stringify(body) : null;
      return fetch(endpoint + '?code=' + encodeURIComponent(code), {
        method: method, cache: 'no-store',
        headers: txt ? { 'content-type': 'application/json' } : {},
        body: txt, keepalive: !!txt && txt.length < 60000
      }).then(function (r) {
        if (r.status === 404) return { status: 404, rec: null };
        if (!/json/.test(r.headers.get('content-type') || '')) throw new Error('geen server');
        return r.json().then(function (j) { return { status: r.status, rec: j }; });
      });
    }
    function find(id) { return o.players().filter(function (p) { return p.id === id; })[0] || null; }
    function idFor(code) { for (var id in meta.codes) if (meta.codes[id] === code && find(id)) return id; return null; }

    /* zet een versie van de server neer op dit apparaat */
    function adopt(code, rec, localId) {
      var p = o.apply(rec.data, localId || null);
      if (!p) return null;
      adopted = true;
      if (localId && localId !== p.id) delete meta.codes[localId];
      meta.codes[p.id] = code; meta.h[code] = hashOf(p); meta.at[code] = rec.at; persist();
      return p;
    }
    function put(p, code, h, base) {
      var at = Math.max(Date.now(), (meta.at[code] || 0) + 1);
      return call('PUT', code, { at: at, base: base, data: p }).then(function (res) {
        if (res.status === 200) { meta.h[code] = h; meta.at[code] = at; persist(); return; }
        if (res.status === 409 && res.rec && res.rec.data) return resolve(p, code, h, res.rec);
        throw new Error('opslaan mislukt ' + res.status);
      });
    }
    /* allebei veranderd: de versie met de meeste oefening blijft */
    function resolve(p, code, h, rec) {
      if (o.busy && o.busy()) return;
      var mine = +o.score(p) || 0, theirs = +o.score(rec.data) || 0;
      if (theirs >= mine) { adopt(code, rec, p.id); return; }
      return put(p, code, h, rec.at);
    }
    function syncOne(p, pull) {
      var code = codeFor(p), h = hashOf(p), changed = meta.h[code] !== h;
      if (!pull) return changed ? put(p, code, h, meta.at[code] || 0) : null;
      return call('GET', code).then(function (res) {
        var rec = res.rec;
        if (!rec || !rec.data) return put(p, code, h, 0);
        if (rec.at === meta.at[code]) return changed ? put(p, code, h, rec.at) : null;
        if (!changed) { if (!(o.busy && o.busy())) adopt(code, rec, p.id); return; }
        return resolve(p, code, h, rec);
      });
    }
    function run(pull) {
      if (running) { again = again || pull || 'push'; return running; }
      if (typeof fetch !== 'function') return Promise.resolve();
      if (pull && o.busy && o.busy()) pull = false;
      var list = o.players().slice();
      running = list.reduce(function (chain, p) { return chain.then(function () { if (find(p.id)) return syncOne(p, pull); }); }, Promise.resolve())
        .then(function () { mark(true); if (adopted && o.refresh) { adopted = false; o.refresh(); } }, function () { mark(false); })
        .then(function () { running = null; ready = true; if (again) { var a = again; again = false; return run(a === true); } });
      return running;
    }
    function changed() { if (!ready) return; clearTimeout(timer); timer = setTimeout(function () { run(false); }, 2500); }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { clearTimeout(timer); if (ready) run(false); }
      else run(true);
    });
    root.addEventListener('online', function () { run(true); });
    setTimeout(function () { run(true); }, 300);

    return {
      changed: changed,
      now: function () { return run(true); },
      code: function (p) { return p ? codeFor(p) : ''; },
      state: function () { return state; },
      forget: function (id) { delete meta.codes[id]; persist(); },
      /* code van een ander apparaat invoeren. localId = deze speler vervangen; leeg = nieuwe speler toevoegen */
      link: function (raw, localId) {
        var code = normCode(raw);
        if (!RE.test(code)) return Promise.reject(new Error('Dat is geen geldige code. Een code ziet eruit als KBTQ-7M4X.'));
        var have = idFor(code);
        if (have && have === localId) return Promise.resolve(find(have));
        return call('GET', code).then(function (res) {
          mark(true);
          if (!res.rec || !res.rec.data) throw new Error('Deze code is onbekend. Kijk of hij goed is overgetypt.');
          if (have && have !== localId) { var other = have; delete meta.codes[other]; o.remove && o.remove(other); }
          return adopt(code, res.rec, localId);
        }, function (e) { mark(false); throw new Error('Geen verbinding. Probeer het opnieuw als er internet is.'); });
      },
      normCode: normCode
    };
  }
  root.RijkSync = { create: create, normCode: normCode };
})(this);
