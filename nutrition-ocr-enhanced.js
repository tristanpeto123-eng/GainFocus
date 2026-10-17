/* GainFocus OCR v2 — multiple on-device, adaptive preprocessing candidates.
   No synthetic text generation: all numbers must come from OCR and be user-reviewed. */
(function(){
'use strict';
const VERSION='gf-nutrition-ocr-v2';
const MAX_SIZE=1650;
const originalHandler=window.handleFoodNutritionPhoto;
if(typeof originalHandler!=='function')return;
const status=(message,progress)=>{
  nutritionOCR.status='working';nutritionOCR.message=message;nutritionOCR.progress=progress;
  const t=document.querySelector('.ocr-copy span');if(t)t.textContent=message;
  const b=document.querySelector('.ocr-progress i');if(b)b.style.width=Math.round(progress*100)+'%';
};
function canvasFromFile(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{
      try{
        const scale=Math.min(1,MAX_SIZE/Math.max(image.width,image.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.width*scale));
        canvas.height=Math.max(1,Math.round(image.height*scale));
        canvas.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas);
      }catch(error){reject(error);}finally{URL.revokeObjectURL(url);}
    };
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Cannot decode image. Try a JPG or PNG.'));};
    image.src=url;
  });
}
function flattenedCylinder(source){
  // Cylindrical remap: spread narrow left/right letter regions on curved cans.
  const w=source.width,h=source.height,out=document.createElement('canvas');
  out.width=w;out.height=h;
  const a=source.getContext('2d').getImageData(0,0,w,h);
  const dst=out.getContext('2d'),data=dst.createImageData(w,h),theta=1.05,den=Math.sin(theta);
  for(let x=0;x<w;x++){
    const t=(2*(x+.5)/w-1)*theta;
    const sx=Math.max(0,Math.min(w-1,Math.round((Math.sin(t)/den+1)*w/2)));
    for(let y=0;y<h;y++){
      const index=(y*w+x)*4,from=(y*w+sx)*4;
      data.data[index]=a.data[from];data.data[index+1]=a.data[from+1];data.data[index+2]=a.data[from+2];data.data[index+3]=255;
    }
  }
  dst.putImageData(data,0,0);return out;
}
function enhance(source,threshold=false){
  const w=source.width,h=source.height,out=document.createElement('canvas');out.width=w;out.height=h;
  const cx=out.getContext('2d',{willReadFrequently:true});
  cx.drawImage(source,0,0);
  const data=cx.getImageData(0,0,w,h),pixels=data.data;
  const lum=new Float32Array(w*h);
  let blown=0;
  for(let i=0;i<lum.length;i++){
    const j=i*4,y=.299*pixels[j]+.587*pixels[j+1]+.114*pixels[j+2];
    lum[i]=y;if(y>249)blown++;
  }
  // Local illumination estimate via integral image. Handles uneven can reflections.
  const pitch=w+1,integral=new Float64Array(pitch*(h+1));
  for(let y=0;y<h;y++){
    let row=0;
    for(let x=0;x<w;x++){
      row+=lum[y*w+x];
      integral[(y+1)*pitch+x+1]=integral[y*pitch+x+1]+row;
    }
  }
  const radius=Math.max(10,Math.round(Math.min(w,h)/48));
  for(let y=0;y<h;y++){
    const top=Math.max(0,y-radius),bottom=Math.min(h,y+radius+1);
    for(let x=0;x<w;x++){
      const left=Math.max(0,x-radius),right=Math.min(w,x+radius+1);
      const sum=integral[bottom*pitch+right]-integral[bottom*pitch+left]-integral[top*pitch+right]+integral[top*pitch+left];
      const mean=sum/((bottom-top)*(right-left));
      const original=lum[y*w+x];
      let v;
      if(threshold){
        // Local threshold with slightly conservative glare handling.
        v=original<mean-11?20:245;
      }else{
        // Preserve ink contrast while reducing uneven illumination.
        v=Math.max(0,Math.min(255,132+(original-mean)*1.75+(mean-128)*.24));
      }
      const i=(y*w+x)*4;
      pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;
    }
  }
  cx.putImageData(data,0,0);
  return {canvas:out,glareRatio:blown/lum.length};
}
function ocrScore(result,text,confidence){
  const r=result||{};
  const core=[r.calories,r.protein,r.carbs,r.fat].filter(x=>Number.isFinite(Number(x))&&Number(x)>0).length;
  let score=(Number(confidence)||0)*.45+core*13;
  if(/per\s*100\s*(g|ml)|per\s*serving/i.test(text))score+=9;
  if(result){
    // Sanity check: calorie estimates can vary due to fibre/polyols, so warn; do not silently overwrite.
    const predicted=4*r.protein+4*r.carbs+9*r.fat;
    const error=Math.abs(r.calories-predicted)/Math.max(80,r.calories);
    if(error>.65)score-=15;
    if(r.calories>1500||r.protein>100||r.carbs>150||r.fat>110)score-=20;
  }else score-=80;
  return score;
}
async function analyzeFile(file){
  const T=await loadTesseract();
  const original=await canvasFromFile(file);
  const contrast=enhance(original);
  const candidates=[
    {kind:'adaptive contrast',image:contrast.canvas},
    {kind:'cylindrical correction',image:enhance(flattenedCylinder(original)).canvas},
    {kind:'glare-resistant threshold',image:enhance(original,true).canvas}
  ];
  const observations=[];
  for(let i=0;i<candidates.length;i++){
    const candidate=candidates[i];
    status('Reading '+candidate.kind+' ('+(i+1)+'/'+candidates.length+')',.15+i*.25);
    const out=await T.recognize(candidate.image.toDataURL('image/jpeg',.91),'eng',{
      logger:m=>{if(Number.isFinite(m?.progress))status('Reading '+candidate.kind,
        Math.min(.88,.15+i*.25+Number(m.progress)*.17));}
    });
    const raw=out?.data?.text||'',confidence=Number(out?.data?.confidence)||0;
    const parsed=parseNutritionLabel(raw,confidence);
    observations.push({result:parsed,raw,confidence,score:ocrScore(parsed,raw,confidence),kind:candidate.kind});
    if(parsed && confidence>=90 && observations[0]===observations.at(-1))break;
  }
  observations.sort((a,b)=>b.score-a.score);
  const best=observations[0];
  return {best,attempts:observations.map(x=>({method:x.kind,confidence:x.confidence,valid:!!x.result,score:Math.round(x.score)})),glareRisk:contrast.glareRatio};
}
let active=0;
window.handleFoodNutritionPhoto=async function(input){
  const file=input?.files?.[0];if(!file)return;
  const token=++active;
  try{
    pendingFoodPhoto=await compressFoodPhoto(file);
    nutritionOCR={status:'working',progress:.05,result:null,error:'',rawText:'',message:'Correcting label curvature and glare…'};
    renderNutrition();
    const analysis=await analyzeFile(file);
    if(token!==active)return;
    if(!analysis.best?.result)throw new Error('The photo was too unclear to read reliably. Avoid glare, show the full panel and retake from slightly different angles.');
    const result=analysis.best.result;
    result.ocrMethod=analysis.best.kind;
    result.ocrGlareRisk=analysis.glareRisk;
    result.ocrAttempts=analysis.attempts;
    // Never present inferred values as verified. Every extracted macro stays editable.
    nutritionOCR={status:'done',progress:1,result,error:'',rawText:analysis.best.raw,message:'Review the detected values before saving.'};
    renderNutrition();
    if(analysis.glareRisk>.07)toast('Strong glare detected — check nutrition values against the label');
    else toast('OCR completed — confirm the label values and portion');
  }catch(error){
    if(token!==active)return;
    nutritionOCR={status:'error',progress:0,result:null,error:String(error?.message||error),rawText:'',message:''};
    renderNutrition();
  }finally{if(input)input.value='';}
};
window.GFNutritionOCR={version:VERSION,enhance,flattenedCylinder,ocrScore,analyzeFile};
})();
