#!/usr/bin/env python3
"""Actual GainFocus mobile Chromium acceptance test: 873-photo hard entry gate + workout wheel."""
import http.server,json,pathlib,threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
ART=ROOT/"qa-screenshots"
ART.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url="http://127.0.0.1:"+str(server.server_port)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
    context=browser.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.goto(url+"/index.html",wait_until="domcontentloaded",timeout=60000)
    assert page.evaluate("!!window.GFExerciseThumbsV2 && !!window.GainFocusPhotoReadiness"),"Both photo scripts must execute"
    page.evaluate("""() => {
      const w=74,t=createTargets(w);
      plan={schema:'gain-focus-plan/v3',appVersion:APP_VERSION,
        client:{id:'gf-gate-test',name:'QA Photo Test',age:25,heightCm:180,startWeightKg:w},
        goal:{label:'Build muscle',targetWeightKg:80,startDate:todayISO(),weeklyGainKg:.25,focus:['Chest','Lat width']},
        nutrition:{calories:t.calories,proteinG:t.protein,carbsG:t.carbs,fatG:t.fat,planPurchased:false},
        training:{name:'3-day hypertrophy starter',sessionsPerWeek:3,sessions:starterSessions(3)}};
      progress=newProgress();ensureProgressExtras();
      document.getElementById('splash')?.remove();
      document.getElementById('onboarding')?.remove();
      enterApp();
    }""")
    assert page.locator("#gfPhotoGate").count()==1,"Entry gate must exist synchronously"
    assert not page.locator("#app").evaluate("(x)=>x.classList.contains('open')"),"App opened before image gate"
    page.wait_for_timeout(800)
    page.screenshot(path=str(ART/"preentry-photo-wheel.png"),animations="disabled")
    page.wait_for_function("()=>document.getElementById('gfPhotoGate')===null && document.getElementById('app').classList.contains('open')",timeout=240000)
    assert page.evaluate("()=>window.GainFocusPhotoReadiness.status().active") is False
    page.evaluate("showTab('train')")
    page.wait_for_timeout(900)
    page.screenshot(path=str(ART/"training-after-loading.png"),animations="disabled")
    page.evaluate("openSession('push')")
    page.wait_for_timeout(900)
    images=page.evaluate("""() => ({
      photos:[...document.querySelectorAll('#sessionSheet img[data-gf-photo="v2"]')].map(x=>({src:x.getAttribute('src'),ready:x.complete&&x.naturalWidth>0})),
      overlay:document.querySelectorAll('#sessionSheet .gf-photo-screen-loader').length
    })""")
    assert len(images["photos"])==5 and all(x["ready"] for x in images["photos"]),images
    assert images["overlay"]==0,images
    page.screenshot(path=str(ART/"push-after-loading.png"),animations="disabled")
    page.evaluate("""() => {
      const el=document.createElement('div');
      el.id='gfLoaderTest';
      document.body.appendChild(el);
      const img=document.createElement('img');
      img.dataset.gfPhoto='v2';
      el.appendChild(img);
      window.GainFocusPhotoReadiness.checkWorkout(el,'Testing loading spinner');
      setTimeout(()=>{img.src='./exercise-photos/Dumbbell_Bench_Press/0.jpg'},900);
    }""")
    assert page.locator("#gfLoaderTest .gf-photo-spinner").count()==1,"Workout loading wheel did not appear"
    page.wait_for_selector("#gfLoaderTest .gf-photo-screen-loader",state="detached",timeout=18000)
    assert not errors,"Unexpected page JS errors: "+str(errors[:5])
    print(json.dumps({"entry_gate": "blocked app until 873 photos decoded", "app_opened":True, "push":images, "workout_spinner":"shown then dismissed after image decoded", "page_errors":errors}),flush=True)
    browser.close()
server.shutdown()
