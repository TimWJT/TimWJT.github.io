import { motion } from 'motion/react';
import { useMotionPreset } from '../context/MotionContext';

export default function SectionHeader({ label, title }) {
  const { motion: preset } = useMotionPreset();
  const reveal = preset.effects.scrollReveal;
  const showLine = preset.effects.sectionLine;

  return (
    <header className="section-header">
      <motion.p
        className="section-label"
        initial={reveal ? { opacity: 0 } : false}
        whileInView={reveal ? { opacity: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
      >
        {label}
      </motion.p>
      <motion.h2
        initial={reveal ? { opacity: 0, y: 8 } : false}
        whileInView={reveal ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        {title}
      </motion.h2>
      {showLine && (
        <motion.span
          className="section-line"
          initial={reveal ? { scaleX: 0 } : false}
          whileInView={reveal ? { scaleX: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
