import sys
from playwright.sync_api import sync_playwright
port = sys.argv[1] if len(sys.argv) > 1 else "8765"
pages = ["#home","#intake","#session","#session/short","#check","#write","#write/fix","#write/dict","#write/rewrite","#translate","#translate/tone","#pron","#pron/pairs","#pron/pairs/i_ee","#pron/cant","#pron/ed","#pron/shadow","#talk","#roleplay/roadmap","#prepare","#flu","#log","#progress","#measure","#settings"]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
    ctx = b.new_context(viewport={"width":390,"height":844}, permissions=["microphone"])
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: "+m.text) if m.type=="error" else None)
    pg.goto(f"http://localhost:{port}/#home"); pg.wait_for_timeout(800)
    for h in pages:
        pg.evaluate(f"location.hash='{h}'"); pg.wait_for_timeout(350)
        name = h.replace("#","").replace("/","_")
        pg.screenshot(path=f"/tmp/claude-0/shots/{port}_{name}.png", full_page=True)
        txt = pg.inner_text("#main")[:80].replace("\n"," | ")
        print(h, "->", txt)
    print("ERRORS:", errs)
    b.close()
