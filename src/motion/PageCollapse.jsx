import { useEffect } from 'react';
import { createCollapseGesture, wheelPixels } from './collapseGesture';
import './PageCollapse.css';

const PIECE = '[data-collapse-piece], .footer-landing .landing-tile';
const ACTIVE = 'page-collapse-active';
const PROTECTED = '.site-header, nav, .skip-link, .hero-art, .deployed-top, .top-toy';
const STRUCTURAL = '#top, main, .hero-stage, .hero-scroll-scene, .footer-landing, .landing-tiles';
const MAX_PIECES = 48;

// Interface: mount <PageCollapse /> anywhere inside #top. Mark DISJOINT content
// wrappers data-collapse-piece (no value needed). Suggested existing nodes:
// .hero-name, .hero-bottom, .work > .section-label, .section-heading, .project,
// .about-layout, .about-facts, .experience-intro, .experience-row,
// .community-intro, .community-row, .contact-content > h2, .footer-bottom.
// Do not mark sections containing the sticky hero, nav or interactive artwork.
// Existing landing tiles are decorative, safe bottom-of-page pieces; their
// independent translate/rotate effect leaves FooterLanding's scaleY alone.
// No inline style, position, DOM content or link attribute is changed.
function selectPieces(root, view) {
  const candidates = [...root.querySelectorAll(PIECE)].filter(node => {
    // Select at activation, not installation: three fast pushes often take
    // the reader to the footer. Hidden archive rows must not animate either.
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= view.innerHeight || rect.right <= 0 || rect.left >= view.innerWidth) return false;
    const style = view.getComputedStyle(node);
    if (style.visibility === 'hidden' || style.visibility === 'collapse' || style.display === 'none') return false;
    if (node.matches(STRUCTURAL) || node.closest(PROTECTED) || node.querySelector(`${PROTECTED}, ${STRUCTURAL}`)) return false;
    if (['fixed', 'sticky'].includes(view.getComputedStyle(node).position)) return false;
    // A transformed wrapper would capture fixed children or move sticky ones.
    if ([...node.querySelectorAll('*')].some(child => ['fixed', 'sticky'].includes(view.getComputedStyle(child).position))) return false;
    return true;
  });
  return candidates.filter(node => !candidates.some(parent => parent !== node && parent.contains(node))).slice(0, MAX_PIECES);
}

