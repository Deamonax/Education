/* RekenRijk coach: herkent veelgemaakte fouten, geeft hulp in drie stappen en laat een uitgewerkt voorbeeld zien.
   Puur en zonder DOM, zodat het te testen is (tools/tests/coach.mjs).
   Achtergrond: gerichte feedback (Hattie & Timperley, 2007), uitgewerkte voorbeelden (Sweller; Renkl),
   bekende rekenfouten ('bugs', Brown & Burton, 1978). */
import { fmtN as F, euro, MIN } from './puzzles.mjs';

const num = v => v === undefined || v === null || v === '' ? NaN : Number(String(v).replace(',', '.'));
const same = (a, b) => Math.abs(a - b) < 1e-6;
const q3 = n => Math.round(n * 1000) / 1000;
const OPS = { '+': (a, b) => a + b, [MIN]: (a, b) => a - b, '-': (a, b) => a - b, '×': (a, b) => a * b, ':': (a, b) => a / b };
const OPWORD = { '+': 'plus', [MIN]: 'min', '-': 'min', '×': 'keer', ':': 'gedeeld door' };
const isOp = t => typeof t === 'string' && t in OPS;

/* Lees een som uit de tokens: A op B = C, met welke plek onbekend is */
export function equation(p) {
  const t = p.tokens; if (!Array.isArray(t) || t.length !== 5 || t[3] !== '=' || !isOp(t[1])) return null;
  const val = x => typeof x === 'number' ? x : x && x.cell ? p.cells.find(c => c.id === x.cell)?.answer : NaN;
  const [A, B, C] = [val(t[0]), val(t[2]), val(t[4])];
  if (![A, B, C].every(Number.isFinite)) return null;
  const unknown = [t[0], t[2], t[4]].map(x => !!(x && x.cell));
  return { A, op: t[1], B, C, unknown, cellOf: i => [t[0], t[2], t[4]][i]?.cell };
}

