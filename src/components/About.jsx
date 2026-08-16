import { motion } from 'motion/react';
import { about, education } from '../data/content';
import { useMotionPreset } from '../context/MotionContext';
import SectionHeader from '../motion/SectionHeader';

export default function About() {
  const { motion: preset } = useMotionPreset();
  const reveal = preset.effects.scrollReveal;

  return (
    <section id="about" className="section">
      <SectionHeader label="About" title="Student, builder, community lead." />
      <div className="about-layout">
        <div className="prose">
          {about.paragraphs.map((text, i) =>
            reveal ? (
              <motion.p
                key={text.slice(0, 40)}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
              >
                {text}
              </motion.p>
            ) : (
              <p key={text.slice(0, 40)}>{text}</p>
            ),
          )}
        </div>

        <motion.aside
          className="edu-card"
          aria-label="Education"
          initial={reveal ? { opacity: 0, y: 12 } : false}
          whileInView={reveal ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <p className="edu-label">Education</p>
          <h3>{education.school}</h3>
          <p className="edu-degree">{education.degree}</p>
          <p className="edu-major">{education.major}</p>
          <p className="edu-period">
            {education.period} · {education.note}
          </p>
          <dl className="edu-stats">
            {education.stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </motion.aside>
      </div>
    </section>
  );
}
