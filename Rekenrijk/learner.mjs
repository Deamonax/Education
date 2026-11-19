/* RekenRijk leermodel v2: een Bayesiaanse vaardigheidsschatting per kind per wereld.
   - Vaardigheid = normale verdeling: mu (schatting) en v (onzekerheid, variantie), op de schaal van de 12 stappen.
   - Kans op goed: P = g + (1 - g - s) * logistic(A * (mu - d)), met s = kans op een slordigheidsfout, g = kans op gokken.
     Daardoor telt één slordige fout op een makkelijke opdracht nauwelijks mee.
   - Na elk antwoord: Kalman/Glicko-stap (Laplace-benadering). Hoe zekerder het model, hoe kleiner de stap.
   - Onzekerheid groeit weer met tijd (kinderen leren buiten het spel) en een beetje per opdracht (ze leren tijdens het spel).
   - d = stap van de opdracht + moeilijkheid van de soort (leert mee uit de antwoorden van alle spelers op dit apparaat).
   - Gedeeltelijke punten (aantal goede vakjes), hulp telt minder, snelheid telt mee bij rekenfeiten.
   Bronnen: Klinkenberg, Straatemeier & Van der Maas (2011); Maris & Van der Maas (2012); Glickman (1999). */

export const WORLDS = ['add', 'tables', 'fractions', 'life', 'logic'];
export const MAX = 12;
export const A = 1.1, SLIP = .08, GUESS = .02, TARGET = .75;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const DAY = 864e5, Z80 = 1.2816;
const sig = x => 1 / (1 + Math.exp(-x));
const logit = p => Math.log(p / (1 - p));
/* afstand tussen vaardigheid en de stap waarop het kind 75% goed heeft */
export const OFF = logit((TARGET - GUESS) / (1 - GUESS - SLIP)) / A;
/* CFG is aan te passen voor simulaties. PART = verwachte gedeeltelijke score bij een fout antwoord. */
export const CFG = { V0: 4, VMIN: .05, VMAX: 6, DRIFT_DAY: .015, DRIFT_ITEM: .004, PART: .3 };

export const groupStart = g => 2 * (g - 3) + 1;
export const pCorrect = (mu, d) => GUESS + (1 - GUESS - SLIP) * sig(A * (mu - d));

/* Schooljaar: 1 september = 0, 15 juli = 1 */
export function yearFraction(date = new Date()) {
  const y = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return clamp((date - new Date(y, 8, 1)) / (new Date(y + 1, 6, 15) - new Date(y, 8, 1)), 0, 1);
}
export const expected = (g, date = new Date()) => groupStart(g) - .5 + 2 * yearFraction(date);

export function levelInfo(M) {
  const x = M - .5;
  if (x < 0) return { groep: 3, fase: 'begin', label: 'Begin groep 3', below: true };
  if (x >= 12) return { groep: 8, fase: 'eind', label: 'Eind groep 8 of hoger', above: true };
  const groep = 3 + Math.floor(x / 2), f = (x % 2) / 2;
  const fase = f < 1 / 3 ? 'begin' : f < 2 / 3 ? 'midden' : 'eind';
  return { groep, fase, label: `${fase[0].toUpperCase() + fase.slice(1)} groep ${groep}` };
}
export const monthsAhead = (M, g, date = new Date()) => Math.round((M - expected(g, date)) * 5);

