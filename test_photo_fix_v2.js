const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/exercise-photo-thumbnails-v2.js','utf8');
const fixture=[
  ['Plank','Plank/0.jpg'],
  ['Goblet Squat','Goblet_Squat/0.jpg'],
  ['Clean and Jerk','Clean_and_Jerk/0.jpg'],
  ['Jogging, Treadmill','Jogging_Treadmill/0.jpg'],
  ['Arm Circles','Arm_Circles/0.jpg'],
  ['Atlas Stones','Atlas_Stones/0.jpg'],
  ['Barbell Hip Thrust','Barbell_Hip_Thrust/0.jpg'],
  ['Box Jump (Multiple Response)','Box_Jump_Multiple_Response/0.jpg'],
  ['Cable Seated Lateral Raise','Cable_Seated_Lateral_Raise/0.jpg'],
  ['Dumbbell Bicep Curl','Dumbbell_Bicep_Curl/0.jpg'],
  ['Machine Bench Press','Machine_Bench_Press/0.jpg'],
  ['Kettlebell Turkish Get-Up (Squat style)','Kettlebell_Turkish_Get-Up_Squat_style/0.jpg']
];
let store=new Map(),fetches=0;
function setup(){
  const doc={baseURI:'https://gainfocus.fitness/', body:null, head:{appendChild(){}},documentElement:{appendChild(){}},createElement(){return {id:'',textContent:''}},addEventListener(){},querySelectorAll(){return []}};
  const win={};
  const context={window:win,document:doc,URL,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>{fetches++;return {ok:true,json:async()=>[...fixture.map(([name,p])=>({name,images:[p]})),...Array.from({length:870},(_,i)=>({name:'Test Extra '+i,images:[`Test_Extra_${i}/0.jpg`]}))]}},HTMLImageElement:class HTMLImageElement{},MutationObserver:class{},requestAnimationFrame:cb=>cb(),console};
  vm.runInNewContext(src,context,{timeout:1200});return win.GFExerciseThumbsV2;
}
(async()=>{
 const a=setup();
 assert(a,'API exposed');
 assert(a.resolve({name:'Lat Pulldown'}).path==='Wide-Grip_Lat_Pulldown/0.jpg');
 assert(a.resolve({name:'Flat Dumbbell Press'}).path==='Dumbbell_Bench_Press/0.jpg');
 assert(a.resolve({name:'Dumbbell Curl'}).path==='Dumbbell_Bicep_Curl/0.jpg');
 const starter=['Incline Dumbbell Press','Lat Pulldown','Leg Press','Lateral Raise','Dumbbell Curl','Romanian Deadlift','Seated Cable Row','Flat Dumbbell Press','Cable Triceps Pushdown','Standing Calf Raise','Seated Shoulder Press','Chest Supported Row','Face Pull','Bulgarian Split Squat','Leg Curl','Walking Lunge'];
 assert(a.audit(starter).covered===starter.length,'All starter workout names must have a mapped photo');
 const html=a.render({name:'<img src=x onerror=alert(1)>'});
 assert(!html.includes('<img src=x')&&html.includes('&lt;img'),'Unsafe custom name must be escaped');
 assert(html.includes('gf-photo-placeholder'));
 assert(a.render({name:'My invention',thumbnailUrl:'javascript:alert(1)'}).includes('gf-photo-placeholder'));
 assert(a.render({name:'My invention',thumbnailUrl:'https://example.com/custom.jpg'}).includes('https://example.com/custom.jpg'));
 await a.ready;
 assert(a.catalogueCount===fixture.length+870);
 for(const [n,p] of fixture)assert(a.resolve({name:n}).path===p,'Catalogue mismatch '+n);
 assert(!a.resolve({name:'Kettlebell Halo'}).path,'Do not claim photo for upstream missing entry');
 assert(a.render({name:'Plank'}).includes('Plank/0.jpg'));
 assert(a.audit(starter).covered===16);
 assert(a.audit(['No known match']).missing.length===1);
 assert(a.resolve({name:'a full-body machine made up'}).source==='unmapped');
 assert(fetches===1);
 const b=setup();await b.ready;assert(fetches===1,'Offline-cached manifest prevents repeat download');
 assert(b.resolve({name:'Plank'}).path==='Plank/0.jpg');
 console.log('PASS: JS v2 resolver, 16 starter photos, 12 catalogue types, unknowns, escaping, custom images, cached catalogue.');
})().catch(e=>{console.error(e);process.exitCode=1});
