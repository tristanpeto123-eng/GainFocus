'use strict';
const express=require('express');
const webpush=require('web-push');
const fs=require('fs');
const path=require('path');

const app=express();
const PORT=Number(process.env.PORT||3000);
const PUBLIC_KEY=process.env.VAPID_PUBLIC_KEY||'';
const PRIVATE_KEY=process.env.VAPID_PRIVATE_KEY||'';
const SUBJECT=process.env.VAPID_SUBJECT||'mailto:admin@example.com';
const ADMIN_SECRET=process.env.ADMIN_PUSH_SECRET||'';
const STORE_FILE=path.join(__dirname,'push-state.json');

if(PUBLIC_KEY&&PRIVATE_KEY)webpush.setVapidDetails(SUBJECT,PUBLIC_KEY,PRIVATE_KEY);
app.use(express.json({limit:'256kb'}));
app.use(express.static(__dirname,{extensions:['html']}));

function loadStore(){try{return JSON.parse(fs.readFileSync(STORE_FILE,'utf8'))}catch{return {users:{}}}}
function saveStore(store){fs.writeFileSync(STORE_FILE,JSON.stringify(store,null,2))}
function safeId(v){return String(v||'').trim().slice(0,128)}
function mins(s){const [h,m]=String(s||'00:00').split(':').map(Number);return (h||0)*60+(m||0)}
function localParts(tz){
  const f=new Intl.DateTimeFormat('en-CA',{timeZone:tz||'UTC',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const p=Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));
  const wd=new Intl.DateTimeFormat('en-US',{timeZone:tz||'UTC',weekday:'short'}).format(new Date());const wi={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[wd]??0;return {date:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute),weekday:wi};
}
function inQuiet(pref,m){const a=mins(pref.quietStart||'22:30'),b=mins(pref.quietEnd||'07:30');return a>b?(m>=a||m<b):(m>=a&&m<b)}
function dayDiff(a,b){if(!a||!b)return 999;return Math.floor((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000)}
async function sendTo(user,payload){
  if(!PUBLIC_KEY||!PRIVATE_KEY||!user?.subscription)return false;
  try{await webpush.sendNotification(user.subscription,JSON.stringify(payload));return true}catch(err){
    if(err&&[404,410].includes(err.statusCode))user.subscription=null;
    console.warn('push failed',err?.statusCode||err?.message||err);return false;
  }
}
async function once(user,key,payload){
  const today=payload.date||localParts(user.timezone).date;user.sent||(user.sent={});const full=`${today}:${key}`;if(user.sent[full])return false;const ok=await sendTo(user,payload);if(ok)user.sent[full]=new Date().toISOString();return ok;
}

app.get('/api/push/public-key',(req,res)=>{
  if(!PUBLIC_KEY)return res.status(503).json({error:'VAPID_PUBLIC_KEY is not configured'});
  res.json({publicKey:PUBLIC_KEY});
});

app.post('/api/push/subscribe',(req,res)=>{
  const userId=safeId(req.body?.userId),subscription=req.body?.subscription;if(!userId||!subscription?.endpoint)return res.status(400).json({error:'userId and subscription are required'});
  const store=loadStore(),u=store.users[userId]||{};store.users[userId]={...u,userId,subscription,preferences:req.body?.preferences||u.preferences||{},updatedAt:new Date().toISOString()};saveStore(store);res.json({ok:true});
});

app.post('/api/push/state',(req,res)=>{
  const userId=safeId(req.body?.userId);if(!userId)return res.status(400).json({error:'userId is required'});
  const store=loadStore(),u=store.users[userId]||{userId};store.users[userId]={...u,timezone:req.body?.timezone||u.timezone||'UTC',stateDate:req.body?.stateDate||u.stateDate,preferences:req.body?.preferences||u.preferences||{},trainingDates:Array.isArray(req.body?.trainingDates)?req.body.trainingDates.slice(0,40):u.trainingDates||[],trainingWindowEnd:req.body?.trainingWindowEnd||u.trainingWindowEnd||null,trainingWeekdays:Array.isArray(req.body?.trainingWeekdays)?req.body.trainingWeekdays.map(Number).filter(x=>x>=0&&x<=6):u.trainingWeekdays||[],mealSlotsToday:Array.isArray(req.body?.mealSlotsToday)?req.body.mealSlotsToday:u.mealSlotsToday||[],lastWorkoutDate:req.body?.lastWorkoutDate||u.lastWorkoutDate||null,workoutTodayCompleted:!!req.body?.workoutTodayCompleted,sessionToday:String(req.body?.sessionToday||u.sessionToday||'Training').slice(0,120),updatedAt:new Date().toISOString()};saveStore(store);res.json({ok:true});
});

app.post('/api/push/unsubscribe',(req,res)=>{
  const userId=safeId(req.body?.userId);if(!userId)return res.status(400).json({error:'userId is required'});
  const store=loadStore();if(store.users[userId]){delete store.users[userId];saveStore(store)}
  res.json({ok:true});
});

app.post('/api/push/send',async(req,res)=>{
  if(!ADMIN_SECRET||req.get('x-gain-focus-secret')!==ADMIN_SECRET)return res.status(403).json({error:'forbidden'});
  const userId=safeId(req.body?.userId),store=loadStore(),u=store.users[userId];if(!u?.subscription)return res.status(404).json({error:'no subscription'});
  const ok=await sendTo(u,{title:req.body?.title||'Gain Focus',body:req.body?.body||'You have a new update.',tag:req.body?.tag||'gain-focus-social',url:req.body?.url||'./index.html'});saveStore(store);res.status(ok?200:502).json({ok});
});

async function scheduler(){
  const store=loadStore();let changed=false;
  for(const u of Object.values(store.users)){
    if(!u?.subscription)continue;const p=u.preferences||{};if(!p.enabled)continue;const {date,minute,weekday}=localParts(u.timezone||'UTC');if(inQuiet(p,minute))continue;
    const stateIsToday=u.stateDate===date,meals=stateIsToday?(u.mealSlotsToday||[]):[],workoutDone=stateIsToday&&u.workoutTodayCompleted;
    const inSyncedWindow=u.trainingWindowEnd&&date<=u.trainingWindowEnd,trainingToday=inSyncedWindow?(u.trainingDates||[]).includes(date):(u.trainingWeekdays||[]).includes(weekday);if(p.workouts&&trainingToday&&minute>=mins(p.workoutTime||'18:00')&&!workoutDone){changed=await once(u,'workout',{date,title:'Hercules · Training due',body:`${u.sessionToday||'Your scheduled workout'} is due. Log it or reschedule it.`,tag:'gf-workout',url:'./index.html'})||changed}
    if(p.meals){for(const [slot,time,label] of [['breakfast',p.breakfastTime||'08:30','Breakfast'],['lunch',p.lunchTime||'13:00','Lunch'],['dinner',p.dinnerTime||'19:00','Dinner']])if(minute>=mins(time)&&!meals.includes(slot)){changed=await once(u,slot,{date,title:`Hercules · ${label} log`,body:`No ${label.toLowerCase()} entry is detected yet. Log it so your nutrition trend stays complete.`,tag:`gf-${slot}`,url:'./index.html'})||changed}}
    if(p.inactivity){const d=dayDiff(u.lastWorkoutDate,date);if(d>=Number(p.inactivityDays||3)){changed=await once(u,'inactive',{date,title:'Hercules · Momentum check',body:`It has been ${d} days since your last logged workout. Choose the next realistic session or mark planned recovery.`,tag:'gf-inactive',url:'./index.html'})||changed}}
  }
  if(changed)saveStore(store);
}
setInterval(()=>scheduler().catch(console.error),60000);
scheduler().catch(console.error);

app.get('/health',(req,res)=>res.json({ok:true,pushConfigured:!!(PUBLIC_KEY&&PRIVATE_KEY)}));
app.listen(PORT,()=>console.log(`Gain Focus push server listening on :${PORT}`));
