import { createContext, useContext, useState } from 'react';
import { motionPresets } from '../data/motionPresets';

const MotionContext = createContext(null);

// The site stores nothing that outlives a tab, so a preset lives in React state
// for this page view only: reloading starts again at the default below. The
// design panel can still reach it through the provider's own methods.
const DEFAULT_ID = 'full';

function readInitialIndex() {
  return motionPresets.findIndex((p) => p.id === DEFAULT_ID);
}

export function MotionProvider({ children }) {
  const [index, setIndex] = useState(readInitialIndex);
  const motion = motionPresets[index] ?? motionPresets[1];

  const next = () => setIndex((i) => (i + 1) % motionPresets.length);
  const prev = () => setIndex((i) => (i - 1 + motionPresets.length) % motionPresets.length);
  const setById = (id) => {
    const i = motionPresets.findIndex((p) => p.id === id);
    if (i >= 0) {
      setIndex(i);
    }
  };

  return (
    <MotionContext.Provider
      value={{ motion, index, total: motionPresets.length, next, prev, setById, motionPresets }}
    >
      {children}
    </MotionContext.Provider>
  );
}

export function useMotionPreset() {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error('useMotionPreset must be used within MotionProvider');
  return ctx;
}
