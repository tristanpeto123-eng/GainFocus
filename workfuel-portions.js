/* GainFocus Work Fuel explicit portion gate — never log planned meals silently. */
(function(){
'use strict';
window.GFWorkFuelConfirmPortions=async function(rows){
  if(!Array.isArray(rows)||!rows.length)return null;
  return new Promise(resolve=>{
    document.getElementById('gfWorkFuelPortionDialog')?.remove();
    const shade=document.createElement('div');shade.id='gfWorkFuelPortionDialog';
    shade.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(3,10,24,.94);display:flex;align-items:center;justify-content:center;padding:16px;color:#eefaff;font:500 14px system-ui,sans-serif';
    const card=document.createElement('section');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Confirm consumed portions');
    card.style.cssText='width:min(100%,460px);max-height:85vh;overflow:auto;background:#12253b;border-radius:19px;border:1px solid #496c86;padding:22px';
    const title=document.createElement('h3');title.textContent='Confirm portions consumed';title.style.margin='0 0 8px';
    const intro=document.createElement('p');intro.textContent='Before adding meals to your food diary, specify how many planned servings you actually consumed of each item.';intro.style.cssText='font-size:12px;color:#c3d8e9;line-height:1.5';
    card.append(title,intro);
    const inputs=[];
    rows.forEach((row,i)=>{
      const label=document.createElement('label');label.style.cssText='display:flex;flex-direction:column;gap:6px;margin:13px 0;font-size:12px;font-weight:700';
      label.textContent=String(row.name||'Meal '+(i+1));
      const input=document.createElement('input');input.className='input';input.type='number';input.min='.01';input.step='any';input.inputMode='decimal';input.placeholder='Number of planned servings';
      input.required=true;input.setAttribute('aria-label','Servings consumed for '+String(row.name||'Meal '+(i+1)));
      inputs.push(input);label.append(input);card.append(label);
    });
    const notice=document.createElement('div');notice.setAttribute('role','status');notice.style.cssText='font-size:12px;color:#ffd18d;min-height:18px';
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;margin-top:10px';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn secondary';cancel.textContent='Cancel';
    const add=document.createElement('button');add.type='button';add.className='btn primary';add.textContent='Save consumed portions';
    actions.append(cancel,add);card.append(notice,actions);shade.append(card);
    document.body.append(shade);
    function finish(v){shade.remove();resolve(v);}
    cancel.onclick=()=>finish(null);
    add.onclick=()=>{
      const portions=inputs.map(x=>Number(x.value));
      if(inputs.some(x=>x.value.trim()==='')||portions.some(x=>!Number.isFinite(x)||x<=0||x>100)){
        notice.textContent='Enter a positive portion amount for every meal.';return;
      }
      finish(portions);
    };
    inputs[0]?.focus();
  });
};
})();
