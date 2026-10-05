import { useEffect, useMemo, useRef, useState } from 'react';
import Matter from 'matter-js';
import { profile, physicsHero } from '../data/content';

/**
 * Interactive hero. The name and the tech pills are real rigid bodies in a
 * Matter.js world: they drop in, pile up, and can be grabbed and thrown.
 *
 * Physics runs in Matter; rendering is plain DOM elements moved by transform
 * each frame, so the pills keep real fonts and palette colours instead of
 * being drawn into a canvas.
 *
 * Two traps are worth knowing about before changing anything here. Matter's
 * Runner.run starts a brand new frame loop on every call and Runner.stop can
 * only cancel the most recent one, so waking an already running runner would
 * leave an orphan loop ticking after unmount; every start and stop therefore
 * goes through the guarded pair inside the effect. And Matter's Mouse binds
 * its own DOM listeners, so the ones kept for dragging have to be removed by
 * hand, the same way the scroll-eating ones are dropped below.
 */

const WALL = 200;
const SETTLE_MS = 14000;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function StaticFallback() {
  return (
    <div className="physics-fallback">
      <p className="eyebrow">{profile.roles.join(' · ')}</p>
      <h1>{profile.name}</h1>
      <p className="hero-tagline">{profile.tagline}</p>
      <ul className="physics-fallback-tags">
        {physicsHero.tokens.map((t) => (
          <li key={t.label} className={t.weight === 'heavy' ? 'pill' : 'pill pill-ghost'}>
            {t.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PhysicsHero() {
  const sceneRef = useRef(null);
  const nodesRef = useRef([]);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const startRef = useRef(null);
  const rafRef = useRef(0);
  const wallsRef = useRef([]);
  const bodiesRef = useRef([]);

  const [reduced] = useState(prefersReducedMotion);
  const [ready, setReady] = useState(false);
  const [nudged, setNudged] = useState(false);

  // Fewer bodies on small screens: the pile gets unreadable otherwise.
  const tokens = useMemo(() => {
    if (typeof window === 'undefined') return physicsHero.tokens;
    const narrow = window.innerWidth < 700;
    return narrow ? physicsHero.tokens.filter((t) => t.weight === 'heavy') : physicsHero.tokens;
  }, []);

  useEffect(() => {
    if (reduced) return undefined;

    const scene = sceneRef.current;
    if (!scene) return undefined;

    const { Engine, Runner, Composite, Bodies, Body, Mouse, MouseConstraint, Events } = Matter;

    const measure = () => ({
      w: scene.clientWidth,
      h: scene.clientHeight,
    });

    // Measure before anything is allocated: a scene with no box (a hidden
    // ancestor, or jsdom) has nothing to simulate and nothing to clean up.
    let { w, h } = measure();
    if (w === 0 || h === 0) return undefined;

    const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0011 } });
    engineRef.current = engine;

    const buildWalls = (width, height) => {
      wallsRef.current.forEach((wall) => Composite.remove(engine.world, wall));
      const opts = { isStatic: true, restitution: 0.4, friction: 0.4 };
      const walls = [
        Bodies.rectangle(width / 2, height + WALL / 2, width * 3, WALL, opts),
        Bodies.rectangle(-WALL / 2, height / 2, WALL, height * 3, opts),
        Bodies.rectangle(width + WALL / 2, height / 2, WALL, height * 3, opts),
        Bodies.rectangle(width / 2, -height - WALL, width * 3, WALL, opts),
      ];
      wallsRef.current = walls;
      Composite.add(engine.world, walls);
    };

    buildWalls(w, h);

    // Each DOM node becomes a body sized from its measured rect.
    const bodies = nodesRef.current.map((node, i) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const bw = rect.width || 90;
      const bh = rect.height || 34;
      const spread = 0.14 + (i / Math.max(1, nodesRef.current.length - 1)) * 0.72;
      // Drop them in from just above the top edge, staggered so the pile does
      // not arrive as one clump. They used to be seeded hundreds of pixels
      // higher, where the ceiling wall caught them and most of the pile formed
      // outside the visible hero.
      const body = Bodies.rectangle(
        w * spread + (Math.random() - 0.5) * 40,
        -bh * (1.2 + (i % 4) * 0.35) - i * 4,
        bw,
        bh,
        {
          chamfer: { radius: Math.min(bh / 2, 18) },
          restitution: 0.52,
          friction: 0.28,
          frictionAir: 0.012,
          density: node.dataset.weight === 'heavy' ? 0.0022 : 0.0012,
        },
      );
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.14);
      return body;
    });

    const live = bodies.filter(Boolean);
    bodiesRef.current = live;
    Composite.add(engine.world, live);

    const mouse = Mouse.create(scene);

    // Matter binds wheel and touch handlers that call preventDefault, which
    // would trap the page scroll inside the hero. Drop them: wheel scrolling
    // and touch scrolling both matter more than dragging on a phone. Mouse
    // users keep the full drag-and-throw interaction.
    mouse.element.removeEventListener('wheel', mouse.mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);
    mouse.element.removeEventListener('touchmove', mouse.mousemove);
    mouse.element.removeEventListener('touchstart', mouse.mousedown);
    mouse.element.removeEventListener('touchend', mouse.mouseup);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.16, damping: 0.08, render: { visible: false } },
    });
    Composite.add(engine.world, mouseConstraint);

    Events.on(mouseConstraint, 'startdrag', () => {
      setNudged(true);
      scene.classList.add('is-grabbing');
    });
    Events.on(mouseConstraint, 'enddrag', () => scene.classList.remove('is-grabbing'));

    const runner = Runner.create();
    runnerRef.current = runner;

    // True while a Matter frame loop is in flight. Matter keeps no such flag of
    // its own, and one loop per wake is the only way Runner.stop can be
    // trusted to actually stop.
    let running = false;

    // Sync DOM to physics. One frame is ever in flight, and none is asked for
    // while the pile is asleep or the tab is hidden.
    const draw = () => {
      rafRef.current = 0;
      if (!running) return;
      for (let i = 0; i < live.length; i += 1) {
        const body = live[i];
        const node = nodesRef.current[bodies.indexOf(body)];
        if (!node) continue;
        node.style.transform =
          `translate3d(${body.position.x}px, ${body.position.y}px, 0) ` +
          `translate(-50%, -50%) rotate(${body.angle}rad)`;
      }
      rafRef.current = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = true;
      Runner.run(runner, engine);
      if (!rafRef.current) rafRef.current = window.requestAnimationFrame(draw);
    };
    const pause = () => {
      if (!running) return;
      running = false;
      Runner.stop(runner);
    };
    startRef.current = start;
    setReady(true);
    start();

    const onResize = () => {
      const next = measure();
      if (next.w === 0 || next.h === 0) return;
      w = next.w;
      h = next.h;
      buildWalls(w, h);
    };
    window.addEventListener('resize', onResize);

    // Stop simulating once things have settled, and while the tab is hidden.
    const settleTimer = window.setTimeout(() => pause(), SETTLE_MS);

    const wake = () => start();
    scene.addEventListener('pointerdown', wake);

    const onVisibility = () => {
      if (document.hidden) pause();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      scene.removeEventListener('pointerdown', wake);
      // Matter bound these itself; the scroll-eating ones went above.
      scene.removeEventListener('mousemove', mouse.mousemove);
      scene.removeEventListener('mousedown', mouse.mousedown);
      scene.removeEventListener('mouseup', mouse.mouseup);
      pause();
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      startRef.current = null;
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      engineRef.current = null;
      runnerRef.current = null;
    };
  }, [reduced, tokens]);

  const shake = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const { Body } = Matter;
    // Waking goes through the same guarded start the effect uses, so a shake
    // can never leave a second Matter frame loop behind.
    startRef.current?.();
    bodiesRef.current.forEach((body) => {
      Body.setVelocity(body, { x: (Math.random() - 0.5) * 18, y: -12 - Math.random() * 12 });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    });
    setNudged(true);
  };

  if (reduced) {
    return (
      <section className="hero hero-physics" id="top">
        <StaticFallback />
      </section>
    );
  }

  return (
    <section className="hero hero-physics" id="top">
      <div className="physics-copy">
        <p className="eyebrow">{profile.roles.join(' · ')}</p>
        <h1>{profile.name}</h1>
        <p className="hero-tagline">{profile.tagline}</p>
        <div className="hero-actions">
          <a
            className="btn btn-primary"
            href={`${import.meta.env.BASE_URL}${profile.resume}`}
            target="_blank"
            rel="noreferrer"
          >
            Download resume
          </a>
          <a className="btn btn-ghost" href="#projects">
            See projects
          </a>
        </div>
      </div>

      <div
        className={`physics-scene${ready ? ' is-ready' : ''}`}
        ref={sceneRef}
        aria-hidden="true"
      >
        {tokens.map((token, i) => (
          <span
            key={token.label}
            ref={(el) => {
              nodesRef.current[i] = el;
            }}
            data-weight={token.weight}
            className={`physics-token physics-token--${token.weight}`}
          >
            {token.label}
          </span>
        ))}
      </div>

      <div className="physics-controls">
        <p className={`physics-hint${nudged ? ' is-hidden' : ''}`}>Drag the tags. Throw them.</p>
        <button type="button" className="physics-shake" onClick={shake}>
          Shake
        </button>
      </div>
    </section>
  );
}
