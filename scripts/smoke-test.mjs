import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createDockState, pokeDock, advanceDock, createFlight, advanceFlight, nudgeFlight } from '../src/motion/topPhysics.js';

const { circlePolygonContact, resolveTopBlock } = await import('../src/motion/blockCollision.js');
const { sampleBlocks } = await import('../src/motion/blockWorld.js');
const steer = createFlight({width:900,height:500},{x:450,y:200},1,()=>0.5);
nudgeFlight(steer,{x:-24,y:0});
assert.ok(steer.vx>400 && steer.vy<0,'Left-side hit jumps right');
nudgeFlight(steer,{x:24,y:0});
assert.ok(steer.vx<-400,'Right-side hit reverses direction predictably');
nudgeFlight(steer,{x:0,y:24});
assert.ok(steer.vy<-600,'Hit underneath produces a higher jump');
nudgeFlight(steer,{x:0,y:-24});
assert.ok(steer.vy>0,'Hit above an airborne top pushes it down');
const polygon=[{x:100,y:100},{x:200,y:100},{x:200,y:200},{x:100,y:200}];
assert.equal(circlePolygonContact({x:70,y:130},22,polygon),null,'Separated shapes do not collide');
assert.ok(circlePolygonContact({x:150,y:90},22,polygon).ny<0,'Top face collision has upward normal');
assert.ok(circlePolygonContact({x:150,y:150},22,polygon).depth>22,'Deep overlaps can be separated');
const rotated=polygon.map(p=>({x:(p.x-p.y)/Math.SQRT2,y:(p.x+p.y)/Math.SQRT2}));
assert.ok(circlePolygonContact({x:0,y:200},22,rotated),'Rotated squares are collidable');
let receivedImpulse=0;
const collider={vertices:polygon,cx:150,cy:150,vx:0,vy:0,omega:0,inverseMass:0.2,impulse:x=>{receivedImpulse=x;}};
const impact=createFlight({width:900,height:500},{x:90,y:170},1,()=>0.5);
Object.assign(impact,{x:90,y:170,tilt:0,vx:300,vy:0});
resolveTopBlock(impact,collider);
assert.ok(impact.vx<0 && receivedImpulse>0,'Top rebounds and transfers opposite momentum to block');
assert.ok(impact.x<=78,'Collision resolves penetration');
const dock = createDockState();
assert.equal(dock.tilt,0,'Docked top starts upright');
assert.equal(advanceDock(dock,1/60),false,'Idle top has no animation loop');
assert.equal(pokeDock(dock,()=>0.2),false,'One click only wobbles');
for(let i=0;i<300;i++) advanceDock(dock,1/60);
assert.equal(dock.charge,0,'Separated clicks do not accumulate forever');
assert.equal(dock.tilt,0,'A single wobble settles upright');
assert.equal(pokeDock(dock,()=>0.2),false,'First rapid click stays docked');
for(let i=0;i<12;i++) advanceDock(dock,1/60);
assert.equal(pokeDock(dock,()=>0.2),true,'Second click after 200ms deploys');
const bounds={width:900,height:500};
const { swipeFlight } = await import('../src/motion/topPhysics.js');
const { auraPower, AURA_SPEED_THRESHOLD } = await import('../src/motion/topAura.js');
assert.equal(auraPower({energy:0,swipeSpin:AURA_SPEED_THRESHOLD}),0,'Flame stays hidden below its speed threshold');
assert.ok(auraPower({energy:3,swipeSpin:0})>0,'Flame depends on total speed, not swipe events');
assert.ok(auraPower({energy:0,swipeSpin:100000})>auraPower({energy:0,swipeSpin:100}),'Flame keeps growing with higher speed');
assert.ok(Number.isFinite(auraPower({energy:0,swipeSpin:Number.MAX_VALUE/4})),'Extreme power remains finite');
const held=createFlight(bounds,{x:450,y:488},1,()=>0.5);
Object.assign(held,{energy:0,vx:0,vy:0,grounded:true});
swipeFlight(held,2000);
const heldSpeed=held.swipeSpin;
for(let i=0;i<50;i++) advanceFlight(held,1/60,bounds);
assert.equal(held.swipeSpin,heldSpeed,'Spin does not decay during the post-swipe delay');
swipeFlight(held,2000);
const stackedSpeed=held.swipeSpin;
for(let i=0;i<50;i++) advanceFlight(held,1/60,bounds);
assert.equal(held.swipeSpin,stackedSpeed,'Another swipe restarts the delay');
for(let i=0;i<90;i++) advanceFlight(held,1/60,bounds);
assert.ok(held.swipeSpin<stackedSpeed,'Percentage slowdown starts after swiping stops');
const unswiped=createFlight(bounds,{x:450,y:200},1,()=>0.5);
const swiped={...unswiped};
swipeFlight(swiped,1500);
assert.ok(Math.abs(swiped.swipeSpin-2.7)<0.001,'Swipe angular boost is three times stronger');
for(let i=0;i<180;i++) {
 advanceFlight(unswiped,1/60,bounds);
 advanceFlight(swiped,1/60,bounds);
 for(const field of ['x','y','vx','vy','tilt','energy']) assert.equal(swiped[field],unswiped[field],'Swipe never alters physical trajectory');
}
assert.ok(swiped.spinOffset>0,'Swipe adds visible rotation');
assert.ok(swiped.swipeSpin>1.2,'Spin charge persists between repeated swipes');
for(let i=0;i<2000;i++) advanceFlight(swiped,1/60,bounds);
assert.equal(swiped.swipeSpin,0,'Spin eventually settles when swiping stops');
const charged={...unswiped};
for(let i=0;i<1000;i++) {
 swipeFlight(charged,3000);
 advanceFlight(charged,1/60,bounds);
}
assert.ok(charged.swipeSpin>800,'Repeated swipes accumulate far beyond the former cap');
assert.ok(Math.abs(charged.spinOffset)<Math.PI*2,'High-speed phase stays numerically bounded');
const resting=createFlight(bounds,{x:450,y:488},1,()=>0.8);
Object.assign(resting,{energy:0,vx:0,vy:0,grounded:true,tilt:41*Math.PI/180,leanVelocity:0,swipeSpin:8});
for(let i=0;i<90;i++) advanceFlight(resting,1/60,bounds);
assert.ok(Math.abs(resting.tilt)<0.08,'Swiping rights a fallen top while spin remains high');
assert.equal(resting.x,450,'Righting the top does not push it');
const lower={...resting,swipeSpin:100};
const higher={...resting,swipeSpin:1000};
for(let i=0;i<60;i++) { advanceFlight(lower,1/60,bounds); advanceFlight(higher,1/60,bounds); }
assert.ok(Math.abs(lower.swipeSpin/100-Math.exp(-0.24))<0.001,'Spin loses about 21 percent per second');
assert.ok(Math.abs(lower.swipeSpin/100-higher.swipeSpin/1000)<0.001,'Very high spin loses the same percentage');
for(let i=0;i<2000;i++) advanceFlight(resting,1/60,bounds);
assert.ok(Math.abs(Math.abs(resting.tilt)-41*Math.PI/180)<0.02,'Top falls back to resting angle as spin runs out');

