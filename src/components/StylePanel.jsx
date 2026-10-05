import { useState } from 'react';
import { usePalette } from '../context/PaletteContext';
import { useMotionPreset } from '../context/MotionContext';
import useDebugUnlock from '../hooks/useDebugUnlock';
import { useVersion } from '../context/VersionContext';
import './StylePanel.css';

function CycleRow({ label, name, description, index, total, onPrev, onNext, countLabel, badge }) {
  return (
    <div className="panel-row">
      <p className="panel-row-label">{label}</p>
      <div className="panel-controls">
        <button
          type="button"
          className="panel-control"
          onClick={onPrev}
          aria-label={`Previous ${label.toLowerCase()}`}
        >
          ←
        </button>
        <div className="panel-info">
          <strong>
            {name}
            {badge && <span className="motion-tag">{badge}</span>}
          </strong>
          <span>{description}</span>
          <span className="panel-count">{countLabel}</span>
        </div>
        <button
          type="button"
          className="panel-control"
          onClick={onNext}
          aria-label={`Next ${label.toLowerCase()}`}
        >
          →
        </button>
      </div>
    </div>
  );
}

// A swatch is drawn from the palette's own two tokens, so it shows the theme it
// selects. The literals are the cream :root values, and only for a palette
// that arrives without them: a missing key used to be inlined as the literal
// text "undefined" inside the gradient.
const swatchGradient = (vars) =>
  `linear-gradient(135deg, ${vars?.['--paper'] ?? 'var(--paper, #f5f4ed)'}, ${
    vars?.['--accent'] ?? 'var(--accent, #64704e)'
  })`;

export default function StylePanel() {
  const palette = usePalette();
  const motionCtx = useMotionPreset();
  const [expanded, setExpanded] = useState(false);
  const [unlocked, setUnlocked] = useDebugUnlock();
  const { version, toggle: toggleVersion } = useVersion();

  // The colours row has to survive a provider that reports the shipped cream
  // design as a "Base" entry instead of as "no palette selected", so nothing
  // here may assume palette, index or palettes is present. When the site is
  // showing its own design the row says Base plainly rather than pretending one
  // of the six is selected.
  const palettes = palette.palettes ?? [];
  const current = palette.palette;
  const isBase = Boolean(palette.isBase ?? current?.isBase ?? current?.id === 'base');
  // Where the current theme sits among the six, counted from the array rather
  // than from `index`: the providers disagree about what index 0 means (one
  // numbers the six from 0, the other spends 0 on the base design), and the
  // position in `palettes` is the only reading both agree on.
  const position = palettes.findIndex((entry) => entry.id === current?.id) + 1;
  const countLabel = isBase
    ? 'Base'
    : `${position > 0 ? position : (palette.index ?? 0) + 1} / ${palette.total ?? palettes.length}`;

  // Debug-only tool: hidden from visitors. See src/hooks/useDebugUnlock.js.
  if (!unlocked) return null;

  const motionPresets = motionCtx.motionPresets ?? [];
  const motionTotal = motionCtx.total ?? motionPresets.length;

  return (
    <div className={`style-panel ${expanded ? 'is-expanded' : ''}`}>
      <div className="panel-head">
        <p className="panel-title">Debug: design</p>
        <button
          type="button"
          className="panel-close panel-control"
          onClick={() => setUnlocked(false)}
          aria-label="Hide design panel"
        >
          ✕
        </button>
      </div>

      <div className="panel-row">
        <p className="panel-row-label">Hero</p>
        <button type="button" className="panel-version panel-control" onClick={toggleVersion}>
          <strong>{version === 'physics' ? 'Physics (v2)' : 'Classic'}</strong>
          <span>{version === 'physics' ? 'Switch back to classic' : 'Switch to physics hero'}</span>
        </button>
      </div>

      <CycleRow
        label="Colors"
        name={current?.name ?? 'Base'}
        description={current?.description ?? 'The shipped cream design, not a palette.'}
        index={palette.index}
        total={palette.total}
        onPrev={palette.prev}
        onNext={palette.next}
        countLabel={countLabel}
        badge={isBase ? 'Base' : null}
      />

      <CycleRow
        label="Motion"
        name={motionCtx.motion?.name ?? 'Motion'}
        description={motionCtx.motion?.description ?? ''}
        index={motionCtx.index}
        total={motionTotal}
        onPrev={motionCtx.prev}
        onNext={motionCtx.next}
        countLabel={`${(motionCtx.index ?? 0) + 1} / ${motionTotal}`}
        badge={motionCtx.motion?.experimental ? 'Try' : null}
      />

      <div className="palette-swatches" role="list" aria-label="Jump to color palette">
        {palettes.map((p) => (
          <button
            key={p.id}
            type="button"
            role="listitem"
            className={`swatch panel-control ${!isBase && p.id === current?.id ? 'active' : ''}`}
            aria-label={p.name ?? p.id}
            aria-pressed={!isBase && p.id === current?.id}
            onClick={() => palette.setById(p.id)}
            style={{ background: swatchGradient(p.vars) }}
          />
        ))}
      </div>

      <button
        type="button"
        className="panel-expand panel-control"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? 'Hide motion list' : `Browse all ${motionTotal} motion styles`}
      </button>

      {expanded && (
        <ul className="motion-list" aria-label="All motion styles">
          {motionPresets.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                className={`motion-option panel-control ${
                  preset.id === motionCtx.motion?.id ? 'active' : ''
                }`}
                onClick={() => motionCtx.setById(preset.id)}
                aria-pressed={preset.id === motionCtx.motion?.id}
              >
                <strong>
                  {preset.name}
                  {preset.experimental && <span className="motion-tag">Try</span>}
                </strong>
                <span>{preset.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
