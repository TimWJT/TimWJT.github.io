import HeroCopy from '../motion/HeroCopy';

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-stage">
        <div className="hero-content">
          <HeroCopy animate />
        </div>
      </div>
    </section>
  );
}
