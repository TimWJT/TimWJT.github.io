import { useEffect, useState } from 'react';

/**
 * Keeps the design/motion panel hidden from visitors while leaving it one
 * secret gesture away for me.
 *
 * Two ways in:
 *   1. Type the word "design" anywhere on the page (not while in a text field).
 *   2. Load the page with ?design in the URL, e.g. timwjt.github.io/?design
 *
 * Nothing is written to storage, so the panel exists for this page view only:
 * reload and it is hidden again, which is why ?design is the practical way back
 * in — the URL survives a reload and leaves no trace in the browser. Type
 * "design" again, or press Escape outside a text field, to hide it.
 *
 * The keydown guards deliberately mirror src/motion/RainbowBar.jsx: a keypress
 * that is part of an IME composition, that something on the page has already
 * handled, or that arrives while the page is in design mode, is not mine to
 * act on. Escape sits below the same guard, so typing Escape into a form field
 * does not take the panel away from someone who is only filling in a form.
 */

const SECRET = 'design';
const URL_FLAG = 'design';
const SEQUENCE_TIMEOUT_MS = 2000;

function readInitial() {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has(URL_FLAG);
  } catch {
    /* a hostile location object: treat the page as locked */
    return false;
  }
}

function isTypingNode(node) {
  if (!node) return false;
  const tag = node.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (node.isContentEditable === true) return true;
  // The selector check is what RainbowBar.jsx does, and it is the one that
  // still holds in an engine that does not report isContentEditable for the
  // descendants of an editable region.
  return typeof node.closest === 'function' && Boolean(node.closest('[contenteditable]:not([contenteditable="false"])'));
}

function isTyping(event) {
  // The composed path, so a control inside a shadow root keeps its own keys
  // even though event.target is the shadow host.
  const path = typeof event?.composedPath === 'function' ? event.composedPath() : null;
  const nodes = path && path.length > 0 ? path : [event?.target];
  return nodes.some(isTypingNode);
}

export default function useDebugUnlock() {
  const [unlocked, setUnlocked] = useState(readInitial);

  useEffect(() => {
    let buffer = '';
    let timer = 0;

    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.isComposing || e.defaultPrevented) return;
      if (document.designMode?.toLowerCase() === 'on') return;
      if (isTyping(e)) return;

      // After the guards on purpose: Escape typed into a text field belongs to
      // that field, not to the panel.
      if (e.key === 'Escape') {
        if (unlocked) setUnlocked(false);
        return;
      }

      if (e.key.length !== 1) return;

      // Only the last six keystrokes can make the word, so a typo does not
      // poison the buffer beyond that window.
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