/* ---------- uitgewerkte stappen ---------- */
const parts = n => {
  /* splits in plaatswaarden, hoogstens 3 stukken: 327 -> 300, 20, 7; 9,55 -> 9, 0,5, 0,05 */
  const out = []; let left = q3(Math.abs(n));
  for (const pv of [100000, 10000, 1000, 100, 10, 1, .1, .01, .001]) { const k = Math.floor(q3(left / pv) + 1e-9); if (k > 0) { out.push(q3(k * pv)); left = q3(left - k * pv); } }
  if (out.length <= 3) return out;
  return [...out.slice(0, 2), q3(out.slice(2).reduce((a, b) => a + b, 0))];
};
function addSteps(a, b, sign) {
  const ps = parts(b); if (ps.length <= 1 || (a < 20 && b < 10)) return [];
  let cur = a; const lines = [];
  for (const x of ps) { const nx = q3(sign > 0 ? cur + x : cur - x); lines.push(`${F(cur)} ${sign > 0 ? '+' : MIN} ${F(x)} = ${F(nx)}`); cur = nx; }
  return [`Splits ${F(b)} in ${ps.map(F).join(' en ')}.`, ...lines];
}
function mulSteps(a, b) {
  let [x, y] = a >= b ? [a, b] : [b, a];
  if (!Number.isInteger(x) || !Number.isInteger(y)) return [];
  if ([1, 2, 10, 100].includes(x) || [1, 2, 10, 100].includes(y)) return [];
  if (x <= 10 && y <= 10) {
    if (x <= 5) return [];
    const k = x >= 5 ? 5 : x - 1; return [`Splits ${x} in ${k} en ${x - k}.`, `${k} × ${y} = ${k * y}`, `${x - k} × ${y} = ${(x - k) * y}`, `Samen: ${k * y} + ${(x - k) * y} = ${x * y}`];
  }
  const ps = parts(x); if (ps.length <= 1) return [];
  return [`Splits ${F(x)} in ${ps.map(F).join(' en ')}.`, ...ps.map(v => `${F(v)} × ${F(y)} = ${F(v * y)}`), `Samen: ${ps.map(v => F(v * y)).join(' + ')} = ${F(x * y)}`];
}
function opSteps(A, op, B) {
  const C = q3(OPS[op](A, B));
  if (op === '+') return [...addSteps(A, B, 1), `${F(A)} + ${F(B)} = ${F(C)}`];
  if (op === MIN || op === '-') return [...addSteps(A, B, -1), `${F(A)} ${MIN} ${F(B)} = ${F(C)}`];
  if (op === '×') return [...mulSteps(A, B), `${F(A)} × ${F(B)} = ${F(C)}`];
  if (op === ':') return [`Welke keersom hoort erbij? Hoe vaak past ${F(B)} in ${F(A)}?`, `${F(C)} × ${F(B)} = ${F(A)}`, `Dus ${F(A)} : ${F(B)} = ${F(C)}`];
  return [];
}
const dedupe = a => a.filter((x, i) => x && a.indexOf(x) === i);
function eqSteps(p) {
  const e = equation(p); if (!e) return null;
  const { A, op, B, C, unknown } = e;
  if (unknown[2] && !unknown[0] && !unknown[1]) return opSteps(A, op, B);
  /* onbekende vooraan of in het midden: reken terug met de omgekeerde som */
  const inv = { '+': MIN, [MIN]: '+', '-': '+', '×': ':', ':': '×' };
  if (unknown[1] && !unknown[0]) {
    const [x, o2, y] = op === '+' || op === '×' ? [C, inv[op], A] : [A, op, C];
    return [`Reken terug: ${F(x)} ${o2} ${F(y)}.`, ...opSteps(x, o2, y)];
  }
  if (unknown[0] && !unknown[1]) return [`Reken terug: ${F(C)} ${inv[op]} ${F(B)}.`, ...opSteps(C, inv[op], B)];
  return opSteps(A, op, B);
}
function columnSteps(p) {
  const T = String(p.top).padStart(p.w, '0'), Bt = String(p.bot).padStart(p.w, '0'), names = ['eenheden', 'tientallen', 'honderdtallen', 'duizendtallen', 'tienduizendtallen', 'honderdduizendtallen'];
  const lines = []; let carry = 0;
  for (let i = 0; i < p.w; i++) {
    const t = +T[p.w - 1 - i], b = +Bt[p.w - 1 - i], nm = names[i] || 'volgende kolom';
    if (p.op === '+') { const s = t + b + carry; lines.push(`${nm[0].toUpperCase() + nm.slice(1)}: ${t} + ${b}${carry ? ' + 1 (onthouden)' : ''} = ${s}${s >= 10 ? `. Schrijf ${s % 10} op en onthoud 1.` : '.'}`); carry = s >= 10 ? 1 : 0; }
    else { let top = t - carry; let txt = `${nm[0].toUpperCase() + nm.slice(1)}: `; if (top < b) { txt += `${top} ${MIN} ${b} kan niet. Leen 1 van links: ${top + 10} ${MIN} ${b} = ${top + 10 - b}.`; carry = 1; } else { txt += `${top} ${MIN} ${b} = ${top - b}${carry ? ' (je had 1 geleend)' : ''}.`; carry = 0; } lines.push(txt); }
  }
  return [...lines.filter((l, i) => i < p.w && !(i === p.w - 1 && /: 0 [+−] 0 = 0\.$/.test(l))), `Antwoord: ${F(p.res)}.`];
}
export function steps(p) {
  if (Array.isArray(p.workSteps) && p.workSteps.length) return p.workSteps;
  try {
    switch (p.kind) {
      case 'negative': { const { A, op, B } = p, ans = p.cells[0].answer, N = v => F(v); if (B < 0) return [`${op === MIN ? 'Min een min-getal is plus' : 'Plus een min-getal is min'}: ${N(A)} ${op === MIN ? '+' : MIN} ${Math.abs(B)}.`, `Op de getallenlijn: start bij ${N(A)} en ga ${Math.abs(B)} naar ${(op === MIN) ? 'rechts' : 'links'}.`, `Je komt uit op ${N(ans)}.`]; const right = op === '+'; const zero = right ? A < 0 && ans > 0 : A > 0 && ans < 0; return [`Start op de getallenlijn bij ${N(A)}${p.unit ? ' ' + p.unit : ''}.`, zero ? `Ga ${Math.abs(A)} naar ${right ? 'rechts' : 'links'} tot de 0, en dan nog ${Math.abs(B) - Math.abs(A)}.` : `Ga ${B} naar ${right ? 'rechts' : 'links'}.`, `Je komt uit op ${N(ans)}${p.unit ? ' ' + p.unit : ''}.`]; }
      case 'estimate': { const [a, op, b] = p.tokens; return [`${F(a)} is ongeveer ${F(p.ra)}.`, b !== p.rb ? `${F(b)} is ongeveer ${F(p.rb)}.` : null, `${F(p.ra)} ${op} ${F(p.rb)} = ${F(p.cells[0].answer)}.`, `Precies is het ${F(p.exact)}: je schatting zit er dichtbij.`].filter(Boolean); }
      case 'colmul': { const T = String(p.top).split('').reverse().map(Number), names = ['Eenheden', 'Tientallen', 'Honderdtallen', 'Duizendtallen']; let carry = 0; const out = T.map((t, i) => { const v = t * p.bot + carry, line = `${names[i]}: ${t} × ${p.bot}${carry ? ` + ${carry} (onthouden)` : ''} = ${v}.${i < T.length - 1 && v >= 10 ? ` Schrijf ${v % 10}, onthoud ${Math.floor(v / 10)}.` : ''}`; carry = Math.floor(v / 10); return line; }); return [...out, `Antwoord: ${F(p.res)}.`]; }
      case 'longdiv': { const d = p.d; let left = p.N, total = 0; const out = []; for (const k of [1000, 100, 10, 1]) { const m = Math.floor(left / (k * d)); if (m > 0) { const hap = m * k; out.push(`Hap: ${F(hap)} × ${d} = ${F(hap * d)}. Er blijft ${F(left - hap * d)} over.`); left -= hap * d; total += hap; } } return [...out.slice(0, 4), `Tel de happen op: ${F(total)}.`]; }
      case 'mirror': return ['Kijk naar elk gekleurd hokje.', 'Tel hoeveel hokjes het van de spiegellijn staat.', 'Kleur aan de andere kant een hokje dat even ver van de lijn staat, op dezelfde hoogte.'];
      case 'coord': { const q = p.pts.find(x => x.l === p.ask); return [`Begin bij de 0, linksonder.`, `Ga opzij tot onder punt ${p.ask}: ${q.x}.`, `Ga omhoog tot punt ${p.ask}: ${q.y}.`, `Dus ${p.ask} = (${q.x}, ${q.y}).`]; }
      case 'sum': case 'tsum': { const s = eqSteps(p); if (s && s.length > 1) return dedupe(s); break; }
      case 'column': return columnSteps(p);
      case 'house': { const r0 = p.rooms[0], known = r0.hide === 'a' ? r0.b : r0.a; return [`Het dak is ${F(p.roof)}. Kamer 1: er staat al ${F(known)}.`, ...opSteps(p.roof, MIN, known), 'Zo doe je elke kamer.']; }
      case 'wall': {
        const known = new Set(), key = (r, c) => r + '_' + c, rows = p.rows, out = [];
        rows.forEach((row, r) => row.forEach((_, c) => { if (!p.hidden.includes(key(r, c))) known.add(key(r, c)); }));
        for (let guard = 0; guard < 30 && known.size < rows.flat().length; guard++) for (const h of p.hidden) {
          if (known.has(h)) continue; const [r, c] = h.split('_').map(Number), k = (a, b) => known.has(key(a, b)) && rows[a]?.[b] !== undefined;
          if (r > 0 && k(r - 1, c) && k(r - 1, c + 1)) { out.push(`${F(rows[r - 1][c])} + ${F(rows[r - 1][c + 1])} = ${F(rows[r][c])}`); known.add(h); }
          else if (k(r + 1, c) && k(r, c + 1)) { out.push(`${F(rows[r + 1][c])} ${MIN} ${F(rows[r][c + 1])} = ${F(rows[r][c])}`); known.add(h); }
          else if (c > 0 && k(r + 1, c - 1) && k(r, c - 1)) { out.push(`${F(rows[r + 1][c - 1])} ${MIN} ${F(rows[r][c - 1])} = ${F(rows[r][c])}`); known.add(h); }
        }
        return out.length ? ['Zoek steeds een steen waarvan je twee buren al weet.', ...out] : [p.explanation]; }
      case 'fracset': return [`Verdeel ${F(p.N)} in ${p.b} gelijke delen: ${F(p.N)} : ${p.b} = ${F(p.N / p.b)}.`, `Dat is ${'één deel'}. Je hebt er ${p.a} nodig: ${p.a} × ${F(p.N / p.b)} = ${F(p.N * p.a / p.b)}.`];
      case 'fracbar': return [`De noemer is ${p.b}: verdeel de reep in ${p.b} gelijke delen.`, p.k > 1 ? `De reep heeft ${p.pieces} stukjes, dus één deel is ${p.k} stukjes.` : null, `Kleur ${p.a} ${p.a === 1 ? 'deel' : 'delen'}: ${p.a} × ${p.k} = ${p.a * p.k} stukjes.`].filter(Boolean);
      case 'rest': { const [N, , d] = p.tokens, q = p.cells[0].answer, r = p.cells[1].answer; return [`Hoe vaak past ${d} in ${F(N)}? Probeer een ronde keersom.`, `${q} × ${d} = ${F(q * d)}. Nog een keer erbij (${q + 1} × ${d} = ${F((q + 1) * d)}) is te veel.`, `${F(N)} ${MIN} ${F(q * d)} = ${r}. Dat is de rest.`]; }
      case 'ratio': { const i = p.cells[0], col = +i.id.slice(1), f = q3(p.rowA[col] / p.rowA[0]); const inv = q3(1 / f), byDiv = f < 1 && Number.isInteger(inv); if (i.id[0] === 'a') return [`Onderaan: van ${F(p.rowB[0])} naar ${F(p.rowB[col])} is ${byDiv ? `gedeeld door ${F(inv)}` : `keer ${F(f)}`}.`, `Bovenaan doe je hetzelfde: ${F(p.rowA[0])} ${byDiv ? `: ${F(inv)}` : `× ${F(f)}`} = ${F(p.rowA[col])}.`]; return [`Bovenaan: van ${F(p.rowA[0])} naar ${F(p.rowA[col])} is ${byDiv ? `gedeeld door ${F(inv)}` : `keer ${F(f)}`}.`, `Onderaan doe je hetzelfde: ${F(p.rowB[0])} ${byDiv ? `: ${F(inv)}` : `× ${F(f)}`} = ${F(p.rowB[col])}.`, 'Elke kolom doe je zo. Lastig? Reken eerst uit wat er bij 1 hoort.']; }
      case 'duration': {
        const m = p.text.match(/(\d+):(\d+).*?(\d+):(\d+)/), md = p.text.match(/(\d+):(\d+) en duurt (\d+) minuten/);
        if (md) { const h = +md[1], mi = +md[2], d = +md[3], toHour = (60 - mi) % 60, rest = d - toHour; return [`Van ${md[1]}:${md[2]} tot ${h + (mi ? 1 : 0)}:00 is ${toHour} minuten.`, `Er blijft ${rest} minuten over.${rest >= 60 ? ` Dat is ${Math.floor(rest / 60)} uur${rest % 60 ? ` en ${rest % 60} minuten` : ''}.` : ''}`, `${h + (mi ? 1 : 0) + Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')} is het eind.`]; }
        if (m) { const [h1, m1, h2, m2] = m.slice(1).map(Number), a = (60 - m1) % 60, hh = h2 - h1 - (m1 ? 1 : 0); return [`Van ${m[1]}:${m[2]} tot het hele uur is ${a} minuten.`, `Dan ${hh} hele uren tot ${h2}:00.`, `En nog ${m2} minuten tot ${m[3]}:${m[4]}.`, `Samen: ${hh} uur en ${a + m2} minuten${a + m2 >= 60 ? ` = ${hh + 1} uur en ${a + m2 - 60} minuten` : ''}.`]; }
        break; }
      case 'metric': { const [a, from, , , to] = p.tokens, i = p.ladder.indexOf(from), j = p.ladder.indexOf(to); if (i < 0 || j < 0) break; const steps = Math.abs(i - j), f = p.f ** steps; return [`Op de trap staat ${from} ${j < i ? 'onder' : 'boven'} ${to}: dat is ${steps} ${steps === 1 ? 'tree' : 'treden'}${p.f !== 10 ? ` van ${p.f}` : ''}.`, j > i ? `Naar beneden: keer ${F(f)}. ${F(a)} × ${F(f)} = ${F(a * f)}.` : `Naar boven: gedeeld door ${F(f)}. ${F(a)} : ${F(f)} = ${F(q3(a / f))}.`]; }
      case 'round': return [`${F(p.N)} ligt tussen ${F(p.lo)} en ${F(p.hi)}.`, `Het midden is ${F(p.mid)}.`, p.N >= p.mid ? `${F(p.N)} is ${p.N === p.mid ? 'precies het midden' : 'meer dan het midden'}, dus naar boven: ${F(p.hi)}.` : `${F(p.N)} is minder dan het midden, dus naar beneden: ${F(p.lo)}.`];
      case 'equiv': { const f = p.tokens[0].frac, g = f[0] / p.cells[0].answer; if (g < 1) { const k = q3(1 / g); return [`Doe boven en onder keer hetzelfde getal: ${F(k)}.`, `${f[0]} × ${F(k)} = ${p.cells[0].answer} en ${f[1]} × ${F(k)} = ${p.cells[1].answer}.`]; } return [`Zoek een getal waardoor ${f[0]} en ${f[1]} allebei te delen zijn: ${F(g)}.`, `${f[0]} : ${F(g)} = ${p.cells[0].answer} en ${f[1]} : ${F(g)} = ${p.cells[1].answer}.`]; }
      case 'mean': { const s = p.vals.reduce((a, b) => a + b, 0); return [`Tel alles op: ${p.vals.join(' + ')} = ${s}.`, `Deel door het aantal getallen (${p.vals.length}): ${s} : ${p.vals.length} = ${F(q3(s / p.vals.length))}.`]; }
      case 'change': { const back = p.paid - p.cost, toE = (100 - p.cost % 100) % 100; return toE ? [`Vul eerst aan tot een hele euro: ${euro(p.cost)} + ${euro(toE)} = ${euro(p.cost + toE)}.`, `Dan tot ${euro(p.paid)}: ${euro(p.paid - p.cost - toE)}.`, `Samen terug: ${euro(back)}.`] : [`Tel door van ${euro(p.cost)} naar ${euro(p.paid)}: ${euro(back)}.`]; }
      case 'split': return [...p.rows.flatMap((r, i) => p.cols.map((c, j) => `${F(r)} × ${F(c)} = ${F(r * c)}`)), `Alles samen: ${F(p.cells.at(-1).answer)}.`];
      case 'mab': { const s = p.solution; return [`${F(p.target)} = ${s.h ? `${s.h} honderdtallen, ` : ''}${s.t} tientallen en ${s.o} losse.`, `Pak ${s.h ? `${s.h} ${s.h === 1 ? 'plaat' : 'platen'}, ` : ''}${s.t} ${s.t === 1 ? 'staaf' : 'staven'} en ${s.o} ${s.o === 1 ? 'blokje' : 'blokjes'}.`]; }
      case 'coins': { let left = p.amt; const out = []; for (const v of p.solution.items) { left -= v; out.push(left ? `${euro(v)}: nog ${euro(left)} te gaan` : `${euro(v)}: klaar!`); } return ['Begin steeds met het grootste geld dat nog past.', ...out.slice(0, 5)]; }
      case 'fracadd': return [p.explanation];
      case 'order': { const idx = p.solution.order, w = Math.max(...p.items.map(s => (s.split(',')[1] || '').length)); return [w ? `Maak de getallen even lang: ${p.items.map(s => s.includes(',') ? s.padEnd(s.split(',')[0].length + 1 + w, '0') : s).join(', ')}.` : 'Vergelijk de getallen.', `Van klein naar groot: ${idx.map(i => p.items[i]).join(', ')}.`]; }
      case 'line': return [`Elk streepje is ${F(p.minor)}.`, `Tel vanaf het dichtstbijzijnde getal: ${p.arrows.map(a => F(a.v)).join(', ')}.`];
      case 'area': return [p.hint, p.explanation];
    }
  } catch (e) { /* val terug op de gewone uitleg */ }
  /* verhaalsommen en andere: lees de som uit de uitleg ("19 − 14 = 5.") en werk hem uit */
  const m = String(p.explanation || '').match(/^(?:€ )?([\d.]+(?:,\d+)?) ([+−×:]) (?:€ )?([\d.]+(?:,\d+)?) = (?:€ )?([\d.]+(?:,\d+)?)\.?$/);
  if (m) { const P = x => Number(x.replace(/\./g, '').replace(',', '.')), [A, op, B, C] = [P(m[1]), m[2], P(m[3]), P(m[4])];
    if (same(q3(OPS[op](A, B)), C) && !p.explanation.includes('€')) { const s = opSteps(A, op, B); const intro = p.kind === 'story' ? [`Dit is een ${OPWORD[op]}-som: ${F(A)} ${op} ${F(B)}.`] : []; if (s.length > 1) return dedupe([...intro, ...s]); return [...intro, p.explanation]; } }
  return [p.explanation];
}

