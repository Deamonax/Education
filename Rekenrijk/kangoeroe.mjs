/* Kangoeroe-modus: patroontaxonomie, gezaaide generatoren, adaptief model en wedstrijdscore.
   Geen opgaven uit het archief: elk patroon is een eigen generator die nieuwe opgaven maakt.
   Zie KANGOEROE.md voor de onderbouwing per patroon. */

// ---------- hulpjes ----------
export function rng(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function shuffle(r, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const range = n => Array.from({ length: n }, (_, i) => i);
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
export { LETTERS };

// Vijf verschillende getallen, oplopend (zoals op het echte blad), met de 'slimme' fouten eerst.
function numOptions(r, correct, wrongs, min = 0) {
  const set = new Set([correct]);
  for (const w of wrongs) if (Number.isInteger(w) && w >= min && set.size < 5) set.add(w);
  let k = 1;
  while (set.size < 5) { for (const d of shuffle(r, [k, -k])) { if (set.size < 5 && correct + d >= min) set.add(correct + d); } k++; }
  const opts = [...set].sort((a, b) => a - b);
  return { options: opts.map(v => ({ text: String(v) })), answer: opts.indexOf(correct) };
}
// Opties met een plaatje: het goede plaatje plus afleiders, uniek op sleutel, geschud.
function picOptions(r, correct, wrongs) {
  const seen = new Set([correct.key]), list = [correct];
  for (const w of wrongs) if (!seen.has(w.key) && list.length < 5) { seen.add(w.key); list.push(w); }
  const opts = shuffle(r, list);
  return { options: opts.map(o => ({ svg: o.svg, text: o.text || '', key: o.key })), answer: opts.indexOf(correct), complete: list.length === 5 };
}
function textOptions(r, correct, wrongs) {
  const set = [correct];
  for (const w of wrongs) if (!set.includes(w) && set.length < 5) set.push(w);
  const opts = shuffle(r, set);
  return { options: opts.map(t => ({ text: t })), answer: opts.indexOf(correct) };
}

// ---------- SVG-bouwstenen (kleuren van RekenRijk) ----------
export const C = { ink: '#342654', line: '#c9bfe0', soft: '#f3eefc', purple: '#7550ce', yellow: '#ffdd66', green: '#3f9a6e', orange: '#e58a3a', blue: '#4a8fd0', pink: '#d0669a', red: '#d94b4b', white: '#ffffff', grey: '#b7aecb' };
const svg = (w, h, body, label = '', cls = '') => `<svg viewBox="0 0 ${w} ${h}" class="kg-svg${cls ? ' ' + cls : ''}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const rect = (x, y, w, h, fill, stroke = C.ink, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="2" ${extra}/>`;
const txt = (x, y, s, size = 18, fill = C.ink, weight = 800) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" dominant-baseline="central" font-family="ui-rounded,Arial Rounded MT Bold,Arial,sans-serif">${s}</text>`;
// Rooster met gekleurde hokjes. cells: {"r,c": kleur}
function gridSvg(n, m, cells, cs = 30, opts = {}) {
  let b = '';
  for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < m; cc++) {
    const k = `${rr},${cc}`; if (opts.missing && opts.missing.has(k)) continue;
    b += rect(4 + cc * cs, 4 + rr * cs, cs, cs, cells[k] || C.white, C.ink);
  }
  if (opts.holes) for (const k of opts.holes) { const [rr, cc] = k.split(',').map(Number); b += `<circle cx="${4 + cc * cs + cs / 2}" cy="${4 + rr * cs + cs / 2}" r="${cs * 0.22}" fill="${C.ink}"/>`; }
  return svg(m * cs + 8, n * cs + 8, b, opts.label || 'rooster');
}
const key = cells => Object.keys(cells).filter(k => cells[k]).sort().map(k => k + cells[k]).join('|');

// ---------- transformaties op een rooster ----------
const T = {
  id: (r, c, n) => [r, c],
  mirrorLR: (r, c, n) => [r, n - 1 - c],
  mirrorUD: (r, c, n) => [n - 1 - r, c],
  rotCW: (r, c, n) => [c, n - 1 - r],
  rotCCW: (r, c, n) => [n - 1 - c, r],
  rot180: (r, c, n) => [n - 1 - r, n - 1 - c],
  transpose: (r, c, n) => [c, r]
};
function apply(cells, n, f) { const o = {}; for (const k of Object.keys(cells)) { const [r, c] = k.split(',').map(Number); const [a, b] = T[f](r, c, n); o[`${a},${b}`] = cells[k]; } return o; }
// Een tekening waarbij alle zeven bewerkingen iets anders opleveren.
function asymmetricPattern(r, n, count, colors) {
  for (let tries = 0; tries < 400; tries++) {
    const cells = {}; const all = shuffle(r, range(n * n)).slice(0, count);
    all.forEach((i, j) => { cells[`${Math.floor(i / n)},${i % n}`] = colors[j % colors.length]; });
    const keys = Object.keys(T).map(f => key(apply(cells, n, f)));
    if (new Set(keys).size === keys.length) return cells;
  }
  throw new Error('geen asymmetrisch patroon');
}

// ---------- weegschaal, kralen, blokken ----------
function balanceSvg(left, right) { // items: {kind:'appel'|'peer'|'zak', v}
  const item = (it, x, y) => it.kind === 'zak'
    ? `<path d="M${x - 15} ${y + 16} Q${x - 18} ${y - 6} ${x - 7} ${y - 12} L${x + 7} ${y - 12} Q${x + 18} ${y - 6} ${x + 15} ${y + 16} Z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="2"/>${txt(x, y + 4, it.v, 14)}`
    : it.kind === 'appel' ? `<circle cx="${x}" cy="${y + 3}" r="13" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/><path d="M${x} ${y - 10} l3 -6" stroke="${C.ink}" stroke-width="2"/>`
      : it.kind === 'peer' ? `<path d="M${x} ${y - 14} C${x + 8} ${y - 14} ${x + 6} ${y - 2} ${x + 13} ${y + 8} C${x + 16} ${y + 18} ${x - 16} ${y + 18} ${x - 13} ${y + 8} C${x - 6} ${y - 2} ${x - 8} ${y - 14} ${x} ${y - 14}Z" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>`
        : `<rect x="${x - 12}" y="${y - 10}" width="24" height="24" rx="4" fill="${C.blue}" stroke="${C.ink}" stroke-width="2"/>`;
  const row = (items, cx) => items.map((it, i) => item(it, cx + (i - (items.length - 1) / 2) * 34, 70)).join('');
  const w = 340;
  return svg(w, 130, `<rect x="${w / 2 - 6}" y="40" width="12" height="78" fill="${C.grey}" stroke="${C.ink}" stroke-width="2"/><path d="M${w / 2 - 40} 122 L${w / 2 + 40} 122" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>
  <line x1="20" y1="42" x2="${w - 20}" y2="42" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/><circle cx="${w / 2}" cy="42" r="6" fill="${C.purple}"/>
  <path d="M10 90 L150 90" stroke="${C.ink}" stroke-width="3"/><path d="M${w - 150} 90 L${w - 10} 90" stroke="${C.ink}" stroke-width="3"/>
  <line x1="40" y1="42" x2="40" y2="88" stroke="${C.line}" stroke-width="2"/><line x1="120" y1="42" x2="120" y2="88" stroke="${C.line}" stroke-width="2"/><line x1="${w - 40}" y1="42" x2="${w - 40}" y2="88" stroke="${C.line}" stroke-width="2"/><line x1="${w - 120}" y1="42" x2="${w - 120}" y2="88" stroke="${C.line}" stroke-width="2"/>
  ${row(left, 80)}${row(right, w - 80)}`, 'weegschaal in evenwicht');
}
const BEAD = { rood: C.red, blauw: C.blue, geel: C.yellow, groen: C.green, paars: C.purple, roze: C.pink };
function beadsSvg(seq, dots = true) {
  const n = seq.length, w = n * 30 + (dots ? 60 : 20);
  let b = `<line x1="6" y1="30" x2="${w - 6}" y2="30" stroke="${C.ink}" stroke-width="2"/>`;
  seq.forEach((c, i) => { b += `<circle cx="${22 + i * 30}" cy="30" r="12" fill="${BEAD[c]}" stroke="${C.ink}" stroke-width="2"/>`; });
  if (dots) b += txt(n * 30 + 32, 30, '…', 24);
  return svg(w, 60, b, 'kralen');
}
const swatch = c => svg(40, 40, `<circle cx="20" cy="20" r="14" fill="${BEAD[c]}" stroke="${C.ink}" stroke-width="2"/>`, c, 'kg-swatch');
// Isometrische blokken. h[r][c]: hoogte; rij 0 is achteraan. Getekend van achter naar voren.
function isoSvg(h) {
  const R = h.length, K = h[0].length, s = 22, cx = s * 0.866, cy = s * 0.5;
  const H = Math.max(...h.flat(), 1);
  const ox = R * cx + 10, oy = H * s + 10;
  const P = (x, y, z) => [ox + (x - y) * cx, oy + (x + y) * cy - z * s];
  let b = '';
  for (let r = 0; r < R; r++) for (let c = 0; c < K; c++) for (let z = 0; z < h[r][c]; z++) {
    const x = c, y = r;
    const top = [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    const left = [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    const right = [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)];
    const poly = (pts, f) => `<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${f}" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
    b += poly(left, '#b9a3ec') + poly(right, '#8e6fdc') + poly(top, '#e6dcfb');
  }
  const W = (R + K) * cx + 20, Hh = (R + K) * cy + H * s + 20;
  return svg(Math.ceil(W), Math.ceil(Hh), b, 'blokkenbouwsel');
}
// Hoogtes die van voren naar achteren niet lager worden, zodat elke kolom te zien is.
function staircase(r, R, K, max, minTotal = 0) {
  for (let t = 0; t < 200; t++) {
    const h = range(R).map(() => range(K).map(() => 0));
    for (let i = R - 1; i >= 0; i--) for (let j = K - 1; j >= 0; j--) {
      const lo = Math.max(i + 1 < R ? h[i + 1][j] : 0, j + 1 < K ? h[i][j + 1] : 0);
      h[i][j] = Math.max(1, Math.min(max, lo + ri(r, 0, 1)));
    }
    const sum = h.flat().reduce((a, v) => a + v, 0);
    if (sum >= minTotal) return h;
  }
  return range(R).map(() => range(K).map(() => 1));
}

// ---------- logica: wie heeft wat ----------
// Kiest aanwijzingen tot alleen 'invullen wat overblijft' de puzzel oplost. Geeft ook de redenering terug.
function logicPuzzle(r, people, items, opts = {}) {
  const n = people.length;
  for (let tries = 0; tries < 300; tries++) {
    const sol = shuffle(r, range(n)); // persoon i heeft items[sol[i]]
    const pool = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (sol[i] !== j) pool.push({ t: 'niet', i, j });
    if (opts.allowYes) for (let i = 0; i < n; i++) pool.push({ t: 'wel', i, j: sol[i] });
    const clues = [];
    for (const cl of shuffle(r, pool)) {
      clues.push(cl);
      const res = propagate(n, clues);
      if (res.solved) {
        // geen overbodige aanwijzingen: haal er een weg als het ook zonder kan
        for (let k = clues.length - 1; k >= 0; k--) { const test = clues.filter((_, x) => x !== k); if (propagate(n, test).solved) clues.splice(k, 1); }
        const fin = propagate(n, clues);
        if (clues.length < (opts.minClues || 2) || clues.length > (opts.maxClues || 9)) break;
        return { sol, clues, steps: fin.steps };
      }
    }
  }
  return null;
}
function propagate(n, clues) {
  const can = range(n).map(() => range(n).map(() => true)), steps = [];
  for (const c of clues) { if (c.t === 'niet') can[c.i][c.j] = false; else { for (let j = 0; j < n; j++) if (j !== c.j) can[c.i][j] = false; } }
  const done = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (done.has(i)) continue;
      const opts = range(n).filter(j => can[i][j]);
      if (opts.length === 1) { done.add(i); steps.push({ kind: 'persoon', i, j: opts[0] }); for (let k = 0; k < n; k++) if (k !== i && can[k][opts[0]]) { can[k][opts[0]] = false; } changed = true; }
    }
    for (let j = 0; j < n; j++) {
      const who = range(n).filter(i => can[i][j]);
      if (who.length === 1 && !done.has(who[0])) { const i = who[0]; done.add(i); steps.push({ kind: 'ding', i, j }); for (let x = 0; x < n; x++) if (x !== j) can[i][x] = false; for (let k = 0; k < n; k++) if (k !== i) can[k][j] = false; changed = true; }
    }
  }
  return { solved: done.size === n, steps };
}

// ---------- kalender ----------
const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a / gcd(a, b) * b;

// ---------- dobbelsteen-uitslagen ----------
// Vouwt een uitslag (6 vakjes) tot een kubus en geeft per vakje de normaalvector.
function foldNet(cells) {
  const idx = new Map(cells.map(([r, c], i) => [`${r},${c}`, i]));
  const st = new Array(cells.length).fill(null);
  st[0] = { n: [0, 0, -1], ex: [1, 0, 0], ey: [0, 1, 0] };
  const neg = v => v.map(x => -x), q = [0];
  while (q.length) {
    const i = q.shift(), [r, c] = cells[i], s = st[i];
    const moves = [[0, 1, { n: s.ex, ex: neg(s.n), ey: s.ey }], [0, -1, { n: neg(s.ex), ex: s.n, ey: s.ey }], [1, 0, { n: s.ey, ex: s.ex, ey: neg(s.n) }], [-1, 0, { n: neg(s.ey), ex: s.ex, ey: s.n }]];
    for (const [dr, dc, ns] of moves) { const j = idx.get(`${r + dr},${c + dc}`); if (j !== undefined && !st[j]) { st[j] = ns; q.push(j); } }
  }
  return st.map(s => s && s.n.join(','));
}
export function netOpposites(cells) {
  const ns = foldNet(cells); if (ns.some(x => !x) || new Set(ns).size !== 6) return null;
  const opp = new Array(6);
  ns.forEach((v, i) => { const o = v.split(',').map(x => String(-Number(x) || 0)).join(','); opp[i] = ns.findIndex(w => w.split(',').map(x => String(Number(x) || 0)).join(',') === o); });
  return opp;
}
const NETS = [
  [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1]], // kruis
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 3]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1]],
  [[0, 2], [1, 0], [1, 1], [1, 2], [1, 3], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3], [2, 3]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3]], // trap
  [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [1, 4]]
];
function netSvg(cells, labels, cs = 34, mark = -1) {
  const R = Math.max(...cells.map(c => c[0])) + 1, K = Math.max(...cells.map(c => c[1])) + 1;
  let b = '';
  cells.forEach(([r, c], i) => { b += rect(4 + c * cs, 4 + r * cs, cs, cs, i === mark ? C.yellow : C.soft) + txt(4 + c * cs + cs / 2, 4 + r * cs + cs / 2, labels[i], cs * 0.5); });
  return svg(K * cs + 8, R * cs + 8, b, 'uitslag van een kubus');
}

// ---------- routes ----------
function routesCount(W, H, blocked) { // kruispunten (x 0..W, y 0..H), stappen rechts of omhoog; blocked: set van "x,y>x2,y2"
  const N = range(W + 1).map(() => new Array(H + 1).fill(0)); N[0][0] = 1;
  for (let x = 0; x <= W; x++) for (let y = 0; y <= H; y++) {
    if (!x && !y) continue;
    let v = 0;
    if (x > 0 && !blocked.has(`${x - 1},${y}>${x},${y}`)) v += N[x - 1][y];
    if (y > 0 && !blocked.has(`${x},${y - 1}>${x},${y}`)) v += N[x][y - 1];
    N[x][y] = v;
  }
  return N;
}
function streetSvg(W, H, blocked, nums = null) {
  const s = 52, ox = 30, oy = 20, X = x => ox + x * s, Y = y => oy + (H - y) * s;
  let b = '';
  for (let y = 0; y <= H; y++) for (let x = 0; x < W; x++) { const bl = blocked.has(`${x},${y}>${x + 1},${y}`); b += `<line x1="${X(x)}" y1="${Y(y)}" x2="${X(x + 1)}" y2="${Y(y)}" stroke="${bl ? C.red : C.ink}" stroke-width="${bl ? 3 : 4}" ${bl ? 'stroke-dasharray="4 5"' : ''} stroke-linecap="round"/>${bl ? txt((X(x) + X(x + 1)) / 2, Y(y) - 10, '✕', 16, C.red) : ''}`; }
  for (let x = 0; x <= W; x++) for (let y = 0; y < H; y++) { const bl = blocked.has(`${x},${y}>${x},${y + 1}`); b += `<line x1="${X(x)}" y1="${Y(y)}" x2="${X(x)}" y2="${Y(y + 1)}" stroke="${bl ? C.red : C.ink}" stroke-width="${bl ? 3 : 4}" ${bl ? 'stroke-dasharray="4 5"' : ''} stroke-linecap="round"/>${bl ? txt(X(x) + 12, (Y(y) + Y(y + 1)) / 2, '✕', 16, C.red) : ''}`; }
  if (nums) for (let x = 0; x <= W; x++) for (let y = 0; y <= H; y++) b += `<circle cx="${X(x)}" cy="${Y(y)}" r="12" fill="${C.yellow}" stroke="${C.ink}" stroke-width="1.5"/>${txt(X(x), Y(y), nums[x][y], 12)}`;
  b += `<circle cx="${X(0)}" cy="${Y(0)}" r="9" fill="${C.green}"/>${txt(X(0) - 4, Y(0) + 18, 'huis', 11, C.ink, 700)}`;
  b += `<rect x="${X(W) - 9}" y="${Y(H) - 9}" width="18" height="18" fill="${C.purple}"/>${txt(X(W), Y(H) - 16, 'school', 11, C.ink, 700)}`;
  return svg(W * s + 60, H * s + 52, b, 'stratenplan');
}

// ============================================================================================
// wizFUN (groep 3 en 4)
// ============================================================================================
const NAMEN = ['Sam', 'Noa', 'Lot', 'Mees', 'Jip', 'Fenna', 'Daan', 'Isa', 'Bram', 'Liv', 'Ties', 'Mila', 'Ruben', 'Zoë', 'Siem', 'Yara'];

const FUN = {
  tellen(r, band) {
    if (band === 1) {
      const n = ri(r, 3, 4), m = ri(r, 3, 4), gone = ri(r, 2, 4), missing = new Set(shuffle(r, range(n * m)).slice(0, gone).map(i => `${Math.floor(i / m)},${i % m}`));
      const total = n * m, ans = total - gone;
      return { text: `Uit een vel met ${n} rijen van ${m} hokjes zijn een paar hokjes geknipt. Hoeveel hokjes zijn er nog over?`, svg: gridSvg(n, m, {}, 34, { missing, label: 'vel met hokjes' }), ...numOptions(r, ans, [total, ans + 1, ans - 1, gone]),
        explain: `Een heel vel heeft ${n} rijen van ${m}: dat zijn ${total} hokjes. Er zijn er ${gone} weg. ${total} − ${gone} = ${ans}.`, data: { ans } };
    }
    if (band === 2) {
      const [R, M] = pick(r, [[2, 2], [2, 3], [2, 4], [3, 3], [2, 5]]), ctx = pick(r, ['een tegelvloer', 'een chocoladereep', 'een raam', 'een stuk ruitjespapier']);
      const sizes = []; for (let k = 1; k <= Math.min(R, M); k++) sizes.push([k, (R - k + 1) * (M - k + 1)]);
      const ans = sizes.reduce((a2, x) => a2 + x[1], 0), small = R * M;
      return { text: `Dit is ${ctx}. Hoeveel vierkanten zie je? Tel ook de grote vierkanten die uit meer hokjes bestaan.`, svg: gridSvg(R, M, {}, 36), ...numOptions(r, ans, [small, ans + 1, small + 1, ans - 1]),
        explain: sizes.map(([k, c]) => k === 1 ? `Kleine vierkantjes: ${c}.` : `Vierkanten van ${k} bij ${k} hokjes: ${c}.`).join(' ') + ` Samen ${sizes.map(x => x[1]).join(' + ')} = ${ans}.`, data: { ans } };
    }
    const s = ri(r, 3, 5), cut = r() < .5, base = s * (s + 1) / 2, ans = cut ? 2 * base : base, ctx = pick(r, ['een puntmuts', 'een tentje', 'een zeil', 'een stuk taart']);
    const W = 240, Hh = 170; let b = `<polygon points="${W / 2},10 10,${Hh - 10} ${W - 10},${Hh - 10}" fill="${C.soft}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
    for (let i = 1; i < s; i++) b += `<line x1="${W / 2}" y1="10" x2="${10 + i * (W - 20) / s}" y2="${Hh - 10}" stroke="${C.ink}" stroke-width="2.5"/>`;
    if (cut) b += `<line x1="${W / 2 - (W / 2 - 10) * .55}" y1="${10 + (Hh - 20) * .55}" x2="${W / 2 + (W / 2 - 10) * .55}" y2="${10 + (Hh - 20) * .55}" stroke="${C.ink}" stroke-width="2.5"/>`;
    const parts = range(s).map(i => s - i).join(' + ');
    return { text: `Deze tekening lijkt op ${ctx}. Hoeveel driehoeken zie je? Tel ook de driehoeken die uit meer stukjes bestaan.`, svg: svg(W, Hh, b, 'driehoek met lijnen'), ...numOptions(r, ans, [s, base === ans ? ans - 1 : base, ans + 1, cut ? 2 * s : 2 * s + 1]),
      explain: `Kijk eerst naar ${cut ? 'het bovenste deel' : 'de driehoek'}: ${s} smalle driehoekjes, ${s - 1} van 2 stukjes, enzovoort. Samen ${parts} = ${base}.${cut ? ` Met de dwarslijn mee kun je dezelfde driehoeken ook tot onderaan maken: nog eens ${base}. Samen ${ans}.` : ''}`, data: { ans } };
  },

  spiegel(r, band) {
    const n = band === 3 ? 4 : 3, count = band === 1 ? 3 : band === 2 ? 4 : 5;
    const colors = band === 1 ? [C.purple] : [C.purple, C.yellow];
    const cells = asymmetricPattern(r, n, count, colors);
    const mk = f => { const c = apply(cells, n, f); return { key: key(c), svg: gridSvg(n, n, c, 26) }; };
    const correct = mk('mirrorLR');
    const o = picOptions(r, correct, [mk('id'), mk('mirrorUD'), mk('rot180'), mk('rotCW'), mk('rotCCW')]);
    return { text: `Op een stempel staat deze tekening. Welke afdruk maakt de stempel op het papier?`, svg: gridSvg(n, n, cells, 34, { label: 'stempel' }), ...o,
      explain: `Een stempel druk je ondersteboven op het papier. Daardoor wordt links rechts en rechts links. Boven blijft boven. Het is dus gespiegeld, net als in een spiegel.`, data: { f: 'mirrorLR', cells, n } };
  },

  draaien(r, band) {
    const n = 3, cells = asymmetricPattern(r, n, band === 1 ? 3 : 4, [C.purple, C.yellow]);
    const f = band === 1 ? 'rotCW' : band === 2 ? 'rot180' : 'rotCCW';
    const ask = band === 1 ? 'een kwartslag met de klok mee' : band === 2 ? 'een halve slag (twee kwartslagen)' : 'drie kwartslagen met de klok mee';
    const mk = g => { const c = apply(cells, n, g); return { key: key(c), svg: gridSvg(n, n, c, 26) }; };
    const o = picOptions(r, mk(f), shuffle(r, ['rotCW', 'rotCCW', 'rot180', 'mirrorLR', 'mirrorUD', 'id'].filter(g => g !== f)).map(mk));
    const how = band === 1 ? 'Wat boven zat, komt rechts. Wat rechts zat, komt onder.' : band === 2 ? 'Na een halve slag staat alles op zijn kop: boven wordt onder en links wordt rechts.' : 'Drie kwartslagen met de klok mee is hetzelfde als één kwartslag tegen de klok in. Wat boven zat, komt links.';
    return { text: `Je draait dit kaartje ${ask}. Hoe ziet het er dan uit?`, svg: gridSvg(n, n, cells, 34, { label: 'kaartje' }), ...o, explain: `${how} Draai je boek of je hoofd mee om het te controleren.`, data: { f, cells, n } };
  },

  patroon(r, band) {
    const pal = shuffle(r, ['rood', 'blauw', 'geel', 'groen']);
    const len = band === 1 ? ri(r, 2, 3) : ri(r, 3, 4);
    let unit; do { unit = range(len).map(() => pick(r, pal.slice(0, 3))); } while (new Set(unit).size < 2 || (len === 4 && unit[0] === unit[2] && unit[1] === unit[3]));
    const shown = [...unit, ...unit];
    if (band < 3) {
      const nPos = band === 1 ? ri(r, 9, 15) : ri(r, 16, 30), ans = unit[(nPos - 1) % len];
      const wrong = shuffle(r, ['rood', 'blauw', 'geel', 'groen', 'paars'].filter(c => c !== ans));
      const o = picOptions(r, { key: ans, svg: swatch(ans), text: ans }, wrong.map(c => ({ key: c, svg: swatch(c), text: c })));
      const mult = range(Math.floor(nPos / len) + 1).map(k => k * len).filter(k => k > 0 && k <= nPos);
      return { text: `De kralen gaan steeds op dezelfde manier verder. Welke kleur heeft kraal nummer ${nPos}?`, svg: beadsSvg(shown), ...o,
        explain: `Het patroon is ${unit.join(', ')}. Na ${len} kralen begint het opnieuw. Kraal ${mult.slice(-3).join(', ')} is steeds de laatste van een groepje (${unit[len - 1]}). Tel vanaf daar verder tot ${nPos}: dat is ${ans}.`, data: { ans } };
    }
    const nPos = ri(r, 12, 24), color = pick(r, unit), ans = range(nPos).filter(i => unit[i % len] === color).length;
    const per = unit.filter(c => c === color).length, groups = Math.floor(nPos / len), rest = nPos % len;
    return { text: `Lies rijgt ${nPos} kralen aan een ketting, steeds in hetzelfde patroon. Hoeveel ${color}e kralen zitten er aan de ketting?`, svg: beadsSvg(shown), ...numOptions(r, ans, [groups * per, ans + 1, ans - 1, nPos - ans]),
      explain: `In elk groepje van ${len} kralen zitten ${per} ${color}e. ${nPos} kralen zijn ${groups} hele groepjes${rest ? ` en nog ${rest} kralen` : ''}. ${groups} × ${per} = ${groups * per}${rest ? `, plus ${ans - groups * per} in het stukje dat over is` : ''}. Samen ${ans}.`, data: { ans } };
  },

  weegschaal(r, band) {
    if (band === 1) {
      const a = ri(r, 2, 9), b = ri(r, 1, 6), total = a + b;
      return { text: `De weegschaal is in evenwicht. Hoeveel kilo weegt de appel?`, svg: balanceSvg([{ kind: 'appel' }, { kind: 'zak', v: b }], [{ kind: 'zak', v: total }]), ...numOptions(r, a, [total, total + b, a + 1, b], 1),
        explain: `Links ligt de appel met een zak van ${b} kilo. Rechts ligt ${total} kilo. De appel weegt dus ${total} − ${b} = ${a} kilo.`, data: { ans: a } };
    }
    if (band === 2) {
      const a = ri(r, 2, 8), b = ri(r, 1, 5), total = 2 * a + b;
      return { text: `De twee appels wegen evenveel. Hoeveel kilo weegt één appel?`, svg: balanceSvg([{ kind: 'appel' }, { kind: 'appel' }, { kind: 'zak', v: b }], [{ kind: 'zak', v: total }]), ...numOptions(r, a, [total - b, total, a + b, a + 1], 1),
        explain: `Haal links en rechts ${b} kilo weg. Dan wegen twee appels samen ${total - b} kilo. Eén appel is de helft: ${a} kilo.`, data: { ans: a } };
    }
    const a = ri(r, 1, 7), k = ri(r, 2, 4), peer = k * a, total = a + peer, askPeer = r() < .5, ans = askPeer ? peer : a;
    return { text: `Twee weegschalen zijn in evenwicht. Hoeveel kilo weegt ${askPeer ? 'de peer' : 'de appel'}?`, svg: balanceSvg(Array(k).fill({ kind: 'appel' }), [{ kind: 'peer' }]) + balanceSvg([{ kind: 'appel' }, { kind: 'peer' }], [{ kind: 'zak', v: total }]), ...numOptions(r, ans, askPeer ? [total - 1, a, total, peer + a] : [peer, total, Math.floor(total / 2), a + 1], 1),
      explain: `De peer weegt evenveel als ${k} appels. Dus appel + peer is samen ${k + 1} appels. Die wegen ${total} kilo. ${total} : ${k + 1} = ${a} kilo per appel.${askPeer ? ` De peer weegt ${k} × ${a} = ${peer} kilo.` : ''}`, data: { ans } };
  },

  rij(r, band) {
    const [x, y] = shuffle(r, NAMEN);
    if (band === 1) {
      const front = ri(r, 3, 7), back = ri(r, 3, 7), ans = front + back - 1;
      return { text: `Kinderen staan in een rij. ${x} staat als ${front}e van voren en als ${back}e van achteren. Hoeveel kinderen staan er in de rij?`, svg: null, ...numOptions(r, ans, [front + back, ans - 1, front + back + 1, Math.abs(front - back)], 1),
        explain: `Voor ${x} staan ${front - 1} kinderen en achter ${x} staan ${back - 1} kinderen. Samen met ${x} zelf: ${front - 1} + ${back - 1} + 1 = ${ans}. ${x} mag je maar één keer tellen.`, data: { ans } };
    }
    if (band === 2) {
      const n = ri(r, 10, 15), a = ri(r, 2, 4), b = ri(r, 2, 4), posB = n - b + 1, ans = posB - a - 1;
      return { text: `Er staan ${n} kinderen in een rij. ${x} staat als ${a}e van voren. ${y} staat als ${b}e van achteren. Hoeveel kinderen staan er tussen ${x} en ${y}?`, svg: null, ...numOptions(r, ans, [ans + 1, ans + 2, ans - 1, n - a - b], 0),
        explain: `${y} is de ${b}e van achteren. Van voren geteld is dat plek ${n} − ${b} + 1 = ${posB}. ${x} staat op plek ${a}. Daartussen zijn de plekken ${a + 1} tot en met ${posB - 1}: dat zijn ${ans} kinderen.`, data: { ans } };
    }
    const kids = shuffle(r, NAMEN).slice(0, 5); // volgorde van groot naar klein
    const pairs = shuffle(r, range(4).map(i => [kids[i], kids[i + 1]]));
    const clues = pairs.map(([p, q]) => r() < .5 ? `${p} is groter dan ${q}.` : `${q} is kleiner dan ${p}.`);
    const askPos = ri(r, 1, 3), ans = kids[askPos], word = ['grootste', 'op één na grootste', 'middelste', 'op één na kleinste'][askPos];
    const o = textOptions(r, ans, shuffle(r, kids.filter(k => k !== ans)));
    return { text: `${clues.join(' ')} Wie is de ${word}?`, svg: null, ...o,
      explain: `Zet ze op een rij van groot naar klein. Begin bij wie nergens kleiner is dan een ander: ${kids[0]}. Dan ${kids.slice(1).join(', ')}. De ${word} is ${ans}.`, data: { ans } };
  },

  verhaal(r, band) {
    const [x, y] = shuffle(r, NAMEN);
    if (band === 1) {
      const thing = pick(r, ['stickers', 'knikkers', 'kaartjes', 'snoepjes']), a = ri(r, 5, 12), b = ri(r, 2, 8), c = ri(r, 1, Math.min(a + b - 1, 7)), ans = a + b - c;
      return { text: `${x} heeft ${a} ${thing}. ${y} geeft er ${b} bij. Daarna geeft ${x} er ${c} weg. Hoeveel ${thing} heeft ${x} nu?`, svg: null, ...numOptions(r, ans, [a + b + c, a + b, a - c, ans + 1], 0),
        explain: `Eerst ${a} + ${b} = ${a + b}. Daarna gaan er ${c} weg: ${a + b} − ${c} = ${ans}.`, data: { ans } };
    }
    if (band === 2) {
      if (r() < .5) {
        const age = ri(r, 4, 8), diff = ri(r, 2, 4), later = ri(r, 1, 3), ans = age + age + diff + 2 * later;
        return { text: `${x} is nu ${age} jaar. De broer van ${x} is ${diff} jaar ouder. Hoe oud zijn ze samen over ${later} jaar?`, svg: null, ...numOptions(r, ans, [ans - later, age + age + diff, ans + later, ans - 1], 1),
          explain: `De broer is nu ${age} + ${diff} = ${age + diff}. Samen nu ${age} + ${age + diff} = ${2 * age + diff}. Over ${later} jaar zijn ze allebei ${later} jaar ouder, dus er komt ${2 * later} bij: ${ans}.`, data: { ans } };
      }
      const half = ri(r, 4, 9), start = 2 * half, eat = ri(r, 1, half - 1), ans = half - eat;
      return { text: `In de schaal liggen ${start} aardbeien. Papa eet de helft op. Daarna pakt ${x} er nog ${eat}. Hoeveel aardbeien liggen er nog?`, svg: null, ...numOptions(r, ans, [start - eat, half, ans + 1, start - half - eat + 1], 0),
        explain: `De helft van ${start} is ${half}. Er blijven ${half} over. Dan gaan er nog ${eat} weg: ${half} − ${eat} = ${ans}.`, data: { ans } };
    }
    if (r() < .5) {
      const total = ri(r, 5, 9), sheep = ri(r, 1, total - 1), chick = total - sheep, legs = 4 * sheep + 2 * chick;
      return { text: `Op de boerderij lopen kippen en schapen. Samen zijn het ${total} dieren met ${legs} poten. Hoeveel schapen zijn er?`, svg: null, ...numOptions(r, sheep, [chick, legs / 4 | 0, sheep + 1, (legs - 2 * total)], 0),
        explain: `Doe eerst alsof het allemaal kippen zijn: ${total} × 2 = ${2 * total} poten. Er zijn er ${legs} − ${2 * total} = ${legs - 2 * total} meer. Elk schaap heeft 2 poten extra. ${legs - 2 * total} : 2 = ${sheep} schapen.`, data: { ans: sheep } };
    }
    const p = ri(r, 1, 4), a = ri(r, 4, 6), b = ri(r, 1, a - 1), diff = (a - b) * p, thing = pick(r, ['repen', 'ijsjes', 'pakjes sap']);
    return { text: `${a} ${thing} kosten samen ${diff} euro meer dan ${b} ${thing}. Hoeveel euro kost één?`, svg: null, ...numOptions(r, p, [diff, a - b, p + 1, diff - 1], 1),
      explain: `Het verschil zit in ${a} − ${b} = ${a - b} ${thing}. Die kosten samen ${diff} euro. ${diff} : ${a - b} = ${p} euro voor één.`, data: { ans: p } };
  },

  route(r, band) {
    const [R, K] = band === 1 ? [2, 3] : band === 2 ? [3, 3] : [3, 4];
    let g, best, paths;
    for (let t = 0; t < 50; t++) {
      g = range(R).map(() => range(K).map(() => ri(r, 1, 9)));
      paths = [];
      const walk = (i, j, acc, path) => { acc += g[i][j]; path = [...path, [i, j]]; if (i === R - 1 && j === K - 1) { paths.push({ s: acc, path }); return; } if (i < R - 1) walk(i + 1, j, acc, path); if (j < K - 1) walk(i, j + 1, acc, path); };
      walk(0, 0, 0, []);
      paths.sort((a, b) => a.s - b.s);
      if (paths[0].s !== paths[1].s) { best = paths[0]; break; }
    }
    const cs = 44, cell = (i, j, hl) => rect(4 + j * cs, 4 + i * cs, cs, cs, hl ? C.yellow : (i + j === 0 ? '#dff3e7' : i === R - 1 && j === K - 1 ? '#eee7fc' : C.white)) + txt(4 + j * cs + cs / 2, 4 + i * cs + cs / 2, g[i][j], 20);
    const draw = hl => svg(K * cs + 8, R * cs + 8, range(R).flatMap(i => range(K).map(j => cell(i, j, hl && hl.some(([a, b]) => a === i && b === j)))).join(''), 'kamers met getallen');
    const worst = paths[paths.length - 1].s;
    const greedy = (() => { let i = 0, j = 0, s = g[0][0]; while (i < R - 1 || j < K - 1) { if (i === R - 1) j++; else if (j === K - 1) i++; else if (g[i + 1][j] <= g[i][j + 1]) i++; else j++; s += g[i][j]; } return s; })();
    return { text: `Een muis loopt van het groene hokje naar het paarse hokje. Ze mag alleen naar rechts of naar beneden. Ze telt alle getallen op waar ze langskomt (ook het begin en het eind). Wat is de kleinste som die ze kan halen?`, svg: draw(null), ...numOptions(r, best.s, [paths[1].s, greedy, worst, best.s - 1], 1),
      explain: `Probeer de routes. De beste route gaat langs ${best.path.map(([i, j]) => g[i][j]).join(' → ')}. Samen ${best.s}. Elke andere route geeft meer.`, explainSvg: draw(best.path), data: { ans: best.s, g } };
  },

  logica(r, band) {
    const n = band === 1 ? 3 : 4;
    const sets = [['hond', 'kat', 'konijn', 'vis', 'hamster'], ['rode', 'blauwe', 'gele', 'groene', 'paarse'].map(c => c + ' fiets'), ['bal', 'pop', 'puzzel', 'vlieger', 'tol']];
    const things = shuffle(r, pick(r, sets)), items = things.slice(0, n), kids = shuffle(r, NAMEN).slice(0, n);
    let pz = null;
    for (let t = 0; t < 20 && !pz; t++) pz = logicPuzzle(r, kids, items, { allowYes: band < 3, minClues: n - 1, maxClues: n === 3 ? 4 : 7 });
    const name = it => `${it === 'konijn' ? 'het' : 'de'} ${it}`;
    const clueTxt = pz.clues.map(c => c.t === 'niet' ? `${kids[c.i]} heeft ${name(items[c.j])} niet.` : `${kids[c.i]} heeft ${name(items[c.j])}.`);
    const target = pz.steps[pz.steps.length - 1].i, ans = items[pz.sol[target]];
    const o = textOptions(r, ans, shuffle(r, things.filter(t => t !== ans)));
    o.options.forEach(op => op.text = op.text.charAt(0).toUpperCase() + op.text.slice(1));
    const stepTxt = pz.steps.map(s => s.kind === 'persoon' ? `${kids[s.i]} kan alleen nog ${name(items[s.j])} hebben.` : `Alleen ${kids[s.i]} kan nog ${name(items[s.j])} hebben.`);
    return { text: `${kids.join(', ').replace(/, ([^,]*)$/, ' en $1')} hebben elk één ding: ${items.map(name).join(', ').replace(/, ([^,]*)$/, ' en $1')}. ${clueTxt.join(' ')} Wat heeft ${kids[target]}?`, svg: null, ...o,
      explain: `Streep weg wat niet kan. ${stepTxt.join(' ')}`, data: { n, clues: pz.clues, target, sol: pz.sol, items, ans } };
  },

  blokken(r, band) {
    if (band < 3) {
      const [R, K] = band === 1 ? [1, ri(r, 3, 5)] : [2, ri(r, 2, 3)];
      const h = staircase(r, R, K, 3, band === 1 ? 4 : 6), ans = h.flat().reduce((a, v) => a + v, 0);
      const visible = band === 1 ? ans : ans - (R > 1 ? Math.min(...h[0]) : 0);
      return { text: band === 1 ? `Hoeveel blokjes zijn er gebruikt voor dit bouwwerk?` : `Hoeveel blokjes zijn er gebruikt? Elk blokje staat op de tafel of op een ander blokje.`, svg: isoSvg(h), ...numOptions(r, ans, [visible, ans - 1, ans + 1, R * K], 1),
        explain: `Tel per stapel: ${h.flat().join(' + ')} = ${ans}. ${band === 2 ? 'Achter de voorste stapels staan blokjes die je niet ziet, maar ze moeten er wel zijn.' : ''}`.trim(), data: { ans } };
    }
    const R = 2, K = 3, h = range(R).map(() => range(K).map(() => ri(r, 1, 3)));
    const front = range(K).map(c => Math.max(...h.map(row => row[c])));
    const sil = cols => { let b = ''; cols.forEach((v, c) => { for (let z = 0; z < v; z++) b += rect(4 + c * 26, 4 + (3 - 1 - z) * 26, 26, 26, '#b9a3ec'); }); return { key: cols.join(), svg: svg(K * 26 + 8, 3 * 26 + 8, b, 'vooraanzicht') }; };
    const variants = [h[1], h[0], [...front].reverse(), front.map((v, i) => i === 0 ? Math.min(3, v + 1) : v), front.map((v, i) => i === K - 1 ? Math.max(1, v - 1) : v), h.map(row => Math.max(...row)).concat(1)].map(c => sil(c.slice(0, K)));
    const o = picOptions(r, sil(front), variants);
    if (!o.complete) return FUN.blokken(r, band);
    let plan = ''; h.forEach((row, i) => row.forEach((v, j) => { plan += rect(4 + j * 34, 4 + i * 34, 34, 34, C.soft) + txt(4 + j * 34 + 17, 4 + i * 34 + 17, v, 18); }));
    return { text: `Dit is een bouwwerk van bovenaf. Het getal zegt hoeveel blokjes er op elkaar staan. Jij kijkt van de voorkant (de onderkant van het plaatje). Wat zie je?`, svg: svg(K * 34 + 8, R * 34 + 30, plan + txt((K * 34 + 8) / 2, R * 34 + 18, '▲ voorkant', 12, C.ink, 700), 'bovenaanzicht met getallen'), ...o,
      explain: `Van voren zie je per kolom alleen de hoogste stapel. Kolom voor kolom: ${front.join(', ')}.`, data: { h } };
  }
};

// ============================================================================================
// wizKID (groep 5 en 6)
// ============================================================================================
const KID = {
  vouwen(r, band) {
    const n = 4, folds = band === 1 ? 1 : 2, nh = band === 3 ? 2 : 1;
    const half = 2; // gevouwen deel: kolommen 0..1 (en bij 2 vouwen rijen 0..1)
    const rows = folds === 2 ? half : n;
    let holes; do { holes = shuffle(r, range(rows * half)).slice(0, nh).map(i => [Math.floor(i / half), i % half]); } while (nh === 2 && holes[0][0] === holes[1][0] && holes[0][1] === holes[1][1]);
    const unfold = (hs, mode) => { const out = new Set(); for (const [a, b] of hs) { const cols = mode === 'shift' ? [b, b + 2] : [b, n - 1 - b]; for (const c of cols) { if (folds === 1) out.add(`${a},${c}`); else { const rs = mode === 'shift' ? [a, a + 2] : mode === 'onlyLR' ? [a] : [a, n - 1 - a]; for (const rr of rs) out.add(`${rr},${c}`); } } } return out; };
    const mk = set => ({ key: [...set].sort().join('|'), svg: gridSvg(n, n, {}, 22, { holes: set, label: 'opengevouwen papier' }) });
    const good = unfold(holes, 'mirror');
    const upDown = new Set([...good].map(k => { const [a, b] = k.split(',').map(Number); return `${n - 1 - a},${b}`; }));
    const wrongs = [unfold(holes, 'shift'), new Set(holes.map(([a, b]) => `${a},${b}`)), folds === 2 ? unfold(holes, 'onlyLR') : upDown].map(mk);
    const extra = [...range(n * n)].map(i => `${Math.floor(i / n)},${i % n}`).filter(k => !good.has(k));
    for (let t = 0; t < 6; t++) { const s = new Set(good); const first = [...s][t % s.size]; s.delete(first); s.add(pick(r, extra)); wrongs.push(mk(s)); }
    const o = picOptions(r, mk(good), wrongs);
    // tekening: vouwstappen
    const cs = 22; let b = '';
    b += rect(4, 4, n * cs, n * cs, C.soft) + `<line x1="${4 + 2 * cs}" y1="0" x2="${4 + 2 * cs}" y2="${n * cs + 8}" stroke="${C.purple}" stroke-width="2" stroke-dasharray="5 4"/>`;
    b += txt(n * cs + 26, n * cs / 2, '→', 26);
    const fx = n * cs + 48;
    if (folds === 1) { b += rect(fx, 4, 2 * cs, n * cs, C.soft); for (const [a, c] of holes) b += `<circle cx="${fx + c * cs + cs / 2}" cy="${4 + a * cs + cs / 2}" r="${cs * .22}" fill="${C.ink}"/>`; }
    else {
      b += rect(fx, 4, 2 * cs, n * cs, C.soft) + `<line x1="${fx - 4}" y1="${4 + 2 * cs}" x2="${fx + 2 * cs + 4}" y2="${4 + 2 * cs}" stroke="${C.purple}" stroke-width="2" stroke-dasharray="5 4"/>` + txt(fx + 2 * cs + 22, n * cs / 2, '→', 26);
      const gx = fx + 2 * cs + 44; b += rect(gx, 4, 2 * cs, 2 * cs, C.soft); for (const [a, c] of holes) b += `<circle cx="${gx + c * cs + cs / 2}" cy="${4 + a * cs + cs / 2}" r="${cs * .22}" fill="${C.ink}"/>`;
    }
    const W = folds === 1 ? n * cs + 48 + 2 * cs + 8 : n * cs + 48 + 2 * cs + 44 + 2 * cs + 8;
    return { text: folds === 1 ? `Een vierkant papier wordt dubbelgevouwen langs de stippellijn. Dan prik je ${nh === 1 ? 'een gaatje' : 'gaatjes'} zoals op het plaatje. Hoe ziet het papier eruit als je het weer openvouwt?` : `Een vierkant papier wordt twee keer dubbelgevouwen langs de stippellijnen. Dan prik je ${nh === 1 ? 'één gaatje' : 'twee gaatjes'}. Hoe ziet het papier eruit als je het helemaal openvouwt?`,
      svg: svg(W, n * cs + 8, b, 'papier vouwen en prikken'), ...o,
      explain: folds === 1 ? `Elk gaatje gaat door twee lagen papier. Bij openvouwen krijg je het gaatje en zijn spiegelbeeld aan de andere kant van de vouwlijn. Dus ${good.size} gaatjes, even ver van de vouwlijn.` : `Na twee keer vouwen liggen er 4 lagen op elkaar. Elk gaatje wordt dus 4 gaatjes: één in elk kwart, gespiegeld over beide vouwlijnen. Samen ${good.size} gaatjes.`, data: { holes, folds } };
  },

  dobbelsteen(r, band) {
    if (band === 1) {
      const net = NETS[0], opp = netOpposites(net);
      const vals = new Array(6); const order = shuffle(r, range(6)); const used = new Set();
      for (const i of order) { if (vals[i] !== undefined) continue; let v; do { v = ri(r, 1, 6); } while (used.has(v) || used.has(7 - v)); vals[i] = v; vals[opp[i]] = 7 - v; used.add(v); used.add(7 - v); }
      const s = ri(r, 0, 5), o2 = shuffle(r, range(6).filter(i => i !== s && opp[i] !== s))[0];
      const labels = vals.map((v, i) => i === s ? '★' : i === o2 ? '?' : String(v)), ans = vals[s];
      const drop = shuffle(r, [1, 2, 3, 4, 5, 6].filter(v => v !== ans && v !== vals[o2]))[0];
      const values = [1, 2, 3, 4, 5, 6].filter(v => v !== drop), opts = { options: values.map(v => ({ text: String(v) })), answer: values.indexOf(ans) };
      return { text: `Dit is de uitslag van een gewone dobbelsteen. Op een gewone dobbelsteen zijn twee vlakken die tegenover elkaar liggen samen altijd 7. Welk getal hoort op de plek van de ster?`, svg: netSvg(net, labels, 38, s), ...opts,
        explain: `Vouw in gedachten: vakjes met precies één vakje ertussen in een rechte rij komen tegenover elkaar. Tegenover de ster ligt de ${vals[opp[s]]}. Dus de ster is 7 − ${vals[opp[s]]} = ${ans}.`, data: { ans, net, labels } };
    }
    if (band === 2) {
      const net = pick(r, NETS.slice(1)), opp = netOpposites(net), L = shuffle(r, ['A', 'B', 'C', 'D', 'E', 'F']), q = ri(r, 0, 5), ans = L[opp[q]];
      const o = textOptions(r, ans, shuffle(r, L.filter((x, i) => i !== q && x !== ans)));
      o.options.sort((a, b) => a.text.localeCompare(b.text)); o.answer = o.options.findIndex(x => x.text === ans);
      return { text: `Je vouwt deze uitslag tot een kubus. Welke letter komt tegenover ${L[q]}?`, svg: netSvg(net, L, 38, q), ...o,
        explain: `Vouw in gedachten één vlakje tegelijk. ${L[q]} en ${ans} raken elkaar niet en komen na het vouwen precies tegenover elkaar. Tip: in een rechte rij van drie vakjes liggen het eerste en het derde tegenover elkaar.`, data: { ans, net, L, q } };
    }
    // welke uitslag is een gewone dobbelsteen?
    const make = (net, ok) => {
      const opp = netOpposites(net); const vals = new Array(6), used = new Set();
      for (const i of shuffle(r, range(6))) { if (vals[i] !== undefined) continue; let v; do { v = ri(r, 1, 6); } while (used.has(v) || used.has(7 - v)); vals[i] = v; vals[opp[i]] = 7 - v; used.add(v); used.add(7 - v); }
      if (!ok) { // twee getallen wisselen die niet tegenover elkaar liggen en geen paar vormen
        const pairs = []; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (opp[i] !== j) pairs.push([i, j]);
        const [i, j] = pick(r, pairs); [vals[i], vals[j]] = [vals[j], vals[i]];
      }
      const valid = range(6).every(i => vals[i] + vals[opp[i]] === 7);
      return { key: net.map(c => c.join()).join(';') + '|' + vals.join(), svg: netSvg(net, vals.map(String), 26), valid, net, vals };
    };
    const nets = shuffle(r, NETS).slice(0, 5);
    const good = make(nets[0], true);
    const wrongs = nets.slice(1).map(nt => { let w; do { w = make(nt, false); } while (w.valid); return w; });
    const o = picOptions(r, good, wrongs);
    return { text: `Op een gewone dobbelsteen zijn twee vlakken die tegenover elkaar liggen samen altijd 7. Van welke uitslag kun je een gewone dobbelsteen vouwen?`, svg: null, ...o,
      explain: `Zoek bij elke uitslag welke vakjes tegenover elkaar komen (in een rechte rij: eentje overslaan). Alleen bij het goede antwoord zijn die paren steeds samen 7: 1 en 6, 2 en 5, 3 en 4.`, data: { nets: o.options.map(op => [good, ...wrongs].find(w => w.key === op.key)).map(w => ({ net: w.net, vals: w.vals })) } };
  },

  symbolen(r, band) {
    const S = { ster: `<polygon points="14,2 17.5,10 26,10.5 19.5,16 21.5,25 14,20 6.5,25 8.5,16 2,10.5 10.5,10" fill="${C.yellow}" stroke="${C.ink}" stroke-width="1.6"/>`, bol: `<circle cx="14" cy="14" r="11" fill="${C.blue}" stroke="${C.ink}" stroke-width="1.6"/>`, drie: `<polygon points="14,3 26,25 2,25" fill="${C.pink}" stroke="${C.ink}" stroke-width="1.6"/>` };
    const icon = (k, x, y) => `<g transform="translate(${x},${y})">${S[k]}</g>`;
    const row = (terms, total, y) => { let b = '', x = 6; terms.forEach((t, i) => { if (i) { b += txt(x + 8, y + 14, '+', 20); x += 18; } b += icon(t, x, y); x += 30; }); b += txt(x + 12, y + 14, '=', 20) + txt(x + 38, y + 14, total, 20); return b; };
    const draw = rows => svg(220, rows.length * 38 + 6, rows.map((rw, i) => row(rw[0], rw[1], 6 + i * 38)).join(''), 'sommen met tekens');
    const name = { ster: 'ster', bol: 'bol', drie: 'driehoek' };
    if (band === 1) {
      const s = ri(r, 2, 9), b = ri(r, 1, 9);
      return { text: `Elk teken staat voor een getal. Hoeveel is de bol?`, svg: draw([[['ster', 'ster'], 2 * s], [['ster', 'bol'], s + b]]), ...numOptions(r, b, [s, s + b - 2 * s < 0 ? s + 1 : 2 * s, s + b, b + 1], 0),
        explain: `Twee sterren zijn ${2 * s}, dus één ster is ${s}. Ster + bol = ${s + b}, dus de bol is ${s + b} − ${s} = ${b}.`, data: { ans: b } };
    }
    if (band === 2) {
      const s = ri(r, 2, 7), b = ri(r, 1, 9), t = ri(r, 1, 9);
      return { text: `Elk teken staat voor een getal. Hoeveel is de driehoek?`, svg: draw([[['ster', 'ster', 'ster'], 3 * s], [['ster', 'bol'], s + b], [['bol', 'drie'], b + t]]), ...numOptions(r, t, [b, s, b + t - s, t + 1], 0),
        explain: `Drie sterren zijn ${3 * s}, dus één ster is ${s}. Dan is de bol ${s + b} − ${s} = ${b}. En de driehoek is ${b + t} − ${b} = ${t}.`, data: { ans: t } };
    }
    const s = ri(r, 2, 9), b = ri(r, 2, 9), t = ri(r, 2, 9), ans = s + b + t;
    return { text: `Elk teken staat voor een getal. Hoeveel is ster + bol + driehoek samen?`, svg: draw([[['ster', 'bol'], s + b], [['bol', 'drie'], b + t], [['ster', 'drie'], s + t]]), ...numOptions(r, ans, [2 * ans, ans + s, s + b + b + t, ans - 1], 1),
      explain: `Tel alle drie de sommen op: ${s + b} + ${b + t} + ${s + t} = ${2 * ans}. Daarin zit elk teken precies twee keer. Dus één keer alles is de helft: ${ans}.`, data: { ans } };
  },

  piramide(r, band) {
    const W = 270;
    const draw = (rows, hide) => { let b = ''; const h = 40, w = 60; rows.forEach((row, i) => { const y = 6 + (rows.length - 1 - i) * h, off = (W - row.length * w) / 2; row.forEach((v, j) => { const hid = hide.some(([a, c]) => a === i && c === j); b += rect(off + j * w, y, w, h, hid ? C.yellow : C.soft) + txt(off + j * w + w / 2, y + h / 2, hid ? '?' : v, 18); }); }); return svg(W, rows.length * h + 12, b, 'getallenmuur'); };
    const build = bottom => { const rows = [bottom]; while (rows[rows.length - 1].length > 1) { const p = rows[rows.length - 1]; rows.push(p.slice(1).map((v, i) => p[i] + v)); } return rows; };
    if (band === 1) {
      const bottom = range(3).map(() => ri(r, 1, 9)), rows = build(bottom), ans = rows[2][0];
      return { text: `In deze getallenmuur is elk blok de som van de twee blokken eronder. Welk getal hoort bovenaan?`, svg: draw(rows, [[2, 0], [1, 0], [1, 1]]), ...numOptions(r, ans, [bottom[0] + bottom[1] + bottom[2], ans + 1, ans - 2, rows[1][0]], 1),
        explain: `Eerst de middelste rij: ${bottom[0]} + ${bottom[1]} = ${rows[1][0]} en ${bottom[1]} + ${bottom[2]} = ${rows[1][1]}. Bovenaan: ${rows[1][0]} + ${rows[1][1]} = ${ans}.`, data: { ans } };
    }
    if (band === 2) {
      const bottom = range(3).map(() => ri(r, 1, 9)), rows = build(bottom), ans = bottom[1];
      return { text: `Elk blok is de som van de twee blokken eronder. Welk getal hoort op de plek van het gele vraagteken onderaan?`, svg: draw(rows, [[0, 1], [1, 0], [1, 1]]), ...numOptions(r, ans, [rows[2][0] - bottom[0] - bottom[2], ans + 1, ans - 1, Math.round((rows[2][0] - bottom[0] - bottom[2]) / 3)], 0),
        explain: `Het middelste getal onderaan telt twee keer mee voor het bovenste blok (via beide blokken in het midden). Dus ${rows[2][0]} = ${bottom[0]} + 2 × ? + ${bottom[2]}. Dan is 2 × ? = ${rows[2][0] - bottom[0] - bottom[2]}, en ? = ${ans}.`, data: { ans } };
    }
    const bottom = range(4).map(() => ri(r, 1, 6)), rows = build(bottom), ans = bottom[1];
    return { text: `Elk blok is de som van de twee blokken eronder. Welk getal hoort op het gele vraagteken onderaan?`, svg: draw(rows, [[0, 1], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1]]), ...numOptions(r, ans, [ans + 1, ans - 1, rows[3][0] - bottom[0] - bottom[2] - bottom[3], ans + 2], 0),
      explain: `Van onder naar boven telt elk getal onderaan een aantal keer mee: 1, 3, 3, 1 keer. Dus ${rows[3][0]} = ${bottom[0]} + 3 × ? + 3 × ${bottom[2]} + ${bottom[3]}. Dat geeft 3 × ? = ${3 * ans}, dus ? = ${ans}.`, data: { ans } };
  },

  kalender(r, band) {
    if (band === 1) {
      const d = ri(r, 0, 6), n = ri(r, 9, 30), ans = DAGEN[(d + n) % 7];
      const o = textOptions(r, ans, shuffle(r, DAGEN.filter(x => x !== ans)));
      return { text: `Vandaag is het ${DAGEN[d]}. Welke dag is het over ${n} dagen?`, svg: null, ...o,
        explain: `Na 7 dagen is het weer ${DAGEN[d]}. ${n} = ${Math.floor(n / 7)} × 7 + ${n % 7}. Dus tel nog ${n % 7} ${n % 7 === 1 ? 'dag' : 'dagen'} verder vanaf ${DAGEN[d]}: ${ans}.`, data: { ans } };
    }
    if (band === 2) {
      const m = ri(r, 0, 11), a = ri(r, 1, 9), b = a + ri(r, 10, 20), d = ri(r, 0, 6), ans = DAGEN[(d + b - a) % 7];
      const o = textOptions(r, ans, shuffle(r, DAGEN.filter(x => x !== ans)));
      return { text: `${a} ${MAANDEN[m]} is een ${DAGEN[d]}. Welke dag is ${b} ${MAANDEN[m]}?`, svg: null, ...o,
        explain: `Van ${a} naar ${b} ${MAANDEN[m]} is ${b - a} dagen. Dat is ${Math.floor((b - a) / 7)} hele weken en ${(b - a) % 7} ${((b - a) % 7) === 1 ? 'dag' : 'dagen'}. Hele weken veranderen de dag niet. Dus ${(b - a) % 7} verder dan ${DAGEN[d]}: ${ans}.`, data: { ans } };
    }
    let p, q; do { p = ri(r, 2, 6); q = ri(r, 3, 8); } while (p === q || lcm(p, q) > 30 || lcm(p, q) === Math.max(p, q));
    const [x, y] = shuffle(r, NAMEN), ans = lcm(p, q);
    return { text: `${x} gaat elke ${p} dagen zwemmen. ${y} gaat elke ${q} dagen zwemmen. Vandaag zwemmen ze samen. Over hoeveel dagen zwemmen ze weer voor het eerst samen?`, svg: null, ...numOptions(r, ans, [p * q === ans ? p + q : p * q, p + q, ans + p, Math.max(p, q)], 1),
      explain: `Schrijf de dagen op. ${x}: ${range(Math.ceil(ans / p) + 1).slice(1).map(k => k * p).join(', ')}. ${y}: ${range(Math.ceil(ans / q) + 1).slice(1).map(k => k * q).join(', ')}. Het eerste getal dat in allebei staat is ${ans}.`, data: { ans } };
  },

  logica(r, band) {
    const n = band === 1 ? 3 : 4;
    const sets = [['aardbei', 'vanille', 'chocolade', 'citroen', 'pistache'], ['voetbal', 'judo', 'zwemmen', 'hockey', 'dansen'], ['gitaar', 'piano', 'drum', 'viool', 'fluit']];
    const things = shuffle(r, pick(r, sets)), items = things.slice(0, n), kids = shuffle(r, NAMEN).slice(0, n);
    let pz = null;
    for (let t = 0; t < 40; t++) { const c = logicPuzzle(r, kids, items, { allowYes: false, minClues: n - 1, maxClues: n === 3 ? 4 : 7 }); if (c && (band < 3 || c.steps.some(s => s.kind === 'ding'))) { pz = c; break; } if (c && t > 30) { pz = c; break; } }
    const kind = /aardbei|vanille|chocolade|citroen|pistache/.test(items[0]) ? 'ijs' : /gitaar|piano|drum|viool|fluit/.test(items[0]) ? 'muziek' : 'sport';
    const neg = (k, it) => kind === 'ijs' ? `${k} kiest geen ${it}.` : kind === 'muziek' ? `${k} speelt geen ${it}.` : `${k} zit niet op ${it}.`;
    const list = items.join(', ').replace(/, ([^,]*)$/, ' of $1');
    const intro = kind === 'ijs' ? `${kids.join(', ').replace(/, ([^,]*)$/, ' en $1')} kiezen elk een andere smaak ijs: ${list}.` : kind === 'muziek' ? `${kids.join(', ').replace(/, ([^,]*)$/, ' en $1')} spelen elk een ander instrument: ${list}.` : `${kids.join(', ').replace(/, ([^,]*)$/, ' en $1')} doen elk een andere sport: ${list}.`;
    const clueTxt = pz.clues.map(c => neg(kids[c.i], items[c.j]));
    const target = pz.steps[pz.steps.length - 1].i, ans = items[pz.sol[target]];
    const o = textOptions(r, ans, shuffle(r, things.filter(t => t !== ans)));
    o.options.forEach(op => op.text = op.text.charAt(0).toUpperCase() + op.text.slice(1));
    const stepTxt = pz.steps.map(st => st.kind === 'persoon' ? `Voor ${kids[st.i]} blijft alleen ${items[st.j]} over.` : `${items[st.j].charAt(0).toUpperCase() + items[st.j].slice(1)} kan alleen nog bij ${kids[st.i]}.`);
    const ask = kind === 'ijs' ? `Welke smaak kiest ${kids[target]}?` : kind === 'muziek' ? `Welk instrument speelt ${kids[target]}?` : `Welke sport doet ${kids[target]}?`;
    return { text: `${intro} ${clueTxt.join(' ')} ${ask}`, svg: null, ...o,
      explain: `Maak een tabelletje en zet kruisjes bij wat niet kan. ${stepTxt.join(' ')}`, data: { n, clues: pz.clues, target, sol: pz.sol, items, ans } };
  },

  verdelen(r, band) {
    const [x, y, z] = shuffle(r, NAMEN);
    const bar = (parts, unitVal, labels) => { let b = '', yy = 6; parts.forEach((k, i) => { b += txt(36, yy + 13, labels[i], 13, C.ink, 700); for (let j = 0; j < k; j++) b += rect(74 + j * 40, yy, 40, 26, C.soft) + txt(94 + j * 40, yy + 13, unitVal, 13); yy += 34; }); return svg(74 + Math.max(...parts) * 40 + 8, yy, b, 'strookjes'); };
    if (band === 1) {
      const kids = ri(r, 3, 5), each = ri(r, 2, 6), rest = ri(r, 1, kids - 1), total = kids * each + rest;
      return { text: `${total} koekjes worden eerlijk verdeeld over ${kids} kinderen. Iedereen krijgt evenveel hele koekjes, zoveel mogelijk. Hoeveel koekjes blijven er over?`, svg: null, ...numOptions(r, rest, [each, kids - rest, rest + 1, 0], 0),
        explain: `${kids} × ${each} = ${kids * each}. Nog een rondje kan niet, want ${kids} × ${each + 1} = ${kids * (each + 1)} is te veel. Er blijven ${total} − ${kids * each} = ${rest} over.`, data: { ans: rest } };
    }
    if (band === 2) {
      const k = ri(r, 2, 4), unit = ri(r, 3, 9), total = (k + 1) * unit, ans = k * unit;
      return { text: `${x} en ${y} hebben samen ${total} knikkers. ${x} heeft er ${k} keer zoveel als ${y}. Hoeveel knikkers heeft ${x}?`, svg: null, ...numOptions(r, ans, [total / 2 | 0, unit, total - unit + 1, k * unit + unit], 1),
        explain: `Teken strookjes: ${y} heeft 1 stukje, ${x} heeft er ${k}. Samen ${k + 1} stukjes = ${total}. Eén stukje is ${total} : ${k + 1} = ${unit}. ${x} heeft ${k} × ${unit} = ${ans}.`, explainSvg: bar([1, k], unit, [y, x]), data: { ans } };
    }
    const unit = ri(r, 5, 30), total = 7 * unit, askBig = r() < .5, ans = askBig ? 4 * unit : unit;
    return { text: `Drie schapen krijgen samen ${total} gram voer. Het middelste schaap krijgt twee keer zoveel als het kleinste. Het grootste krijgt twee keer zoveel als het middelste. Hoeveel gram krijgt het ${askBig ? 'grootste' : 'kleinste'} schaap?`, svg: null, ...numOptions(r, ans, askBig ? [unit, 2 * unit, Math.round(total / 3), total / 2 | 0] : [2 * unit, 4 * unit, Math.round(total / 3), unit + 5], 1),
      explain: `Het kleinste krijgt 1 stukje, het middelste 2, het grootste 4. Samen 7 stukjes = ${total} gram. Eén stukje is ${total} : 7 = ${unit}. Het ${askBig ? 'grootste' : 'kleinste'} krijgt ${askBig ? `4 × ${unit} = ` : ''}${ans} gram.`, explainSvg: bar([1, 2, 4], unit, ['klein', 'midden', 'groot']), data: { ans } };
  },

  blokken(r, band) {
    if (band < 3) {
      const [R, K] = band === 1 ? pick(r, [[2, 2], [2, 3]]) : pick(r, [[3, 3], [3, 2]]);
      const h = staircase(r, R, K, 3, band === 1 ? 5 : 10), ans = h.flat().reduce((a, v) => a + v, 0);
      const hidden = ans - (R * K);
      return { text: `Hoeveel blokjes zijn er gebruikt? Er zweven geen blokjes: elk blokje staat op de tafel of op een ander blokje.`, svg: isoSvg(h), ...numOptions(r, ans, [ans - hidden + 1, ans - 1, ans + 2, R * K + Math.max(...h.flat())], 1),
        explain: `Tel per stapel hoe hoog die is: ${h.map(row => row.join(' + ')).join(' + ')} = ${ans}.`, data: { ans } };
    }
    const h = staircase(r, 3, 3, 3, 8), have = h.flat().reduce((a, v) => a + v, 0), ans = 27 - have;
    return { text: `Hoeveel blokjes moet je er nog bij leggen om er een grote kubus van 3 bij 3 bij 3 van te maken?`, svg: isoSvg(h), ...numOptions(r, ans, [27 - have + 1, have, 27 - have - 2, 9 - (have % 9)], 0),
      explain: `Een kubus van 3 bij 3 bij 3 heeft 3 × 3 × 3 = 27 blokjes. Nu staan er ${h.map(row => row.join(' + ')).join(' + ')} = ${have}. Er moeten er nog 27 − ${have} = ${ans} bij.`, data: { ans } };
  },

  routes(r, band) {
    let W, H, blocked = new Set();
    if (band === 1) [W, H] = pick(r, [[2, 1], [3, 1], [4, 1], [2, 2], [1, 3]]);
    else if (band === 2) [W, H] = pick(r, [[3, 2], [4, 2], [3, 3], [2, 4], [5, 2]]);
    else {
      [W, H] = pick(r, [[3, 2], [3, 3]]);
      const x = ri(r, 0, W - 1), y = ri(r, 0, H); blocked.add(`${x},${y}>${x + 1},${y}`);
    }
    const N = routesCount(W, H, blocked), ans = N[W][H], free = routesCount(W, H, new Set())[W][H];
    const who = pick(r, NAMEN);
    return { text: `${who} fietst van huis naar school. ${who} rijdt alleen naar rechts of naar boven, nooit terug.${blocked.size ? ' De straat met het kruis is afgesloten.' : ''} Hoeveel verschillende routes zijn er?`, svg: streetSvg(W, H, blocked), ...numOptions(r, ans, [W + H, W * H, free === ans ? ans + 2 : free, ans - 1], 1),
      explain: `Schrijf bij elk kruispunt hoeveel routes erheen gaan. Langs de onderkant en de linkerkant is dat steeds 1${blocked.size ? ' (behalve na de afgesloten straat)' : ''}. Bij elk ander kruispunt tel je het getal links en het getal eronder op. Bij school staat ${ans}.`, explainSvg: streetSvg(W, H, blocked, N), data: { ans, W, H, blocked: [...blocked] } };
  },

  combinaties(r, band) {
    if (band === 1) {
      const a = ri(r, 2, 4), b = ri(r, 2, 4), ans = a * b, x = pick(r, NAMEN);
      return { text: `${x} heeft ${a} shirts en ${b} broeken. Hoeveel verschillende combinaties van één shirt en één broek kan ${x} maken?`, svg: null, ...numOptions(r, ans, [a + b, ans + 1, ans - 1, a * b + a], 1),
        explain: `Bij elk shirt kun je ${b} broeken kiezen. Dat is ${a} keer ${b}: ${a} × ${b} = ${ans}.`, data: { ans } };
    }
    if (band === 2) {
      let cards, sums;
      do { cards = shuffle(r, range(9).map(i => i + 1)).slice(0, 4).sort((a, b) => a - b); sums = new Set(); for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) sums.add(cards[i] + cards[j]); } while (sums.size === 6 && r() < .7);
      const ans = sums.size, list = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) list.push(`${cards[i]}+${cards[j]}=${cards[i] + cards[j]}`);
      const draw = svg(4 * 50 + 8, 64, cards.map((c, i) => `<rect x="${6 + i * 50}" y="6" width="40" height="52" rx="7" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/>${txt(26 + i * 50, 32, c, 22)}`).join(''), 'kaartjes');
      return { text: `Je pakt twee van deze vier kaartjes en telt de getallen op. Hoeveel verschillende uitkomsten kun je krijgen?`, svg: draw, ...numOptions(r, ans, [6, 4, ans === 6 ? 5 : 8, 12], 1),
        explain: `Er zijn 6 manieren om 2 kaartjes te kiezen: ${list.join(', ')}. ${ans < 6 ? `Sommige uitkomsten komen dubbel voor. Verschillend zijn er ${ans}.` : 'Ze zijn allemaal verschillend.'}`, data: { ans } };
    }
    const n = ri(r, 4, 8), ans = n * (n - 1) / 2;
    const story = pick(r, [[`${n} kinderen houden een damtoernooi. Iedereen speelt precies één keer tegen elk ander kind.`, 'Hoeveel potjes worden er gespeeld?', `Het eerste kind speelt tegen ${n - 1} anderen. Het tweede kind nog tegen ${n - 2} nieuwe`, 'elk potje'], [`${n} kinderen komen op een feestje. Iedereen geeft iedereen precies één keer een hand.`, 'Hoeveel handen worden er geschud?', `Het eerste kind geeft ${n - 1} handen. Het tweede kind nog ${n - 2} nieuwe`, 'elke handdruk'], [`Er staan ${n} punten op een cirkel. Je tekent een lijn tussen elk tweetal punten.`, 'Hoeveel lijnen teken je?', `Vanuit het eerste punt teken je ${n - 1} lijnen. Vanuit het tweede punt nog ${n - 2} nieuwe`, 'elke lijn'], [`${n} vrienden maken van elk tweetal precies één foto samen.`, 'Hoeveel foto’s worden er gemaakt?', `De eerste vriend staat op ${n - 1} foto's met een ander. De tweede nog op ${n - 2} nieuwe`, 'elke foto']]);
    return { text: `${story[0]} ${story[1]}`, svg: null, ...numOptions(r, ans, [n * (n - 1), n * n, ans + 1, n], 1),
      explain: `${story[2]}. Zo verder: ${range(n - 1).map(i => n - 1 - i).join(' + ')} = ${ans}. (${n} × ${n - 1} = ${n * (n - 1)} telt ${story[3]} twee keer, dus de helft.)`, data: { ans } };
  }
};