const floorHit = speed => {
 const state=createFlight(bounds,{x:450,y:487},1,()=>0.8);
 Object.assign(state,{vy:speed,vx:0,tilt:0,leanVelocity:0,energy:1,fallSide:1});
 advanceFlight(state,1/60,bounds);
 return state;
};
assert.ok(floorHit(600).leanVelocity>3,'Hard landing produces a pronounced angular kick');
assert.ok(floorHit(600).leanVelocity>floorHit(200).leanVelocity,'Harder collisions wobble more');
const leftFlight=createFlight(bounds,{x:45,y:-20},-1,()=>0.15);
const rightFlight=createFlight(bounds,{x:45,y:-20},1,()=>0.85);
assert.notEqual(leftFlight.fallSide,rightFlight.fallSide,'Different launches can fall on either side');
assert.notEqual(leftFlight.vx,rightFlight.vx,'Launch destination varies');
for(let i=0;i<2400;i++) {
 advanceFlight(leftFlight,1/60,bounds);
 advanceFlight(rightFlight,1/60,bounds);
 assert.ok(leftFlight.x>=45 && leftFlight.x<=855 && leftFlight.y<=488,'Physics stays inside hero walls and floor');
}
assert.ok(leftFlight.collisions>0,'Deployed top bounces on landing');
assert.ok(leftFlight.tilt < -0.7 && rightFlight.tilt > 0.7,'Fall direction is not fixed');
assert.ok(Math.abs(Math.abs(leftFlight.tilt)*180/Math.PI-41)<1,'Settled tilt is about 41 degrees');
assert.equal(advanceFlight(leftFlight,1/60,bounds),false,'Settled physics stops');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {url:'https://timwjt.github.io/', pretendToBeVisual:true});
const {window} = dom;
globalThis.window=window;
globalThis.document=window.document;
Object.defineProperty(document.documentElement,'scrollHeight',{value:10000,configurable:true});
Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const mediaListeners = new Set();
const motionPreference = {
 matches: false,
 addEventListener: (_, callback) => mediaListeners.add(callback),
 removeEventListener: (_, callback) => mediaListeners.delete(callback),
};
window.matchMedia = () => motionPreference;
let nextFrame = 0;
const frames = new Map();
window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
window.cancelAnimationFrame = id => frames.delete(id);
let frameTime = 0;
window.performance.now = () => frameTime;
const flushFrames = () => { frameTime += 16; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(frameTime)); };
window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (target, property) => target[property] ?? (String(property).includes('Gradient') ? (() => ({addColorStop() {}})) : (() => {})), set: (target, property, value) => { target[property] = value; return true; } });
const React=(await import('react')).default;
const {act}=await import('react');
const {createRoot}=await import('react-dom/client');
const App=(await import('../src/App.jsx')).default;
const {projects,experience,leadership}=await import('../src/data/content.js');
const root=createRoot(document.getElementById('root'));
const errors=[];
const originalError=console.error;
console.error=(...args)=>{errors.push(args);originalError(...args);};
await act(async()=>root.render(React.createElement(App)));
const { paintAura } = await import('../src/motion/topAura.js');
const auraProbe=document.createElement('canvas');
paintAura(auraProbe,{x:450,y:400,energy:0,swipeSpin:Number.MAX_VALUE/4},{left:0,top:0,width:900,height:500});
assert.ok(auraProbe.width<=960 && auraProbe.height<=960,'Extreme flame power uses a fixed-size backing canvas');
assert.ok(parseFloat(auraProbe.style.width)<=window.innerWidth && parseFloat(auraProbe.style.height)<=window.innerHeight,'Flame element stays within the viewport at extreme power');
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
assert.equal($$('h1').length,1,'One page heading');
assert.match($('h1').textContent,/TimWang/);
for(const id of ['projects','about','experience','leadership','contact']) assert.ok(document.getElementById(id),`${id} section exists`);
assert.equal($$('.project').length,projects.length,'Every project retained');
assert.equal($$('.experience-row').length,experience.length,'Every experience retained');
assert.equal($$('.community-row').length,leadership.length,'Every community retained');
assert.equal($$('.role-block').length,leadership.reduce((sum,org)=>sum+org.roles.length,0),'All role history retained');
for(const link of $$('a[href^="#"]')) assert.ok($(link.getAttribute('href')),`Anchor ${link.getAttribute('href')} resolves`);
for(const link of $$('a[target="_blank"]')) assert.ok(link.rel.includes('noreferrer'),'External links have safe rel');
for(const project of projects) assert.ok($$('.project a').some(link=>link.href===project.link),`${project.title} link retained`);
for(const href of ['/Tim_Wang_Resume.pdf','/markdown-viewer/']) {
 assert.ok($$(`a[href="${href}"]`).length,`${href} linked`);
 assert.ok(existsSync(`public${href}${href.endsWith('/')?'index.html':''}`),`${href} asset exists`);
}
assert.equal($('.project-archive').open,false,'Archive starts collapsed');
const archive=$('.project-archive');
await act(async()=>archive.querySelector('summary').click());
assert.equal(archive.open,true,'Archive expands');
const details=$('.project-details');
await act(async()=>details.querySelector('summary').click());
assert.equal(details.open,true,'Project details expand');
const toggle=$('.nav-toggle');
await act(async()=>toggle.click());
assert.equal(toggle.getAttribute('aria-expanded'),'true','Menu opens');
await act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'})));
assert.equal(toggle.getAttribute('aria-expanded'),'false','Escape closes menu');
await act(async()=>toggle.click());
await act(async()=>$('#nav-menu a').click());
assert.equal(toggle.getAttribute('aria-expanded'),'false','Navigation closes menu');
assert.equal($$('.play-square[role="button"][tabindex="0"]').length,4,'All squares have keyboard controls');
assert.ok($('.top-toy').getAttribute('aria-label').includes('Wobble'),'Top has nonvisual accessible instructions');
assert.equal($$('.top-push,.square-grip,.square-caption').length,0,'No visible instruction icons or drag labels');
assert.equal($('.top-toy').title,'','No tooltip instructions');
assert.equal($('nav .wordmark'),null,'Header name is replaced by top');
assert.equal($$('.back-top').length,0,'Back-to-top button removed');
assert.equal($$('.contact-links a').length,3,'Social profiles and resume remain links');
assert.equal($$('.contact-links button.contact-email').length,1,'Email is a copy button, not a mailto link');
assert.equal($$('.hero-geometry rect').length, 4, 'Geometric hero is rendered');
assert.ok(!/[\u00c2\u00c3]|\u00e2[\u0080-\u00ff\u2000-\u2122]|\ufffd/.test(document.body.textContent), 'No corrupted Unicode in rendered copy');
assert.ok($('#work-title').textContent.includes("Things I\u2019ve"), 'Apostrophe renders correctly');
const square = $('.play-square');
await act(async()=>square.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
assert.ok(square.getAttribute('transform').includes('translate(24 0)'), 'Keyboard can move a square');
await act(async()=>square.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',bubbles:true})));
assert.ok(square.getAttribute('transform').includes('translate(0 0)'), 'Home resets square');
const pointer = (type,x,y) => {
 const event=new window.MouseEvent(type,{clientX:x,clientY:y,button:0,bubbles:true});
 Object.defineProperty(event,'pointerId',{value:7});
 return event;
};
await act(async()=>square.dispatchEvent(pointer('pointerdown',100,100)));
await act(async()=>square.dispatchEvent(pointer('pointermove',150,125)));
assert.ok(square.getAttribute('transform').includes('translate(50 25)'), 'Pointer drag moves square');
await act(async()=>square.dispatchEvent(pointer('pointercancel',150,125)));
assert.ok(square.getAttribute('transform').includes('translate(0 0)'), 'Cancelled pointer restores square');
const identity = () => ({a:1,b:0,c:0,d:1,e:0,f:0});
square.getScreenCTM=identity;
square.parentElement.getScreenCTM=identity;
const registered=sampleBlocks({left:0,top:0});
assert.equal(registered.length,1,'Artwork exposes its actual transformed collider');
const beforeImpact=square.getAttribute('transform');
registered[0].impulse(600,0,{x:435,y:56});
for(let i=0;i<5;i++) flushFrames();
assert.notEqual(square.getAttribute('transform'),beforeImpact,'Block visibly responds to a top impulse');
delete square.getScreenCTM;
delete square.parentElement.getScreenCTM;
const stage = $('.hero-stage');
// JSDOM has no SVG layout engine. Supply responsive screen transforms, then
// drive the real React pointer handlers and inspect every rendered corner.
const squareStyles = readFileSync('src/index.css', 'utf8');
assert.match(squareStyles, /\.hero-geometry\s*\{[^}]*overflow:visible;[^}]*pointer-events:none;/, 'SVG overflow is visible without a full-artwork input shield');
assert.match(squareStyles, /\.play-square\s*\{[^}]*pointer-events:all;[^}]*touch-action:none;/, 'Only squares take pointer input, including touch drags');
assert.match(squareStyles, /\.hero-name\s*\{[^}]*pointer-events:none;/, 'Name does not block squares behind it');
const screenMatrix = (scaleX, scaleY, degrees, e, f) => {
 const radians=degrees*Math.PI/180, c=Math.cos(radians), s=Math.sin(radians);
 return {a:scaleX*c,b:scaleY*s,c:-scaleX*s,d:scaleY*c,e,f};
};
const squarePose = node => {
 const values=(node.getAttribute('transform') || 'translate(0 0) rotate(0)').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
 return {x:values[0],y:values[1],angle:values[2]};
};
const squareCorners = (node, matrix) => {
 const rect=node.querySelector('rect'), size=Number(rect.getAttribute('width'));
 const pose=squarePose(node), angle=pose.angle*Math.PI/180;
 const cx=Number(rect.getAttribute('x'))+size/2, cy=Number(rect.getAttribute('y'))+size/2;
 const half=size/2+1.5;
 return [[-half,-half],[half,-half],[half,half],[-half,half]].map(([x,y])=>{
  const px=cx+pose.x+x*Math.cos(angle)-y*Math.sin(angle);
  const py=cy+pose.y+x*Math.sin(angle)+y*Math.cos(angle);
  return {x:matrix.a*px+matrix.c*py+matrix.e,y:matrix.b*px+matrix.d*py+matrix.f};
 });
};
const assertContained = (node, matrix, area, message) => {
 for(const p of squareCorners(node,matrix)) assert.ok(p.x>=area.left-1e-6 && p.x<=area.left+area.width+1e-6 && p.y>=area.top-1e-6 && p.y<=area.top+area.height+1e-6,message);
};
for(const layout of [
 {name:'desktop',area:{left:40,top:96,width:1200,height:560},matrix:screenMatrix(0.9,0.9,0,380,60)},
 {name:'mobile with scroll rotation',area:{left:20,top:80,width:335,height:360},matrix:screenMatrix(0.37,0.37,-45,45,250)},
 {name:'resized nonuniform transform',area:{left:30,top:96,width:740,height:440},matrix:screenMatrix(0.65,0.5,73,420,-180)},
]) {
 let area=layout.area;
 stage.getBoundingClientRect=()=>({...area,bottom:area.top+area.height});
 for(const node of $$('.play-square')) {
  let matrix=layout.matrix;
  node.parentElement.getScreenCTM=()=>matrix;
  const captures=new Set();
  node.setPointerCapture=id=>captures.add(id);
  node.hasPointerCapture=id=>captures.has(id);
  node.releasePointerCapture=id=>captures.delete(id);
  node.focus=()=>{};
  await act(async()=>node.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',bubbles:true})));
  const start=squareCorners(node,matrix).reduce((sum,p)=>({x:sum.x+p.x/4,y:sum.y+p.y/4}),{x:0,y:0});
  await act(async()=>node.dispatchEvent(pointer('pointerdown',start.x,start.y)));
  assert.ok(captures.has(7),'Drag captures the pointer beyond artwork bounds');
  // No clamp is reached by this small movement: verify screen-to-SVG mapping.
  if(layout.name==='desktop' && node===square) {
   const before=squareCorners(node,matrix);
   await act(async()=>node.dispatchEvent(pointer('pointermove',start.x-180,start.y+70)));
   const after=squareCorners(node,matrix);
   assert.ok(Math.abs(after.reduce((s,p)=>s+p.x/4,0)-before.reduce((s,p)=>s+p.x/4,0)+180)<1e-6,'Scaled drag tracks screen pixels, not viewBox units');
  }
  for(const [dx,dy] of [[-3000,0],[3000,0],[0,-3000],[0,3000],[-3000,-3000],[3000,3000]]) {
   await act(async()=>node.dispatchEvent(pointer('pointermove',start.x+dx,start.y+dy)));
   assertContained(node,matrix,area,`${layout.name}: rotated corners stay inside all hero edges`);
   const corners=squareCorners(node,matrix);
   if(dx<0) assert.ok(Math.abs(Math.min(...corners.map(p=>p.x))-area.left)<1e-6,'Can reach the hero left edge');
   if(dx>0) assert.ok(Math.abs(Math.max(...corners.map(p=>p.x))-(area.left+area.width))<1e-6,'Can reach the hero right edge');
   if(dy<0) assert.ok(Math.abs(Math.min(...corners.map(p=>p.y))-area.top)<1e-6,'Can reach the hero ceiling');
   if(dy>0) assert.ok(Math.abs(Math.max(...corners.map(p=>p.y))-(area.top+area.height))<1e-6,'Can reach the hero floor');
   if(layout.name==='desktop' && node===square && dx<0) {
    assert.ok(squarePose(node).x < -435+16,'Drag reaches beyond the former SVG left limit');
    assert.ok(Math.min(...corners.map(p=>p.x))<matrix.e,'Square remains outside the SVG viewport');
   }
  }
  // A changing scroll transform must not be treated as pointer movement.
  matrix={...matrix,e:matrix.e+9,f:matrix.f-6};
  await act(async()=>node.parentElement.setAttribute('transform','translate(9 -6)'));
  assertContained(node,matrix,area,'Scroll transform changes recontain a captured square');
  await act(async()=>node.dispatchEvent(pointer('pointerup',start.x+3000,start.y+3000)));
  assert.equal(captures.size,0,'Release clears pointer capture');
  for(let i=0;i<600;i++) { flushFrames(); assertContained(node,matrix,area,'Spring return stays inside hero'); }
  const settled=squarePose(node);
  assert.ok(Math.abs(settled.angle)<0.01,'Released square rotation springs home');
  const home=squareCorners(node,matrix);
  for(let i=0;i<20;i++) flushFrames();
  assert.deepEqual(squareCorners(node,matrix),home,'Spring settles rather than fighting the hero wall forever');
  if(layout.name==='desktop') assert.ok(Math.abs(settled.x)+Math.abs(settled.y)<0.01,'Released square returns to its artwork position');
  delete node.parentElement.getScreenCTM;
  delete node.focus;
  await act(async()=>node.parentElement.removeAttribute('transform'));
 }
}
// Recheck held blocks on resize, even when reduced motion stops animation.
let resizedArea={left:40,top:96,width:1200,height:560};
stage.getBoundingClientRect=()=>({...resizedArea,bottom:resizedArea.top+resizedArea.height});
square.parentElement.getScreenCTM=()=>screenMatrix(0.6,0.6,0,250,100);
motionPreference.matches=true;
mediaListeners.forEach(callback=>callback());
await act(async()=>square.dispatchEvent(pointer('pointerdown',600,200)));
await act(async()=>square.dispatchEvent(pointer('pointermove',1800,800)));
resizedArea={left:40,top:96,width:400,height:350};
await act(async()=>window.dispatchEvent(new window.Event('resize')));
assertContained(square,square.parentElement.getScreenCTM(),resizedArea,'Resize recontains a held square without an animation loop');
await act(async()=>square.dispatchEvent(pointer('pointercancel',1800,800)));
assertContained(square,square.parentElement.getScreenCTM(),resizedArea,'Cancel restores the nearest contained home');
delete square.parentElement.getScreenCTM;
motionPreference.matches=false;
mediaListeners.forEach(callback=>callback());
const scene = $('.hero-scroll-scene');
stage.getBoundingClientRect = () => ({top:90,bottom:490,height:400});
scene.getBoundingClientRect = () => ({top:-110,bottom:690,height:800});
window.dispatchEvent(new window.Event('scroll'));
flushFrames();
assert.equal(stage.style.getPropertyValue('--scene-progress'),'0.5','Hero responds to scroll');
assert.ok($('.square-scroll').getAttribute('transform').includes('rotate(-45'),'Scroll choreographs square rotation');
motionPreference.matches = true;
mediaListeners.forEach(callback => callback());
assert.equal(stage.style.getPropertyValue('--scene-progress'),'','Reduced motion resets the artwork');
window.dispatchEvent(new window.Event('scroll'));
assert.equal(frames.size,0,'Reduced motion removes the scroll handler');
motionPreference.matches = false;
mediaListeners.forEach(callback => callback());
assert.equal(stage.style.getPropertyValue('--scene-progress'),'0.5','Motion preference can change live');
const top = $('.top-toy');
assert.equal(top.dataset.state,'idle','Rendered top starts inactive');
assert.equal(top.dataset.tilt,'0.000','Rendered top is upright');
const idleAngle=top.dataset.angle;
window.dispatchEvent(new window.WheelEvent('wheel',{deltaY:800}));
window.dispatchEvent(new window.Event('scroll'));
flushFrames();
assert.equal(top.dataset.state,'idle','Scroll and wheel do not activate the top');
assert.equal(top.dataset.angle,idleAngle,'Scrolling does not spin it');
await act(async()=>top.click());
flushFrames();
assert.equal(top.dataset.state,'wobbling','One click starts wobbling');
assert.notEqual(top.dataset.tilt,'0.000','Wobble changes the rendered tilt');
for(let i=0;i<300;i++) flushFrames();
assert.equal(top.dataset.state,'idle','Wobble returns to idle without enough clicks');
stage.getBoundingClientRect = () => ({top:96,left:40,width:900,height:400,bottom:496});
top.getBoundingClientRect = () => ({top:8,left:40,width:112,height:72,bottom:80});
for(let i=0;i<2;i++) await act(async()=>top.click());
assert.equal(top.dataset.state,'launching','Two clicks begin deployment');
for(let i=0;i<30;i++) flushFrames();
assert.equal(top.dataset.state,'deployed','Top deploys into hero');
const floating=$('.deployed-top');
assert.equal(floating.parentElement,document.body,'Floating layer escapes the hero stacking context');
assert.equal(floating.hidden,false,'Deployed top is visible');
const swipeX=Number(floating.dataset.x);
const swipeY=Number(floating.dataset.y);
for(const offset of [-75,75]) {
 const event=pointer('pointermove',40+swipeX+offset,96+swipeY-22);
 Object.defineProperty(event,'pointerType',{value:'mouse'});
 window.dispatchEvent(event);
}
assert.ok(Number(floating.dataset.swipeSpin)>0,'Sweeping the mouse across the deployed top adds spin');
assert.equal(Number(floating.dataset.x),swipeX,'Mouse sweep does not push horizontally');
assert.equal(Number(floating.dataset.y),swipeY,'Mouse sweep does not jump');
for(let i=0;i<8;i++) {
 for(let j=0;j<10;j++) flushFrames();
 const x=40+Number(floating.dataset.x), y=96+Number(floating.dataset.y)-22;
 for(const offset of [-75,75]) {
  const event=pointer('pointermove',x+offset,y);
  Object.defineProperty(event,'pointerType',{value:'mouse'});
  window.dispatchEvent(event);
 }
}
assert.ok(Number(floating.dataset.swipeSpin)>9,'Pointer swipes keep building power beyond the old limit');
assert.ok(floating.querySelector('.top-aura'),'Charged toy has an aura canvas');
const initialX=floating.dataset.x;
for(let i=0;i<40;i++) flushFrames();
assert.notEqual(floating.dataset.x,initialX,'Deployed toy travels horizontally');
const steeringStart=Number(floating.dataset.x);
await act(async()=>floating.dispatchEvent(pointer('pointerdown',40+steeringStart-35,96+Number(floating.dataset.y)-22)));
for(let i=0;i<12;i++) flushFrames();
assert.ok(Number(floating.dataset.x)>steeringStart,'Actual left-side pointer press steers right');
const reverseStart=Number(floating.dataset.x);
await act(async()=>floating.dispatchEvent(pointer('pointerdown',40+reverseStart+35,96+Number(floating.dataset.y)-22)));
for(let i=0;i<8;i++) flushFrames();
assert.ok(Number(floating.dataset.x)<reverseStart,'Actual right-side pointer press steers left');
stage.getBoundingClientRect = () => ({top:-700,left:40,width:900,height:400,bottom:-300});
window.dispatchEvent(new window.Event('scroll'));
assert.equal(top.dataset.state,'idle','Leaving hero returns toy to the dock');
assert.equal(floating.hidden,true,'Toy does not intrude into reading sections');
window.scrollY=1500;
let requestedScroll=null;
window.scrollTo=options=>{requestedScroll=options;};
for(let i=0;i<2;i++) await act(async()=>top.click());
assert.equal(top.dataset.state,'returning','Activation down the page waits for return');
assert.equal(requestedScroll.top,0,'Activation requests return to top');
assert.equal(floating.hidden,true,'No deployed toy over lower sections');
window.scrollY=0;
stage.getBoundingClientRect = () => ({top:96,left:40,width:900,height:400,bottom:496});
for(let i=0;i<35;i++) flushFrames();
assert.equal(top.dataset.state,'deployed','Deployment happens after returning to top');
await act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'})));
assert.equal(top.dataset.state,'idle','Escape returns toy to the dock');
window.scrollY=1500;
for(let i=0;i<2;i++) await act(async()=>top.click());
window.dispatchEvent(new window.WheelEvent('wheel',{deltaY:100}));
assert.equal(top.dataset.state,'idle','Manual scrolling cancels an in-progress return');
window.scrollY=0;
const { landingStrength } = await import('../src/motion/FooterLanding.jsx');
assert.ok(landingStrength(2500)>landingStrength(150)+30,'Faster arrivals produce substantially stronger compression');
assert.ok(landingStrength(100000)<=100,'Extreme input remains bounded');
assert.ok(landingStrength(100)<9,'Gentle approach produces only a small response');
const landing = $('.footer-landing');
const tile = $('.landing-tile');
assert.equal(landing.getAttribute('aria-hidden'),'true','Decorative landing band is hidden from screen readers');
Object.defineProperty(document.documentElement,'scrollHeight',{value:3000,configurable:true});
const pageBottom=3000-window.innerHeight;
window.scrollY=pageBottom-150;
window.dispatchEvent(new window.Event('scroll'));
window.scrollY=pageBottom;
window.dispatchEvent(new window.Event('scroll'));
assert.equal(landing.dataset.impacts,'1','Reaching bottom triggers one landing');
for(let i=0;i<12;i++) flushFrames();
assert.ok(tile.style.transform.includes('scaleY'),'Landing animates the geometric band');
window.dispatchEvent(new window.Event('scroll'));
assert.equal(landing.dataset.impacts,'1','Staying at bottom does not keep shaking');
for(let i=0;i<140;i++) flushFrames();
assert.equal(tile.style.transform,'','Landing settles completely');
motionPreference.matches=true;
mediaListeners.forEach(callback=>callback());
window.scrollY=pageBottom-150;
window.dispatchEvent(new window.Event('scroll'));
window.scrollY=pageBottom;
window.dispatchEvent(new window.Event('scroll'));
assert.equal(landing.dataset.impacts,'2','Reduced motion still acknowledges landing');
for(let i=0;i<9;i++) flushFrames();
assert.ok(Number(tile.style.transform.match(/scaleY\(([^)]+)/)[1])<0.6,'Landing compresses deeply even with reduced motion enabled');
assert.notEqual(tile.style.transform,$$('.landing-tile')[6].style.transform,'Bars move independently in a traveling wave');
assert.match(tile.style.transform,/^scaleY\(/,'Bars change height without sideways movement or rotation');
assert.equal(landing.style.getPropertyValue('--ground-shift'),'','Ground stays still');
for(let i=0;i<140;i++) flushFrames();
assert.equal(tile.style.transform,'','Full landing settles with reduced motion enabled');
window.dispatchEvent(new window.WheelEvent('wheel',{deltaY:100}));
assert.equal(landing.dataset.impacts,'2','Wheel at bottom cannot create a second impact');
window.dispatchEvent(new window.WheelEvent('wheel',{deltaY:100}));
assert.equal(landing.dataset.impacts,'2','Wheel momentum cannot repeatedly retrigger');
for(let i=0;i<80;i++) flushFrames();
window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'End'}));
assert.equal(landing.dataset.impacts,'2','Keyboard at bottom cannot retrigger either');
window.scrollY=pageBottom-150;
window.dispatchEvent(new window.Event('scroll'));
window.scrollY=pageBottom;
window.dispatchEvent(new window.Event('scroll'));
assert.equal(landing.dataset.impacts,'3','Leaving and returning produces exactly one new impact');
for(let i=0;i<140;i++) flushFrames();
window.scrollY=pageBottom-150;
window.dispatchEvent(new window.Event('scroll'));
for(let i=0;i<150;i++) {
 flushFrames();
 window.scrollY=pageBottom-149+i;
 window.dispatchEvent(new window.Event('scroll'));
}
const softStrength=Number(landing.dataset.strength);
for(let i=0;i<140;i++) flushFrames();
window.scrollY=pageBottom-150;
window.dispatchEvent(new window.Event('scroll'));
flushFrames();
window.scrollY=pageBottom;
window.dispatchEvent(new window.Event('scroll'));
assert.ok(softStrength<9,'Actual slow scrolling produces a soft landing');
assert.ok(Number(landing.dataset.strength)>softStrength+60,'Actual fast scrolling produces a much harder landing');