/* ---------- toestand per wereld ---------- */
export function newSkill(groep, date = new Date()) {
  const M0 = expected(groep, date);
  return Object.fromEntries(WORLDS.map(k => [k, fresh(M0)]));
}
const fresh = M0 => ({ mu: M0 + OFF, v: CFG.V0, n: 0, last: 0, recent: [], hist: [], secured: 0 });
/* oude opslag (v1: theta + neff) omzetten zonder voortgang te verliezen */
export function upgrade(s, groep) { const o = upgrade0(s, groep); o.secured = Math.max(o.secured || 0, interval(o)[0]); return o; }
function upgrade0(s, groep) {
  if (!s || typeof s !== 'object') return fresh(expected(groep));
  if (Number.isFinite(s.mu) && Number.isFinite(s.v)) return { mu: clamp(s.mu, -2, 16), v: clamp(s.v, CFG.VMIN, CFG.VMAX), n: s.n | 0, last: +s.last || 0, recent: Array.isArray(s.recent) ? s.recent.slice(-4) : [], hist: Array.isArray(s.hist) ? s.hist.filter(h => Array.isArray(h) && Number.isFinite(h[1])).slice(-180) : [], secured: Number.isFinite(s.secured) ? s.secured : 0 };
  if (Number.isFinite(s.theta)) { const M = s.theta - 1.0; return { mu: M + OFF, v: clamp(CFG.V0 / (1 + (+s.neff || 0) / 3), .15, CFG.V0), n: s.n | 0, last: +s.last || 0, recent: [], hist: Array.isArray(s.hist) ? s.hist.filter(h => Array.isArray(h) && Number.isFinite(h[1])).map(h => [h[0], h[1], .8]).slice(-180) : [], secured: 0 }; }
  return fresh(expected(groep));
}
export const mastery = s => s.mu - OFF;
export const sd = s => Math.sqrt(s.v);
/* 80%-zeker interval van het werkniveau */
export const interval = s => [mastery(s) - Z80 * sd(s), mastery(s) + Z80 * sd(s)];
/* Niveau dat een kind 'binnen' heeft: de onderkant van het interval, dat alleen omhoog gaat */
export const secured = s => Math.max(s.secured || 0, interval(s)[0]);
/* Hoe zeker: 0 (net begonnen) tot 1 (zeker) */
export const certainty = s => clamp(1 - (sd(s) - .35) / (Math.sqrt(CFG.V0) - .35), 0, 1);

/* ---------- moeilijkheid per soort opdracht ---------- */
/* Startwaarden (eigen inschatting), daarna leren ze bij uit de antwoorden. Positief = moeilijker dan de stap zegt. */
export const KIND_PRIOR = { sudoku: .4, magic: .3, triangle: .4, shapes: .3, story: .25, ratio: .2, fracadd: .2, convert: .2, rest: .1, column: -.1, coins: -.15, mab: -.3, fracbar: -.3, fracread: -.2, house: -.1, share: -.3, clockset: .1, graph: -.1, mean: -.1, area: .1, metric: .2, negative: .2, estimate: 0, colmul: 0, longdiv: .2, mirror: -.2, coord: -.2, open: .6 };
export function kindOffset(adj, kind) { const a = adj?.[kind]; return Number.isFinite(a?.off) ? a.off : (KIND_PRIOR[kind] || 0); }
function learnKind(adj, kind, resid, v) {
  if (!adj || !kind) return;
  const a = adj[kind] ||= { off: KIND_PRIOR[kind] || 0, n: 0 };
  /* alleen leren als het niveau van het kind al redelijk zeker is, anders verwar je 'kind is sterk' met 'soort is makkelijk' */
  const trust = 1 / (1 + v / .3);
  const eta = .06 * trust / (1 + a.n / 40);
  a.off = clamp(a.off - eta * resid * 4, -1.5, 1.5); a.n += trust;
  /* houd het gemiddelde van de geleerde verschuivingen gelijk aan dat van de startwaarden */
  const ks = Object.keys(adj).filter(k => k[0] !== '_' && Number.isFinite(adj[k]?.off));
  if (ks.length > 1) { const shift = ks.reduce((t, k) => t + adj[k].off - (KIND_PRIOR[k] || 0), 0) / ks.length; for (const k of ks) adj[k].off -= shift; }
}

/* ---------- stap kiezen ---------- */
/* Kies de stap waarop het kind ongeveer 'p' kans op goed heeft, met wat spreiding als het model nog onzeker is */
/* target = gewenste kans op goed: rustig .85, normaal .75, uitdaging .62 (Jansen e.a., 2013, Rekentuin) */
export function pickStep(s, r = Math.random, mode = 'practice', kindOff = 0, target = TARGET) {
  const p = mode === 'check' ? .5 : clamp(target, .55, .9);
  const d = s.mu - logit((p - GUESS) / (1 - GUESS - SLIP)) / A - kindOff;
  const spread = Math.min(1, sd(s)) * .7 + .25;
  const u = (r() + r() + r() - 1.5) * 2;
  return clamp(Math.round(d + u * spread), 1, MAX);
}

/* ---------- score van één antwoord ---------- */
/* frac: deel van de vakjes goed bij de eerste keer nakijken; hint: hulp gezien voor het nakijken;
   solved: uiteindelijk goed; fact + ms: rekenfeit met tijd (snelheid telt mee) */
