import { useEffect, useRef } from 'react';

const NODE_COUNT = 48;
const LINK_DISTANCE = 140;

function accentRgb() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  if (accent.startsWith('#')) {
    const hex = accent.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }
  return { r: 107, g: 159, b: 255 };
}

export default function AmbientLattice() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const nodesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let raf = 0;
    let w = 0;
    let h = 0;
    let t = 0;

    const init = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodesRef.current = Array.from({ length: NODE_COUNT }, (_, i) => {
        const col = i % 8;
        const row = Math.floor(i / 8);
        const homeX = (col / 7) * w + (Math.random() - 0.5) * 80;
        const homeY = (row / 5) * h + (Math.random() - 0.5) * 80;
        return {
          homeX,
          homeY,
          x: homeX,
          y: homeY,
          phase: Math.random() * Math.PI * 2,
          amp: 12 + Math.random() * 18,
        };
      });
    };

    const step = () => {
      t += 0.008;
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;
      const { r, g, b } = accentRgb();

      for (const node of nodes) {
        const ox = Math.sin(t + node.phase) * node.amp;
        const oy = Math.cos(t * 0.9 + node.phase * 1.3) * node.amp * 0.7;
        let x = node.homeX + ox;
        let y = node.homeY + oy;

        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 160) {
          const force = (160 - dist) * 0.018;
          x += (dx / (dist || 1)) * force;
          y += (dy / (dist || 1)) * force;
        }

        node.x = x;
        node.y = y;
      }

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.14;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };

    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onResize = () => init();

    init();
    step();
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-lattice" aria-hidden="true" />;
}
