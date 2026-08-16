import { motion, useMotionTemplate, useSpring } from 'motion/react';
import { useEffect } from 'react';

export default function CursorGlow() {
  const x = useSpring(0, { stiffness: 120, damping: 22 });
  const y = useSpring(0, { stiffness: 120, damping: 22 });

  useEffect(() => {
    let raf = 0;
    let pending = null;

    const flush = () => {
      raf = 0;
      if (!pending || document.hidden) return;
      x.set(pending.clientX);
      y.set(pending.clientY);
      pending = null;
    };

    const onMove = (e) => {
      pending = e;
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        pending = null;
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [x, y]);

  const background = useMotionTemplate`radial-gradient(520px circle at ${x}px ${y}px, color-mix(in srgb, var(--accent) 9%, transparent), transparent 65%)`;

  return (
    <motion.div
      className="cursor-glow"
      aria-hidden="true"
      style={{ background }}
    />
  );
}
