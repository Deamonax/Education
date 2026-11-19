/* RekenRijk puzzels: opdrachten waarbij het kind zelf het antwoord maakt.
   Niveau = stap 1 t/m 12: twee stappen per groep (begin en eind), van groep 3 tot groep 8.
   Leerlijn volgens de SLO-tussendoelen rekenen-wiskunde en de conceptkerndoelen 2025.
   Generators zijn puur (alleen r() voor toeval) zodat ze te testen zijn. */

export const MIN = '−';
export const MAX_STEP = 12;
const ri = (a, b, r) => a + Math.floor(r() * (b - a + 1));
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (arr, n, r) => shuffle(arr, r).slice(0, n);
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const NAMES = ['Sam', 'Noor', 'Daan', 'Lotte', 'Milan', 'Sara', 'Finn', 'Yara', 'Bram', 'Lina', 'Mees', 'Zoë'];
const lv = l => Math.max(1, Math.min(MAX_STEP, Math.round(l) || 1));
const q3 = x => Math.round(x * 1000) / 1000;
/* Nederlandse notatie: komma voor decimalen, punt als duizendtal-scheiding vanaf 10.000 */
export function fmtN(n) {
  if (typeof n !== 'number' || !isFinite(n)) return String(n);
  const neg = n < 0; n = Math.abs(q3(n));
  let [i, d] = String(n).split('.');
  if (i.length >= 5) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? MIN : '') + i + (d ? ',' + d : '');
}
const typed = n => String(q3(n)).replace('.', ',').replace('-', MIN);
export const euro = c => '€ ' + fmtN(Math.floor(c / 100)) + (c % 100 ? ',' + String(c % 100).padStart(2, '0') : '');
const euroSpoken = c => `${Math.floor(c / 100)} euro${c % 100 ? ' ' + (c % 100) : ''}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const F = fmtN;

/* ---------- Nederlandse kloktijden ---------- */
const nextH = h => h % 12 + 1;
const hm = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
export function timeWords(h, m) {
  const n = nextH(h);
  switch (m) {
    case 0: return `${h} uur`;
    case 5: case 10: return `${m} over ${h}`;
    case 15: return `kwart over ${h}`;
    case 20: return `10 voor half ${n}`;
    case 25: return `5 voor half ${n}`;
    case 30: return `half ${n}`;
    case 35: return `5 over half ${n}`;
    case 40: return `10 over half ${n}`;
    case 45: return `kwart voor ${n}`;
    case 50: return `10 voor ${n}`;
    case 55: return `5 voor ${n}`;
  }
  return hm(h, m);
}

/* ---------- oplossers ---------- */
function wallSolvable(n, known) {
  const K = new Set(known); let changed = true;
  while (changed) {
    changed = false;
    for (let k = 1; k < n; k++) for (let j = 0; j < n - k; j++) {
      const t = `${k}_${j}`, a = `${k - 1}_${j}`, b = `${k - 1}_${j + 1}`;
      if ([K.has(t), K.has(a), K.has(b)].filter(Boolean).length === 2) { K.add(t); K.add(a); K.add(b); changed = true; }
    }
  }
  return K.size === n * (n + 1) / 2;
}
function linesSolvable(lines, known, total) {
  const K = new Set(known); let changed = true;
  while (changed) { changed = false; for (const L of lines) { const miss = L.filter(i => !K.has(i)); if (miss.length === 1) { K.add(miss[0]); changed = true; } } }
  return K.size === total;
}
export function sudokuCount(grid, n, bh, bw, limit = 2) {
  const g = grid.slice(); let count = 0;
  const ok = (i, v) => { const r = Math.floor(i / n), c = i % n; for (let k = 0; k < n; k++) { if (g[r * n + k] === v || g[k * n + c] === v) return false; } const br = r - r % bh, bc = c - c % bw; for (let a = 0; a < bh; a++) for (let b = 0; b < bw; b++) if (g[(br + a) * n + bc + b] === v) return false; return true; };
  const go = () => { const i = g.indexOf(0); if (i < 0) { count++; return; } for (let v = 1; v <= n && count < limit; v++) if (ok(i, v)) { g[i] = v; go(); g[i] = 0; } };
  go(); return count;
}

/* ================= GENERATORS (bestaande soorten, doorgetrokken tot stap 12) ================= */
const G = {};

G.sum = (L, r, o = {}) => {
  let a, b, S = 1;
  if (L === 1) { a = ri(1, 8, r); b = ri(1, 10 - a, r); }
  else if (L === 2) { a = ri(3, 15, r); b = ri(2, Math.min(20 - a, 9), r); }
  else if (L === 3) { a = ri(12, 41, r); b = r() < .5 ? ri(2, 9, r) : 10 * ri(1, Math.max(1, Math.floor((50 - a) / 10)), r); }
  else if (L === 4) { a = ri(13, 79, r); b = ri(11, 99 - a, r); }
  else if (L === 5) { a = 10 * ri(10, 39, r) + (r() < .5 ? 0 : ri(1, 9, r)); b = 10 * ri(2, Math.floor((499 - a) / 10), r); }
  else if (L === 6) { a = ri(120, 780, r); b = ri(35, 999 - a, r); }
  else if (L === 7) { a = 100 * ri(10, 85, r); b = 100 * ri(2, Math.min(25, 98 - a / 100), r); }
  else if (L === 8) { a = ri(1000, 7999, r); b = ri(150, 9999 - a, r); }
  else if (L === 9) { a = 1000 * ri(10, 85, r); b = 1000 * ri(2, Math.min(40, 98 - a / 1000), r) + (r() < .3 ? 100 * ri(1, 9, r) : 0); }
  else if (L === 10) { S = 100; a = 5 * ri(24, 960, r); b = 5 * ri(3, 500, r); }
  else if (L === 11) { S = 1000; a = 100 * ri(11, 95, r); b = 5 * ri(21, 999, r); }
  else { a = ri(120000, 780000, r); b = ri(15000, 199999, r); }
  const c = a + b, A = a / S, B = b / S, C = c / S;
  const kinds = L === 1 ? ['plus', 'minus'] : ['plus', 'minus', 'plus', 'minus', 'missPlus', 'missMinus'];
  const t = o.type === 'plus' ? (L > 1 && r() < .3 ? 'missPlus' : 'plus') : o.type === 'minus' ? (L > 1 && r() < .3 ? 'missMinus' : 'minus') : pick(kinds, r);
  const X = { cell: 'x' }, dec = S > 1;
  const big = c > 100;
  const hp = dec ? 'Zet de komma\'s onder elkaar. Reken eerst met de hele getallen, dan met wat achter de komma staat.' : `Splits ${F(B)} in handige stukken${big ? ' (eerst de grote, dan de kleine)' : ''} en reken stap voor stap.`;
  let tokens, ans, spoken, hint, expl;
  if (t === 'plus') { tokens = [A, '+', B, '=', X]; ans = C; spoken = `Hoeveel is ${F(A)} plus ${F(B)}?`; hint = c <= 100 && !dec ? `Begin bij ${a} en tel er ${b} bij.${a % 10 && b >= 10 - a % 10 ? ` Spring eerst naar ${Math.ceil(a / 10) * 10}.` : ''}` : hp; expl = `${F(A)} + ${F(B)} = ${F(C)}.`; }
  else if (t === 'minus') { tokens = [C, MIN, B, '=', X]; ans = A; spoken = `Hoeveel is ${F(C)} min ${F(B)}?`; hint = c <= 100 && !dec ? `Begin bij ${c} en haal er ${b} af.${b >= 10 && b % 10 ? ` Eerst ${b - b % 10}, dan ${b % 10}.` : ''}` : hp; expl = `${F(C)} ${MIN} ${F(B)} = ${F(A)}.`; }
  else if (t === 'missPlus') { tokens = [A, '+', X, '=', C]; ans = B; spoken = `${F(A)} plus hoeveel is ${F(C)}?`; hint = `Tel door van ${F(A)} naar ${F(C)}. Of reken ${F(C)} ${MIN} ${F(A)}.`; expl = `${F(A)} + ${F(B)} = ${F(C)}.`; }
  else { tokens = [C, MIN, X, '=', A]; ans = B; spoken = `${F(C)} min hoeveel is ${F(A)}?`; hint = `Hoeveel zit er tussen ${F(A)} en ${F(C)}? Tel door van ${F(A)} naar ${F(C)}.`; expl = `${F(C)} ${MIN} ${F(B)} = ${F(A)}.`; }
  return { kind: 'sum', title: t.startsWith('miss') ? 'Welk getal mist er?' : 'Reken uit', tokens, dec, cells: [{ id: 'x', answer: q3(ans) }], spoken, hint, explanation: expl, hintVisual: c <= 20 && !t.startsWith('miss') ? { dots: [t === 'minus' ? c : a, b, t === 'minus'] } : null, key: tokens.map(x => x.cell ? '_' : x).join(' ') };
};

G.house = (L, r, o = {}) => {
  let R, st = 1, S = 1;
  if (L === 1) R = ri(5, 10, r);
  else if (L === 2) R = ri(11, 20, r);
  else if (L === 3) { R = r() < .5 ? 10 * ri(3, 10, r) : ri(21, 50, r); if (R % 10 === 0 && r() < .7) st = 10; }
  else if (L === 4) { R = r() < .35 ? 100 : ri(51, 99, r); if (R === 100 && r() < .5) st = 10; }
  else if (L === 5) { R = 10 * ri(10, 50, r); st = 10; }
  else if (L === 6) { R = r() < .35 ? 1000 : 10 * ri(51, 99, r); st = 10; }
  else if (L === 7) { R = 1000; st = pick([5, 10, 25], r); }
  else if (L === 8) { R = 10000; st = pick([50, 100, 250], r); }
  else if (L === 9) { S = 10; if (r() < .5) { R = 10; st = 1; } else { R = 100; st = 5; } }
  else { S = 100; if (r() < .5) { R = 100; st = 5; } else { R = 10000; st = 50; } }
  const n = o.quick ? 1 : 4;
  const opts = []; for (let v = 0; v <= R; v += st) if (L === 1 || (v > 0 && v < R)) opts.push(v);
  const lefts = sample(opts, n, r);
  const rooms = lefts.map((a, i) => ({ a: a / S, b: (R - a) / S, hide: r() < .5 ? 'a' : 'b', id: 'h' + i }));
  const first = rooms[0], known = first.hide === 'a' ? first.b : first.a, RR = R / S;
  return { kind: 'house', title: 'Vul het splitshuis in', roof: RR, rooms, dec: S > 1, cells: rooms.map(m => ({ id: m.id, answer: q3(m.hide === 'a' ? m.a : m.b) })),
    spoken: `Splitshuis. Het dak is ${F(RR)}. In elke kamer zijn de twee getallen samen ${F(RR)}. Vul de lege vakjes in.`,
    hint: `Het dak is ${F(RR)}. Staat er ${F(known)} in de kamer? Hoeveel moet je erbij doen om ${F(RR)} te krijgen?`,
    explanation: rooms.map(m => `${F(m.a)} en ${F(m.b)}`).join(', ') + ` zijn samen ${F(RR)}.`, key: 'house' + R + S + lefts.join(',') };
};

const WALLS = [[3, 1, 3, 1], [3, 1, 6, 1], [3, 2, 12, 1], [4, 1, 8, 1], [4, 3, 20, 1], [4, 10, 60, 1], [4, 20, 150, 1], [4, 100, 900, 1], [3, 1, 50, 10], [4, 5, 80, 10]];
G.wall = (L, r) => {
  const [n, lo, hi, S] = WALLS[Math.min(L, 10) - 1];
  const rows = [Array.from({ length: n }, () => ri(lo, hi, r))];
  for (let k = 1; k < n; k++) rows.push(rows[k - 1].slice(1).map((v, j) => rows[k - 1][j] + v));
  const all = []; for (let k = 0; k < n; k++) for (let j = 0; j < n - k; j++) all.push(`${k}_${j}`);
  let hidden = null;
  if (L === 1) hidden = all.filter(id => !id.startsWith('0_'));
  else {
    const h = n === 3 ? ri(3, 4, r) : ri(5, 7, r);
    for (let t = 0; t < 400 && !hidden; t++) { const cand = sample(all, h, r), known = all.filter(x => !cand.includes(x)); if (cand.some(x => x.startsWith('0_')) && wallSolvable(n, known)) hidden = cand; }
    if (!hidden) hidden = all.filter(id => !id.startsWith('0_'));
  }
  const vals = rows.map(row => row.map(v => q3(v / S)));
  return { kind: 'wall', title: 'Maak het rekenmuurtje af', n, rows: vals, hidden, dec: S > 1, cells: all.filter(id => hidden.includes(id)).map(id => { const [k, j] = id.split('_').map(Number); return { id: 'w' + id, answer: vals[k][j] }; }),
    spoken: 'Rekenmuur. Een steen is altijd de twee stenen eronder bij elkaar. Vul de lege stenen in.',
    hint: 'Twee stenen naast elkaar zijn samen de steen erboven. Weet je de steen erboven al? Dan kun je terugrekenen met min.',
    explanation: `De bovenste steen is ${F(vals[n - 1][0])}.`, key: 'wall' + rows[0].join(',') + hidden.join() };
};

const LINES = [
  () => ({ s: 0, e: 10, minor: 1, big: 5, labels: [0, 5, 10], step: 1, S: 1 }),
  () => ({ s: 0, e: 20, minor: 1, big: 5, labels: [0, 10, 20], step: 1, S: 1 }),
  r => r() < .5 ? { s: 0, e: 100, minor: 10, big: 50, labels: [0, 50, 100], step: 10, S: 1 } : (s => ({ s, e: s + 20, minor: 1, big: 5, labels: [s, s + 10, s + 20], step: 1, S: 1 }))(10 * ri(1, 7, r)),
  () => ({ s: 0, e: 100, minor: 5, big: 10, labels: [0, 50, 100], step: 5, S: 1 }),
  () => ({ s: 0, e: 1000, minor: 50, big: 100, labels: [0, 500, 1000], step: 50, S: 1 }),
  r => (s => ({ s, e: s + 100, minor: 10, big: 50, labels: [s, s + 50, s + 100], step: 10, S: 1 }))(100 * ri(1, 8, r)),
  () => ({ s: 0, e: 10000, minor: 500, big: 1000, labels: [0, 5000, 10000], step: 500, S: 1 }),
  r => (s => ({ s, e: s + 1000, minor: 100, big: 500, labels: [s, s + 500, s + 1000], step: 100, S: 1 }))(1000 * ri(1, 8, r)),
  () => ({ s: 0, e: 10, minor: 1, big: 5, labels: [0, 5, 10], step: 1, S: 10 }),
  r => (s => ({ s, e: s + 10, minor: 1, big: 5, labels: [s, s + 5, s + 10], step: 1, S: 10 }))(10 * ri(1, 8, r)),
  () => ({ s: 0, e: 1000000, minor: 50000, big: 100000, labels: [0, 500000, 1000000], step: 50000, S: 1 }),
  r => (s => ({ s, e: s + 10, minor: 1, big: 5, labels: [s, s + 5, s + 10], step: 1, S: 100 }))(10 * ri(1, 8, r))
];
G.line = (L, r, o = {}) => {
  const c = LINES[L - 1](r);
  const opts = []; for (let v = c.s + c.step; v < c.e; v += c.step) if (!c.labels.includes(v)) opts.push(v);
  const k = o.quick ? 1 : L === 1 ? 2 : ri(2, 3, r);
  const gap = (c.e - c.s) / 6; let picked = [];
  for (let t = 0; t < 200; t++) { const cc = sample(opts, k, r).sort((a, b) => a - b); if (cc.every((v, i) => i === 0 || v - cc[i - 1] >= gap)) { picked = cc; break; } }
  if (!picked.length) picked = sample(opts, 1, r);
  const arrows = picked.map((v, i) => ({ v, id: 'n' + i }));
  const minorV = q3(c.minor / c.S);
  return { kind: 'line', title: 'Welke getallen horen bij de pijlen?', ...c, arrows, dec: c.S > 1, cells: arrows.map(a => ({ id: a.id, answer: q3(a.v / c.S) })),
    spoken: `Getallenlijn van ${F(c.s / c.S)} tot ${F(c.e / c.S)}. Welke getallen horen bij de pijlen?`,
    hint: `Elk streepje is ${F(minorV)} verder. Begin bij het getal dat het dichtstbij staat en tel de streepjes.`,
    explanation: `De pijlen wijzen naar ${arrows.map(a => F(a.v / c.S)).join(' en ')}.`, key: 'line' + c.s + c.e + c.S + picked.join() };
};

G.mab = (L, r) => {
  const rg = [[11, 19], [20, 49], [50, 99], [100, 199], [200, 599], [600, 999]][Math.min(L, 6) - 1];
  let t = ri(rg[0], rg[1], r); if (L >= 2 && t % 10 === 0 && r() < .6) t += ri(1, 9, r);
  t = Math.min(t, rg[1]);
  const H = Math.floor(t / 100), T = Math.floor(t % 100 / 10), O = t % 10;
  return { kind: 'mab', title: `Bouw het getal ${t}`, target: t, plates: L >= 4, cells: [], init: () => ({ h: 0, t: 0, o: 0 }),
    spoken: `Bouw het getal ${t} met ${L >= 4 ? 'platen van honderd, ' : ''}staven van tien en losse blokjes.`,
    hint: `${t} is ${H ? H + ' honderd, ' : ''}${T} tien${T === 1 ? '' : 'tallen'} en ${O} los${O === 1 ? '' : 'se'}. Een staaf is 10${L >= 4 ? ', een plaat is 100' : ''}.`,
    explanation: `${t} = ${H ? H + (H === 1 ? ' plaat, ' : ' platen, ') : ''}${T} ${T === 1 ? 'staaf' : 'staven'} en ${O} ${O === 1 ? 'blokje' : 'blokjes'}.`, key: 'mab' + t, solution: { h: H, t: T, o: O } };
};

G.story = (L, r, o = {}) => {
  const topic = o.topic || 'add';
  const n1 = pick(NAMES, r); let n2 = pick(NAMES, r); while (n2 === n1) n2 = pick(NAMES, r);
  let text, ans, hint, expl, dec = false;
  if (topic === 'tables') {
    if (L <= 6) {
      const f = ri(2, L < 3 ? 5 : 10, r), g = pick([[2, 5], [2, 5, 10], [2, 3, 4, 5, 10], [3, 4, 6, 7, 8, 9], [6, 7, 8, 9], [6, 7, 8, 9, 12]][L - 1], r);
      const t = pick(['groups', 'share', 'legs'], r);
      if (t === 'groups') { text = `Er zijn ${f} doosjes. In elk doosje zitten ${g} kleurpotloden. Hoeveel potloden zijn het samen?`; ans = f * g; hint = `Dat is ${f} keer ${g}.`; expl = `${f} × ${g} = ${ans}.`; }
      else if (t === 'share') { text = `${n1} verdeelt ${f * g} snoepjes eerlijk over ${f} vriendjes. Hoeveel krijgt ieder vriendje?`; ans = g; hint = `Welke som uit de tafel van ${f} komt uit op ${f * g}?`; expl = `${f * g} : ${f} = ${g}.`; }
      else { const c = ri(2, L < 3 ? 4 : 9, r); text = `In de wei staan ${c} koeien. Hoeveel poten zijn dat samen?`; ans = c * 4; hint = `Een koe heeft 4 poten. Tel ${c} keer 4.`; expl = `${c} × 4 = ${ans}.`; }
    } else {
      const t = pick(L >= 10 ? ['boxes', 'bus', 'shareMoney', 'price'] : ['boxes', 'bus', 'boxes'], r);
      if (t === 'boxes') { const g = ri(12, 48, r), f = ri(L >= 8 ? 11 : 3, L >= 8 ? 35 : 9, r); text = `In een doos zitten ${g} pakjes sap. Hoeveel pakjes zitten er in ${f} dozen?`; ans = f * g; hint = `Reken ${f} × ${g}. Splits: ${f} × ${g - g % 10} en ${f} × ${g % 10}.`; expl = `${f} × ${g} = ${F(ans)}.`; }
      else if (t === 'bus') { const k = pick([40, 45, 50, 52, 60], r), N = ri(2 * k + 1, 6 * k - 1, r); text = `Er gaan ${N} kinderen op schoolreis. In één bus passen ${k} kinderen. Hoeveel bussen zijn er nodig?`; ans = Math.ceil(N / k); hint = `Hoe vaak past ${k} in ${N}? Blijven er kinderen over? Die hebben ook een bus nodig!`; expl = `${N} : ${k} = ${Math.floor(N / k)} rest ${N % k}. Voor de rest is nog een bus nodig: ${ans} bussen.`; }
      else if (t === 'shareMoney') { const k = ri(3, 8, r), share = 5 * ri(30, 400, r), T = k * share; text = `${k} kinderen verdienen samen ${euro(T)} met een sponsorloop. Ze verdelen het eerlijk. Hoeveel euro krijgt ieder?`; ans = share / 100; dec = true; hint = `Reken ${euro(T)} : ${k}. Begin met de hele euro's.`; expl = `${euro(T)} : ${k} = ${euro(share)}.`; }
      else { const p = 5 * ri(20, 300, r), n = ri(3, 12, r); text = `Een pak koekjes kost ${euro(p)}. Hoeveel betaal je voor ${n} pakken?`; ans = n * p / 100; dec = true; hint = `Reken ${n} × ${euro(p)}. Eerst de hele euro's, dan de centen.`; expl = `${n} × ${euro(p)} = ${euro(n * p)}.`; }
    }
  } else if (L <= 6) {
    const max = [10, 20, 50, 100, 500, 1000][L - 1];
    const a = ri(Math.ceil(max * .3), Math.floor(max * .7), r), b = ri(1, Math.max(1, Math.min(max - a, L < 3 ? 9 : max - a)), r);
    const t = pick(L === 1 ? ['plus', 'minus', 'more'] : ['plus', 'minus', 'more', 'bus', 'think', 'book'], r);
    if (t === 'plus') { text = `${n1} heeft ${a} knikkers. ${n2} geeft er nog ${b}. Hoeveel knikkers heeft ${n1} nu?`; ans = a + b; hint = `Er komen knikkers bij. Reken ${a} + ${b}.`; expl = `${a} + ${b} = ${ans}.`; }
    else if (t === 'minus') { const c = a + b; text = `Op een tak zitten ${c} vogels. Er vliegen er ${b} weg. Hoeveel vogels zitten er nog?`; ans = a; hint = `Er gaan vogels weg. Reken ${c} ${MIN} ${b}.`; expl = `${c} ${MIN} ${b} = ${a}.`; }
    else if (t === 'more') { text = `${n1} heeft ${a} stickers. ${n2} heeft er ${b} meer. Hoeveel stickers heeft ${n2}?`; ans = a + b; hint = `${n2} heeft er meer, dus je doet er ${b} bij.`; expl = `${a} + ${b} = ${ans}.`; }
    else if (t === 'bus') { const c = a + b, d = ri(1, Math.max(1, Math.floor(a / 2)), r); text = `In de bus zitten ${c} mensen. Bij de halte stappen er ${b} uit en ${d} in. Hoeveel mensen zitten er nu in de bus?`; ans = a + d; hint = `Doe het in twee stappen. Eerst ${c} ${MIN} ${b}, dan ${d} erbij.`; expl = `${c} ${MIN} ${b} = ${a}, en ${a} + ${d} = ${ans}.`; }
    else if (t === 'think') { const c = a + b; text = `Ik denk aan een getal. Ik doe er ${b} bij en dan krijg ik ${c}. Aan welk getal dacht ik?`; ans = a; hint = `Reken terug: ${c} ${MIN} ${b}.`; expl = `${a} + ${b} = ${c}, dus het getal is ${a}.`; }
    else { const c = a + b; text = `Een boek heeft ${c} bladzijden. ${n1} heeft er al ${a} gelezen. Hoeveel bladzijden moet ${n1} nog lezen?`; ans = b; hint = `Tel door van ${a} naar ${c}.`; expl = `${c} ${MIN} ${a} = ${b}.`; }
  } else {
    const max = [10000, 50000, 100000, 100000, 1000000, 1000000][L - 7];
    const a = ri(Math.ceil(max * .25), Math.floor(max * .6), r) , b = ri(Math.ceil(max * .05), Math.floor(max * .3), r);
    const t = pick(L >= 10 ? ['money', 'moneyLeft', 'stadium', 'truck'] : ['stadium', 'museum', 'truck'], r);
    if (t === 'stadium') { const c = a + b; text = `Een stadion heeft ${F(c)} plaatsen. Er zitten al ${F(a)} mensen. Hoeveel plaatsen zijn er nog vrij?`; ans = b; hint = `Reken ${F(c)} ${MIN} ${F(a)}, of tel door van ${F(a)} naar ${F(c)}.`; expl = `${F(c)} ${MIN} ${F(a)} = ${F(b)}.`; }
    else if (t === 'museum') { text = `In de zomer kwamen er ${F(a)} bezoekers naar het museum en in de herfst ${F(b)}. Hoeveel bezoekers waren dat samen?`; ans = a + b; hint = `Tel ${F(a)} en ${F(b)} op. Eerst de grote getallen.`; expl = `${F(a)} + ${F(b)} = ${F(a + b)}.`; }
    else if (t === 'truck') { const w = 10 * ri(300, 900, r), x = 10 * ri(50, 250, r), y = 10 * ri(20, Math.max(20, Math.min(200, (w - x) / 10 - 30)), r); text = `Een vrachtwagen heeft ${F(w)} kg lading. Bij de eerste winkel gaat er ${F(x)} kg af en bij de tweede ${F(y)} kg. Hoeveel kg is er nog over?`; ans = w - x - y; hint = 'Doe het in twee stappen. Of tel eerst de twee winkels bij elkaar en haal dat er in één keer af.'; expl = `${F(w)} ${MIN} ${F(x)} ${MIN} ${F(y)} = ${F(ans)} kg.`; }
    else if (t === 'money') { const p1 = 5 * ri(400, 6000, r), p2 = 5 * ri(100, 900, r); text = `Een fiets kost ${euro(p1)}. Een helm kost ${euro(p2)}. Hoeveel kost het samen?`; ans = (p1 + p2) / 100; dec = true; hint = 'Tel eerst de hele euro\'s op, dan de centen.'; expl = `${euro(p1)} + ${euro(p2)} = ${euro(p1 + p2)}.`; }
    else { const P = pick([2000, 5000, 10000], r), c = 5 * ri(100, P / 5 - 50, r); text = `Je hebt ${euro(P)}. Je koopt een spel van ${euro(c)}. Hoeveel geld houd je over?`; ans = (P - c) / 100; dec = true; hint = `Tel door van ${euro(c)} naar ${euro(P)}. Eerst naar een hele euro.`; expl = `${euro(P)} ${MIN} ${euro(c)} = ${euro(P - c)}.`; }
  }
  return { kind: 'story', title: 'Denksom', text, dec, cells: [{ id: 'x', answer: q3(ans) }], spoken: text, hint, explanation: expl, key: 'story' + text };
};

