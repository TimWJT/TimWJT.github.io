import { motion } from 'motion/react';
import { experience } from '../data/content';
import { useMotionPreset } from '../context/MotionContext';
import SectionHeader from '../motion/SectionHeader';

export default function Experience() {
  const { motion: preset } = useMotionPreset();
  const reveal = preset.effects.scrollReveal;

  return (
    <section id="experience" className="section">
      <SectionHeader label="Experience" title="Work in progress." />
      <ul className="timeline">
        {experience.map((entry, i) => (
          <motion.li
            key={entry.org}
            initial={reveal ? { opacity: 0, x: -12 } : false}
            whileInView={reveal ? { opacity: 1, x: 0 } : undefined}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <div className="timeline-head">
              <h3>
                {entry.link ? (
                  <a href={entry.link} target="_blank" rel="noreferrer">
                    {entry.org}
                  </a>
                ) : (
                  entry.org
                )}
              </h3>
              <span>{entry.period}</span>
            </div>
            <p className="role">{entry.role}</p>
            <p className="entry-context">{entry.context}</p>
            <ul className="highlights">
              {entry.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            {entry.stack?.length ? (
              <div className="skill-tags stack-tags">
                {entry.stack.map((s) => (
                  <span key={s} className="pill pill-ghost">
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
