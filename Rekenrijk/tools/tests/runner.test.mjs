import assert from 'node:assert/strict';
import * as RN from '../../runner.mjs';
const team = [{ id: 1, group: 0, rarity: 'common' }, { id: 2, group: 14, rarity: 'rare' }, { id: 3, group: 4, rarity: 'secret' }];
// drie verschillende antwoorden, precies één goed, nooit negatief
for (let i = 0; i < 5000; i++) { const a = Math.floor(Math.random() * 120), c = RN.choices(a); assert.equal(c.options.length, 3); assert.equal(new Set(c.options).size, 3); assert.equal(c.options[c.right], a); assert.ok(c.options.every(x => x >= 0)); }
// de weg: 12 sommen, 3 tonnen, 3 groepjes vijanden, een eindbaas aan het eind
const tr = RN.makeTrack(5, 3); const n = t => tr.events.filter(e => e.t === t).length;
assert.equal(n('q'), RN.QUESTIONS); assert.equal(n('g'), 3); assert.equal(n('e'), 3); assert.equal(tr.events.at(-1).t, 'b');
// goed = ridders erbij, fout = ridders kwijt en sterkere vijanden
let r = RN.newRun(5, 3, team); const a0 = r.army; RN.answer(r, true); assert.equal(r.army, a0 + r.plan.perSum); RN.answer(r, false); assert.ok(r.army < a0 + r.plan.perSum); assert.ok(r.extraEnemies > 0);
// verliezen tegen vijanden kost een hart maar je houdt een paar ridders
r = RN.newRun(30, 3, team); r.army = 1; r.i = r.track.events.findIndex(e => e.t === 'e'); const res = RN.clash(r); assert.equal(res.won, false); assert.equal(r.hearts, 2); assert.ok(r.army >= 2);
// eindbaas en sterren
r = RN.newRun(1, 3, team); RN.startBoss(r); RN.answer(r, true); assert.equal(r.bossLeft, r.boss - r.plan.bossHit); r.army = 999; const f = RN.finalFight(r); assert.ok(f.won); assert.equal(RN.stars(r), 3);
// alle krachten werken in het renspel
for (let gr = 0; gr < 20; gr++) { const t = RN.newRun(5, 6, [{ id: 1, group: gr, rarity: 'common' }]); const out = RN.usePower(t, t.leaders[0]); assert.ok(out && out.msg, 'kracht ' + gr); assert.equal(RN.usePower(t, t.leaders[0]), null); }
console.log('alle renspel-tests geslaagd');
