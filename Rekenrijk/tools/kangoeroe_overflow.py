"""No horizontal overflow in the Kangoeroe screens at phone and desktop widths."""
from playwright.sync_api import sync_playwright
SEED = """localStorage.setItem('rekenrijk-spelers-v1', JSON.stringify({users:[{id:'raf',name:'Rafael',groep:3},{id:'emm',name:'Emmanuelle',groep:6}],active:'%s',voice:false}))"""
JS = """() => { const vw = document.documentElement.clientWidth, bad = [];
 if (document.documentElement.scrollWidth > vw + 1) bad.push('page ' + document.documentElement.scrollWidth);
 document.querySelectorAll('#main *').forEach(e => { if (e.closest('svg') && e.tagName !== 'svg') return; const r = e.getBoundingClientRect(); if (r.width && r.right > vw + 1) bad.push(e.tagName + '.' + (e.className.baseVal ?? e.className) + ' ' + Math.round(r.right)); });
 return bad.slice(0, 5); }"""
probs = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for who in ('raf', 'emm'):
        for w in (320, 360, 390, 768, 1280):
            pg = b.new_page(viewport={'width': w, 'height': 800})
            pg.goto('http://localhost:8802/'); pg.evaluate(SEED % who); pg.reload(); pg.wait_for_timeout(400)
            steps = [('start', 'nav [data-action=nav][data-page=kangoeroe]')] + [('practice', '[data-action=kg-practice]')] + [(f'answer{i}', None) for i in range(12)] + [('home', '[data-action=kg-home]'), ('intro', '[data-action=kg-contest-intro]'), ('contest', '[data-action=kg-contest-start]')] + [(f'q{i}', None) for i in range(12)] + [('submit', '[data-action=kg-submit]'), ('result', '[data-action=kg-submit-yes]'), ('review', '[data-action=kg-review]'), ('parents', None)]
            for name, sel in steps:
                if name.startswith('answer'):
                    pg.click('[data-action=kg-pick] >> nth=0'); bad = pg.evaluate(JS); pg.click('[data-action=kg-next]')
                elif name.startswith('q'):
                    i = int(name[1:]); pg.click(f'[data-action=kg-go][data-i="{i}"]'); bad = pg.evaluate(JS)
                elif name == 'parents':
                    pg.click('[data-action=kg-back-result]'); pg.click('[data-action=kg-home]'); pg.click('[data-action=kg-parents]'); bad = pg.evaluate(JS)
                else:
                    pg.click(sel); pg.wait_for_timeout(60); bad = pg.evaluate(JS)
                if name == 'review':
                    for d in pg.locator('details.kg-rev').all()[:6]: d.click()
                    bad = pg.evaluate(JS)
                if bad: probs += 1; print(who, w, name, bad)
            pg.close()
    b.close()
print('overflow problems:', probs)
