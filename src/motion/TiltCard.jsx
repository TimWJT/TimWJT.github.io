import { motion } from 'motion/react';
import { useRef } from 'react';

export default function TiltCard({ children, className = '', index = 0, reveal = true }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateX = (py - 0.5) * -6;
    const rotateY = (px - 0.5) * 6;
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <motion.li
      ref={ref}
      className={`card tilt-card ${className}`}
      initial={reveal ? { opacity: 0, y: 20 } : false}
      whileInView={reveal ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      style={{ willChange: 'transform' }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </motion.li>
  );
}