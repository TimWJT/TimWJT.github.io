import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCommands } from './terminalCommands';
import './Terminal.css';

// Blocks kept in the scrollback. A visitor can type `clear`, but nobody should
// be able to grow React state without bound by pasting the same command 10,000
// times, and the oldest lines are the ones nobody is reading any more.
const MAX_BLOCKS = 120;

// The same "is the visitor typing?" question RainbowBar and PageCollapse ask,
// answered with the same selectors. `composedPath()` rather than `event.target`
// matters here: the clipboard fallback in CopyEmail.jsx briefly appends a real
// <textarea> to <body> and focuses it, and a control inside a shadow root is
// not reachable from `target` alone.
const TEXT_FIELDS = 'input, textarea, select, [contenteditable]:not([contenteditable=false])';

// The panel is a plain DOM overlay: no requestAnimationFrame, no timers, no
// animation loop. Opening it costs one class flip and one focus call, and
// typing costs a re-render. The single motion it owns is a 120ms CSS fade on
// the overlay, which `prefers-reduced-motion: reduce` switches off in
// Terminal.css. The blinking caret in the input is the browser's own, not an
// animation added here, which is also why it is left visible.
export default function Terminal() {
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const openRef = useRef(false);
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const panelRef = useRef(null);
  // Whatever had focus before the panel opened, captured in the keydown handler
  // so the restore is not delayed by a React render.
  const restoreRef = useRef(null);
  const nextId = useRef(0);

  const close = useCallback(() => {
    // Guarded by a ref, not state: closing is reachable from the keydown
    // listener, from a click on the background and from a focusout, and two of
    // those can land in the same event (Escape blurs the input it is closing).
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    // `preventScroll` matters: the page behind is unlocked on the next effect,
    // so a plain focus() here could jump the reader away from where they were.
    // Focus is only taken back if the panel still owns it. If the reader has
    // already moved it to something behind the panel — Tab, or a click — yanking
    // it back to where it started would fight them.
    const previous = restoreRef.current;
    const active = document.activeElement;
    const panel = panelRef.current;
    const stillOurs = !active || active === document.body || !panel || panel.contains(active);
    if (stillOurs && previous?.isConnected && typeof previous.focus === 'function') {
      previous.focus({ preventScroll: true });
    }
  }, []);

  const push = useCallback(block => {
    const entry = { id: nextId.current++, ...block };
    setBlocks(current => [...current, entry].slice(-MAX_BLOCKS));
  }, []);

  const submit = useCallback(event => {
    event.preventDefault();
    const field = inputRef.current;
    const command = (field?.value ?? '').trim();
    if (field) field.value = '';
    // An empty line prints nothing, like a real shell.
    if (!command) return;
    // Read the registry at run time rather than caching it, so a command
    // registered after the panel mounted still works.
    const entry = getCommands().find(item => item.name === command.toLowerCase());
    if (!entry) {
      push({ command, kind: 'error', lines: [`${command}: no such command. Try "help".`] });
      return;
    }
    let lines;
    try {
      lines = entry.run();
    } catch (error) {
      // Throwing is the documented way to fail politely. A broken command must
      // not take the session with it, so the message is printed and the panel
      // stays open.
      push({ command, kind: 'error', lines: [String(error?.message ?? error)] });
      return;
    }
    if (entry.clear) {
      setBlocks([]);
      return;
    }
    push({ command, kind: 'output', lines: [...lines] });
  }, [push]);

  useEffect(() => {
    const keydown = event => {
      if (openRef.current) {
        // While the panel is open every other key belongs to the focused input.
        if (event.key === 'Escape') close();
        return;
      }
      // `;` and not `~`: the grave accent is missing on plenty of layouts, while
      // the unshifted semicolon is on the home row of every common one. It is
      // unshifted, so a layout that needs Shift for `;` will not reach it — a
      // documented limitation, not a second hidden key.
      if (event.key !== ';' || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.isComposing || event.defaultPrevented || document.hidden) return;
      if (document.designMode?.toLowerCase() === 'on') return;
      const path = event.composedPath?.() ?? [event.target];
      if (path.some(node => node?.closest?.(TEXT_FIELDS))) return;
      // Nothing on the page uses `;`, and swallowing it here stops browsers that
      // bind punctuation to quick-find (Firefox) from opening a find bar behind
      // a panel that covers the page.
      event.preventDefault();
      openRef.current = true;
      restoreRef.current = document.activeElement;
      setOpen(true);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [close]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus({ preventScroll: true });
    // The page behind must not scroll: a wheel event over the overlay would
    // otherwise scroll the article the visitor was reading. The previous value
    // is restored verbatim so nothing else on the page is left unscrollable.
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = previous; };
  }, [open]);

  useLayoutEffect(() => {
    const node = outputRef.current;
    // Pinning the scrollback to the newest block is layout, not animation, so it
    // costs no frame of its own and runs before the browser paints.
    if (node) node.scrollTop = node.scrollHeight;
  }, [blocks, open]);

  // A press on the uncovered part of the overlay closes the panel. Only the
  // backdrop counts: presses inside the panel must not dismiss it, and a press
  // that starts inside and ends outside still means "keep this open".
  const onMouseDown = event => { if (event.target === event.currentTarget) close(); };
  // Tabbing out of the panel, or clicking a control behind it, would otherwise
  // leave a full-screen panel open with focus somewhere invisible. A null
  // relatedTarget (the window lost focus) is ignored, because that is not the
  // reader choosing to leave.
  const onBlur = event => {
    const next = event.relatedTarget;
    if (next && !event.currentTarget.contains(next)) close();
  };

  if (!open) return null;
  // Portalled to <body> on purpose. Mounted inside #top it would sit in the
  // stacking context of the page, and mounted inside .footer-landing it would be
  // cropped outright: that band has `contain: layout paint`.
  return createPortal(
    // aria-modal is honest here: the overlay covers the whole viewport at the
    // top of the stack, so nothing behind it can be pointed at, and the only
    // way out is Escape (or a press on the background, which closes it too).
    <div className="terminal-overlay" role="dialog" aria-modal="true" aria-label="Terminal" onMouseDown={onMouseDown}>
      <div className="terminal-panel" ref={panelRef} onBlur={onBlur}>
        <div className="terminal-output" role="log" aria-live="polite" aria-atomic="false" ref={outputRef}>
          {blocks.map(block => (
            <div className="terminal-block" key={block.id}>
              <p className="terminal-echo"><span className="terminal-mark" aria-hidden="true">&gt;</span>{block.command}</p>
              <p className={`terminal-result${block.kind === 'error' ? ' is-error' : ''}`}>
                {block.lines.map((line, index) => (
                  // Blank lines still need a line box, so they hold a no-break
                  // space. Index keys are correct here: a block never reorders.
                  <span className="terminal-line" key={index}>{line || ' '}</span>
                ))}
              </p>
            </div>
          ))}
        </div>
        <form className="terminal-form" onSubmit={submit}>
          <span className="terminal-mark" aria-hidden="true">&gt;</span>
          <input
            id="terminal-command"
            ref={inputRef}
            className="terminal-input"
            type="text"
            aria-label="Command"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </form>
      </div>
    </div>,
    document.body,
  );
}
