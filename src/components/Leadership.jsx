import { motion } from 'motion/react';
import { leadership, skills } from '../data/content';
import { useMotionPreset } from '../context/MotionContext';
import SectionHeader from '../motion/SectionHeader';

export default function Leadership() {
  const { motion: preset } = useMotionPreset();
  const reveal = preset.effects.scrollReveal;
  const pillHover = preset.effects.pillHover;

  return (
    <section id="leadership" className="section">
      <SectionHeader label="Leadership" title="Communities I help run." />
      <ul className="timeline">
        {leadership.map((entry, i) => (
          <motion.li
            key={entry.org}
            initial={reveal ? { opacity: 0, x: -12 } : false}
            whileInView={reveal ? { opacity: 1, x: 0 } : undefined}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <div className="timeline-head">
              <h3>{entry.org}</h3>
              <span>{entry.period}</span>
            </div>
            <p className="role">{entry.role}</p>
            <ul className="highlights">
              {entry.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </motion.li>
        ))}
      </ul>

      <div className="skills-block">
        <h3>Skills</h3>
        <div className="skill-tags">
          {skills.technical.map((s, i) => (
            <motion.span
              key={s}
              className="pill"
              initial={reveal ? { opacity: 0, scale: 0.92 } : false}
              whileInView={reveal ? { opacity: 1, scale: 1 } : undefined}
              whileHover={pillHover ? { y: -2, scale: 1.04 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              {s}
            </motion.span>
          ))}
        </div>
        <div className="skill-tags muted-tags">
          {skills.other.map((s, i) => (
            <motion.span
              key={s}
              className="pill pill-ghost"
              initial={reveal ? { opacity: 0, scale: 0.92 } : false}
              whileInView={reveal ? { opacity: 1, scale: 1 } : undefined}
              whileHover={pillHover ? { y: -2 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
            >
              {s}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
