import { motion } from 'motion/react';
import { profile } from '../data/content';
import { useMotionPreset } from '../context/MotionContext';
import HeroTitle from './HeroTitle';

const resumeHref = `${import.meta.env.BASE_URL}${profile.resume}`;

function FadeIn({ className, delay = 0, reveal, children }) {
  if (!reveal) {
    return <p className={className}>{children}</p>;
  }
  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.p>
  );
}

function HeroActions() {
  return (
    <div className="hero-actions">
      <a className="btn btn-primary" href={resumeHref} target="_blank" rel="noreferrer">
        Download resume
      </a>
      <a className="btn btn-ghost" href="#projects">
        See projects
      </a>
      <a className="btn btn-ghost" href={`mailto:${profile.email}`}>
        Email me
      </a>
    </div>
  );
}

function StaticHeroCopy({ variant }) {
  return (
    <div className={`hero-copy hero-copy--${variant}`}>
      <p className="eyebrow">{profile.roles.join(' · ')}</p>
      <h1>{profile.name}</h1>
      <p className="hero-legal-name">
        Legal name: {profile.legalName}. I go by Tim professionally.
      </p>
      <p className="hero-tagline">{profile.tagline}</p>
      <HeroActions />
    </div>
  );
}

export default function HeroCopy({ variant = 'default', animate = true, staticCopy = false }) {
  if (staticCopy) {
    return <StaticHeroCopy variant={variant} />;
  }

  const { motion: preset } = useMotionPreset();
  const reveal = animate && preset.effects.scrollReveal;

  return (
    <div className={`hero-copy hero-copy--${variant}`}>
      <FadeIn className="eyebrow" reveal={reveal}>
        {profile.roles.join(' · ')}
      </FadeIn>
      <HeroTitle text={profile.name} animate={animate} />
      <FadeIn className="hero-legal-name" reveal={reveal} delay={0.08}>
        Legal name: {profile.legalName}. I go by Tim professionally.
      </FadeIn>
      <FadeIn className="hero-tagline" reveal={reveal} delay={0.16}>
        {profile.tagline}
      </FadeIn>
      {reveal ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24 }}
        >
          <HeroActions />
        </motion.div>
      ) : (
        <HeroActions />
      )}
    </div>
  );
}
