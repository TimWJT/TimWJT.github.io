import { useEffect, useRef } from 'react';

const colors = ['#315cd5', '#e77743', '#dfc14e', '#64704e', '#315cd5', '#e77743', '#dfc14e', '#64704e', '#315cd5', '#e77743', '#dfc14e', '#64704e'];

// A soft approach stays lively; faster arrivals progressively deepen the impact.
export const landingStrength = velocity => 4 + 96 * (1 - Math.exp(-Math.max(0, velocity) / 2400));

export default function FooterLanding() {
  const bandRef = useRef(null);

  useEffect(() => {
    const band = bandRef.current;
    const tiles = [...band.querySelectorAll('.landing-tile')];
    const remaining = () => Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - window.innerHeight - window.scrollY);
    let armed = true;
    let previousY = window.scrollY;
    let previousTime = window.performance.now();
    let frame = 0;
    let start = null;
    let amplitude = 0;
    let impacts = 0;
    let speed = 0;
    let speedTime = 0;
    const rememberSpeed = (velocity, time) => {
      // Preserve approach momentum when the final scroll step is clipped by the floor.
      speed = Math.max(velocity, speed * Math.exp(-(time - speedTime) / 180));
      speedTime = time;
      return speed;
    };

    const reset = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      start = null;
      tiles.forEach(tile => tile.style.removeProperty('transform'));
      band.style.removeProperty('--ground-shift');
    };
    const tick = time => {
      frame = 0;
      start ??= time;
      const elapsed = (time - start) / 1000;
      if (elapsed > 1.1 || document.hidden) { reset(); return; }
      tiles.forEach((tile, index) => {
        // One dip and a small crest: only bar heights change, with fixed bases.
        const t = Math.max(0, elapsed - index * 0.018);
        const dip = t < 0.28 ? Math.sin(Math.PI * t / 0.28) ** 2 : 0;
        const crest = t >= 0.28 && t < 0.88
          ? Math.sin(Math.PI * (t - 0.28) / 0.6) ** 2 : 0;
        const height = 1 - dip * amplitude * 0.006 + crest * amplitude * 0.0008;
        tile.style.transform = `scaleY(${height})`;
      });
      frame = window.requestAnimationFrame(tick);
    };
    const impact = velocity => {
      const now = window.performance.now();
      if (document.hidden || !armed) return;
      armed = false;
      reset();
      amplitude = landingStrength(rememberSpeed(velocity, now));
      band.dataset.strength = String(amplitude);
      band.dataset.impacts = String(++impacts);
      frame = window.requestAnimationFrame(tick);
    };
    const scroll = () => {
      const time = window.performance.now();
      const delta = window.scrollY - previousY;
      const velocity = delta / Math.max(16, time - previousTime) * 1000;
      previousY = window.scrollY;
      previousTime = time;
      if (delta > 0) rememberSpeed(velocity, time);
      else if (delta < 0) speed = 0;
      const distance = remaining();
      if (distance > 80) armed = true;
      if (distance > window.innerHeight) reset();
      if (distance > 4 || delta <= 0 || !armed) return;
      impact(velocity);
    };
    const configure = () => {
      reset();
      previousY = window.scrollY;
      previousTime = window.performance.now();
      if (remaining() > 80) armed = true;
      speed = 0;
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', configure);
    document.addEventListener('visibilitychange', configure);
    return () => {
      reset();
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', configure);
      document.removeEventListener('visibilitychange', configure);
    };
  }, []);

  return <div className="footer-landing" ref={bandRef} aria-hidden="true">
    <div className="landing-tiles">
      {colors.map((color, index) => <span key={index} className="landing-tile" style={{ backgroundColor: color }} />)}
    </div>
    <div className="landing-ground" />
  </div>;
}
