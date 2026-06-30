import { motion } from 'motion/react';
import { profile } from '../data/content';
import { useMotionPreset } from '../context/MotionContext';
import SectionHeader from '../motion/SectionHeader';
import SmartLink from '../motion/SmartLink';

const linkItems = [
  { href: `mailto:${profile.email}`, label: profile.email, external: false },
  { href: profile.links.linkedin, label: 'LinkedIn', external: true },
  { href: profile.links.github, label: 'GitHub', external: true },
];

export default function Contact() {
  const { motion: preset } = useMotionPreset();
  const reveal = preset.effects.scrollReveal;

  return (
    <section id="contact" className="section contact">
      <SectionHeader label="Contact" title="Let's connect." />
      <motion.p
        className="section-intro"
        initial={reveal ? { opacity: 0 } : false}
        whileInView={reveal ? { opacity: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        Open to internships, collaborations, and interesting projects.
      </motion.p>
      <div className="contact-links">
        {linkItems.map((item) => (
          <SmartLink key={item.label} href={item.href} external={item.external}>
            {item.label}
          </SmartLink>
        ))}
      </div>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Tim Wang</span>
      </footer>
    </section>
  );
}
