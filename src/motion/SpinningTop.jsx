import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { advanceDock, advanceFlight, createDockState, createFlight, nudgeFlight, pokeDock } from './topPhysics';

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
    const x = Math.cos(theta + state.angle) * radius;
    const z = Math.sin(theta + state.angle) * radius;
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
  const controls = useRef({});
  const [scene, setScene] = useState(null);

  useEffect(() => {
    const hero = document.querySelector('.hero-stage');
    if (!hero) return;
    setScene(hero);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dock = createDockState();
    let flight = null;
    let phase = 'idle';
    let frame = 0;
    let previousTime = null;
    let phaseTime = 0;

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
        floating.style.transform = `translate3d(${flight.x - 43}px, ${flight.y - 60}px, 0)`;
        floating.dataset.x = flight.x.toFixed(2);
        floating.dataset.y = flight.y.toFixed(2);
        paint(flightCanvasRef.current, flight, false);
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
        dock.tilt = dock.side * Math.min(1.25, phaseTime * 4);
        if (phaseTime > 0.32) launch();
      } else if (phase === 'deployed') {
        const bounds = hero.getBoundingClientRect();
        if (bounds.bottom <= 80 || bounds.top >= window.innerHeight) { reset(); return; }
        moving = advanceFlight(flight, dt, bounds);
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
      nudge() {
        if (!flight || phase !== 'deployed') return;
        nudgeFlight(flight);
        wake();
      },
      reset,
    };
    // Scroll never energizes the toy. Leaving the hero simply puts it away.
    const scroll = () => {
      if (phase !== 'deployed') return;
      const bounds = hero.getBoundingClientRect();
      if (bounds.bottom <= 80 || bounds.top >= window.innerHeight) reset();
    };
    const cancelReturn = () => { if (phase === 'returning') reset(); };
    const resize = () => {
      scroll();
      if (phase === 'deployed') advanceFlight(flight, 1 / 60, hero.getBoundingClientRect());
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
    window.addEventListener('resize', resize);
    window.addEventListener('wheel', cancelReturn, { passive: true });
    window.addEventListener('touchstart', cancelReturn, { passive: true });
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    render();
    return () => {
      controls.current = {};
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wheel', cancelReturn);
      window.removeEventListener('touchstart', cancelReturn);
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  return <>
    <button ref={buttonRef} className="top-toy" type="button" onClick={() => controls.current.poke?.()} aria-label="Wobble the top. Repeated presses release it into the hero.">
      <canvas ref={canvasRef} width="112" height="72" aria-hidden="true" />
    </button>
    {scene && createPortal(
      <button ref={floatingRef} className="deployed-top" type="button" hidden onClick={() => controls.current.nudge?.()} aria-label="Nudge the top. Escape returns it to its stand.">
        <canvas ref={flightCanvasRef} width="112" height="72" aria-hidden="true" />
      </button>, scene,
    )}
  </>;
}
