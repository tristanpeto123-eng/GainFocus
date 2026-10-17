#!/usr/bin/env python3
"""Browser G1: full 873-image decode + real GainFocus mobile workout screenshot."""
import http.server,json,pathlib,threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
ART=ROOT/"qa-screenshots"
ART.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
origin="http://127.0.0.1:"+str(server.server_port)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
    ctx=browser.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True,device_scale_factor=1)
    page=ctx.new_page()
    problems=[]
    page.on("pageerror",lambda e:problems.append(str(e)))
    def intercept(route):
        if route.request.url.startswith(origin):route.continue_()
        else:route.abort()
    page.route("**/*",intercept)
    page.goto(origin+"/index.html",wait_until="domcontentloaded",timeout=75000)
    assert page.evaluate("!!window.GFExerciseThumbsV2"),"Real app is missing photo resolver"
    page.evaluate("() => window.GFExerciseThumbsV2.ready")
    status=page.evaluate("() => ({status:GFExerciseThumbsV2.status,count:GFExerciseThumbsV2.catalogueCount})")
    assert status=={"status":"ready","count":873},status
    probe=page.evaluate("""async () => {
      const rows=await (await fetch('./exercise-photo-index-v2.json')).json();
      const failures=[];
      let next=0,successes=0;
      async function worker(){
        for(;;){
          const i=next++;if(i>=rows.length)return;
          const [name,rel]=rows[i];
          const image=new Image();
          image.src='./exercise-photos/'+rel.split('/').map(encodeURIComponent).join('/');
          try{await image.decode();if(image.naturalWidth<10||image.naturalHeight<10)throw Error('bad dimensions');successes++;}
          catch(error){failures.push({name,rel,error:String(error)});}
        }
      }
      await Promise.all(Array.from({length:18},worker));
      return {total:rows.length,decoded:successes,failed:failures};
    }""")
    assert probe["decoded"]==873 and not probe["failed"],probe
    check=page.evaluate("""() => {
      const api=GFExerciseThumbsV2;
      const names=['Incline Dumbbell Press','Lat Pulldown','Leg Press','Lateral Raise','Dumbbell Curl','Romanian Deadlift','Seated Cable Row','Flat Dumbbell Press','Cable Triceps Pushdown','Standing Calf Raise','Seated Shoulder Press','Chest Supported Row','Face Pull','Bulgarian Split Squat','Leg Curl','Walking Lunge'];
      return {audit:api.audit(names),flat:api.render({name:'Flat Dumbbell Press'}),unknown:api.render({name:'No known exercise'})};
    }""")
    assert check["audit"]["covered"]==16,check
    assert "./exercise-photos/Dumbbell_Bench_Press/0.jpg" in check["flat"],"Flat Dumbbell Press path incorrect"
    assert "gf-photo-placeholder" in check["unknown"],"Unknown exercise substituted"
    page.evaluate("""() => {
      const w=74,t=createTargets(w);
      plan={schema:'gain-focus-plan/v3',appVersion:APP_VERSION,client:{id:'gf-demo-snapshot',name:'QA Demo Client',age:25,heightCm:180,startWeightKg:w},
        goal:{label:'Build muscle',targetWeightKg:80,startDate:todayISO(),weeklyGainKg:.25,focus:['Chest','Lat width']},
        nutrition:{calories:t.calories,proteinG:t.protein,carbsG:t.carbs,fatG:t.fat,planPurchased:false},
        training:{name:'3-day hypertrophy starter',sessionsPerWeek:3,sessions:starterSessions(3)}};
      progress=newProgress();ensureProgressExtras();
      document.getElementById('splash')?.remove();document.getElementById('onboarding')?.remove();
      enterApp();showTab('train');
    }""")
    page.wait_for_timeout(600)
    # The real app opens a first-run analysis briefing over the training view.
    # A covered screenshot is not accepted as visual evidence.
    def dismiss_briefing():
        for _ in range(4):
            button=page.get_by_text("Got it",exact=True)
            if button.count() and button.first.is_visible():
                button.first.click(timeout=3000)
                page.wait_for_timeout(250)
            else: break
    dismiss_briefing()
    page.screenshot(path=str(ART/"mobile-training-v2-1.png"),animations="disabled")
    page.evaluate("openSession('push')")
    page.wait_for_timeout(900)
    dismiss_briefing()
    screen=page.evaluate("""() => ({
      photos:[...document.querySelectorAll('#sessionSheet img[data-gf-photo="v2"]')].map(i=>({alt:i.alt,complete:i.complete,w:i.naturalWidth,src:i.getAttribute('src')})),
      placeholders:document.querySelectorAll('#sessionSheet .gf-photo-placeholder').length
    })""")
    assert len(screen["photos"])>=5,screen
    assert screen["placeholders"]==0,screen
    assert all(i["complete"] and i["w"]>0 and i["src"].startswith("./exercise-photos/") for i in screen["photos"]),screen
    photo=page.locator('#sessionSheet img[data-gf-photo="v2"]').first
    photo.scroll_into_view_if_needed(timeout=8000)
    pos=photo.bounding_box()
    assert pos and pos["width"]>15 and pos["height"]>15,pos
    in_front=page.evaluate("""p => {
      const el=document.elementFromPoint(p.x,p.y);
      return !!(el&&el.closest('#sessionSheet'));
    }""",{"x":pos["x"]+pos["width"]/2,"y":pos["y"]+pos["height"]/2})
    assert in_front,"Modal or overlay obstructs visible workout photography"
    page.screenshot(path=str(ART/"mobile-push-v2-1.png"),animations="disabled")
    print(json.dumps({"chromium_decoded":probe["decoded"],"failed":probe["failed"],"catalogue":status,"starter":check["audit"]["covered"],"push_screen":screen,"page_errors":problems[:8]}),flush=True)
    browser.close()
server.shutdown()
