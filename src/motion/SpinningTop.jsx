import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RESTING_TILT, advanceDock, advanceFlight, createDockState, createFlight, nudgeFlight, pokeDock, swipeFlight } from './topPhysics';
import { onBlockMotion, sampleBlocks } from './blockWorld';
import { paintAura } from './topAura';
import { createWoodClick } from './woodClick';

const rings = [[0, 0], [4, -7], [21, -19], [24, -23], [15, -29], [4, -30], [3, -40]];
const colors = ['#315cd5', '#315cd5', '#e77743', '#dfc14e', '#e9ebe0', '#64704e', '#315cd5', '#e9ebe0'];

function paint(canvas, state, docked = true) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(112 * ratio);
  const height = Math.round(72 * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, 112, 72);
  const project = (radius, y, theta) => {
    const x = Math.cos(theta + state.angle + (state.spinOffset || 0)) * radius;
    const z = Math.sin(theta + state.angle + (state.spinOffset || 0)) * radius;
    const tiltedX = x * Math.cos(state.tilt) - y * Math.sin(state.tilt);
    const tiltedY = x * Math.sin(state.tilt) + y * Math.cos(state.tilt);
    return { x: tiltedX, y: tiltedY * 0.92 - z * 0.38, z: z * 0.92 + tiltedY * 0.38 };
  };
  const faces = [];
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let side = 0; side < 16; side++) {
      const points = [
        project(...rings[ring], side * Math.PI / 8),
        project(...rings[ring + 1], side * Math.PI / 8),
        project(...rings[ring + 1], (side + 1) * Math.PI / 8),
        project(...rings[ring], (side + 1) * Math.PI / 8),
      ];
      faces.push({ points, depth: points.reduce((sum, point) => sum + point.z, 0) / 4, color: ring >= 5 ? '#282a24' : colors[Math.floor(side / 2)] });
    }
  }
  // Keep every orientation in contact with the ground, including its side.
  const floor = 58 - Math.max(...faces.flatMap(face => face.points.map(point => point.y)));
  context.fillStyle = '#282a2416';
  context.beginPath();
  context.ellipse(43 + Math.sin(state.tilt) * 16, 60, 24, 3, 0, 0, Math.PI * 2);
  context.fill();
  if (docked) {
    context.strokeStyle = '#d4d5c8';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(12, 63);
    context.lineTo(100, 63);
    context.stroke();
  }
  faces.sort((a, b) => a.depth - b.depth).forEach(face => {
    context.beginPath();
    face.points.forEach((point, index) => {
      if (index === 0) context.moveTo(43 + point.x, floor + point.y);
      else context.lineTo(43 + point.x, floor + point.y);
    });
    context.closePath();
    context.fillStyle = face.color;
    context.fill();
    context.strokeStyle = face.color;
    context.lineWidth = 0.4;
    context.stroke();
  });
}

