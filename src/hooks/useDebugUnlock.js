import { useEffect, useState } from 'react';

/**
 * Keeps the design/motion panel hidden from visitors while leaving it one
 * secret gesture away for me.
 *
 * Three ways in:
 *   1. Type the word "design" anywhere on the page (not while in a text field).
 *   2. Load the page with ?design in the URL, e.g. timwjt.github.io/?design
 *   3. Run localStorage.setItem('timwang-debug', '1') in the console, reload.
 *
 * Once unlocked it stays unlocked in that browser. Type "design" again or press
 * Escape to hide it; that also clears the saved flag.
 */

const SECRET = 'design';
const STORAGE_KEY = 'timwang-debug';
const URL_FLAG = 'design';
const SEQUENCE_TIMEOUT_MS = 2000;

function readInitial() {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).has(URL_FLAG)) return true;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
}

export default function useDebugUnlock() {
  const [unlocked, setUnlocked] = useState(readInitial);

  // Persist so I don't have to retype the secret on every reload.
  useEffect(() => {
    try {
      if (unlocked) window.localStorage.setItem(STORAGE_KEY, '1');
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private browsing, storage disabled: fall back to session-only */
    }
  }, [unlocked]);

  useEffect(() => {
    let buffer = '';
    let timer = 0;

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && unlocked) {
        setUnlocked(false);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key.length !== 1) return;

      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);

      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        buffer = '';
      }, SEQUENCE_TIMEOUT_MS);

      if (buffer === SECRET) {
        buffer = '';
        setUnlocked((v) => !v);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [unlocked]);

  return [unlocked, setUnlocked];
}
