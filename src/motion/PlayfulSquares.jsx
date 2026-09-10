import { useEffect, useRef } from 'react';
import { notifyBlockMotion, registerBlock } from './blockWorld';

const squares = [
  { color: 'blue', x: 435, y: 56, size: 195 },
  { color: 'outline', x: 504, y: 153, size: 220 },
  { color: 'orange', x: 651, y: 279, size: 109 },
  { color: 'yellow', x: 380, y: 325, size: 74 },
];
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export default function PlayfulSquares() {
  const svgRef = useRef(null);
  const api = useRef({});

  useEffect(() => {
    const svg = svgRef.current;
    const nodes = [...svg.querySelectorAll('.play-square')];
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const states = squares.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, drag: null }));
    let frame = 0;
    let previousTime = null;
    let previousScroll = window.scrollY;
    const draw = index => {
      const state = states[index];
      const square = squares[index];
      const transform = `translate(${state.x} ${state.y}) rotate(${state.angle} ${square.x + square.size / 2} ${square.y + square.size / 2})`;
      if (nodes[index].getAttribute('transform') !== transform) {
        nodes[index].setAttribute('transform', transform);
        notifyBlockMotion();
      }
    };
    const bound = index => {
      const state = states[index];
      const square = squares[index];
      state.x = clamp(state.x, -square.x + 16, 884 - square.x - square.size);
      state.y = clamp(state.y, -square.y + 16, 584 - square.y - square.size);
    };
    const tick = time => {
      frame = 0;
      const dt = Math.min(0.032, previousTime === null ? 1 / 60 : (time - previousTime) / 1000);
      previousTime = time;
      let moving = false;
      states.forEach((state, index) => {
        if (state.drag) return;
        state.vx += (-state.x * 9 - state.vx * 4.8) * dt;
        state.vy += (-state.y * 9 - state.vy * 4.8) * dt;
        state.spin += (-state.angle * 12 - state.spin * 5) * dt;
        state.x += state.vx * dt;
        state.y += state.vy * dt;
        state.angle += state.spin * dt;
        bound(index);
        if (Math.abs(state.x) + Math.abs(state.y) + Math.abs(state.vx) + Math.abs(state.vy) + Math.abs(state.angle) + Math.abs(state.spin) > 0.2) moving = true;
        else Object.assign(state, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0 });
        draw(index);
      });
      if (moving && !preference.matches && !document.hidden) frame = window.requestAnimationFrame(tick);
      else previousTime = null;
    };
    const wake = () => {
      if (!frame && !preference.matches && !document.hidden) frame = window.requestAnimationFrame(tick);
    };
    const unregister = squares.map((square, index) => registerBlock(nodes[index], {
      sample() {
        const matrix = nodes[index].getScreenCTM?.();
        const parent = nodes[index].parentElement.getScreenCTM?.();
        if (!matrix || !parent) return null;
        const transform = (x, y) => ({ x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f });
        const center = transform(square.x + square.size / 2, square.y + square.size / 2);
        const state = states[index];
        return {
          vertices: [[square.x, square.y], [square.x + square.size, square.y], [square.x + square.size, square.y + square.size], [square.x, square.y + square.size]].map(([x, y]) => transform(x, y)),
          cx: center.x, cy: center.y,
          vx: parent.a * state.vx + parent.c * state.vy,
          vy: parent.b * state.vx + parent.d * state.vy,
          omega: state.spin * Math.PI / 180,
          inverseMass: state.drag || preference.matches ? 0 : 1 / 5,
        };
      },
      impulse(x, y, contact) {
        const state = states[index];
        if (state.drag || preference.matches) return;
        const parent = nodes[index].parentElement.getScreenCTM?.();
        const matrix = nodes[index].getScreenCTM?.();
        if (!parent || !matrix) return;
        const determinant = parent.a * parent.d - parent.b * parent.c;
        if (Math.abs(determinant) < 0.00001) return;
        state.vx = clamp(state.vx + (parent.d * x - parent.c * y) / determinant / 5, -800, 800);
        state.vy = clamp(state.vy + (-parent.b * x + parent.a * y) / determinant / 5, -800, 800);
        const cx = matrix.a * (square.x + square.size / 2) + matrix.c * (square.y + square.size / 2) + matrix.e;
        const cy = matrix.b * (square.x + square.size / 2) + matrix.d * (square.y + square.size / 2) + matrix.f;
        const size = square.size * Math.hypot(matrix.a, matrix.b);
        const torque = (contact.x - cx) * y - (contact.y - cy) * x;
        state.spin = clamp(state.spin + torque / (5 * size * size / 6) * 180 / Math.PI, -180, 180);
        wake();
      },
    }));
    const point = (event, index) => {
      const matrix = nodes[index].parentElement.getScreenCTM?.();
      if (matrix) return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const rect = svg.getBoundingClientRect();
      const scale = Math.min(rect.width / 900, rect.height / 600) || 1;
      return { x: (event.clientX - rect.left - (rect.width - 900 * scale) / 2) / scale, y: (event.clientY - rect.top - (rect.height - 600 * scale) / 2) / scale };
    };
    const release = (index, pointerId, cancel = false) => {
      const state = states[index];
      if (!state.drag || state.drag.id !== pointerId) return;
      const tapped = state.drag.distance < 5;
      state.drag = null;
      nodes[index].classList.remove('is-dragging');
      if (nodes[index].hasPointerCapture?.(pointerId)) nodes[index].releasePointerCapture(pointerId);
      if (cancel) Object.assign(state, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0 });
      else if (tapped && !preference.matches) Object.assign(state, { vx: 65, vy: -190, spin: 110 });
      draw(index);
      wake();
    };
    api.current = {
      enter(index) {
        if (preference.matches || states[index].drag) return;
        states[index].vy -= 35;
        states[index].spin += 18;
        wake();
      },
      down(index, event) {
        if (event.button !== 0 || states[index].drag) return;
        const cursor = point(event, index);
        const state = states[index];
        state.drag = { id: event.pointerId, x: cursor.x, y: cursor.y, time: event.timeStamp, distance: 0 };
        state.vx = state.vy = state.spin = 0;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.currentTarget.focus({ preventScroll: true });
        nodes[index].classList.add('is-dragging');
      },
      move(index, event) {
        const state = states[index];
        if (state.drag?.id !== event.pointerId) return;
        const cursor = point(event, index);
        const dx = cursor.x - state.drag.x;
        const dy = cursor.y - state.drag.y;
        const dt = Math.max(0.008, (event.timeStamp - state.drag.time) / 1000);
        state.x += dx;
        state.y += dy;
        state.vx = clamp(dx / dt, -600, 600);
        state.vy = clamp(dy / dt, -600, 600);
        if (!preference.matches) {
          state.angle = clamp(state.angle + dx * 0.045, -18, 18);
          state.spin = state.vx * 0.12;
        }
        state.drag = { id: event.pointerId, x: cursor.x, y: cursor.y, time: event.timeStamp, distance: state.drag.distance + Math.abs(dx) + Math.abs(dy) };
        bound(index);
        draw(index);
      },
      up: (index, event) => release(index, event.pointerId),
      cancel: (index, event) => release(index, event.pointerId, true),
      key(index, event) {
        const state = states[index];
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'Home', 'Escape'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Escape' || event.key === 'Home') {
          if (state.drag) release(index, state.drag.id, true);
          Object.assign(state, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0 });
        } else {
          state.x += event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0;
          state.y += event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0;
          if (event.key === 'Enter' || event.key === ' ') {
            state.y -= 18;
            if (!preference.matches) { state.vy = -150; state.spin = 95; }
          }
        }
        bound(index);
        draw(index);
        wake();
      },
    };
    const scroll = () => {
      const delta = clamp(window.scrollY - previousScroll, -100, 100);
      previousScroll = window.scrollY;
      const bounds = svg.getBoundingClientRect();
      if (preference.matches || document.hidden || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      states.forEach((state, index) => {
        if (!state.drag) {
          state.vy += delta * (index + 1) * 0.23;
          state.spin += delta * (index % 2 ? -0.14 : 0.14);
        }
      });
      wake();
    };
    const configure = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      if (preference.matches || document.hidden) {
        states.forEach((state, index) => {
          if (state.drag) release(index, state.drag.id, true);
          state.vx = state.vy = state.spin = 0;
        });
      } else wake();
    };
    preference.addEventListener('change', configure);
    document.addEventListener('visibilitychange', configure);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      api.current = {};
      unregister.forEach(remove => remove());
      window.cancelAnimationFrame(frame);
      preference.removeEventListener('change', configure);
      document.removeEventListener('visibilitychange', configure);
      window.removeEventListener('scroll', scroll);
    };
  }, []);

  return <div className="hero-art">
    <svg ref={svgRef} className="hero-geometry" viewBox="0 0 900 600" role="group" aria-label="Play with the squares">
      {squares.map((square, index) => <g key={square.color} className="square-scroll" data-cx={square.x + square.size / 2} data-cy={square.y + square.size / 2}>
        <g className="play-square" role="button" tabIndex="0"
        aria-label={`${square.color === 'outline' ? 'Outlined' : square.color} square. Drag to move, arrow keys to nudge, Enter to toss, Home to reset.`}
        onPointerEnter={() => api.current.enter?.(index)} onPointerDown={event => api.current.down?.(index, event)} onPointerMove={event => api.current.move?.(index, event)}
        onPointerUp={event => api.current.up?.(index, event)} onPointerCancel={event => api.current.cancel?.(index, event)}
        onLostPointerCapture={event => api.current.cancel?.(index, event)} onKeyDown={event => api.current.key?.(index, event)}>
        <rect className={`square-${square.color}`} x={square.x} y={square.y} width={square.size} height={square.size} />
      </g></g>)}
    </svg>
  </div>;
}