G.ktable = (L, r, o = {}) => {
  const op = o.topic === 'tables' ? '×' : '+';
  let rowsV, colsV;
  if (op === '+') {
    const LL = Math.min(L, 5);
    const R = [[1, 5], [2, 9], [10, 40], [11, 60], [100, 900]][LL - 1];
    const tens = LL === 3, hund = LL === 5;
    const val = () => tens ? (r() < .5 ? 10 * ri(1, 4, r) : ri(1, 9, r)) : hund ? 50 * ri(2, 18, r) : ri(R[0], R[1], r);
    rowsV = []; while (rowsV.length < 2) { const v = val(); if (!rowsV.includes(v)) rowsV.push(v); }
    colsV = []; while (colsV.length < 3) { const v = tens ? ri(1, 9, r) : hund ? 10 * ri(2, 40, r) : val(); if (!colsV.includes(v)) colsV.push(v); }
  } else {
    const sets = [[2, 5], [2, 5, 10], [2, 3, 4, 5, 10], [3, 4, 6, 7, 8, 9], [6, 7, 8, 9], [6, 7, 8, 9, 12], [11, 12, 15, 20, 25], [20, 30, 40, 50, 60, 70, 80, 90], [12, 15, 25, 50, 75]][Math.min(L, 9) - 1];
    rowsV = sample(sets, 2, r);
    colsV = sample(L >= 7 ? [2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, L < 3 ? 6 : 10), 3, r);
  }
  const f = (a, b) => op === '+' ? a + b : a * b;
  const hideHead = (op === '+' && L >= 3) || (op === '×' && L >= 4);
  const cells = [], given = {};
  let hr = -1, hc = -1;
  if (hideHead) { hr = ri(0, 1, r); hc = ri(0, 2, r); }
  const inner = []; for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) inner.push([i, j]);
  let shown;
  if (hideHead) { const jr = [0, 1, 2].filter(j => j !== hc)[ri(0, 1, r)], ir = 1 - hr; shown = [[hr, jr], [ir, hc]]; } else shown = [pick(inner, r)];
  for (const [i, j] of inner) { const v = f(rowsV[i], colsV[j]); if (shown.some(([a, b]) => a === i && b === j)) given[`k${i}${j}`] = v; else cells.push({ id: `k${i}${j}`, answer: v }); }
  if (hideHead) cells.unshift({ id: 'r' + hr, answer: rowsV[hr] }, { id: 'c' + hc, answer: colsV[hc] });
  return { kind: 'ktable', title: op === '+' ? 'Kruistabel: tel op' : 'Kruistabel: keer', op, rowsV, colsV, hr, hc, given, cells,
    spoken: `Kruistabel. Neem het getal van de rij ${op === '+' ? 'plus' : 'keer'} het getal van de kolom.${hideHead ? ' Er missen ook getallen aan de rand. Reken terug!' : ''}`,
    hint: hideHead ? `Er staat al een vakje ingevuld. Welk getal ${op === '+' ? 'plus' : 'keer'} het getal aan de rand geeft dat vakje?` : `Kijk naar het getal links van de rij en boven de kolom. ${op === '+' ? 'Tel ze op.' : 'Vermenigvuldig ze.'}`,
    explanation: `${F(rowsV[0])} ${op} ${F(colsV[0])} = ${F(f(rowsV[0], colsV[0]))}, en zo verder.`, key: 'kt' + op + rowsV + colsV + hr + hc };
};

G.tsum = (L, r, o = {}) => {
  const X = { cell: 'x' }; let tokens, ans, spoken, hint, expl, dec = false, vis = null, t;
  if (L <= 6 || o.table) {
    const sets = [[2, 5], [2, 5, 10], [2, 3, 4, 5, 10], [3, 4, 6, 7, 8, 9], [6, 7, 8, 9, 11, 12], [12, 15, 20, 25]];
    const LL = Math.min(L, 6);
    const a = o.table || pick(sets[LL - 1], r), b = o.factor || (o.table ? ri(1, 10, r) : ri(2, LL < 3 ? 6 : 10, r));
    t = o.table ? (r() < .75 ? 'times' : 'missing') : pick(LL < 3 ? ['times', 'times', 'divide'] : ['times', 'divide', 'missing'], r);
    if (t === 'times') { tokens = [b, '×', a, '=', X]; ans = a * b; spoken = `Hoeveel is ${b} keer ${a}?`; hint = b > 5 ? `5 keer ${a} is ${5 * a}. Tel daarna nog ${b - 5} keer ${a} erbij.` : `Tel ${b} keer ${a}: ${Array.from({ length: b }, (_, i) => a * (i + 1)).slice(0, 3).join(', ')}...`; expl = `${b} × ${a} = ${ans}.`; }
    else if (t === 'divide') { tokens = [a * b, ':', a, '=', X]; ans = b; spoken = `Hoeveel is ${a * b} gedeeld door ${a}?`; hint = `Hoeveel keer ${a} is ${a * b}? Tel met sprongen van ${a}.`; expl = `${b} × ${a} = ${a * b}, dus ${a * b} : ${a} = ${b}.`; }
    else { tokens = [X, '×', a, '=', a * b]; ans = b; spoken = `Hoeveel keer ${a} is ${a * b}?`; hint = `Tel met sprongen van ${a} tot je bij ${a * b} bent. Hoeveel sprongen?`; expl = `${b} × ${a} = ${a * b}.`; }
    if (a * b <= 40) vis = { groups: [a, b] };
    return { kind: 'tsum', title: t === 'missing' ? 'Welk getal mist er?' : 'Reken uit', tokens, cells: [{ id: 'x', answer: ans }], spoken, hint, explanation: expl, hintVisual: vis, key: tokens.map(x => x.cell ? '_' : x).join(' '), table: a };
  }
  t = pick(['times', 'divide'], r);
  let a, b, c;
  if (L === 7) { a = ri(3, 9, r); b = r() < .5 ? ri(12, 99, r) : ri(102, 399, r); }
  else if (L === 8) { a = ri(2, 9, r) * pick([10, 100], r); b = ri(2, 9, r) * pick([1, 10], r); }
  else if (L === 9) { a = ri(12, 49, r); b = ri(12, 69, r); }
  else if (L === 10) { dec = true; if (t === 'times') { a = ri(2, 9, r); b = pick([25, 50, 75, 125, 150, 225, 250, 175], r) / 100; } else if (r() < .5) { b = pick([.5, .25, 2.5, 1.5], r); a = q3(ri(2, 12, r) * b); [a, b] = [b, a]; } else { a = ri(2, 9, r); b = ri(1, 9, r) / 10; } }
  else if (L === 11) { dec = true; a = pick([10, 100, 1000], r); b = t === 'times' ? ri(11, 999, r) / pick([10, 100], r) : ri(5, 999, r); }
  else { dec = true; if (t === 'times') { a = pick([.2, .3, .4, .5, 1.5, 2.5], r); b = r() < .5 ? ri(11, 49, r) / 10 : ri(12, 48, r); } else { a = pick([.5, .25, .2], r); b = ri(2, 30, r); } }
  if (t === 'times') { c = q3(a * b); tokens = [a, '×', b, '=', X]; ans = c; spoken = `Hoeveel is ${F(a)} keer ${F(b)}?`; expl = `${F(a)} × ${F(b)} = ${F(c)}.`;
    hint = L === 7 ? `Splits ${b} in handige stukken: ${a} × ${b - b % 10} en ${a} × ${b % 10}.` : L === 8 ? `Reken eerst zonder de nullen. Tel daarna de nullen erbij.` : L === 9 ? `Splits een getal: ${a} × ${b - b % 10} en ${a} × ${b % 10}. Tel ze daarna op.` : L === 11 ? `Keer ${a}: de cijfers schuiven ${String(a).length - 1} plaats(en) naar links.` : 'Reken eerst zonder komma. Zet daarna de komma goed: tel hoeveel cijfers er achter de komma stonden.'; }
  else {
    // deelsom: dividend = a × b met heel antwoord
    let dvd, dvs, q;
    if (L === 7) { dvs = a; q = b > 99 ? ri(12, 99, r) : b; dvd = dvs * q; }
    else if (L === 8) { dvs = pick([20, 30, 40, 50, 60, 70, 80, 90], r); q = ri(2, 9, r) * pick([1, 10], r); dvd = dvs * q; }
    else if (L === 9) { dvs = ri(12, 35, r); q = ri(11, 39, r); dvd = dvs * q; }
    else if (L === 10) { if (b < 1 && a >= 2) { dvs = a; q = b; dvd = q3(a * b); } else { dvs = a < 3 ? a : pick([.5, .25, 2.5], r); q = ri(2, 12, r); dvd = q3(dvs * q); } }
    else if (L === 11) { dvs = a; dvd = b; q = q3(b / a); }
    else { dvs = a; q = q3(b / a); dvd = b; }
    tokens = [dvd, ':', dvs, '=', X]; ans = q; spoken = `Hoeveel is ${F(dvd)} gedeeld door ${F(dvs)}?`; expl = `${F(dvd)} : ${F(dvs)} = ${F(q)}.`;
    hint = dvs < 1 ? `Hoe vaak past ${F(dvs)} in ${F(dvd)}? Delen door een getal kleiner dan 1 geeft een grotere uitkomst.` : L === 11 ? `Delen door ${dvs}: de cijfers schuiven ${String(dvs).length - 1} plaats(en) naar rechts.` : `Welk getal keer ${F(dvs)} is ${F(dvd)}? Probeer een handige keersom, bijvoorbeeld 10 × ${F(dvs)}.`;
  }
  return { kind: 'tsum', title: 'Reken uit', tokens, dec, cells: [{ id: 'x', answer: q3(ans) }], spoken, hint, explanation: expl, key: tokens.map(x => x.cell ? '_' : x).join(' ') };
};

G.share = (L, r) => {
  let k, m; do { k = ri(2, L === 1 ? 3 : 4, r); m = ri(2, L === 1 ? 4 : 6, r); } while (k * m > 24);
  const N = k * m;
  return { kind: 'share', title: `Verdeel ${N} koekjes eerlijk over ${k} borden`, N, k, m, cells: [{ id: 'x', answer: m }], init: () => ({ plates: Array(k).fill(0) }),
    spoken: `Verdeel ${N} koekjes eerlijk over ${k} borden. Tik op een bord om er een koekje op te leggen. Hoeveel koekjes krijgt elk bord?`,
    hint: `Leg op elk bord om de beurt één koekje, tot de koekjes op zijn. Of denk: welke som uit de tafel van ${k} is ${N}?`,
    explanation: `${N} : ${k} = ${m}. Elk bord krijgt ${m} koekjes.`, key: 'share' + N + k, solution: { plates: Array(k).fill(m) } };
};

G.trow = (L, r, o = {}) => {
  const sets = [[2, 5, 10], [2, 3, 4, 5, 10], [3, 4, 6, 7, 8, 9], [6, 7, 8, 9], [6, 7, 8, 9, 11, 12], [11, 12, 15, 20, 25], [12, 15, 25, 50, 75], [.5, .25, 1.5, 2.5]];
  const t = o.table || pick(sets[Math.min(L, 8) - 1], r);
  const start = ri(1, 5, r), len = 6, back = L >= 3 && !o.table && r() < .4;
  let seq = Array.from({ length: len }, (_, i) => q3(t * (start + i))); if (back) seq.reverse();
  const k = o.quick ? 1 : ri(2, 3, r);
  const blanks = o.quick ? [len - 1] : sample([1, 2, 3, 4, 5], k, r).sort((a, b) => a - b);
  return { kind: 'jumps', title: `Sprongen van ${F(t)}`, seq, blanks, dec: !Number.isInteger(t), cells: blanks.map(i => ({ id: 's' + i, answer: seq[i] })),
    spoken: `Spring steeds ${F(t)} ${back ? 'terug' : 'verder'}. Welke getallen missen er?`, hint: `Elke sprong is ${F(t)}. Doe er steeds ${F(t)} ${back ? 'af' : 'bij'}.`,
    explanation: seq.map(F).join(', ') + '.', key: 'trow' + seq.join() + blanks.join(), table: t };
};

G.jumps = (L, r, o = {}) => {
  let seq, rule, dec = false;
  const ar = (a, st) => Array.from({ length: 6 }, (_, i) => q3(a + st * i));
  if (L === 1) { const st = pick([1, 2], r); seq = ar(ri(0, 8, r), st); rule = `Er komt steeds ${st} bij.`; }
  else if (L === 2) { const st = pick([2, 5, 10, -1, -2], r); seq = ar(st < 0 ? ri(12, 20, r) : ri(0, 10, r), st); rule = st > 0 ? `Er komt steeds ${st} bij.` : `Er gaat steeds ${-st} af.`; }
  else if (L === 3) { const st = pick([3, 4, 5, 10, -3, -5], r); seq = ar(st < 0 ? ri(30, 50, r) : ri(0, 20, r), st); rule = st > 0 ? `Er komt steeds ${st} bij.` : `Er gaat steeds ${-st} af.`; }
  else if (L === 4) { if (r() < .5) { const a = ri(1, 5, r); seq = [a]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + i); rule = 'De sprongen worden steeds 1 groter: +1, +2, +3...'; } else { const p = ri(3, 6, r), q = ri(1, p - 1, r), a = ri(5, 15, r); seq = [a]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + (i % 2 ? p : -q)); rule = `Steeds om en om +${p} en ${MIN}${q}.`; } }
  else if (L === 5) { if (r() < .5) { const a = ri(1, 6, r); seq = Array.from({ length: 6 }, (_, i) => a * 2 ** i); rule = 'Elk getal is het dubbele van het vorige.'; } else { const st = pick([25, 50, 75], r); seq = ar(25 * ri(0, 8, r), st); rule = `Er komt steeds ${st} bij.`; } }
  else if (L === 6) { if (r() < .5) { const a = ri(1, 3, r); seq = Array.from({ length: 6 }, (_, i) => (a + i) ** 2); rule = 'Het zijn keer-zichzelf-getallen: 1×1, 2×2, 3×3...'; } else { const a = ri(1, 4, r); seq = [a]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] * 2 + 1); rule = 'Steeds keer 2 en dan plus 1.'; } }
  else if (L === 7) { if (r() < .5) { const st = pick([.25, .5, .2], r); dec = true; seq = ar(ri(0, 5, r), st); rule = `Er komt steeds ${F(st)} bij.`; } else { const a = ri(1, 3, r); seq = Array.from({ length: 6 }, (_, i) => a * 3 ** i); rule = 'Elk getal is 3 keer zo groot als het vorige.'; } }
  else if (L === 8) { if (r() < .5) { const a = ri(1, 9, r) * 32; seq = Array.from({ length: 6 }, (_, i) => a / 2 ** i); rule = 'Elk getal is de helft van het vorige.'; } else { dec = true; seq = ar(ri(10, 50, r) / 10, pick([.1, -.1, .3], r)); rule = `Er komt steeds ${F(q3(seq[1] - seq[0]))} bij.`; } }
  else if (L === 9) { const a = ri(1, 4, r), b = ri(a, a + 4, r); seq = [a, b]; for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2]); rule = 'Elk getal is de twee getallen ervoor bij elkaar.'; }
  else if (L === 10) { if (r() < .5) { const a = ri(1, 10, r), s0 = pick([1, 3], r); seq = [a]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + s0 + 2 * (i - 1)); rule = `De sprongen worden steeds 2 groter: +${s0}, +${s0 + 2}, +${s0 + 4}...`; } else { const a = ri(1, 5, r); seq = [a]; for (let i = 1; i < 6; i++) seq.push(i % 2 ? seq[i - 1] * 2 : seq[i - 1] + 3); rule = 'Steeds om en om keer 2 en plus 3.'; } }
  else if (L === 11) { if (r() < .5) { dec = true; const d = ri(1, 9, r); seq = [.001, .01, .1, 1, 10, 100].map(x => q3(x * d)); rule = 'Elk getal is 10 keer zo groot als het vorige.'; } else { const a = ri(1, 4, r), b = ri(15, 30, r); seq = [a, b, a + 1, b - 1, a + 2, b - 2]; rule = 'Twee rijen door elkaar: de ene telt op, de andere telt terug.'; } }
  else { if (r() < .5) { seq = [1, 3, 6, 10, 15, 21].map(v => v + 0); rule = 'Driehoeksgetallen: de sprongen zijn +2, +3, +4, +5...'; const k0 = ri(0, 2, r); seq = Array.from({ length: 6 }, (_, i) => ((i + 1 + k0) * (i + 2 + k0)) / 2); } else { const a = ri(2, 5, r); seq = [a]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] * 2 - 1); rule = 'Steeds keer 2 en dan min 1.'; } }
  const k = o.quick ? 1 : (L === 1 ? 2 : ri(2, 3, r));
  const blanks = o.quick ? [5] : sample(L >= 4 ? [2, 3, 4, 5] : [1, 2, 3, 4, 5], k, r).sort((a, b) => a - b);
  return { kind: 'jumps', title: 'Zoek de regel', seq, blanks, dec, cells: blanks.map(i => ({ id: 's' + i, answer: q3(seq[i]) })),
    spoken: 'Zoek de regel van de rij. Welke getallen missen er?', hint: 'Kijk naar de sprong tussen twee getallen die er al staan. Is het steeds dezelfde sprong? Of verandert de sprong ook?',
    explanation: rule + ' ' + seq.map(F).join(', ') + '.', key: 'jumps' + seq.join() + blanks.join() };
};

