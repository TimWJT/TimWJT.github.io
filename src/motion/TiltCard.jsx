import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import { useRef } from 'react';

export default function TiltCard({ children, className = '', index = 0, reveal = true }) {
  const ref = useRef(null);
  const rotateX = useSpring(0, { stiffness: 180, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 180, damping: 22 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 55%)`;

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateX.set((py - 0.5) * -8);
    rotateY.set((px - 0.5) * 8);
    glareX.set(px * 100);
    glareY.set(py * 100);
  };

  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  };

  return (
    <motion.li
      ref={ref}
      className={`card tilt-card ${className}`}
      initial={reveal ? { opacity: 0, y: 20 } : false}
      whileInView={reveal ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
      }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <motion.div className="tilt-glare" style={{ background: glare }} />
      {children}
    </motion.li>
  );
}
