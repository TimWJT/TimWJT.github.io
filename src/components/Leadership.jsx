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
              <h3>
                {entry.link ? (
                  <a href={entry.link} target="_blank" rel="noreferrer">
                    {entry.org}
                  </a>
                ) : (
                  entry.org
                )}
              </h3>
            </div>
            {entry.roles.map((role) => (
              <div key={role.title} className="role-block">
                <div className="role-head">
                  <p className="role">{role.title}</p>
                  <span className="role-period">{role.period}</span>
                </div>
                <ul className="highlights">
                  {role.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.li>
        ))}
      </ul>

      <div className="skills-block">
        <h3>Skills</h3>
        {skills.map((group, gi) => (
          <div key={group.label} className="skill-group">
            <p className="skill-group-label">{group.label}</p>
            <div className="skill-tags">
              {group.items.map((s, i) => (
                <motion.span
                  key={s}
                  className={gi === skills.length - 1 ? 'pill pill-ghost' : 'pill'}
                  initial={reveal ? { opacity: 0, scale: 0.92 } : false}
                  whileInView={reveal ? { opacity: 1, scale: 1 } : undefined}
                  whileHover={pillHover ? { y: -2, scale: 1.04 } : undefined}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                >
                  {s}
                </motion.span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