// ============================================================================================
// Extra patronen: puzzelstukjes, knopen, lichtspiegels, water en automaten
// ============================================================================================
// ---- puzzelstukjes ----
const pnorm = cells => { const r0 = Math.min(...cells.map(c => c[0])), c0 = Math.min(...cells.map(c => c[1])); return cells.map(([a, b]) => [a - r0, b - c0]).sort((x, y) => x[0] - y[0] || x[1] - y[1]); };
const pkey = cells => pnorm(cells).map(c => c.join(',')).join(';');
const prot = cells => cells.map(([a, b]) => [b, -a]);
const pflip = cells => cells.map(([a, b]) => [a, -b]);
export function pieceForms(cells, rotate, mirror) {
  const out = new Set(), bases = mirror ? [cells, pflip(cells)] : [cells];
  for (const b0 of bases) { let cur = b0; for (let i = 0; i < (rotate ? 4 : 1); i++) { out.add(pkey(cur)); cur = prot(cur); } }
  return out;
}
function pconnected(cells) {
  const set = new Set(cells.map(c => c.join())), seen = new Set([cells[0].join()]), q = [cells[0]];
  while (q.length) { const [a, b] = q.pop(); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${a + dr},${b + dc}`; if (set.has(k) && !seen.has(k)) { seen.add(k); q.push([a + dr, b + dc]); } } }
  return seen.size === cells.length;
}
function growPiece(r, R, K, size) {
  for (;;) {
    const cells = [[ri(r, 0, R - 1), ri(r, 0, K - 1)]], has = k => cells.some(c => c.join() === k);
    let guard = 0;
    while (cells.length < size && guard++ < 200) { const [a, b] = pick(r, cells), [dr, dc] = pick(r, [[1, 0], [-1, 0], [0, 1], [0, -1]]), n = [a + dr, b + dc]; if (n[0] < 0 || n[1] < 0 || n[0] >= R || n[1] >= K || has(n.join())) continue; cells.push(n); }
    if (cells.length === size) return cells;
  }
}
function pieceSvg(cells, cs = 24, color = C.yellow) {
  const n = pnorm(cells), R = Math.max(...n.map(c => c[0])) + 1, K = Math.max(...n.map(c => c[1])) + 1;
  return svg(K * cs + 8, R * cs + 8, n.map(([a, b]) => rect(4 + b * cs, 4 + a * cs, cs, cs, color)).join(''), 'puzzelstukje', 'kg-piece').replace('<svg ', `<svg width="${K * cs + 8}" height="${R * cs + 8}" `);
}
function puzzelGen(r, band, big) {
  const cfg = big ? [[4, 4, 4], [4, 5, 5], [5, 5, 6]][band - 1] : [[3, 4, 3], [4, 4, 4], [4, 4, 5]][band - 1];
  const [R, K, size] = cfg, rotate = band > 1, mirror = false;
  let hole;
  for (let t = 0; t < 200; t++) {
    hole = growPiece(r, R, K, size);
    const nh = pnorm(hole); if (Math.max(...nh.map(c => c[0])) === 0 || Math.max(...nh.map(c => c[1])) === 0) continue; // geen rechte strook
    const all = pieceForms(hole, true, true);
    if (band === 3 && pieceForms(hole, true, false).size === all.size) continue; // spiegelbeeld moet anders zijn
    if (band === 1 && pieceForms(hole, true, false).size < 2) continue; // draaien moet iets veranderen
    if (all.size >= 2) break;
  }
  const holeSet = new Set(hole.map(c => c.join()));
  const ok = pieceForms(hole, rotate, mirror);
  const shown = cells => { let cur = cells; if (rotate) { const k = ri(r, 0, 3); for (let i = 0; i < k; i++) cur = prot(cur); } return pnorm(cur); };
  const mk = (cells, tag) => ({ key: pkey(cells), svg: pieceSvg(cells), cells: pnorm(cells), tag });
  const correct = mk(shown(hole), 'goed');
  const wrongs = [];
  if (band === 1) { let cur = prot(hole); for (let i = 0; i < 3; i++) { if (!ok.has(pkey(cur))) { wrongs.push(mk(cur, 'gedraaid')); break; } cur = prot(cur); } }
  if (band === 3) wrongs.push(mk(shown(pflip(hole)), 'spiegel'));
  // één hokje verplaatst
  for (let t = 0; t < 300 && wrongs.length < 8; t++) {
    const cells = hole.map(c => c.slice()), i = ri(r, 0, size - 1), [a, b] = pick(r, cells), [dr, dc] = pick(r, [[1, 0], [-1, 0], [0, 1], [0, -1]]), n = [a + dr, b + dc];
    if (cells.some(c => c.join() === n.join())) continue;
    cells[i] = n; if (!pconnected(cells)) continue;
    if ([...pieceForms(cells, rotate, mirror)].some(k => ok.has(k))) continue;
    if (wrongs.some(w => pieceForms(w.cells, rotate, mirror).has(pkey(cells)))) continue;
    wrongs.push(mk(shown(cells), 'verschoven'));
  }
  // één hokje te veel of te weinig
  const extra = hole.map(c => c.slice()); for (const [a, b] of shuffle(r, hole)) { const n = shuffle(r, [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]).find(x => !extra.some(c => c.join() === x.join())); if (n) { extra.push(n); break; } }
  wrongs.push(mk(shown(extra), 'te groot'));
  const o = picOptions(r, correct, [...wrongs.filter(w => w.tag !== 'verschoven').slice(0, 2), ...wrongs.filter(w => w.tag === 'verschoven')]);
  if (!o.complete) return puzzelGen(r, band, big);
  const cs = 30; let b = '';
  for (let a = 0; a < R; a++) for (let c = 0; c < K; c++) b += holeSet.has(`${a},${c}`) ? `<rect x="${4 + c * cs}" y="${4 + a * cs}" width="${cs}" height="${cs}" fill="${C.white}" stroke="${C.grey}" stroke-width="1.5" stroke-dasharray="4 3"/>` : rect(4 + c * cs, 4 + a * cs, cs, cs, '#b9a3ec');
  const rule = rotate ? 'Je mag het stukje draaien, maar niet omdraaien.' : 'Je mag het stukje niet draaien.';
  const opts = o.options.map((op, i) => ({ ...op, cells: [correct, ...wrongs].find(w => w.key === op.key).cells }));
  const mirrorIdx = opts.findIndex(op => [correct, ...wrongs].find(w => w.key === op.key).tag === 'spiegel');
  return { text: `In de puzzel ontbreekt één stukje (het witte gat). Welk stukje past precies? ${rule}`, svg: svg(K * cs + 8, R * cs + 8, b, 'puzzel met een gat'), ...o, options: opts,
    explain: `Tel eerst: het gat heeft ${size} hokjes. Kijk dan naar de vorm: waar zit de bocht, waar steekt een hokje uit? ${rotate ? 'Draai elk stukje in gedachten tot het past.' : 'Het stukje moet precies zo liggen als het gat.'}${mirrorIdx >= 0 ? ` Stukje ${LETTERS[mirrorIdx]} lijkt goed, maar dat is het spiegelbeeld: dat past alleen als je het omdraait.` : ''} Alleen stukje ${LETTERS[o.answer]} past.`,
    data: { hole: hole.map(c => c.slice()), rotate, mirror } };
}

// ---- knopen ----
// Een touw is een rij punten. Waar het touw zichzelf kruist, kiezen we welk stuk boven ligt.
function ropePoints(kind, r) {
  const P = [];
  if (kind === 'trefoil') {
    const f = t => [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t)];
    let tc = 0, best = -1; for (let t = 0; t < 2 * Math.PI; t += .001) { const [x, y] = f(t), d = x * x + y * y; if (d > best) { best = d; tc = t; } }
    tc += ri(r, 0, 2) * 2 * Math.PI / 3;
    const eps = .06, N = 360;
    const a = f(tc + eps), z = f(tc - eps), angA = Math.atan2(a[1], a[0]), angZ = Math.atan2(z[1], z[0]);
    let diff = angA - angZ; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
    const sgn = diff >= 0 ? 1 : -1, dA = angA + sgn * .45, dZ = angZ - sgn * .45;
    for (let i = 8; i >= 1; i--) P.push([a[0] + Math.cos(dA) * i * .18, a[1] + Math.sin(dA) * i * .18]);
    for (let i = 0; i <= N; i++) P.push(f(tc + eps + (2 * Math.PI - 2 * eps) * i / N));
    for (let i = 1; i <= 8; i++) P.push([z[0] + Math.cos(dZ) * i * .18, z[1] + Math.sin(dZ) * i * .18]);
  } else if (kind === 'curl' || kind === 'curl2') {
    const t1 = kind === 'curl' ? 4 : 4 + 2 * Math.PI;
    for (let t = -4; t <= t1; t += .03) P.push([(t - 2.1 * Math.sin(t)) * .55, -1.6 * Math.cos(t)]);
  } else { // golf: geen kruising
    for (let t = -4; t <= 4; t += .05) P.push([t * .7, Math.sin(t * 1.3) * 1.2]);
  }
  return P;
}
function crossings(P) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) for (let j = i + 3; j < P.length - 1; j++) {
    const [p, q] = [P[i], P[i + 1]], [s, t] = [P[j], P[j + 1]];
    const d = (q[0] - p[0]) * (t[1] - s[1]) - (q[1] - p[1]) * (t[0] - s[0]); if (Math.abs(d) < 1e-12) continue;
    const u = ((s[0] - p[0]) * (t[1] - s[1]) - (s[1] - p[1]) * (t[0] - s[0])) / d, v = ((s[0] - p[0]) * (q[1] - p[1]) - (s[1] - p[1]) * (q[0] - p[0])) / d;
    if (u >= 0 && u < 1 && v >= 0 && v < 1) out.push({ i, j, x: p[0] + u * (q[0] - p[0]), y: p[1] + u * (q[1] - p[1]) });
  }
  return out;
}
// Volgorde van alle kruispassages langs het touw: [kruising-index, eersteDoorgang?]
export function crossingOrder(cr) { const v = []; cr.forEach((c, k) => { v.push([c.i, k, true]); v.push([c.j, k, false]); }); return v.sort((a, b) => a[0] - b[0]).map(x => [x[1], x[2]]); }
export function isAlternating(cr, overFirst) { const seq = crossingOrder(cr).map(([k, first]) => first === overFirst[k]); return seq.every((o, i) => i === 0 || o !== seq[i - 1]); }
function ropeSvg(kind, overFirst, r, size = 150, rotSeed = 0) {
  let P = ropePoints(kind, r);
  const ang = rotSeed * 2 * Math.PI, flipX = rotSeed > .5 ? -1 : 1;
  P = P.map(([x, y]) => [flipX * (x * Math.cos(ang) - y * Math.sin(ang)), x * Math.sin(ang) + y * Math.cos(ang)]);
  const cr = crossings(P);
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]), mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys);
  const sc = (size - 24) / Math.max(mxx - mnx, mxy - mny), ox = (size - (mxx - mnx) * sc) / 2, oy = (size - (mxy - mny) * sc) / 2;
  const S = ([x, y]) => [ox + (x - mnx) * sc, oy + (y - mny) * sc];
  const path = pts => 'M' + pts.map(p => S(p).map(v => v.toFixed(1)).join(' ')).join(' L');
  const rope = d => `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${C.orange}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  let b = rope(path(P));
  cr.forEach((c, k) => {
    const at = overFirst[k] ? c.i : c.j, piece = [], len = 14 / sc;
    let acc = 0, a = at; while (a > 0 && acc < len) { acc += Math.hypot(P[a][0] - P[a - 1][0], P[a][1] - P[a - 1][1]); a--; }
    acc = 0; let z = at + 1; while (z < P.length - 1 && acc < len) { acc += Math.hypot(P[z + 1][0] - P[z][0], P[z + 1][1] - P[z][1]); z++; }
    for (let i = a; i <= z; i++) piece.push(P[i]);
    const ext = Math.max(2, Math.round((z - a) * .4)), long = P.slice(Math.max(0, a - ext), Math.min(P.length, z + ext + 1)), d = path(piece);
    b += `<path d="${d}" fill="none" class="kg-halo" style="stroke:var(--kg-bg,#fff)" stroke-width="19" stroke-linecap="butt"/><path d="${d}" fill="none" stroke="${C.ink}" stroke-width="9" stroke-linecap="butt"/><path d="${path(long)}" fill="none" stroke="${C.orange}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const [s0, s1] = [S(P[0]), S(P[P.length - 1])];
  b += `<circle cx="${s0[0]}" cy="${s0[1]}" r="5" fill="${C.ink}"/><circle cx="${s1[0]}" cy="${s1[1]}" r="5" fill="${C.ink}"/>`;
  return { svg: svg(size, size, b, 'touw', 'kg-big'), cr, n: cr.length };
}
function knoopGen(r, band) {
  const want = band === 3 ? 'los' : 'knoop'; // band 4 (alleen wizKID): echte knoop tussen vier bijna-knopen
  const allAssign = [0, 1, 2, 3, 4, 5, 6, 7].map(m => [!!(m & 1), !!(m & 2), !!(m & 4)]);
  const items = [];
  const add = (kind, assign) => {
    const seed = r(), rr = rng(Math.floor(seed * 1e9)), sv = ropeSvg(kind, assign || [true, false, true, false], rr, 150, r());
    const knotted = kind === 'trefoil' && sv.n === 3 && isAlternating(sv.cr, assign);
    items.push({ key: kind + (assign || []).join() + seed, svg: sv.svg, knotted, meta: { kind, n: sv.n, alt: kind === 'trefoil' ? isAlternating(sv.cr, assign) : null } });
  };
  // bij de trefoil is om en om (afwisselend) een echte knoop; anders glijdt het los
  const trefoilAssign = alt => { for (const a of shuffle(r, allAssign)) { const sv = ropeSvg('trefoil', a, rng(1), 150, 0); if (isAlternating(sv.cr, a) === alt) return a; } };
  if (want === 'knoop') {
    add('trefoil', trefoilAssign(true));
    const pool = band === 1 ? ['curl', 'curl2', 'golf', 'curl'] : band === 4 ? ['trefoilLos', 'trefoilLos', 'trefoilLos', 'trefoilLos'] : ['trefoilLos', 'trefoilLos', 'curl2', 'curl'];
    for (const k of pool) k === 'trefoilLos' ? add('trefoil', trefoilAssign(false)) : add(k, [r() < .5, r() < .5]);
  } else {
    add('trefoil', trefoilAssign(false));
    for (let i = 0; i < 4; i++) add('trefoil', trefoilAssign(true));
  }
  const correct = items[0], o = picOptions(r, correct, items.slice(1));
  const metas = o.options.map(op => items.find(it => it.key === op.key).meta), knots = o.options.map(op => items.find(it => it.key === op.key).knotted);
  const options = o.options.map(op => ({ svg: op.svg, key: op.key }));
  return { text: want === 'knoop' ? 'Je trekt aan de twee uiteinden van het touw (de bolletjes). Bij welk touw zit er dan een echte knoop?' : 'Je trekt aan de twee uiteinden van het touw (de bolletjes). Bij welk touw zit er dan GEEN knoop?', svg: null, options, answer: o.answer,
    explain: want === 'knoop' ? `Volg het touw met je vinger. Een lusje met één kruising glijdt er altijd uit als je trekt. Bij touw ${LETTERS[o.answer]} gaat het touw bij elke kruising om en om: boven, onder, boven, onder. Dan zit het vast: dat is een knoop.` : `Bij de knopen gaat het touw bij de drie kruisingen steeds om en om: boven, onder, boven. Bij touw ${LETTERS[o.answer]} gaat het twee keer achter elkaar boven (of onder). Dan kun je een lus eruit trekken en blijft er geen knoop over.`,
    data: { metas, knots } };
}

// ---- lichtspiegels ----
const BOUNCE = { '/': { '0,1': [-1, 0], '0,-1': [1, 0], '1,0': [0, -1], '-1,0': [0, 1] }, '\\': { '0,1': [1, 0], '0,-1': [-1, 0], '1,0': [0, 1], '-1,0': [0, -1] } };
export function shine(n, mirrors, row) { // mirrors: {"r,c": '/'|'\\'} ; straal komt links binnen op rij 'row'
  let rr = row, cc = 0, d = [0, 1], hits = 0, path = [[row, -1]];
  for (let guard = 0; guard < 200; guard++) {
    if (rr < 0) return { exit: `boven,${cc}`, hits, path: [...path, [rr, cc]] };
    if (rr >= n) return { exit: `onder,${cc}`, hits, path: [...path, [rr, cc]] };
    if (cc < 0) return { exit: `links,${rr}`, hits, path: [...path, [rr, cc]] };
    if (cc >= n) return { exit: `rechts,${rr}`, hits, path: [...path, [rr, cc]] };
    const m = mirrors[`${rr},${cc}`];
    if (m) { d = BOUNCE[m][d.join()]; hits++; path.push([rr, cc]); }
    rr += d[0]; cc += d[1];
  }
  return { exit: 'lus', hits, path };
}
function spiegelGen(r, band) {
  const [n, mm, minHits] = [[3, 2, 1], [4, 4, 2], [5, 6, 3]][band - 1];
  let mirrors, row, res;
  for (let t = 0; t < 500; t++) {
    mirrors = {}; for (const i of shuffle(r, range(n * n)).slice(0, mm)) mirrors[`${Math.floor(i / n)},${i % n}`] = r() < .5 ? '/' : '\\';
    row = ri(r, 0, n - 1); res = shine(n, mirrors, row);
    if (res.exit !== 'lus' && res.hits >= minHits && res.exit !== `links,${row}`) break;
  }
  const exits = [];
  for (let i = 0; i < n; i++) { exits.push(`boven,${i}`, `onder,${i}`, `rechts,${i}`); if (i !== row) exits.push(`links,${i}`); }
  const mistakes = [];
  for (const k of Object.keys(mirrors)) { const m2 = { ...mirrors }; delete m2[k]; mistakes.push(shine(n, m2, row).exit); const m3 = { ...mirrors, [k]: mirrors[k] === '/' ? '\\' : '/' }; mistakes.push(shine(n, m3, row).exit); }
  mistakes.push(`rechts,${row}`);
  const chosen = [res.exit];
  for (const e of [...shuffle(r, mistakes), ...shuffle(r, exits)]) if (e !== 'lus' && exits.includes(e) && !chosen.includes(e) && chosen.length < 5) chosen.push(e);
  const syms = shuffle(r, ['★', '●', '▲', '■', '♥']), label = {}; chosen.forEach((e, i) => label[e] = syms[i]);
  const cs = 44, off = 34, W = n * cs + 2 * off, pos = e => { const [side, i] = e.split(','); const k = +i; return side === 'boven' ? [off + k * cs + cs / 2, off - 16] : side === 'onder' ? [off + k * cs + cs / 2, off + n * cs + 16] : side === 'links' ? [off - 16, off + k * cs + cs / 2] : [off + n * cs + 16, off + k * cs + cs / 2]; };
  const draw = withPath => {
    let b = '';
    for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) b += rect(off + c * cs, off + a * cs, cs, cs, C.soft, C.line);
    for (const [k, m] of Object.entries(mirrors)) { const [a, c] = k.split(',').map(Number), x = off + c * cs, y = off + a * cs; b += m === '/' ? `<line x1="${x + 6}" y1="${y + cs - 6}" x2="${x + cs - 6}" y2="${y + 6}" stroke="${C.blue}" stroke-width="6" stroke-linecap="round"/>` : `<line x1="${x + 6}" y1="${y + 6}" x2="${x + cs - 6}" y2="${y + cs - 6}" stroke="${C.blue}" stroke-width="6" stroke-linecap="round"/>`; }
    b += `<path d="M${off - 30} ${off + row * cs + cs / 2} l18 0" stroke="${C.red}" stroke-width="4"/><polygon points="${off - 12},${off + row * cs + cs / 2 - 6} ${off - 2},${off + row * cs + cs / 2} ${off - 12},${off + row * cs + cs / 2 + 6}" fill="${C.red}"/>`;
    for (const e of chosen) { const [x, y] = pos(e); b += txt(x, y, label[e], 18, C.purple); }
    if (withPath) { const pts = res.path.map(([a, c]) => [off + c * cs + cs / 2, off + a * cs + cs / 2]); b += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${C.red}" stroke-width="3" stroke-dasharray="6 4"/>`; }
    return svg(W, W, b, 'spiegels en een lichtstraal');
  };
  const ans = label[res.exit], o = textOptions(r, ans, chosen.slice(1).map(e => label[e]));
  return { text: `Een lichtstraal komt van links binnen (de rode pijl). Elke spiegel stuurt de straal een kwartslag de andere kant op. Bij welk teken komt de straal naar buiten?`, svg: draw(false), ...o,
    explain: `Volg de straal hokje voor hokje. Bij een spiegel / gaat een straal die naar rechts gaat omhoog, bij een spiegel \\ omlaag. De straal raakt ${res.hits} ${res.hits === 1 ? 'spiegel' : 'spiegels'} en komt naar buiten bij ${ans}.`, explainSvg: draw(true),
    data: { n, mirrors, row, label } };
}

// ---- water en knikkers ----
function glassesSvg(glasses, showBalls) { // glasses: [{w, small, big}] in eenheden; 10 eenheden hoog
  const gw = 46, gh = 150, u = gh / 10, gap = 18; let b = '';
  glasses.forEach((g, i) => {
    const x = 10 + i * (gw + gap), y = 14, lvl = showBalls ? g.w + g.small + 2 * g.big : g.w;
    b += `<rect x="${x}" y="${y + gh - lvl * u}" width="${gw}" height="${lvl * u}" fill="#bfe0f7"/>`;
    if (showBalls) { let bx = 0, by = 0; const balls = [...Array(g.big).fill(2), ...Array(g.small).fill(1)]; balls.forEach(s => { const rad = s === 2 ? 10 : 6.5; b += `<circle cx="${x + 12 + (bx % 3) * 11}" cy="${y + gh - 8 - by * 14}" r="${rad}" fill="${s === 2 ? C.purple : C.pink}" stroke="${C.ink}" stroke-width="1.5"/>`; bx++; if (bx % 3 === 0) by++; }); }
    for (let k = 1; k < 10; k++) b += `<line x1="${x}" x2="${x + 7}" y1="${y + gh - k * u}" y2="${y + gh - k * u}" stroke="${C.ink}" stroke-width="1.2"/>`;
    b += `<path d="M${x} ${y} L${x} ${y + gh} L${x + gw} ${y + gh} L${x + gw} ${y}" fill="none" stroke="${C.ink}" stroke-width="3"/>` + txt(x + gw / 2, y + gh + 16, i + 1, 15);
    if (!showBalls) { const balls = [...Array(g.big).fill(2), ...Array(g.small).fill(1)]; balls.forEach((s, k) => { b += `<circle cx="${x + 8 + (k % 3) * 15}" cy="${y + gh + 34 + Math.floor(k / 3) * 18}" r="${s === 2 ? 8 : 5}" fill="${s === 2 ? C.purple : C.pink}" stroke="${C.ink}" stroke-width="1.5"/>`; }); }
  });
  return svg(10 + glasses.length * (gw + gap), showBalls ? 200 : 240, b, 'glazen met water');
}
function waterGen(r, band) {
  for (let t = 0; t < 400; t++) {
    const g = range(5).map(() => band === 1 ? { w: 4, small: ri(r, 0, 4), big: 0 } : band === 2 ? { w: ri(r, 2, 5), small: ri(r, 0, 3), big: ri(r, 0, 1) } : { w: ri(r, 2, 5), small: ri(r, 0, 3), big: ri(r, 0, 1) });
    const after = g.map(x => x.w + x.small + 2 * x.big);
    if (Math.max(...after) > 9) continue;
    if (band < 3) {
      const mx = Math.max(...after); if (after.filter(v => v === mx).length !== 1) continue;
      if (band === 2) { const mostBalls = g.map(x => x.small + x.big), naive = mostBalls.indexOf(Math.max(...mostBalls)); if (naive === after.indexOf(mx) && r() < .7) continue; }
      const ans = after.indexOf(mx);
      return { text: band === 1 ? 'In alle glazen zit evenveel water. Onder elk glas liggen knikkers. Je doet de knikkers in het glas. In welk glas staat het water dan het hoogst?' : 'Onder elk glas liggen de knikkers die erin gaan. Een grote knikker duwt het water twee keer zo hoog op als een kleine. In welk glas staat het water het hoogst als alle knikkers erin liggen?',
        svg: glassesSvg(g, false), options: range(5).map(i => ({ text: `glas ${i + 1}` })), answer: ans,
        explain: band === 1 ? `Elke knikker duwt het water een stukje omhoog. Er zit overal evenveel water in, dus het glas met de meeste knikkers wint: glas ${ans + 1}.` : `Tel de streepjes. Per glas: water + kleine knikkers + 2 × grote knikkers. ${g.map((x, i) => `Glas ${i + 1}: ${x.w} + ${x.small} + ${2 * x.big} = ${after[i]}`).join('. ')}. Het hoogst is glas ${ans + 1}.`,
        data: { glasses: g, ask: 'max-after' } };
    }
    const water = g.map(x => x.w), mn = Math.min(...water); if (water.filter(v => v === mn).length !== 1) continue;
    const shown = after, naive = shown.indexOf(Math.min(...shown)); if (naive === water.indexOf(mn)) continue;
    const ans = water.indexOf(mn);
    return { text: 'In de glazen liggen knikkers in het water. Een grote knikker neemt twee keer zoveel plek in als een kleine. Je haalt alle knikkers eruit. In welk glas staat het water dan het laagst?', svg: glassesSvg(g, true), options: range(5).map(i => ({ text: `glas ${i + 1}` })), answer: ans,
      explain: `Tel de streepjes tot het water. Haal per glas de knikkers eraf: hoogte min kleine knikkers min 2 × grote. ${g.map((x, i) => `Glas ${i + 1}: ${shown[i]} − ${x.small} − ${2 * x.big} = ${x.w}`).join('. ')}. Het laagst is glas ${ans + 1}, ook al leek een ander glas eerst lager.`,
      data: { glasses: g, ask: 'min-water' } };
  }
}

// ---- automaten ----
function machineSvg(rule, input) {
  const lines = Array.isArray(rule) ? rule : [rule], top = 66 - (lines.length - 1) * 10;
  return svg(320, 110, `<rect x="80" y="10" width="160" height="90" rx="14" fill="${C.soft}" stroke="${C.ink}" stroke-width="3"/><circle cx="104" cy="28" r="5" fill="${C.yellow}" stroke="${C.ink}"/><circle cx="122" cy="28" r="5" fill="${C.green}" stroke="${C.ink}"/>${lines.map((l, i) => txt(160, top + i * 22, l, 15, C.purple)).join('')}
  ${txt(32, 56, input, 22)}<path d="M50 56 L76 56" stroke="${C.ink}" stroke-width="3"/><polygon points="70,50 80,56 70,62" fill="${C.ink}"/><path d="M242 56 L272 56" stroke="${C.ink}" stroke-width="3"/><polygon points="266,50 276,56 266,62" fill="${C.ink}"/>${txt(296, 56, '?', 22)}`, 'rekenautomaat');
}
function automaatGen(r, band) {
  if (band === 1) {
    const a = ri(r, 2, 6), x = ri(r, 1, 9), times = 2, ans = x + a * times;
    return { text: `De automaat doet er altijd ${a} bij. Je stopt het getal ${x} erin. Wat eruit komt, stop je er nog een keer in. Welk getal komt er dan uit?`, svg: machineSvg(`+ ${a}`, x), ...numOptions(r, ans, [x + a, ans + a, ans - 1, x + 2], 0),
      explain: `Eerste keer: ${x} + ${a} = ${x + a}. Tweede keer: ${x + a} + ${a} = ${ans}.`, data: { ans } };
  }
  if (band === 2) {
    const x = ri(r, 11, 40), steps = 3, seq = [x]; for (let i = 0; i < steps; i++) { const v = seq[seq.length - 1]; seq.push(v % 2 ? v + 1 : v / 2); }
    const ans = seq[steps], more = seq[steps] % 2 ? seq[steps] + 1 : seq[steps] / 2;
    return { text: `Deze automaat kijkt naar het getal. Is het even? Dan komt de helft eruit. Is het oneven? Dan komt het getal plus 1 eruit. Je stopt ${x} erin, en wat eruit komt stop je er weer in. Dat doe je 3 keer. Welk getal komt er de derde keer uit?`, svg: machineSvg(['even: de helft', 'oneven: + 1'], x), ...numOptions(r, ans, [seq[2], more, seq[1], ans + 2], 0),
      explain: `Stap voor stap: ${seq.map((v, i) => i ? `${seq[i - 1]} is ${seq[i - 1] % 2 ? 'oneven, dus +1' : 'even, dus de helft'}: ${v}` : '').filter(Boolean).join('. ')}.`, data: { ans } };
  }
  const k = ri(r, 2, 3), m = pick(r, [3, 4, 5].filter(v => v % k !== 0)), g = ri(r, 2, 4);
  if (r() < .5) {
    const ans = Math.ceil(g * m / k);
    return { text: `Bij de snoepautomaat kun je ruilen. Voor 1 rode munt krijg je ${k} blauwe munten. Voor ${m} blauwe munten krijg je 1 snoepje. Hoeveel rode munten heb je minstens nodig voor ${g} snoepjes?`, svg: null, ...numOptions(r, ans, [g * m, Math.floor(g * m / k), g * k, ans + 1], 1),
      explain: `Voor ${g} snoepjes heb je ${g} × ${m} = ${g * m} blauwe munten nodig. Eén rode munt geeft ${k} blauwe. ${ans - 1} rode munten geven ${(ans - 1) * k} blauwe: te weinig. ${ans} rode munten geven ${ans * k}: genoeg. Dus ${ans}.`, data: { ans } };
  }
  const red = ri(r, 3, 9), ans = Math.floor(red * k / m);
  return { text: `Bij de snoepautomaat kun je ruilen. Voor 1 rode munt krijg je ${k} blauwe munten. Voor ${m} blauwe munten krijg je 1 snoepje. Je hebt ${red} rode munten. Hoeveel snoepjes kun je hoogstens krijgen?`, svg: null, ...numOptions(r, ans, [red * k, ans + 1, Math.round(red * k / m), red], 0),
    explain: `${red} rode munten worden ${red} × ${k} = ${red * k} blauwe. Elke ${m} blauwe geven een snoepje: ${ans} × ${m} = ${ans * m}, ${red * k - ans * m ? `en dan blijven er ${red * k - ans * m} over. Dat is niet genoeg voor nog een snoepje` : 'en er blijft niets over'}. Dus ${ans}.`, data: { ans } };
}

Object.assign(FUN, { puzzel: (r, b) => puzzelGen(r, b, false), knopen: knoopGen, automaat: automaatGen });
Object.assign(KID, { puzzel: (r, b) => puzzelGen(r, b, true), knopen: (r, b) => knoopGen(r, b + 1), spiegels: spiegelGen, water: waterGen });

// ---------- taxonomie ----------
// Elk patroon: naam voor het kind, korte uitleg voor ouders, en waar het in het archief voorkomt.
export const LEVELS = {
  fun: { name: 'wizFUN', groups: 'groep 3 en 4', gens: FUN, patterns: [
    ['tellen', 'Tellen in een figuur', 'Hokjes, vierkanten en driehoeken tellen, ook de grote die uit stukjes bestaan.'],
    ['spiegel', 'Spiegelen en stempelen', 'Wat een stempel of spiegel met een tekening doet: links wordt rechts.'],
    ['draaien', 'Draaien', 'Een kaartje een kwartslag of halve slag draaien en het resultaat herkennen.'],
    ['patroon', 'Patronen', 'Een herhalend patroon doortrekken en tellen tot een ver nummer.'],
    ['weegschaal', 'Weegschalen', 'Een onbekend gewicht vinden met een weegschaal in evenwicht.'],
    ['rij', 'Rijen en volgorde', 'Plaatsen in een rij en volgorde uit aanwijzingen.'],
    ['verhaal', 'Rekenverhalen', 'Korte verhaaltjes met plus, min, helft, leeftijden en poten.'],
    ['route', 'Routes', 'De goedkoopste weg door een rooster vinden.'],
    ['logica', 'Wie heeft wat?', 'Wegstrepen met aanwijzingen tot er één mogelijkheid over is.'],
    ['blokken', 'Blokken en aanzichten', 'Blokjes tellen in een bouwwerk en zien hoe het er van voren uitziet.'],
    ['puzzel', 'Puzzelstukjes', 'Welk stukje past precies in het gat, met of zonder draaien.'],
    ['knopen', 'Touwen en knopen', 'Zien of een touw een echte knoop wordt als je trekt.'],
    ['automaat', 'Automaten', 'Een machine met een regel: stap voor stap bijhouden wat eruit komt.']
  ] },
  kid: { name: 'wizKID', groups: 'groep 5 en 6', gens: KID, patterns: [
    ['vouwen', 'Vouwen en knippen', 'Papier vouwen, gaatjes prikken en openvouwen: spiegelen over vouwlijnen.'],
    ['dobbelsteen', 'Dobbelstenen en uitslagen', 'Welke vlakken tegenover elkaar komen als je een uitslag vouwt.'],
    ['symbolen', 'Tekensommen', 'Tekens die voor getallen staan, uit een paar sommen afleiden.'],
    ['piramide', 'Getallenmuren', 'Elk blok is de som van de twee eronder; ook terugrekenen.'],
    ['kalender', 'Kalender en ritme', 'Weekdagen verder tellen en ritmes die samenvallen.'],
    ['logica', 'Logisch puzzelen', 'Wie kiest wat: wegstrepen in een tabel.'],
    ['verdelen', 'Eerlijk verdelen', 'Delen met rest en verdelen in stukjes (strookjesmodel).'],
    ['blokken', 'Blokken bouwen', 'Blokjes tellen, ook de verborgen, en aanvullen tot een kubus.'],
    ['routes', 'Routes tellen', 'Hoeveel wegen er zijn door een stratenplan.'],
    ['combinaties', 'Combinaties', 'Alle mogelijkheden tellen zonder er een te vergeten of dubbel te tellen.'],
    ['puzzel', 'Puzzelstukjes', 'Welk stukje past in het gat; draaien mag, omdraaien niet.'],
    ['knopen', 'Touwen en knopen', 'Over en onder volgen: welk touw wordt een echte knoop?'],
    ['spiegels', 'Lichtspiegels', 'Een lichtstraal volgen langs schuine spiegels.'],
    ['water', 'Water en knikkers', 'Hoe hoog het water komt met en zonder knikkers.']
  ] }
};
export const levelFor = groep => groep <= 4 ? 'fun' : 'kid';
export const patternIds = lvl => LEVELS[lvl].patterns.map(p => p[0]);
export const patternName = (lvl, id) => (LEVELS[lvl].patterns.find(p => p[0] === id) || [id, id])[1];
export const POINTS = { 1: 3, 2: 4, 3: 5 };

// Eén opgave maken. Deterministisch voor (niveau, patroon, band, seed).
export function makeItem(lvl, pattern, band, seed) {
  const gen = LEVELS[lvl].gens[pattern]; if (!gen) throw new Error('onbekend patroon ' + pattern);
  const r = rng(seed * 2654435761 + band * 97 + pattern.length * 31);
  const it = gen(r, band);
  return { level: lvl, pattern, band, seed, points: POINTS[band], ...it };
}

// ============================================================================================
// Adaptief model per kind en per patroon
// ============================================================================================
// Kans op goed bij band b: gok 1/5 plus de rest via een logistische curve.
const GUESS = .2, SLOPE = 1.4;
const sig = x => 1 / (1 + Math.exp(-x));
export const pCorrect = (th, band) => GUESS + (1 - GUESS) * sig(SLOPE * (th - band));
// Beheersing: kans dat het kind een middelzware opgave (band 2) echt snapt, zonder gokken.
export const mastery = s => Math.round(100 * sig(SLOPE * ((s ? s.th : 1.5) - 2)));
export const dayIndex = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 864e5);
/* Puzzelniveau 1 t/m 5 over alle puzzelsoorten van een niveau: zo ziet het kind hoe ver het is. */
export const RANKS = ['Kangoeroekindje', 'Huppelaar', 'Springer', 'Verspringer', 'Kampioen'];
export function puzzleLevel(k, lvl) {
  lvl = lvl || (k && k.level) || 'fun';
  const L = LEVELS[lvl], sk = ((k && k.skill) || {})[lvl] || {}, ids = L.patterns.map(x => x[0]);
  const avg = ids.reduce((a, id) => a + (sk[id] && sk[id].n ? mastery(sk[id]) : 0), 0) / ids.length;
  const n = Math.min(5, 1 + Math.floor(avg / 20));
  return { n, name: RANKS[n - 1], pct: Math.round(avg), level: lvl, levelName: L.name };
}
export function freshKanga(groep) { return { level: levelFor(groep), skill: {}, hist: {}, contests: [], seed: Math.floor(Math.random() * 1e9), served: 0, last: [] }; }
export function update(k, lvl, pattern, band, ok, weight = 1) {
  const sk = k.skill[lvl] ||= {}, s = sk[pattern] ||= { th: 1.5, n: 0, ok: 0 };
  const p = pCorrect(s.th, band), K = Math.max(.3, 1.3 / Math.sqrt(1 + s.n)) * weight;
  s.th = Math.max(-1, Math.min(5, s.th + K * ((ok ? 1 : 0) - p) * 1.6));
  s.n++; s.ok += ok ? 1 : 0;
  const h = (k.hist[lvl] ||= {})[pattern] ||= [], d = dayIndex(), m = mastery(s);
  if (h.length && h[h.length - 1][0] === d) h[h.length - 1][1] = m; else h.push([d, m]);
  if (h.length > 180) h.splice(0, h.length - 180);
  return s;
}
// Volgende oefenopgave: het zwakste patroon (nieuwe patronen eerst), niet twee keer hetzelfde achter elkaar.
export function nextPractice(k, lvl, r = Math.random) {
  const ids = patternIds(lvl), sk = k.skill[lvl] || {};
  const recent = (k.last || []).slice(-2);
  const scored = ids.map(id => { const s = sk[id]; const unseen = !s || s.n < 2; return { id, score: (unseen ? -100 : mastery(s)) + r() * 8 + (recent.includes(id) ? 60 : 0) }; }).sort((a, b) => a.score - b.score);
  const pattern = scored[0].id, s = sk[pattern] || { th: 1.5 };
  // band waarbij de kans op goed het dichtst bij 70% ligt
  const band = [1, 2, 3].map(b => ({ b, d: Math.abs(pCorrect(s.th, b) - .7) })).sort((a, b) => a.d - b.d)[0].b;
  k.served = (k.served || 0) + 1; k.last = [...recent, pattern].slice(-3);
  return makeItem(lvl, pattern, band, (k.seed + k.served * 7919) >>> 0);
}

