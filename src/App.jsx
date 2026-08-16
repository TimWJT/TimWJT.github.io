import { PaletteProvider } from './context/PaletteContext';
import { MotionProvider } from './context/MotionContext';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Experience from './components/Experience';
import Projects from './components/Projects';
import Leadership from './components/Leadership';
import Contact from './components/Contact';
import StylePanel from './components/StylePanel';
import MotionLayer from './motion/MotionLayer';
import PeelSection from './motion/PeelSection';
import './index.css';

export default function App() {
  return (
    <PaletteProvider>
      <MotionProvider>
        <MotionLayer />
        <a className="skip-link" href="#about">
          Skip to content
        </a>
        <div className="site">
          <Nav />
          <div id="top">
            <PeelSection zone="fold" strategy="cells" fillViewport>
              <Hero peelLayer />
            </PeelSection>
          </div>
          <main id="main">
            <About />
            <Experience />
            <Projects />
            <Leadership />
            <Contact />
          </main>
          <StylePanel />
        </div>
      </MotionProvider>
    </PaletteProvider>
  );
}