const SHAPES = ['cirkel', 'vierkant', 'driehoek', 'ster', 'hart', 'ruit'];
G.shapes = (L, r) => {
  const [A, B, C] = sample(SHAPES, 3, r);
  const S = k => ({ shape: k });
  let eqs, vals, ask, final = null, dec = false, hint = 'Begin bij de som waar maar één soort vorm in zit. Als je die weet, gebruik je hem in de volgende som.';
  if (L === 1) { const a = ri(1, 5, r), b = ri(1, 6, r), c = ri(2, Math.max(2, 10 - b), r); vals = { [A]: a, [B]: b }; eqs = [[S(A), '+', S(A), '=', 2 * a], [S(B), '+', c, '=', b + c]]; ask = [A, B]; }
  else if (L === 2) { const a = ri(2, 6, r), b = ri(1, 9, r); vals = { [A]: a, [B]: b }; eqs = [[S(A), '+', S(A), '+', S(A), '=', 3 * a], [S(A), '+', S(B), '=', a + b]]; ask = [A, B]; }
  else if (L === 3) { const a = ri(2, 8, r), b = ri(1, 9, r), c = ri(1, 9, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), '+', S(A), '=', 2 * a], [S(A), '+', S(B), '=', a + b], [S(B), '+', S(C), '=', b + c]]; ask = [A, B, C]; }
  else if (L === 4) { const a = ri(3, 9, r), b = ri(4, 15, r), c = ri(1, b - 1, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), '+', S(A), '+', S(A), '=', 3 * a], [S(A), '+', S(B), '=', a + b], [S(B), MIN, S(C), '=', b - c]]; ask = [A, B, C]; final = a + b + c; }
  else if (L === 5) { const a = ri(3, 9, r), b = ri(2, 6, r), c = ri(b + 1, 15, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), '×', 4, '=', 4 * a], [S(A), '×', S(B), '=', a * b], [S(C), MIN, S(B), '=', c - b]]; ask = [A, B, C]; }
  else if (L === 6) { const b = ri(2, 12, r), d = ri(1, 10, r), a = b + d, c = ri(2, 6, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), '+', S(B), '=', a + b], [S(A), MIN, S(B), '=', d], [S(C), '×', S(A), '=', c * a]]; ask = [A, B, C]; hint = 'Twee getallen samen zijn het ene getal, en het verschil is het andere. Probeer een paar getallen uit.'; }
  else if (L === 7) { const a = ri(3, 12, r), b = ri(2, 20, r), c = ri(2, 9, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), '×', S(A), '=', a * a], [S(A), '+', S(B), '=', a + b], [S(B), '×', S(C), '=', b * c]]; ask = [A, B, C]; }
  else if (L === 8) { const a = ri(3, 15, r), b = ri(2, 20, r), c = a + ri(1, 20, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), '+', S(A), '+', S(B), '=', 2 * a + b], [S(A), '+', S(B), '=', a + b], [S(C), MIN, S(A), '=', c - a]]; ask = [A, B, C]; hint = 'Vergelijk de eerste twee sommen. Wat is het verschil tussen de twee regels?'; }
  else if (L === 9) { let a = ri(3, 12, r), b = ri(2, 12, r); if (a === b) a++; if (a < b) [a, b] = [b, a]; vals = { [A]: a, [B]: b }; eqs = [[S(A), '+', S(B), '=', a + b], [S(A), '×', S(B), '=', a * b], [S(A), '>', S(B)]]; ask = [A, B]; hint = 'Zoek twee getallen die samen het ene getal zijn en keer elkaar het andere. Probeer kleine getallen uit.'; }
  else if (L === 10) { const a = ri(2, 20, r), b = ri(2, 20, r), c = ri(2, 20, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), '+', S(B), '+', S(C), '=', a + b + c], [S(A), '+', S(B), '=', a + b], [S(B), '+', S(C), '=', b + c]]; ask = [A, B, C]; hint = 'Vergelijk de bovenste som met de tweede: welke vorm mist er in de tweede? Dat verschil is die vorm.'; }
  else if (L === 11) { dec = true; const a = ri(1, 9, r) + .5, b = ri(2, 15, r), c = ri(2, 6, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), '+', S(A), '=', 2 * a], [S(A), '+', S(B), '=', q3(a + b)], [S(C), '×', S(A), '=', q3(c * a)]]; ask = [A, B, C]; }
  else { const b = ri(2, 12, r), k = ri(2, 6, r), a = k * b, c = ri(2, 9, r); vals = { [A]: a, [B]: b, [C]: c }; eqs = [[S(A), ':', S(B), '=', k], [S(A), MIN, S(B), '=', a - b], [S(C), '+', S(A), '=', c + a]]; ask = [A, B, C]; hint = `${A} is ${k} keer zo groot als ${B}. Het verschil is dan ${k - 1} keer ${B}.`; }
  const cells = ask.map(k => ({ id: 'v_' + k, answer: vals[k] }));
  if (final !== null) cells.push({ id: 'fin', answer: final });
  return { kind: 'shapes', title: 'Geheime vormen', eqs, ask, dec, final: final !== null, cells,
    spoken: 'Elke vorm is een geheim getal. Dezelfde vorm is altijd hetzelfde getal. Welk getal is elke vorm?', hint,
    explanation: ask.map(k => `${k} = ${F(vals[k])}`).join(', ') + (final !== null ? `, samen ${final}` : '') + '.', key: 'shapes' + JSON.stringify(eqs) };
};

G.sudoku = (L, r) => {
  const big = L >= 5, n = big ? 6 : 4, bh = 2, bw = big ? 3 : 2;
  const base = []; for (let row = 0; row < n; row++) for (let c = 0; c < n; c++) base.push(((row % bh) * bw + Math.floor(row / bh) + c) % n + 1);
  const digits = shuffle(Array.from({ length: n }, (_, i) => i + 1), r);
  const rowOrder = shuffle(Array.from({ length: n / bh }, (_, i) => i), r).flatMap(b => shuffle(Array.from({ length: bh }, (_, i) => b * bh + i), r));
  const colOrder = shuffle(Array.from({ length: n / bw }, (_, i) => i), r).flatMap(s => shuffle(Array.from({ length: bw }, (_, i) => s * bw + i), r));
  const sol = []; for (const ro of rowOrder) for (const co of colOrder) sol.push(digits[base[ro * n + co] - 1]);
  const target = [4, 6, 8, 10, 14, 19, 21, 23, 24, 26][Math.min(L, 10) - 1];
  const g = sol.slice(); let blanks = 0;
  for (const i of shuffle(Array.from({ length: n * n }, (_, i) => i), r)) { if (blanks >= target) break; const v = g[i]; g[i] = 0; if (sudokuCount(g, n, bh, bw) === 1) blanks++; else g[i] = v; }
  return { kind: 'sudoku', title: `Sudoku met 1 t/m ${n}`, n, bh, bw, grid: g, sol, cells: g.map((v, i) => v ? null : { id: 'q' + i, answer: sol[i] }).filter(Boolean),
    spoken: `Sudoku. Zet in elk leeg vakje een getal van 1 tot en met ${n}. In elke rij, elke kolom en elk dik vak staat elk getal één keer.`,
    hint: 'Zoek een rij, kolom of dik vak waar nog maar één getal mist. Welk getal is er nog niet?', explanation: 'Elk getal staat nu precies één keer in elke rij, kolom en dik vak.', key: 'sud' + g.join('') };
};

G.magic = (L, r) => {
  let sq = [2, 7, 6, 9, 5, 1, 4, 3, 8];
  const rot = s => [s[6], s[3], s[0], s[7], s[4], s[1], s[8], s[5], s[2]], flip = s => [s[2], s[1], s[0], s[5], s[4], s[3], s[8], s[7], s[6]];
  for (let i = ri(0, 3, r); i > 0; i--) sq = rot(sq); if (r() < .5) sq = flip(sq);
  let dec = false;
  if (L === 5) { const k = ri(1, 6, r); sq = sq.map(v => v + k); }
  else if (L === 6) { const k = pick([2, 3, 5, 10], r); sq = sq.map(v => v * k); }
  else if (L === 7) { const k = ri(1, 9, r); sq = sq.map(v => v * 2 + k); }
  else if (L === 8) { const k = pick([5, 11, 12, 15], r); sq = sq.map(v => v * k); }
  else if (L === 9) { dec = true; sq = sq.map(v => v * .5); }
  else if (L === 10) { const k = ri(2, 9, r) * 10; sq = sq.map(v => v * 3 + k); }
  else if (L === 11) { sq = sq.map(v => v * pick([25], r)); }
  else if (L === 12) { dec = true; const k = ri(1, 5, r); sq = sq.map(v => q3(v * .1 + k)); }
  sq = sq.map(q3);
  const S = q3(sq[0] + sq[1] + sq[2]);
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const h = [4, 4, 4, 5, 5, 6, 6, 6, 5, 6, 6, 6][L - 1];
  let hid = null;
  for (let t = 0; t < 400 && !hid; t++) { const c = sample([0, 1, 2, 3, 4, 5, 6, 7, 8], h, r); if (linesSolvable(lines, [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => !c.includes(i)), 9)) hid = c; }
  if (!hid) hid = [0, 4, 8];
  return { kind: 'magic', title: 'Tovervierkant', sq, S, hid, dec, cells: hid.sort((a, b) => a - b).map(i => ({ id: 'm' + i, answer: sq[i] })),
    spoken: `Tovervierkant. Elke rij, elke kolom en de twee schuine lijnen zijn samen ${F(S)}. Welke getallen missen er?`,
    hint: `Zoek een lijn waar maar één getal mist. Tel de twee andere op en kijk hoeveel je nog nodig hebt tot ${F(S)}.`,
    explanation: `Alle lijnen zijn samen ${F(S)}.`, key: 'magic' + sq.join() + hid.join() };
};

G.triangle = (L, r) => {
  const nine = L >= 7;
  const ids = nine ? ['t0', 't1', 't2', 'a0', 'b0', 'a1', 'b1', 'a2', 'b2'] : ['t0', 't1', 't2', 'e0', 'e1', 'e2'];
  const sides = nine ? [['t0', 'a0', 'b0', 't1'], ['t1', 'a1', 'b1', 't2'], ['t2', 'a2', 'b2', 't0']] : [['t0', 'e0', 't1'], ['t1', 'e1', 't2'], ['t2', 'e2', 't0']];
  const nums = nine ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6];
  let sol = null, S = 0;
  const want = nine ? null : pick([9, 10, 11, 12], r), total = nums.reduce((a, b) => a + b, 0);
  const pairings = arr => { if (!arr.length) return [[]]; const [f, ...rest] = arr, out = []; rest.forEach((o, i) => { for (const tail of pairings(rest.filter((_, j) => j !== i))) out.push([[f, o], ...tail]); }); return out; };
  const triples = []; for (const a of nums) for (const b of nums) for (const c of nums) if (a !== b && b !== c && a !== c) triples.push([a, b, c]);
  for (const [t0, t1, t2] of shuffle(triples, r)) {
    const cs = t0 + t1 + t2; if ((total + cs) % 3) continue; const SS = (total + cs) / 3; if (want !== null && SS !== want) continue;
    const need = [SS - t0 - t1, SS - t1 - t2, SS - t2 - t0], rest = shuffle(nums.filter(v => v !== t0 && v !== t1 && v !== t2), r);
    if (!nine) { if (need.every(v => rest.includes(v)) && new Set(need).size === 3) { sol = { t0, t1, t2, e0: need[0], e1: need[1], e2: need[2] }; S = SS; break; } continue; }
    for (const pr of shuffle(pairings(rest), r)) { const perm = shuffle([0, 1, 2], r).length ? null : null; const ord = [0, 1, 2]; const ok = []; const used = new Set();
      for (const k of ord) { const f = pr.findIndex((q, qi) => !used.has(qi) && q[0] + q[1] === need[k]); if (f < 0) break; used.add(f); ok.push(pr[f]); }
      if (ok.length === 3) { sol = { t0, t1, t2, a0: ok[0][0], b0: ok[0][1], a1: ok[1][0], b1: ok[1][1], a2: ok[2][0], b2: ok[2][1] }; S = SS; break; } }
    if (sol) break;
  }
  const nGiven = nine ? (L === 7 ? 3 : 2) : L <= 2 ? 2 : L <= 4 ? 1 : 0;
  const given = Object.fromEntries(sample(ids, nGiven, r).map(id => [id, sol[id]]));
  return { kind: 'triangle', title: 'Toverdriehoek', S, given, sol, sides, nums, nine, cells: ids.filter(id => !(id in given)).map(id => ({ id, answer: sol[id] })), ruleCheck: true,
    spoken: `Toverdriehoek. Zet de getallen 1 tot en met ${nums.length} in de rondjes, elk getal één keer. Elke zijde moet samen ${S} zijn.`,
    hint: 'Een getal in een hoek telt mee voor twee zijden. Probeer welke getallen in de hoeken passen.',
    explanation: `Elke zijde is samen ${S}. Er zijn vaak meer goede oplossingen!`, key: 'tri' + S + nine + JSON.stringify(given) };
};

function fracWord(a, b) { return { 2: 'tweede', 3: 'derde', 4: 'vierde', 5: 'vijfde', 6: 'zesde', 7: 'zevende', 8: 'achtste', 9: 'negende', 10: 'tiende', 12: 'twaalfde', 20: 'twintigste' }[b] || ''; }
const fracSay = (a, b) => b === 2 && a === 1 ? 'de helft' : `${a} ${fracWord(a, b)}`;
G.fracbar = (L, r) => {
  const bs = [[2, 3, 4], [2, 3, 4, 5, 6, 8], [2, 3, 4], [3, 4, 5], [2, 3, 4, 6], [3, 4, 5, 6]][Math.min(L, 6) - 1];
  const b = pick(bs, r), a = ri(1, b - 1, r), k = L >= 3 ? ri(2, 3, r) : 1, pieces = b * k;
  return { kind: 'fracbar', title: 'Kleur het goede stuk van de reep', a, b, k, pieces, cells: [], init: () => ({ on: [] }),
    spoken: `Kleur ${fracSay(a, b)} van de reep. Tik op de stukjes.`,
    hint: k > 1 ? `De reep heeft ${pieces} stukjes. Verdeel hem eerst in ${b} gelijke delen: dat zijn ${k} stukjes per deel. Kleur er ${a} van die delen.` : `De reep is verdeeld in ${b} gelijke stukjes. Kleur er ${a}.`,
    explanation: `${a}/${b} van ${pieces} ${pieces === 1 ? 'stukje' : 'stukjes'} is ${a * k} ${a * k === 1 ? 'stukje' : 'stukjes'}.`, key: 'fb' + a + b + k, solution: { on: Array.from({ length: a * k }, (_, i) => i) } };
};
G.fracread = (L, r) => {
  const b = pick(L === 1 ? [2, 3, 4] : [3, 4, 5, 6, 8], r), a = ri(1, b - 1, r);
  return { kind: 'fracread', title: 'Welk deel is gekleurd?', a, b, cells: [{ id: 'num', answer: a }, { id: 'den', answer: b }],
    spoken: 'Welk deel van de reep is gekleurd? Schrijf het als breuk.', hint: 'Onder de streep: in hoeveel stukjes is de reep verdeeld? Boven de streep: hoeveel stukjes zijn gekleurd?',
    explanation: `${a} van de ${b} stukjes zijn gekleurd: ${a}/${b}.`, key: 'fr' + a + b };
};
G.fracset = (L, r) => {
  let b, u, money = false;
  if (L <= 3) { b = pick([2, 4], r); u = ri(2, 5, r); }
  else if (L <= 5) { b = pick([2, 3, 4, 5], r); u = ri(2, 8, r); }
  else if (L === 6) { b = pick([2, 3, 4, 5, 6, 8], r); u = ri(3, 12, r); }
  else if (L === 7) { b = pick([2, 3, 4, 5, 10], r); u = ri(5, 25, r) * (r() < .5 ? 1 : 2); }
  else if (L === 8) { b = pick([2, 3, 4, 5, 10], r); u = 5 * ri(1, 12, r); money = true; }
  else { b = pick([3, 4, 5, 8, 10, 20], r); u = ri(5, 60, r) * 5; }
  const a = ri(1, b - 1, r), N = b * u;
  return { kind: 'fracset', title: 'Breuk van een aantal', a, b, u, N, grouped: L <= 3, money, tokens: [{ frac: [a, b] }, 'van', money ? euro(N * 100) : N, '=', ...(money ? ['€'] : []), { cell: 'x' }], cells: [{ id: 'x', answer: a * u }],
    spoken: `Hoeveel is ${fracSay(a, b)} van ${money ? N + ' euro' : F(N)}?`, hint: `Verdeel ${F(N)} eerst in ${b} gelijke delen. Eén deel is ${F(u)}. Je hebt er ${a} nodig.`,
    explanation: `${F(N)} : ${b} = ${F(u)}, en ${a} × ${F(u)} = ${F(a * u)}.`, key: 'fs' + a + b + N };
};
G.percent = (L, r) => {
  let tokens, ans, spoken, hint, expl, text = null;
  if (L <= 9) { const p = pick([10, 25, 50, 75], r), n = 20 * ri(2, 20, r); ans = n * p / 100; tokens = [p + '%', 'van', n, '=', { cell: 'x' }]; spoken = `Hoeveel is ${p} procent van ${n}?`; hint = p % 25 === 0 ? `50% is de helft en 25% is een kwart. Een kwart van ${n} is ${F(n / 4)}.` : `10% van ${n} is ${F(n / 10)}.`; expl = `${p}% van ${F(n)} is ${F(ans)}.`; }
  else if (L === 10) { const p = pick([1, 5, 20, 30, 40, 60], r), n = 100 * ri(1, 30, r); ans = n * p / 100; tokens = [p + '%', 'van', n, '=', { cell: 'x' }]; spoken = `Hoeveel is ${p} procent van ${F(n)}?`; hint = `1% van ${F(n)} is ${F(n / 100)}. 10% is ${F(n / 10)}. Gebruik die om ${p}% te vinden.`; expl = `${p}% van ${F(n)} is ${F(ans)}.`; }
  else if (L === 11) { const p = pick([10, 20, 25, 50], r), P = 20 * ri(2, 15, r), item = pick(['spel', 'paar schoenen', 'skateboard', 'jas', 'fiets'], r); ans = P - P * p / 100; text = `Een ${item} kost ${euro(P * 100)}. In de uitverkoop krijg je ${p}% korting. Hoeveel betaal je nu?`; tokens = ['€', { cell: 'x' }]; spoken = text; hint = `Reken eerst uit hoeveel ${p}% van ${euro(P * 100)} is. Haal dat van de prijs af.`; expl = `${p}% van ${euro(P * 100)} is ${euro(P * p)}. ${euro(P * 100)} ${MIN} ${euro(P * p)} = ${euro(ans * 100)}.`; }
  else { const b = pick([20, 25, 40, 50, 80, 200, 400], r), p = pick([5, 10, 20, 25, 40, 60, 75], r), a = b * p / 100; if (!Number.isInteger(a)) return G.percent(11, r); ans = p; text = `In de klas zitten ${b} kinderen. Er zijn er ${a} jarig in de zomer. Hoeveel procent is dat?`; if (b > 50) text = `Er zijn ${b} kaartjes verkocht. ${a} kaartjes waren voor kinderen. Hoeveel procent is dat?`; tokens = [{ cell: 'x' }, '%']; spoken = text; hint = `Schrijf het als breuk: ${a}/${b}. Hoeveel is dat op de 100?`; expl = `${a} van de ${b} is ${a}/${b} = ${p}/100 = ${p}%.`; }
  return { kind: 'tsum', title: text ? 'Procenten in het echt' : 'Procenten', text, tokens, cells: [{ id: 'x', answer: q3(ans) }], spoken, hint, explanation: expl, key: 'pc' + JSON.stringify(tokens) + text };
};

