"""End-to-end flows with Playwright. python3 tools/flow.py  (needs servers on 8765 mock and 8766 no-api)"""
import sys, json
from playwright.sync_api import sync_playwright

FAILS = []
def check(cond, msg):
    if not cond:
        FAILS.append(msg); print("FAIL:", msg)
    else:
        print("ok:", msg)

def answer_drill(pg, correct=True):
    """Answer the visible drill card. Returns True if one was answered."""
    card = pg.locator("section.drill").last
    if card.count() == 0: return False
    info = pg.evaluate("""() => {
      const c = [...document.querySelectorAll('section.drill')].pop();
      const he = c.querySelector('.hebrew'), wr = c.querySelector('.wrongline');
      const key = he ? he.textContent : wr.textContent;
      let it = TC.DRILLS.find(d => d.he === key) || TC.DRILLS.find(d => d.wrong === key) || Object.values(T.S.own).find(d => d.wrong === key);
      return it ? {right: it.right[0], wrong: it.wrong} : null;
    }""")
    if not info: raise Exception("drill not found")
    ta = card.locator("textarea")
    ta.fill(info["right"] if correct else info["wrong"])
    card.get_by_role("button", name="Check").click()
    pg.wait_for_timeout(150)
    if not correct and card.get_by_role("button", name="Check").count():
        ta.fill(info["wrong"]); card.get_by_role("button", name="Check").click(); pg.wait_for_timeout(150)
    card.get_by_role("button", name="Next", exact=True).click()
    pg.wait_for_timeout(120)
    return True

def record(pg, scope=None, ms=5200):
    loc = (scope or pg).locator(".rec-btn").last
    loc.click(); pg.wait_for_timeout(ms)
    loc.click(); pg.wait_for_timeout(700)

