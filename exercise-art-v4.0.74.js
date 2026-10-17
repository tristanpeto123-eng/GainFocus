/* Gain Focus · illustrated exercise imagery · 4.0.74
 * Isolated asset. No tracking, network calls or client-data changes.
 * Used by the existing UX patch after the app's workout functions are defined.
 */
(function(){
  "use strict";
  var VERSION="4.0.74", cache=Object.create(null);
  function label(e){return String(e&&e.name||"Exercise").trim()||"Exercise";}
  function safe(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function classify(e){
    var n=(label(e)+" "+String(e&&e.focus||"")).toLowerCase();
    var k="functional";
    if(/leg extension/.test(n))k="leg-extension";
    else if(/leg curl|hamstring curl/.test(n))k="leg-curl";
    else if(/leg press/.test(n))k="leg-press";
    else if(/hack squat/.test(n))k="hack-squat";
    else if(/calf raise/.test(n))k="calf";
    else if(/bulgarian|split squat|walking lunge|reverse lunge|step.up|\blunge\b/.test(n))k="lunge";
    else if(/squat/.test(n))k="squat";
    else if(/hip thrust|glute bridge/.test(n))k="hip-thrust";
    else if(/romanian|deadlift|\brdl\b|good morning|back extension|hip hinge/.test(n))k="hinge";
    else if(/face pull/.test(n))k="face-pull";
    else if(/rear delt|rear.delt|reverse fly|reverse pec deck|reverse flye/.test(n))k="rear-fly";
    else if(/lat pull|pulldown|pull.down|straight.arm pull/.test(n))k="pulldown";
    else if(/pull.up|chin.up|assisted pull/.test(n))k="pullup";
    else if(/seated cable row|cable row/.test(n))k="cable-row";
    else if(/row/.test(n))k="row";
    else if(/shrug/.test(n))k="shrug";
    else if(/lateral raise|side raise/.test(n))k="lateral";
    else if(/front raise/.test(n))k="front-raise";
    else if(/overhead tricep|overhead cable extension|skull crusher/.test(n))k="triceps-overhead";
    else if(/tricep|pushdown|pressdown/.test(n))k="triceps";
    else if(/preacher curl/.test(n))k="preacher";
    else if(/hammer curl/.test(n))k="hammer-curl";
    else if(/curl/.test(n))k="curl";
    else if(/shoulder press|overhead press|military press/.test(n))k="shoulder-press";
    else if(/incline/.test(n)&&/press|bench/.test(n))k="incline-press";
    else if(/bench press|chest press|flat.*press|dumbbell press|smith press/.test(n))k="bench-press";
    else if(/pec deck|cable fly|chest fly|chest flye|pec fly/.test(n))k="chest-fly";
    else if(/push.up/.test(n))k="pushup";
    else if(/plank|crunch|sit.up|abdominal/.test(n))k="core";
    else if(/press/.test(n))k="shoulder-press";
    else if(/pull/.test(n))k="pulldown";
    else if(/quad/.test(n))k="squat";
    else if(/hamstring|glute/.test(n))k="hinge";
    else if(/bicep/.test(n))k="curl";
    else if(/chest|pec/.test(n))k="bench-press";
    var equipment=/smith/.test(n)?"smith":/machine|pec deck|leg press|leg extension|leg curl|hack squat/.test(n)?"machine":/cable|pulldown|pushdown|face pull/.test(n)?"cable":/barbell|ez.bar/.test(n)?"barbell":/dumbbell|hammer/.test(n)?"dumbbell":/pull.up|chin.up/.test(n)?"bar":/bench|incline/.test(n)?"bench":"free";
    return {pose:k,equipment:equipment};
  }
  function line(a,b,width,colour){return '<path d="M'+a[0]+' '+a[1]+' L'+b[0]+' '+b[1]+'" stroke="'+colour+'" stroke-width="'+width+'" stroke-linecap="round"/>';}
  function rr(x,y,w,h,r,fill,stroke){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="2"':"")+'/>';}
  function weight(x,y,kind){
    if(kind==="barbell"||kind==="smith")return '<g stroke="#b9dce9" stroke-width="4" stroke-linecap="round"><path d="M'+(x-33)+' '+y+'h66"/></g>'+rr(x-29,y-13,8,26,3,"#43738c")+rr(x+21,y-13,8,26,3,"#43738c");
    return '<g transform="translate('+x+' '+y+')" stroke="#84d7fd" stroke-width="3">'+rr(-15,-6,30,12,4,"#1e405a")+rr(-18,-12,7,24,2,"#4e8aa9")+rr(11,-12,7,24,2,"#4e8aa9")+'</g>';
  }
  var standing={h:[162,49],s:[[143,77],[181,77]],hip:[[151,120],[173,120]],el:[[132,106],[191,106]],wr:[[128,136],[197,136]],kn:[[149,154],[178,154]],ft:[[143,185],[183,185]]};
  function makePose(t){
    var p=JSON.parse(JSON.stringify(standing));
    if(t==="curl"||t==="hammer-curl"||t==="preacher"){p.el=[[131,104],[193,104]];p.wr=[[146,87],[179,87]];}
    if(t==="lateral"||t==="rear-fly"){p.el=[[110,88],[216,88]];p.wr=[[82,82],[244,82]];}
    if(t==="chest-fly"){p.el=[[126,85],[197,85]];p.wr=[[102,66],[219,66]];}
    if(t==="front-raise"){p.el=[[136,94],[191,94]];p.wr=[[119,72],[210,72]];}
    if(t==="shoulder-press"||t==="triceps-overhead"){p.el=[[132,69],[194,69]];p.wr=[[133,34],[194,34]];}
    if(t==="triceps"){p.el=[[139,108],[185,108]];p.wr=[[137,145],[187,145]];}
    if(t==="shrug"){p.s=[[143,69],[181,69]];}
    if(t==="pulldown"||t==="pullup"){p.h=[162,65];p.s=[[142,86],[183,86]];p.hip=[[151,135],[173,135]];p.el=[[126,65],[200,65]];p.wr=[[118,32],[205,32]];p.kn=[[172,155],[190,155]];p.ft=[[176,180],[207,180]];}
    if(t==="cable-row"||t==="row"||t==="face-pull"){p.h=[143,65];p.s=[[129,89],[162,89]];p.hip=[[143,137],[167,137]];p.el=[[169,103],[189,103]];p.wr=[[192,95],[210,95]];p.kn=[[183,160],[209,160]];p.ft=[[225,181],[249,181]];}
    if(t==="rear-fly"){p.h=[186,79];p.s=[[170,94],[199,94]];p.hip=[[149,125],[167,125]];p.el=[[133,84],[232,84]];p.wr=[[114,78],[250,78]];}
    if(t==="squat"||t==="hack-squat"){p.h=[162,49];p.hip=[[148,123],[173,123]];p.kn=[[124,151],[193,151]];p.ft=[[125,183],[195,183]];p.el=[[136,89],[187,89]];p.wr=[[130,99],[192,99]];}
    if(t==="lunge"){p.hip=[[151,118],[172,118]];p.kn=[[186,141],[137,159]];p.ft=[[219,180],[106,181]];}
    if(t==="hinge"){p.h=[204,86];p.s=[[184,96],[205,102]];p.hip=[[150,124],[168,124]];p.el=[[191,121],[212,128]];p.wr=[[182,155],[203,154]];p.kn=[[142,156],[169,156]];p.ft=[[136,184],[179,184]];}
    if(t==="leg-press"||t==="leg-extension"||t==="leg-curl"){p.h=[121,85];p.s=[[110,106],[135,107]];p.hip=[[145,144],[167,144]];p.el=[[130,132],[165,132]];p.wr=[[123,147],[174,150]];p.kn=[[205,127],[215,139]];p.ft=[[241,87],[249,103]];}
    if(t==="calf"){p.ft=[[145,174],[185,174]];}
    if(t==="hip-thrust"){p.h=[102,113];p.s=[[119,132],[145,133]];p.hip=[[169,110],[187,110]];p.el=[[105,156],[151,150]];p.wr=[[93,168],[155,165]];p.kn=[[216,148],[236,148]];p.ft=[[213,181],[250,181]];}
    if(t==="bench-press"||t==="incline-press"||t==="chest-fly"||t==="pushup"||t==="core"){p.h=[91,125];p.s=[[115,125],[137,128]];p.hip=[[176,132],[192,133]];p.el=[[128,89],[153,91]];p.wr=[[132,62],[165,62]];p.kn=[[229,158],[236,157]];p.ft=[[239,180],[261,180]];}
    return p;
  }
  function environment(t,e){
    var out='<path d="M0 181h320" stroke="#35718f" stroke-width="2" opacity=".65"/><path d="M40 181l-27 19 M280 181l27 19" stroke="#213c59" stroke-width="1.5"/>';
    if(t==="bench-press"||t==="incline-press"||t==="chest-fly"||t==="pushup"||t==="core"){
      out+=t!=="pushup"?'<path d="M82 151h130" stroke="#6c9cae" stroke-width="10" stroke-linecap="round"/><path d="M111 154l-12 31m94-31l12 31" stroke="#477189" stroke-width="6"/>':'';
      if(t==="incline-press")out+='<path d="M91 151l43-42" stroke="#76a8bd" stroke-width="11" stroke-linecap="round"/>';
    }else if(t==="pulldown"||t==="pullup"){out+=rr(79,17,7,163,3,"#4d7b99")+rr(242,17,7,163,3,"#4d7b99")+'<path d="M82 17h163" stroke="#648fab" stroke-width="7"/>'+line([161,17],[161,33],3,"#a5e3ff")+line([110,34],[212,34],6,"#c1dcec")+rr(135,156,69,7,3,"#456b81");}
    else if(t==="cable-row"||t==="row"||t==="face-pull"||t==="triceps"){out+=rr(267,23,11,155,4,"#4c7b98")+rr(250,34,46,9,3,"#638ea4")+line([272,43],[218,96],2,"#90d6f9");}
    else if(t==="leg-press"||t==="hack-squat"||t==="leg-extension"||t==="leg-curl"){out+='<path d="M64 178l166-115" stroke="#608ca1" stroke-width="8" stroke-linecap="round"/>'+rr(220,61,39,11,4,"#a5bfd2");}
    else if(t==="squat"){out+='<path d="M72 58h179" stroke="#85aab9" stroke-width="4"/>'+rr(79,58,8,122,3,"#48728a")+rr(240,58,8,122,3,"#48728a");}
    else if(t==="calf"){out+=rr(104,173,115,12,4,"#557e96");}
    else if(t==="hip-thrust"){out+=rr(85,138,74,15,4,"#527f98");}
    if(e==="smith")out+=rr(67,24,7,155,3,"#7b9ab2")+rr(247,24,7,155,3,"#7b9ab2");
    return out;
  }
  function athlete(p){
    var skin="#deb393",shade="#956c61",arm="#74b6d1",leg="#244d70";
    var out='<g filter="url(#shadow)">';
    // Filled tapered body segments rather than skeletal/stick-figure line diagrams.
    for(var i=0;i<2;i++){
      out+=line(p.hip[i],p.kn[i],23,leg);
      out+=line(p.kn[i],p.ft[i],19,leg);
      out+=line([p.ft[i][0]-7,p.ft[i][1]],[p.ft[i][0]+9,p.ft[i][1]+1],12,"#8bb8ca");
    }
    out+='<path d="M'+p.s[0][0]+' '+p.s[0][1]+' Q161 '+(p.s[0][1]-11)+' '+p.s[1][0]+' '+p.s[1][1]+' L'+p.hip[1][0]+' '+(p.hip[1][1]+5)+' Q161 '+(p.hip[1][1]+13)+' '+p.hip[0][0]+' '+(p.hip[0][1]+5)+'Z" fill="url(#shirt)" stroke="#b1def2" stroke-opacity=".35" stroke-width="1.5"/>';
    out+='<path d="M'+p.s[0][0]+' '+(p.s[0][1]+12)+' Q161 '+(p.hip[0][1]-2)+' '+p.hip[0][0]+' '+(p.hip[0][1]+5)+'" fill="none" stroke="#b0e5fa" stroke-opacity=".4" stroke-width="2"/>';
    for(var j=0;j<2;j++){out+=line(p.s[j],p.el[j],17,arm)+line(p.el[j],p.wr[j],13,arm)+'<circle cx="'+p.wr[j][0]+'" cy="'+p.wr[j][1]+'" r="7" fill="'+skin+'"/>';}
    out+='<ellipse cx="'+p.h[0]+'" cy="'+p.h[1]+'" rx="13.5" ry="17" fill="'+skin+'" stroke="'+shade+'" stroke-width="1.5"/>';
    out+='<path d="M'+(p.h[0]-13)+' '+(p.h[1]-5)+'q1-19 15-17q11 0 13 12q-12-3-28 5" fill="#273e50"/>';
    out+='<path d="M'+(p.h[0]+5)+' '+(p.h[1]+3)+'l-1 7" stroke="#9c726a" stroke-width="1.3" stroke-linecap="round"/>';
    return out+"</g>";
  }
  function foreground(p,t,e){
    var out="";
    if(e==="dumbbell"||e==="barbell"){
      if(/bench|press|fly|curl|raise|shrug|hinge|lunge|row/.test(t)){
        out+=weight(p.wr[0][0],p.wr[0][1],e)+weight(p.wr[1][0],p.wr[1][1],e);
      }
    }else if(t==="bench-press"||t==="incline-press")out+=weight(148,57,"barbell");
    if(t==="pulldown"||t==="pullup")out+=line([116,33],[209,33],6,"#a5e1ff");
    if(t==="triceps"||t==="face-pull"||t==="cable-row")out+=line([272,43],p.wr[1],2.5,"#82d4f6");
    if(t==="leg-press"||t==="leg-extension")out+=rr(245,80,11,38,4,"#90c9da");
    if(t==="squat"||t==="hack-squat")out+=line([114,90],[210,90],6,"#b4d8e6");
    return out;
  }
  function svg(e){
    var c=classify(e),p=makePose(c.pose),key=c.pose+"/"+c.equipment;
    if(cache[key])return cache[key];
    var art='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="Illustrated exercise setup">'
    +'<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#111f36"/><stop offset="1" stop-color="#061323"/></linearGradient>'
    +'<linearGradient id="shirt" x2=".85" y2="1"><stop stop-color="#8dd6ee"/><stop offset=".52" stop-color="#467da7"/><stop offset="1" stop-color="#1d486e"/></linearGradient>'
    +'<filter id="shadow" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#020a11" flood-opacity=".55"/></filter>'
    +'</defs><rect width="320" height="200" rx="12" fill="url(#bg)"/>'
    +'<circle cx="161" cy="71" r="98" fill="#1b4e71" opacity=".2"/>'
    +'<path d="M0 35h320M0 100h320" stroke="#72c6e6" stroke-opacity=".07"/>'
    +environment(c.pose,c.equipment)+athlete(p)+foreground(p,c.pose,c.equipment)
    +'<path d="M15 13h23" stroke="#64dbed" stroke-width="3" stroke-linecap="round"/><circle cx="45" cy="13" r="3" fill="#64dbed"/></svg>';
    var uri="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(art);
    cache[key]=uri;
    return uri;
  }
  function imageMarkup(e,large){
    return '<img class="exercise-stock gf-exercise-illustrated'+(large?" large":"")+'" src="'+svg(e)+'" alt="'+safe(label(e))+' exercise illustration" loading="lazy" decoding="async" />';
  }
  function guideMarkup(e){
    return '<img class="gf-exercise-guide-illustrated" src="'+svg(e)+'" alt="'+safe(label(e))+' exercise setup illustration" style="display:block;width:100%;height:auto;max-height:290px;object-fit:contain;border-radius:12px" />';
  }
  function upgradeVisible(){
    document.querySelectorAll("img.exercise-stock:not(.gf-exercise-illustrated)").forEach(function(node){
      var n=String(node.getAttribute("alt")||"").replace(/\s+(demonstration|exercise illustration)$/i,"");
      if(!n)return;
      node.src=svg({name:n});
      node.classList.add("gf-exercise-illustrated");
      node.alt=n+" exercise illustration";
    });
  }
  function install(){
    try{
      if(typeof exerciseVisual==="function" && !exerciseVisual.__gfIllustrated){
        exerciseVisual=function(e,large){return imageMarkup(e,large);};
        exerciseVisual.__gfIllustrated=true;
      }
      if(typeof exerciseDiagramSVG==="function" && !exerciseDiagramSVG.__gfIllustrated){
        exerciseDiagramSVG=function(e){return guideMarkup(e);};
        exerciseDiagramSVG.__gfIllustrated=true;
      }
      upgradeVisible();
      return typeof exerciseVisual==="function"&&!!exerciseVisual.__gfIllustrated;
    }catch(err){console.warn("Gain Focus exercise art install:",err);return false;}
  }
  window.GainFocusExerciseArt={version:VERSION,classify:classify,svg:svg,install:install,exerciseVisual:imageMarkup,upgradeVisible:upgradeVisible};
  if(!install())document.addEventListener("DOMContentLoaded",install,{once:true});
  if(document.readyState!=="loading")setTimeout(install,0);
  // Preserve thumbnails across client plan/session re-renders, without touching app data.
  if(typeof MutationObserver==="function"&&document.body){
    var scheduled=false,observer=new MutationObserver(function(){
      if(scheduled)return;scheduled=true;
      requestAnimationFrame(function(){scheduled=false;upgradeVisible();});
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }
})();
