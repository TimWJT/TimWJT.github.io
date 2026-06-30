import { useMotionPreset } from '../context/MotionContext';
import AmbientLattice from './AmbientLattice';
import CursorGlow from './CursorGlow';
import FilmGrain from './FilmGrain';
import ScrollProgress from './ScrollProgress';
import ScrollRail from './ScrollRail';

export default function MotionLayer() {
  const { motion: preset } = useMotionPreset();
  const e = preset.effects;

  return (
    <>
      {e.lattice && <AmbientLattice />}
      {e.cursorGlow && <CursorGlow />}
      {e.noiseGrain && <FilmGrain />}
      {e.scrollProgress && <ScrollProgress />}
      {e.scrollRail && <ScrollRail />}
    </>
  );
}
