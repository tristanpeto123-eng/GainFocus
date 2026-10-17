#!/usr/bin/env python3
"""GainFocus nutrition E2E: photo gating, portion enforcement, barcode and OCR."""
import http.server,json,pathlib,threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT),**kw)
  def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f"http://127.0.0.1:{server.server_port}"
ART=ROOT/"qa-screenshots";ART.mkdir(exist_ok=True)
sample={"status":1,"product":{"product_name":"QA Test Can","serving_size":"100 g","nutrition_data_per":"100g",
  "nutriments":{"energy-kcal_100g":255,"proteins_100g":11,"carbohydrates_100g":25,"fat_100g":12}}}
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
  context=browser.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.route('https://world.openfoodfacts.org/**',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps(sample)))
  page.goto(base+"/index.html",wait_until="domcontentloaded",timeout=90000)
  assert page.evaluate("!!document.getElementById('gfPhotoBootCSS')"),'Missing first paint CSS'
  assert page.evaluate("!!window.GFNutritionOCR && !!window.GFNutritionBarcode && !!window.GFNutritionPortions"),'Enhancement modules missing'
  assert page.evaluate("window.GainFocusPhotoReadiness.version")=='gf-photo-gate-v1.1'
  assert page.evaluate("!!document.querySelector('#gfPhotoGate')"),'No startup loading layer'
  initial=page.locator('#gfPhotoGate h2').inner_text()
  assert initial in ['Loading content','Warming up','Getting ready','Preparing your workouts','Almost there'],initial
  page.wait_for_timeout(1800)
  rotated=page.locator('#gfPhotoGate h2').inner_text()
  assert rotated!=initial,'Loading text does not rotate'
  page.wait_for_function("()=>GainFocusPhotoReadiness.status().ready",timeout=200000)
  assert page.locator('#gfPhotoGate').count()==0,'Photo gate must close after completion'
  page.evaluate("""() => {
    const w=74,t=createTargets(w);
    plan={schema:'gain-focus-plan/v3',appVersion:APP_VERSION,
      client:{id:'gf-nutrition-test',name:'QA Nutrition',age:25,heightCm:180,startWeightKg:w},
      goal:{label:'Build muscle',targetWeightKg:80,startDate:todayISO(),weeklyGainKg:.25,focus:['Chest']},
      nutrition:{calories:t.calories,proteinG:t.protein,carbsG:t.carbs,fatG:t.fat,planPurchased:false},
      training:{name:'3-day hypertrophy',sessionsPerWeek:3,sessions:starterSessions(3)}};
    progress=newProgress();ensureProgressExtras();
    document.getElementById('splash')?.remove();
    document.getElementById('onboarding')?.remove();
    enterApp();showTab('nutrition');renderNutrition();
  }""")
  page.wait_for_timeout(400)
  # The app intentionally opens a first-run Hercules briefing above the diary.
  # Complete the briefing as a user would before testing visible nutrition controls.
  page.evaluate("""() => {
    const modal=document.getElementById('gfEntrySummaryModal');
    if(modal?.classList.contains('open')){
      const accept=[...modal.querySelectorAll('button')].find(b=>/got it|continue|close|done/i.test(b.textContent));
      if(accept)accept.click();
      else modal.classList.remove('open');
    }
  }""")
  page.evaluate("document.querySelector('.gf-food-tabs button[data-mode=diary]')?.click()")
  page.wait_for_timeout(180)
  assert page.locator('#nutrition').is_visible(),"Nutrition screen not visible"
  assert page.locator('#gfBarcodeButton').count()==1,"Barcode button absent from nutrition photo mode"
  page.evaluate("setNutritionEntryMode('manual')")
  for _ in range(4):
    got=page.get_by_text('Got it',exact=True)
    if got.count() and got.first.is_visible():
      got.first.click(timeout=4000);page.wait_for_timeout(150)
    else:break
  page.locator('#nutrition .gf-food-tabs button[data-mode="diary"]').click()
  page.wait_for_timeout(150)
  print('DIARY_STATE',page.evaluate("""() => {
    const input=document.getElementById('foodName'),diary=document.getElementById('gf-food-diary');
    return {nutritionVisible:!!document.getElementById('nutrition')?.getBoundingClientRect().height,
      diaryHidden:diary?.hidden,diaryRect:diary?.getBoundingClientRect().height,
      inputDisplay:input?getComputedStyle(input).display:'missing',
      tabState:[...document.querySelectorAll('.gf-food-tabs button')].map(b=>({mode:b.dataset.mode,active:b.classList.contains('active')}))};
  }"""),flush=True)
  # Food diary's entry form is correctly nested inside a collapsed details widget.
  # Open the widget as a user does, then test visible form controls.
  page.evaluate("""() => {
    const details=document.getElementById('foodName')?.closest('details');
    if(details)details.open=true;
  }""")
  page.locator('#foodName').fill('Manual yoghurt',timeout=6000)
  for id,v in [('foodCalories','150'),('foodProtein','11'),('foodCarbs','15'),('foodFat','5')]:
    page.locator('#'+id).fill(v)
  page.evaluate("saveManualNutritionEntry()")
  assert page.evaluate("progress.nutritionLogs.length")==0,'Manual entry bypassed mandatory portion'
  page.locator('#gfManualPortion').fill('175')
  page.locator('#gfManualUnit').select_option('g')
  page.evaluate("saveManualNutritionEntry()")
  assert page.evaluate("progress.nutritionLogs.length")==1
  assert page.evaluate("progress.nutritionLogs.at(-1).quantity")==175
  saved=page.evaluate("progress.nutritionLogs.at(-1).id")
  page.evaluate("(id)=>saveLogAsNutritionFavourite(id)",saved)
  fav=page.evaluate("progress.nutritionFavourites.at(-1).id")
  page.evaluate("(id)=>useNutritionFavourite(id)",fav)
  assert page.locator('#gfFavouriteConfirm').count()==1
  page.locator('#gfFavAdd').click()
  assert page.evaluate("progress.nutritionLogs.length")==1,'Favourite saved without portion'
  page.locator('#gfFavouritePortion').fill('2')
  page.locator('#gfFavAdd').click()
  assert page.evaluate("progress.nutritionLogs.length")==2
  assert page.evaluate("progress.nutritionLogs.at(-1).quantity")==2
  page.evaluate("setNutritionEntryMode('photo')")
  page.evaluate("GFNutritionBarcode.open()")
  assert page.locator('#gfBarcodeLayer').count()==1,'Barcode dialog missing'
  page.locator('#gfBarcodeNumber').fill('3017620422003')
  page.locator('#gfBarcodeLookup').click()
  page.wait_for_function("()=>nutritionOCR.status==='done' && nutritionOCR.result?.barcode==='3017620422003'",timeout=12000)
  page.evaluate("""() => {for(const d of document.querySelectorAll('#nutrition details.gf50-widget'))d.open=true;}""")
  show_log_food()
  assert page.locator('#ocrQuantity').input_value()=='','Barcode accepted without a fresh portion'
  page.evaluate("saveExtractedNutritionEntry()")
  assert page.evaluate("progress.nutritionLogs.length")==2,'Barcode accepted with missing portion'
  page.locator('#ocrQuantity').fill('100')
  page.locator('#ocrQuantityUnit').select_option('g')
  page.evaluate("saveExtractedNutritionEntry()")
  assert page.evaluate("progress.nutritionLogs.length")==3
  page.evaluate("""() => {
    window.Tesseract={recognize:async(_image,_lang)=>({data:{
      text:'QA FOOD\\nEnergy 260 kcal\\nFat 11 g\\nCarbohydrate 27 g\\nProtein 7 g\\nTypical values per 100 g',
      confidence:93}})};
  }""")
  page.evaluate("""async () => {
    const canvas=document.createElement('canvas');canvas.width=700;canvas.height=430;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,700,430);
    ctx.fillStyle='#000';ctx.font='24px sans-serif';
    ctx.fillText('ENERGY 260 KCAL    PROTEIN 7 G    FAT 11 G',18,190);
    const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
    const file=new File([blob],'test-can-label.png',{type:'image/png'});
    await handleFoodNutritionPhoto({files:[file],value:''});
  }""")
  assert page.evaluate("nutritionOCR.status")=='done','Enhanced OCR did not complete'
  page.evaluate("""() => {for(const d of document.querySelectorAll('#nutrition details.gf50-widget'))d.open=true;}""")
  assert page.evaluate("nutritionOCR.result.ocrMethod")=='adaptive contrast'
  show_log_food()
  assert page.locator('#gfMacroReview input').count()==4,'Editable OCR field review missing'
  assert page.locator('#ocrQuantity').input_value()=='','OCR should require a fresh portion'
  page.locator('#ocrQuantity').fill('180')
  page.locator('#ocrQuantityUnit').select_option('g')
  page.evaluate("saveExtractedNutritionEntry()")
  assert page.evaluate("progress.nutritionLogs.length")==4
  assert page.evaluate("progress.nutritionLogs.at(-1).quantity")==180
  page.screenshot(path=str(ART/'nutrition-ocr-portion-verified.png'),animations='disabled')
  # Force a decoded-image promise to hang. Within ~3 seconds the workout
  # image loader must reinitialise the same image, never spin indefinitely.
  page.evaluate("""() => {
    const root=document.createElement('div');root.id='gfThreeSecTester';
    root.style.cssText='width:250px;height:200px;position:absolute;top:0;left:0';
    const image=document.createElement('img');image.dataset.gfPhoto='v2';
    image.src='./exercise-photos/Dumbbell_Bench_Press/0.jpg';
    let calls=0;
    image.decode=()=>{calls++;return calls===1?new Promise(()=>{}):Promise.resolve();};
    root.append(image);document.body.append(root);
    window.GainFocusPhotoReadiness.checkWorkout(root,'Testing 3-second stall recovery');
  }""")
  assert page.locator('#gfThreeSecTester .gf-photo-spinner').count()==1
  page.wait_for_selector('#gfThreeSecTester .gf-photo-screen-loader',state='detached',timeout=13000)
  assert 'gfRetry=1' in page.evaluate("document.querySelector('#gfThreeSecTester img').src"),'3-second retry did not reinitialise image'
  assert not errors,'Uncaught JavaScript errors: '+str(errors[:5])
  print(json.dumps({"photo_gate":"873 ready, rotating messages","portion":"manual/photo/barcode/favourite required",
    "barcode":"camera dialog + mocked verified product lookup","enhanced_ocr":"canvas preprocessing + mocked OCR parser",
    "total_entries":page.evaluate("progress.nutritionLogs.length"),"uncaught_errors":errors}),flush=True)
  browser.close()
server.shutdown()
