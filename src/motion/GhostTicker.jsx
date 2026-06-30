import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

const WORDS = [
  'GDScript',
  'Python',
  'SYNCS',
  'pathfinding',
  'state machines',
  'Godot',
  'events',
  'algorithms',
  'community',
  'Java',
];

export default function GhostTicker() {
  const trackRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const spans = track.querySelectorAll('.ghost-word');
    const anim = animate(spans, {
      opacity: [0.08, 0.22, 0.08],
      translateY: [-4, 4, -4],
      duration: () => 4000 + Math.random() * 3000,
      delay: stagger(180, { from: 'center' }),
      loop: true,
      alternate: true,
      ease: 'inOutSine',
    });

    return () => anim.pause();
  }, []);

  const row = WORDS.concat(WORDS);

  return (
    <div className="ghost-ticker" aria-hidden="true">
      <div ref={trackRef} className="ghost-ticker-track">
        {row.map((word, i) => (
          <span key={`${word}-${i}`} className="ghost-word">
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
