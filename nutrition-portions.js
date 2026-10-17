/* GainFocus nutrition portion controls — every user-added food requires explicit quantity.
   Authoritative numbers stay reviewable; previously approved nutrition UI is preserved. */
(function(){
'use strict';
const VERSION='gf-nutrition-portions-v1';
const safe=n=>Number.isFinite(Number(n))?Number(n):0;
const originalRender=window.renderNutrition;
if(typeof originalRender!=='function')return;
function amountValue(){return Number(document.getElementById('gfManualPortion')?.value);}
function unitValue(){return document.getElementById('gfManualUnit')?.value||'';}
function renderExtras(){
  const parent=document.getElementById('nutrition');if(!parent)return;
  if(nutritionEntryMode==='photo'){
    const target=parent.querySelector('#foodNutritionPhoto');
    if(target&&!parent.querySelector('#gfBarcodeButton')){
      const button=document.createElement('button');
      button.id='gfBarcodeButton';button.className='btn secondary';button.type='button';
      button.textContent='▦ Scan barcode';
      button.style.cssText='width:100%;margin:9px 0 12px;min-height:46px';
      button.onclick=()=>window.GFNutritionBarcode?.open();
      target.insertAdjacentElement('afterend',button);
    }
    const result=parent.querySelector('.ocr-result');
    if(result&&!result.querySelector('#gfMacroReview')){
      const box=document.createElement('div');box.id='gfMacroReview';
      box.style.cssText='margin:12px 0;padding:12px;border:1px solid #45617c;border-radius:12px';
      const label=document.createElement('div');label.textContent='Review and correct values from the label before adding';label.style.cssText='font-size:12px;margin-bottom:10px;font-weight:700';box.append(label);
      const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px';
      for(const [prop,text] of [['calories','Calories (kcal)'],['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)']]){
        const wrap=document.createElement('label');wrap.style.cssText='font-size:11px;display:flex;flex-direction:column;gap:5px';
        wrap.textContent=text;
        const input=document.createElement('input');input.className='input';input.type='number';input.min='0';input.max='3000';input.step='any';input.value=String(nutritionOCR.result?.[prop]??0);
        input.dataset.gfNutrient=prop;
        input.addEventListener('input',()=>{
          const v=Number(input.value);
          if(nutritionOCR.result&&input.value.trim()!==''&&Number.isFinite(v)&&v>=0&&v<=3000){
            nutritionOCR.result[prop]=v;
            window.updateOCRQuantityPreview?.();
          }
        });
        wrap.append(input);grid.append(wrap);
      }
      box.append(grid);
      const caution=document.createElement('p');
      caution.style.cssText='font-size:11px;color:#abc2d4;margin:9px 0 0';
      caution.textContent='Curved or reflective labels can confuse OCR. Check the numbers against the packaging.';
      box.append(caution);
      result.querySelector('.ocr-quantity')?.insertAdjacentElement('beforebegin',box);
    }
  }else{
    const save=parent.querySelector('.nut-save');
    if(save&&!parent.querySelector('#gfManualPortion')){
      const box=document.createElement('div');box.id='gfManualAmountBox';
      box.innerHTML='<label style="display:block;margin:12px 0 5px;font-weight:750;font-size:13px">Portion consumed — required for every entry</label><div style="display:flex;gap:8px"><input class="input" id="gfManualPortion" type="number" min="0.01" step="any" inputmode="decimal" placeholder="Amount" required aria-label="Portion amount"><select id="gfManualUnit" class="input" required aria-label="Portion unit"><option value="">Unit…</option><option value="g">g</option><option value="ml">ml</option><option value="servings">servings</option></select></div><small>Nutrition values entered above must be for this consumed portion.</small>';
      save.insertAdjacentElement('beforebegin',box);
      save.disabled=true;
      const refresh=()=>{save.disabled=!(Number.isFinite(amountValue())&&amountValue()>0&&unitValue());};
      box.addEventListener('input',refresh);box.addEventListener('change',refresh);
    }
  }
}
window.renderNutrition=function(){const result=originalRender.apply(this,arguments);renderExtras();return result;};
const originalManual=window.saveManualNutritionEntry;
window.saveManualNutritionEntry=function(){
  const amount=amountValue(),unit=unitValue();
  if(!Number.isFinite(amount)||amount<=0||!unit){toast('Specify the portion size and unit before saving');return false;}
  const prev=Array.isArray(progress?.nutritionLogs)?progress.nutritionLogs.length:0;
  const result=originalManual.apply(this,arguments);
  if(progress?.nutritionLogs?.length>prev){
    const food=progress.nutritionLogs[progress.nutritionLogs.length-1];
    food.quantity=amount;food.quantityUnit=unit;write();
  }
  return result;
};
const originalFavourite=window.useNutritionFavourite;
window.useNutritionFavourite=function(id){
  const f=progress?.nutritionFavourites?.find(x=>x.id===id);
  if(!f)return;
  if(f.source==='photo-ocr'&&f.labelNutrition){
    const r=originalFavourite.apply(this,arguments);
    // No silent reuse of an old portion: owner requires fresh confirmation each time.
    if(nutritionFavouritePrefill)nutritionFavouritePrefill.amount='';
    const amount=document.getElementById('ocrQuantity');if(amount)amount.value='';
    updateOCRQuantityPreview();
    return r;
  }
  const prior=document.getElementById('gfFavouriteConfirm');prior?.remove();
  const dialog=document.createElement('div');dialog.id='gfFavouriteConfirm';
  dialog.style.cssText='position:fixed;inset:0;z-index:99999;background:#050c18e8;display:flex;align-items:center;justify-content:center;padding:18px';
  dialog.innerHTML='<section role="dialog" aria-modal="true" aria-label="Choose favourite portion" style="width:min(100%,400px);background:#14263b;color:white;border:1px solid #50708e;border-radius:18px;padding:20px"><h3 style="margin:0 0 8px">How much did you have?</h3><p style="font-size:12px">Each serving uses the saved favourite values. Enter the number of servings consumed.</p><input id="gfFavouritePortion" class="input" type="number" inputmode="decimal" min="0.01" step="any" placeholder="Number of servings" aria-label="Consumed servings" required><div style="display:flex;gap:10px;margin-top:14px"><button class="btn secondary" type="button" id="gfFavCancel">Cancel</button><button class="btn primary" type="button" id="gfFavAdd">Add consumed portion</button></div></section>';
  document.body.append(dialog);
  dialog.querySelector('#gfFavCancel').onclick=()=>dialog.remove();
  dialog.querySelector('#gfFavAdd').onclick=()=>{
    const amount=Number(dialog.querySelector('#gfFavouritePortion').value);
    if(!Number.isFinite(amount)||amount<=0){toast('Specify a positive portion size');return;}
    ensureProgressExtras();
    progress.nutritionLogs.push({id:'food-'+Date.now(),date:todayISO(),createdAt:new Date().toISOString(),
      name:f.name||'Favourite',calories:safe(f.calories)*amount,protein:safe(f.protein)*amount,carbs:safe(f.carbs)*amount,fat:safe(f.fat)*amount,
      source:'manual',photo:f.photo||'',quantity:amount,quantityUnit:'servings'});
    dialog.remove();write();renderNutrition();toast('Consumed portion added');
  };
};
window.GFNutritionPortions={version:VERSION,renderExtras,validManual:()=>amountValue()>0&&!!unitValue()};
renderExtras();
})();
