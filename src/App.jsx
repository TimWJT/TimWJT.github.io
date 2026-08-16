import { lazy, Suspense } from 'react';
import { PaletteProvider } from './context/PaletteContext';
import { MotionProvider } from './context/MotionContext';
import { VersionProvider, useVersion } from './context/VersionContext';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Experience from './components/Experience';
import Projects from './components/Projects';
import Leadership from './components/Leadership';
import Contact from './components/Contact';
import StylePanel from './components/StylePanel';
import MotionLayer from './motion/MotionLayer';
import './index.css';

// Matter.js is ~90kB: only pulled in when the physics hero is actually shown.
const PhysicsHero = lazy(() => import('./motion/PhysicsHero'));

function ActiveHero() {
  const { version } = useVersion();

  if (version === 'physics') {
    return (
      <Suspense fallback={<Hero />}>
        <PhysicsHero />
      </Suspense>
    );
  }

  return <Hero />;
}

export default function App() {
  return (
    <PaletteProvider>
      <MotionProvider>
        <VersionProvider>
          <MotionLayer />
          <a className="skip-link" href="#about">
            Skip to content
          </a>
          <div className="site">
            <Nav />
            <ActiveHero />
            <main id="main">
              <About />
              <Experience />
              <Projects />
              <Leadership />
              <Contact />
            </main>
            <StylePanel />
          </div>
        </VersionProvider>
      </MotionProvider>
    </PaletteProvider>
  );
}
