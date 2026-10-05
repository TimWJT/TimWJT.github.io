import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Which hero treatment to render.
 *
 *   classic — the original text hero. Default, unchanged.
 *   physics — interactive Matter.js hero.
 *
 * Selected by the URL only: an explicit ?hero=<name> wins, and ?v2 is the
 * shorthand for the physics one. Nothing is stored, so a reload re-reads the
 * address bar. Keeping both in the bundle means the classic version is always
 * one switch away if the physics one misbehaves.
 */

const VERSIONS = ['classic', 'physics'];

const VersionContext = createContext(null);

function readInitial() {
  if (typeof window === 'undefined') return 'classic';
  try {
    const params = new URLSearchParams(window.location.search);
    // An explicit choice beats the shorthand: ?v2&hero=classic is a reader
    // asking for the classic hero, not for a contradiction to be resolved.
    const named = params.get('hero');
    if (named && VERSIONS.includes(named)) return named;
    if (params.has('v2')) return 'physics';
  } catch {
    /* ignore */
  }
  return 'classic';
}

export function VersionProvider({ children }) {
  const [version, setVersion] = useState(readInitial);

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
