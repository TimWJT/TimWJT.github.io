import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

export default function ScrollRail() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="scroll-rail" ref={ref} aria-hidden="true">
      <motion.span style={{ height }} />
    </div>
  );
}