/* ---------- hulp in drie stappen ---------- */
/* 1: een vraag die het kind zelf laat denken. 2: de strategie (en een plaatje). 3: de eerste stap voorgedaan. */
export function question(p) {
  const e = equation(p);
  if (e && (p.kind === 'sum' || p.kind === 'tsum') && e.unknown[2] && !p.text) {
    if (e.op === '+' || e.op === MIN || e.op === '-') return `Schat eerst: wordt het meer of minder dan ${F(e.A)}? Ongeveer hoeveel?`;
    if (e.op === '×') return `Welke keersom ken je al die hierop lijkt? Bijvoorbeeld ${e.B <= 10 ? `10 × ${F(e.B)}` : `${F(e.A)} × 10`}.`;
    if (e.op === ':') return `Welke keersom hoort hierbij? ? × ${F(e.B)} = ${F(e.A)}.`;
  }
  if (e && (e.unknown[0] || e.unknown[1])) return 'Welk getal mist er? Kun je terugrekenen met de omgekeerde som?';
  const Q = {
    story: 'Wat weet je? Wat wil je weten? Wordt het meer of minder?', house: `Hoeveel moet je erbij doen om ${F(p.roof)} te krijgen?`,
    wall: 'Welke steen kun je al uitrekenen, omdat de twee stenen eronder er al staan?', line: `Hoeveel is één streepje? Kijk naar twee getallen die er al staan.`,
    mab: `Hoeveel tientallen zitten er in ${F(p.target)}?`, coins: `Wat is het grootste geld dat nog past in ${p.amt ? euro(p.amt) : 'het bedrag'}?`,
    clockread: 'Kijk eerst naar de kleine wijzer: welk uur is net geweest?', clockset: 'Waar moet de grote wijzer staan? Zet die eerst goed.',
    fracbar: `In hoeveel gelijke delen moet je de reep eerst verdelen?`, fracread: 'In hoeveel stukjes is de reep verdeeld? Hoeveel zijn er gekleurd?',
    fracset: `In hoeveel gelijke groepjes verdeel je ${F(p.N || 0)}?`, share: 'Deel de koekjes één voor één uit. Hoeveel krijgt elk bord?',
    jumps: 'Hoe groot is de sprong tussen twee getallen die je al weet?', sudoku: 'Welke rij, kolom of welk vak is al bijna vol?',
    magic: 'Welke lijn mist maar één getal?', triangle: 'Welke getallen zijn groot? Zet je die in de hoeken of in het midden van een zijde?',
    shapes: 'In welke som zit maar één soort vorm?', ktable: 'Welk vakje kun je al uitrekenen?', column: 'Welke kolom reken je eerst? Begin rechts.',
    round: `Tussen welke twee ronde getallen ligt ${p.N !== undefined ? F(p.N) : 'dit getal'}?`, rest: 'Hoe vaak past het erin zonder dat je erover gaat?',
    split: 'Welk getal staat links en welk boven elk vak?', duration: 'Hoeveel minuten is het tot het volgende hele uur?',
    metric: 'Is de nieuwe maat groter of kleiner? Wordt het getal dan groter of kleiner?', area: 'Wat is de rand (omtrek) en wat is de binnenkant (oppervlakte)?',
    change: 'Hoeveel is het tot de volgende hele euro?', equiv: 'Door welk getal kun je boven én onder de streep delen?',
    order: 'Welke is de kleinste? Tip: maak kommagetallen even lang (0,5 = 0,50).', ratio: 'Met welk getal doe je keer in de bovenste rij?',
    convert: 'Hoeveel is het van de 100?', fracadd: 'Zijn de getallen onder de streep al gelijk?', graph: 'Welke staaf hoort erbij en waar eindigt die?',
    mean: 'Hoeveel is alles samen?', negative: 'Teken een getallenlijn. Ga je naar links of naar rechts?', estimate: 'Rond elk getal eerst af. Wat wordt het dan ongeveer?',
    colmul: 'Welk cijfer van het onderste getal doe je eerst keer het bovenste getal?', longdiv: 'Hoe vaak past de deler in het eerste stuk van het getal?',
    mirror: 'Hoe ver staat het vakje van de spiegellijn? Even ver aan de andere kant.', coord: 'Eerst opzij (x), dan omhoog (y).',
    open: 'Probeer een paar mogelijkheden. Schrijf op wat je al geprobeerd hebt.'
  };
  return Q[p.kind] || 'Wat weet je al? Begin bij het vakje waar je het zekerst van bent.';
}
/* Hulp stap 3: welk vakje vullen we voor (het eerste dat nog niet klopt), of welke zin laten we zien */
export function firstStep(p, st) {
  if (p.cells.length > 1 && !p.ruleCheck && !p.checkFn) {
    const c = p.cells.find(c => !same(num(st.vals[c.id]), c.answer));
    if (c) return { cell: c.id, value: String(q3(c.answer)).replace('.', ','), text: 'Ik heb één vakje voor je ingevuld. Kijk hoe het past en doe de rest zelf.' };
  }
  const s = steps(p); return { text: 'Eerste stap: ' + s[0] };
}

