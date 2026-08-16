import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Which hero treatment to render.
 *
 *   classic — the original text hero. Default, unchanged.
 *   physics — interactive Matter.js hero.
 *
 * Selected by ?v2 / ?hero=physics in the URL, or persisted in localStorage via
 * the debug panel. Keeping both in the bundle means the classic version is
 * always one switch away if the physics one misbehaves.
 */

const STORAGE_KEY = 'timwang-hero';
const VERSIONS = ['classic', 'physics'];

const VersionContext = createContext(null);

function readInitial() {
  if (typeof window === 'undefined') return 'classic';
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('v2')) return 'physics';
    const named = params.get('hero');
    if (named && VERSIONS.includes(named)) return named;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && VERSIONS.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'classic';
}

export function VersionProvider({ children }) {
  const [version, setVersion] = useState(readInitial);

  useEffect(() => {
    try {
      if (version === 'classic') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, version);
    } catch {
      /* ignore */
    }
  }, [version]);

  const toggle = useCallback(() => {
    setVersion((v) => (v === 'classic' ? 'physics' : 'classic'));
  }, []);

  const value = useMemo(
    () => ({ version, versions: VERSIONS, setVersion, toggle }),
    [version, toggle],
  );

  return <VersionContext.Provider value={value}>{children}</VersionContext.Provider>;
}

export function useVersion() {
  const ctx = useContext(VersionContext);
  if (!ctx) throw new Error('useVersion must be used inside VersionProvider');
  return ctx;
}