const PALETTE = [[100, 200, 500], [100, 200, 500, 1000], [50, 100, 200, 500, 1000], [10, 20, 50, 100, 200, 500, 1000], [10, 20, 50, 100, 200, 500, 1000, 2000], [5, 10, 20, 50, 100, 200, 500, 1000, 2000], [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000], [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]];
G.coins = (L, r) => {
  const amt = [() => 100 * ri(3, 9, r), () => 100 * ri(8, 19, r), () => 50 * ri(5, 29, r), () => 10 * ri(25, 150, r), () => 10 * ri(150, 400, r), () => 5 * ri(400, 900, r), () => 5 * ri(1000, 1990, r), () => 5 * ri(1400, 1999, r)][Math.min(L, 8) - 1]();
  const pal = PALETTE[Math.min(L, 8) - 1];
  const greedy = []; let left = amt; for (const v of pal.slice().reverse()) while (left >= v) { greedy.push(v); left -= v; }
  return { kind: 'coins', title: `Betaal precies ${euro(amt)}`, amt, pal, cells: [], init: () => ({ items: [] }), maxItems: L >= 7 ? 12 : 25,
    spoken: `Betaal precies ${euroSpoken(amt)}${L >= 7 ? ', met zo weinig mogelijk geld' : ''}. Tik op het geld om het op de toonbank te leggen.`,
    hint: 'Begin met het grootste geld dat nog past. Tel daarna steeds verder.',
    explanation: `Bijvoorbeeld: ${greedy.map(euro).join(' + ')} = ${euro(amt)}.`, key: 'coins' + amt, solution: { items: greedy } };
};
G.change = (L, r) => {
  let paid, cost, text = null;
  let item = pick(['een ijsje', 'een boek', 'een bal', 'een puzzel', 'een knuffel'], r);
  if (L === 1) { paid = 500 * ri(1, 2, r); cost = 100 * ri(1, paid / 100 - 1, r); }
  else if (L === 2) { paid = pick([1000, 2000], r); cost = 100 * ri(2, paid / 100 - 1, r); }
  else if (L <= 4) { paid = pick([500, 1000, 2000], r); cost = 50 * ri(3, paid / 50 - 1, r); if (cost % 100 === 0) cost -= 50; }
  else if (L <= 6) { paid = pick([2000, 5000], r); cost = 10 * ri(30, paid / 10 - 5, r); if (cost % 100 === 0) cost -= 30; }
  else if (L === 7) { paid = pick([2000, 5000], r); cost = 5 * ri(60, paid / 5 - 10, r); if (cost % 100 === 0) cost -= 15; }
  else if (L === 8) { paid = pick([5000, 10000], r); cost = 5 * ri(400, paid / 5 - 20, r); if (cost % 100 === 0) cost -= 35; }
  else { const n = ri(2, 5, r), p = 5 * ri(30, 300, r), thing = pick(['pakken melk', 'schriften', 'zakken chips', 'stripboeken'], r); cost = n * p; paid = [1000, 2000, 5000, 10000].find(v => v > cost + 50) || 10000; if (L >= 10) { const p2 = 5 * ri(50, 400, r); cost += p2; paid = [2000, 5000, 10000].find(v => v > cost + 50) || 20000; text = `Je koopt ${n} ${thing} van ${euro(p)} en een tijdschrift van ${euro(p2)}. Je betaalt met ${euro(paid)}. Hoeveel krijg je terug?`; } else text = `Je koopt ${n} ${thing} van ${euro(p)} per stuk. Je betaalt met ${euro(paid)}. Hoeveel krijg je terug?`; }
  if (cost > 2500) item = pick(['een spel', 'een paar schoenen', 'een jas', 'een skateboard', 'een lamp'], r);
  const back = paid - cost, cents = back % 100 !== 0 || L >= 3;
  const cells = [{ id: 'e', answer: Math.floor(back / 100) }]; if (cents) cells.push({ id: 'c', answer: back % 100 });
  return { kind: 'change', title: 'Hoeveel krijg je terug?', paid, cost, cents, item, text, cells,
    spoken: text || `Je koopt ${item} van ${euroSpoken(cost)}. Je betaalt met ${euroSpoken(paid)}. Hoeveel geld krijg je terug?`,
    hint: text ? 'Reken eerst uit wat alles samen kost. Tel dan door tot het bedrag waarmee je betaalt.' : `Tel door van ${euro(cost)} naar ${euro(paid)}.${cost % 100 ? ' Vul eerst aan tot een hele euro.' : ''}`,
    explanation: `${euro(paid)} ${MIN} ${euro(cost)} = ${euro(back)}.`, key: 'chg' + paid + cost + text };
};
G.clockread = (L, r) => {
  const h = ri(1, 12, r);
  let m, tokens, cells, spoken = 'Hoe laat is het op deze klok?', note = null, ex;
  if (L === 1) { m = 0; tokens = ['Het is', { cell: 'x' }, 'uur']; cells = [{ id: 'x', answer: h }]; }
  else if (L === 2) { m = r() < .3 ? 0 : 30; tokens = m ? ['Het is half', { cell: 'x' }] : ['Het is', { cell: 'x' }, 'uur']; cells = [{ id: 'x', answer: m ? nextH(h) : h }]; }
  else if (L === 3) { m = pick([15, 45, 30], r); tokens = m === 15 ? ['Het is kwart over', { cell: 'x' }] : m === 45 ? ['Het is kwart voor', { cell: 'x' }] : ['Het is half', { cell: 'x' }]; cells = [{ id: 'x', answer: m === 15 ? h : nextH(h) }]; }
  else if (L <= 6) { m = 5 * ri(0, 11, r); tokens = [{ cell: 'h' }, ':', { cell: 'm' }]; cells = [{ id: 'h', answer: h }, { id: 'm', answer: m }]; spoken = 'Hoe laat is het? Schrijf het uur en de minuten.'; }
  else if (L === 7) { m = 5 * ri(0, 11, r); const hh = h === 12 ? 12 : h + 12; note = h === 12 ? "Het is 's middags." : pick(["Het is 's middags.", "Het is 's avonds."], r); if (h >= 6 && h < 12) note = "Het is 's avonds."; if (h < 6) note = "Het is 's middags."; tokens = [{ cell: 'h' }, ':', { cell: 'm' }]; cells = [{ id: 'h', answer: hh }, { id: 'm', answer: m }]; spoken = `${note} Schrijf de tijd met de 24-uursklok.`; }
  else { m = ri(1, 59, r); if (m % 5 === 0) m++; tokens = [{ cell: 'h' }, ':', { cell: 'm' }]; cells = [{ id: 'h', answer: h }, { id: 'm', answer: m }]; spoken = 'Hoe laat is het precies? Tel de minuutstreepjes.'; }
  const hh = cells[0].answer;
  return { kind: 'clockread', title: L === 7 ? 'Hoe laat is het? (24-uursklok)' : 'Hoe laat is het?', h, m, tokens, cells, spoken, note,
    hint: L <= 3 ? 'De kleine wijzer wijst het uur aan. Staat de grote wijzer op de 6? Dan is het half. Bij half kijk je naar het volgende uur!' : L === 7 ? "Na 12 uur 's middags tel je door: 1 uur 's middags is 13:00, 2 uur is 14:00." : L >= 8 ? 'Elk cijfer is 5 minuten. Tel van het laatste cijfer de kleine streepjes erbij.' : `De grote wijzer staat op de ${m / 5 || 12}. Elk cijfer is 5 minuten. Tel in sprongen van 5.`,
    explanation: L === 7 ? `Het is ${hm(hh, m)}.` : `Het is ${L >= 8 ? hm(h, m) : timeWords(h, m)}${L >= 4 && L < 8 ? ` (${hm(h, m)})` : ''}.`, key: 'clk' + h + m + L };
};
G.clockset = (L, r) => {
  const h = ri(1, 11, r);
  const m = L === 1 ? 0 : L === 2 ? pick([0, 30, 30], r) : L === 3 ? pick([15, 30, 45], r) : 5 * ri(1, 11, r);
  const stepM = L <= 2 ? 30 : L === 3 ? 15 : 5;
  const digital = L >= 7 || (L >= 6 && r() < .5), H24 = h + (r() < .5 ? 12 : 0);
  const label = digital ? hm(H24, m) : timeWords(h, m);
  return { kind: 'clockset', title: `Zet de klok op ${label}`, h, m, stepM, label, cells: [], init: () => ({ h: 12, m: 0 }),
    spoken: `Zet de klok op ${label}. Draai de kleine wijzer en de grote wijzer met de knoppen.`,
    hint: m === 0 ? 'Bij een heel uur staat de grote wijzer op de 12.' : m === 30 ? `Bij half staat de grote wijzer op de 6. Half ${nextH(h)} is een half uur vóór ${nextH(h)} uur, dus de kleine wijzer staat tussen de ${h} en de ${nextH(h)}.` : `De grote wijzer: elk cijfer is 5 minuten. ${m} minuten is de ${m / 5}.${digital && H24 > 12 ? ` En ${H24} uur is ${h} uur 's middags.` : ''}`,
    explanation: digital ? `${label} is ${timeWords(h, m)}.` : `${label} is ${hm(h, m)} op de klok.`, key: 'cs' + h + m + digital, solution: { h, m } };
};
G.duration = (L, r) => {
  const act = pick(['De film', 'De voetbaltraining', 'Het verjaardagsfeest', 'De zwemles', 'De treinreis'], r);
  if (L <= 7) {
    const sh = ri(7, 15, r), sm = L === 4 ? pick([0, 30], r) : L === 5 ? pick([0, 15, 30, 45], r) : 5 * ri(0, 11, r);
    const d = L === 4 ? pick([30, 60, 90], r) : L === 5 ? pick([45, 75, 90, 105], r) : L === 6 ? pick([35, 50, 65, 85, 110], r) : 5 * ri(25, 45, r);
    const end = sh * 60 + sm + d, eh = Math.floor(end / 60), em = end % 60;
    const text = `${act} begint om ${hm(sh, sm)} en duurt ${d} minuten. Hoe laat is het dan afgelopen?`;
    return { kind: 'duration', title: 'Hoe laat is het dan?', text, tokens: [{ cell: 'h' }, ':', { cell: 'm' }], cells: [{ id: 'h', answer: eh }, { id: 'm', answer: em }], spoken: text,
      hint: 'Een uur heeft 60 minuten. Tel eerst door tot het volgende hele uur, en tel dan de rest erbij.', explanation: `${hm(sh, sm)} + ${d} minuten = ${hm(eh, em)}.`, key: 'dur' + sh + sm + d };
  }
  if (L === 8) {
    const sh = ri(8, 18, r), sm = 5 * ri(0, 11, r), d = 5 * ri(20, 50, r), end = sh * 60 + sm + d;
    const text = `${act} begint om ${hm(sh, sm)} en is afgelopen om ${hm(Math.floor(end / 60), end % 60)}. Hoe lang duurt het?`;
    return { kind: 'duration', title: 'Hoe lang duurt het?', text, tokens: [{ cell: 'h' }, 'uur en', { cell: 'm' }, 'minuten'], cells: [{ id: 'h', answer: Math.floor(d / 60) }, { id: 'm', answer: d % 60 }], spoken: text,
      hint: `Tel eerst door tot het volgende hele uur. Tel dan de hele uren, en daarna de minuten die nog over zijn.`, explanation: `Het duurt ${Math.floor(d / 60)} uur en ${d % 60} minuten (${d} minuten).`, key: 'dur8' + sh + sm + d };
  }
  if (L === 9) {
    const t = pick(['h2m', 'm2hm', 'd2h'], r);
    if (t === 'h2m') { const hh = ri(1, 6, r) + pick([0, .5, .25, .75], r); return { kind: 'duration', title: 'Reken de tijd om', text: null, tokens: [hh, 'uur =', { cell: 'x' }, 'minuten'], dec: true, cells: [{ id: 'x', answer: hh * 60 }], spoken: `Hoeveel minuten is ${F(hh)} uur?`, hint: 'Een uur is 60 minuten. Een half uur is 30 minuten, een kwartier 15.', explanation: `${F(hh)} × 60 = ${hh * 60} minuten.`, key: 'h2m' + hh }; }
    if (t === 'm2hm') { const mm = ri(70, 400, r); return { kind: 'duration', title: 'Reken de tijd om', text: null, tokens: [mm, 'minuten =', { cell: 'h' }, 'uur en', { cell: 'm' }, 'minuten'], cells: [{ id: 'h', answer: Math.floor(mm / 60) }, { id: 'm', answer: mm % 60 }], spoken: `Hoeveel uur en minuten is ${mm} minuten?`, hint: 'Hoe vaak past 60 in dit getal? Wat er overblijft zijn de minuten.', explanation: `${mm} minuten = ${Math.floor(mm / 60)} uur en ${mm % 60} minuten.`, key: 'm2hm' + mm }; }
    const dd = ri(1, 6, r) + pick([0, .5, .25], r); return { kind: 'duration', title: 'Reken de tijd om', text: null, tokens: [dd, 'dagen =', { cell: 'x' }, 'uur'], dec: true, cells: [{ id: 'x', answer: dd * 24 }], spoken: `Hoeveel uur is ${F(dd)} dagen?`, hint: 'Een dag heeft 24 uur. Een halve dag is 12 uur, een kwart dag 6 uur.', explanation: `${F(dd)} × 24 = ${dd * 24} uur.`, key: 'd2h' + dd };
  }
  if (L === 10) {
    const sh = ri(20, 23, r), sm = 5 * ri(0, 11, r), d = 5 * ri(30, 80, r), end = (sh * 60 + sm + d) % 1440;
    const text = `Je vertrekt om ${hm(sh, sm)} voor een nachtvlucht. De reis duurt ${Math.floor(d / 60)} uur en ${d % 60} minuten. Hoe laat kom je aan?`;
    return { kind: 'duration', title: 'Over middernacht', text, tokens: [{ cell: 'h' }, ':', { cell: 'm' }], cells: [{ id: 'h', answer: Math.floor(end / 60) }, { id: 'm', answer: end % 60 }], spoken: text,
      hint: 'Om middernacht begint de klok weer bij 0:00. Tel eerst door tot 24:00 en ga daarna verder vanaf 0:00.', explanation: `Je komt aan om ${hm(Math.floor(end / 60), end % 60)}.`, key: 'mid' + sh + sm + d };
  }
  const s = pick([12, 15, 18, 24, 30, 60, 80, 90, 120], r);
  if (L === 11) {
    const mins = pick([10, 15, 20, 30, 40, 45, 90], r), km = s * mins / 60;
    if (!Number.isInteger(km)) return G.duration(12, r);
    const veh = s >= 60 ? 'Een trein' : 'Een fietser';
    const text = `${veh} rijdt ${s} km per uur. Hoeveel minuten doet hij over ${km} km?`;
    return { kind: 'duration', title: 'Snelheid', text, tokens: [{ cell: 'x' }, 'minuten'], cells: [{ id: 'x', answer: mins }], spoken: text, hint: `In 60 minuten gaat hij ${s} km. Welk deel van ${s} is ${km}? Dat deel van 60 minuten.`, explanation: `${km} km is ${km}/${s} van ${s} km, dus ${mins} minuten.`, key: 'spd' + s + km };
  }
  const hh = ri(1, 3, r), mm = pick([0, 15, 20, 30, 40, 45], r), km = s * (hh * 60 + mm) / 60;
  if (!Number.isInteger(km)) return G.duration(11, r);
  const text = `Een ${s >= 60 ? 'auto' : 'fietser'} rijdt ${s} km per uur. Hoe ver komt hij in ${hh} uur${mm ? ' en ' + mm + ' minuten' : ''}?`;
  return { kind: 'duration', title: 'Snelheid', text, tokens: [{ cell: 'x' }, 'km'], cells: [{ id: 'x', answer: km }], spoken: text, hint: `In een uur ${s} km. Reken eerst de hele uren, en dan het deel van een uur.`, explanation: `${hh} × ${s} = ${hh * s} km${mm ? `, plus ${mm}/60 van ${s} = ${s * mm / 60} km. Samen ${km} km` : ''}.`, key: 'spd2' + s + hh + mm };
};

/* ================= NIEUWE SOORTEN (groep 5 t/m 8) ================= */

/* Cijferen: optellen en aftrekken onder elkaar, cijfer voor cijfer van rechts naar links */
G.column = (L, r) => {
  const op = r() < .5 ? '+' : MIN, S = L >= 9 ? 100 : 1;
  const nd = [0, 0, 0, 0, 3, 3, 4, 5, 4][Math.min(L, 9) - 1] || 3;
  const lim = 10 ** nd;
  let x, y, top, bot, res, tries = 0;
  const carries = (a, b) => { let c = 0, k = 0; while (a || b) { if (op === '+' ? (a % 10 + b % 10 + c >= 10) : (a % 10 < b % 10 + c)) { k++; c = 1; } else c = 0; a = Math.floor(a / 10); b = Math.floor(b / 10); } return k; };
  do {
    x = ri(lim / 10 * 1.2, lim * .6, r); y = ri(lim / 10, lim - x - 1, r);
    if (op === '+') { top = x; bot = y; res = x + y; } else { top = x + y; bot = y; res = x; }
    tries++;
  } while (tries < 50 && carries(top, bot) < (L === 5 ? 1 : 2));
  const pad = S > 1 ? 3 : 1, rs = String(res).padStart(pad, '0'), w = Math.max(String(top).length, String(bot).length, rs.length);
  const cells = []; for (let i = 0; i < rs.length; i++) cells.push({ id: 'd' + i, answer: Number(rs[rs.length - 1 - i]) });
  const show = v => S > 1 ? F(v / S) : F(v);
  return { kind: 'column', title: op === '+' ? 'Cijferend optellen' : 'Cijferend aftrekken', op, top, bot, res, w, S, cells, order: 'rtl',
    spoken: `Reken onder elkaar uit: ${show(top)} ${op === '+' ? 'plus' : 'min'} ${show(bot)}. Begin rechts.`,
    hint: op === '+' ? 'Begin rechts. Is het samen 10 of meer? Schrijf de eenheden op en onthoud 1 voor de kolom links.' : 'Begin rechts. Is het bovenste cijfer te klein? Leen 1 van de kolom links: dan heb je er 10 bij.',
    explanation: `${show(top)} ${op} ${show(bot)} = ${show(res)}.`, key: 'col' + top + op + bot };
};

/* Afronden met een stukje getallenlijn als hulp */
const UNIT = { 10: 'tientallen', 100: 'honderdtallen', 1000: 'duizendtallen', 10000: 'tienduizendtallen', 100000: 'honderdduizendtallen' };
G.round = (L, r) => {
  let N, U, S = 1, name;
  for (let t = 0; t < 50; t++) {
    if (L <= 6) { U = pick([10, 100], r); N = ri(101, 989, r); }
    else if (L === 7) { U = pick([100, 1000], r); N = ri(1001, 9989, r); }
    else if (L === 8) { U = pick([1000, 10000], r); N = ri(10001, 99989, r); }
    else if (L === 9) { S = 10; U = 10; N = ri(11, 999, r); }
    else if (L === 10) { S = 100; U = 10; N = ri(101, 9999, r); }
    else { U = pick([10000, 100000], r); N = ri(100001, 999999, r); }
    if (N % U) break;
  }
  name = S === 10 ? 'een heel getal' : S === 100 ? 'één cijfer achter de komma' : UNIT[U];
  const lo = Math.floor(N / U) * U, hi = lo + U, ans = Math.round(N / U) * U;
  return { kind: 'round', title: `Rond af op ${name}`, N: N / S, lo: lo / S, hi: hi / S, mid: (lo + U / 2) / S, frac: (N - lo) / U, dec: S > 1, tokens: [N / S, '≈', { cell: 'x' }], cells: [{ id: 'x', answer: q3(ans / S) }],
    spoken: `Rond ${F(N / S)} af op ${name}. Ligt het dichter bij ${F(lo / S)} of bij ${F(hi / S)}?`,
    hint: `${F(N / S)} ligt tussen ${F(lo / S)} en ${F(hi / S)}. Het midden is ${F((lo + U / 2) / S)}. Ligt het getal op het midden of erboven? Dan rond je naar boven af.`,
    explanation: `${F(N / S)} ligt het dichtst bij ${F(ans / S)}.`, key: 'rnd' + N + U + S };
};

/* Verdeelstrategie: 8 × 36 = 8 × 30 + 8 × 6 (rechthoekmodel) */
G.split = (L, r) => {
  let rows, cols;
  if (L <= 6) { const a = ri(3, 9, r), b = ri(12, 49, r); rows = [a]; cols = [b - b % 10, b % 10 || 5]; }
  else if (L === 7) { const a = ri(3, 9, r); cols = [100 * ri(1, 3, r), 10 * ri(1, 9, r), ri(1, 9, r)]; rows = [a]; }
  else { const a = ri(12, L === 8 ? 19 : 59, r), b = ri(21, 79, r); rows = [a - a % 10, a % 10 || 3]; cols = [b - b % 10, b % 10 || 4]; }
  const A = rows.reduce((s, v) => s + v, 0), B = cols.reduce((s, v) => s + v, 0);
  const cells = []; rows.forEach((rv, i) => cols.forEach((cv, j) => cells.push({ id: `p${i}${j}`, answer: rv * cv })));
  cells.push({ id: 'tot', answer: A * B });
  return { kind: 'split', title: `${A} × ${B} in stukjes`, A, B, rows, cols, cells,
    spoken: `Reken ${A} keer ${B} uit in stukjes. Vul elk vak van de rechthoek in en tel ze daarna op.`,
    hint: `Elk vak is het getal links keer het getal erboven. Bijvoorbeeld ${rows[0]} × ${cols[0]} = ${rows[0] * cols[0]}.`,
    explanation: cells.slice(0, -1).map(c => F(c.answer)).join(' + ') + ` = ${F(A * B)}.`, key: 'split' + A + 'x' + B };
};

/* Delen met rest, en de rest betekenis geven */
G.rest = (L, r) => {
  let d, q, rem;
  if (L <= 7) { d = ri(3, 9, r); q = ri(5, 12, r); }
  else if (L === 8) { d = ri(3, 9, r); q = ri(21, 99, r); }
  else { d = ri(12, 59, r); q = ri(Math.ceil(100 / d), 9, r); }
  rem = ri(1, d - 1, r); const N = d * q + rem;
  if (L >= 10) {
    const t = pick(['bus', 'box', 'left'], r); let text, ans, hint, expl;
    const N2 = ri(80, 400, r), k = ri(6, 30, r), qq = Math.floor(N2 / k), rr = N2 % k || 1, NN = qq * k + rr;
    if (t === 'bus') { text = `Er gaan ${NN} supporters mee naar de wedstrijd. In één busje passen ${k} mensen. Hoeveel busjes zijn er nodig?`; ans = qq + 1; hint = 'Deel, en kijk naar de rest. Blijven er mensen over? Die hebben ook een busje nodig!'; expl = `${NN} : ${k} = ${qq} rest ${rr}. Dus ${ans} busjes.`; }
    else if (t === 'box') { text = `Een boer heeft ${NN} eieren. In een doos passen ${k} eieren. Hoeveel dozen kan hij helemaal vullen?`; ans = qq; hint = 'Deel, en kijk naar de rest. Een doos die niet vol is, telt niet mee.'; expl = `${NN} : ${k} = ${qq} rest ${rr}. Dus ${qq} volle dozen.`; }
    else { text = `${NN} kinderen worden verdeeld in teams van ${k}. Hoeveel kinderen blijven er over?`; ans = rr; hint = 'Hoe vaak past het team in het aantal kinderen? Wat er overblijft is de rest.'; expl = `${NN} : ${k} = ${qq} rest ${rr}.`; }
    return { kind: 'story', title: 'Delen met rest', text, cells: [{ id: 'x', answer: ans }], spoken: text, hint, explanation: expl, key: 'restS' + text };
  }
  return { kind: 'rest', title: 'Delen met rest', tokens: [N, ':', d, '=', { cell: 'q' }, 'rest', { cell: 'r' }], cells: [{ id: 'q', answer: q }, { id: 'r', answer: rem }],
    spoken: `Hoeveel is ${F(N)} gedeeld door ${d}? En hoeveel blijft er over?`,
    hint: `Hoe vaak past ${d} in ${F(N)}? ${d} × ${q} = ${F(d * q)}. Wat blijft er over?`, explanation: `${d} × ${q} = ${F(d * q)}, en ${F(N)} ${MIN} ${F(d * q)} = ${rem}. Dus ${F(N)} : ${d} = ${q} rest ${rem}.`, key: 'rest' + N + d };
};

/* Ordenen: breuken, kommagetallen en procenten van klein naar groot */
const ORD = [
  [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 8], [1, 10], [2, 3], [3, 4]],
  ['0,5', '0,25', '0,75', '0,05', '0,6', '0,45', '0,2', '0,9'],
  [[3, 4], '0,7', [1, 2], '0,45', [2, 5], '0,3', [1, 4], '0,8'],
  ['40%', [1, 2], '0,35', [3, 5], '25%', '0,9', [1, 5], '65%'],
  ['0,8', '0,75', '0,125', '0,08', '0,5', '0,45', '0,705', '0,7'],
  [[2, 3], [5, 8], '0,6', '65%', [11, 20], '0,7', [3, 8], '45%']
];
const valOf = it => Array.isArray(it) ? it[0] / it[1] : it.endsWith('%') ? parseFloat(it) / 100 : parseFloat(it.replace(',', '.'));
G.order = (L, r) => {
  const pool = ORD[Math.min(Math.max(L, 7), 12) - 7];
  let items;
  for (let t = 0; t < 100; t++) { items = sample(pool, 4, r); const v = items.map(valOf); if (new Set(v.map(x => q3(x))).size === 4) break; }
  const vals = items.map(valOf), sorted = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
  return { kind: 'order', title: 'Zet op volgorde: van klein naar groot', items, vals, cells: [], init: () => ({ order: [] }), solution: { order: sorted },
    spoken: 'Tik de getallen aan van klein naar groot. Begin met het kleinste.',
    hint: 'Maak er eerst allemaal kommagetallen van. Een half is 0,5 en een kwart is 0,25. Procenten deel je door 100: 40% is 0,40.',
    explanation: 'Van klein naar groot: ' + sorted.map(i => Array.isArray(items[i]) ? items[i].join('/') : items[i]).join(' < ') + '.', key: 'ord' + JSON.stringify(items) };
};

/* Gelijkwaardige breuken, vereenvoudigen en gemengde getallen */
G.equiv = (L, r) => {
  let a, b, k;
  do { b = ri(2, 9, r); a = ri(1, b - 1, r); } while (gcd(a, b) !== 1);
  if (L <= 7) { k = ri(2, 5, r); return { kind: 'equiv', title: 'Maak de breuken gelijk', tokens: [{ frac: [a, b] }, '=', { fracCells: ['num', b * k] }], cells: [{ id: 'num', answer: a * k }], spoken: `Maak de breuken gelijk. Onder de streep staat nu ${b * k}. Wat moet er boven de streep?`, hint: `Onder de streep ging ${b} naar ${b * k}: dat is keer ${k}. Doe boven de streep ook keer ${k}.`, explanation: `${a}/${b} = ${a * k}/${b * k}.`, key: 'eq7' + a + b + k }; }
  if (L === 8) { k = ri(2, 6, r); return { kind: 'equiv', title: 'Maak de breuk zo eenvoudig mogelijk', tokens: [{ frac: [a * k, b * k] }, '=', { fracCells: ['num', 'den'] }], cells: [{ id: 'num', answer: a }, { id: 'den', answer: b }], spoken: `Maak de breuk ${a * k} op ${b * k} zo eenvoudig mogelijk.`, hint: `Zoek een getal waardoor je zowel ${a * k} als ${b * k} kunt delen. Ga door tot het niet meer kan.`, explanation: `${a * k}/${b * k} = ${a}/${b} (boven en onder gedeeld door ${k}).`, key: 'eq8' + a + b + k }; }
  const w = ri(1, 4, r), n = w * b + a;
  if (L === 9) return { kind: 'equiv', title: 'Schrijf als gemengd getal', tokens: [{ frac: [n, b] }, '=', { mixed: ['w', 'num', b] }], cells: [{ id: 'w', answer: w }, { id: 'num', answer: a }], spoken: `Schrijf ${n} ${fracWord(1, b)} als een heel getal met een breuk.`, hint: `Hoe vaak past ${b} in ${n}? Dat zijn de helen. Wat er overblijft komt boven de streep.`, explanation: `${n}/${b} = ${w} ${a}/${b}, want ${w} × ${b} = ${w * b} en ${n} ${MIN} ${w * b} = ${a}.`, key: 'eq9' + n + b };
  return { kind: 'equiv', title: 'Schrijf als één breuk', tokens: [{ mixedGiven: [w, a, b] }, '=', { fracCells: ['num', b] }], cells: [{ id: 'num', answer: n }], spoken: `Schrijf ${w} en ${a} ${fracWord(a, b)} als één breuk.`, hint: `Eén heel is ${b}/${b}. Hoeveel ${fracWord(1, b)} zitten er in ${w} helen? Tel er ${a} bij.`, explanation: `${w} ${a}/${b} = ${w * b}/${b} + ${a}/${b} = ${n}/${b}.`, key: 'eq10' + w + a + b };
};

