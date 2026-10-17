#!/usr/bin/env python3
"""GainFocus mobile Chromium: failed/slow 3 s network ping, offline bypass, photo-only spinner, online startup."""
import http.server,json,pathlib,threading,time
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"qa-screenshots";OUT.mkdir(exist_ok=True)
class Server(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
    def do_GET(self):
        if "gfSlowTile=1" in self.path:time.sleep(2.2)
        super().do_GET()
    def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),Server)
threading.Thread(target=server.serve_forever,daemon=True).start()
url="http://127.0.0.1:"+str(server.server_port)+"/index.html"
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox"])

    def offline_page(extra_script,fail_ping=False):
        page=browser.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.add_init_script("""(() => {
          const original=window.fetch.bind(window);
          window.fetch=(input,init)=>{
            const url=typeof input==='string'?input:(input?.url||String(input));
            // Keep the photo index pending to make connectivity choice deterministic.
            if(url.includes('exercise-photo-index-v2.json'))return new Promise(()=>{});
            return original(input,init);
          };
        })();""")
        if extra_script:page.add_init_script(extra_script)
        if fail_ping:page.route("**/*gf_probe=*",lambda route:route.abort())
        page.goto(url,wait_until="domcontentloaded",timeout=60000)
        page.wait_for_selector("#gfPhotoGate",timeout=15000)
        assert page.evaluate("GainFocusPhotoReadiness.version")=="gf-photo-gate-v1.3"
        return page,errors

    # A failed *real* network request must show an offer, not force the user offline.
    page,errors=offline_page(None,fail_ping=True)
    page.wait_for_selector("#gfContinueOffline",state="visible",timeout=8000)
    assert not page.evaluate("GainFocusPhotoReadiness.status().offline"),"App forced offline without consent"
    assert "Some photos and other media may not load" in page.locator("#gfOfflineWarning").inner_text()
    assert page.locator("#gfRetryConnection").is_visible()
    assert not page.evaluate("document.getElementById('app').classList.contains('open')")
    page.screenshot(path=str(OUT/"failed-ping-offline-choice.png"),animations="disabled")
    page.locator("#gfContinueOffline").click()
    page.wait_for_function("()=>GainFocusPhotoReadiness.status().offline && !document.getElementById('gfPhotoGate')",timeout=7000)
    assert page.locator("#gfOfflineNotice").is_visible()
    assert "media may not load" in page.locator("#gfOfflineNotice").inner_text()
    # Confirm that entry can proceed without waiting for the never-finishing 873-image index.
    page.evaluate("""() => {
      const w=74,t=createTargets(w);
      plan={schema:'gain-focus-plan/v3',appVersion:APP_VERSION,
        client:{id:'offline-test',name:'QA Offline',age:25,heightCm:180,startWeightKg:w},
        goal:{label:'Build muscle',targetWeightKg:80,startDate:todayISO(),weeklyGainKg:.25,focus:['Chest']},
        nutrition:{calories:t.calories,proteinG:t.protein,carbsG:t.carbs,fatG:t.fat,planPurchased:false},
        training:{name:'3-day starter',sessionsPerWeek:3,sessions:starterSessions(3)}};
      progress=newProgress();ensureProgressExtras();
      document.getElementById('splash')?.remove();
      document.getElementById('onboarding')?.remove();
      enterApp();
    }""")
    page.wait_for_function("()=>document.getElementById('app')?.classList.contains('open')",timeout=12000)
    assert not errors,errors[:4]

    # Exercise tile itself carries the spinner; no opaque panel or loading words.
    page.evaluate("""() => {
      const root=document.createElement('div');root.id='gfPhotoCircleTest';
      root.style.cssText='position:fixed;z-index:20000;top:90px;left:45px;width:300px;height:230px;background:#142b42;border-radius:18px;overflow:hidden';
      root.innerHTML=window.GFExerciseThumbsV2.render({name:'Flat Dumbbell Press'});
      const img=root.querySelector('img[data-gf-photo="v2"]');
      img.src='./exercise-photos/Dumbbell_Bench_Press/0.jpg?gfSlowTile=1';
      document.body.appendChild(root);
      window.GainFocusPhotoReadiness.checkWorkout(root,'Loading exercise photos');
    }""")
    tile=page.locator("#gfPhotoCircleTest .gf-photo-exercise")
    assert "gf-photo-loading" in tile.get_attribute("class")
    assert page.locator("#gfPhotoCircleTest .gf-photo-screen-loader").count()==0,"Opaque workout panel still present"
    pseudo=page.evaluate("""() => {
      const tile=document.querySelector('#gfPhotoCircleTest .gf-photo-exercise');
      return {animation:getComputedStyle(tile,'::before').animationName,
        background:getComputedStyle(tile).backgroundImage,
        imageOpacity:getComputedStyle(tile.querySelector('img')).opacity};
    }""")
    assert "gf-photo-tile-spin" in pseudo["animation"],pseudo
    assert pseudo["imageOpacity"]=="0",pseudo
    page.screenshot(path=str(OUT/"photo-only-spinner.png"),animations="disabled")
    page.wait_for_function("""() => document.querySelector('#gfPhotoCircleTest .gf-photo-exercise')?.classList.contains('gf-photo-ready')""",timeout=14000)
    assert page.evaluate("""() => document.querySelector('#gfPhotoCircleTest img').naturalWidth>0""")
    assert not errors,errors[:4]

    # A slow ping (no answer before AbortSignal's 3-second deadline) must
    # offer the same optional offline route even when navigator.onLine is true.
    slow="""(() => {
      const original=window.fetch.bind(window);
      window.fetch=(input,init)=>{
        const u=typeof input==='string'?input:(input?.url||String(input));
        if(u.includes('gf_probe')){
          return new Promise((resolve,reject)=>{
            if(init?.signal?.aborted){reject(new DOMException('Aborted','AbortError'));return;}
            init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
          });
        }
        return original(input,init);
      };
    })();"""
    slow_page,slow_errors=offline_page(slow)
    slow_page.wait_for_selector("#gfContinueOffline",state="visible",timeout=8000)
    assert "3 seconds" in slow_page.locator("#gfOfflineWarning").inner_text()
    assert not slow_page.evaluate("GainFocusPhotoReadiness.status().offline")
    slow_page.locator("#gfContinueOffline").click()
    slow_page.wait_for_function("()=>GainFocusPhotoReadiness.status().offline",timeout=4000)
    assert not slow_errors,slow_errors[:4]

    # Online startup must still verify all 873 approved photographs before dismissing.
    online=browser.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
    online_errors=[]
    online.on("pageerror",lambda error:online_errors.append(str(error)))
    online.goto(url,wait_until="domcontentloaded",timeout=60000)
    online.wait_for_function("()=>GainFocusPhotoReadiness.status().ready",timeout=240000)
    state=online.evaluate("GainFocusPhotoReadiness.status()")
    assert state["verified"]==873 and not state["offline"] and not state["active"],state
    assert online.locator("#gfOfflineChoice").count()==0
    # Simulate a network failure while the loaded app is in use.
    online.route("**/*gf_probe=*",lambda route:route.abort())
    online.evaluate("GainFocusPhotoReadiness.checkConnection()")
    online.wait_for_selector("#gfRuntimeOfflinePrompt",state="visible",timeout=7000)
    assert "Continue offline" in online.locator("#gfRuntimeOfflinePrompt").inner_text()
    online.locator("#gfRuntimeOfflinePrompt button").first.click()
    assert online.evaluate("GainFocusPhotoReadiness.status().offline")
    assert online.locator("#gfOfflineNotice").is_visible()
    assert not online_errors,online_errors[:5]
    print(json.dumps({"failed_ping":"offered optional offline mode","slow_ping":"3-second option shown",
      "offline_entry":"success without blocked photo index","runtime_ping":"offline option while app running",
      "photo_spinner":"tile-only circle; no opaque full-screen panel; decoded correctly",
      "online_approved_photos":state["verified"],"page_errors":[]}),flush=True)
    browser.close()
server.shutdown()
