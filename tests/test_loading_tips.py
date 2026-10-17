#!/usr/bin/env python3
"""Real mobile Chromium QA of the first-paint loading tips UX and 873-photo gate."""
import http.server
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"qa-screenshots"
OUT.mkdir(exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):
        pass

server=http.server.ThreadingHTTPServer(("127.0.0.1",0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f"http://127.0.0.1:{server.server_port}/index.html"
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,args=["--no-sandbox"])
    page=browser.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
    errors=[]
    page.on("pageerror",lambda e: errors.append(str(e)))
    # In production a fast cache may finish in <4.35 sec. Delay the index
    # request ONLY in this test so we can observe two full tip transitions.
    page.add_init_script("""(() => {
      const nativeFetch=window.fetch.bind(window);
      window.fetch=(input,init)=>{
        const path=typeof input==='string'?input:(input?.url||String(input));
        if(path.includes('exercise-photo-index-v2.json')){
          return new Promise(resolve=>setTimeout(()=>resolve(nativeFetch(input,init)),7500));
        }
        return nativeFetch(input,init);
      };
    })();""")
    page.goto(url,wait_until="domcontentloaded",timeout=60000)
    page.wait_for_selector("#gfPhotoGate",timeout=20000)
    assert page.evaluate("GainFocusPhotoReadiness.version")=="gf-photo-gate-v1.2"
    assert not page.evaluate("document.getElementById('app').classList.contains('open')"),"App opened before photo gate"
    gate=page.locator("#gfPhotoGate")
    first_tip=gate.locator("p").inner_text()
    first_heading=gate.locator("h2").inner_text()
    assert first_tip.startswith("Tip: "),first_tip
    assert "exercise photographs" not in gate.inner_text().lower(),gate.inner_text()
    assert "Checking your" not in gate.inner_text()
    assert "%" in gate.locator(".gf-photo-count").inner_text()
    assert " / 873" not in gate.locator(".gf-photo-count").inner_text()
    # Headline changes after 1.45 sec; tip changes at the third tick (~4.35 sec).
    page.wait_for_timeout(4700)
    assert gate.count()==1,"Loading gate disappeared before tip rotation could be observed"
    second_tip=gate.locator("p").inner_text()
    second_heading=gate.locator("h2").inner_text()
    assert second_tip.startswith("Tip: ") and second_tip!=first_tip,(first_tip,second_tip)
    assert second_heading!=first_heading,(first_heading,second_heading)
    assert "exercise photographs" not in gate.inner_text().lower(),gate.inner_text()
    assert page.evaluate("document.getElementById('gfPhotoGate').getBoundingClientRect().height")>=800
    page.screenshot(path=str(OUT/"loading-tips-mobile.png"),animations="disabled")
    page.wait_for_function("()=>GainFocusPhotoReadiness.status().ready",timeout=220000)
    state=page.evaluate("GainFocusPhotoReadiness.status()")
    assert state["verified"]==873,state
    assert gate.count()==0,"Gate should dismiss when loading finished"
    assert not errors,errors
    print(json.dumps({"tips_rotated":[first_tip,second_tip],"headings_rotated":[first_heading,second_heading],"progress":"percentage only","verified_photos":state["verified"],"gate_closed":True,"page_errors":errors}),flush=True)
    browser.close()
server.shutdown()
