import { useEffect, useRef, useState } from 'react';
import './CopyEmail.css';

const FAILURE = 'Couldn’t copy — select the email instead.';

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
  const mounted = useRef(false);
  const attempt = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    mounted.current = true;
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
    setMessage(copied ? 'Copied!' : FAILURE);
    if (copied) {
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (isCurrent()) setMessage('');
      }, 2500);
    }
  };

  return (
    <button type="button" className="contact-email" onClick={copy} aria-label={`Copy email address ${email}`}>
      <span className="contact-email-text">
        <span className="contact-email-address">{email}</span>
        {/* Success lives in the action slot; the live region hides it visually
            so it is announced but not shown twice. Failure stays visible. */}
        <span className={`contact-email-status${message === 'Copied!' ? ' contact-email-status-hidden' : ''}`} role="status" aria-live="polite" aria-atomic="true">{message}</span>
      </span>
      <span className="contact-email-action" aria-hidden="true">
        {message === 'Copied!' ? (
          <span className="contact-email-copied">Copied!</span>
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
  );
}