/* Breuk, kommagetal en procent omzetten */
const CONV = [
  [[1, 2], [1, 4], [3, 4], [1, 10], [3, 10], [7, 10], [9, 10]],
  [[1, 5], [2, 5], [3, 5], [4, 5], [1, 20], [1, 4], [3, 4]],
  [[3, 20], [9, 20], [1, 25], [3, 25], [7, 20], [2, 5], [1, 50]],
  [[1, 8], [3, 8], [5, 8], [7, 8], [3, 40], [1, 8], [3, 8]]
];
G.convert = (L, r) => {
  const [a, b] = pick(CONV[Math.min(Math.max(L, 9), 12) - 9], r), v = a / b, giv = pick(['f', 'd', 'p'], r);
  const cells = [];
  if (giv !== 'f') cells.push({ id: 'fn', answer: a }, { id: 'fd', answer: b });
  if (giv !== 'd') cells.push({ id: 'd', answer: q3(v) });
  if (giv !== 'p') cells.push({ id: 'p', answer: q3(v * 100) });
  return { kind: 'convert', title: 'Breuk, kommagetal en procent', a, b, v, giv, dec: true, cells,
    checkFn: vals => { const bad = []; if (giv !== 'f') { const n = Number(vals.fn), d = Number(vals.fd); if (!(d > 0) || Math.abs(n / d - v) > 1e-9) bad.push('fn', 'fd'); } for (const c of cells) if ((c.id === 'd' || c.id === 'p') && Math.abs(Number(String(vals[c.id] ?? '').replace(',', '.')) - c.answer) > 1e-6) bad.push(c.id); return bad; },
    spoken: `Vul de tabel in. Schrijf hetzelfde getal als breuk, als kommagetal en als procent.`,
    hint: 'Procent betekent "van de honderd". Maak er een breuk van met 100 onder de streep: 1/4 = 25/100 = 0,25 = 25%.',
    explanation: `${a}/${b} = ${F(v)} = ${F(v * 100)}%.`, key: 'conv' + a + b + giv };
};

/* Verhoudingstabel */
G.ratio = (L, r) => {
  let rowA, rowB, base, mults, rate, unitDec = false, ctx;
  const LL = Math.min(Math.max(L, 7), 12);
  if (LL === 7) { const p = ri(2, 9, r); ctx = ['pakken', 'euro']; base = 1; rate = p; mults = sample([2, 3, 4, 5, 10], 3, r); }
  else if (LL === 8) { const g = 50 * ri(2, 12, r); ctx = ['personen', 'gram meel']; base = 4; rate = g / 4; mults = sample([.5, 2, 3, 5], 3, r); }
  else if (LL === 9) { const tot = pick([10, 12, 6, 15, 9], r) * 100; ctx = ['kaartjes', 'euro']; base = 4; rate = tot / 400; mults = sample([.25, .5, 1.5, 2.5, 3], 3, r); unitDec = true; }
  else if (LL === 10) { const s = pick([12, 16, 20, 24, 40, 80], r); ctx = ['minuten', 'km']; base = 60; rate = s / 60; mults = sample([.25, .5, 1.5, 2, 3], 3, r); }
  else if (LL === 11) { const k = pick([500, 1000, 2500, 5000], r); ctx = ['cm op de kaart', 'meter in het echt']; base = 1; rate = k / 100; mults = sample([2, 3, 4.5, 6, 8], 3, r); unitDec = true; }
  else { const p = 5 * ri(20, 90, r); ctx = ['flessen', 'euro']; base = 3; rate = p / 100; mults = sample([1 / 3, 2 / 3, 2, 10 / 3, 4], 3, r); unitDec = true; }
  const tops = [base, ...mults.map(m => q3(base * m))];
  rowA = tops; rowB = tops.map(t => q3(t * rate));
  const cols = rowA.length, cells = [];
  const topBlank = LL >= 9 ? ri(1, cols - 1, r) : -1;
  for (let i = 1; i < cols; i++) { if (i === topBlank) cells.push({ id: 'a' + i, answer: rowA[i] }); else cells.push({ id: 'b' + i, answer: rowB[i] }); }
  const one = { pakken: 'pak', personen: 'personen', kaartjes: 'kaartjes', minuten: 'minuten', flessen: 'flessen' }[ctx[0]] || ctx[0];
  const money = ctx[1] === 'euro', FM = v => money && !Number.isInteger(v) ? v.toFixed(2).replace('.', ',') : F(v);
  const title = { 7: 'Verhoudingstabel: prijzen', 8: 'Verhoudingstabel: recept', 9: 'Verhoudingstabel: via 1', 10: 'Verhoudingstabel: snelheid', 11: 'Verhoudingstabel: schaal', 12: 'Verhoudingstabel' }[LL];
  return { kind: 'ratio', title, ctx, rowA, rowB, topBlank, money, dec: LL >= 9, cells,
    spoken: `Verhoudingstabel. ${rowA[0]} ${rowA[0] === 1 ? one : ctx[0]} hoort bij ${FM(rowB[0])} ${ctx[1]}. Vul de lege vakjes in.`,
    hint: `Wat doe je in de bovenste rij om van ${F(rowA[0])} naar het volgende getal te gaan? Doe hetzelfde in de onderste rij. Lastig? Reken eerst uit wat er bij 1 hoort.`,
    explanation: `Elke kolom is even veel keer zo groot: ` + rowA.map((a, i) => `${F(a)} → ${FM(rowB[i])}`).join(', ') + '.', key: 'ratio' + LL + rowA + rowB };
};

/* Breuken optellen en aftrekken */
G.fracadd = (L, r) => {
  let a, b, c, d, op = r() < .5 ? '+' : MIN;
  const LL = Math.min(Math.max(L, 10), 12);
  let N, D;
  for (let t = 0; t < 200; t++) {
    if (LL === 10) { b = d = ri(3, 12, r); a = ri(1, b - 1, r); c = ri(1, b - 1, r); }
    else if (LL === 11) { b = ri(2, 6, r); d = b * ri(2, 3, r); a = ri(1, b - 1, r); c = ri(1, d - 1, r); }
    else { b = ri(2, 6, r); d = ri(2, 6, r); a = ri(1, b - 1, r); c = ri(1, d - 1, r); }
    if (gcd(a, b) !== 1 || gcd(c, d) !== 1 || (b === d && LL === 12)) continue;
    D = b === d ? b : b * d / gcd(b, d); N = op === '+' ? a * (D / b) + c * (D / d) : a * (D / b) - c * (D / d);
    if (N > 0 && N !== D && (LL === 12 || N < D)) break;
  }
  const g = gcd(N, D), val = N / D;
  return { kind: 'fracadd', title: op === '+' ? 'Breuken optellen' : 'Breuken aftrekken', tokens: [{ frac: [a, b] }, op, { frac: [c, d] }, '=', { fracCells: ['num', 'den'] }], cells: [{ id: 'num', answer: N / g }, { id: 'den', answer: D / g }],
    checkFn: vals => { const n = Number(vals.num), dd = Number(vals.den); return dd > 0 && Math.abs(n / dd - val) < 1e-9 ? [] : ['num', 'den']; },
    spoken: `Hoeveel is ${fracSay(a, b)} ${op === '+' ? 'plus' : 'min'} ${fracSay(c, d)}?`,
    hint: b === d ? 'De noemers (onder de streep) zijn gelijk. Reken alleen met de getallen boven de streep.' : `Maak de breuken gelijknamig: zoek een getal dat in de tafel van ${b} én van ${d} zit.`,
    explanation: `${b === d ? '' : `${a}/${b} = ${a * D / b}/${D} en ${c}/${d} = ${c * D / d}/${D}. `}${a}/${b} ${op} ${c}/${d} = ${N}/${D}${g > 1 ? ` = ${N / g}/${D / g}` : ''}.`, key: 'fa' + a + b + op + c + d };
};

