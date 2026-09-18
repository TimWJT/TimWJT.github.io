import { useEffect, useRef } from 'react';
import './RainbowBar.css';

// Only controls that use arrow keys themselves keep them. Buttons and links
// (e.g. a clicked name letter) leave the rainbow working.
const controls = [
  'input', 'textarea', 'select', 'iframe', '[contenteditable]:not([contenteditable=false])', '.play-square',
  ...['slider', 'spinbutton', 'scrollbar', 'tab', 'tablist', 'menu', 'menubar', 'menuitem', 'listbox', 'option',
    'radio', 'radiogroup', 'grid', 'gridcell', 'tree', 'treeitem', 'textbox', 'combobox'].map(role => `[role=${role}]`),
].join(', ');
const isArrow = code => code === 'ArrowLeft' || code === 'ArrowRight';

export default function RainbowBar() {
  const overlayRef = useRef(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const held = new Set();

    const render = () => {
      if (held.size) {
        // Set insertion order preserves the last pressed, still-held arrow.
        overlay.dataset.direction = [...held].at(-1) === 'ArrowLeft' ? 'left' : 'right';
      }
      overlay.classList.toggle('is-active', held.size > 0);
    };
    const releaseAll = () => {
      held.clear();
      render();
    };
    const keydown = event => {
      if (event.key === 'Escape') { releaseAll(); return; }
      if (!isArrow(event.code) || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.isComposing || event.defaultPrevented || document.hidden || !document.hasFocus()) return;
      if (document.designMode?.toLowerCase() === 'on') return;
      // Include the composed path so controls inside shadow roots keep their keys.
      const path = event.composedPath?.() ?? [event.target];
      if (path.some(node => node?.closest?.(controls))) return;
      held.add(event.code);
      render();
    };
    const keyup = event => {
      // Do not apply focus/modifier guards here: a key can release after focus moves.
      if (!isArrow(event.code)) return;
      held.delete(event.code);
      render();
    };
    const visibility = () => { if (document.hidden) releaseAll(); };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      releaseAll();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  return <div ref={overlayRef} className="rainbow-bar" aria-hidden="true" />;
}
