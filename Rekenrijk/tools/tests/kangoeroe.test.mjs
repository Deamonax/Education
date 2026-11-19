// node tools/tests/kangoeroe.test.mjs
// Controleert elke generator op veel zaadjes, met eigen (onafhankelijke) oplossers waar dat kan.
import assert from 'assert';
import * as K from '../../kangoeroe.mjs';

let fails = 0, checks = 0;
const fail = (m) => { fails++; if (fails < 40) console.log('FAIL', m); };
const SEEDS = +process.env.SEEDS || 250;

// ---- eigen oplossers ----
const TF = { mirrorLR: (r, c, n) => [r, n - 1 - c], rotCW: (r, c, n) => [c, n - 1 - r], rot180: (r, c, n) => [n - 1 - r, n - 1 - c], rotCCW: (r, c, n) => [n - 1 - c, r] };
const keyOf = cells => Object.keys(cells).filter(k => cells[k]).sort().map(k => k + cells[k]).join('|');
function transformKey(cells, n, f) { const o = {}; for (const k in cells) { const [r, c] = k.split(',').map(Number); const [a, b] = TF[f](r, c, n); o[`${a},${b}`] = cells[k]; } return keyOf(o); }
function perms(n) { if (n === 1) return [[0]]; const out = []; for (const p of perms(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]); return out; }
// dobbelsteen rollen over de uitslag: houd bij welk vlak van de dobbelsteen onder ligt
function rollOpposites(cells) {
  // dobbelsteen-staat: [onder, boven, noord, zuid, oost, west] als vlak-indices van de kubus 0..5
  const start = { d: 0, u: 1, n: 2, s: 3, e: 4, w: 5 };
  const roll = (st, dir) => dir === 'e' ? { d: st.e, u: st.w, e: st.u, w: st.d, n: st.n, s: st.s } : dir === 'w' ? { d: st.w, u: st.e, w: st.u, e: st.d, n: st.n, s: st.s } : dir === 's' ? { d: st.s, u: st.n, s: st.u, n: st.d, e: st.e, w: st.w } : { d: st.n, u: st.s, n: st.u, s: st.d, e: st.e, w: st.w };
  const face = new Array(6).fill(null), seen = new Map([['0', start]]); face[0] = 0;
  const idx = new Map(cells.map(([r, c], i) => [`${r},${c}`, i])), q = [0], state = { 0: start };
  while (q.length) { const i = q.shift(), [r, c] = cells[i]; for (const [dr, dc, dir] of [[0, 1, 'e'], [0, -1, 'w'], [1, 0, 's'], [-1, 0, 'n']]) { const j = idx.get(`${r + dr},${c + dc}`); if (j !== undefined && state[j] === undefined) { state[j] = roll(state[i], dir); face[j] = state[j].d; q.push(j); } } }
  const opp = { 0: 1, 1: 0, 2: 3, 3: 2, 4: 5, 5: 4 };
  if (new Set(face).size !== 6) return null;
  return face.map(f => face.indexOf(opp[f]));
}

