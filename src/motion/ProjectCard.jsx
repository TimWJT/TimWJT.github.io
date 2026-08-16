import { motion } from 'motion/react';
import { useMotionPreset } from '../context/MotionContext';
import TiltCard from './TiltCard';

function CardInner({ project }) {
  return (
    <>
      <div className="card-top">
        <h3>{project.title}</h3>
        {project.period ? <span className="card-period">{project.period}</span> : null}
      </div>

      {project.result ? <p className="card-result">{project.result}</p> : null}
      {project.context ? <p className="card-context">{project.context}</p> : null}

      <p>{project.description}</p>

      {project.highlights?.length ? (
        <ul className="highlights card-highlights">
          {project.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : null}

      <div className="card-foot">
        <div className="skill-tags stack-tags">
          {project.stack.map((s) => (
            <span key={s} className="pill pill-ghost">
              {s}
            </span>
          ))}
        </div>
        {project.link ? (
          <a
            href={project.link}
            target="_blank"
            rel="noreferrer"
            aria-label={`View ${project.title}`}
          >
            View →
          </a>
        ) : null}
      </div>
    </>
  );
}

export default function ProjectCard({ project, index }) {
  const { motion: preset } = useMotionPreset();
  const e = preset.effects;
  const className = project.featured ? 'card card-featured' : 'card';
  const inner = <CardInner project={project} />;

  if (e.tiltCards) {
    return (
      <TiltCard
        index={index}
        reveal={e.scrollReveal}
        className={project.featured ? 'card-featured' : ''}
      >
        {inner}
      </TiltCard>
    );
  }

  if (!e.scrollReveal) {
    return <li className={className}>{inner}</li>;
  }

  return (
    <motion.li
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -2 }}
    >
      {inner}
    </motion.li>
  );
}