// ============================================================================================
// Wedstrijd
// ============================================================================================
export function contestFormat(lvl, groep) {
  if (lvl === 'fun' && groep <= 3) return { n: 12, minutes: 30, label: 'wizFUN groep 3' };
  if (lvl === 'fun') return { n: 24, minutes: 60, label: 'wizFUN groep 4' };
  return { n: 24, minutes: 50, label: 'wizKID' };
}
// Een blad: oplopend in moeilijkheid (eerste derde band 1, dan 2, dan 3), patronen eerlijk verdeeld.
export function makePaper(lvl, groep, seed) {
  const f = contestFormat(lvl, groep), r = rng(seed), ids = patternIds(lvl), per = f.n / 3, items = [];
  let pool = [];
  for (const band of [1, 2, 3]) for (let i = 0; i < per; i++) {
    if (!pool.length) pool = shuffle(r, ids);
    items.push(makeItem(lvl, pool.pop(), band, Math.floor(r() * 1e9)));
  }
  return { ...f, level: lvl, seed, items };
}
// scoring: 'kangoeroe' = start met n punten, goed 3/4/5, fout −¼, overslaan 0.
//          'w4' = reglement W4Kangoeroe: goed 5, 'weet niet' 1, fout 0.
export function scorePaper(paper, answers, scoring = 'kangoeroe') {
  const per = {}; let total = scoring === 'kangoeroe' ? paper.items.length : 0, max = total;
  paper.items.forEach((it, i) => {
    const a = answers[i], ok = a === it.answer, skip = a === null || a === undefined;
    const P = per[it.pattern] ||= { got: 0, max: 0, ok: 0, wrong: 0, skip: 0, items: [] };
    const val = scoring === 'kangoeroe' ? it.points : 5;
    const got = skip ? (scoring === 'w4' ? 1 : 0) : ok ? val : (scoring === 'kangoeroe' ? -val / 4 : 0);
    P.got += got; P.max += val; P[skip ? 'skip' : ok ? 'ok' : 'wrong']++; P.items.push(i);
    total += got; max += val;
  });
  return { per, total, max };
}

