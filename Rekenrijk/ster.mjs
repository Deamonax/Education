/* Rekenster: style je blogger, links of rechts. Elk kledingstuk is een som: hoeveel likes levert het op?
   Kies steeds de kant met de meeste likes. Na de fotoshoot tel je je likes en strijd je tegen een rivaal.
   Puur spelregels en sommen; het tekenen zit in ster-ui.mjs. */

export const ROUNDS = ['kapsel', 'haarkleur', 'top', 'onder', 'schoenen', 'accessoire', 'tas', 'achtergrond'];
export const ROUND_NAME = { kapsel: 'Kapsel', haarkleur: 'Haarkleur', top: 'Bovenstuk', onder: 'Broek of rok', schoenen: 'Schoenen', accessoire: 'Hoofd en bril', tas: 'Tas', achtergrond: 'Fotoplek' };
export const LEVELS = 20;
export const VARIANTS = { kapsel: 6, haarkleur: 8, top: 8, onder: 7, schoenen: 6, accessoire: 7, tas: 6, achtergrond: 6 };

const ri = (a, b, r) => a + Math.floor(r() * (b - a + 1));
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

/* Moeilijkheid 1-6 per soort som. Komt uit het leermodel (stap) en het level in dit spel. */
const CAP = g => g <= 3 ? 2 : g === 4 ? 3 : g === 5 ? 4 : g === 6 ? 5 : 6;
export function difficulty(step, level, groep = 6) { return Math.max(1, Math.min(CAP(groep), Math.round((step || 1) / 2 + level / 10))); }
const gcd = (a, b) => b ? gcd(b, a % b) : a;

/* Eén som met een waarde in likes. kinds: welke soorten mogen, passend bij de groep. */
export function kindsFor(groep) {
  if (groep <= 3) return ['plus', 'min'];
  if (groep === 4) return ['plus', 'min', 'keer'];
  if (groep === 5) return ['plus', 'min', 'keer', 'deel', 'deelvan'];
  return ['plus', 'min', 'keer', 'deel', 'deelvan', 'procent', 'groot'];
}
export function expr(kind, d, r = Math.random) {
  switch (kind) {
    case 'plus': { const m = [20, 100, 100, 1000, 1000, 10000][d - 1]; const a = ri(m / 10 | 0 || 2, m / 2, r), b = ri(2, m / 2, r); return { text: `${a} + ${b}`, v: a + b, topic: 'add' }; }
    case 'min': { const m = [20, 100, 100, 1000, 1000, 10000][d - 1]; const a = ri(m / 3 | 0 || 5, m, r), b = ri(2, a - 1, r); return { text: `${a} − ${b}`, v: a - b, topic: 'add' }; }
    case 'keer': { if (d <= 3) { const a = ri(2, 10, r), b = ri(2, 10, r); return { text: `${a} × ${b}`, v: a * b, topic: 'tables' }; } const a = ri(11, d >= 5 ? 99 : 30, r), b = ri(2, 9, r); return { text: `${a} × ${b}`, v: a * b, topic: 'tables' }; }
    case 'deel': { const b = ri(2, 10, r), v = ri(2, d >= 4 ? 25 : 10, r); return { text: `${b * v} : ${b}`, v, topic: 'tables' }; }
    case 'deelvan': { const n = pick(d >= 4 ? [2, 3, 4, 5, 8, 10] : [2, 4, 10], r), k0 = d >= 4 ? ri(1, n - 1, r) : 1, k = gcd(k0, n) === 1 ? k0 : 1, base = n * ri(2, d >= 5 ? 30 : 12, r); const f = k === 1 ? { 2: '½', 3: '⅓', 4: '¼', 5: '⅕', 8: '⅛', 10: '⅒' }[n] : `${k}/${n}`; return { text: `${f} van ${base}`, v: base / n * k, topic: 'fractions' }; }
    case 'procent': { const p = pick(d >= 5 ? [10, 20, 25, 50, 75, 5] : [10, 50, 25], r), base = pick([20, 40, 60, 80, 100, 200, 120, 400], r); const v = base * p / 100; if (!Number.isInteger(v)) return expr('deelvan', d, r); return { text: `${p}% van ${base}`, v, topic: 'fractions' }; }
    case 'groot': { const a = ri(2, 9, r) * (d >= 5 ? 100 : 10), b = ri(2, 9, r); return { text: `${a} × ${b}`, v: a * b, topic: 'tables' }; }
  }
  return expr('plus', d, r);
}
/* Twee sommen die dicht bij elkaar liggen (maar nooit gelijk), zodat je echt moet rekenen. */
export function pair(groep, steps, level, r = Math.random) {
  const kinds = kindsFor(groep);
  const kd = k => difficulty(steps[{ plus: 'add', min: 'add', keer: 'tables', deel: 'tables', groot: 'tables', deelvan: 'fractions', procent: 'fractions' }[k]] || 1, level, groep);
  let best = null;
  for (let i = 0; i < 60; i++) {
    const k1 = pick(kinds, r), k2 = r() < .5 ? k1 : pick(kinds, r);
    const a = expr(k1, kd(k1), r), b = expr(k2, kd(k2), r);
    if (a.v === b.v || a.text === b.text) continue;
    const gap = Math.abs(a.v - b.v) / Math.max(a.v, b.v);
    const want = level <= 3 ? .35 : level <= 8 ? .2 : level <= 14 ? .1 : .05; // later: dichter bij elkaar
    const score = Math.abs(gap - want);
    if (!best || score < best.score) best = { score, a, b };
    if (score < .03) break;
  }
  const { a, b } = best;
  return { left: a, right: b, best: a.v > b.v ? 0 : 1 };
}

