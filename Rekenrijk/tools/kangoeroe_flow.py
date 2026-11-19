"""End-to-end check of the Kangoeroe mode. Needs: new build on :8802, original live mirror on :8801.
python3 tools/kangoeroe_flow.py"""
import json, sys
from playwright.sync_api import sync_playwright

NEW, OLD = 'http://localhost:8802/', 'http://localhost:8801/'
SEED = """localStorage.setItem('rekenrijk-spelers-v1', JSON.stringify({users:[{id:'raf',name:'Rafael',groep:3},{id:'emm',name:'Emmanuelle',groep:6}],active:'%s',voice:false}))"""
FAILS = []
def check(c, m):
    print(('ok:   ' if c else 'FAIL: ') + m)
    if not c: FAILS.append(m)

def store(pg): return pg.evaluate("JSON.parse(localStorage.getItem('rekenrijk-spelers-v1'))")
def kanga(pg, uid): return [u for u in store(pg)['users'] if u['id'] == uid][0].get('kanga')

with sync_playwright() as p:
    b = p.chromium.launch()
    def page(who, url=NEW, w=1280, h=900, clock=False):
        ctx = b.new_context(viewport={'width': w, 'height': h})
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        if clock: pg.clock.install()
        pg.goto(url); pg.evaluate(SEED % who); pg.reload(); pg.wait_for_timeout(600)
        return ctx, pg, errs

    # ---------- Rafael: wizFUN practice ----------
    ctx, pg, errs = page('raf')
    pg.click('nav [data-action=nav][data-page=kangoeroe]'); pg.wait_for_timeout(200)
    check('WIZFUN' in pg.inner_text('#main') and 'GROEP 3 EN 4' in pg.inner_text('#main'), 'Rafael (groep 3) gets wizFUN')
    check(pg.locator('.kg-pattern').count() == 13, '13 wizFUN patterns listed')
    pg.click('[data-action=kg-practice]'); pg.wait_for_timeout(150)
    seen, good = set(), 0
    stars0 = int(pg.inner_text('.star-count').strip().split()[0])
    for i in range(14):
        seen.add(pg.inner_text('.kg-card .pill').strip())
        pg.click('[data-action=kg-pick] >> nth=%d' % (i % 4)); pg.wait_for_timeout(80)
        fb = pg.inner_text('.kg-feedback')
        check(len(fb) > 40, f'practice {i+1}: feedback with explanation') if i < 2 else None
        if 'Goed zo' in fb: good += 1
        pg.click('[data-action=kg-next]'); pg.wait_for_timeout(80)
    k = kanga(pg, 'raf')
    check(k and k['level'] == 'fun' and sum(s['n'] for s in k['skill']['fun'].values()) == 14, 'practice answers stored per child')
    check(len(seen) >= 6, f'practice rotates through patterns ({len(seen)} seen in 14)')
    stars1 = int(pg.inner_text('.star-count').strip().split()[0])
    check(stars1 - stars0 == good, f'one star per correct practice answer ({good})')
    check(kanga(pg, 'emm') is None, 'Emmanuelle untouched by Rafael practice')

    # ---------- Rafael: contest, groep 3 = 12 questions / 30 min ----------
    pg.click('[data-action=kg-home]'); pg.click('[data-action=kg-contest-intro]'); pg.wait_for_timeout(100)
    t = pg.inner_text('#main')
    check('12 vragen · 30 minuten' in t and 'Je begint met 12 punten' in t, 'contest intro: 12 questions, 30 min, start points')
    pg.click('[data-action=kg-contest-start]'); pg.wait_for_timeout(150)
    check(pg.locator('.kg-num').count() == 12, 'nav shows 12 questions')
    check('focus-play' in pg.get_attribute('.app-shell', 'class'), 'contest hides distractions (focus mode)')
    check('3 PUNTEN' in pg.inner_text('.kg-card .pill'), 'first question worth 3 points')
    pg.click('[data-action=kg-strike] >> nth=0'); pg.wait_for_timeout(50)
    check(pg.locator('.kg-opt-wrap.struck').count() == 1 and pg.locator('.kg-opt-wrap.struck .kg-option').is_disabled(), 'strike-out disables an option')
    pg.click('[data-action=kg-answer] >> nth=1'); pg.wait_for_timeout(50)
    pg.click('[data-action=kg-nextq]')
    pg.click('[data-action=kg-skip]'); pg.wait_for_timeout(50)  # skip q2 -> q3
    check('VRAAG 3' in pg.inner_text('.kg-card .pill'), 'skip moves on')
    for i in range(2, 12):
        pg.click(f'[data-action=kg-go][data-i="{i}"]')
        if i % 3: pg.click('[data-action=kg-answer] >> nth=0')
    check('5 PUNTEN' in pg.inner_text('.kg-card .pill'), 'last question worth 5 points')
    pg.click('[data-action=kg-submit]'); pg.wait_for_timeout(50)
    check('overgeslagen' in pg.inner_text('.kg-confirm'), 'submit asks to confirm and mentions skipped')
    pg.click('[data-action=kg-submit-yes]'); pg.wait_for_timeout(200)
    t = pg.inner_text('#main')
    check('Zo ging het per puzzelsoort' in t, 'result screen per pattern')
    rows = pg.locator('.kg-result tbody tr').count()
    k = kanga(pg, 'raf'); c = k['contests'][-1]
    check(rows == len(c['per']) and rows >= 9, f'result has one row per pattern ({rows})')
    check(sum(v['ok'] + v['wrong'] + v['skip'] for v in c['per'].values()) == 12, 'every question counted once')
    skipped = sum(v['skip'] for v in c['per'].values())
    check(skipped == 4, f'skips recorded ({skipped})')
    exp = 12 + sum(v['got'] for v in c['per'].values())
    check(abs(c['total'] - exp) < 1e-9 and c['max'] == 12 + 4*3 + 4*4 + 4*5, 'total = start points + per-pattern points; max 60')
    pg.click('[data-action=kg-review]'); pg.wait_for_timeout(100)
    check(pg.locator('details.kg-rev').count() == 12, 'review lists all questions')
    pg.locator('details.kg-rev >> nth=0').click()
    check(len(pg.inner_text('details.kg-rev >> nth=0')) > 60, 'review shows explanation')
    check(not errs, 'no console errors (Rafael) ' + str(errs[:2]))
    pg.screenshot(path='/tmp/claude-0/kk/flow_review.png', full_page=True)
    ctx.close()

    # ---------- time runs out ----------
    ctx, pg, errs = page('raf', clock=True)
    pg.click('nav [data-action=nav][data-page=kangoeroe]'); pg.click('[data-action=kg-contest-intro]'); pg.click('[data-action=kg-contest-start]')
    pg.click('[data-action=kg-answer] >> nth=0')
    pg.clock.fast_forward('30:05'); pg.wait_for_timeout(300)
    check('DE TIJD IS OM' in pg.inner_text('#main'), 'contest ends when the time is up')
    ctx.close()

    # ---------- Emmanuelle: wizKID, W4 scoring, mobile ----------
    ctx, pg, errs = page('emm', w=390, h=844)
    pg.click('nav [data-action=nav][data-page=kangoeroe]'); pg.wait_for_timeout(100)
    check('WIZKID' in pg.inner_text('#main'), 'Emmanuelle (groep 6) gets wizKID')
    pg.click('[data-action=kg-contest-intro]')
    check('24 vragen · 50 minuten' in pg.inner_text('#main'), 'wizKID contest: 24 questions, 50 min')
    pg.click('[data-action=kg-scoring][data-v=w4]'); pg.wait_for_timeout(50)
    check("'weet niet'" in pg.inner_text('#main') or 'weet niet' in pg.inner_text('#main'), 'W4 scoring explained')
    pg.click('[data-action=kg-contest-start]')
    check('5 PUNTEN' in pg.inner_text('.kg-card .pill'), 'W4: every question 5 points')
    for i in range(24):
        pg.click(f'[data-action=kg-go][data-i="{i}"]')
        if i < 10: pg.click('[data-action=kg-answer] >> nth=2')
    pg.click('[data-action=kg-submit]'); pg.click('[data-action=kg-submit-yes]'); pg.wait_for_timeout(150)
    c = kanga(pg, 'emm')['contests'][-1]
    check(c['scoring'] == 'w4' and c['max'] == 120 and c['total'] >= 14, f"W4 result stored ({c['total']}/{c['max']})")
    pg.screenshot(path='/tmp/claude-0/kk/flow_result_390.png', full_page=True)
    # switching child resets the view and keeps data apart
    pg.click('[data-action=players]'); pg.click('[data-action=player-pick][data-id=raf]'); pg.wait_for_timeout(200)
    pg.click('nav [data-action=nav][data-page=kangoeroe]'); pg.wait_for_timeout(100)
    check('WIZFUN' in pg.inner_text('#main'), 'after switching to Rafael: wizFUN again')
    check(not errs, 'no console errors (Emmanuelle) ' + str(errs[:2]))
    ctx.close()

    # ---------- parent view, mastery over time ----------
    ctx, pg, errs = page('raf')
    hist = {"tellen": [[20400, 30], [20403, 45], [20407, 62]], "spiegel": [[20401, 20], [20405, 35]]}
    pg.evaluate("""h => { const s = JSON.parse(localStorage.getItem('rekenrijk-spelers-v1')); s.users[0].kanga = {level:'fun', skill:{fun:{tellen:{th:2.4,n:20,ok:15}, spiegel:{th:1.2,n:9,ok:4}}}, hist:{fun:h}, contests:[], seed:5, served:0}; localStorage.setItem('rekenrijk-spelers-v1', JSON.stringify(s)); }""", hist)
    pg.reload(); pg.wait_for_timeout(500)
    pg.click('.sidebar [data-action=parents]'); pg.wait_for_timeout(150)
    pg.click('#modal [data-action=kg-parents]'); pg.wait_for_timeout(200)
    t = pg.inner_text('#main')
    check('Beheersing per puzzelsoort' in t and 'Rafael' in t and 'Emmanuelle' in t, 'parent view opens from the parents panel with both children')
    check(pg.locator('.kg-spark polyline').count() == 2, 'sparklines for patterns with history over time')
    check(pg.locator('.kg-table.parent tbody tr').count() == 13, 'one row per pattern')
    pg.click('[data-action=kg-parent-kid][data-id=emm]'); pg.wait_for_timeout(100)
    check('wizKID' in pg.inner_text('.kg-parent h2'), 'parent view switches child')
    pg.screenshot(path='/tmp/claude-0/kk/flow_parents.png', full_page=True)
    check(not errs, 'no console errors (parents) ' + str(errs[:2]))
    ctx.close()

    # ---------- existing modes unchanged ----------
    for who in ('raf', 'emm'):
        texts = {}
        for url in (OLD, NEW):
            ctx, pg, errs = page(who, url=url)
            out = {}
            for pgname in ('battle', 'sprint', 'collection', 'progress', 'report'):
                pg.click(f'nav [data-action=nav][data-page={pgname}]'); pg.wait_for_timeout(250)
                out[pgname] = pg.inner_text('#main')
            pg.click('nav [data-action=nav][data-page=home]'); pg.wait_for_timeout(150)
            pg.click('[data-action=start][data-topic=add]'); pg.wait_for_timeout(300)
            out['play'] = pg.locator('#main .question-card, #main .pz-card').count()
            texts[url] = out
            check(not errs, f'no console errors {who} {url}')
            ctx.close()
        for k2 in texts[OLD]:
            check(texts[OLD][k2] == texts[NEW][k2], f'{who}: {k2} identical to the live version')

    # ---------- offline ----------
    ctx, pg, errs = page('emm')
    pg.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null || true")
    pg.evaluate("navigator.serviceWorker.ready"); pg.wait_for_timeout(2500)
    cached = pg.evaluate("caches.keys().then(ks => Promise.all(ks.map(k => caches.open(k).then(c => c.keys())))).then(a => a.flat().map(r => new URL(r.url).pathname))")
    check(all(f in cached for f in ['/kangoeroe.mjs', '/kangoeroe-ui.mjs', '/kangoeroe.css']), 'Kangoeroe files in the offline cache')
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_timeout(800)
    pg.click('nav [data-action=nav][data-page=kangoeroe]'); pg.click('[data-action=kg-practice]'); pg.wait_for_timeout(200)
    check(pg.locator('.kg-option').count() >= 4, 'Kangoeroe works offline')
    ctx.close()
    b.close()

print('\n' + ('ALL KANGOEROE FLOWS PASS' if not FAILS else f'{len(FAILS)} FAILURES: ' + '; '.join(FAILS)))
sys.exit(1 if FAILS else 0)