/* ---------- fouten herkennen ---------- */
const rev = n => Number(String(n).split('').reverse().join(''));
const pow10 = d => { const l = Math.log10(Math.abs(d)); return Math.abs(l - Math.round(l)) < 1e-9 ? Math.round(l) : null; };
function digits(n, w) { return String(Math.round(n)).padStart(w, '0').split('').reverse().map(Number); }

function cellBug(p, id, v, a) {
  if (!Number.isFinite(v) || same(v, a)) return null;
  const e = equation(p);
  /* verkeerde bewerking */
  if (e && e.unknown[2] && !e.unknown[0] && !e.unknown[1]) {
    for (const [op, f] of Object.entries(OPS)) if (op !== e.op && op !== '-' && same(v, q3(f(e.A, e.B)))) return { code: 'op', text: `Je hebt ${OPWORD[op]} gedaan, maar hier staat ${OPWORD[e.op]}. Kijk goed naar het teken.` };
  }
  if (e && (e.unknown[0] || e.unknown[1]) && !e.unknown[2]) {
    const known = e.unknown[0] ? e.B : e.A;
    if (same(v, q3(e.C + known)) || same(v, q3(e.C - known)) || same(v, q3(e.C * known))) if (!same(v, a)) return { code: 'inverse', text: 'Reken terug met de omgekeerde som. Controleer daarna: klopt de hele som nu?' };
  }
  /* cijfers omgedraaid (in het Nederlands zeg je eerst de eenheden: zesenveertig) */
  if (Number.isInteger(a) && a >= 13 && Number.isInteger(v)) {
    if (a >= 21 && a < 100 && a % 11 && a % 10 && v === rev(a)) return { code: 'swap', text: `Je hebt de cijfers omgedraaid. Je zegt "${say(a)}", maar je schrijft eerst de ${Math.floor(a / 10)} van de tientallen.` };
    if (a >= 100 && a < 10000 && v !== a && Math.floor(v / 100) === Math.floor(a / 100) && v % 100 === rev(String(a % 100).padStart(2, '0'))) return { code: 'swap', text: 'De laatste twee cijfers staan omgedraaid. Schrijf eerst de tientallen, dan de eenheden.' };
  }
  /* 10 of 100 keer te groot/klein (komma, nullen) */
  const ratio = a !== 0 ? v / a : NaN, pr = Number.isFinite(ratio) && ratio > 0 ? pow10(ratio) : null;
  if (pr) return { code: 'place', text: `Je antwoord is ${10 ** Math.abs(pr)} keer te ${pr > 0 ? 'groot' : 'klein'}. Kijk goed naar de nullen${p.dec ? ' en de komma' : ''}.` };
  /* precies een tiental of honderdtal ernaast: onthouden of lenen */
  const d = q3(v - a), pd = pow10(d);
  if (pd !== null && pd >= 1 && Math.abs(a) >= 10) return { code: 'carry', text: `Je zit er precies ${F(10 ** pd)} ${d > 0 ? 'boven' : 'onder'}. Kijk naar de ${['', 'tientallen', 'honderdtallen', 'duizendtallen'][pd] || 'grote getallen'}: moest je iets onthouden of lenen?` };
  if (Math.abs(d) === 1 && Number.isInteger(a)) return { code: 'one', text: `Je zit er 1 ${d > 0 ? 'boven' : 'onder'}. Tel je het begingetal mee? Controleer met de omgekeerde som.` };
  if (Math.abs(d) <= .1 && p.dec && !Number.isInteger(d)) return { code: 'decimal', text: 'Bijna! Kijk nog eens goed naar het getal achter de komma.' };
  return null;
}
function say(n) { const E = ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen'], T = ['', 'tien', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig']; const t = Math.floor(n / 10), e = n % 10; return e ? `${E[e]}${e === 2 || e === 3 ? 'ën' : 'en'}${T[t]}` : T[t]; }