/* ---------- een fotoshoot ---------- */
export function newShoot(level, groep, steps, r = Math.random) {
  const rounds = ROUNDS.map(cat => { const n = VARIANTS[cat], a = Math.floor(r() * n); let b = Math.floor(r() * (n - 1)); if (b >= a) b++; return { cat, items: [a, b], ...pair(groep, steps, level, r), choice: null }; });
  // de rivaal kiest vaak, maar niet altijd, de beste kant
  const skill = Math.min(.92, .55 + level * .02);
  const rival = rounds.reduce((s, x) => s + (r() < skill ? Math.max(x.left.v, x.right.v) : Math.min(x.left.v, x.right.v)), 0);
  return { level, groep, rounds, i: 0, likes: 0, good: 0, rival, done: false, outfit: {} };
}
export function choose(shoot, side) {
  const x = shoot.rounds[shoot.i]; if (!x || x.choice !== null) return null;
  x.choice = side; shoot.outfit[x.cat] = x.items[side]; const got = side ? x.right.v : x.left.v, ok = side === x.best;
  shoot.likes += got; if (ok) shoot.good++;
  shoot.i++; if (shoot.i >= shoot.rounds.length) shoot.done = true;
  return { ok, got, other: side ? x.left.v : x.right.v };
}
export const won = s => s.done && s.likes > s.rival;
export function stars(s) { if (!won(s)) return 0; const bad = s.rounds.length - s.good; return bad === 0 ? 3 : bad <= 2 ? 2 : 1; }
export const followersFor = s => Math.round(s.likes / 4) + (won(s) ? 25 : 5) + stars(s) * 10;

/* ---------- opslag ---------- */
export const TITLES = [[0, 'Nieuwe blogger'], [150, 'Rijzende ster'], [500, 'Trendsetter'], [1200, 'Influencer'], [2500, 'Stijlicoon'], [5000, 'Superster']];
export const titleFor = f => TITLES.filter(t => f >= t[0]).pop()[1];
export function cleanSter(x) {
  const o = { stars: {}, followers: 0, skin: 1, looks: [] };
  if (!x || typeof x !== 'object') return o;
  if (x.stars && typeof x.stars === 'object') for (const [k, v] of Object.entries(x.stars)) { const n = +k, s = +v; if (n >= 1 && n <= LEVELS && s >= 0 && s <= 3) o.stars[n] = s | 0; }
  o.followers = Math.max(0, Math.min(1e7, x.followers | 0));
  o.skin = [0, 1, 2, 3].includes(x.skin) ? x.skin : 1;
  if (Array.isArray(x.looks)) o.looks = x.looks.filter(l => l && typeof l === 'object' && l.outfit && typeof l.outfit === 'object').slice(-12).map(l => ({ outfit: Object.fromEntries(Object.entries(l.outfit).filter(([k, v]) => ROUNDS.includes(k) && Number.isInteger(v)).map(([k, v]) => [k, v])), likes: l.likes | 0, level: l.level | 0 }));
  return o;
}
export const unlocked = (st, n) => n === 1 || (st.stars[n - 1] || 0) >= 1;
