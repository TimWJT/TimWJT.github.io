// Real Edge/Chromium checks, using Node's built-in WebSocket only.
// Start an isolated headless browser with --remote-debugging-port=9237 first.
// Usage: node scripts/easter-browser-check.mjs [CDP port] [site URL]
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = process.argv[2] || '9237';
const site = process.argv[3] || 'http://localhost:5173/';
const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && (t.url === 'about:blank' || t.url.startsWith(site)));
if (!target) throw new Error('No blank/site browser target available');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0;
const pending = new Map();
let errors = [];
ws.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.id) {
    const task = pending.get(msg.id);
    if (!task) return;
    clearTimeout(task.timer); pending.delete(msg.id);
    msg.error ? task.reject(new Error(JSON.stringify(msg.error))) : task.resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') errors.push({ kind: 'exception', detail: msg.params.exceptionDetails });
  else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push({ kind: 'console', detail: msg.params.args });
  else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push({ kind: 'log', detail: msg.params.entry });
};
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject, timer: setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000) });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function js(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const checks = [];
let mode;
function check(name, pass, evidence) {
  const result = { mode, name, pass: Boolean(pass), evidence };
  checks.push(result); console.log(JSON.stringify(result));
}
const rectScript = el => `(() => {const e=${el};const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}})()`;
const rect = selector => js(rectScript(`document.querySelector(${JSON.stringify(selector)})`));
async function mouse(type, x, y, extra = {}) { return cdp('Input.dispatchMouseEvent', { type, x, y, ...extra }); }
async function click(x, y) {
  if (mode === 'mobile') {
    await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await mouse('mouseMoved', x, y);
    await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', x, y, { button: 'left', buttons: 0, clickCount: 1 });
  }
  await sleep(60);
}
async function key(key) {
  const code = { ArrowRight: 39, ArrowLeft: 37, Escape: 27 }[key];
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code });
  await sleep(180);
}
async function wheel(deltaY, width, height) {
  await mouse('mouseWheel', width / 2, height - 40, { deltaY, deltaX: 0 });
  await sleep(360);
}
const letters = () => js(`Array.from(document.querySelectorAll('.name-letter'), e => {const r=e.getBoundingClientRect();return {letter:e.dataset.letter,font:e.dataset.font,family:getComputedStyle(e.firstElementChild).fontFamily,x:r.x,y:r.y,width:r.width,height:r.height}})`);
const collapse = () => js(`({active:document.querySelector('#top').classList.contains('page-collapse-active'),height:document.documentElement.scrollHeight,y:scrollY,animations:document.getAnimations().length})`);
const topState = () => js(`document.querySelector('.top-toy').dataset.state`);

