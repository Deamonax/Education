"""Zet de Leesroute (12 weken) om naar data voor LeesRijk: content.js."""
import sys, re, json, random
sys.path.insert(0, '/home/claude/lees2'); sys.path.insert(0, '/home/claude/lees')
import pyphen
from wordfreq import zipf_frequency as zf
from content2 import WEEKS, SYLL_OVERRIDE, TEST_REAL, TEST_NON, INSTAP_WORDS, INSTAP_NON
sys.path.insert(0, '/home/claude/ls/tools')
from extra_content import TEXTS, SPELL_EXTRA, LEEN_EXTRA
from questions import Q

DIC = pyphen.Pyphen(lang='nl_NL', left=1, right=1)
EXTRA_SYL = {'vakantie': 'va-kan-tie', 'politie': 'po-li-tie', 'station': 'sta-tion', 'olifanten': 'o-li-fan-ten', 'bibliotheek': 'bi-bli-o-theek',
             'cadeau': 'ca-deau', 'pyjama': 'py-ja-ma', 'chocolade': 'cho-co-la-de', 'horloge': 'hor-lo-ge', 'douche': 'dou-che', 'restaurant': 'res-tau-rant',
             'kangoeroe': 'kan-goe-roe', 'papegaai': 'pa-pe-gaai', 'gymnastiek': 'gym-nas-tiek', 'kastanje': 'kas-tan-je', 'aardappelen': 'aard-ap-pe-len'}
def syl(w):
    w0 = w.lower()
    s = EXTRA_SYL.get(w0) or SYLL_OVERRIDE.get(w0) or DIC.inserted(w0)
    return s.split('-')

def esc_rule(h): return h  # eigen, vertrouwde inhoud met <b> en <u>

weeks = []
allwords = set()
for w in WEEKS:
    d = {k: w.get(k) for k in ['n', 'short', 'title', 'color', 'mode', 'pattern', 'rule', 'tip', 'examples', 'words', 'nonwords', 'nonword_label', 'sentences', 'text_title', 'text', 'spell', 'review', 'sort_task']}
    d['manual'] = w.get('manual') or {}
    g = w['g6']; d['g6'] = {'title': g[0], 'text': g[1], 'vocab': g[2], 'q': [[q[0], q[1]] for q in Q[w['n']]]}
    d['texts'] = [[w['text_title'], w['text']]] + [list(t) for t in TEXTS.get(w['n'], [])]
    d['spell'] = list(dict.fromkeys((w.get('spell') or []) + SPELL_EXTRA.get(w['n'], [])))
    if w.get('mode') == 'manual':
        d['manual'] = dict(d['manual']); d['manual'].update(LEEN_EXTRA)
        d['words'] = list(dict.fromkeys(d['words'] + list(LEEN_EXTRA)))
    d = {k: v for k, v in d.items() if v not in (None, {}, [])}
    weeks.append(d)
    for k in ['words', 'nonwords', 'spell', 'sort_task']: allwords.update(x.lower() for x in d.get(k, []))

# woorden uit de eigen teksten (veilig, kindvriendelijk) als extra oefen- en toetsmateriaal
texts = []
for w in WEEKS:
    texts += [w.get('text', ''), w['g6'][1]] + w.get('sentences', [])
tok = re.findall(r"[A-Za-zÀ-ÿ]+", ' '.join(texts))
lower = {t for t in tok if t == t.lower()}
textwords = sorted({t for t in lower if len(t) >= 3 and zf(t, 'nl') > 1.5})
# extra teksten: alleen voor de oefenvoorraad, niet voor de toetskaarten (die moeten gelijk blijven)
tok2 = re.findall(r"[A-Za-zÀ-ÿ]+", ' '.join(t[1] for v in TEXTS.values() for t in v))
textwords_all = sorted(set(textwords) | {t for t in tok2 if t == t.lower() and len(t) >= 3 and zf(t, 'nl') > 1.5})
practiced = set()
for w0 in WEEKS:
    for k in ['words', 'nonwords', 'spell', 'sort_task']: practiced.update(x.lower() for x in (w0.get(k) or []))

def nsyl(w): return len(syl(w))
rng = random.Random(42)
pool1 = [w for w in textwords if nsyl(w) == 1 and w not in practiced]
pool2 = [w for w in textwords if nsyl(w) == 2 and w not in practiced]
pool3 = [w for w in textwords if nsyl(w) >= 3 and w not in practiced]
for p in (pool1, pool2, pool3): rng.shuffle(p)
def card(off):
    a = sorted(pool1[off::2][:35], key=len); b = sorted(pool2[off::2][:35], key=len); c = sorted(pool3[off::2][:30], key=len)
    return a + b + c
cards = {'A': card(0), 'B': card(1)}

# onzinwoorden voor de onzinwoordenkaart (Klepel-achtig): gecontroleerd dat ze niet bestaan
ON = ['b','d','f','g','h','k','l','m','n','p','r','s','t','v','w','z','bl','br','dr','fl','fr','gl','gr','kl','kn','kr','pl','pr','sl','sm','sn','sp','st','tr','vl','vr','zw','sch','str','spr','schr']
ON2 = ['b','d','f','g','h','k','l','m','n','p','r','s','t','v','w','z']
VS = ['a','e','i','o','u']; VD = ['aa','ee','oo','uu']; DG = ['ie','oe','eu','ui','ou','ij','ei']
CO = ['k','l','m','n','p','s','t','f','r','ft','lk','mp','nk','st','rk','ls','rt','ns','rst','lft','mst']
MID = ['k','l','m','n','p','s','t','f','r','d','b','g','z','v']
END = ['en','er','el','ig','e']
def ps1(r):
    k = r.random()
    if k < .45: return [r.choice(ON) + r.choice(VS) + r.choice(CO)]
    if k < .7: return [r.choice(ON) + r.choice(VD) + r.choice(['','k','l','m','n','p','s','t','f','r','st','rt','lt'])]
    return [r.choice(ON) + r.choice(DG) + r.choice(['','k','l','m','n','p','s','t','f','r','st','rt'])]
