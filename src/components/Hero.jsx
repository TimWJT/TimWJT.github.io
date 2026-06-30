import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { profile } from '../data/content';
import { useMotionPreset } from '../context/MotionContext';
import GhostTicker from '../motion/GhostTicker';
import HeroTitle from '../motion/HeroTitle';
import SmartLink from '../motion/SmartLink';

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

export default function Hero() {
  const sectionRef = useRef(null);
  const { motion: preset } = useMotionPreset();
  const e = preset.effects;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 56]);

  return (
    <section className="hero" id="top" ref={sectionRef}>
      {e.ghostTicker && <GhostTicker />}
      <motion.div
        className="hero-content"
        style={e.heroParallax ? { y: parallaxY } : undefined}
      >
        <FadeIn className="eyebrow" reveal={e.scrollReveal}>
          {profile.roles.join(' · ')}
        </FadeIn>
        <HeroTitle text={profile.name} />
        <FadeIn className="hero-legal-name" reveal={e.scrollReveal} delay={0.08}>
          Legal name: {profile.legalName}. I go by Tim professionally.
        </FadeIn>
        <FadeIn className="hero-tagline" reveal={e.scrollReveal} delay={0.16}>
          {profile.tagline}
        </FadeIn>
        <div className="hero-links">
          <SmartLink href={profile.links.github} external>
            GitHub
          </SmartLink>
          <SmartLink href={profile.links.linkedin} external>
            LinkedIn
          </SmartLink>
          <SmartLink href={profile.links.syncs} external>
            SYNCS
          </SmartLink>
        </div>
      </motion.div>
    </section>
  );
}