def run(port, mock):
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"])
        ctx = b.new_context(viewport={"width": 390, "height": 844}, permissions=["microphone", "clipboard-read", "clipboard-write"])
        ctx.add_init_script("const _ac = Node.prototype.appendChild; Node.prototype.appendChild = function (n) { if (arguments.length > 1) console.error('appendChild with extra args: ' + new Error().stack.split('\\n')[2]); return _ac.call(this, n); };")
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
        base = f"http://localhost:{port}/"
        pg.goto(base + "#home"); pg.wait_for_timeout(600)
        pg.evaluate("localStorage.clear(); indexedDB.deleteDatabase('tachles')"); pg.reload(); pg.wait_for_timeout(700)
        tag = "[mock]" if mock else "[offline]"

        # ---- intake ----
        pg.evaluate("location.hash='#intake'"); pg.wait_for_timeout(300)
        pg.get_by_role("button", name="Let's go").click()
        for i in range(3):
            pg.wait_for_selector(".rec-btn"); record(pg)
            if not mock:  # no transcription: type what was said
                pg.locator(".speech textarea, .card textarea").last.fill("I work here five years and I am responsible on payments.")
                pg.get_by_role("button", name="Done").last.click(); pg.wait_for_timeout(200)
        pg.wait_for_timeout(300)
        tas = pg.locator("textarea")
        check(tas.count() == 3, tag + " intake mails step shows 3 fields")
        tas.nth(0).fill("Hi Dana, i will send it until Friday. I'm responsible on the payouts.")
        pg.get_by_role("button", name="Next", exact=True).click(); pg.wait_for_timeout(300)
        n = 0
        while pg.locator("section.drill").count() and n < 20:
            answer_drill(pg, correct=(n % 3 != 0)); n += 1
        check(n == 16, tag + f" intake quiz has 16 items (got {n})")
        k = 0
        while pg.locator(".sylls").count() and k < 10:
            pg.locator(".sylls .btn").first.click(); pg.wait_for_timeout(100)
            pg.get_by_role("button", name="Next", exact=True).click(); pg.wait_for_timeout(100); k += 1
        check(k == 8, tag + f" stress step has 8 words (got {k})")
        pg.wait_for_selector("text=Your top 5 to work on", timeout=8000)
        st = pg.evaluate("T.S")
        check(st["intake"] and st["intake"]["done"], tag + " intake stored")
        check(len(st["measures"]) == 1 and st["measures"][0]["baseline"], tag + " baseline measure stored")
        if mock:
            check(st["measures"][0]["speakErr"] == 2 and st["measures"][0]["writeErr"] == 2, tag + " baseline errors from analysis")
            check(len(st["own"]) >= 2, tag + f" own cards from intake ({len(st['own'])})")
        check(st["measures"][0]["wpm"] > 0, tag + " baseline speaking speed")
        recs = pg.evaluate("TS.Rec.all()")
        check(len([r for r in recs if r["kind"] == "compare"]) == 1, tag + " compare recording stored")
        check(len(st["srs"]) > 0, tag + " logbook has cards")

        # ---- full session ----
        pg.evaluate("location.hash='#session'"); pg.wait_for_timeout(400)
        n = 0
        while pg.locator("section.drill").count() and n < 15 and pg.locator(".sessionbar").inner_text().startswith("1/5"):
            answer_drill(pg, correct=(n % 2 == 0)); n += 1
        check("2/5" in pg.locator(".sessionbar").inner_text(), tag + f" review block finished after {n} items")
        pg.get_by_role("button", name="Practice it").click(); pg.wait_for_timeout(200)
        n = 0
        while pg.locator("section.drill").count() and n < 10: answer_drill(pg); n += 1
        check("3/5" in pg.locator(".sessionbar").inner_text(), tag + f" trap block finished ({n} items)")
        if mock:
            pg.get_by_role("button", name="Check a real email").click(); pg.wait_for_timeout(200)
            pg.locator("textarea").first.fill("Send me the deck. i will check it until Friday because I'm responsible on the numbers.")
            pg.get_by_role("button", name="Check", exact=True).click(); pg.wait_for_selector("text=things to fix")
            ta = pg.locator("textarea.tall").last
            ta.fill(ta.input_value().replace("until Friday", "by Friday"))
            pg.get_by_role("button", name="I fixed what I could").click(); pg.wait_for_timeout(200)
            check(pg.locator("text=You found 1 of 3").count() == 1, tag + " mail check counts what she found")
            check(pg.locator(".natural").count() == 1, tag + " natural version shown")
            pg.get_by_role("button", name="Continue").click(); pg.wait_for_timeout(300)
        else:
            n = 0
            while (pg.locator("text=Dictation").count() or pg.locator("section.drill").count()) and n < 20 and "3/5" in pg.locator(".sessionbar").inner_text():
                if pg.locator("section.drill").count():
                    answer_drill(pg)
                else:
                    pg.locator("textarea.answer").last.fill("x"); pg.get_by_role("button", name="Check").click(); pg.wait_for_timeout(100)
                    pg.get_by_role("button", name="Next", exact=True).click(); pg.wait_for_timeout(100)
                n += 1
        check("4/5" in pg.locator(".sessionbar").inner_text(), tag + " writing block finished")
        # speaking block: role-play (mock, unless Monday) or 4/3/2 short (offline)
        txt = pg.locator("#main").inner_text()
        if mock and "Prepare for something real" in txt:
            pg.locator("textarea").first.fill("Call with the bank about payouts"); pg.get_by_role("button", name="Prepare me").click()
            pg.wait_for_selector("text=Sentences you'll need"); pg.get_by_role("button", name="Rehearse the conversation").click(); pg.wait_for_timeout(300)
            txt = "roleplay"
        if mock:
            for i in range(3):
                pg.wait_for_selector(".dock .rec-btn"); record(pg, pg.locator(".dock")); pg.wait_for_timeout(400)
            pg.wait_for_selector("text=Get feedback", timeout=5000); pg.get_by_role("button", name="Get feedback", exact=True).click()
            pg.wait_for_selector("text=What to fix", timeout=5000)
            check(pg.locator(".msg.me").count() == 3 and pg.locator(".msg.them").count() == 4, tag + " role-play exchanged 3 turns")
            pg.get_by_role("button", name="Continue").click(); pg.wait_for_timeout(300)
        else:
            for i in range(3):
                pg.wait_for_selector(".rec-btn"); record(pg)
                pg.locator(".speech textarea").last.fill("We launched the new payout flow last week and it went well."); pg.get_by_role("button", name="Done").last.click(); pg.wait_for_timeout(250)
            pg.wait_for_selector("text=Your speed"); pg.get_by_role("button", name="Continue").click(); pg.wait_for_timeout(300)
        check("5/5" in pg.locator(".sessionbar").inner_text(), tag + " speaking block finished")
        k = 0
        while pg.locator(".sylls").count() and k < 6:
            pg.locator(".sylls .btn").nth(1).click(); pg.wait_for_timeout(80); pg.get_by_role("button", name="Next", exact=True).click(); pg.wait_for_timeout(80); k += 1
        n = 0
        while pg.locator("section.drill").count() and n < 5: answer_drill(pg); n += 1
        pg.wait_for_selector("text=Session done", timeout=4000)
        st = pg.evaluate("T.S")
        t = str(pg.evaluate("T.today()"))
        check(st["days"][t]["done"] and len(st["days"][t]["blocks"]) == 5, tag + " session stored as done with 5 blocks")

        # ---- logbook review ----
        pg.evaluate("location.hash='#log'"); pg.wait_for_timeout(300)
        check(pg.locator(".stat").count() == 3, tag + " logbook stats")
        # force all cards due and review
        pg.evaluate("Object.values(T.S.srs).forEach(s => s.due = T.today()); T.save(); T.route()"); pg.wait_for_timeout(300)
        pg.locator("button", has_text="Review").first.click(); pg.wait_for_timeout(200)
        n = 0
        while pg.locator("section.drill").count() and n < 16: answer_drill(pg); n += 1
        check(n > 0, tag + f" logbook review ran {n} cards")

        # ---- pronunciation ----
        pg.evaluate("location.hash='#pron/pairs/i_ee'"); pg.wait_for_timeout(400)
        pg.locator(".choice").first.click(); pg.wait_for_timeout(150)
        record(pg)
        if mock:
            pg.wait_for_selector(".score", timeout=4000); check(pg.locator(".score .w").count() == 1, tag + " word pronunciation scored")
        pg.evaluate("location.hash='#pron/shadow'"); pg.wait_for_timeout(400)
        record(pg)
        if mock:
            pg.wait_for_selector(".score", timeout=4000); check(pg.locator(".score .w").count() > 4, tag + " shadowing scored per word")
        pg.evaluate("location.hash='#pron/ed'"); pg.wait_for_timeout(300)
        pg.locator(".choice").first.click(); check(pg.locator(".result").count() == 1, tag + " -ed quiz answers")
        pg.evaluate("location.hash='#pron/cant'"); pg.wait_for_timeout(300)
        pg.locator(".choice").first.click(); check(pg.locator(".result").count() == 1, tag + " can/can't answers")

        # ---- writing lab ----
        pg.evaluate("location.hash='#write/task'"); pg.wait_for_timeout(300)
        pg.locator("textarea").first.fill("Hi team, i will share the update until Friday. I'm responsible on the numbers and the risk is low.")
        pg.locator("button", has_text="Check my text" if mock else "Done").first.click()
        if mock:
            pg.wait_for_selector("text=things to fix"); pg.get_by_role("button", name="Just show me").click(); pg.wait_for_timeout(200)
            pg.get_by_role("button", name="Continue").click(); pg.wait_for_timeout(300)
        st = pg.evaluate("T.S")
        check(len(st.get("writings", [])) == 1, tag + " writing saved for rewrite")
        pg.evaluate("T.S.writings[0].d -= 8; T.save(); location.hash='#write/rewrite'"); pg.wait_for_timeout(300)
        pg.locator("textarea").first.fill("Hi team, I will share the update by Friday. I'm responsible for the numbers.")
        pg.get_by_role("button", name="Compare").click(); pg.wait_for_timeout(600)
        check(pg.locator("text=Then").count() >= 1, tag + " rewrite compares then and now")

        # ---- check-in ----
        pg.evaluate("location.hash='#measure'"); pg.wait_for_timeout(300)
        for i in range(2):
            pg.wait_for_selector(".rec-btn"); record(pg)
            if not mock:
                pg.locator(".speech textarea").last.fill("I have worked here for five years and I lead the payments team."); pg.get_by_role("button", name="Done").last.click(); pg.wait_for_timeout(200)
        pg.locator("textarea").first.fill("Hi Dana, quick update: we shipped the new payout flow. Approval rate is up two percentage points. One risk: the bank integration. I need a decision on scope by Friday.")
        pg.get_by_role("button", name="Finish").click(); pg.wait_for_selector("text=Then vs. now", timeout=6000)
        check(pg.locator("table.mini tr").count() == 5, tag + " check-in table")

        # ---- progress ----
        pg.evaluate("location.hash='#progress'"); pg.wait_for_timeout(900)
        check(pg.locator("svg.chart").count() >= (2 if mock else 1), tag + f" progress charts drawn ({pg.locator('svg.chart').count()})")
        check(pg.locator(".recrow audio").count() == 2, tag + " first vs latest recording")
        pg.screenshot(path=f"/tmp/claude-0/shots/flow_{port}_progress.png", full_page=True)

        # ---- talk hub, solo role-play offline / prepare ----
        pg.evaluate("location.hash='#roleplay/pushback'"); pg.wait_for_timeout(300)
        if not mock:
            check(pg.locator("text=solo rehearsal").count() == 1, tag + " offline role-play is a solo rehearsal")
        pg.evaluate("location.hash='#check'"); pg.wait_for_timeout(300)
        if not mock:
            check(pg.locator("text=needs the AI connection").count() == 1, tag + " offline mail check explains")

        # ---- settings: backup roundtrip ----
        pg.evaluate("location.hash='#settings'"); pg.wait_for_timeout(300)
        with pg.expect_download() as dl:
            pg.get_by_role("button", name="Download backup").click()
        path = dl.value.path(); data = json.load(open(path))
        check(data["v"] == 1 and data["intake"]["done"], tag + " backup file valid")

        check(not errs, tag + " no console errors " + str(errs[:3]))
        b.close()

run(8765, True)
run(8766, False)
print("\n" + ("ALL FLOWS PASS" if not FAILS else f"{len(FAILS)} FAILURES: " + "; ".join(FAILS)))