/* Maten omrekenen met de maten-trap */
const LADDERS = {
  len: { u: ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'], f: 10, name: 'lengte' },
  mass: { u: ['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg'], f: 10, name: 'gewicht' },
  vol: { u: ['kl', 'hl', 'dal', 'l', 'dl', 'cl', 'ml'], f: 10, name: 'inhoud' },
  area: { u: ['km²', 'hm²', 'dam²', 'm²', 'dm²', 'cm²', 'mm²'], f: 100, name: 'oppervlakte' },
  cube: { u: ['m³', 'dm³', 'cm³'], f: 1000, name: 'inhoud' }
};
G.metric = (L, r) => {
  const pairs = {
    6: [['len', 'm', 'cm', 'i'], ['mass', 'kg', 'g', 'i'], ['vol', 'l', 'ml', 'i'], ['len', 'cm', 'm', 'i'], ['mass', 'g', 'kg', 'i']],
    7: [['len', 'km', 'm', 'i'], ['len', 'cm', 'mm', 'i'], ['vol', 'l', 'dl', 'i'], ['len', 'm', 'dm', 'i'], ['vol', 'cl', 'l', 'i'], ['len', 'mm', 'cm', 'i']],
    8: [['len', 'm', 'cm', 'd'], ['mass', 'kg', 'g', 'd'], ['mass', 'g', 'kg', 'd'], ['vol', 'l', 'ml', 'd'], ['len', 'km', 'm', 'd']],
    9: [['len', 'km', 'm', 'd2'], ['len', 'cm', 'm', 'd'], ['vol', 'ml', 'l', 'd'], ['vol', 'l', 'cl', 'd'], ['len', 'mm', 'm', 'd'], ['mass', 'g', 'kg', 'd']],
    10: [['area', 'm²', 'dm²', 'i'], ['area', 'dm²', 'cm²', 'i'], ['area', 'm²', 'cm²', 'i'], ['area', 'cm²', 'dm²', 'd'], ['area', 'm²', 'dm²', 'd']],
    11: [['cube', 'm³', 'dm³', 'd'], ['cube', 'dm³', 'cm³', 'd'], ['cube', 'cm³', 'dm³', 'd'], ['litre', 'dm³', 'l', 'i'], ['litre', 'm³', 'l', 'd']],
  };
  const LL = Math.min(L, 12) === 12 ? pick([8, 9, 10, 11], r) : Math.max(6, L);
  const [lad, from, to, kind] = pick(pairs[LL], r);
  let factor, ladder;
  if (lad === 'litre') { ladder = LADDERS.cube; factor = from === 'm³' ? 1000 : 1; }
  else { ladder = LADDERS[lad]; const i = ladder.u.indexOf(from), j = ladder.u.indexOf(to); factor = ladder.f ** (j - i); }
  let v;
  if (kind === 'i') v = factor >= 1 ? ri(2, 25, r) : Math.round(ri(2, 40, r) / factor);
  else if (kind === 'd') v = factor >= 1 ? ri(11, 99, r) / 10 : ri(15, 950, r);
  else v = ri(101, 999, r) / 100;
  const ans = q3(v * factor);
  const toLitre = lad === 'litre';
  return { kind: 'metric', title: `Reken om: ${(LADDERS[lad] || LADDERS.cube).name}`, lad, from, to, ladder: toLitre ? null : ladder.u, f: ladder.f, tokens: [v, from, '=', { cell: 'x' }, to], dec: true, cells: [{ id: 'x', answer: ans }],
    spoken: `Hoeveel ${to} is ${F(v)} ${from}?`,
    hint: toLitre ? '1 dm³ is precies 1 liter. 1 m³ is 1000 dm³, dus 1000 liter.' : `Op de trap is elke tree ${ladder.f === 10 ? '10' : ladder.f === 100 ? '100' : '1000'} keer zo veel. Ga je naar beneden, dan doe je keer. Ga je naar boven, dan doe je gedeeld door.`,
    explanation: `${F(v)} ${from} = ${F(ans)} ${to}.`, key: 'met' + v + from + to };
};

/* Omtrek, oppervlakte en inhoud */
G.area = (L, r) => {
  const LL = Math.min(Math.max(L, 6), 12);
  if (LL === 6 || LL === 8) {
    const W = ri(3, 9, r), H = ri(2, 6, r);
    let cut = null; if (LL === 8) cut = [ri(1, W - 2, r), ri(1, H - 1, r)];
    const area = W * H - (cut ? cut[0] * cut[1] : 0), per = 2 * (W + H);
    return { kind: 'area', title: 'Omtrek en oppervlakte', mode: 'grid', W, H, cut, unit: 'cm', cells: [{ id: 'o', answer: per }, { id: 'a', answer: area }],
      spoken: 'Elk hokje is 1 bij 1 centimeter. Hoe lang is de rand van de figuur, en hoeveel hokjes is hij groot?',
      hint: 'De omtrek is de lengte van de hele rand: tel alle zijden op. De oppervlakte is het aantal hokjes binnen de figuur.' + (cut ? ' Tip: deze L-vorm heeft dezelfde omtrek als de hele rechthoek.' : ''),
      explanation: `Omtrek ${per} cm, oppervlakte ${area} cm².`, key: 'ar' + W + H + cut };
  }
  if (LL === 7 || LL === 9) {
    const W = LL === 9 ? ri(2, 9, r) + .5 : ri(5, 20, r), H = ri(3, 12, r);
    return { kind: 'area', title: 'Omtrek en oppervlakte', mode: 'rect', W, H, unit: 'm', dec: LL === 9, cells: [{ id: 'o', answer: q3(2 * (W + H)) }, { id: 'a', answer: q3(W * H) }],
      spoken: `Een tuin is ${F(W)} meter lang en ${H} meter breed. Wat is de omtrek? En wat is de oppervlakte?`,
      hint: 'Omtrek: tel de vier zijden op (twee keer de lengte en twee keer de breedte). Oppervlakte: lengte keer breedte.',
      explanation: `Omtrek: 2 × ${F(W)} + 2 × ${H} = ${F(2 * (W + H))} m. Oppervlakte: ${F(W)} × ${H} = ${F(W * H)} m².`, key: 'ar' + W + H };
  }
  if (LL === 10 || LL === 11) {
    let l, b, h; do { l = ri(2, 10, r) * (LL === 11 ? 5 : 1); b = ri(2, 8, r) * (LL === 11 ? 5 : 1); h = ri(2, 6, r) * (LL === 11 ? 2 : 1); } while (LL === 11 && (l * b * h) % 100);
    const V = l * b * h;
    const cells = [{ id: 'v', answer: V }]; if (LL === 11) cells.push({ id: 'lit', answer: q3(V / 1000) });
    return { kind: 'area', title: LL === 11 ? 'Inhoud van een aquarium' : 'Inhoud van een doos', mode: 'box', l, b, h, unit: 'cm', dec: LL === 11, cells,
      spoken: `${LL === 11 ? 'Een aquarium' : 'Een doos'} is ${l} cm lang, ${b} cm breed en ${h} cm hoog. Wat is de inhoud?${LL === 11 ? ' En hoeveel liter is dat?' : ''}`,
      hint: 'Inhoud = lengte × breedte × hoogte. ' + (LL === 11 ? '1000 cm³ is precies 1 liter.' : 'Reken eerst de bodem uit (lengte × breedte), dan keer de hoogte.'),
      explanation: `${l} × ${b} × ${h} = ${F(V)} cm³${LL === 11 ? ` = ${F(V / 1000)} liter` : ''}.`, key: 'box' + l + b + h };
  }
  const W = ri(4, 15, r), H = ri(3, 12, r), A = W * H;
  return { kind: 'area', title: 'Terugrekenen', mode: 'rev', W, H, unit: 'm', cells: [{ id: 'b', answer: H }, { id: 'o', answer: 2 * (W + H) }],
    spoken: `Een rechthoekig veld heeft een oppervlakte van ${A} vierkante meter. Het is ${W} meter lang. Hoe breed is het? En wat is de omtrek?`,
    hint: `Lengte × breedte = oppervlakte. Welk getal keer ${W} is ${A}?`, explanation: `${A} : ${W} = ${H} m breed. Omtrek: 2 × ${W} + 2 × ${H} = ${2 * (W + H)} m.`, key: 'rev' + W + H };
};

/* Grafieken lezen en het gemiddelde */
const CHARTS = [
  { t: 'Lievelingsfruit in de klas', x: ['appel', 'peer', 'banaan', 'druif', 'kiwi'], u: 'kinderen' },
  { t: 'Gelezen boeken', x: ['jan', 'feb', 'mrt', 'apr', 'mei'], u: 'boeken' },
  { t: 'Bezoekers van de speeltuin', x: ['ma', 'di', 'wo', 'do', 'vr'], u: 'bezoekers' },
  { t: 'Gevonden schelpen', x: ['Sam', 'Noor', 'Daan', 'Lotte', 'Finn'], u: 'schelpen' }
];
G.graph = (L, r) => {
  const LL = Math.min(Math.max(L, 5), 12);
  const line = LL === 10 || LL === 11;
  const BIG = [{ t: 'Bezoekers van de speeltuin', x: ['ma', 'di', 'wo', 'do', 'vr'], u: 'bezoekers' }, { t: 'Verkochte ijsjes', x: ['ma', 'di', 'wo', 'do', 'vr'], u: 'ijsjes' }];
  const C = line ? { t: 'Temperatuur op een zomerdag', x: ['8:00', '10:00', '12:00', '14:00', '16:00'], u: 'graden' } : pick(LL === 8 || LL === 12 ? BIG : CHARTS, r);
  const n = LL === 5 ? 4 : 5;
  const stepV = { 5: 1, 6: 2, 7: 5, 8: 10, 9: 2, 10: 2, 11: 1, 12: 100 }[LL];
  const maxV = { 5: 10, 6: 20, 7: 50, 8: 200, 9: 20, 10: 30, 11: 30, 12: 1000 }[LL];
  const needMean = LL === 9 || LL >= 11;
  let vals;
  for (let t = 0; t < 300; t++) {
    if (line) { const st = ri(12, 18, r); vals = [st, st + ri(1, 4, r), st + ri(4, 8, r), st + ri(6, 10, r), st + ri(3, 7, r)]; }
    else vals = Array.from({ length: n }, () => stepV * ri(1, maxV / stepV, r));
    if (!needMean || vals.reduce((a, b) => a + b, 0) % n === 0) break;
  }
  const qs = [];
  const i1 = ri(0, n - 1, r); let i2 = ri(0, n - 1, r); if (i2 === i1) i2 = (i1 + 1) % n;
  const hi = Math.max(vals[i1], vals[i2]), lo = Math.min(vals[i1], vals[i2]), ih = vals[i1] >= vals[i2] ? i1 : i2, il = ih === i1 ? i2 : i1;
  const sum = vals.reduce((a, b) => a + b, 0), mean = sum / n;
  if (LL <= 6) { qs.push({ id: 'q1', q: `Hoeveel ${C.u} bij ${C.x[i1]}?`, answer: vals[i1] }, { id: 'q2', q: `Hoeveel meer bij ${C.x[ih]} dan bij ${C.x[il]}?`, answer: hi - lo }); }
  else if (LL <= 8) { qs.push({ id: 'q1', q: `Hoeveel ${C.u} bij ${C.x[i1]}?`, answer: vals[i1] }, { id: 'q2', q: `Hoeveel ${C.u} zijn het samen?`, answer: sum }); }
  else if (LL === 10) { qs.push({ id: 'q1', q: `Hoe warm was het om ${C.x[i1]}?`, answer: vals[i1] }, { id: 'q2', q: `Hoeveel graden verschil tussen ${C.x[il]} en ${C.x[ih]}?`, answer: hi - lo }); }
  else { qs.push({ id: 'q1', q: `Wat is het gemiddelde?`, answer: q3(mean) }, { id: 'q2', q: `Hoeveel verschil tussen de hoogste en de laagste?`, answer: Math.max(...vals) - Math.min(...vals) }); }
  return { kind: 'graph', title: C.t, chart: { x: C.x.slice(0, n), vals, stepV, maxV: Math.max(maxV, ...vals), u: C.u, line }, qs, cells: qs.map(q => ({ id: q.id, answer: q.answer })),
    spoken: `Bekijk de ${line ? 'grafiek' : 'staafgrafiek'}: ${C.t.toLowerCase()}. Beantwoord de vragen.`,
    hint: LL >= 9 && LL !== 10 ? `Het gemiddelde: tel alle getallen op en deel door hoeveel het er zijn (${n}).` : `Kijk waar de ${line ? 'lijn' : 'staaf'} eindigt en lees links het getal af. Elke lijn in de achtergrond is ${F(stepV)}.`,
    explanation: `De getallen zijn ${vals.map(F).join(', ')}.` + (LL >= 9 && LL !== 10 ? ` Samen ${F(sum)}, gedeeld door ${n} is ${F(mean)}.` : ''), key: 'gr' + vals.join() + i1 + i2 };
};
G.mean = (L, r) => {
  const LL = Math.min(Math.max(L, 9), 12);
  const name = pick(NAMES, r);
  if (LL === 12) { const n = 4, m = ri(5, 8, r), vals = Array.from({ length: n - 1 }, () => ri(m - 3, Math.min(10, m + 3), r)); const last = n * m - vals.reduce((a, b) => a + b, 0); if (last < 1 || last > 10) return G.mean(11, r);
    const text = `${name} heeft 4 toetsen gemaakt. Het gemiddelde cijfer is een ${m}. De eerste drie cijfers zijn ${vals.join(', ')}. Welk cijfer haalde ${name} voor de vierde toets?`;
    return { kind: 'story', title: 'Gemiddelde: terugrekenen', text, cells: [{ id: 'x', answer: last }], spoken: text, hint: `Bij een gemiddelde van ${m} over 4 toetsen zijn alle cijfers samen 4 × ${m} = ${4 * m}.`, explanation: `${4 * m} ${MIN} ${vals.reduce((a, b) => a + b, 0)} = ${last}.`, key: 'mean12' + vals + m }; }
  const n = LL === 11 ? 4 : pick([4, 5], r);
  let vals = Array.from({ length: n }, () => LL === 10 ? ri(120, 160, r) : ri(2, 20, r));
  if (LL !== 11) { const s = vals.reduce((a, b) => a + b, 0); vals[0] += (n - s % n) % n; }
  const mean = q3(vals.reduce((a, b) => a + b, 0) / n);
  const ctx = LL === 10 ? `De lengtes van ${n} kinderen in centimeter:` : `${name} speelde ${n} potjes. Dit waren de punten:`;
  return { kind: 'mean', title: 'Bereken het gemiddelde', ctx, vals, dec: LL === 11, cells: [{ id: 'x', answer: mean }],
    spoken: `${ctx} ${vals.join(', ')}. Wat is het gemiddelde?`, hint: `Tel alle getallen op. Deel daarna door ${n}, want het zijn ${n} getallen.`,
    explanation: `${vals.join(' + ')} = ${vals.reduce((a, b) => a + b, 0)}, en ${vals.reduce((a, b) => a + b, 0)} : ${n} = ${F(mean)}.`, key: 'mean' + vals };
};

/* ================= LEERLIJN: WELKE SOORT BIJ WELKE STAP ================= */
/* stap 1-2 = groep 3, 3-4 = groep 4, 5-6 = groep 5, 7-8 = groep 6, 9-10 = groep 7, 11-12 = groep 8 */
export const KINDS_BY_TOPIC = {
  add: [['sum', 1, 12], ['house', 1, 10], ['wall', 1, 10], ['line', 1, 12], ['mab', 1, 6], ['story', 1, 12], ['ktable', 2, 5], ['column', 5, 9], ['round', 6, 11]],
  tables: [['tsum', 1, 12], ['share', 1, 4], ['ktable', 1, 9], ['trow', 1, 8], ['story', 2, 12], ['split', 6, 9], ['rest', 7, 12]],
  fractions: [['fracbar', 1, 6], ['fracread', 1, 4], ['fracset', 3, 9], ['equiv', 7, 10], ['order', 7, 12], ['ratio', 7, 12], ['percent', 9, 12], ['convert', 9, 12], ['fracadd', 10, 12]],
  life: [['coins', 1, 8], ['change', 1, 10], ['clockread', 1, 8], ['clockset', 1, 7], ['duration', 4, 12], ['metric', 6, 12], ['area', 6, 12]],
  logic: [['jumps', 1, 12], ['shapes', 1, 12], ['sudoku', 1, 10], ['magic', 3, 12], ['triangle', 2, 8], ['graph', 5, 12], ['mean', 9, 12]]
};
export function kindsFor(topic, level) { return (KINDS_BY_TOPIC[topic] || KINDS_BY_TOPIC.add).filter(([, a, b]) => level >= a && level <= b).map(([k]) => k); }
export const groupOfStep = s => Math.min(8, 3 + Math.floor((lv(s) - 1) / 2));
export const stepRange = g => [2 * (g - 3) + 1, 2 * (g - 3) + 2];

function finish(p, topic, level) {
  p.topic = topic; p.level = level; p.cells = p.cells || [];
  p.dec = !!p.dec || p.cells.some(c => !Number.isInteger(c.answer));
  return p;
}
export function makePuzzle(topic, level, r = Math.random, avoid = []) {
  const L = lv(level);
  const kinds = kindsFor(topic, L), fresh = kinds.filter(k => !avoid.includes(k));
  const kind = pick(fresh.length ? fresh : kinds, r);
  return finish(G[kind](L, r, { topic }), topic, L);
}
export function makeKind(kind, topic, level, r = Math.random, o = {}) { return finish(G[kind](lv(level), r, { topic, ...o }), topic, lv(level)); }

export function tablePuzzle(table, factor, index, r = Math.random) {
  const t = table || ri(1, 10, r);
  if (index % 3 === 2) return finish(G.trow(3, r, { table: Math.max(2, t) }), 'tables', 1);
  return finish(G.tsum(1, r, { table: t, factor }), 'tables', 1);
}

export function quickPuzzle(type, levels, table = null, r = Math.random) {
  const L = t => lv(levels[t] || 1);
  if (type === 'plus' || type === 'minus') {
    const l = L('add'), roll = r();
    if (roll < .6 || l > 10) return finish(G.sum(l, r, { type }), 'add', l);
    if (roll < .8) return finish(G.line(l, r, { quick: true }), 'add', l);
    return finish(G.house(l, r, { quick: true }), 'add', l);
  }
  const lt = L('tables');
  if (type === 'times') { if (table || lt <= 6) return finish(G.tsum(1, r, { table: table || ri(1, 10, r) }), 'tables', lt); let p; for (let i = 0; i < 20; i++) { p = G.tsum(lt, r); if (p.tokens[1] === '×') break; } return finish(p, 'tables', lt); }
  if (type === 'divide') { let p; for (let i = 0; i < 20; i++) { p = G.tsum(lt, r); if (p.tokens[1] === ':') break; } return finish(p, 'tables', lt); }
  const lf = L('fractions');
  if (type === 'fractions') return finish(lf >= 9 ? G.percent(lf, r) : lf <= 2 ? G.fracread(1, r) : G.fracset(lf, r), 'fractions', lf);
  const ll = L('life');
  if (type === 'life') { const k = pick(ll >= 6 ? ['change', 'clockread', 'metric'] : ['change', 'clockread'], r); return finish(G[k === 'clockread' ? 'clockread' : k](Math.min(ll, k === 'clockread' ? 8 : 12), r), 'life', ll); }
  return finish(G.jumps(L('logic'), r, { quick: true }), 'logic', L('logic'));
}

/* ================= NAKIJKEN EN INVOER ================= */
const num = v => v === undefined || v === '' ? NaN : Number(String(v).replace(',', '.').replace(MIN, '-'));
const same = (a, b) => Math.abs(a - b) < 1e-6;
export function check(p, st) {
  const bad = [], filled = p.cells.every(c => (st.vals[c.id] ?? '') !== '' && !/^,|,$/.test(st.vals[c.id]));
  let xok = true, xready = true;
  if (p.kind === 'triangle') {
    const m = { ...p.given }; for (const c of p.cells) m[c.id] = num(st.vals[c.id]);
    const counts = {}; Object.values(m).forEach(v => counts[v] = (counts[v] || 0) + 1);
    for (const c of p.cells) { const v = m[c.id]; if (!p.nums.includes(v) || counts[v] > 1) bad.push(c.id); }
    for (const side of p.sides) if (side.reduce((a, id) => a + m[id], 0) !== p.S) side.forEach(id => { if (!(id in p.given) && !bad.includes(id)) bad.push(id); });
  } else if (p.checkFn) bad.push(...p.checkFn(st.vals));
  else for (const c of p.cells) if (!same(num(st.vals[c.id]), c.answer)) bad.push(c.id);
  const x = st.x;
  if (p.kind === 'mab') { const tot = x.h * 100 + x.t * 10 + x.o; xready = tot > 0; xok = tot === p.target; }
  if (p.kind === 'coins') { const s = x.items.reduce((a, b) => a + b, 0); xready = s > 0; xok = s === p.amt; }
  if (p.kind === 'share') { const left = p.N - x.plates.reduce((a, b) => a + b, 0); xready = left === 0; xok = left === 0 && x.plates.every(v => v === p.m); }
  if (p.kind === 'fracbar') { xready = x.on.length > 0; xok = x.on.length === p.a * p.k; }
  if (p.kind === 'clockset') { xready = true; xok = x.h % 12 === p.h % 12 && x.m === p.m; }
  if (p.kind === 'mirror') { xready = x.on.length > 0; const a = [...x.on].sort((m, n) => m - n); xok = a.length === p.want.length && a.every((v, i) => v === p.want[i]); }
  if (p.kind === 'order') { xready = x.order.length === p.items.length; xok = xready && x.order.every((i, k) => k === 0 || p.vals[x.order[k - 1]] < p.vals[i]); }
  return { ok: bad.length === 0 && xok, bad, xok, complete: filled && xready };
}
export function reveal(p, st) {
  const res = check(p, st);
  const all = (p.kind === 'triangle' || p.checkFn) && res.bad.length;
  for (const c of p.cells) if (all ? res.bad.includes(c.id) || p.kind === 'triangle' : res.bad.includes(c.id) || (st.vals[c.id] ?? '') === '') { st.vals[c.id] = p.kind === 'triangle' ? String(p.sol[c.id]) : typed(c.answer); st.marks[c.id] = 'shown'; }
  if (p.solution && !res.xok) { st.x = JSON.parse(JSON.stringify(p.solution)); st.xShown = true; }
}
export function newState(p) {
  const first = p.cells[0]?.id || null;
  return { vals: {}, marks: {}, active: first, x: p.init ? p.init() : null, xBad: false, xShown: false };
}
const maxLen = c => Math.max(2, Math.min(9, typed(c.answer).length + 2));
const singleDigit = p => p.cells.length > 1 && p.cells.every(c => Number.isInteger(c.answer) && c.answer >= 0 && c.answer <= 9);
function nextEmpty(p, st, from) {
  const open = p.cells.filter(c => st.marks[c.id] !== 'ok' && st.marks[c.id] !== 'shown');
  const i = open.findIndex(c => c.id === from);
  const after = [...open.slice(i + 1), ...open.slice(0, i + 1)];
  return (after.find(c => (st.vals[c.id] ?? '') === '') || after[0] || {}).id || from;
}
export function input(p, st, k) {
  const id = st.active; const c = p.cells.find(x => x.id === id);
  if (k === 'next') { st.active = nextEmpty(p, st, id); return true; }
  if (!c || st.marks[id] === 'ok' || st.marks[id] === 'shown') return false;
  const v = st.vals[id] ?? '';
  if (k === 'del') st.vals[id] = v.slice(0, -1);
  else if (k === 'neg') { if (!p.neg) return true; st.vals[id] = v.startsWith(MIN) ? v.slice(1) : MIN + v; }
  else if (k === ',') { if (!p.dec || v.includes(',')) return true; st.vals[id] = (v === '' ? '0' : v) + ','; }
  else if (/^[0-9]$/.test(k)) { if (v.replace(',', '').replace(MIN, '').length >= maxLen(c)) return true; st.vals[id] = (v === '0' ? '' : v) + k; if (singleDigit(p)) st.active = nextEmpty(p, st, id); }
  if (st.marks[id] === 'bad') delete st.marks[id];
  return true;
}
export function act(p, st, op, a) {
  const x = st.x; if (!x || st.locked) return false; st.xBad = false;
  if (p.kind === 'mab') { if (op === 'add' && x[a] < 15) x[a]++; if (op === 'rm' && x[a] > 0) x[a]--; }
  if (p.kind === 'coins') { if (op === 'add' && x.items.length < (p.maxItems || 25)) x.items.push(Number(a)); if (op === 'rm') x.items.splice(Number(a), 1); }
  if (p.kind === 'share') { const i = Number(a), left = p.N - x.plates.reduce((s, v) => s + v, 0); if (op === 'add' && left > 0) x.plates[i]++; if (op === 'rm' && x.plates[i] > 0) x.plates[i]--; }
  if (p.kind === 'mirror') { const i = Number(a); x.on = x.on.includes(i) ? x.on.filter(v => v !== i) : [...x.on, i]; }
  if (p.kind === 'fracbar') { const i = Number(a); x.on = x.on.includes(i) ? x.on.filter(v => v !== i) : [...x.on, i]; }
  if (p.kind === 'order') { const i = Number(a); x.order = x.order.includes(i) ? x.order.slice(0, x.order.indexOf(i)) : [...x.order, i]; }
  if (p.kind === 'clockset') { if (op === 'h') { x.h = ((x.h - 1 + Number(a)) % 12 + 12) % 12 + 1; } if (op === 'm') { let t = x.m + Number(a) * p.stepM; if (t >= 60) { t -= 60; x.h = x.h % 12 + 1; } if (t < 0) { t += 60; x.h = (x.h + 10) % 12 + 1; } x.m = t; } }
  return true;
}
export function onKey(p, st, e) {
  if (st.locked) return false;
  if (/^[0-9]$/.test(e.key)) return input(p, st, e.key);
  if (e.key === ',' || e.key === '.') return input(p, st, ',');
  if (e.key === '-' && p.neg) return input(p, st, 'neg');
  if (e.key === 'Backspace') return input(p, st, 'del');
  if (e.key === 'Tab' || e.key === 'ArrowRight') { if (p.cells.length < 2) return false; e.preventDefault(); return input(p, st, 'next'); }
  if (e.key === 'ArrowLeft' && p.cells.length > 1) { const open = p.cells.filter(c => st.marks[c.id] !== 'ok' && st.marks[c.id] !== 'shown'); const i = open.findIndex(c => c.id === st.active); st.active = (open[(i - 1 + open.length) % open.length] || {}).id || st.active; return true; }
  return false;
}

export const KIND_NAMES = { sum: 'sommen uitrekenen', house: 'splitsen (splitshuis)', wall: 'rekenmuurtjes', line: 'getallenlijn', mab: 'getallen bouwen', story: 'denksommen (verhaaltjes)', ktable: 'kruistabel', column: 'cijferen onder elkaar', round: 'afronden', tsum: 'keer- en deelsommen', share: 'eerlijk verdelen', jumps: 'rijen en sprongen', split: 'keersommen in stukjes', rest: 'delen met rest', fracbar: 'breuken kleuren', fracread: 'breuken aflezen', fracset: 'breuk van een aantal', equiv: 'gelijkwaardige breuken', order: 'ordenen van breuken en kommagetallen', ratio: 'verhoudingstabel', convert: 'breuk, kommagetal en procent', fracadd: 'breuken optellen en aftrekken', coins: 'betalen met geld', change: 'wisselgeld', clockread: 'klok lezen', clockset: 'klok zetten', duration: 'tijdsduur en snelheid', metric: 'maten omrekenen', area: 'omtrek, oppervlakte en inhoud', shapes: 'geheime vormen', sudoku: 'sudoku', magic: 'tovervierkant', triangle: 'toverdriehoek', graph: 'grafieken lezen', mean: 'gemiddelde' };

/* ================= TEKENEN ================= */
const SHAPE_SVG = {
  cirkel: '<circle cx="20" cy="20" r="16" fill="#e8743b"/>',
  vierkant: '<rect x="5" y="5" width="30" height="30" rx="4" fill="#2f80c2"/>',
  driehoek: '<polygon points="20,3 37,35 3,35" fill="#3aa774"/>',
  ster: '<polygon points="20,2 25,15 39,15 28,24 32,38 20,30 8,38 12,24 1,15 15,15" fill="#f2b632"/>',
  hart: '<path d="M20 36 C4 24 2 12 11 7 C16 4 20 8 20 11 C20 8 24 4 29 7 C38 12 36 24 20 36Z" fill="#e0475b"/>',
  ruit: '<polygon points="20,2 37,20 20,38 3,20" fill="#9b5bb5"/>'
};
export const shapeSvg = (k, s = 40) => `<svg class="pz-shape" width="${s}" height="${s}" viewBox="0 0 40 40" role="img" aria-label="${k}">${SHAPE_SVG[k]}</svg>`;

export function moneySvg(c, small = false) {
  if (c >= 500) {
    const col = { 500: ['#c9ccd1', '#7c8087'], 1000: ['#f0a7a0', '#b0453b'], 2000: ['#9ec3ea', '#2f62a3'], 5000: ['#f6c48c', '#c06a1b'], 10000: ['#9fd3a6', '#2f7d3c'] }[c] || ['#ddd', '#777'];
    const w = small ? 66 : 86, h = small ? 38 : 48;
    return `<svg class="pz-note" width="${w}" height="${h}" viewBox="0 0 86 48" role="img" aria-label="briefje van ${c / 100} euro"><rect x="1" y="1" width="84" height="46" rx="5" fill="${col[0]}" stroke="${col[1]}" stroke-width="2"/><rect x="8" y="8" width="26" height="32" rx="3" fill="none" stroke="${col[1]}" stroke-opacity=".5"/><text x="60" y="33" text-anchor="middle" font-size="22" font-weight="800" fill="${col[1]}">${c / 100}</text><text x="21" y="30" text-anchor="middle" font-size="15" font-weight="800" fill="${col[1]}" fill-opacity=".7">€</text></svg>`;
  }
  const size = small ? 40 : ({ 200: 54, 100: 50, 50: 50, 20: 44, 10: 40, 5: 42 }[c] || 44);
  let ring, core, txt, stroke;
  if (c === 200) { ring = '#d3d6db'; core = '#e9c25a'; stroke = '#8b8f96'; txt = '2'; }
  else if (c === 100) { ring = '#e9c25a'; core = '#d3d6db'; stroke = '#a0812b'; txt = '1'; }
  else if (c >= 10) { ring = '#e2b64a'; core = '#e2b64a'; stroke = '#9d7a22'; txt = String(c); }
  else { ring = '#c7794a'; core = '#c7794a'; stroke = '#8a4a26'; txt = String(c); }
  const label = c >= 100 ? `${c / 100} euro` : `${c} cent`;
  return `<svg class="pz-coin" width="${size}" height="${size}" viewBox="0 0 50 50" role="img" aria-label="munt van ${label}"><circle cx="25" cy="25" r="23" fill="${ring}" stroke="${stroke}" stroke-width="2"/><circle cx="25" cy="25" r="${c >= 100 ? 15 : 19}" fill="${core}" stroke="${stroke}" stroke-opacity=".35"/><text x="25" y="${c >= 100 ? 31 : 30}" text-anchor="middle" font-size="${c >= 100 ? 17 : 14}" font-weight="800" fill="#4a3a1a">${c >= 100 ? '€' + txt : txt}</text></svg>`;
}

export function clockSvg(h, m, cls = '') {
  const nums = Array.from({ length: 12 }, (_, i) => { const n = i + 1, a = n * Math.PI / 6; return `<text x="${(100 + Math.sin(a) * 70).toFixed(1)}" y="${(107 - Math.cos(a) * 70).toFixed(1)}" text-anchor="middle">${n}</text>`; }).join('');
  const ticks = Array.from({ length: 60 }, (_, i) => { const a = i * Math.PI / 30, r1 = i % 5 ? 89 : 84; return `<line x1="${(100 + Math.sin(a) * r1).toFixed(1)}" y1="${(100 - Math.cos(a) * r1).toFixed(1)}" x2="${(100 + Math.sin(a) * 94).toFixed(1)}" y2="${(100 - Math.cos(a) * 94).toFixed(1)}" class="${i % 5 ? 'tk' : 'tk5'}"/>`; }).join('');
  return `<svg class="pz-clock ${cls}" viewBox="0 0 200 200" role="img" aria-label="Klok"><circle cx="100" cy="100" r="96" class="face"/>${ticks}<g class="nums">${nums}</g><line class="hh" x1="100" y1="100" x2="100" y2="54" transform="rotate(${((h % 12) + m / 60) * 30} 100 100)"/><line class="mh" x1="100" y1="100" x2="100" y2="26" transform="rotate(${m * 6} 100 100)"/><circle cx="100" cy="100" r="6" class="pin"/></svg>`;
}

function cell(p, st, id, cls = '') {
  const c = p.cells.find(x => x.id === id); if (!c) return '';
  const v = st.vals[id] ?? '', m = st.marks[id] || '', active = st.active === id && !st.locked && m !== 'ok' && m !== 'shown';
  const lock = st.locked || m === 'ok' || m === 'shown';
  return `<button type="button" class="pz-cell ${cls} ${m} ${active ? 'active' : ''} ${v === '' ? 'empty' : ''}" data-action="pz-cell" data-cell="${id}" aria-label="Invulvakje${v ? ', ingevuld ' + v : ', leeg'}" ${lock ? 'disabled' : ''}>${v === '' ? '' : esc(v)}</button>`;
}
const spec = (p, st, s, cls = 'sm') => typeof s === 'string' ? cell(p, st, s, cls) : `<b>${F(s)}</b>`;
function tok(p, st, t) {
  if (t && t.cell) return cell(p, st, t.cell);
  if (t && t.frac) return `<span class="pz-frac"><b>${t.frac[0]}</b><b>${t.frac[1]}</b></span>`;
  if (t && t.fracCells) return `<span class="pz-frac cells2">${spec(p, st, t.fracCells[0])}<i></i>${spec(p, st, t.fracCells[1])}</span>`;
  if (t && t.mixed) return `<span class="pz-mixed">${spec(p, st, t.mixed[0], '')}<span class="pz-frac cells2">${spec(p, st, t.mixed[1])}<i></i>${spec(p, st, t.mixed[2])}</span></span>`;
  if (t && t.mixedGiven) return `<span class="pz-mixed"><b class="whole">${t.mixedGiven[0]}</b><span class="pz-frac"><b>${t.mixedGiven[1]}</b><b>${t.mixedGiven[2]}</b></span></span>`;
  if (t && t.shape) return shapeSvg(t.shape);
  return `<span class="pz-tok">${esc(typeof t === 'number' ? F(t) : t)}</span>`;
}
function tokensHtml(p, st, tokens) { return `<div class="pz-eq">${tokens.map(t => tok(p, st, t)).join('')}</div>`; }
export function dotsHtml(a, b, minus) { const d = n => Array.from({ length: n }, () => '<i></i>').join(''); return `<div class="pz-dots"><div>${d(a)}</div><b>${minus ? MIN : '+'}</b><div class="${minus ? 'sub' : ''}">${d(b)}</div></div>`; }
export function groupsHtml(a, b) { return `<div class="pz-groups">${Array.from({ length: b }, () => `<div>${'<i></i>'.repeat(a)}</div>`).join('')}</div>`; }

const V = {};
V.sum = (p, st) => tokensHtml(p, st, p.tokens);
V.tsum = (p, st) => `${p.text ? `<p class="pz-story">${esc(p.text)}</p>` : ''}${tokensHtml(p, st, p.tokens)}`;
V.rest = V.sum;
V.equiv = V.fracadd = V.sum;
V.house = (p, st) => `<div class="pz-house ${p.roof >= 1000 || p.dec ? 'wide' : ''}"><div class="roof"><span>${F(p.roof)}</span></div>${p.rooms.map(m => `<div class="room">${m.hide === 'a' ? cell(p, st, m.id) : `<span>${F(m.a)}</span>`}${m.hide === 'b' ? cell(p, st, m.id) : `<span>${F(m.b)}</span>`}</div>`).join('')}</div>`;
V.wall = (p, st) => { let h = `<div class="pz-wall ${Math.max(...p.rows.flat()) >= 1000 ? 'wide' : ''}">`; for (let k = p.n - 1; k >= 0; k--) { h += '<div class="row">'; for (let j = 0; j < p.n - k; j++) { const id = `${k}_${j}`; h += p.hidden.includes(id) ? `<div class="brick">${cell(p, st, 'w' + id)}</div>` : `<div class="brick"><span>${F(p.rows[k][j])}</span></div>`; } h += '</div>'; } return h + '</div>'; };
function lineSvg(s, e, minor, big, labels, S, marks = [], cls = '') {
  const W = 640, x = v => 24 + (v - s) / (e - s) * (W - 48);
  let svg = `<svg class="pz-line ${cls}" viewBox="0 0 ${W} 92" role="img" aria-label="Getallenlijn van ${F(s / S)} tot ${F(e / S)}"><line x1="20" y1="40" x2="${W - 20}" y2="40" class="axis"/>`;
  for (let v = s; v <= e; v += minor) { const b = labels.includes(v) || (v - s) % big === 0; svg += `<line x1="${x(v)}" y1="${b ? 28 : 33}" x2="${x(v)}" y2="${b ? 52 : 47}" class="${b ? 'tick big' : 'tick'}"/>`; }
  for (const v of labels) svg += `<text x="${x(v)}" y="78" text-anchor="middle">${F(v / S)}</text>`;
  for (const v of marks) svg += `<path d="M${x(v)} 6 L${x(v)} 22" class="arrow"/><polygon points="${x(v) - 6},18 ${x(v) + 6},18 ${x(v)},27" class="arrowhead"/>`;
  return { svg: svg + '</svg>', x, W };
}
V.line = (p, st) => {
  const { svg, x, W } = lineSvg(p.s, p.e, p.minor, p.big, p.labels, p.S, p.arrows.map(a => a.v));
  const cellsRow = `<div class="pz-line-cells">${p.arrows.map(a => `<div style="left:${(x(a.v) / W * 100).toFixed(2)}%">${cell(p, st, a.id, 'sm')}</div>`).join('')}</div>`;
  return `<div class="pz-linewrap">${svg}${cellsRow}</div>`;
};
V.round = (p, st) => {
  const K = 1000, s = Math.round(p.lo * K), e = Math.round(p.hi * K), mid = Math.round(p.mid * K), n = Math.round(p.N * K);
  const { svg } = lineSvg(s, e, (e - s) / 10, (e - s) / 2, [s, mid, e], K, [n], 'round');
  return `<div class="pz-linewrap noc">${svg}</div>${tokensHtml(p, st, p.tokens)}`;
};
V.mab = (p, st) => {
  const x = st.x, show = (n, cls, key) => Array.from({ length: n }, () => `<button type="button" class="mab ${cls}" data-action="pz-x" data-op="rm" data-a="${key}" aria-label="Haal weg" ${st.locked ? 'disabled' : ''}></button>`).join('');
  return `<div class="pz-mab"><div class="mab-mat ${st.xBad ? 'bad' : ''} ${st.xShown ? 'shown' : ''}">${x.h + x.t + x.o === 0 ? '<span class="mab-empty">Tik hieronder om te bouwen</span>' : ''}${p.plates ? `<div class="mab-col">${show(x.h, 'plate', 'h')}</div>` : ''}<div class="mab-col bars">${show(x.t, 'bar', 't')}</div><div class="mab-col ones">${show(x.o, 'one', 'o')}</div></div>
  <div class="mab-tools">${p.plates ? `<button type="button" class="tool" data-action="pz-x" data-op="add" data-a="h" ${st.locked ? 'disabled' : ''}><span class="mab plate"></span>+ plaat (100)</button>` : ''}<button type="button" class="tool" data-action="pz-x" data-op="add" data-a="t" ${st.locked ? 'disabled' : ''}><span class="mab bar"></span>+ staaf (10)</button><button type="button" class="tool" data-action="pz-x" data-op="add" data-a="o" ${st.locked ? 'disabled' : ''}><span class="mab one"></span>+ blokje (1)</button></div><p class="pz-note">Tik op een stuk om het weg te halen.</p></div>`;
};
V.story = (p, st) => `<p class="pz-story">${esc(p.text)}</p><div class="pz-eq"><span class="pz-tok small">Antwoord:</span>${cell(p, st, 'x')}</div>`;
V.ktable = (p, st) => {
  const head = (kind, i, v) => (kind === 'r' ? p.hr : p.hc) === i ? cell(p, st, kind + i, 'head') : `<span>${F(v)}</span>`;
  let h = `<table class="pz-kt"><tr><th class="op">${p.op}</th>${p.colsV.map((v, j) => `<th>${head('c', j, v)}</th>`).join('')}</tr>`;
  p.rowsV.forEach((rv, i) => { h += `<tr><th>${head('r', i, rv)}</th>${p.colsV.map((_, j) => { const id = `k${i}${j}`; return `<td>${id in p.given ? `<span>${F(p.given[id])}</span>` : cell(p, st, id)}</td>`; }).join('')}</tr>`; });
  return `<div class="pz-scroll">${h}</table></div>`;
};
V.share = (p, st) => {
  const x = st.x, left = p.N - x.plates.reduce((a, b) => a + b, 0), ck = '<i class="ck"></i>';
  return `<div class="pz-share"><div class="jar" aria-label="Nog ${left} koekjes">${ck.repeat(left)}${left === 0 ? '<span class="jar-empty">Alle koekjes zijn verdeeld</span>' : ''}</div>
  <div class="plates ${st.xBad ? 'bad' : ''}">${x.plates.map((n, i) => `<div class="plate-wrap"><button type="button" class="plate" data-action="pz-x" data-op="add" data-a="${i}" aria-label="Leg een koekje op bord ${i + 1}" ${st.locked ? 'disabled' : ''}>${ck.repeat(n)}</button><button type="button" class="minus" data-action="pz-x" data-op="rm" data-a="${i}" aria-label="Haal een koekje van bord ${i + 1}" ${st.locked || !n ? 'disabled' : ''}>${MIN}</button></div>`).join('')}</div>
  <div class="pz-eq"><span class="pz-tok small">Elk bord krijgt</span>${cell(p, st, 'x')}<span class="pz-tok small">koekjes</span></div></div>`;
};
V.jumps = (p, st) => `<div class="pz-seq">${p.seq.map((v, i) => p.blanks.includes(i) ? cell(p, st, 's' + i) : `<span>${F(v)}</span>`).join('<i>;</i>')}</div>`;
V.shapes = (p, st) => `<div class="pz-shapes">${p.eqs.map(eq => `<div class="sh-eq">${eq.map(t => t && t.shape ? shapeSvg(t.shape, 34) : `<span>${typeof t === 'number' ? F(t) : t}</span>`).join('')}</div>`).join('')}</div><div class="pz-ask">${p.ask.map(k => `<div>${shapeSvg(k, 30)}<span>=</span>${cell(p, st, 'v_' + k)}</div>`).join('')}${p.final ? `<div class="all">${p.ask.map(k => shapeSvg(k, 22)).join('<span>+</span>')}<span>=</span>${cell(p, st, 'fin')}</div>` : ''}</div>`;
V.sudoku = (p, st) => `<div class="pz-sudoku n${p.n}" style="--n:${p.n}">${p.grid.map((v, i) => { const r = Math.floor(i / p.n), c = i % p.n, cls = `${(c + 1) % p.bw === 0 && c < p.n - 1 ? 'br' : ''} ${(r + 1) % p.bh === 0 && r < p.n - 1 ? 'bb' : ''}`; return `<div class="sq ${cls}">${v ? `<span>${v}</span>` : cell(p, st, 'q' + i)}</div>`; }).join('')}</div>`;
V.magic = (p, st) => `<div class="pz-magicwrap"><div class="pz-magic ${p.dec || p.S >= 100 ? 'wide' : ''}">${p.sq.map((v, i) => `<div class="sq">${p.hid.includes(i) ? cell(p, st, 'm' + i) : `<span>${F(v)}</span>`}</div>`).join('')}</div><div class="pz-sumtag">Elke lijn<br><b>= ${F(p.S)}</b></div></div>`;
V.triangle = (p, st) => {
  const T = { t0: [50, 6], t1: [88, 82], t2: [12, 82] };
  const pos = p.nine ? { ...T, a0: [62.7, 31.3], b0: [75.3, 56.7], a1: [62.7, 82], b1: [37.3, 82], a2: [24.7, 56.7], b2: [37.3, 31.3] } : { ...T, e0: [69, 44], e1: [50, 82], e2: [31, 44] };
  const used = Object.keys(pos).map(id => id in p.given ? p.given[id] : Number(st.vals[id])).filter(v => v >= 1);
  return `<div class="pz-tri ${p.nine ? 'nine' : ''}"><svg viewBox="0 0 100 92" aria-hidden="true"><polygon points="50,6 88,82 12,82" class="tri"/></svg>${Object.entries(pos).map(([id, [x, y]]) => `<div class="node" style="left:${x}%;top:${y / 92 * 100}%">${id in p.given ? `<span>${p.given[id]}</span>` : cell(p, st, id, 'round')}</div>`).join('')}</div><div class="pz-used">${p.nums.map(v => `<span class="${used.includes(v) ? 'on' : ''}">${v}</span>`).join('')}<em>Elke zijde = ${p.S}</em></div>`;
};
V.fracbar = (p, st) => `<div class="pz-fq"><span class="pz-tok small">Kleur</span><span class="pz-frac"><b>${p.a}</b><b>${p.b}</b></span><span class="pz-tok small">van de reep</span></div><div class="pz-bar ${st.xBad ? 'bad' : ''} ${st.xShown ? 'shown' : ''}" style="--n:${p.pieces}">${Array.from({ length: p.pieces }, (_, i) => `<button type="button" class="${st.x.on.includes(i) ? 'on' : ''}" data-action="pz-x" data-op="t" data-a="${i}" aria-label="Stukje ${i + 1}" ${st.locked ? 'disabled' : ''}></button>`).join('')}</div>`;
V.fracread = (p, st) => `<div class="pz-bar static" style="--n:${p.b}">${Array.from({ length: p.b }, (_, i) => `<span class="${i < p.a ? 'on' : ''}"></span>`).join('')}</div><div class="pz-eq"><span class="pz-frac cells2">${cell(p, st, 'num', 'sm')}<i></i>${cell(p, st, 'den', 'sm')}</span></div>`;
V.fracset = (p, st) => `${tokensHtml(p, st, p.tokens)}${p.grouped ? `<div class="pz-groups set">${Array.from({ length: p.b }, () => `<div>${'<i></i>'.repeat(p.u)}</div>`).join('')}</div>` : ''}`;
V.coins = (p, st) => {
  const x = st.x;
  return `<div class="pz-coins"><div class="counter ${st.xBad ? 'bad' : ''} ${st.xShown ? 'shown' : ''}" aria-label="Toonbank">${x.items.length ? x.items.map((c, i) => `<button type="button" data-action="pz-x" data-op="rm" data-a="${i}" aria-label="Haal weg" ${st.locked ? 'disabled' : ''}>${moneySvg(c, true)}</button>`).join('') : '<span class="counter-empty">De toonbank is nog leeg</span>'}</div><div class="purse">${p.pal.slice().reverse().map(c => `<button type="button" data-action="pz-x" data-op="add" data-a="${c}" ${st.locked ? 'disabled' : ''}>${moneySvg(c)}</button>`).join('')}</div><p class="pz-note">${p.maxItems && p.maxItems < 20 ? `Gebruik hooguit ${p.maxItems} munten en briefjes. ` : ''}Tik op geld op de toonbank om het terug te pakken.</p></div>`;
};
V.change = (p, st) => `${p.text ? `<p class="pz-story">${esc(p.text)}</p>` : `<div class="pz-shop"><div><span class="tag">${esc(p.item)}</span><b>${euro(p.cost)}</b></div><div class="paid"><span>Je betaalt met</span>${moneySvg(p.paid)}</div></div>`}<div class="pz-eq"><span class="pz-tok small">Je krijgt terug: €</span>${cell(p, st, 'e')}${p.cents ? `<span class="pz-tok">,</span>${cell(p, st, 'c', 'sm')}` : ''}</div>`;
V.clockread = (p, st) => `${p.note ? `<p class="pz-note big">${esc(p.note)}</p>` : ''}${clockSvg(p.h, p.m)}${tokensHtml(p, st, p.tokens)}`;
V.clockset = (p, st) => `<div class="pz-clockset">${clockSvg(st.x.h, st.x.m, (st.xBad ? 'bad' : '') + (st.xShown ? ' shown' : ''))}<div class="hands"><div><span>Kleine wijzer</span><button type="button" data-action="pz-x" data-op="h" data-a="-1" aria-label="Kleine wijzer terug" ${st.locked ? 'disabled' : ''}>↺</button><button type="button" data-action="pz-x" data-op="h" data-a="1" aria-label="Kleine wijzer vooruit" ${st.locked ? 'disabled' : ''}>↻</button></div><div><span>Grote wijzer</span><button type="button" data-action="pz-x" data-op="m" data-a="-1" aria-label="Grote wijzer terug" ${st.locked ? 'disabled' : ''}>↺</button><button type="button" data-action="pz-x" data-op="m" data-a="1" aria-label="Grote wijzer vooruit" ${st.locked ? 'disabled' : ''}>↻</button></div></div></div>`;
V.duration = (p, st) => `${p.text ? `<p class="pz-story">${esc(p.text)}</p>` : ''}${tokensHtml(p, st, p.tokens)}`;

V.column = (p, st) => {
  const S = p.S, pad = S > 1 ? 3 : 1, w = Math.max(p.w, S > 1 ? 3 : 1);
  const digits = v => String(v).padStart(pad, '0').padStart(w, ' ').split('');
  const commaAt = S > 1 ? w - 2 : -1;
  const rowHtml = (ds, lead = '') => `<div class="crow"><span class="cop">${lead}</span>${ds.map((d, i) => `${i === commaAt ? '<span class="ccomma">,</span>' : ''}<span class="cd">${d.trim()}</span>`).join('')}</div>`;
  const rs = String(p.res).padStart(pad, '0');
  const resCells = Array.from({ length: w }, (_, i) => { const k = w - 1 - i; return `${i === commaAt ? '<span class="ccomma">,</span>' : ''}<span class="cd">${k < rs.length ? cell(p, st, 'd' + k, 'digit') : ''}</span>`; }).join('');
  return `<div class="pz-column" style="--w:${w}">${rowHtml(digits(p.top))}${rowHtml(digits(p.bot), p.op)}<div class="cline"></div><div class="crow res"><span class="cop"></span>${resCells}</div></div>`;
};
V.split = (p, st) => {
  const cols = p.cols, rows = p.rows;
  return `<div class="pz-scroll"><table class="pz-split"><tr><th class="op">×</th>${cols.map(c => `<th>${F(c)}</th>`).join('')}</tr>${rows.map((rv, i) => `<tr><th>${F(rv)}</th>${cols.map((_, j) => `<td>${cell(p, st, `p${i}${j}`)}</td>`).join('')}</tr>`).join('')}</table></div><div class="pz-eq"><span class="pz-tok small">${p.A} × ${p.B} =</span>${cell(p, st, 'tot')}</div>`;
};
V.order = (p, st) => {
  const x = st.x;
  const lab = it => Array.isArray(it) ? `<span class="pz-frac"><b>${it[0]}</b><b>${it[1]}</b></span>` : `<span>${esc(it)}</span>`;
  return `<div class="pz-order"><div class="ord-items">${p.items.map((it, i) => { const k = x.order.indexOf(i); return `<button type="button" class="ord-card ${k >= 0 ? 'picked' : ''}" data-action="pz-x" data-op="pick" data-a="${i}" ${st.locked ? 'disabled' : ''}>${lab(it)}${k >= 0 ? `<em>${k + 1}</em>` : ''}</button>`; }).join('')}</div>
  <div class="ord-row ${st.xBad ? 'bad' : ''} ${st.xShown ? 'shown' : ''}"><span class="ord-end">klein</span>${p.items.map((_, k) => `<span class="ord-slot">${x.order[k] !== undefined ? lab(p.items[x.order[k]]) : ''}</span>`).join('<i>&lt;</i>')}<span class="ord-end">groot</span></div><p class="pz-note">Tik nog eens op een getal om het terug te zetten.</p></div>`;
};
V.convert = (p, st) => {
  const f = p.giv === 'f' ? `<span class="pz-frac"><b>${p.a}</b><b>${p.b}</b></span>` : `<span class="pz-frac cells2">${cell(p, st, 'fn', 'sm')}<i></i>${cell(p, st, 'fd', 'sm')}</span>`;
  const d = p.giv === 'd' ? `<b>${F(p.v)}</b>` : cell(p, st, 'd');
  const pc = p.giv === 'p' ? `<b>${F(p.v * 100)}%</b>` : `${cell(p, st, 'p')}<span class="pz-tok small">%</span>`;
  return `<div class="pz-scroll"><table class="pz-conv"><tr><th>Breuk</th><th>Kommagetal</th><th>Procent</th></tr><tr><td>${f}</td><td>${d}</td><td><span class="pcell">${pc}</span></td></tr></table></div>`;
};
V.ratio = (p, st) => {
  const FM = v => p.money && row2(v) ? v.toFixed(2).replace('.', ',') : F(v), row2 = v => !Number.isInteger(v);
  const td = (row, i) => { const id = row + i, v = row === 'a' ? p.rowA[i] : p.rowB[i]; return p.cells.find(c => c.id === id) ? cell(p, st, id, 'sm') : `<span>${row === 'b' ? FM(v) : F(v)}</span>`; };
  return `<div class="pz-scroll"><table class="pz-ratio"><tr><th>${esc(p.ctx[0])}</th>${p.rowA.map((_, i) => `<td>${td('a', i)}</td>`).join('')}</tr><tr><th>${esc(p.ctx[1])}</th>${p.rowB.map((_, i) => `<td>${td('b', i)}</td>`).join('')}</tr></table></div>`;
};
V.metric = (p, st) => {
  let trap = '';
  if (p.ladder) {
    const i = p.ladder.indexOf(p.from), j = p.ladder.indexOf(p.to), lo = Math.max(0, Math.min(i, j) - 1), hi = Math.min(p.ladder.length - 1, Math.max(i, j) + 1);
    trap = `<div class="pz-trap" aria-label="Maten-trap">${p.ladder.slice(lo, hi + 1).map((u, k) => `<span class="step ${u === p.from ? 'from' : u === p.to ? 'to' : ''}" style="--k:${k}">${u}</span>`).join('')}<em>elke tree: × ${p.f}</em></div>`;
  }
  return `${trap}${tokensHtml(p, st, p.tokens)}`;
};
V.area = (p, st) => {
  let fig = '', q = '';
  if (p.mode === 'grid') {
    const c = 36, W = p.W * c, H = p.H * c; let s = `<svg class="pz-area" viewBox="-4 -4 ${W + 8} ${H + 8}" width="${W + 8}" role="img" aria-label="Figuur op roosterpapier">`;
    for (let x = 0; x <= p.W; x++) s += `<line x1="${x * c}" y1="0" x2="${x * c}" y2="${H}" class="grid"/>`;
    for (let y = 0; y <= p.H; y++) s += `<line x1="0" y1="${y * c}" x2="${W}" y2="${y * c}" class="grid"/>`;
    if (p.cut) { const cw = p.cut[0] * c, ch = p.cut[1] * c; s += `<path d="M0 0 H${W - cw} V${ch} H${W} V${H} H0 Z" class="shape"/>`; }
    else s += `<rect x="0" y="0" width="${W}" height="${H}" class="shape"/>`;
    fig = s + '</svg>';
  } else if (p.mode === 'rect' || p.mode === 'rev') {
    const ratio = p.H / p.W, W = 260, H = Math.max(70, Math.min(200, W * ratio));
    fig = `<svg class="pz-area" viewBox="-40 -30 ${W + 80} ${H + 60}" width="${W + 80}" role="img" aria-label="Rechthoek"><rect x="0" y="0" width="${W}" height="${H}" class="shape"/><text x="${W / 2}" y="-10" text-anchor="middle">${F(p.W)} m</text>${p.mode === 'rect' ? `<text x="${W + 8}" y="${H / 2 + 6}">${F(p.H)} m</text>` : `<text x="${W + 8}" y="${H / 2 + 6}">? m</text><text x="${W / 2}" y="${H / 2 + 6}" text-anchor="middle" class="in">${F(p.W * p.H)} m²</text>`}</svg>`;
  } else {
    const l = 150, b = 70, h = 90;
    fig = `<svg class="pz-area box" viewBox="-30 -10 ${l + b + 70} ${h + b + 40}" width="${l + b + 70}" role="img" aria-label="Balk"><path d="M0 ${b * .6} h${l} v${h} h-${l} Z" class="shape"/><path d="M0 ${b * .6} l${b} -${b * .6} h${l} l-${b} ${b * .6} Z" class="top"/><path d="M${l} ${b * .6} l${b} -${b * .6} v${h} l-${b} ${b * .6} Z" class="side"/><text x="${l / 2}" y="${b * .6 + h + 22}" text-anchor="middle">${p.l} cm</text><text x="${l + b / 2 + 14}" y="${b * .3 + h + 20}">${p.b} cm</text><text x="-6" y="${b * .6 + h / 2 + 6}" text-anchor="end">${p.h} cm</text></svg>`;
  }
  if (p.mode === 'grid' || p.mode === 'rect') q = `<div class="pz-qs"><div><span>Omtrek</span>${cell(p, st, 'o')}<em>${p.unit}</em></div><div><span>Oppervlakte</span>${cell(p, st, 'a')}<em>${p.unit}²</em></div></div>`;
  else if (p.mode === 'box') q = `<div class="pz-qs"><div><span>Inhoud</span>${cell(p, st, 'v')}<em>cm³</em></div>${p.cells.length > 1 ? `<div><span>Dat is</span>${cell(p, st, 'lit')}<em>liter</em></div>` : ''}</div>`;
  else q = `<div class="pz-qs"><div><span>Breedte</span>${cell(p, st, 'b')}<em>m</em></div><div><span>Omtrek</span>${cell(p, st, 'o')}<em>m</em></div></div>`;
  return `<div class="pz-scroll center">${fig}</div>${q}`;
};
V.graph = (p, st) => {
  const c = p.chart, n = c.x.length, W = 520, H = 250, L = 52, B = 30, T = 14;
  const top = Math.ceil(c.maxV / c.stepV) * c.stepV, y = v => T + (H - T - B) * (1 - v / top), bw = (W - L - 10) / n;
  const labelEvery = Math.max(1, Math.ceil((top / c.stepV) / 10));
  let s = `<svg class="pz-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.line ? 'Lijngrafiek' : 'Staafgrafiek'}">`;
  for (let k = 0, v = 0; v <= top; v += c.stepV, k++) { s += `<line x1="${L}" y1="${y(v)}" x2="${W - 6}" y2="${y(v)}" class="${k % labelEvery ? 'g' : 'g major'}"/>`; if (k % labelEvery === 0) s += `<text x="${L - 8}" y="${y(v) + 5}" text-anchor="end">${F(v)}</text>`; }
  if (c.line) { const pts = c.vals.map((v, i) => `${L + bw * (i + .5)},${y(v)}`).join(' '); s += `<polyline points="${pts}" class="ln"/>` + c.vals.map((v, i) => `<circle cx="${L + bw * (i + .5)}" cy="${y(v)}" r="5" class="dot"/>`).join(''); }
  else s += c.vals.map((v, i) => `<rect x="${L + bw * i + bw * .18}" y="${y(v)}" width="${bw * .64}" height="${y(0) - y(v)}" rx="4" class="bar b${i % 5}"/>`).join('');
  s += c.x.map((xl, i) => `<text x="${L + bw * (i + .5)}" y="${H - 8}" text-anchor="middle">${esc(xl)}</text>`).join('');
  s += `<line x1="${L}" y1="${y(0)}" x2="${W - 6}" y2="${y(0)}" class="axis"/><line x1="${L}" y1="${T}" x2="${L}" y2="${y(0)}" class="axis"/></svg>`;
  return `<div class="pz-scroll center">${s}</div><div class="pz-qs col">${p.qs.map(q => `<div><span>${esc(q.q)}</span>${cell(p, st, q.id)}</div>`).join('')}</div>`;
};
V.mean = (p, st) => `<p class="pz-story">${esc(p.ctx)}</p><div class="pz-chips">${p.vals.map(v => `<span>${F(v)}</span>`).join('')}</div><div class="pz-eq"><span class="pz-tok small">Gemiddelde:</span>${cell(p, st, 'x')}</div>`;

export function view(p, st) { return `<div class="pz pzk-${p.kind}">${(V[p.kind] || V.sum)(p, st)}</div>`; }
export function padHtml(p, st, opts = {}) {
  if (!p.cells.length || st.locked) return '';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const last = p.cells.length > 1 ? `<button type="button" class="fn" data-action="pz-key" data-k="next" aria-label="Volgend vakje">→</button>` : `<button type="button" class="fn ok" data-action="${opts.submit || 'pz-check'}" aria-label="Kijk na">✓</button>`;
  return `<div class="pz-pad ${p.dec || p.neg ? 'dec' : ''}" role="group" aria-label="Cijfers">${keys.map(k => `<button type="button" data-action="pz-key" data-k="${k}">${k}</button>`).join('')}<button type="button" class="fn" data-action="pz-key" data-k="del" aria-label="Wis">⌫</button><button type="button" data-action="pz-key" data-k="0">0</button>${p.dec ? `<button type="button" class="fn comma" data-action="pz-key" data-k="," aria-label="Komma">,</button>${last.replace('class="fn', 'class="wide fn')}` : p.neg ? `<button type="button" class="fn comma" data-action="pz-key" data-k="neg" aria-label="Min-teken">${MIN}</button>${last.replace('class="fn', 'class="wide fn')}` : last}</div>`;
}
export function hintVisual(p) { const h = p.hintVisual; if (!h) return ''; if (h.dots) return dotsHtml(...h.dots); if (h.groups) return groupsHtml(...h.groups); return ''; }

/* ================= NIEUWE SOORTEN (oktober 2026, na de review) =================
   Negatieve getallen, schatten, cijferend vermenigvuldigen, delen met happen, spiegelen,
   coördinaten en open denkopdrachten (verrijking). */

/* Negatieve getallen (groep 7-8) */
G.negative = (L, r) => {
  const LL = Math.min(Math.max(L, 9), 12), N = v => v < 0 ? MIN + Math.abs(v) : String(v);
  let A, op, B, text = null, tokens, unit = '';
  if (LL === 9 || (LL === 10 && r() < .5)) {
    A = ri(-8, 6, r); const d = ri(3, 12, r), warm = r() < .5; op = warm ? '+' : MIN; B = d;
    if (!warm && A - d > -1 && r() < .7) A = ri(-3, 4, r);
    const when = pick([["'s Nachts", 'Overdag'], ["'s Ochtends", "'s Middags"], ['Om 6 uur', 'Om 12 uur']], r);
    text = `${when[0]} is het ${N(A)} °C. ${when[1]} is het ${d} graden ${warm ? 'warmer' : 'kouder'}. Hoe warm is het dan?`;
    tokens = ['Antwoord:', { cell: 'x' }, '°C']; unit = '°C';
  } else if (LL === 10) { A = ri(2, 9, r); op = MIN; B = A + ri(2, 9, r); tokens = [A, MIN, B, '=', { cell: 'x' }]; }
  else if (LL === 11) { A = -ri(2, 12, r); op = pick(['+', MIN], r); B = ri(2, 12, r); tokens = [N(A), op, B, '=', { cell: 'x' }]; }
  else { A = -ri(2, 15, r); op = pick(['+', MIN], r); B = -ri(2, 15, r); tokens = [N(A), op, '(' + N(B) + ')', '=', { cell: 'x' }]; }
  const ans = op === '+' ? A + B : A - B;
  const hint = LL === 12 ? `Min een min-getal is hetzelfde als plus: ${op === MIN ? `${N(A)} ${MIN} (${N(B)}) = ${N(A)} + ${Math.abs(B)}` : `${N(A)} + (${N(B)}) = ${N(A)} ${MIN} ${Math.abs(B)}`}.` : 'Teken een getallenlijn met de 0 in het midden. Plus is naar rechts, min is naar links.';
  const say = v => v < 0 ? 'min ' + Math.abs(v) : String(v);
  return { kind: 'negative', title: text ? 'Onder nul' : 'Rekenen met negatieve getallen', text, tokens, neg: true, A, op, B, unit,
    cells: [{ id: 'x', answer: ans }], spoken: text || `Hoeveel is ${say(A)} ${op === '+' ? 'plus' : 'min'} ${say(B)}?`, hint,
    explanation: `${N(A)} ${op} ${B < 0 ? '(' + N(B) + ')' : B} = ${N(ans)}${unit ? ' ' + unit : ''}.`, key: 'neg' + LL + A + op + B };
};

/* Schatten: eerst afronden, dan rekenen (groep 5-8) */
G.estimate = (L, r) => {
  const LL = Math.min(Math.max(L, 5), 11);
  let a, b, op, pv;
  if (LL <= 6) { pv = 10; a = ri(11, 98, r); b = ri(11, 98, r); op = pick(['+', MIN], r); }
  else if (LL <= 8) { pv = 100; a = ri(110, 980, r); b = ri(110, 980, r); op = pick(['+', MIN], r); if (LL === 8 && r() < .5) { pv = 10; a = ri(12, 89, r); b = ri(3, 9, r); op = '×'; } }
  else { pv = 1000; a = ri(1100, 9800, r); b = ri(1100, 9800, r); op = pick(['+', MIN], r); if (r() < .4) { pv = 10; a = ri(12, 98, r); b = ri(12, 49, r); op = '×'; } }
  if (op === MIN && b > a) [a, b] = [b, a];
  const rd = v => Math.round(v / pv) * pv;
  let ra = rd(a), rb = op === '×' && b < 10 ? b : rd(b);
  if (op === MIN && ra === rb) { b = Math.max(1, b - pv); rb = rd(b); }
  const ans = op === '+' ? ra + rb : op === MIN ? ra - rb : ra * rb, exact = op === '+' ? a + b : op === MIN ? a - b : a * b;
  const place = { 10: 'tientallen', 100: 'honderdtallen', 1000: 'duizendtallen' }[pv];
  const text = op === '×' && b < 10 ? `Rond ${F(a)} af op tientallen en reken dan uit.` : `Rond beide getallen af op ${place} en reken dan uit.`;
  return { kind: 'estimate', title: 'Schat de uitkomst', text, tokens: [a, op, b, '≈', { cell: 'x' }], cells: [{ id: 'x', answer: ans }], ra, rb, pv, exact,
    spoken: `Schat: ${F(a)} ${op === '+' ? 'plus' : op === MIN ? 'min' : 'keer'} ${F(b)}. ${text}`,
    hint: `${F(a)} is ongeveer ${F(ra)}${rb !== b ? ` en ${F(b)} is ongeveer ${F(rb)}` : ''}. Reken nu met de ronde getallen.`,
    explanation: `${F(ra)} ${op} ${F(rb)} = ${F(ans)}. Het precieze antwoord is ${F(exact)}: dat ligt er dichtbij.`, key: 'est' + a + op + b };
};

/* Cijferend vermenigvuldigen met één cijfer (groep 6-7) */
G.colmul = (L, r) => {
  const LL = Math.min(Math.max(L, 7), 10);
  const top = LL === 7 ? ri(13, 98, r) : LL === 8 ? ri(102, 989, r) : ri(1012, 9876, r), bot = ri(3, 9, r), res = top * bot, w = String(res).length;
  const ds = String(res).split('').reverse();
  return { kind: 'colmul', title: 'Cijferend vermenigvuldigen', op: '×', top, bot, res, w, S: 1, order: 'rtl',
    cells: ds.map((d, i) => ({ id: 'd' + i, answer: Number(d) })),
    spoken: `Reken onder elkaar uit: ${F(top)} keer ${bot}. Begin rechts.`,
    hint: `Begin rechts: ${String(top).slice(-1)} × ${bot}. Is het 10 of meer? Schrijf de eenheden op en onthoud de tientallen voor de volgende kolom.`,
    explanation: `${F(top)} × ${bot} = ${F(res)}.`, key: 'cm' + top + 'x' + bot };
};

/* Delen met happen (groep 6-8) */
G.longdiv = (L, r) => {
  const LL = Math.min(Math.max(L, 8), 11);
  const d = LL === 11 ? ri(12, 25, r) : ri(3, 9, r), q = LL === 8 ? ri(21, 99, r) : LL === 9 ? ri(102, 299, r) : ri(110, 999, r), N = d * q;
  return { kind: 'longdiv', title: 'Delen met happen', text: `Neem steeds een grote hap: ${LL === 11 ? `10 × ${d} of 100 × ${d}` : `100 × ${d}, 10 × ${d}`}. Tel de happen op.`, tokens: [N, ':', d, '=', { cell: 'x' }], cells: [{ id: 'x', answer: q }], d, N,
    spoken: `Hoeveel is ${F(N)} gedeeld door ${d}? Gebruik happen.`, hint: `Hoe vaak past 100 × ${d} = ${100 * d} in ${F(N)}? Haal die hap eraf en ga door met wat er over is.`,
    explanation: `${F(N)} : ${d} = ${F(q)}, want ${F(q)} × ${d} = ${F(N)}.`, key: 'ld' + N + ':' + d };
};

/* Spiegelen (groep 4-6): kleur het spiegelbeeld */
G.mirror = (L, r) => {
  const LL = Math.min(Math.max(L, 3), 9);
  const horiz = LL >= 7 && r() < .4, W = LL <= 4 ? 6 : 8, H = LL <= 4 ? 4 : LL <= 6 ? 5 : 6;
  const half = horiz ? H / 2 : W / 2;
  const n = Math.min(LL + 1, 8), given = new Set();
  /* vorm die aan de spiegellijn hangt: groei vanaf een cel naast de lijn */
  const inGiven = (x, y) => horiz ? y < Math.floor(H / 2) : x < W / 2;
  let start = horiz ? [ri(0, W - 1, r), Math.floor(H / 2) - 1] : [W / 2 - 1, ri(0, H - 1, r)];
  if (horiz && H % 2) start = [start[0], Math.floor(H / 2) - 1];
  given.add(start[1] * W + start[0]);
  for (let t = 0; t < 200 && given.size < n; t++) {
    const cells = [...given], c = pick(cells, r), x = c % W, y = Math.floor(c / W), [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]], r), nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || !inGiven(nx, ny)) continue; given.add(ny * W + nx);
  }
  const mir = c => { const x = c % W, y = Math.floor(c / W); return horiz ? (2 * Math.floor(H / 2) - 1 - y) * W + x : y * W + (W - 1 - x); };
  const want = [...given].map(mir).sort((a, b) => a - b);
  return { kind: 'mirror', title: 'Spiegel de figuur', W, H, horiz, given: [...given], want, cells: [], init: () => ({ on: [] }), solution: { on: want },
    spoken: `Kleur het spiegelbeeld aan de andere kant van de ${horiz ? 'liggende' : 'staande'} spiegellijn. Tik op de hokjes.`,
    hint: 'Kijk per gekleurd hokje: hoeveel hokjes staat het van de spiegellijn? Kleur aan de andere kant een hokje dat even ver weg is.',
    explanation: 'Elk hokje staat aan de andere kant even ver van de spiegellijn.', key: 'mir' + W + H + horiz + [...given].sort() };
};

