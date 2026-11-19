"""Direct mode (browser -> Anthropic) and long-audio chunking, on the no-API server."""
import json
from playwright.sync_api import sync_playwright
fails = []
def check(c, m): print(("ok: " if c else "FAIL: ") + m); (None if c else fails.append(m))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    seen = {}
    def handle(route):
        req = route.request; body = json.loads(req.post_data); seen["h"] = req.headers; seen["model"] = body["model"]
        reply = {"issues": [{"original": "responsible on", "fix": "responsible for", "cat": "prep", "en": "for", "he": "על", "severity": 3}], "natural": "I'm responsible for it.", "tone": {"direct": False}}
        route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps({"content": [{"type": "text", "text": json.dumps(reply)}]}))
    pg.route("https://api.anthropic.com/**", handle)
    pg.goto("http://localhost:8766/#settings"); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(600)
    pg.locator("input[type=password]").nth(1).fill("sk-ant-test")
    pg.get_by_role("button", name="Save").click(); pg.wait_for_timeout(500)
    check("direct" in pg.inner_text(".svc"), "status shows direct mode")
    pg.evaluate("location.hash='#check'"); pg.wait_for_timeout(300)
    pg.locator("textarea").first.fill("I'm responsible on it, ok.")
    pg.get_by_role("button", name="Check", exact=True).click(); pg.wait_for_selector("text=thing to fix", timeout=5000)
    check(seen["h"].get("x-api-key") == "sk-ant-test" and seen["h"].get("anthropic-dangerous-direct-browser-access") == "true", "direct call headers")
    check(seen["model"] == "claude-sonnet-5-5", "main model for check")
    with pg.expect_download() as dl:
        pg.evaluate("location.hash='#settings'"); pg.wait_for_timeout(300); pg.get_by_role("button", name="Download backup").click()
    data = json.load(open(dl.value.path()))
    check(data["settings"]["apiKey"] == "", "key not in backup")
    # wav chunking: 400 s of silence at 16 kHz -> 3 pieces with correct headers
    r = pg.evaluate("""() => { const sec = 400, n = 16000*sec, buf = new ArrayBuffer(44 + n*2), dv = new DataView(buf);
      dv.setUint32(24, 16000, true); const parts = TIO._wavPieces(buf);
      return Promise.all(parts.map(p => p.blob.arrayBuffer())).then(bs => bs.map((b, i) => ({size: b.byteLength, len: new DataView(b).getUint32(40, true), off: parts[i].offset}))); }""")
    check(len(r) == 3 and r[0]["len"] == 16000*2*150 and r[2]["off"] == 300 and r[2]["len"] == 16000*2*100 and all(x["size"] < 5.5e6 for x in r), "long audio split in 150 s pieces")
    check(not errs, "no errors " + str(errs[:2]))
    b.close()
print("DIRECT OK" if not fails else "FAILURES " + str(fails))
