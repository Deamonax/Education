import assert from 'node:assert/strict';
import * as LG from '../../leger.mjs';
const team = [{ id: 1, group: 0, rarity: 'common' }, { id: 2, group: 14, rarity: 'rare' }, { id: 3, group: 4, rarity: 'secret' }];
// startleger = teamkracht × 2 × schaal
let r = LG.newRun(1, 3, team); assert.equal(r.teamPower, 6); assert.equal(r.army, 12);
// goede som geeft ridders, foute som maakt de volgende golf sterker
const before = LG.enemiesNow(r); LG.answerRecruit(r, true, false); assert.equal(r.army, 12 + r.plan.perSum);
LG.answerRecruit(r, false, false); assert.equal(r.wrong, 1); assert.ok(LG.enemiesNow(r) > before);
assert.equal(r.phase, 'battle');
// gevecht = minsom
const e = LG.enemiesNow(r), a = r.army, res = LG.battle(r); assert.equal(res.left, a - e); assert.equal(r.wave, 1);
// poort: precies één beste keuze, nooit gelijk
for (let i = 0; i < 2000; i++) { for (const g of [3, 6]) { const army = 1 + Math.floor(Math.random() * 150), o = LG.gateOptions(army, g); assert.equal(o.length, 2); assert.equal(o.filter(x => x.best).length, 1); assert.notEqual(o[0].result, o[1].result); } }
// verliezen kost een hart; 0 harten = einde
r = LG.newRun(30, 3, team); r.army = 0; r.phase = 'battle'; for (let i = 0; i < 3; i++) { r.phase = 'battle'; LG.battle(r); } assert.equal(r.done, true); assert.equal(r.won, false); assert.equal(LG.stars(r), 0);
// sterren
r = LG.newRun(1, 3, team); r.won = true; r.hearts = 3; r.wrong = 0; assert.equal(LG.stars(r), 3); r.wrong = 3; assert.equal(LG.stars(r), 2); r.wrong = 6; assert.equal(LG.stars(r), 1);
// elke familie heeft een kracht die werkt
for (let g = 0; g < 20; g++) { const t = LG.newRun(5, 6, [{ id: 1, group: g, rarity: 'common' }]); t.phase = LG.powerFor(g).when === 'battle' ? 'battle' : 'recruit'; const out = LG.usePower(t, t.leaders[0]); assert.ok(out && out.msg, 'kracht ' + g); assert.equal(t.leaders[0].used, true); assert.equal(LG.usePower(t, t.leaders[0]), null); }
assert.equal(new Set(Array.from({ length: 20 }, (_, g) => LG.powerFor(g).id)).size, 20);
// opslag
const c = LG.cleanLeger({ stars: { 1: 3, 2: 9, 99: 2, x: 1 }, plays: 4, team: [1, 'a', 2] }); assert.deepEqual(c.stars, { 1: 3 }); assert.deepEqual(c.team, [1, 2]);
assert.ok(LG.unlocked(c, 2)); assert.ok(!LG.unlocked(c, 3));
console.log('alle rekenleger-tests geslaagd');
// smederij
{ const d = LG.cleanLeger({ coins: 100 }); assert.ok(LG.buy(d, 'zwaard')); assert.equal(d.coins, 85); assert.equal(d.gear.zwaard, 1);
  const r1 = LG.newRun(3, 3, team), r2 = LG.newRun(3, 3, team, { zwaard: 2, schild: 1, boog: 1, kanon: 1, muur: 1 });
  assert.equal(r2.plan.perSum, r1.plan.perSum + 2); assert.equal(r2.army, r1.army + 5); assert.equal(r2.hearts, 4); assert.ok(r2.boss < r1.boss);
  assert.equal(LG.enemiesNow(r2), Math.max(0, LG.enemiesNow(r1) - 2));
  const poor = LG.cleanLeger({ coins: 5 }); assert.ok(!LG.buy(poor, 'muur'));
  const full = LG.cleanLeger({ coins: 9999, gear: { muur: 2 } }); assert.ok(!LG.buy(full, 'muur'));
  const w = LG.newRun(1, 3, team); w.won = true; w.correct = 20; w.wrong = 0; w.hearts = 3; assert.equal(LG.coinsFor(w), 20 + 15 + 5); }
console.log('smederij-tests geslaagd');
