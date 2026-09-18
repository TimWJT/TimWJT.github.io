import { useState } from 'react';
import './NameLetters.css';

function Letter({ letter, word, position }) {
  const [presses, setPresses] = useState(0);
  return (
    <button
      className="name-letter"
      type="button"
      data-letter={letter}
      data-font={presses % 3}
      aria-label={`${letter}, letter ${position + 1} of ${word}. Change typeface.`}
      onClick={() => setPresses(value => value + 1)}
    >
      <span key={presses} className="name-letter-glyph" data-flip={presses > 0 ? 'true' : 'false'}>{letter}</span>
    </button>
  );
}

export default function NameLetters() {
  const letters = word => [...word].map((letter, position) => (
    <Letter key={position} letter={letter} word={word} position={position} />
  ));
  return (
    <h1 id="hero-title" className="hero-name" aria-label="Tim Wang" data-collapse-piece>
      <span className="name-word name-word-sans">{letters('Tim')}</span>
      <em className="name-word name-word-serif">{letters('Wang')}</em>
    </h1>
  );
}
