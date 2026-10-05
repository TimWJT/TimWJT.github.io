import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './CopyEmail.css';

const FAILURE = 'Couldn’t copy — select the email instead.';

// The confirmation gets a little more knowing the more often one visit copies
// the same address. Each entry holds from its count until the next one takes
// over. Short on purpose: the action slot never shrinks, so every extra
// character is taken from the email beside it on a narrow screen.
const CONFIRMATIONS = [
  [1, 'Copied!'],
  [3, 'Copied again!'],
  [5, 'Same email!'],
  [8, 'Just email me :)'],
  [12, 'I’m flattered.'],
];
const confirmation = copies => CONFIRMATIONS.findLast(([from]) => copies >= from)[1];

function fallbackCopy(email) {
  const active = document.activeElement;
  const selection = document.getSelection?.();
  const ranges = [];
  if (selection) {
    for (let i = 0; i < selection.rangeCount; i++) {
      ranges.push(selection.getRangeAt(i).cloneRange());
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = email;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.setAttribute('aria-hidden', 'true');
  // Keep the temporary field selectable without showing or scrolling it.
  Object.assign(textarea.style, {
    position: 'fixed', top: '0', left: '0', opacity: '0',
    width: '1px', height: '1px', padding: '0', pointerEvents: 'none',
  });
  try {
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    return document.execCommand?.('copy') === true;
  } catch {
    return false;
  } finally {
    textarea.remove();
    // Restoring focus/selection must not turn a successful copy into a failure.
    try {
      if (active?.isConnected) active.focus?.({ preventScroll: true });
      if (selection) {
        selection.removeAllRanges();
        ranges.forEach(range => selection.addRange(range));
      }
    } catch { /* The previous focus or selection may no longer exist. */ }
  }
}

export default function CopyEmail({ email }) {
  const [message, setMessage] = useState('');
  // Where the live region is portalled to, or null before mount. Same shape as
  // the deployed top in SpinningTop.jsx: document is not touched during render.
  const [portalsTo, setPortalsTo] = useState(null);
  const mounted = useRef(false);
  const attempt = useRef(0);
  const timer = useRef(null);
  // Successful copies this visit. Memory only: a reload starts over.
  const copies = useRef(0);

  useEffect(() => {
    mounted.current = true;
    setPortalsTo(document.body);
    return () => {
      mounted.current = false;
      attempt.current++;
      window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    const current = ++attempt.current;
    const isCurrent = () => mounted.current && current === attempt.current;
    window.clearTimeout(timer.current);
    timer.current = null;
    setMessage('');
    let copied = false;
    try {
      if (typeof navigator.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(email);
        copied = true;
      }
    } catch { /* A denied clipboard request can still use the legacy path. */ }
    // Ignore old requests, including a denial that arrives after unmount.
    if (!isCurrent()) return;
    if (!copied) {
      try { copied = fallbackCopy(email); } catch { copied = false; }
    }
    if (!isCurrent()) return;
    if (copied) copies.current++;
    setMessage(copied ? confirmation(copies.current) : FAILURE);
    if (copied) {
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (isCurrent()) setMessage('');
      }, 2500);
    }
  };

  const failed = message === FAILURE;
  const succeeded = message !== '' && !failed;
  return (
    <>
      {/* The confirmation used to live inside the <button>, so while a copy ran
          the live region was inside the control that held focus. Screen readers
          treat the contents of a focused control specially, and a live region
          down there is announced at their discretion rather than the page's.
          Portalling it to the end of <body> puts it beyond that: never a
          descendant of the button, and never a new child of
          `nav.contact-links` either, because that nav is a four-column grid
          whose own rules lean on `a:last-child` and `a:nth-child(2)`, and one
          more element in it would shift both. It is always mounted, which is
          what a live region needs to be heard at all. */}
      {portalsTo && createPortal(
        <span className="contact-email-live" role="status" aria-live="polite" aria-atomic="true">{message}</span>,
        portalsTo,
      )}
      <button type="button" className="contact-email" onClick={copy} aria-label={`Copy email address ${email}`}>
        <span className="contact-email-text">
          <span className="contact-email-address">{email}</span>
          {/* Failure stays on screen so the address can be selected and copied by
              hand. The live region carries the same words for assistive
              technology, so this copy is hidden from it rather than read twice. */}
          {failed && <span className="contact-email-failure" aria-hidden="true">{FAILURE}</span>}
        </span>
        <span className="contact-email-action" aria-hidden="true">
          {succeeded ? (
            <span className="contact-email-copied">{message}</span>
          ) : (
            <>
              <svg viewBox="0 0 16 16" width="16" height="16" focusable="false">
                <rect x="5.5" y="1.5" width="9" height="9" rx="1.5" />
                <path d="M10.5 10.5v2A1 1 0 0 1 9.5 13.5h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2" />
              </svg>
              <span className="contact-email-action-label">Copy</span>
            </>
          )}
        </span>
      </button>
    </>
  );
}
