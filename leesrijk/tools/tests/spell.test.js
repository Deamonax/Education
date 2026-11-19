const S = require('../../spell.js');
let fail = 0; const eq = (a, b, m) => { if (a !== b) { fail++; console.log('FOUT', m, JSON.stringify(a), '!=', JSON.stringify(b)); } };
eq(S.diagnose('hont', 'hond'), 'langer', 'hond'); eq(S.diagnose('bomen', 'bommen'), 'dubbel', 'bommen'); eq(S.diagnose('boomen', 'bomen'), 'open', 'boomen');
eq(S.diagnose('bommen', 'bomen'), 'open', 'bomen'); eq(S.diagnose('trij', 'trei'), 'eiij', 'trei'); eq(S.diagnose('zonnug', 'zonnig'), 'iglijk', 'zonnig');
eq(S.diagnose('vroluk', 'vrolijk'), 'iglijk', 'vrolijk'); eq(S.diagnose('lugt', 'lucht'), 'lucht', 'lucht'); eq(S.diagnose('haaj', 'haai'), 'aai', 'haai'); eq(S.diagnose('koud', 'kaud'), 'auou', 'kaud');
// werkwoorden: elk antwoord klopt met de regels
for (let i = 0; i < 2000; i++) { const it = S.verbItem(Math.random), v = S.VERBS.find(x => x[0] === it.inf); const exp = it.form === 'inv' || it.form === 'stam' ? v[1] : it.form === 'inf' ? v[0] : (/t$/.test(v[1]) ? v[1] : v[1] + 't'); if (it.answer !== exp) { fail++; console.log('ww', it); break; } if (S.verbDiagnose(it.answer, it) !== null) { fail++; console.log('diag on correct', it); break; } }
const w = { inf: 'worden', answer: 'wordt', form: 'stamt', hint: '' }; if (!/vergat de t/.test(S.verbDiagnose('word', w))) { fail++; console.log('wordt mist t'); }
if (!/de d staan/.test(S.verbDiagnose('wort', w))) { fail++; console.log('wort'); }
const inv = { inf: 'worden', answer: 'word', form: 'inv', hint: '' }; if (!/geen t/.test(S.verbDiagnose('wordt', inv))) { fail++; console.log('inv'); }
console.log('spelling: fouten', fail); process.exit(fail ? 1 : 0);
