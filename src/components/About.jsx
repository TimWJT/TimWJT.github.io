import { motion } from 'motion/react';
import { about } from '../data/content';
import { useMotionPreset } from '../context/MotionContext';
import SectionHeader from '../motion/SectionHeader';

export default function About() {
  const { motion: preset } = useMotionPreset();
  const reveal = preset.effects.scrollReveal;

  return (
    <section id="about" className="section">
      <SectionHeader label="About" title="Student, builder, community lead." />
      <div className="prose">
        {about.paragraphs.map((text, i) => (
          <motion.p
            key={text.slice(0, 40)}
            initial={reveal ? { opacity: 0, y: 10 } : false}
            whileInView={reveal ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
          >
            {text}
          </motion.p>
        ))}
      </div>
    </section>
  );
}
