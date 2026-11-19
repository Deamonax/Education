/* LeesRijk spelling: categorieën met regels, foutanalyse en werkwoordspelling (tegenwoordige tijd, groep 5 en 6).
   De categorieën volgen de manier waarop spelling op de basisschool wordt aangeleerd (hakwoorden, langermaakwoorden,
   klankgroepen, weetwoorden, enzovoort). */
(function (root) {
  'use strict';
  var Eng = (typeof module !== 'undefined' && module.exports) ? require('./engine.js') : root.LE;

  var CAT = {
    langer: { name: 'langermaakwoord', rule: 'Hoor je aan het eind een t? Maak het woord langer: hond wordt honden. Hoor je dan een d, dan schrijf je d.' },
    open: { name: 'klankgroep met lange klank', rule: 'Hoor je een lange klank aan het eind van een klankgroep? Dan schrijf je één letter: bo-men, ma-ken.' },
    dubbel: { name: 'klankgroep met korte klank', rule: 'Hoor je een korte klank? Dan schrijf je twee medeklinkers: bom-men, tak-ken.' },
    eiij: { name: 'ei of ij (weetwoord)', rule: 'ei of ij hoor je hetzelfde. Dat moet je onthouden. Kijk goed naar het woord en schrijf het een paar keer.' },
    auou: { name: 'au of ou (weetwoord)', rule: 'au of ou hoor je hetzelfde. Dat moet je onthouden. Een trucje: kijk goed welke letters het woord heeft.' },
    gch: { name: 'g of ch', rule: 'g en ch klinken bijna hetzelfde. Bij woorden met cht schrijf je meestal ch (lucht, acht).' },
    iglijk: { name: '-ig en -lijk', rule: 'Je hoort "ug" en "luk", maar je schrijft -ig en -lijk: zonnig, vrolijk.' },
    zing: { name: 'zingwoord (ng, nk)', rule: 'Hoor je ng of nk? Die schrijf je met een n: zingen, bank.' },
    lucht: { name: 'luchtwoord (cht)', rule: 'Na een korte klank hoor je vaak cht. Die schrijf je met ch: lucht, nacht.' },
    eer: { name: 'eer, oor, eur', rule: 'Voor een r klinken ee, oo en eu een beetje anders. Je schrijft toch ee, oo, eu: beer, deur, oor.' },
    aai: { name: 'aai, ooi, oei', rule: 'Je hoort aaj, ooj, oej. Je schrijft aai, ooi, oei: haai, mooi, groei.' },
    eeuw: { name: 'eeuw, ieuw', rule: 'Je schrijft eeuw en ieuw: sneeuw, nieuw.' },
    voor: { name: 'vaste beginstukjes', rule: 'be-, ge-, ver-, ont- en her- schrijf je altijd hetzelfde. In be-, ge- en ver- klinkt de e als "uh".' },
    achter: { name: 'vaste eindstukken', rule: '-heid, -ing, -baar, -tie en -isch schrijf je altijd hetzelfde. -tie klinkt als "tsie".' },
    leen: { name: 'leenwoord', rule: 'Dit woord komt uit een andere taal. Je schrijft het anders dan je het hoort. Onthoud het woordbeeld.' },
    hak: { name: 'hakwoord', rule: 'Zeg het woord langzaam en schrijf elke klank die je hoort.' },
    ww: { name: 'werkwoordspelling', rule: 'Ik: alleen de stam (ik word). Jij en hij: stam + t (hij wordt). Staat jij achter het werkwoord? Dan geen t (word jij). Wij, jullie, zij: het hele werkwoord.' }
  };
  function cats(w) {
    w = String(w).toLowerCase(); var sy = Eng.syllables(w), out = [];
    if (Eng.tags(w).indexOf('leen') >= 0) out.push('leen');
    if (/[db]$/.test(w)) out.push('langer');
    if (sy.length >= 2 && /[^aeiou][aeou]$/.test(sy[0]) && !/^ch/.test(sy[1])) out.push('open');
    if (/([bdfgklmnprstvz])\1/.test(w)) out.push('dubbel');
    if (/ei|ij/.test(w)) out.push('eiij');
    if (/au|ou/.test(w) && !/eeuw|ieuw/.test(w)) out.push('auou');
    if (/cht/.test(w)) out.push('lucht'); else if (/ch|g/.test(w) && !/ng/.test(w.replace(/ng/g, ''))) { if (/ch/.test(w) || /g$/.test(w)) out.push('gch'); }
    if (/(ig|lijk)$/.test(w)) out.push('iglijk');
    if (/n[gk]/.test(w)) out.push('zing');
    if (/(eer|oor|eur)/.test(w)) out.push('eer');
    if (/(aai|ooi|oei)/.test(w)) out.push('aai');
    if (/(eeuw|ieuw)/.test(w)) out.push('eeuw');
    if (/^(be|ge|ver|ont|her)/.test(w) && sy.length >= 2) out.push('voor');
    if (/(heid|ing|baar|tie|isch)$/.test(w)) out.push('achter');
    if (!out.length) out.push('hak');
    return out;
  }
  /* wat ging er mis? vergelijk wat het kind schreef met het goede woord */
  function diagnose(typed, w) {
    typed = String(typed || '').trim().toLowerCase(); w = String(w).toLowerCase();
    if (typed === w) return null;
    var c = cats(w);
    if (/cht/.test(w) && typed === w.replace('cht', 'gt')) return 'lucht';
    var swaps = [['ei', 'ij', 'eiij'], ['ij', 'ei', 'eiij'], ['au', 'ou', 'auou'], ['ou', 'au', 'auou'], ['ch', 'g', 'gch'], ['g', 'ch', 'gch']];
    for (var i = 0; i < swaps.length; i++) { var s = swaps[i]; if (w.indexOf(s[0]) >= 0 && typed === w.replace(s[0], s[1])) return s[2]; }
    if (/[db]$/.test(w) && typed === w.slice(0, -1) + (w.slice(-1) === 'd' ? 't' : 'p')) return 'langer';
    if (/ig$/.test(w) && (typed === w.replace(/ig$/, 'ug') || typed === w.replace(/ig$/, 'eg'))) return 'iglijk';
    if (/lijk$/.test(w) && /l(u|e|ij|ei)k$/.test(typed) && typed.replace(/l(u|e|ij|ei)k$/, '') === w.replace(/lijk$/, '')) return 'iglijk';
    if (/([bdfgklmnprstvz])\1/.test(w) && typed === w.replace(/([bdfgklmnprstvz])\1/, '$1')) return 'dubbel';
    if (/([aeou])([bdfgklmnprstvz])(?=[aeiou])/.test(w) && (typed === w.replace(/([^aeiou])([aeou])([bdfgklmnprstvz])(?=[aeiou])/, '$1$2$2$3') || typed === w.replace(/([^aeiou])([aeou])([bdfgklmnprstvz])(?=[aeiou])/, '$1$2$3$3'))) return 'open';
    if (/n[gk]/.test(w) && (typed === w.replace('ng', 'n') || typed === w.replace('nk', 'k'))) return 'zing';
    if (/(aai|ooi|oei)/.test(w) && typed === w.replace(/(aa|oo|oe)i/, '$1j')) return 'aai';
    if (/(eeuw|ieuw)/.test(w) && typed === w.replace(/(ee|ie)uw/, '$1w')) return 'eeuw';
    if (/^(be|ge|ver)/.test(w) && /^(bu|gu|vur|bi|ve)/.test(typed)) return 'voor';
    if (/tie$/.test(w) && /(sie|tsie|sei)$/.test(typed)) return 'achter';
    if (c.indexOf('leen') >= 0) return 'leen';
    return c[0] === 'hak' ? 'hak' : c[0];
  }

  /* ---------- werkwoordspelling: tegenwoordige tijd ---------- */
  var VERBS = [
    ['worden', 'word', 'boos als hij verliest', 'heel groot'], ['vinden', 'vind', 'het boek spannend', 'de sleutel niet'], ['rijden', 'rijd', 'op een pony', 'naar oma'],
    ['houden', 'houd', 'van pannenkoeken', 'de deur open'], ['antwoorden', 'antwoord', 'meteen', 'op de vraag'],
['lopen', 'loop', 'naar school', 'heel hard'],
    ['werken', 'werk', 'in de tuin', 'op de computer'], ['zitten', 'zit', 'op de bank', 'naast mij'], ['praten', 'praat', 'met de buurvrouw', 'te veel'],
    ['eten', 'eet', 'een appel', 'veel groente'], ['lezen', 'lees', 'een strip', 'elke avond'], ['leven', 'leef', 'in een huis aan zee', 'gezond'],
    ['fietsen', 'fiets', 'naar de bieb', 'door het bos'], ['spelen', 'speel', 'buiten', 'op de gitaar'], ['wachten', 'wacht', 'op de bus', 'bij het hek'],
    ['zetten', 'zet', 'de tas neer', 'thee'], ['bakken', 'bak', 'een taart', 'koekjes'], ['tekenen', 'teken', 'een draak', 'met krijt'], ['beloven', 'beloof', 'het', 'dat ik kom']
  ];
  var SUBJ = [['Ik', 'ik', 'stam'], ['Jij', 'jij', 'stamt'], ['Hij', 'hij', 'stamt'], ['Sanne', 'hij', 'stamt'], ['Mijn zus', 'hij', 'stamt'], ['Wij', 'wij', 'inf'], ['Jullie', 'wij', 'inf']];
  function vform(v, kind) { var inf = v[0], stam = v[1]; if (kind === 'stam') return stam; if (kind === 'inf') return inf; return /t$/.test(stam) ? stam : stam + 't'; }
  function verbItem(r) {
    r = r || Math.random; var v = Eng.pick(VERBS, r), compl = Eng.pick([v[2], v[3]], r), roll = r();
    if (roll < .25) { /* vraagzin met jij achter het werkwoord: geen t */
      var ans = v[1], cap = ans[0].toUpperCase() + ans.slice(1);
      return { kind: 'ww', inf: v[0], answer: ans, before: '', after: ' jij ' + compl + '?', capital: true, display: cap, form: 'inv', hint: 'Jij staat achter het werkwoord. Dan schrijf je alleen de stam, zonder t.' };
    }
    var s = Eng.pick(SUBJ, r), a = vform(v, s[2]);
    return { kind: 'ww', inf: v[0], answer: a, before: s[0] + ' ', after: ' ' + compl + '.', form: s[2], hint: s[2] === 'stam' ? 'Ik: alleen de stam.' : s[2] === 'inf' ? 'Bij wij, jullie en zij (meer mensen) schrijf je het hele werkwoord.' : 'Bij jij, hij en zij: stam + t. Eindigt de stam al op t? Dan geen extra t.' };
  }
  function verbDiagnose(typed, it) {
    var t = String(typed || '').trim().toLowerCase(), a = it.answer.toLowerCase(), stam = (VERBS.find(function (v) { return v[0] === it.inf; }) || [])[1] || '';
    if (t === a) return null;
    if (it.form === 'stamt' && t === stam) return 'Je vergat de t. Bij jij, hij en zij schrijf je stam + t: ' + it.answer + '.';
    if (it.form === 'inv' && t === stam + 't') return 'Jij staat hier achter het werkwoord. Dan komt er geen t achter: ' + it.answer + ' jij.';
    if (it.form === 'stam' && t === stam + 't') return 'Bij ik schrijf je alleen de stam, zonder t: ' + it.answer + '.';
    if (/d$/.test(stam) && (t === stam.slice(0, -1) + 't' || t === stam.slice(0, -1) + 'dt'.slice(1))) return 'Je hoort een t, maar de stam is "' + stam + '" (van ' + it.inf + '). Daar blijft de d staan' + (it.form === 'stamt' ? ' en komt er een t achter: ' + it.answer : '') + '.';
    if (/t$/.test(stam) && t === stam + 't') return 'De stam "' + stam + '" eindigt al op een t. Dan komt er geen tweede t bij.';
    if (it.form === 'inf' && t !== it.inf) return 'Bij meer mensen (wij, jullie, zij) schrijf je het hele werkwoord: ' + it.inf + '.';
    return 'Zoek eerst de stam: ' + it.inf + ' wordt "' + stam + '". ' + it.hint;
  }

  var S = { CAT: CAT, cats: cats, diagnose: diagnose, VERBS: VERBS, verbItem: verbItem, verbDiagnose: verbDiagnose, vform: vform };
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.LS = S;
})(this);
