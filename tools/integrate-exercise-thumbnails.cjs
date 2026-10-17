'use strict';
// Isolated v4.0.74 feature-branch patch: never run this against main.
// Uses local filesystem to avoid GitHub connector's >10 MB contents-API limit.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const htmlPath=path.join(root,'index.html');
const swPath=path.join(root,'service-worker.js');
const overlayPath=path.join(root,'exercise-photo-thumbnails.js');
const html=fs.readFileSync(htmlPath,'utf8');
const overlay=fs.readFileSync(overlayPath,'utf8');
const script='<script defer src="./exercise-photo-thumbnails.js"></script>';
if(!html.includes('id="gf70-exercise-thumbnails"'))throw Error('Expected v4.0.70 exercise spec not present');
if(!overlay.includes('gf74-thumb')||!overlay.includes('gf70ExerciseThumbnailSpec'))throw Error('Overlay is missing required hooks');
const origin='</body>';
if(html.split(origin).length!==2)throw Error('Unexpected HTML document: body closing tag is missing or repeated');
const matched=[...html.matchAll(/^\s*"([^"]+)":\["/gm)].map(m=>m[1]);
if(!matched.length)throw Error('Expected named exercises not present');
const after=html.includes(script)?html:html.replace(origin,script+'\n'+origin);
fs.writeFileSync(htmlPath,after,'utf8');
let sw=fs.readFileSync(swPath,'utf8');
if(!sw.includes('gain-focus-v4.0.73')&&!sw.includes('gain-focus-v4.0.74-thumbnail-review'))throw Error('Unknown service worker version; refusing blind replacement');
sw=sw.replace('gain-focus-v4.0.73','gain-focus-v4.0.74-thumbnail-review');
if(!sw.includes("'./exercise-photo-thumbnails.js'")){
  const seek="'./ux-credit-free-patch.js'";
  if(!sw.includes(seek))throw Error('Expected service worker asset list not found');
  sw=sw.replace(seek,seek+",'./exercise-photo-thumbnails.js'");
}
fs.writeFileSync(swPath,sw,'utf8');
const verified=fs.readFileSync(htmlPath,'utf8');
if(!verified.includes(script)||!fs.readFileSync(swPath,'utf8').includes("'./exercise-photo-thumbnails.js'"))throw Error('Patch verification failed');
console.log('PASS: Integrated thumbnail overlay on feature branch; '+matched.length+' names in inline exercise registry. No changes to main.');