// Exported for isolated lifecycle tests; React owns installation in production.
export function installPageCollapse(root, view = window) {
  if (!root) return () => {};
  const doc = root.ownerDocument;
  const gestures = createCollapseGesture();
  const animations = [];
  const listeners = [];
  let addedClass = false;
  let previousY = view.scrollY;
  let touch = null;
  const atBottom = () => (doc.scrollingElement || doc.documentElement).scrollHeight - view.innerHeight - view.scrollY <= 4;
  const enabled = () => !doc.hidden;
  // Upward movement: restore the page but keep counted swipes.
  const release = () => {
    gestures.release();
    animations.splice(0).forEach(animation => animation.cancel());
    if (addedClass) root.classList.remove(ACTIVE);
    addedClass = false;
  };
  const reset = () => {
    gestures.reset();
    animations.splice(0).forEach(animation => animation.cancel());
    if (addedClass) root.classList.remove(ACTIVE);
    addedClass = false;
  };
  const collapse = () => {
    if (!enabled()) return;
    // Replace, never stack: cancel first so selection uses the original
    // positions, even when the previous fall moved a piece out of view.
    animations.splice(0).forEach(animation => animation.cancel());
    const pieces = selectPieces(root, view).filter(node => typeof node.animate === 'function');
    if (!pieces.length) { reset(); return; }
    addedClass ||= !root.classList.contains(ACTIVE);
    root.classList.add(ACTIVE);
    try {
      pieces.forEach((piece, index) => {
        const side = index % 2 ? -1 : 1;
        const drop = Math.max(140, Math.min(360, view.innerHeight * 0.4)) + (index % 5) * 18;
        // Shared first 300ms shakes all pieces in sync, then each drops/settles.
        // Additive individual properties also preserve an existing translate
        // or rotate on the piece itself, not just its transform/child motion.
        animations.push(piece.animate([
          { translate: '0px 0px', rotate: '0deg', offset: 0 },
          { translate: '-14px 0px', rotate: '-1deg', offset: 0.05 },
          { translate: '14px 3px', rotate: '1deg', offset: 0.10 },
          { translate: '-11px -2px', rotate: '-0.8deg', offset: 0.16 },
          { translate: '11px 2px', rotate: '0.8deg', offset: 0.22 },
          { translate: '0px 0px', rotate: '0deg', offset: 0.28, easing: 'cubic-bezier(.55,0,1,.45)' },
          { translate: `${side * 10}px ${drop}px`, rotate: `${side * (2 + index % 4)}deg`, offset: 0.76 },
          { translate: `${side * 8}px ${drop - 8}px`, rotate: `${side * (1 + index % 4)}deg`, offset: 0.88 },
          { translate: `${side * 10}px ${drop}px`, rotate: `${side * (2 + index % 4)}deg`, offset: 1 },
        ], { duration: 1100, iterations: 1, fill: 'forwards', easing: 'ease-out', composite: 'add' }));
      });
      gestures.markCollapsed();
    } catch {
      // Unsupported animation properties must not leave partial page state.
      reset();
    }
  };
  const input = (delta, kind) => {
    if (delta < 0) { release(); return; }
    if (!enabled()) return;
    if (gestures.push(delta, view.performance.now(), kind) === 'collapse') collapse();
  };
  const wheel = event => {
    if (event.ctrlKey || event.metaKey || event.defaultPrevented) return; // pinch zoom / consumed toy input
    const { x, y } = wheelPixels(event, view.innerHeight);
    if (Math.abs(y) <= Math.abs(x)) return;
    if (y < 0) { release(); return; }
    // Only pushes against the floor count; ordinary scrolling never does.
    if (atBottom()) input(y, 'wheel');
  };
  const scroll = () => {
    const y = view.scrollY;
    const delta = y - previousY;
    previousY = y;
    if (delta < 0) release();
  };
  const touchStart = event => {
    touch = null;
    if (event.touches.length !== 1 || event.defaultPrevented || event.target?.closest?.('.play-square, .deployed-top')) return;
    const point = event.touches[0];
    touch = { id: point.identifier, x: point.clientX, y: point.clientY };
    gestures.beginTouch();
  };
  const touchMove = event => {
    if (!touch || event.touches.length !== 1 || event.defaultPrevented) { touch = null; return; }
    const point = event.touches[0];
    if (point.identifier !== touch.id) { touch = null; return; }
    const dy = touch.y - point.clientY;
    const dx = touch.x - point.clientX;
    touch = { id: point.identifier, x: point.clientX, y: point.clientY };
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) release();
      else if (atBottom()) input(dy, 'touch');
    }
  };
  const clearTouch = () => { touch = null; };
  const configure = () => { reset(); clearTouch(); previousY = view.scrollY; };
  const key = event => {
    if (['Escape', 'ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey)) reset();
    if (event.key !== '\\' || event.repeat || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (doc.designMode?.toLowerCase() === 'on') return;
    const path = event.composedPath?.() ?? [event.target];
    if (path.some(node => node?.isContentEditable || node?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))) return;
    collapse();
  };
  const listen = (target, name, callback, options) => {
    target.addEventListener(name, callback, options);
    listeners.push(() => target.removeEventListener(name, callback, options));
  };
  listen(view, 'wheel', wheel, { passive: true });
  listen(view, 'scroll', scroll, { passive: true });
  listen(view, 'touchstart', touchStart, { passive: true });
  listen(view, 'touchmove', touchMove, { passive: true });
  listen(view, 'touchend', clearTouch, { passive: true });
  listen(view, 'touchcancel', configure, { passive: true });
  listen(view, 'keydown', key);
  listen(view, 'resize', configure);
  listen(doc, 'visibilitychange', configure);
  listen(root, 'focusin', reset); // tabbing to a fallen link restores it immediately
  listen(root, 'click', reset); // normal links/disclosures remain usable
  return () => { listeners.splice(0).forEach(remove => remove()); configure(); };
}

export function usePageCollapse() {
  useEffect(() => installPageCollapse(document.getElementById('top')), []);
}

export default function PageCollapse() {
  usePageCollapse();
  return null;
}