const touchZone=$('.touch-zone');
const touchWord=touchZone.querySelector('em');
touchZone.getBoundingClientRect=()=>({left:100,top:100,width:200,height:100});
touchZone.dispatchEvent(pointer('pointermove',280,170));
assert.ok(Math.abs(parseFloat(touchWord.style.transform.slice(10))-2.4)<0.01,'Touch movement is halved with reduced motion');
touchZone.dispatchEvent(new window.Event('pointerleave'));
assert.equal(touchWord.style.transform,'','Reduced-motion word resets on leaving');
motionPreference.matches=false;
mediaListeners.forEach(callback=>callback());
touchZone.dispatchEvent(pointer('pointermove',280,170));
for(let i=0;i<30;i++) flushFrames();
assert.ok(Math.abs(parseFloat(touchWord.style.transform.slice(10))-8)<0.2,'Word spring movement is halved');
touchZone.dispatchEvent(new window.Event('pointerleave'));
for(let i=0;i<150;i++) flushFrames();
assert.equal(touchWord.style.transform,'','Word settles back to original position');
window.scrollY=0;
assert.equal(errors.length,0,'No React errors');
await act(async()=>root.unmount());
assert.equal(mediaListeners.size,0,'Unmount cleans up media listener');
assert.equal(sampleBlocks({left:0,top:0}).length,0,'Unmount cleans up block registry');
assert.equal(frames.size,0,'Unmount cancels animation frames');
console.error=originalError;
console.log('PASS: content, project links, assets, anchors, disclosures, mobile navigation, and React render.');
window.close();
