import HeroCopy from '../motion/HeroCopy';

export default function Hero({ peelLayer = false }) {
  if (peelLayer) {
    return (
      <section className="hero">
        <div className="hero-stage">
          <div className="hero-content">
            <HeroCopy staticCopy />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero" id="top">
      <div className="hero-stage">
        <div className="hero-content">
          <HeroCopy variant="default" animate />
        </div>
      </div>
    </section>
  );
}
