#!/usr/bin/env python3
"""Gain Focus mobile Chromium regression: entering the app never waits for 873 photos."""
import http.server
import json
import pathlib
import threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}/index.html"

PROFILE = """() => {
  const w=74,t=createTargets(w);
  plan={schema:'gain-focus-plan/v3',appVersion:APP_VERSION,
    client:{id:'lazy-photo-qa',name:'QA Lazy',age:25,heightCm:180,startWeightKg:w},
    goal:{label:'Build muscle',targetWeightKg:80,startDate:todayISO(),weeklyGainKg:.25,focus:['Chest']},
    nutrition:{calories:t.calories,proteinG:t.protein,carbsG:t.carbs,fatG:t.fat,planPurchased:false},
    training:{name:'3-day starter',sessionsPerWeek:3,sessions:starterSessions(3)}};
  progress=newProgress();ensureProgressExtras();
  document.getElementById('splash')?.remove();
  document.getElementById('onboarding')?.remove();
  enterApp();
}"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width":390, "height":844}, is_mobile=True, has_touch=True)
    errors = []
    photos = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: photos.append(request.url)
            if "/exercise-photos/" in request.url else None)
    page.goto(url, wait_until="domcontentloaded", timeout=90000)
    page.wait_for_function("() => !!window.GainFocusPhotoReadiness && !document.getElementById('gfPhotoBoot')",
                           timeout=15000)
    status = page.evaluate("GainFocusPhotoReadiness.status()")
    assert status["mode"]=="lazy" and status["ready"] and not status["allPhotosReady"], status
    assert status["verified"]==0 and not status["active"], status
    assert page.locator("#gfPhotoGate").count()==0
    assert len(photos)==0, f"Photo downloads on login screen: {photos[:6]}"
    assert page.evaluate("typeof GainFocusPhotoReadiness.downloadOfflinePhotos")=="function"
    page.evaluate(PROFILE)
    page.wait_for_function("() => document.getElementById('app')?.classList.contains('open')", timeout=15000)
    assert page.locator("#gfPhotoGate").count()==0, "App entry must not wait for images"
    # The lazy photo catalogue may be fetched, but no all-library eager decoding is permitted.
    count_after_entry = len(photos)
    assert count_after_entry < 100, f"Unexpected eager image flood: {count_after_entry}"
    page.evaluate("showTab('train')")
    page.wait_for_timeout(1500)
    assert len(photos)<100, f"Train tab requested too many photos: {len(photos)}"

    # Exercise thumbnails keep their existing approved source and tile-only spinner.
    page.evaluate("""() => {
      let tile=document.createElement('div');
      tile.id='gfLazyImageQA';
      tile.style.cssText='position:fixed;z-index:20000;top:60px;left:40px;width:240px;height:200px;';
      tile.innerHTML=GFExerciseThumbsV2.render({name:'Flat Dumbbell Press'});
      document.body.appendChild(tile);
      GainFocusPhotoReadiness.checkWorkout(tile,'Loading photo');
    }""")
    assert page.locator("#gfLazyImageQA .gf-photo-screen-loader").count()==0
    page.wait_for_function("""() => {
      const img=document.querySelector('#gfLazyImageQA img[data-gf-photo="v2"]');
      return !!img && img.complete && img.naturalWidth>0;
    }""", timeout=20000)
    assert page.locator("#gfLazyImageQA img").get_attribute("loading")=="lazy"
    assert not errors, errors[:5]
    page.close()

    # A failed catalogue and failed online check must never prevent local user entry.
    offline = browser.new_page(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)
    offline_errors=[]
    offline.on("pageerror", lambda error: offline_errors.append(str(error)))
    offline.route("**/*gf_probe=*", lambda route: route.abort())
    offline.add_init_script("""(() => {
      const original=window.fetch.bind(window);
      window.fetch=(input,init)=>{
        const u=typeof input==='string'?input:(input?.url||String(input));
        if(u.includes('exercise-photo-index-v2.json'))return new Promise(()=>{});
        return original(input,init);
      };
    })();""")
    offline.goto(url,wait_until="domcontentloaded",timeout=90000)
    offline.wait_for_function("() => !!window.GainFocusPhotoReadiness",timeout=15000)
    offline.evaluate(PROFILE)
    offline.wait_for_function("() => document.getElementById('app')?.classList.contains('open')", timeout=15000)
    assert offline.locator("#gfPhotoGate").count()==0
    offline.evaluate("GainFocusPhotoReadiness.checkConnection()")
    offline.wait_for_selector("#gfRuntimeOfflinePrompt",state="visible",timeout=15000)
    assert offline.evaluate("GainFocusPhotoReadiness.status().ready")
    offline.locator("#gfRuntimeOfflinePrompt button").first.click()
    assert offline.evaluate("GainFocusPhotoReadiness.status().offline")
    assert not offline_errors,offline_errors[:5]
    print(json.dumps({"entry_without_photos":"pass","image_requests_before_entry":count_after_entry,
      "photo_requests_after_training":len(photos),"lazy_photo_decode":"pass",
      "offline_catalogue_not_blocking":"pass","failed_probe_not_blocking":"pass",
      "page_errors":[]}),flush=True)
    browser.close()
server.shutdown()
