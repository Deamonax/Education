# Zoek tekst die buiten zijn vak valt of wordt afgeknipt, met de langste woorden, op smalle schermen en de grootste letters.
import json, sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
DETECT = r"""(() => {
  const bad = [], vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) bad.push('pagina scrollt opzij: ' + document.documentElement.scrollWidth + ' > ' + vw);
  document.querySelectorAll('#app *').forEach(el => {
    const r = el.getBoundingClientRect(); if (!r.width || getComputedStyle(el).visibility === 'hidden' || el.closest('.scroll')) return;
    const box = el.parentElement && el.parentElement.closest('.card, .ex, section, .opts, .flashbox, .tcard, .rlist, .lscale, .pgrid, .family');
    if (box && box !== el) { const b = box.getBoundingClientRect(); if (r.right > b.right + 2 || r.left < b.left - 2) bad.push('buiten vak: ' + el.className + ' "' + (el.textContent || '').slice(0, 30) + '"'); }
    if (r.right > vw + 1) bad.push('buiten scherm: ' + el.className + ' "' + (el.textContent || '').slice(0, 30) + '"');
    const ov = getComputedStyle(el).overflow; if ((ov === 'hidden' || getComputedStyle(el).whiteSpace === 'nowrap') && el.scrollWidth > el.clientWidth + 2 && el.children.length < 30 && el.textContent.trim()) bad.push('afgeknipt: ' + el.className + ' "' + el.textContent.slice(0, 30) + '" ' + el.scrollWidth + '>' + el.clientWidth);
  });
  return [...new Set(bad)].slice(0, 8);
})()"""
LONG = 'ontwikkelingssamenwerking'
problems = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for W in [320, 360, 390, 768, 800, 1280]:
        for size, spacing in [('XL', 'extra'), ('L', 'extra'), ('M', 'normal')]:
            pg = b.new_page(viewport={'width': W, 'height': 800}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL)
            pg.evaluate("localStorage.setItem('leesrijk-v1',JSON.stringify({players:[{id:'e',name:'Emmanuelle-Sophie',week:9,groep:6,eggs:4,pets:[0,9,19],inv:{0:5},settings:{read:false,size:'%s',spacing:'%s',syl:true}}],active:'e'}))" % (size, spacing))
            pg.reload(); pg.wait_for_timeout(200)
            tag = f'{W}px {size}/{spacing}'
            def chk(name):
                pg.wait_for_timeout(60); r = pg.evaluate(DETECT)
                if r: problems.setdefault(name, []).append((tag, r[:3]))
            chk('home')
            pg.click('[data-a=start]'); pg.click('[data-a=next]')
            longest = pg.evaluate("(()=>{const E=window.__lr.E,D=E.data;let all=[];D.weeks.forEach(w=>{all=all.concat(w.words||[]).concat(D.pools[w.n]||[])});all.sort((a,b)=>b.length-a.length);return all.slice(0,3)})()")
            hakw = pg.evaluate("(()=>{const E=window.__lr.E,D=E.data;let all=[];D.weeks.forEach(w=>{all=all.concat(w.words||[])});all=all.filter(x=>E.syllables(x).length>=2).sort((a,b)=>b.length-a.length);return all[0]})()")
            def setstep(t, items, extra=''):
                pg.evaluate("(()=>{const s=window.__lr.sess();let i=s.steps.findIndex(x=>x.type==='%s');if(i<0){s.steps.splice(1,0,{type:'%s'});i=1}s.si=i;s.ii=0;s.steps[i].items=%s;s.st={};%s;window.__lr.render()})()" % (t, t, json.dumps(items), extra))
            setstep('hak', [hakw]); chk('hakken')
            pg.click('[data-a=gap] >> nth=2'); pg.click('[data-a=checkhak]'); chk('hakken feedback')
            setstep('lang', ['boterhammen']); chk('lang/kort'); pg.click('[data-a=lk] >> nth=0'); chk('lang/kort feedback')
            setstep('zoek', ['verkeersregels'], "s.steps[i].wk=7"); chk('zoeken')
            setstep('flits', [{'w': LONG, 'pseudo': False}], "s.st.phase='show'"); chk('flits woord')
            setstep('flits', [{'w': LONG, 'pseudo': False}], "s.st.phase='pick'"); chk('flits keuze')
            pg.click('[data-a=fpick] >> nth=0'); chk('flits feedback')
            setstep('dictee', [longest[0]]); chk('dictee')
            if pg.query_selector('[data-a=seen]'): pg.click('[data-a=seen]')
            pg.fill('#dict', longest[0] + 'x'); pg.click('[data-a=checkdict]'); chk('dictee feedback')
            setstep('dictee', [{'kind':'ww','inf':'antwoorden','answer':'antwoordt','before':'Mijn zus ','after':' op de moeilijke vraag van de juf.','form':'stamt','hint':'x'}]); chk('werkwoord')
            # niveaucheck met het langste woord
            pg.click('[data-a=quit]') if pg.query_selector('[data-a=quit]') else None
            pg.evaluate("window.__lr.store().players[0].checks=[]"); pg.goto(URL); pg.wait_for_timeout(150)
            pg.click('[data-a=checkstart]'); pg.click('[data-a=checkgo]'); pg.wait_for_selector('[data-a=cpick]', timeout=6000)
            pg.evaluate("(()=>{const c=window.__lr.chk();c.cur={w:'%s',d:10,pseudo:false};c.opts=null;c.phase='show';window.__lr.render()})()" % LONG); chk('check woord')
            pg.evaluate("(()=>{const c=window.__lr.chk();c.phase='pick';window.__lr.render()})()"); chk('check keuze')
            for page in ['samen', 'bieb', 'vriendjes', 'groei', 'rapport', 'eieren', 'instellingen']:
                pg.goto(URL); pg.wait_for_timeout(120); pg.evaluate("document.querySelector('[data-a=nav][data-p=%s]') ? document.querySelector('[data-a=nav][data-p=%s]').click() : null" % (page, page)); chk(page)
            pg.goto(URL); pg.wait_for_timeout(120); pg.click('.nav [data-p=samen]'); pg.click('[data-a=samen][data-k=lijst]'); chk('woordenrij')
            pg.click('[data-a=samenmenu]'); pg.click('[data-a=samen][data-k=tekst][data-t=g6]'); chk('groep6 tekst')
            pg.goto(URL); pg.wait_for_timeout(120); pg.click('.nav [data-p=rapport]'); pg.click('.card [data-a=nav][data-p=toets]'); pg.click('[data-a=tbegin]'); chk('toetskaart')
            if errs: problems.setdefault('fouten', []).append((tag, errs))
            pg.close()
    b.close()
for k, v in problems.items():
    print('==', k, len(v), 'keer'); [print('  ', t, r) for t, r in v[:3]]
print('KLAAR', 'problemen:', len(problems))
