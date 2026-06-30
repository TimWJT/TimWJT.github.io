import { motion } from 'motion/react';
import { useMotionPreset } from '../context/MotionContext';
import SplitHeading from './SplitHeading';

export default function HeroTitle({ text }) {
  const { motion: preset } = useMotionPreset();

  if (preset.effects.splitHeading) {
    return <SplitHeading text={text} />;
  }

  if (!preset.effects.scrollReveal) {
    return <h1>{text}</h1>;
  }

  return (
    <motion.h1
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      {text}
    </motion.h1>
  );
}