export function scoreOf({ frac = 0, hint = false, solved = false, fact = false, ms = 0 } = {}) {
  let x = clamp(frac, 0, 1);
  if (x < 1 && solved) x = Math.max(x, .35);
  if (hint) x *= typeof hint === 'number' ? [1, .9, .7, .5][clamp(Math.round(hint), 0, 3)] : .7;
  if (fact && x >= 1 && ms > 0) { const t = ms / 1000; x = t <= 4 ? 1 : t >= 15 ? .8 : 1 - .2 * (t - 4) / 11; }
  return x;
}

/* ---------- bijwerken na een antwoord ---------- */
export function update(s, step, x, opts = {}) {
  const now = opts.now || Date.now();
  if (s.last) s.v = Math.min(CFG.VMAX, s.v + CFG.DRIFT_DAY * Math.max(0, (now - s.last) / DAY));
  s.v = Math.min(CFG.VMAX, s.v + CFG.DRIFT_ITEM);
  const d = step + (opts.kindOff || 0);
  const p = sig(A * (s.mu - d)), P = pCorrect(s.mu, d);
  /* x mag een deel zijn (vakjes goed). Verwachte score = P + (1-P) * PART; alleen als x een deel is (0 < x < 1) */
  /* PART leert mee: het gemiddelde deel goed bij foute antwoorden in dit huishouden */
  const pa = opts.adj ? (opts.adj._part ||= { m: CFG.PART, n: 0 }) : null;
  const part = opts.binary || !pa ? 0 : clamp(pa.m, 0, .8);
  const E = P + (1 - P) * part;
  const dE = (1 - part) * (1 - GUESS - SLIP) * A * p * (1 - p);
  const varx = Math.max(.02, P * (1 - P) * (1 - part) ** 2);
  const w = opts.weight ?? 1;
  const info = w * dE * dE / varx;
  const vNew = clamp(1 / (1 / s.v + info), CFG.VMIN, CFG.VMAX);
  const delta = clamp(vNew * w * dE * (x - E) / varx, -1.2, 1.2);
  s.mu = clamp(s.mu + delta, -1 + OFF, MAX + 1 + OFF); s.v = vNew;
  s.n++; s.last = now;
  /* verrassende reeks (steeds veel beter of slechter dan verwacht): het niveau verschuift, dus weer onzekerder */
  s.recent = [...(s.recent || []), x - E].slice(-4);
  if (s.recent.length === 4 && (s.recent.every(r => r > .15) || s.recent.every(r => r < -.3))) { s.v = Math.min(CFG.VMAX, s.v * 1.8 + .1); s.recent = []; }
  learnKind(opts.adj, opts.kind, (x - E) / (1 - part), vNew);
  if (pa && !opts.binary && x < 1) { pa.n++; pa.m += (x - pa.m) / Math.min(pa.n + 5, 200); }
  s.secured = Math.max(s.secured || 0, interval(s)[0]);
  const day = new Date(now).toISOString().slice(0, 10), M = Math.round(mastery(s) * 100) / 100, S = Math.round(sd(s) * 100) / 100;
  if (s.hist.length && s.hist[s.hist.length - 1][0] === day) s.hist[s.hist.length - 1] = [day, M, S]; else s.hist.push([day, M, S]);
  if (s.hist.length > 180) s.hist.shift();
  return { P, delta };
}

/* ---------- statistiek per vaardigheid, rekenfeit en dag ---------- */
export function noteKind(stats, kind, ok, ms) { const k = stats[kind] ||= { n: 0, ok: 0, ms: 0 }; k.n++; k.ok += ok ? 1 : 0; k.ms += Math.min(ms || 0, 300000); }
export function noteFact(facts, key, ok, ms) { const f = facts[key] ||= { n: 0, ok: 0, fast: 0, ms: 0 }; f.n++; f.ok += ok ? 1 : 0; if (ok && ms > 0 && ms < 5000) f.fast++; f.ms += Math.min(ms || 0, 60000); }
export function factState(f) {
  if (!f || f.n < 4) return 'nieuw';
  const acc = f.ok / f.n, fast = f.fast / f.n;
  if (acc >= .9 && fast >= .7) return 'vlot';
  if (acc >= .75) return 'bijna';
  return 'oefenen';
}
export function noteDay(days, ok, ms, now = Date.now()) {
  const d = new Date(now).toISOString().slice(0, 10), x = days[d] ||= { n: 0, ok: 0, ms: 0 };
  x.n++; x.ok += ok ? 1 : 0; x.ms += Math.min(ms || 0, 180000);
  const keys = Object.keys(days).sort(); while (keys.length > 120) delete days[keys.shift()];
}
