import { motion, useMotionTemplate, useSpring } from 'motion/react';
import { useEffect } from 'react';

export default function CursorGlow() {
  const x = useSpring(0, { stiffness: 120, damping: 22 });
  const y = useSpring(0, { stiffness: 120, damping: 22 });

  useEffect(() => {
    const onMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
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
