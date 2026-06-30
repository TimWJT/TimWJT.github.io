import { motion, useMotionValue, useSpring } from 'motion/react';
import { useRef } from 'react';

const RADIUS = 110;
const STRENGTH = 0.42;

export default function MagneticLink({ href, children, className = '', external = false }) {
  const linkRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 140, damping: 14, mass: 0.45 });
  const springY = useSpring(y, { stiffness: 140, damping: 14, mass: 0.45 });

  const onMove = (e) => {
    const el = linkRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) {
      x.set(0);
      y.set(0);
      return;
    }
    const pull = 1 - dist / RADIUS;
    x.set(dx * STRENGTH * pull);
    y.set(dy * STRENGTH * pull);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const props = external ? { target: '_blank', rel: 'noreferrer' } : {};

  return (
    <motion.a
      ref={linkRef}
      href={href}
      className={`magnetic-link magnetic-link-wrap smart-link ${className}`}
      style={{ x: springX, y: springY }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      {...props}
    >
      {children}
    </motion.a>
  );
}