export function diagnose(p, st) {
  const v = id => num(st.vals[id]), ans = id => p.cells.find(c => c.id === id)?.answer;
  if (p.cells.length && p.cells.every(c => same(v(c.id), c.answer))) return null;
  try {
    switch (p.kind) {
      case 'column': {
        const w = p.w, T = digits(p.top, w), B = digits(p.bot, w), got = p.cells.map(c => [+c.id.slice(1), v(c.id)]).filter(([, x]) => Number.isFinite(x));
        if (!got.length) break;
        if (p.op === MIN) {
          const bug = T.map((t, i) => Math.abs(t - B[i]));
          if (bug.some((x, i) => x !== digits(p.res, w)[i]) && got.every(([i, x]) => x === bug[i])) return { code: 'smallbig', text: 'Je hebt steeds het kleine cijfer van het grote afgehaald. Is het bovenste cijfer kleiner? Dan moet je eerst lenen van de kolom links.' };
          let borrowBug = T.map((t, i) => (t - B[i] + 10) % 10);
          if (borrowBug.some((x, i) => x !== digits(p.res, w)[i]) && got.every(([i, x]) => x === borrowBug[i])) return { code: 'borrow', text: 'Je hebt geleend, maar in de kolom links ben je de 1 vergeten weg te halen.' };
        } else {
          const bug = T.map((t, i) => (t + B[i]) % 10);
          if (bug.some((x, i) => x !== digits(p.res, w)[i]) && got.every(([i, x]) => x === bug[i])) return { code: 'carry', text: 'Je bent het onthouden vergeten. Is een kolom samen 10 of meer? Dan schuift er 1 naar de kolom links.' };
        }
        break; }
      case 'clockread': {
        const c = p.cells[0]; const x = v(c.id);
        if (p.cells.length === 1 && typeof p.tokens[0] === 'string' && /half|kwart voor|voor half|over half/.test(p.tokens[0]) && Number.isFinite(x) && (x % 12) === ((c.answer + 11) % 12)) return { code: 'halfhour', text: `Bij "${p.tokens[0].replace('Het is ', '')}" noem je het volgende uur. Half ${c.answer} is ${c.answer - 1 || 12}:30.` };
        const m = p.cells.find(c => c.id === 'm'); if (m && Number.isFinite(v('m')) && v('m') * 5 === m.answer) return { code: 'minutes', text: `De grote wijzer op de ${v('m')} betekent ${m.answer} minuten. Elk cijfer is 5 minuten.` };
        break; }
      case 'fracread': if (v('num') === ans('den') && v('den') === ans('num')) return { code: 'fracswap', text: 'Boven en onder zijn omgedraaid. Onder de streep staat in hoeveel stukjes de reep is verdeeld.' }; break;
      case 'fracset': { const x = v('x') ?? v(p.cells[0].id); if (same(x, p.N / p.b) && p.a > 1) return { code: 'onepart', text: `Dat is één deel. Je hebt er ${p.a} nodig.` }; if (same(x, p.N / p.a) && p.a !== p.b) return { code: 'wrongdiv', text: `Deel door het getal onder de streep (${p.b}), niet door het getal erboven.` }; break; }
      case 'equiv': case 'fracadd': {
        const n = v('num'), d = v('den'), [N, D] = [ans('num'), ans('den')];
        if (n > 0 && d > 0 && same(n / d, N / D)) return { code: 'simplify', text: 'Goed gerekend! Maar het kan nog eenvoudiger: deel boven en onder door hetzelfde getal.' };
        if (p.kind === 'fracadd') { const [a, b] = p.tokens[0].frac, [c, dd] = p.tokens[2].frac; if (n === a + c && d === b + dd || (p.tokens[1] !== '+' && n === a - c && d === b - dd)) return { code: 'fracnaive', text: 'Je mag de getallen onder de streep niet optellen. Maak ze eerst gelijk; dan reken je alleen met de getallen erboven.' }; }
        break; }
      case 'ratio': for (const c of p.cells) { const i = +c.id.slice(1), x = v(c.id); if (c.id[0] === 'b' && Number.isFinite(x) && !same(x, c.answer) && same(x, p.rowB[0] + (p.rowA[i] - p.rowA[0]))) return { code: 'additive', text: 'Je hebt er steeds iets bij gedaan. In een verhoudingstabel doe je keer: wat bovenaan keer 3 gaat, gaat onderaan ook keer 3.' }; } break;
      case 'metric': { const x = v('x'), a = ans('x'); if (Number.isFinite(x) && x > 0) { const pr = pow10(x / a); if (pr) return { code: 'ladder', text: `Je bent de verkeerde kant op gegaan op de trap, of te ${Math.abs(pr) > 0 ? 'veel of te weinig' : ''} treden. Naar een kleinere maat wordt het getal groter.` }; } break; }
      case 'round': { const x = v('x'); if (same(x, p.lo) && same(ans('x'), p.hi)) return { code: 'rounddown', text: `${F(p.N)} is ${p.N === p.mid ? 'precies het midden' : 'meer dan het midden'} (${F(p.mid)}). Dan rond je naar boven af.` }; if (same(x, p.hi) && same(ans('x'), p.lo)) return { code: 'roundup', text: `${F(p.N)} is minder dan het midden (${F(p.mid)}). Dan rond je naar beneden af.` }; if (Number.isFinite(x) && Math.abs(x - p.N) < Math.abs(p.hi - p.lo)) return { code: 'roundplace', text: 'Kijk goed waarop je moet afronden: op tientallen, honderdtallen of achter de komma?' }; break; }
      case 'rest': { const q = v('q'), r = v('r'), d = p.tokens[2]; if (Number.isFinite(r) && r >= d) return { code: 'bigrest', text: `De rest is ${F(r)}, maar ${d} past daar nog in. De rest moet kleiner zijn dan ${d}.` }; if (Number.isFinite(q) && Number.isFinite(r) && q * d + r !== p.tokens[0]) return { code: 'restcheck', text: `Controleer: ${q} × ${d} + ${r} moet ${F(p.tokens[0])} zijn.` }; break; }
      case 'area': if (v('o') === ans('a') && v('a') === ans('o')) return { code: 'perimarea', text: 'Omtrek en oppervlakte zijn omgedraaid. Omtrek is de rand, oppervlakte is de binnenkant.' }; break;
      case 'duration': {
        const H = p.cells.find(c => c.id === 'h'), M = p.cells.find(c => c.id === 'm');
        if (H && M && Number.isFinite(v('h')) && Number.isFinite(v('m'))) { if (v('m') >= 60) return { code: 'over60', text: '60 minuten is een heel uur. Maak er een uur extra van.' }; const diff = Math.abs((v('h') * 60 + v('m')) - (H.answer * 60 + M.answer)); if (diff % 60 === 40 || diff === 40) return { code: 'hour100', text: 'Een uur heeft 60 minuten, niet 100. Reken via het hele uur.' }; }
        break; }
      case 'mean': { const s = p.vals.reduce((a, b) => a + b, 0); if (same(v(p.cells[0].id), s)) return { code: 'meansum', text: `Dat is alles samen. Deel nog door ${p.vals.length}.` }; break; }
      case 'graph': for (const c of p.cells) { const x = v(c.id); if (Number.isFinite(x) && !same(x, c.answer) && same(Math.abs(x - c.answer), p.chart.stepV)) return { code: 'gridline', text: `Kijk goed waar de staaf eindigt. Elke lijn is ${F(p.chart.stepV)}.` }; } break;
      case 'jumps': { const st2 = p.seq[1] - p.seq[0]; for (const c of p.cells) { const x = v(c.id); if (Number.isFinite(x) && !same(x, c.answer) && same(Math.abs(x - c.answer), Math.abs(st2))) return { code: 'jumpoff', text: 'Je zit er één sprong naast. Tel de sprongen vanaf een getal dat er al staat.' }; } break; }
      case 'story': { const ns = (p.text.match(/\d+(,\d+)?/g) || []).map(num); const x = v(p.cells[0].id); if (ns.length >= 2 && Number.isFinite(x)) { const [a, b] = ns; const alt = [a + b, Math.abs(a - b)]; if (alt.some(y => same(x, y)) && !same(x, p.cells[0].answer)) return { code: 'storyop', text: 'Lees het verhaal nog eens. Wordt het meer of minder? Maak er een tekening of een getallenlijn bij.' }; } break; }
      case 'colmul': { const T = digits(p.top, p.w), got = p.cells.map(c => [+c.id.slice(1), v(c.id)]).filter(([, x]) => Number.isFinite(x)); const bug = T.map(t => (t * p.bot) % 10); if (got.length && bug.some((x, i) => x !== digits(p.res, p.w)[i]) && got.every(([i, x]) => i >= T.length || x === bug[i])) return { code: 'carry', text: 'Je bent het onthouden vergeten. Tel wat je onthoudt op bij de volgende kolom.' }; break; }
      case 'coord': if (v('x') === ans('y') && v('y') === ans('x') && v('x') !== v('y')) return { code: 'coordswap', text: 'De getallen zijn omgedraaid. Eerst opzij (x), dan omhoog (y).' }; break;
      case 'estimate': { const x = v('x'); if (same(x, p.exact)) return { code: 'exact', text: 'Dat is het precieze antwoord. Bij schatten rond je eerst af, zodat je het makkelijk uit je hoofd kunt.' }; break; }
      case 'negative': { const x = v(p.cells[0].id), a = p.cells[0].answer; if (Number.isFinite(x) && same(x, -a)) return { code: 'sign', text: 'Het getal klopt, maar het teken niet. Zit je onder of boven de nul?' }; break; }
    }
  } catch (e) { /* geen diagnose */ }
  for (const c of p.cells) { const b = cellBug(p, c.id, num(st.vals[c.id]), c.answer); if (b) return b; }
  return null;
}
/* Voor puzzels zonder vakjes (geld, reep, klok, MAB, volgorde) */
export function diagnoseX(p, st) {
  const x = st.x || {};
  try {
    if (p.kind === 'mab') { const tot = x.h * 100 + x.t * 10 + x.o, s = p.solution; if (x.t === s.o && x.o === s.t && s.t !== s.o) return { code: 'mabswap', text: 'Je hebt tientallen en losse omgedraaid. Een staaf is 10, een blokje is 1.' }; if (x.o >= 10) return { code: 'mabten', text: `Je hebt ${x.o} losse blokjes. 10 blokjes is een staaf: ruil ze om.` }; return { code: 'mabcount', text: `Je hebt nu ${F(tot)} gebouwd. Dat is ${F(Math.abs(tot - p.target))} te ${tot > p.target ? 'veel' : 'weinig'}.` }; }
    if (p.kind === 'coins') { const s = x.items.reduce((a, b) => a + b, 0); return { code: 'coincount', text: `Er ligt nu ${euro(s)}. Dat is ${euro(Math.abs(s - p.amt))} te ${s > p.amt ? 'veel' : 'weinig'}.` }; }
    if (p.kind === 'fracbar') { if (x.on.length === p.a && p.k > 1) return { code: 'fracpieces', text: `De reep heeft ${p.pieces} stukjes, maar de noemer is ${p.b}. Eén deel is dus ${p.k} stukjes.` }; return { code: 'fraccount', text: `Je hebt ${x.on.length} stukjes gekleurd. Hoeveel stukjes zijn ${p.a}/${p.b}?` }; }
    if (p.kind === 'clockset') { if (x.m / 5 === p.h % 12 && x.h % 12 === p.m / 5 % 12) return { code: 'hands', text: 'De wijzers zijn omgedraaid. De kleine wijzer wijst het uur, de grote wijzer de minuten.' }; if (x.m === p.m && x.h % 12 === (p.h + 1) % 12) return { code: 'halfhour', text: `Bij ${p.label} is het ${p.h % 12 || 12} uur geweest. De kleine wijzer staat nog na de ${p.h % 12 || 12}.` }; if (x.m !== p.m) return { code: 'minutes', text: `De grote wijzer klopt nog niet. Elk cijfer is 5 minuten: ${p.m} minuten is de ${p.m / 5 || 12}.` }; return null; }
    if (p.kind === 'order') { const byLen = [...x.order].map(i => p.items[i]); const longer = byLen.findIndex((s, k) => k && p.vals[x.order[k - 1]] > p.vals[x.order[k]]); if (longer >= 0 && byLen.some(s => s.includes(','))) return { code: 'declength', text: 'Een langer kommagetal is niet altijd groter. Maak ze even lang: 0,5 = 0,50 is meer dan 0,45.' }; if (byLen.some(s => s.includes('/'))) return { code: 'fracsize', text: 'Hoe groter het getal onder de streep, hoe kleiner elk stukje: 1/8 is kleiner dan 1/4.' }; return null; }
    if (p.kind === 'mirror') { const W = p.W, shifted = p.given.map(c => p.horiz ? c + (p.H / 2) * W : c + W / 2).sort((a, b) => a - b), on = [...x.on].sort((a, b) => a - b); if (on.length === shifted.length && on.every((v, i) => v === shifted[i])) return { code: 'shift', text: 'Je hebt de figuur verschoven, niet gespiegeld. Een spiegelbeeld is omgedraaid: wat dicht bij de lijn zit, blijft dicht bij de lijn.' }; return { code: 'mirrorcount', text: `Kijk nog eens per hokje. Er moeten ${p.want.length} hokjes gekleurd zijn${on.length !== p.want.length ? `, jij hebt er ${on.length}` : ''}.` }; }
    if (p.kind === 'share') return { code: 'share', text: 'Elk bord moet evenveel krijgen en alle koekjes moeten op.' };
  } catch (e) { /* niets */ }
  return null;
}
/* Uitleg voor ouders over een foutcode */
export const BUG_INFO = {
  op: 'verkeerde bewerking (plus en min of keer en plus door elkaar)', inverse: 'terugrekenen bij een ontbrekend getal', swap: 'cijfers omdraaien bij het opschrijven (zesenveertig wordt 64)',
  place: 'nullen of komma op de verkeerde plek', carry: 'onthouden of lenen vergeten', one: 'er 1 naast zitten bij doortellen', decimal: 'cijfers achter de komma',
  smallbig: 'bij cijferend aftrekken steeds klein van groot', borrow: 'lenen bij cijferend aftrekken', halfhour: 'half en kwart voor: het volgende uur noemen', minutes: 'minuten aflezen op de klok',
  hands: 'grote en kleine wijzer', fracswap: 'teller en noemer omdraaien', onepart: 'één deel in plaats van meer delen', wrongdiv: 'delen door de teller in plaats van de noemer',
  simplify: 'breuken vereenvoudigen', fracnaive: 'noemers optellen bij breuken', additive: 'plus in plaats van keer in een verhoudingstabel', ladder: 'de verkeerde kant op de metriek-trap',
  rounddown: 'afronden naar boven', roundup: 'afronden naar beneden', roundplace: 'op de goede plek afronden', bigrest: 'een rest die te groot is', restcheck: 'controleren bij delen met rest',
  perimarea: 'omtrek en oppervlakte door elkaar', over60: 'meer dan 60 minuten', hour100: 'rekenen alsof een uur 100 minuten heeft', meansum: 'gemiddelde: vergeten te delen',
  gridline: 'aflezen in een grafiek', jumpoff: 'sprongen tellen', storyop: 'bij een verhaalsom kiezen tussen meer of minder', sign: 'plus- en minteken bij negatieve getallen',
  mirrorcount: 'spiegelen', mabswap: 'tientallen en eenheden omdraaien', mabten: 'tien losse inwisselen voor een tiental', fracpieces: 'een breuk kleuren als de reep meer stukjes heeft', declength: 'kommagetallen vergelijken (langer is niet groter)',
  fracsize: 'breuken vergelijken (grotere noemer is kleiner stukje)', coordswap: 'x en y omdraaien bij coördinaten', exact: 'precies rekenen in plaats van schatten', shift: 'verschuiven in plaats van spiegelen'
};