/* Coördinaten (groep 7-8) */
G.coord = (L, r) => {
  const n = 8, labels = ['A', 'B', 'C'], pts = [];
  while (pts.length < 3) { const x = ri(0, n, r), y = ri(0, n, r); if (x !== y && !pts.some(p => p.x === x && p.y === y)) pts.push({ x, y, l: labels[pts.length] }); }
  const ask = pick(pts, r);
  return { kind: 'coord', title: 'Coördinaten', n, pts, ask: ask.l,
    tokens: [`${ask.l} = (`, { cell: 'x' }, ',', { cell: 'y' }, ')'], cells: [{ id: 'x', answer: ask.x }, { id: 'y', answer: ask.y }],
    spoken: `Wat zijn de coördinaten van punt ${ask.l}? Eerst opzij, dan omhoog.`, hint: `Ga vanaf de 0 eerst opzij tot onder punt ${ask.l}: dat is het eerste getal. Ga dan omhoog: dat is het tweede getal.`,
    explanation: `Punt ${ask.l} ligt ${ask.x} opzij en ${ask.y} omhoog: (${ask.x}, ${ask.y}).`, key: 'co' + pts.map(p => p.x + '.' + p.y).join() + ask.l };
};

/* Open denkopdrachten: verrijking voor sterke rekenaars (ook in Pluspunt-stijl) */
G.open = (L, r) => {
  const LL = Math.min(Math.max(L, 3), 12), name = pick(NAMES, r), fam = [];
  const add = (min, f) => { if (LL >= min) fam.push(f); };
  add(3, () => { const k = ri(4, LL >= 7 ? 12 : 7, r); return { text: `${k} kinderen geven elkaar allemaal één keer een hand. Hoeveel handen worden er geschud?`, ans: k * (k - 1) / 2, steps: ['Begin klein: met 2 kinderen is het 1 hand, met 3 kinderen 3 handen.', `Het eerste kind geeft ${k - 1} handen, het tweede nog ${k - 2} nieuwe, en zo verder.`, `${Array.from({ length: k - 1 }, (_, i) => k - 1 - i).join(' + ')} = ${k * (k - 1) / 2}.`] }; });
  add(3, () => { const heads = ri(5, LL >= 7 ? 20 : 10, r), rab = ri(1, heads - 1, r), legs = 2 * heads + 2 * rab; return { text: `Op de boerderij lopen kippen en konijnen. Samen hebben ze ${heads} koppen en ${legs} poten. Hoeveel konijnen zijn er?`, ans: rab, steps: [`Doe alsof het allemaal kippen zijn: ${heads} × 2 = ${2 * heads} poten.`, `Er zijn ${legs} ${MIN} ${2 * heads} = ${legs - 2 * heads} poten over.`, `Elk konijn heeft 2 poten meer dan een kip: ${legs - 2 * heads} : 2 = ${rab} konijnen.`] }; });
  add(4, () => { const s = ri(1, 9, r), d = ri(2, 5, r), k = ri(5, LL >= 7 ? 30 : 10, r); return { text: `Figuur 1 heeft ${s + d} lucifers. Bij elke volgende figuur komen er ${d} lucifers bij. Hoeveel lucifers heeft figuur ${k}?`, ans: s + d * k, steps: [`Maak een tabel: figuur 1 = ${s + d}, figuur 2 = ${s + 2 * d}, figuur 3 = ${s + 3 * d}.`, `Van figuur 1 naar figuur ${k} komen er ${k - 1} keer ${d} bij.`, `${s + d} + ${k - 1} × ${d} = ${s + d * k}.`] }; });
  add(5, () => { const k = pick([3, 4, 5], r), a = ri(3, LL >= 8 ? 60 : 20, r), S = k * a + k * (k - 1) / 2; return { text: `${k} getallen die direct na elkaar komen (zoals 7, 8, 9) zijn samen ${S}. Wat is het kleinste getal?`, ans: a, steps: [`Deel eerst eerlijk: ${S} : ${k} = ${F(q3(S / k))}. Dat is ongeveer het middelste getal.`, `De getallen zijn ${Array.from({ length: k }, (_, i) => a + i).join(', ')}.`, `Controle: ${Array.from({ length: k }, (_, i) => a + i).join(' + ')} = ${S}.`] }; });
  add(5, () => { const diff = ri(2, 8, r), young = ri(4, 15, r), tot = 2 * young + diff, other = pick(NAMES.filter(n => n !== name), r); return { text: `${name} en ${other} zijn samen ${tot} jaar. ${name} is ${diff} jaar ouder dan ${other}. Hoe oud is ${other}?`, ans: young, steps: [`Haal het verschil eraf: ${tot} ${MIN} ${diff} = ${tot - diff}.`, `Nu zijn ze even oud: ${tot - diff} : 2 = ${young}.`, `${other} is ${young} en ${name} is ${young + diff}. Samen ${tot}.`] }; });
  add(6, () => { const A = pick([12, 16, 18, 20, 24, 30, 36, 48], r), pairs = []; for (let a = 1; a * a <= A; a++) if (A % a === 0) pairs.push([a, A / a]); return { text: `Hoeveel verschillende rechthoeken kun je maken van precies ${A} vierkante tegels, als je alle tegels gebruikt? (Een rechthoek van 2 bij 3 is dezelfde als 3 bij 2.)`, ans: pairs.length, steps: ['Zoek alle keersommen met uitkomst ' + A + '.', pairs.map(p => `${p[0]} × ${p[1]}`).join(', ') + '.', `Dat zijn ${pairs.length} rechthoeken.`] }; });
  add(6, () => { const d = ri(1, 9, r); let c = 0; for (let i = 1; i <= 100; i++) if (String(i).includes(String(d))) c++; return { text: `Hoeveel getallen van 1 tot en met 100 hebben minstens één ${d} erin?`, ans: c, steps: [`Met een ${d} op de plek van de eenheden: ${d}, ${10 + d}, ${20 + d}, ... dat zijn er 10.`, `Met een ${d} op de plek van de tientallen: ${d}0 tot en met ${d}9, dat zijn er 10.`, `${d}${d} heb je dubbel geteld${d === 1 ? ', en 100 heeft ook een 1' : ''}: ${c}.`] }; });
  add(8, () => { const coins = pick([[10, 20, 50], [5, 10, 20], [20, 50, 100]], r), N = pick([50, 60, 100], r); const ways = [0]; const dp = Array(N + 1).fill(0); dp[0] = 1; for (const c of coins) for (let v = c; v <= N; v++) dp[v] += dp[v - c]; if (dp[N] < 3 || dp[N] > 14) return null; return { text: `Op hoeveel manieren kun je precies ${N} cent betalen met munten van ${coins.join(', ')} cent? (Je mag elke munt vaker gebruiken.)`, ans: dp[N], steps: ['Werk netjes: begin met zoveel mogelijk van de grootste munt.', `Neem daarna steeds één grote munt minder en vul aan met kleinere.`, `Zo vind je ${dp[N]} manieren.`] }; });
  add(9, () => { const a = pick([3, 4, 6], r), b = pick([5, 8, 9, 10], r); const l = a * b / gcd(a, b); const k = Math.ceil(100 / l) * l; return { text: `Bus A vertrekt elke ${a} minuten, bus B elke ${b} minuten. Om 8:00 vertrekken ze samen. Na hoeveel minuten vertrekken ze weer tegelijk?`, ans: l, steps: [`Bus A: ${Array.from({ length: 5 }, (_, i) => a * (i + 1)).join(', ')}, ...`, `Bus B: ${Array.from({ length: 4 }, (_, i) => b * (i + 1)).join(', ')}, ...`, `Het eerste getal dat in allebei staat is ${l}.`] }; });
  for (let t = 0; t < 10; t++) { const res = pick(fam, r)(); if (res) return { kind: 'open', title: 'Denkopdracht', text: res.text, cells: [{ id: 'x', answer: res.ans }], workSteps: res.steps, spoken: res.text, hint: 'Teken het, maak een tabel, of probeer het eerst met kleine getallen. Zie je een patroon?', explanation: res.steps.at(-1), key: 'open' + res.text }; }
  return G.story(LL, r);
};