// ---------- opslag schoonhouden ----------
export function cleanKanga(raw, groep) {
  const k = freshKanga(groep);
  if (!raw || typeof raw !== 'object') return k;
  if (raw.level === 'fun' || raw.level === 'kid') k.level = raw.level;
  if (Number.isInteger(raw.seed)) k.seed = raw.seed;
  if (Number.isInteger(raw.served) && raw.served >= 0) k.served = raw.served;
  for (const lvl of ['fun', 'kid']) {
    const ids = patternIds(lvl);
    for (const id of ids) {
      const s = raw.skill?.[lvl]?.[id];
      if (s && Number.isFinite(s.th) && Number.isInteger(s.n) && Number.isInteger(s.ok)) (k.skill[lvl] ||= {})[id] = { th: Math.max(-1, Math.min(5, s.th)), n: Math.max(0, s.n), ok: Math.max(0, Math.min(s.n, s.ok)) };
      const h = raw.hist?.[lvl]?.[id];
      if (Array.isArray(h)) (k.hist[lvl] ||= {})[id] = h.filter(x => Array.isArray(x) && Number.isInteger(x[0]) && Number.isFinite(x[1])).slice(-180);
    }
  }
  if (Array.isArray(raw.contests)) k.contests = raw.contests.filter(c => c && typeof c === 'object' && Number.isFinite(c.total)).slice(-30);
  if (Array.isArray(raw.last)) k.last = raw.last.filter(x => typeof x === 'string').slice(-3);
  return k;
}
