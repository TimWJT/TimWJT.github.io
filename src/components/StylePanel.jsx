import { useState } from 'react';
import { usePalette } from '../context/PaletteContext';
import { useMotionPreset } from '../context/MotionContext';

function CycleRow({ label, name, description, index, total, onPrev, onNext, countLabel, badge }) {
  return (
    <div className="panel-row">
      <p className="panel-row-label">{label}</p>
      <div className="panel-controls">
        <button type="button" onClick={onPrev} aria-label={`Previous ${label.toLowerCase()}`}>
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
        <button type="button" onClick={onNext} aria-label={`Next ${label.toLowerCase()}`}>
          →
        </button>
      </div>
    </div>
  );
}

export default function StylePanel() {
  const palette = usePalette();
  const motionCtx = useMotionPreset();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`style-panel ${expanded ? 'is-expanded' : ''}`}>
      <CycleRow
        label="Colors"
        name={palette.palette.name}
        description={palette.palette.description}
        index={palette.index}
        total={palette.total}
        onPrev={palette.prev}
        onNext={palette.next}
        countLabel={`${palette.index + 1} / ${palette.total}`}
      />

      <CycleRow
        label="Motion"
        name={motionCtx.motion.name}
        description={motionCtx.motion.description}
        index={motionCtx.index}
        total={motionCtx.total}
        onPrev={motionCtx.prev}
        onNext={motionCtx.next}
        countLabel={`${motionCtx.index + 1} / ${motionCtx.total}`}
        badge={motionCtx.motion.experimental ? 'Try' : null}
      />

      <div className="palette-swatches" role="list" aria-label="Jump to color palette">
        {palette.palettes.map((p) => (
          <button
            key={p.id}
            type="button"
            role="listitem"
            className={`swatch ${p.id === palette.palette.id ? 'active' : ''}`}
            aria-label={p.name}
            aria-pressed={p.id === palette.palette.id}
            onClick={() => palette.setById(p.id)}
            style={{
              background: `linear-gradient(135deg, ${p.vars['--bg']}, ${p.vars['--accent']})`,
            }}
          />
        ))}
      </div>

      <button
        type="button"
        className="panel-expand"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? 'Hide motion list' : `Browse all ${motionCtx.total} motion styles`}
      </button>

      {expanded && (
        <ul className="motion-list" aria-label="All motion styles">
          {motionCtx.motionPresets.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                className={`motion-option ${preset.id === motionCtx.motion.id ? 'active' : ''}`}
                onClick={() => motionCtx.setById(preset.id)}
                aria-pressed={preset.id === motionCtx.motion.id}
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