DBL = ['k','l','m','n','p','s','t','f','r','d','b','g']
def tail(r, m):
    e = r.choice(['en','er','el','ig','e'])
    return m + e
def ps2(r):
    c1, k = r.choice(ON), r.random()
    if k < .35: m = r.choice(MID); return [c1 + r.choice(['a','e','o','u']), tail(r, m)]           # open: ta-pel
    if k < .7: m = r.choice(DBL); return [c1 + r.choice(VS) + m, tail(r, m)]                          # dicht: tap-pel
    m = r.choice(MID); return [c1 + r.choice(DG), tail(r, m)]                                         # rui-per
def ps3(r):
    if r.random() < .5:
        pre = r.choice(['be','ge','ver','ont']); x = ps2(r)
        if pre == 'ont' and x[0][0] == 't': x[0] = 'k' + x[0][1:]
        if pre in ('be','ge') and x[0][0] in 'aeiou': x[0] = 'd' + x[0]
        return [pre] + x
    x = ps2(r)
    if x[-1].endswith('e'): x[-1] = x[-1][:-1] + 'en'
    suf = r.choice(['heid','lijk','ster','baar'])
    return x + [suf]
LEGAL = lambda x: not re.search(r'(.)\1\1|[aeiou]{3}|(aa|ee|oo|uu)[^aeiou]+[aeiou]|[^aeiou]{4}', x)
seen = set(practiced) | set(textwords)
pseudo = {1: [], 2: [], 3: []}; psyl = {}
r = random.Random(7)
for k, f, n in [(1, ps1, 35), (2, ps2, 35), (3, ps3, 30)]:
    while len(pseudo[k]) < n:
        parts = f(r); x = ''.join(parts)
        if x in seen or zf(x, 'nl') > 0 or len(x) > 13 or not LEGAL(x) or len(parts) != max(1, k if k < 3 else len(parts)): continue
        seen.add(x); pseudo[k].append(x); psyl[x] = parts
cards['P'] = sorted(pseudo[1], key=len) + sorted(pseudo[2], key=len) + sorted(pseudo[3], key=len)

# extra woorden per week uit de teksten (zelfde patroon)
pools = {}
for w in weeks:
    if 'review' in w: continue
    if w['mode'] == 'regex': cand = [x for x in textwords_all if re.search(w['pattern'], x)]
    elif w['n'] in (2,): cand = [x for x in textwords_all if nsyl(x) == 2]
    elif w['n'] in (3,): cand = [x for x in textwords_all if nsyl(x) == 2 and re.search(r'[aeou]$', syl(x)[0]) or re.search(r'([^aeiou])\1', x)]
    elif w['n'] == 4: cand = [x for x in textwords_all if re.search(r'[aeiou](ch|ng)[aeiou]', x)]
    elif w['n'] == 8: cand = [x for x in textwords_all if nsyl(x) == 3]
    elif w['n'] == 9: cand = [x for x in textwords_all if nsyl(x) >= 4]
    else: cand = []
    maxs = {1: 1, 2: 3, 3: 2, 4: 2, 6: 3, 7: 4, 8: 3, 9: 6}.get(w['n'], 3)
    cand = [x for x in cand if x not in set(w.get('words', [])) and nsyl(x) <= maxs and len(x) >= 3 and 'y' not in x][:90]
    pools[w['n']] = cand

every = set(allwords) | set(textwords_all) | set(cards['A']) | set(cards['B']) | set(cards['P']) | {x.lower() for t in TEST_REAL for x in t} | {x.lower() for t in TEST_NON for x in t} | set(INSTAP_WORDS) | set(INSTAP_NON)
for p in pools.values(): every |= set(p)
sylmap = {x: syl(x) for x in sorted(every)}
sylmap.update(psyl)
zipf = {x: round(zf(x, 'nl'), 1) for x in sylmap}
data = {'zipf': zipf, 'weeks': weeks, 'cards': cards, 'pools': pools, 'syl': sylmap, 'textwords': textwords_all, 'instap': {'words': INSTAP_WORDS, 'non': INSTAP_NON}}
js = '/* Gegenereerd door tools/export_content.py uit de Leesroute. */\n(function (root) {\n  var D = ' + json.dumps(data, ensure_ascii=False) + ';\n  if (typeof module !== "undefined" && module.exports) module.exports = D; else root.LR_DATA = D;\n})(this);\n'
open('/home/claude/ls/src/leesrijk/content.js', 'w').write(js)
print('weeks', len(weeks), 'textwords', len(textwords), 'cards', {k: len(v) for k, v in cards.items()}, 'pools', {k: len(v) for k, v in pools.items()}, 'syl', len(sylmap), 'bytes', len(js))
print('A', cards['A'][:12], cards['A'][-6:]); print('P', cards['P'][:10], cards['P'][40:46], cards['P'][-6:])
