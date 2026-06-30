import { motion } from 'motion/react';
import { useMotionPreset } from '../context/MotionContext';
import TiltCard from './TiltCard';

export default function ProjectCard({ project, index }) {
  const { motion: preset } = useMotionPreset();
  const e = preset.effects;

  const inner = (
    <>
      <div className="card-top">
        <h3>{project.title}</h3>
        <span className="pill">{project.stack}</span>
      </div>
      <p>{project.description}</p>
      <a href={project.link} target="_blank" rel="noreferrer">
        View →
      </a>
    </>
  );

  if (e.tiltCards) {
    return (
      <TiltCard index={index} reveal={e.scrollReveal}>
        {inner}
      </TiltCard>
    );
  }

  if (!e.scrollReveal) {
    return <li className="card">{inner}</li>;
  }

  return (
    <motion.li
      className="card"
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
