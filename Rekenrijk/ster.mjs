/* Rekenster: style je blogger. Elke ronde een som: goed = jij kiest links of rechts, fout = iets lelijks.
   Na de fotoshoot tel je je likes en strijd je tegen een rivaal.
   Puur spelregels en sommen; het tekenen zit in ster-ui.mjs. */

export const ROUNDS = ['kapsel', 'haarkleur', 'top', 'onder', 'schoenen', 'accessoire', 'tas', 'achtergrond'];
export const ROUND_NAME = { kapsel: 'Kapsel', haarkleur: 'Haarkleur', top: 'Bovenstuk', onder: 'Broek of rok', schoenen: 'Schoenen', accessoire: 'Hoofd en bril', tas: 'Tas', achtergrond: 'Fotoplek' };
export const LEVELS = 20;
export const VARIANTS = { kapsel: 6, haarkleur: 8, top: 8, onder: 7, schoenen: 6, accessoire: 7, tas: 6, achtergrond: 6 };

/* ---------- een fotoshoot ----------
   Elke ronde eerst een som. Goed = je mag zelf kiezen uit twee mooie dingen.
   Fout = je krijgt iets lelijks (en je ziet hoe de som had gemoeten). */
export const UGLY = 99;
const ri2 = (a, b, r) => a + Math.floor(r() * (b - a + 1));
export const sumTypes = groep => groep <= 3 ? ['plus', 'minus'] : groep === 4 ? ['plus', 'minus', 'times'] : ['plus', 'minus', 'times', 'divide', 'fractions'];
export function newShoot(level, groep, r = Math.random) {
  const rounds = ROUNDS.map(cat => { const n = VARIANTS[cat], a = Math.floor(r() * n); let b = Math.floor(r() * (n - 1)); if (b >= a) b++; return { cat, items: [a, b], ok: null, choice: null, likes: 0 }; });
  // de rivaal: hoe hoger het level, hoe vaker alles mooi is
  const skill = Math.min(.95, .5 + level * .025);
  const rival = rounds.reduce((t) => t + (r() < skill ? ri2(60, 100, r) : ri2(5, 20, r)), 0);
  return { level, groep, rounds, i: 0, likes: 0, good: 0, rival, done: false, outfit: {} };
}
/* som beantwoord: goed = keuze komt eraan, fout = lelijk ding */
export function answered(shoot, ok, r = Math.random) {
  const x = shoot.rounds[shoot.i]; if (!x || x.ok !== null) return null;
  x.ok = ok;
  if (ok) shoot.good++;
  else { x.likes = ri2(5, 20, r); shoot.likes += x.likes; shoot.outfit[x.cat] = UGLY; }
  return x;
}
export function choose(shoot, side, r = Math.random) {
  const x = shoot.rounds[shoot.i]; if (!x || !x.ok || x.choice !== null) return null;
  x.choice = side; x.likes = ri2(60, 100, r); shoot.likes += x.likes; shoot.outfit[x.cat] = x.items[side];
  return x;
}
export function nextRound(shoot) { shoot.i++; if (shoot.i >= shoot.rounds.length) shoot.done = true; }
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
  if (Array.isArray(x.looks)) o.looks = x.looks.filter(l => l && typeof l === 'object' && l.outfit && typeof l.outfit === 'object').slice(-12).map(l => ({ outfit: Object.fromEntries(Object.entries(l.outfit).filter(([k, v]) => ROUNDS.includes(k) && Number.isInteger(v) && (v === 99 || (v >= 0 && v < 10))).map(([k, v]) => [k, v])), likes: l.likes | 0, level: l.level | 0 }));
  return o;
}
export const unlocked = (st, n) => n === 1 || (st.stars[n - 1] || 0) >= 1;
