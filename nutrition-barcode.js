/* GainFocus nutrition barcode scanner: native camera detection, ZXing fallback,
   and Open Food Facts lookup. Does not save food without portion confirmation. */
(function(){
'use strict';
const VERSION='gf-barcode-v1';
const API='https://world.openfoodfacts.org/api/v2/product/';
let active=null,controls=null,stream=null,frame=0,lookupBusy=false;
const $=id=>document.getElementById(id);
function message(s){const node=$('gfBarcodeStatus');if(node)node.textContent=s;}
function shutCamera(){
  if(frame){cancelAnimationFrame(frame);frame=0;}
  try{controls?.stop();}catch(_error){}
  controls=null;
  if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
  const video=$('gfBarcodeVideo');if(video){video.pause();video.srcObject=null;}
}
function close(){shutCamera();active?.remove();active=null;}
function asNumeric(v){const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;}
function parseServing(s){
  const m=String(s||'').match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  return m?{size:Number(m[1].replace(',','.')),unit:m[2].toLowerCase()}:null;
}
function decodeProduct(payload,barcode){
  if(payload?.status!==1||!payload?.product)throw new Error('Barcode not found. Try a nutrition-label photo.');
  const p=payload.product,n=p.nutriments||{};
  let calories=asNumeric(n['energy-kcal_100g']);
  if(calories===null){
    const kj=asNumeric(n['energy-kj_100g']);
    if(kj!==null)calories=kj/4.184;
  }
  const protein=asNumeric(n.proteins_100g),carbs=asNumeric(n.carbohydrates_100g),fat=asNumeric(n.fat_100g);
  if([calories,protein,carbs,fat].some(x=>x===null))throw new Error('Barcode found, but complete nutrition values are missing. Photograph the label instead.');
  if(calories>2500||protein>100||carbs>200||fat>150)throw new Error('Product nutrition appears inconsistent — use a label photo to verify.');
  const serving=parseServing(p.serving_size),basisUnit=/100\s*ml/i.test(String(p.nutrition_data_per||''))?'ml':'g';
  const name=String(p.product_name||p.product_name_en||p.generic_name||p.brands||'Scanned food').slice(0,100);
  return {name,calories,protein,carbs,fat,basis:'Per 100 '+basisUnit,basisType:'per100',basisAmount:100,basisUnit,
    servingSize:serving?.unit===basisUnit?serving.size:null,
    servingUnit:serving?.unit===basisUnit?serving.unit:'',
    barcode,source:'open-food-facts',confidence:0};
}
async function lookup(code){
  code=String(code||'').replace(/[^0-9]/g,'');
  if(!/^\d{8,14}$/.test(code)){message('Enter a valid 8–14 digit barcode.');return;}
  if(lookupBusy)return;
  lookupBusy=true;shutCamera();message('Looking up product nutrition…');
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    let response;
    try{
      response=await fetch(API+encodeURIComponent(code)+'.json?fields=code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,nutrition_data_per',
        {signal:controller.signal,mode:'cors'});
    }finally{clearTimeout(timer);}
    if(!response.ok)throw new Error('Product lookup is currently unavailable. Try the label photo.');
    const food=decodeProduct(await response.json(),code);
    if(typeof nutritionEntryMode==='undefined')throw new Error('Nutrition screen is not ready');
    close();
    nutritionEntryMode='photo';nutritionFavouritePrefill=null;pendingFoodPhoto='';
    nutritionOCR={status:'done',progress:1,result:food,error:'',rawText:'Barcode '+code,message:''};
    renderNutrition();
    toast('Product found — check the nutrition values and enter consumed portion');
  }catch(error){message(error?.message||'Could not retrieve product. Enter code or photograph label.');}
  finally{lookupBusy=false;}
}
async function zxing(){
  if(window.ZXingBrowser?.BrowserMultiFormatReader)return window.ZXingBrowser;
  const source='https://unpkg.com/@zxing/browser@0.2.1/umd/zxing-browser.min.js';
  await new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=source;el.async=true;
    el.onload=resolve;el.onerror=()=>reject(new Error('Barcode library unavailable. Enter the number manually.'));
    document.head.appendChild(el);
  });
  if(!window.ZXingBrowser?.BrowserMultiFormatReader)throw new Error('Barcode scanner unavailable. Enter the number manually.');
  return window.ZXingBrowser;
}
async function beginCamera(){
  if(!active)return;
  shutCamera();
  const video=$('gfBarcodeVideo');
  if(!video)return;
  message('Starting camera…');
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access unavailable — enter barcode manually.');
    if('BarcodeDetector' in window){
      const formats=['ean_13','ean_8','upc_a','upc_e','itf'];
      const detector=new BarcodeDetector({formats});
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      video.srcObject=stream;await video.play();
      message('Point the camera at the barcode');
      let reading=false;
      const tick=async()=>{
        if(!active||!stream)return;
        if(!reading){
          reading=true;
          try{
            const results=await detector.detect(video);
            const code=results.find(x=>/^\d{8,14}$/.test(x.rawValue||''))?.rawValue;
            if(code){lookup(code);return;}
          }catch(_error){}finally{reading=false;}
        }
        frame=requestAnimationFrame(tick);
      };
      tick();
    }else{
      const ZX=await zxing();
      if(!active)return;
      message('Point the camera at the barcode');
      const reader=new ZX.BrowserMultiFormatReader();
      controls=await reader.decodeFromVideoDevice(undefined,video,(result)=>{
        if(result && !lookupBusy)lookup(result.getText?.()||result.text);
      });
    }
  }catch(error){shutCamera();message(error?.message||'Camera unavailable. Enter barcode manually.');}
}
function open(){
  close();
  const layer=document.createElement('div');layer.id='gfBarcodeLayer';layer.style.cssText='position:fixed;inset:0;background:#030a16f0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px';
  layer.innerHTML='<section role="dialog" aria-modal="true" aria-label="Scan food barcode" style="width:min(100%,450px);background:#122438;color:#effaff;border:1px solid #4f6f87;border-radius:20px;padding:18px"><h2 style="font-size:22px;margin:0 0 6px">Scan barcode</h2><p style="font-size:12px;margin:0 0 14px">Scan the packaging or enter its barcode number. Product data must be checked before logging.</p><video id="gfBarcodeVideo" autoplay muted playsinline style="width:100%;min-height:170px;max-height:240px;object-fit:cover;background:#040e1c;border-radius:12px"></video><p id="gfBarcodeStatus" role="status" style="font-size:12px">Camera starting…</p><div style="display:flex;gap:8px"><input class="input" id="gfBarcodeNumber" type="text" inputmode="numeric" autocomplete="off" placeholder="8–14 digit barcode" aria-label="Barcode number"><button type="button" class="btn primary" id="gfBarcodeLookup">Look up</button></div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px"><button type="button" class="btn secondary" id="gfBarcodeRetry">Restart camera</button><button type="button" class="btn secondary" id="gfBarcodeClose">Close</button></div></section>';
  document.body.append(layer);active=layer;
  $('gfBarcodeLookup').onclick=()=>lookup($('gfBarcodeNumber').value);
  $('gfBarcodeRetry').onclick=beginCamera;
  $('gfBarcodeClose').onclick=close;
  $('gfBarcodeNumber').addEventListener('keydown',e=>{if(e.key==='Enter')lookup(e.target.value);});
  beginCamera();
}
window.GFNutritionBarcode={version:VERSION,open,close,lookup,decodeProduct,parseServing};
})();
