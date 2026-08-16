import { useLayoutEffect, useRef, useState } from 'react';
import { getPeelBrushCellIndices, PEEL_COLS, PEEL_REVEAL_MS } from '../data/peel';

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable="true"]';

function isInteractiveTarget(event) {
  return Boolean(event.target.closest(INTERACTIVE_SELECTOR));
}

export default function usePeelInteraction({ gridRef, onPeelChange }) {
  const dragRef = useRef({ active: false });
  const resetTimerRef = useRef(null);
  const revealedRef = useRef(new Set());
  const animStartTimesRef = useRef(new Map());
  const pendingPointerRef = useRef(null);
  const peelRafRef = useRef(0);
  const metricsRef = useRef({ cellSize: 0, rowCount: 0, rect: null });
  const onPeelChangeRef = useRef(onPeelChange);

  const [dragging, setDragging] = useState(false);

  onPeelChangeRef.current = onPeelChange;

  const notifyChange = () => {
    onPeelChangeRef.current?.();
  };

  const updateMetrics = () => {
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const cellSize = rect.width / PEEL_COLS;
    const rowCount = cellSize > 0 ? Math.round(rect.height / cellSize) : 0;
    metricsRef.current = { cellSize, rowCount, rect };
  };

  useLayoutEffect(() => {
    updateMetrics();
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (peelRafRef.current) cancelAnimationFrame(peelRafRef.current);
    };
  }, [gridRef]);

  const applyPeel = (clientX, clientY) => {
    updateMetrics();
    const { cellSize, rowCount, rect } = metricsRef.current;
    if (!rect || cellSize <= 0 || rowCount <= 0) return;

    const indices = getPeelBrushCellIndices(clientX, clientY, rect, cellSize, rowCount);
    if (indices.length === 0) return;

    const next = revealedRef.current;
    const nextAnim = animStartTimesRef.current;
    const now = performance.now();
    let changed = false;

    for (const index of indices) {
      if (next.has(index)) continue;
      changed = true;
      next.add(index);
      nextAnim.set(index, now);
    }

    if (!changed) return;
    notifyChange();
  };

  const peelAt = (clientX, clientY) => {
    pendingPointerRef.current = { clientX, clientY };
    if (peelRafRef.current) return;

    peelRafRef.current = requestAnimationFrame(() => {
      peelRafRef.current = 0;
      const point = pendingPointerRef.current;
      pendingPointerRef.current = null;
      if (point) applyPeel(point.clientX, point.clientY);
    });
  };

  const scheduleReset = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      revealedRef.current = new Set();
      animStartTimesRef.current = new Map();
      resetTimerRef.current = null;
      notifyChange();
    }, PEEL_REVEAL_MS);
  };

  const handlePointerDown = (event) => {
    if (isInteractiveTarget(event)) return;

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current.active = true;
    setDragging(true);
    peelAt(event.clientX, event.clientY);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current.active) return;
    peelAt(event.clientX, event.clientY);
  };

  const endDrag = (event) => {
    if (!dragRef.current.active) return;

    dragRef.current.active = false;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    scheduleReset();
  };

  return {
    revealedRef,
    animStartTimesRef,
    dragging,
    zoneHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
