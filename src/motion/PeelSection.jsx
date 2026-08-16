import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMotionPreset } from '../context/MotionContext';
import { PEEL_COLS } from '../data/peel';
import { applyMaskToLayer, paintPeelMasks, releaseMaskLayer } from './peelMask';
import usePeelInteraction from './usePeelInteraction';

function PeelFrame({ children }) {
  return <div className="peel-content-frame">{children}</div>;
}

function usePeelMetrics(contentRef, { fillViewport = false, freeze = false }) {
  const [size, setSize] = useState({ w: 0, h: 0, offsetX: 0 });
  const frozenRef = useRef(null);

  useLayoutEffect(() => {
    const measure = () => {
      if (freeze && frozenRef.current) return;

      const zone = contentRef.current;
      if (!zone) return;

      const sizer = zone.querySelector('.peel-sizer');
      const zoneRect = zone.getBoundingClientRect();
      const contentHeight = sizer?.getBoundingClientRect().height ?? zoneRect.height;

      let height = contentHeight;
      if (fillViewport) {
        const navHeight =
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 60;
        height = Math.max(height, window.innerHeight - navHeight);
      }

      const next = {
        w: document.documentElement.clientWidth,
        h: height,
        offsetX: -zoneRect.left,
      };

      frozenRef.current = next;
      setSize((prev) => {
        if (prev.w === next.w && prev.h === next.h && prev.offsetX === next.offsetX) return prev;
        return next;
      });
    };

    measure();
    if (freeze) return undefined;

    const observer = new ResizeObserver(measure);
    if (contentRef.current) observer.observe(contentRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [contentRef, fillViewport, freeze]);

  const metrics = freeze && frozenRef.current ? frozenRef.current : size;
  const ready = metrics.w > 0 && metrics.h > 0;
  const cellSize = ready ? metrics.w / PEEL_COLS : 0;
  const rowCount = ready ? Math.max(1, Math.ceil(metrics.h / cellSize)) : 0;
  const gridHeight = rowCount * cellSize;

  return { ready, size: metrics, cellSize, rowCount, gridHeight, offsetX: metrics.offsetX };
}

function PeelCellSection({ zone, fillViewport, children }) {
  const contentRef = useRef(null);
  const gridRef = useRef(null);
  const coverRef = useRef(null);
  const revealRef = useRef(null);
  const coverMaskRef = useRef(null);
  const revealMaskRef = useRef(null);
  const rafRef = useRef(0);
  const draggingRef = useRef(false);
  const metricsRef = useRef({ w: 0, gridHeight: 0, rowCount: 0 });
  const peelDataRef = useRef({ revealedRef: null, animStartTimesRef: null });

  const kickRepaintRef = useRef(() => {});

  const { revealedRef, animStartTimesRef, dragging, zoneHandlers } = usePeelInteraction({
    gridRef,
    onPeelChange: () => kickRepaintRef.current(),
  });

  peelDataRef.current = { revealedRef, animStartTimesRef };
  draggingRef.current = dragging;

  const { ready, size, rowCount, gridHeight, offsetX } = usePeelMetrics(contentRef, {
    fillViewport,
    freeze: dragging,
  });

  metricsRef.current = { w: size.w, gridHeight, rowCount };

  const repaint = useCallback(() => {
    if (!ready) return false;

    const { revealedRef: revealed, animStartTimesRef: animStartTimes } = peelDataRef.current;
    if (!revealed || !animStartTimes) return false;

    const stillAnimating = paintPeelMasks({
      coverCanvas: coverMaskRef.current,
      revealCanvas: revealMaskRef.current,
      width: size.w,
      height: gridHeight,
      rowCount,
      revealed: revealed.current,
      animStartTimes: animStartTimes.current,
    });

    applyMaskToLayer(coverRef.current, coverMaskRef.current);
    applyMaskToLayer(revealRef.current, revealMaskRef.current);

    return stillAnimating;
  }, [ready, size.w, gridHeight, rowCount]);

  useLayoutEffect(() => {
    if (!ready) return undefined;

    let active = true;

    const loop = () => {
      if (!active || document.hidden) {
        rafRef.current = 0;
        return;
      }

      const animating = repaint();
      if (draggingRef.current || animating) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = 0;
      }
    };

    const kick = () => {
      if (!active || document.hidden) return;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(loop);
    };

    kickRepaintRef.current = kick;
    kick();

    const onVisibility = () => {
      if (document.hidden) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
        return;
      }
      kick();
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      kickRepaintRef.current = () => {};
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      releaseMaskLayer(coverRef.current);
      releaseMaskLayer(revealRef.current);
    };
  }, [ready, repaint]);

  useLayoutEffect(() => {
    if (!ready) return undefined;
    draggingRef.current = dragging;
    kickRepaintRef.current();
  }, [ready, dragging]);

  useLayoutEffect(() => {
    if (!ready) return undefined;
    const onResize = () => kickRepaintRef.current();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ready]);

  return (
    <div className={`peel-section peel-section--${zone}`}>
      <div
        className={`peel-zone${dragging ? ' peel-zone--dragging' : ''}`}
        ref={contentRef}
        style={
          ready
            ? {
                minHeight: gridHeight,
                width: size.w,
                marginLeft: offsetX,
                maxWidth: 'none',
              }
            : undefined
        }
        {...(ready ? zoneHandlers : {})}
      >
        {/* Measurement-only copy: hidden visually, so keep it out of the a11y
            tree and tab order too. .peel-fallback holds the real copy. */}
        <div
          className="peel-sizer"
          style={ready ? { minHeight: gridHeight } : undefined}
          aria-hidden="true"
          inert={true}
        >
          {!ready && <PeelFrame>{children}</PeelFrame>}
        </div>

        {!ready && (
          <div className="peel-fallback">
            <PeelFrame>{children}</PeelFrame>
          </div>
        )}

        {ready && (
          <>
            <div
              ref={gridRef}
              className="peel-grid-bounds"
              style={{ width: size.w, height: gridHeight }}
              aria-hidden="true"
            />
            <canvas ref={revealMaskRef} className="peel-mask-canvas" aria-hidden="true" />
            <div
              ref={revealRef}
              className={`peel-reveal-layer peel-reveal-tone peel-reveal-tone--${zone}`}
              style={{ width: size.w, height: gridHeight }}
              aria-hidden="true"
              inert={true}
            >
              <PeelFrame>{children}</PeelFrame>
            </div>
            <canvas ref={coverMaskRef} className="peel-mask-canvas" aria-hidden="true" />
            <div
              ref={coverRef}
              className="peel-cover-layer peel-cover-layer--mask"
              style={{ width: size.w, height: gridHeight }}
            >
              <PeelFrame>{children}</PeelFrame>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PeelSection({
  zone = 'fold',
  fillViewport = false,
  children,
}) {
  const { motion: preset } = useMotionPreset();

  if (preset.id === 'still') {
    return (
      <div className={`peel-static peel-section--${zone}`}>
        <PeelFrame>{children}</PeelFrame>
      </div>
    );
  }

  return (
    <PeelCellSection zone={zone} fillViewport={fillViewport}>
      {children}
    </PeelCellSection>
  );
}