for (const lvl of ['fun', 'kid']) {
  for (const p of K.patternIds(lvl)) for (const band of [1, 2, 3]) {
    const seenKeys = new Set();
    for (let seed = 1; seed <= SEEDS; seed++) {
      let it; const tag = `${lvl}/${p}/${band}/${seed}`;
      try { it = K.makeItem(lvl, p, band, seed); } catch (e) { fail(tag + ' gooit ' + e.message); continue; }
      checks++;
      const o = it.options;
      if (!(o.length >= 4 && o.length <= 5)) fail(tag + ' aantal opties ' + o.length);
      if (!(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < o.length)) fail(tag + ' antwoord-index');
      const ids = o.map(x => (x.key || '') + '§' + (x.text || '') + (x.key ? '' : (x.svg || '')));
      if (new Set(ids).size !== o.length) fail(tag + ' dubbele opties ' + ids.join(' | ').slice(0, 120));
      const all = it.text + it.explain + (it.svg || '') + o.map(x => (x.text || '') + (x.svg || '')).join('') + (it.explainSvg || '');
      if (/undefined|NaN|null|\[object/.test(all)) fail(tag + ' bevat undefined/NaN: ' + it.text.slice(0, 80));
      if (/—/.test(it.text + it.explain)) fail(tag + ' gedachtestreepje');
      if (!it.explain || it.explain.length < 20) fail(tag + ' uitleg te kort');
      if (it.points !== K.POINTS[band]) fail(tag + ' punten');
      // determinisme
      if (seed <= 3) { const again = K.makeItem(lvl, p, band, seed); if (JSON.stringify(again) !== JSON.stringify(it)) fail(tag + ' niet deterministisch'); }
      seenKeys.add(it.text + '|' + (it.svg || '') + '|' + o.map(x => x.text || x.key).join());
      const d = it.data || {};
      const correctText = o[it.answer].text;
      // numerieke antwoorden: de optie moet het antwoord zijn
      if (typeof d.ans === 'number' && +correctText !== d.ans) fail(tag + ` optie ${correctText} != ${d.ans}`);
      // onafhankelijke controles per patroon
      try {
        if ((p === 'spiegel' || p === 'draaien') && lvl === 'fun') {
          const want = transformKey(d.cells, d.n, d.f);
          assert.strictEqual(o[it.answer].key, want);
          assert.strictEqual(o.filter(x => x.key === want).length, 1);
          // het origineel mag nooit hetzelfde zijn als het antwoord
          assert.notStrictEqual(keyOf(d.cells), want);
        }
        if (p === 'blokken' && lvl === 'fun' && band === 3) {
          const front = d.h[0].map((_, c) => Math.max(...d.h.map(row => row[c])));
          assert.strictEqual(o[it.answer].key, front.join());
        }
        if (p === 'route') {
          const g = d.g, R = g.length, C = g[0].length; let best = Infinity;
          const walk = (i, j, s) => { s += g[i][j]; if (i === R - 1 && j === C - 1) { best = Math.min(best, s); return; } if (i < R - 1) walk(i + 1, j, s); if (j < C - 1) walk(i, j + 1, s); };
          walk(0, 0, 0); assert.strictEqual(+correctText, best);
        }
        if (p === 'logica') {
          const sols = perms(d.n).filter(pm => d.clues.every(c => c.t === 'niet' ? pm[c.i] !== c.j : pm[c.i] === c.j));
          assert.strictEqual(sols.length, 1, 'niet uniek');
          assert.strictEqual(d.items[sols[0][d.target]], d.ans);
          assert.strictEqual(correctText.toLowerCase(), d.ans.toLowerCase());
        }
        if (p === 'routes') {
          const bl = new Set(d.blocked); let count = 0;
          const go = (x, y) => { if (x === d.W && y === d.H) { count++; return; } if (x < d.W && !bl.has(`${x},${y}>${x + 1},${y}`)) go(x + 1, y); if (y < d.H && !bl.has(`${x},${y}>${x},${y + 1}`)) go(x, y + 1); };
          go(0, 0); assert.strictEqual(+correctText, count);
        }
        if (p === 'vouwen') {
          const n = 4, set = new Set();
          for (const [a, b] of d.holes) for (const c of [b, n - 1 - b]) for (const rr of d.folds === 1 ? [a] : [a, n - 1 - a]) set.add(`${rr},${c}`);
          assert.strictEqual(o[it.answer].key, [...set].sort().join('|'));
        }
        if (p === 'dobbelsteen') {
          if (band === 1) { const opp = rollOpposites(d.net), s = d.labels.indexOf('★'); assert.strictEqual(+correctText, 7 - +d.labels[opp[s]]); }
          if (band === 2) { const opp = rollOpposites(d.net); assert.strictEqual(correctText, d.L[opp[d.q]]); }
          if (band === 3) {
            const valid = d.nets.map(x => { const opp = rollOpposites(x.net); return opp && x.vals.every((v, i) => v + x.vals[opp[i]] === 7); });
            assert.strictEqual(valid.filter(Boolean).length, 1, 'precies één geldige uitslag');
            assert.strictEqual(valid[it.answer], true);
          }
        }
        if (p === 'kalender' && band < 3) {
          const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
          const m1 = it.text.match(/Vandaag is het (\w+)\. Welke dag is het over (\d+) dagen/), m2 = it.text.match(/^(\d+) \w+ is een (\w+)\. Welke dag is (\d+) \w+/);
          const want = m1 ? DAGEN[(DAGEN.indexOf(m1[1]) + +m1[2]) % 7] : DAGEN[(DAGEN.indexOf(m2[2]) + +m2[3] - +m2[1]) % 7];
          assert.strictEqual(correctText, want);
        }
        if (p === 'kalender' && band === 3) { const [a, b] = it.text.match(/elke (\d+) dagen/g).map(x => +x.match(/\d+/)[0]); let t = 1; while (t % a || t % b) t++; assert.strictEqual(+correctText, t); }
        if (p === 'rij' && band === 1) { const [, f, bk] = it.text.match(/als (\d+)e van voren en als (\d+)e van achteren/); assert.strictEqual(+correctText, +f + +bk - 1); }
        if (p === 'rij' && band === 2) { const [, n] = it.text.match(/Er staan (\d+) kinderen/), [, a] = it.text.match(/als (\d+)e van voren/), [, b] = it.text.match(/als (\d+)e van achteren/); assert.strictEqual(+correctText, (+n - +b + 1) - +a - 1); }
        if (p === 'rij' && band === 3) {
          const names = o.map(x => x.text), facts = [...it.text.matchAll(/([\p{L}]+) is (groter|kleiner) dan ([\p{L}]+)\./gu)].map(m => m[2] === 'groter' ? [m[1], m[3]] : [m[3], m[1]]);
          const order = perms(5).map(pm => pm.map(i => names[i])).filter(ord => facts.every(([big, small]) => ord.indexOf(big) < ord.indexOf(small)));
          assert.strictEqual(order.length, 1);
          const pos = ['grootste', 'op één na grootste', 'middelste', 'op één na kleinste'].findIndex(w => it.text.endsWith(`de ${w}?`));
          assert.strictEqual(correctText, order[0][pos]);
        }
        if (p === 'combinaties' && band === 2) { const cards = [...it.explain.matchAll(/(\d+)\+(\d+)=(\d+)/g)].map(m => +m[3]); assert.strictEqual(+correctText, new Set(cards).size); }
        if (p === 'symbolen' || p === 'piramide' || p === 'verdelen' || p === 'weegschaal' || p === 'verhaal' || p === 'tellen' || p === 'patroon' || p === 'blokken' || p === 'combinaties') {
          if (typeof d.ans === 'number') assert(d.ans >= 0);
        }
        if (p === 'patroon' && band < 3) assert.strictEqual(correctText, d.ans);
        if (p === 'puzzel') {
          // eigen vormvergelijking: verschuiven, draaien (als het mag), nooit omdraaien
          const normd = c => { const a = Math.min(...c.map(x => x[0])), b = Math.min(...c.map(x => x[1])); return c.map(([x, y]) => [x - a, y - b]).sort((u, v) => u[0] - v[0] || u[1] - v[1]).map(x => x.join()).join('|'); };
          const variants = c => { const out = new Set(); let cur = c; for (let i = 0; i < (d.rotate ? 4 : 1); i++) { out.add(normd(cur)); cur = cur.map(([x, y]) => [y, -x]); } return out; };
          const hole = variants(d.hole);
          const fits = o.map(op => [...variants(op.cells)].some(v => hole.has(v)));
          assert.strictEqual(fits.filter(Boolean).length, 1, 'precies één stukje past');
          assert.strictEqual(fits[it.answer], true);
        }
        if (p === 'knopen') {
          const knotted = d.metas.map(m => m.kind === 'trefoil' && m.n === 3 && m.alt === true);
          assert(d.metas.every(m => m.kind !== 'trefoil' || m.n === 3), 'trefoil heeft 3 kruisingen');
          const wantKnot = /een echte knoop/.test(it.text);
          const good = knotted.map(k => wantKnot ? k : !k);
          assert.strictEqual(good.filter(Boolean).length, 1, 'precies één goed touw');
          assert.strictEqual(good[it.answer], true);
        }
        if (p === 'spiegels') {
          // eigen straal-simulatie
          const turn = { '/': { R: 'U', L: 'D', D: 'L', U: 'R' }, '\\': { R: 'D', L: 'U', D: 'R', U: 'L' } }, mv = { R: [0, 1], L: [0, -1], U: [-1, 0], D: [1, 0] };
          let r0 = d.row, c0 = 0, dir = 'R', exit = null;
          for (let g = 0; g < 100 && !exit; g++) {
            if (r0 < 0) exit = `boven,${c0}`; else if (r0 >= d.n) exit = `onder,${c0}`; else if (c0 < 0) exit = `links,${r0}`; else if (c0 >= d.n) exit = `rechts,${r0}`;
            else { const m = d.mirrors[`${r0},${c0}`]; if (m) dir = turn[m][dir]; r0 += mv[dir][0]; c0 += mv[dir][1]; }
          }
          assert.strictEqual(correctText, d.label[exit]);
          assert.strictEqual(new Set(o.map(x => x.text)).size, 5);
        }
        if (p === 'water') {
          const lv = d.glasses.map(g => d.ask === 'max-after' ? g.w + g.small + 2 * g.big : g.w);
          const target = d.ask === 'max-after' ? Math.max(...lv) : Math.min(...lv);
          assert.strictEqual(lv.filter(v => v === target).length, 1);
          assert.strictEqual(correctText, `glas ${lv.indexOf(target) + 1}`);
          assert(d.glasses.every(g => g.w + g.small + 2 * g.big <= 9));
        }
        if (p === 'automaat' && band === 3) {
          const nums = (it.text.match(/\d+/g) || []).map(Number);
          if (/minstens/.test(it.text)) { const [k, m, g] = [nums[1], nums[2], nums[4]]; let red = 0; while (red * k < g * m) red++; assert.strictEqual(+correctText, red); }
          else { const [k, m, red] = [nums[1], nums[2], nums[4]]; assert.strictEqual(+correctText, Math.floor(red * k / m)); }
        }
        if (p === 'automaat' && band === 2) { let x = +it.text.match(/Je stopt (\d+) erin/)[1]; for (let i = 0; i < 3; i++) x = x % 2 ? x + 1 : x / 2; assert.strictEqual(+correctText, x); }
      } catch (e) { fail(tag + ' controle: ' + e.message.slice(0, 160)); }
    }
    if (seenKeys.size < Math.min(18, SEEDS / 4)) fail(`${lvl}/${p}/${band}: te weinig variatie (${seenKeys.size} verschillend)`);
  }
}

// ---- taxonomie ----
for (const lvl of ['fun', 'kid']) {
  const ids = K.patternIds(lvl);
  if (ids.length < 10 || ids.length > 15) fail(lvl + ' aantal patronen ' + ids.length);
}

// ---- adaptief model ----
{
  const k = K.freshKanga(3);
  // een kind dat 'spiegel' nooit goed doet, de rest altijd: oefenen moet naar spiegel gaan
  for (let i = 0; i < 80; i++) { const it = K.nextPractice(k, 'fun', Math.random); K.update(k, 'fun', it.pattern, it.band, it.pattern !== 'spiegel'); }
  const tail = []; for (let i = 0; i < 30; i++) { const it = K.nextPractice(k, 'fun', Math.random); tail.push(it.pattern); K.update(k, 'fun', it.pattern, it.band, it.pattern !== 'spiegel'); }
  const share = tail.filter(x => x === 'spiegel').length / tail.length;
  if (share < .3) fail('adaptief: zwakste patroon te weinig gekozen ' + share);
  if (K.mastery(k.skill.fun.spiegel) > 30) fail('adaptief: beheersing spiegel te hoog ' + K.mastery(k.skill.fun.spiegel));
  if (K.mastery(k.skill.fun.tellen) < 70) fail('adaptief: beheersing tellen te laag ' + K.mastery(k.skill.fun.tellen));
  const it = K.nextPractice(k, 'fun', () => .5); if (it.band !== 1 && it.pattern === 'spiegel') fail('zwak patroon hoort band 1 te krijgen');
  if (!k.hist.fun.spiegel.length) fail('geschiedenis niet bijgehouden');
  const clean = K.cleanKanga(JSON.parse(JSON.stringify(k)), 3);
  for (const id of Object.keys(k.skill.fun)) if (JSON.stringify(clean.skill.fun[id]) !== JSON.stringify(k.skill.fun[id])) fail('cleanKanga verliest vaardigheid ' + id);
  if (K.cleanKanga({ skill: { fun: { tellen: { th: 'x' } } }, contests: [null, 5] }, 3).contests.length) fail('cleanKanga laat rommel door');
}

// ---- wedstrijd ----
{
  const fF3 = K.contestFormat('fun', 3), fF4 = K.contestFormat('fun', 4), fK = K.contestFormat('kid', 6);
  assert.deepStrictEqual([fF3.n, fF3.minutes, fF4.n, fF4.minutes, fK.n, fK.minutes], [12, 30, 24, 60, 24, 50]);
  const paper = K.makePaper('kid', 6, 42);
  if (paper.items.length !== 24) fail('blad lengte');
  const bands = paper.items.map(x => x.band).join('');
  if (bands !== '1'.repeat(8) + '2'.repeat(8) + '3'.repeat(8)) fail('blad niet oplopend: ' + bands);
  const counts = {}; paper.items.forEach(x => counts[x.pattern] = (counts[x.pattern] || 0) + 1);
  if (Object.keys(counts).length !== K.patternIds('kid').length || Math.max(...Object.values(counts)) > 2) fail('patronen niet eerlijk verdeeld ' + JSON.stringify(counts));
  const perfect = K.scorePaper(paper, paper.items.map(x => x.answer));
  if (perfect.total !== 24 + 8 * 3 + 8 * 4 + 8 * 5 || perfect.total !== perfect.max) fail('max score ' + perfect.total);
  const blank = K.scorePaper(paper, paper.items.map(() => null));
  if (blank.total !== 24) fail('leeg blad hoort startpunten te houden');
  const allWrong = K.scorePaper(paper, paper.items.map(x => (x.answer + 1) % x.options.length));
  if (allWrong.total !== 24 - (8 * 3 + 8 * 4 + 8 * 5) / 4) fail('aftrek ' + allWrong.total);
  if (allWrong.total < 0) fail('negatief');
  const w4 = K.scorePaper(paper, paper.items.map((x, i) => i < 10 ? x.answer : i < 20 ? null : (x.answer + 1) % 5), 'w4');
  if (w4.total !== 10 * 5 + 10 * 1 || w4.max !== 120) fail('w4-telling ' + w4.total + '/' + w4.max);
  const sumPer = Object.values(perfect.per).reduce((a, p) => a + p.got, 0);
  if (sumPer + 24 !== perfect.total) fail('per patroon telt niet op');
  const fun3 = K.makePaper('fun', 3, 7);
  if (fun3.items.length !== 12 || K.scorePaper(fun3, fun3.items.map(x => x.answer)).max !== 12 + 4 * 3 + 4 * 4 + 4 * 5) fail('wizFUN groep 3 blad');
}

console.log(fails ? `${fails} fouten (van ${checks} opgaven)` : `alle kangoeroe-tests geslaagd (${checks} opgaven gecontroleerd)`);
process.exit(fails ? 1 : 0);