KINDS_BY_TOPIC.add.push(['estimate', 5, 11], ['negative', 9, 12]);
KINDS_BY_TOPIC.tables.push(['colmul', 7, 10], ['longdiv', 8, 11]);
KINDS_BY_TOPIC.logic.push(['mirror', 3, 9], ['coord', 9, 12], ['open', 3, 12]);
Object.assign(KIND_NAMES, { negative: 'negatieve getallen', estimate: 'schatten', colmul: 'cijferend vermenigvuldigen', longdiv: 'delen met happen', mirror: 'spiegelen', coord: 'coördinaten', open: 'denkopdrachten (verrijking)' });

V.negative = (p, st) => `${p.text ? `<p class="pz-story">${esc(p.text)}</p>` : ''}${tokensHtml(p, st, p.tokens)}`;
V.estimate = V.negative;
V.longdiv = V.negative;
V.colmul = V.column;
V.open = V.story;
V.coord = (p, st) => {
  const n = p.n, S = 26, pad = 26, W = n * S + pad * 2;
  const lines = Array.from({ length: n + 1 }, (_, i) => `<line x1="${pad + i * S}" y1="${pad}" x2="${pad + i * S}" y2="${pad + n * S}"/><line x1="${pad}" y1="${pad + i * S}" x2="${pad + n * S}" y2="${pad + i * S}"/><text x="${pad + i * S}" y="${pad + n * S + 16}" class="ax">${i}</text><text x="${pad - 12}" y="${pad + (n - i) * S + 4}" class="ax">${i}</text>`).join('');
  const dots = p.pts.map(q => `<circle cx="${pad + q.x * S}" cy="${pad + (n - q.y) * S}" r="6" class="${q.l === p.ask ? 'ask' : ''}"/><text x="${pad + q.x * S + 8}" y="${pad + (n - q.y) * S - 8}" class="lab">${q.l}</text>`).join('');
  return `<svg class="pz-coord" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" role="img" aria-label="Rooster met punten">${lines}<line x1="${pad}" y1="${pad + n * S}" x2="${pad + n * S}" y2="${pad + n * S}" class="axis"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${pad + n * S}" class="axis"/>${dots}</svg>${tokensHtml(p, st, p.tokens)}`;
};
V.mirror = (p, st) => {
  const x = st.x, cellsHtml = Array.from({ length: p.W * p.H }, (_, i) => {
    const g = p.given.includes(i), cx = i % p.W, cy = Math.floor(i / p.W), side = p.horiz ? cy >= p.H / 2 : cx >= p.W / 2;
    if (g) return `<span class="g"></span>`;
    if (!side) return `<span></span>`;
    return `<button type="button" class="${x.on.includes(i) ? 'on' : ''}" data-action="pz-x" data-op="t" data-a="${i}" aria-label="Hokje ${cx + 1}, ${cy + 1}" ${st.locked ? 'disabled' : ''}></button>`;
  }).join('');
  return `<div class="pz-mirror ${p.horiz ? 'horiz' : 'vert'} ${st.xBad ? 'bad' : ''} ${st.xShown ? 'shown' : ''}" style="--w:${p.W};--h:${p.H}">${cellsHtml}<i class="mline"></i></div>`;
};