try {
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Log.enable');
  // Observe real native AudioContexts without replacing audio behaviour.
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__audioContexts=[];window.__audioStarts=0;const Native=window.AudioContext;if(Native){window.AudioContext=new Proxy(Native,{construct(Target,args){const context=new Target(...args);window.__audioContexts.push(context);const original=context.createBufferSource.bind(context);context.createBufferSource=(...a)=>{const source=original(...a);const start=source.start.bind(source);source.start=(...b)=>{window.__audioStarts++;return start(...b)};return source};return context}})}` });
  for (const config of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    mode = config.name; errors = [];
    const { width, height } = config;
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: mode === 'mobile' });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: mode === 'mobile' });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await cdp('Page.navigate', { url: site });
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await js(`document.querySelectorAll('.name-letter').length === 7`)) break;
      await sleep(150);
    }
    // The existing name entrance lasts 1300ms. Measure only after it settles.
    await js('document.fonts.ready.then(() => true)'); await sleep(1600);
    await cdp('Page.bringToFront');
    const screenshot = join(tmpdir(), `easter-${mode}-hero.png`);
    await writeFile(screenshot, Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    check('hero screenshot', true, screenshot);
    const initial = await letters();
    check('seven letters, no horizontal overflow', initial.length === 7 && await js('document.documentElement.scrollWidth <= innerWidth'), initial);
    const hitPoints = await js(`Array.from(document.querySelectorAll('.name-letter'),(e,i)=>{const r=e.getBoundingClientRect();for(let fy=.2;fy<=.8;fy+=.2)for(let fx=.2;fx<=.8;fx+=.2){const x=r.x+r.width*fx,y=r.y+r.height*fy;if(document.elementFromPoint(x,y)?.closest('.name-letter')===e)return {i,x,y}}return null})`);
    check('all seven letters have exposed clickable area', hitPoints.every(Boolean), hitPoints);
    const chosen = hitPoints.find(Boolean);
    if (chosen) {
      await click(chosen.x, chosen.y); await sleep(350);
      const after = await letters();
      const changed = after.map((l, i) => l.font !== initial[i].font ? i : -1).filter(i => i >= 0);
      const geometryDelta = Math.max(...after.flatMap((l, i) => ['x','y','width','height'].map(k => Math.abs(l[k]-initial[i][k]))));
      check('one letter changes only its font; stable geometry', changed.length === 1 && changed[0] === chosen.i && after[chosen.i].family !== initial[chosen.i].family && geometryDelta < .1, { changed, geometryDelta, before: initial[chosen.i], after: after[chosen.i] });
    }
    const layering = await js(`(() => {const a=document.querySelector('.hero-art'),n=document.querySelector('.hero-name'),s=a.querySelector('svg').getBoundingClientRect();let clear=null,overlap=null;for(const e of document.querySelectorAll('.name-letter')){const r=e.getBoundingClientRect();for(let x=Math.max(r.left,s.left)+2;x<Math.min(r.right,s.right);x+=5)for(let y=Math.max(r.top,s.top)+2;y<Math.min(r.bottom,s.bottom);y+=5){const hit=document.elementFromPoint(x,y);if(hit?.closest('.name-letter')===e)clear??={x,y,letter:e.dataset.letter,tag:hit.tagName};if(hit?.closest('.play-square'))overlap??={x,y,letter:e.dataset.letter,tag:hit.tagName}}}return {artZ:getComputedStyle(a).zIndex,nameZ:getComputedStyle(n).zIndex,artPointer:getComputedStyle(a).pointerEvents,clear,overlap}})()`);
    check('empty SVG passes name hit tests; blocks above name', Number(layering.artZ) > Number(layering.nameZ) && layering.clear && layering.artPointer === 'none', layering);
    if (layering.clear) {
      const oldFonts = await letters();
      await click(layering.clear.x, layering.clear.y);
      const newFonts = await letters();
      check('trusted click through empty SVG changes letter', newFonts.some((l, i) => l.font !== oldFonts[i].font), layering.clear);
    }
    // Drag a real block to an exposed name point. Hit-test while pointer is held.
    const blockStart = await js(`(() => {const es=[...document.querySelectorAll('.play-square')];for(let i=es.length-1;i>=0;i--){const r=es[i].getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;if(document.elementFromPoint(x,y)?.closest('.play-square')===es[i])return {i,x,y}}})()`);
    const dragTarget = hitPoints.filter(Boolean).at(-1);
    if (blockStart && dragTarget) {
      await mouse('mouseMoved', blockStart.x, blockStart.y);
      await mouse('mousePressed', blockStart.x, blockStart.y, { button: 'left', buttons: 1, clickCount: 1 });
      for (let n = 1; n <= 8; n++) await mouse('mouseMoved', blockStart.x + (dragTarget.x-blockStart.x)*n/8, blockStart.y + (dragTarget.y-blockStart.y)*n/8, { button: 'left', buttons: 1 });
      const hit = await js(`(() => {const e=document.elementFromPoint(${dragTarget.x},${dragTarget.y});const b=e?.closest('.play-square');return {tag:e?.tagName,blockIndex:[...document.querySelectorAll('.play-square')].indexOf(b),dragging:b?.classList.contains('is-dragging'),transform:b?.getAttribute('transform')}})()`);
      check('dragged block wins name hit test', hit.blockIndex === blockStart.i && hit.dragging, { blockStart, dragTarget, hit });
      await mouse('mouseReleased', dragTarget.x, dragTarget.y, { button: 'left', buttons: 0, clickCount: 1 });
      await sleep(1000);
    } else check('dragged block wins name hit test', false, { blockStart, dragTarget });
    await js('document.activeElement?.blur()');
    await key('ArrowRight'); await key('ArrowLeft');
    check('turtle and footer location removed', await js(`!document.querySelector('.header-turtle') && !document.querySelector('.footer-bottom') && !document.querySelector('footer').textContent.includes('Sydney, Australia')`));
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await sleep(500);
    const rainbowStart = await js(`(() => {const e=document.querySelector('.rainbow-bar');const s=getComputedStyle(e);return {active:e.classList.contains('is-active'),direction:e.dataset.direction,opacity:s.opacity,position:s.backgroundPosition}})()`);
    await sleep(200);
    const rainbowPosition = await js(`getComputedStyle(document.querySelector('.rainbow-bar')).backgroundPosition`);
    check('held arrow animates rainbow in header', rainbowStart.active && rainbowStart.direction === 'right' && Number(rainbowStart.opacity) > 0 && rainbowStart.position !== rainbowPosition, {rainbowStart,rainbowPosition});
    // Inspect native CSS animation objects and the pseudo-element's own paint,
    // rather than mistaking its parent's movement for an independent aurora.
    const auroraStart = await js(`(() => {const e=document.querySelector('.rainbow-bar');const animations=e.getAnimations({subtree:true});window.__rainbowSweep=animations.find(a=>a.animationName==='rainbow-sweep');window.__auroraDrift=animations.find(a=>a.animationName==='aurora-drift');const sweep=window.__rainbowSweep,drift=window.__auroraDrift;return {duration:sweep?.effect.getTiming().duration,sweepTime:sweep?.currentTime,driftTime:drift?.currentTime,driftDuration:drift?.effect.getTiming().duration,independent:!!drift&&drift!==sweep,position:getComputedStyle(e,'::before').backgroundPosition,playState:getComputedStyle(e,'::before').animationPlayState}})()`);
    await sleep(200);
    const auroraEnd = await js(`({sweepTime:window.__rainbowSweep?.currentTime,driftTime:window.__auroraDrift?.currentTime,position:getComputedStyle(document.querySelector('.rainbow-bar'),'::before').backgroundPosition})`);
    check('held rainbow sweep lasts 1200ms per cycle', auroraStart.duration === 1200 && auroraEnd.sweepTime > auroraStart.sweepTime, {auroraStart,auroraEnd});
    check('pseudo aurora animates independently of rainbow sweep', auroraStart.independent && auroraStart.driftDuration !== auroraStart.duration && auroraStart.playState === 'running' && auroraEnd.driftTime > auroraStart.driftTime && auroraEnd.position !== auroraStart.position, {auroraStart,auroraEnd});
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await sleep(500);
    check('rainbow fades out on release', await js(`!document.querySelector('.rainbow-bar').classList.contains('is-active') && getComputedStyle(document.querySelector('.rainbow-bar')).opacity === '0'`));
    await js(`document.querySelector('.play-square').focus({preventScroll:true})`);
    await key('ArrowRight');
    await key('Escape');
    const topRect = await rect('.top-toy');
    await click(topRect.cx, topRect.cy); const first = await topState();
    await click(topRect.cx, topRect.cy); await sleep(650); const second = await topState();
    check('docked spinner deploys on second click', first === 'wobbling' && second === 'deployed', { first, second });
    const audio = await js(`({contexts:window.__audioContexts.map(c=>({state:c.state,sampleRate:c.sampleRate})),starts:window.__audioStarts,userActive:navigator.userActivation.hasBeenActive})`);
    check('native AudioContext runs from trusted clicks', audio.contexts.some(c => c.state === 'running') && audio.starts >= 2 && audio.userActive, audio);
    const floatingRect = await rect('.deployed-top');
    await click(floatingRect.cx, floatingRect.cy);
    check('floating spinner clicks are silent', await js('window.__audioStarts') === audio.starts);
    await key('Escape'); await js('document.activeElement?.blur();scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})'); await sleep(250);
    // Positioning the test page is itself a large scroll; reset that setup effort.
    await key('Escape');
    const before = await collapse(); const bursts = [];
    for (let i = 0; i < 3; i++) { await wheel(360, width, height); bursts.push(await collapse()); }
    await sleep(1150); const settled = await collapse();
    check('three strong bottom wheel bursts activate only on third', !bursts[0].active && !bursts[1].active && bursts[2].active, { before, bursts, settled });
    check('collapse preserves document scrollHeight', [ ...bursts, settled ].every(s => s.height === before.height), { before: before.height, heights: bursts.map(s => s.height), settled: settled.height });
    // Keep native Animation references in the page: counts alone cannot prove
    // that a fresh effort replaces the previous fall rather than ignoring it.
    await js(`window.__fallAnimations=()=>document.getAnimations().filter(a=>a.effect?.getKeyframes().some(f=>f.translate));window.__previousFall=window.__fallAnimations()`);
    await wheel(360, width, height);
    const replay = await js(`(() => {const old=window.__previousFall,next=window.__fallAnimations();return {active:document.querySelector('#top').classList.contains('page-collapse-active'),height:document.documentElement.scrollHeight,oldCount:old.length,newCount:next.length,oldCancelled:old.every(a=>a.playState==='idle'),allReplaced:next.every(a=>!old.includes(a)),sameTargets:old.every(a=>next.some(b=>b.effect.target===a.effect.target)),uniqueTargets:new Set(next.map(a=>a.effect.target)).size,total:document.getAnimations().length}})()`);
    await sleep(1150);
    const replaySettled = await collapse();
    check('fresh downward effort replays collapsed pieces without stacking or changing height', replay.active && replay.oldCount > 0 && replay.newCount === replay.oldCount && replay.oldCancelled && replay.allReplaced && replay.sameTargets && replay.uniqueTargets === replay.newCount && replay.total === settled.animations && replay.height === before.height && replaySettled.height === before.height && replaySettled.animations === settled.animations, {replay,replaySettled});
    await wheel(-120, width, height); const reset = await collapse();
    check('upward wheel resets collapse', !reset.active && reset.height === before.height && reset.animations === before.animations, reset);
    // Small deltas like a trackpad, not just synthetic single 360px events.
    await js('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"});document.activeElement?.blur()'); await sleep(1200);
    await key('Escape');
    const smallBefore = await collapse();
    const tileTop = await js(`document.querySelector('.landing-tile').getBoundingClientRect().top`);
    const smallBursts = [];
    for (let effort = 0; effort < 3; effort++) {
      for (let sample = 0; sample < 8; sample++) {
        await mouse('mouseWheel', width / 2, height - 40, { deltaY: 22, deltaX: 0 });
        await sleep(16);
      }
      smallBursts.push(await collapse());
      await sleep(350);
    }
    await sleep(1200);
    const fallen = await js(`({top:document.querySelector('.landing-tile').getBoundingClientRect().top,translate:getComputedStyle(document.querySelector('.landing-tile')).translate})`);
    check('small-delta efforts trigger collapse with a visible fall', !smallBursts[0].active && !smallBursts[1].active && smallBursts[2].active && fallen.top - tileTop > 100, { smallBursts, fallPixels: fallen.top - tileTop, translate: fallen.translate });
    check('small-delta collapse preserves page height', (await collapse()).height === smallBefore.height);
    await wheel(-120, width, height);
    check('small-delta collapse rebuilds on upward scroll', !(await collapse()).active);
    // One cumulative fast fling, not three separate efforts or a single huge
    // event. The bottom keeps native wheel input from adding scroll movement.
    await js('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"});document.activeElement?.blur()'); await sleep(300);
    await key('Escape');
    const flingBefore = await collapse();
    await js(`window.__flingTrace=[];window.__recordFling=e=>window.__flingTrace.push({time:performance.now(),delta:e.deltaY,y:scrollY,trusted:e.isTrusted});window.addEventListener('wheel',window.__recordFling,{passive:true})`);
    const flingSamples = [];
    for (let sample = 0; sample < 3; sample++) {
      await mouse('mouseWheel', width / 2, height - 40, { deltaY: 220, deltaX: 0 });
      // CDP can acknowledge dispatch before the DOM receives the wheel event.
      for (let attempt = 0; attempt < 40; attempt++) {
        if (await js('window.__flingTrace.length') >= sample + 1) break;
        await sleep(5);
      }
      flingSamples.push(await collapse());
    }
    await sleep(100);
    const flingTrace = await js(`window.removeEventListener('wheel',window.__recordFling);window.__flingTrace`);
    const flingAfter = await collapse();
    const flingDistance = flingTrace.reduce((sum, e) => sum + e.delta, 0);
    const flingDuration = flingTrace.at(-1)?.time - flingTrace[0]?.time;
    check('one cumulative 600px+ fast fling collapses rebuilt page at bottom', !flingBefore.active && !flingSamples[0].active && !flingSamples[1].active && flingSamples[2].active && flingAfter.active && flingTrace.length === 3 && flingTrace.every(e => e.trusted && e.delta < 600 && e.y === flingBefore.y) && flingDistance >= 600 && flingDuration <= 180 && flingAfter.height === flingBefore.height, {flingBefore,flingSamples,flingAfter,flingTrace,flingDistance,flingDuration});
    await wheel(-120, width, height);
    check('single-fling collapse rebuilds on upward scroll', !(await collapse()).active);
    await js('scrollTo({top:0,behavior:"instant"});document.activeElement?.blur()'); await sleep(300);
    const postPoints = await js(`Array.from(document.querySelectorAll('.name-letter'),(e,i)=>{const r=e.getBoundingClientRect();const x=r.x+r.width*.3,y=r.y+r.height*.5;return document.elementFromPoint(x,y)?.closest('.name-letter')===e?{i,x,y}:null}).filter(Boolean)`);
    const postBefore = await letters(); const point = postPoints[0];
    if (point) await click(point.x, point.y);
    const postAfter = await letters();
    check('letters usable after collapse reset', point && postBefore[point.i].font !== postAfter[point.i].font, { index: point?.i });
    await js('document.activeElement?.blur()');
    const postTop = await rect('.top-toy'); await click(postTop.cx, postTop.cy); await click(postTop.cx, postTop.cy); await sleep(650);
    check('spinner usable after collapse reset', await topState() === 'deployed', await topState());
    await key('Escape');
    await js('document.activeElement?.blur();scrollTo({top:1000,behavior:"instant"})'); await sleep(250); await key('Escape');
    // Record actual scroll events, not just input deltas, to exercise the live path.
    await js(`window.__scrollTrace=[];window.__recordScroll=()=>window.__scrollTrace.push({time:performance.now(),y:scrollY,active:document.querySelector('#top').classList.contains('page-collapse-active')});window.addEventListener('scroll',window.__recordScroll)`);
    const movingBursts=[];
    for(let effort=0;effort<3;effort++) {
      for(let sample=0;sample<8;sample++) {await mouse('mouseWheel',width/2,height/2,{deltaY:22,deltaX:0});await sleep(16);}
      await sleep(350); movingBursts.push(await collapse());
    }
    const scrollTrace=await js(`window.removeEventListener('scroll',window.__recordScroll);window.__scrollTrace`);
    check('real mid-page movement triggers on third effort', !movingBursts[0].active && !movingBursts[1].active && movingBursts[2].active && scrollTrace.length>8, {movingBursts,scrollTrace});
    await wheel(-120,width,height);
    check('mid-page collapse rebuilds', !(await collapse()).active);
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await js('document.activeElement?.blur();scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})'); await sleep(200);
    for (let i = 0; i < 3; i++) await wheel(360, width, height);
    const reduced = await collapse();
    check('scroll collapse works with reduced motion enabled', reduced.active && await js('matchMedia("(prefers-reduced-motion: reduce)").matches'), reduced);
    await key('Escape');
    for (const type of ['keyDown','keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: String.fromCharCode(92), code: 'Backslash', windowsVirtualKeyCode: 220 });
    await sleep(1200);
    check('backslash directly collapses with reduced motion enabled', (await collapse()).active && await js(`document.getAnimations().some(a=>a.effect?.getKeyframes().some(f=>f.translate) && parseFloat(getComputedStyle(a.effect.target).translate.split(' ')[1])>100)`));
    await key('Escape');
    await cdp('Input.dispatchKeyEvent', {type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
    await sleep(500);
    const reduceRainbow=await js(`({active:document.querySelector('.rainbow-bar').classList.contains('is-active'),position:getComputedStyle(document.querySelector('.rainbow-bar')).backgroundPosition,opacity:getComputedStyle(document.querySelector('.rainbow-bar')).opacity})`);
    await sleep(300);
    check('rainbow animates with reduced motion enabled', reduceRainbow.active && Number(reduceRainbow.opacity)>0 && reduceRainbow.position!==await js(`getComputedStyle(document.querySelector('.rainbow-bar')).backgroundPosition`));
    await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
    await cdp('Browser.grantPermissions',{origin:new URL(site).origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
    await js(`document.querySelector('.contact-email').scrollIntoView({block:'center',behavior:'instant'})`); await sleep(300);
    const emailRect=await rect('.contact-email'); await click(emailRect.cx,emailRect.cy); await sleep(150);
    check('email copies exact address and confirms without navigation', await js(`navigator.clipboard.readText()`) === 'tim200465@gmail.com' && await js(`document.querySelector('.contact-email [role="status"]').textContent === 'Copied!' && document.querySelector('.contact-email').tagName === 'BUTTON' && !document.querySelector('.contact-email').hasAttribute('href')`));
    const emailSuccess = await js(`(() => {const e=document.querySelector('.contact-email'),action=e.querySelector('.contact-email-action');return {actionText:action?.textContent.trim(),svgCount:e.querySelectorAll('svg').length,copiedCount:action?.querySelectorAll('.contact-email-copied').length}})()`);
    check('email success action shows only Copied! with no SVG', emailSuccess.actionText === 'Copied!' && emailSuccess.svgCount === 0 && emailSuccess.copiedCount === 1, emailSuccess);
    check('no browser console/runtime errors', errors.length === 0, errors);
  }
} catch (error) { check('test runner', false, error.stack); }
finally {
  const output = join(tmpdir(), 'easter-browser-report.json');
  await writeFile(output, JSON.stringify({ browser: await (await fetch(`http://localhost:${port}/json/version`)).json(), checks }, null, 2));
  console.log(`Report: ${output}`);
  ws.close();
}
process.exitCode = checks.some(c => !c.pass) ? 1 : 0;
