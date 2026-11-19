"""Look for horizontal overflow on every page at phone and tablet widths."""
from playwright.sync_api import sync_playwright
pages = ["#home","#intake","#session","#check","#write","#write/fix","#write/dict","#translate","#pron","#pron/pairs","#pron/pairs/th_s","#pron/ed","#pron/shadow","#talk","#roleplay/compliance","#prepare","#flu","#log","#progress","#measure","#settings"]
JS = """() => { const bad = []; const vw = document.documentElement.clientWidth;
 if (document.documentElement.scrollWidth > vw + 1) bad.push('page ' + document.documentElement.scrollWidth + '>' + vw);
 document.querySelectorAll('#app *').forEach(e => { if (e.closest('.tabs') || e.tagName === 'svg' || e.closest('svg') || e.tagName==='AUDIO') return;
   const r = e.getBoundingClientRect(); if (r.width && (r.right > vw + 1 || r.left < -1)) bad.push(e.tagName + '.' + e.className + ' ' + Math.round(r.left) + '-' + Math.round(r.right));
   if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'auto' && e.clientWidth > 0 && !['TEXTAREA','SELECT','INPUT'].includes(e.tagName)) bad.push('scroll ' + e.tagName + '.' + e.className + ' ' + (e.textContent||'').slice(0,30)); });
 return bad.slice(0, 6); }"""
tot = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for port in (8765, 8766):
        for w in (320, 360, 390, 768):
            pg = b.new_page(viewport={"width": w, "height": 800})
            pg.goto(f"http://localhost:{port}/#home"); pg.wait_for_timeout(500)
            for h in pages:
                pg.evaluate(f"location.hash='{h}'"); pg.wait_for_timeout(200)
                bad = pg.evaluate(JS)
                if bad: tot += 1; print(port, w, h, bad)
            pg.close()
    b.close()
print("overflow problems:", tot)
