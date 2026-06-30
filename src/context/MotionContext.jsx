import { createContext, useContext, useState } from 'react';
import { motionPresets } from '../data/motionPresets';

const MotionContext = createContext(null);
const STORAGE_KEY = 'timwang-motion';
const VALID_IDS = new Set(motionPresets.map((p) => p.id));

function readInitialIndex() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && !VALID_IDS.has(saved)) {
    localStorage.removeItem(STORAGE_KEY);
  }
  if (saved && VALID_IDS.has(saved)) {
    return motionPresets.findIndex((p) => p.id === saved);
  }
  return motionPresets.findIndex((p) => p.id === 'full');
}

export function MotionProvider({ children }) {
  const [index, setIndex] = useState(readInitialIndex);
  const motion = motionPresets[index] ?? motionPresets[1];

  const save = (nextIndex) => {
    localStorage.setItem(STORAGE_KEY, motionPresets[nextIndex].id);
    return nextIndex;
  };

  const next = () => setIndex((i) => save((i + 1) % motionPresets.length));
  const prev = () => setIndex((i) => save((i - 1 + motionPresets.length) % motionPresets.length));
  const setById = (id) => {
    const i = motionPresets.findIndex((p) => p.id === id);
    if (i >= 0) {
      setIndex(i);
      localStorage.setItem(STORAGE_KEY, id);
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
