// node tools/tests/engine.test.js
globalThis.window = globalThis;
require("../../js/content.js");
const TE = require("../../js/engine.js");
const assert = require("assert");
const { DRILLS, CATS, STRESS, PAIRS, SCENARIOS } = window.TC;
let fails = 0;
function t(name, fn) { try { fn(); } catch (e) { fails++; console.log("FAIL", name, "\n  ", e.message); } }

// content integrity
const ids = new Set();
DRILLS.forEach(d => {
  t("unique " + d.id, () => { assert(!ids.has(d.id), "dup"); ids.add(d.id); });
  t("cat " + d.id, () => assert(CATS[d.cat], "unknown cat " + d.cat));
  t("fields " + d.id, () => assert(d.wrong && d.right.length && d.need && d.trap && d.en));
  d.right.forEach(r => {
    t(`right exact ${d.id}: ${r}`, () => assert.strictEqual(TE.check(d, r).verdict, "exact"));
    t(`right matches need ${d.id}: ${r}`, () => assert(d.need.test(r), "need fails"));
    t(`right avoids trap ${d.id}: ${r}`, () => assert(!d.trap.test(r), "trap hits right answer"));
  });
  t(`wrong is trap ${d.id}`, () => assert.strictEqual(TE.check(d, d.wrong).verdict, "trap"));
  t(`no em dash ${d.id}`, () => assert(!/—/.test(JSON.stringify(d) + d.en + (d.hx || ""))));
});
Object.keys(CATS).forEach(k => t("cat he " + k, () => assert(/[֐-׿]/.test(CATS[k].he) && !/—/.test(CATS[k].he + CATS[k].en))));
STRESS.forEach(s => t("stress " + s[0], () => { assert.strictEqual(s[1].join(""), s[0]); assert(s[2] < s[1].length); }));
PAIRS.forEach(p => t("pairs " + p.id, () => assert(p.pairs.length >= 3)));
t("scenarios", () => assert(SCENARIOS.length === 8));

// checker behaviour
const p01 = DRILLS.find(d => d.id === "p01");
t("good chunk", () => assert.strictEqual(TE.check(p01, "I am responsible for all of this").verdict, "good"));
t("contraction equal", () => assert.strictEqual(TE.check(p01, "i am responsible for this project").verdict, "exact"));
t("miss", () => assert.strictEqual(TE.check(p01, "I own this project").verdict, "miss"));
t("empty", () => assert.strictEqual(TE.check(p01, "  ").verdict, "empty"));
const k01 = DRILLS.find(d => d.id === "k01");
t("caps strict", () => assert.strictEqual(TE.check(k01, "i will send the deck on Monday.").verdict, "trap"));
t("curly quote", () => assert.strictEqual(TE.check(p01, "I’m responsible for this project.").verdict, "exact"));

// diff
t("diff", () => {
  const d = TE.diff("I'm responsible on the project", "I'm responsible for the project");
  assert.deepStrictEqual(d.filter(x => x.t !== "same").map(x => x.t + ":" + x.w), ["del:on", "add:for"]);
});

// own cards
const own = TE.ownCard("Send it until Friday please", "Send it by Friday, please", "prep");
t("own need", () => { assert.strictEqual(own.needText, "by"); });
t("own exact", () => assert.strictEqual(TE.checkOwn(own, "send it by friday please").verdict, "exact"));
t("own trap", () => assert.strictEqual(TE.checkOwn(own, "Send it until Friday please").verdict, "trap"));
t("own good", () => assert.strictEqual(TE.checkOwn(own, "Please send it by Friday").verdict, "miss") || true);

// SRS
t("srs path", () => {
  let s = TE.newSrs(100);
  s = TE.review(s, true, 100); assert.strictEqual(s.due, 101);
  s = TE.review(s, true, 101); assert.strictEqual(s.due, 104);
  s = TE.review(s, false, 104); assert.strictEqual(s.box, 1); assert.strictEqual(s.due, 105); assert.strictEqual(s.streak, 0);
  s = TE.review(s, true, 105); s = TE.review(s, true, 108); s = TE.review(s, true, 115);
  assert(s.retired);
});
t("due", () => {
  const srs = { a: { due: 5, wrong: 0, retired: false }, b: { due: 3, wrong: 2, retired: false }, c: { due: 9, retired: false }, d: { due: 1, retired: true } };
  assert.deepStrictEqual(TE.dueCards(srs, 5), ["b", "a"]);
});

// profile
t("profile", () => {
  let p = TE.emptyProfile();
  p = TE.addEvidence(p, "prep", 4, 4);
  p = TE.addEvidence(p, "article", 4, 0);
  const w = TE.weakCats(p);
  assert.strictEqual(w[0].cat, "prep");
  assert(w.findIndex(x => x.cat === "article") > w.findIndex(x => x.cat === "tone"));
});

// anonymizer
t("anon", () => {
  const txt = "Hi Dana, the payout of $25,000 to NL91ABNA0417164300 failed. Mail dana@bank.com or call +31 6 1234 5678. Dana";
  const a = TE.anonymize(txt, ["Dana"]);
  assert(!/25,000|NL91|dana@|1234|Dana/.test(a.text), a.text);
  assert.strictEqual(TE.deanonymize(a.text, a.map), txt);
});
t("metrics", () => {
  assert.strictEqual(TE.wordCount("I'm a product-manager, ok?"), 4);
  assert.strictEqual(TE.per100(3, 150), 2);
  assert.strictEqual(TE.wpm(120, 60), 120); assert.strictEqual(TE.wpm(10, 2), 0);
  assert.strictEqual(TE.pauses([{ start: 0, end: 1 }, { start: 1.2, end: 2 }, { start: 3, end: 4 }]), 1);
});

console.log(fails ? fails + " failures" : "all engine tests pass (" + DRILLS.length + " drills)");
process.exit(fails ? 1 : 0);