export default function SpinningTop() {
  const canvasRef = useRef(null);
  const buttonRef = useRef(null);
  const floatingRef = useRef(null);
  const flightCanvasRef = useRef(null);
  const auraRef = useRef(null);
  const controls = useRef({});
  const [scene, setScene] = useState(null);

  useEffect(() => {
    const hero = document.querySelector('.hero-stage');
    if (!hero) return;
    setScene(document.body);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const woodClick = createWoodClick();
    let dock = createDockState();
    let flight = null;
    let phase = 'idle';
    let frame = 0;
    let previousTime = null;
    let phaseTime = 0;
    let ticking = false;
    let pointer = null;
    let lastSwipe = -Infinity;

    const render = () => {
      const button = buttonRef.current;
      button.dataset.state = phase;
      button.dataset.angle = (flight?.angle ?? dock.angle).toFixed(3);
      button.dataset.tilt = dock.tilt.toFixed(3);
      button.disabled = phase === 'deployed';
      paint(canvasRef.current, dock);
      const floating = floatingRef.current;
      if (!floating) return;
      floating.hidden = phase !== 'deployed';
      if (flight && phase === 'deployed') {
        const bounds = hero.getBoundingClientRect();
        floating.style.transform = `translate3d(${bounds.left + flight.x - 43}px, ${bounds.top + flight.y - 60}px, 0)`;
        floating.dataset.x = flight.x.toFixed(2);
        floating.dataset.y = flight.y.toFixed(2);
        floating.dataset.swipeSpin = (flight.swipeSpin || 0).toFixed(3);
        paint(flightCanvasRef.current, flight, false);
        paintAura(auraRef.current, flight, bounds);
      }
    };
    const reset = () => {
      const restoreFocus = document.activeElement === floatingRef.current;
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      phase = 'idle';
      phaseTime = 0;
      flight = null;
      pointer = null;
      dock = createDockState();
      render();
      if (restoreFocus) buttonRef.current.focus({ preventScroll: true });
    };
    const launch = () => {
      const bounds = hero.getBoundingClientRect();
      const origin = buttonRef.current.getBoundingClientRect();
      if (bounds.width < 100 || bounds.height < 100) { reset(); return; }
      const moveFocus = document.activeElement === buttonRef.current;
      flight = createFlight(bounds, { x: origin.left + 43 - bounds.left, y: origin.top + 58 - bounds.top }, dock.side);
      phase = 'deployed';
      render();
      if (moveFocus) floatingRef.current?.focus({ preventScroll: true });
    };
    const tick = time => {
      frame = 0;
      const dt = Math.min(0.04, previousTime === null ? 1 / 60 : (time - previousTime) / 1000);
      previousTime = time;
      let moving = true;
      if (phase === 'returning') {
        phaseTime += dt;
        advanceDock(dock, dt);
        if (window.scrollY <= 2) { phase = 'launching'; phaseTime = 0; }
        else if (phaseTime > 4) { reset(); return; }
      } else if (phase === 'launching') {
        phaseTime += dt;
        dock.tilt = dock.side * Math.min(RESTING_TILT, phaseTime * 4);
        if (phaseTime > 0.32) launch();
      } else if (phase === 'deployed') {
        const bounds = hero.getBoundingClientRect();
        if (bounds.bottom <= 80 || bounds.top >= window.innerHeight) { reset(); return; }
        ticking = true;
        try {
          moving = advanceFlight(flight, dt, { width: bounds.width, height: bounds.height, ceiling: 54 - bounds.top }, sampleBlocks(bounds));
        } finally { ticking = false; }
      } else if (phase === 'wobbling') {
        moving = advanceDock(dock, dt);
        if (!moving) phase = 'idle';
      } else moving = false;
      render();
      if (moving && !document.hidden) frame = window.requestAnimationFrame(tick);
      else previousTime = null;
    };
    const wake = () => {
      if (!frame && !document.hidden) frame = window.requestAnimationFrame(tick);
    };
    controls.current = {
      click: () => { if (phase !== 'deployed') woodClick.play(); },
      poke() {
        if (phase === 'deployed' || phase === 'returning' || phase === 'launching') return;
        if (pokeDock(dock)) {
          phaseTime = 0;
          if (window.scrollY > 2) {
            phase = 'returning';
            window.scrollTo({ top: 0, behavior: preference.matches ? 'instant' : 'smooth' });
          } else phase = 'launching';
        } else phase = 'wobbling';
        render();
        wake();
      },
      nudge(event, keyboardHit) {
        if (!flight || phase !== 'deployed') return;
        const bounds = hero.getBoundingClientRect();
        const hit = keyboardHit ?? (event?.type === 'pointerdown' ? {
          x: event.clientX - (bounds.left + flight.x + Math.sin(flight.tilt) * 14),
          y: event.clientY - (bounds.top + flight.y - 22),
        } : { x: 0, y: 0 });
        nudgeFlight(flight, hit);
        wake();
      },
      reset,
    };
    // Scroll never energizes the toy. Leaving the hero simply puts it away.
    const scroll = () => {
      if (phase !== 'deployed') return;
      const bounds = hero.getBoundingClientRect();
      if (bounds.bottom <= 80 || bounds.top >= window.innerHeight) reset();
      else render();
    };
    const cancelReturn = () => { if (phase === 'returning') reset(); };
    const swipe = event => {
      const now = window.performance.now();
      const previous = pointer;
      pointer = { x: event.clientX, y: event.clientY, time: now };
      if (event.pointerType !== 'mouse' || event.buttons || !previous || !flight || phase !== 'deployed' || document.hidden) return;
      const elapsed = now - previous.time;
      const dx = pointer.x - previous.x;
      const dy = pointer.y - previous.y;
      const distance = Math.hypot(dx, dy);
      if (elapsed > 120 || distance < 3 || now - lastSwipe < 150) return;
      const bounds = hero.getBoundingClientRect();
      const x = bounds.left + flight.x + Math.sin(flight.tilt) * 14;
      const y = bounds.top + flight.y - 22;
      // Check the swept segment so quick passes still hit the small toy.
      const t = Math.max(0, Math.min(1, ((x - previous.x) * dx + (y - previous.y) * dy) / (distance * distance)));
      if (Math.hypot(previous.x + dx * t - x, previous.y + dy * t - y) > 26) return;
      lastSwipe = now;
      swipeFlight(flight, distance / Math.max(8, elapsed) * 1000);
      render();
      wake();
    };
    const resize = () => {
      scroll();
      if (phase === 'deployed') {
        const bounds = hero.getBoundingClientRect();
        advanceFlight(flight, 1 / 60, { width: bounds.width, height: bounds.height, ceiling: 54 - bounds.top }, sampleBlocks(bounds));
      }
      render();
    };
    const key = event => {
      if (event.key === 'Escape') reset();
      else if (phase === 'returning' && ['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'End', 'Home', ' '].includes(event.key)) reset();
    };
    const visibility = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      if (!document.hidden && phase !== 'idle') wake();
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('pointermove', swipe, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('wheel', cancelReturn, { passive: true });
    window.addEventListener('touchstart', cancelReturn, { passive: true });
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    const unsubscribe = onBlockMotion(() => { if (phase === 'deployed' && !ticking) wake(); });
    render();
    return () => {
      controls.current = {};
      woodClick.dispose();
      unsubscribe();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('pointermove', swipe);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wheel', cancelReturn);
      window.removeEventListener('touchstart', cancelReturn);
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  return <>
    <button ref={buttonRef} className="top-toy" type="button"
      onClick={() => { controls.current.click?.(); controls.current.poke?.(); }}
      onKeyDown={event => { if (event.repeat && [' ', 'Enter'].includes(event.key)) event.preventDefault(); }}
      aria-label="Wobble the top. Repeated presses release it into the hero.">
      <canvas ref={canvasRef} width="112" height="72" aria-hidden="true" />
    </button>
    {scene && createPortal(
      <button ref={floatingRef} className="deployed-top" type="button" hidden
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          controls.current.nudge?.(event);
        }}
        // Sound only exists on the docked top. Deployed interactions steer or
        // push silently; native Space/Enter activation still supplies the nudge.
        onClick={event => {
          if (event.detail === 0) controls.current.nudge?.();
        }}
        onKeyDown={event => {
          if (event.repeat && [' ', 'Enter'].includes(event.key)) event.preventDefault();
          const hits = { ArrowLeft: { x: 24, y: 0 }, ArrowRight: { x: -24, y: 0 }, ArrowUp: { x: 0, y: 24 }, ArrowDown: { x: 0, y: -24 } };
          if (hits[event.key]) { event.preventDefault(); controls.current.nudge?.(null, hits[event.key]); }
        }}
        aria-label="Push the top away from where you tap. Arrow keys steer; Space jumps; Escape returns it to its stand.">
        <canvas ref={auraRef} className="top-aura" width="240" height="240" aria-hidden="true" />
        <canvas ref={flightCanvasRef} width="112" height="72" aria-hidden="true" />
      </button>, scene,
    )}
  </>;
}
