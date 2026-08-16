import { motion, useScroll, useTransform } from 'motion/react';

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, (v) => v);

  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}
