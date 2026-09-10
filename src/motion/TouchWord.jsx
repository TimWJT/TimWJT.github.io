import { useEffect, useRef } from 'react';

export default function TouchWord() {
  const zoneRef = useRef(null);
  const wordRef = useRef(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const word = wordRef.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previous = 0;
    const position = [0, 0, 0];
    const velocity = [0, 0, 0];
    let target = [0, 0, 0];
    const paint = () => {
      word.style.transform = `translate(${position[0]}px, ${position[1]}px) rotate(${position[2]}deg)`;
    };
    const tick = time => {
      frame = 0;
      const dt = Math.min((time - previous) / 1000 || 1 / 60, 1 / 30);
      previous = time;
      let moving = false;
      position.forEach((value, i) => {
        velocity[i] += ((target[i] - value) * 180 - velocity[i] * 19) * dt;
        position[i] += velocity[i] * dt;
        moving ||= Math.abs(target[i] - position[i]) > 0.01 || Math.abs(velocity[i]) > 0.01;
      });
      paint();
      if (moving) frame = window.requestAnimationFrame(tick);
      else if (target.every(value => value === 0)) word.style.removeProperty('transform');
    };
    const move = event => {
      if (event.pointerType === 'touch') return;
      // Measure the stationary wrapper so the word never chases its own bounds.
      const rect = zone.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      target = preference.matches ? [x * 3, y * 1.5, 0] : [x * 10, y * 6, x * 2];
      if (preference.matches) {
        position.splice(0, 3, ...target);
        paint();
      } else if (!frame) {
        previous = window.performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    };
    const leave = () => {
      target = [0, 0, 0];
      if (preference.matches) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        position.fill(0);
        velocity.fill(0);
        word.style.removeProperty('transform');
      } else if (!frame) {
        previous = window.performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    };
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerleave', leave);
    preference.addEventListener('change', leave);
    return () => {
      window.cancelAnimationFrame(frame);
      zone.removeEventListener('pointermove', move);
      zone.removeEventListener('pointerleave', leave);
      preference.removeEventListener('change', leave);
    };
  }, []);

  return <span className="touch-zone" ref={zoneRef}><em ref={wordRef}>touch.</em></span>;
}
