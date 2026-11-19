// node tools/tests/week.test.js : regel om naar de volgende week te gaan
const E = require('../../engine.js');
const assert = require('assert');
const c = (n, ok) => ({ n, ok });
// oude gegevens zonder 'recent': flitsen rond 70% door de trap, dictee wat lager
const ws = { sessions: 5, hak: c(40, 36), zoek: c(30, 26), lang: c(20, 17), flits: c(60, 42), dictee: c(30, 20) };
const old = ['hak', 'zoek', 'lang', 'flits', 'dictee'].map(k => ws[k].ok / ws[k].n).reduce((a, b) => a + b) / 5;
assert(old < 0.8, 'met de oude regel zat dit kind vast: ' + old.toFixed(3));
assert(E.weekReady(ws), 'nieuwe regel: flitsen telt niet mee');
// te weinig oefeningen
assert(!E.weekReady({ ...ws, sessions: 3 }));
// recent telt zwaarder dan oude fouten
const slowStart = { sessions: 6, hak: c(60, 36), zoek: c(10, 9), lang: c(10, 9), dictee: c(10, 9), recent: { hak: Array(20).fill(1) } };
assert(E.weekReady(slowStart), 'oude fouten bij hakken blijven niet eeuwig tellen');
const p = E.weekProgress({ sessions: 2 });
assert(p.acc === null && !p.ready && p.sessions === 2);
console.log('weekregel ok');
