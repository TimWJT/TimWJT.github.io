import { PaletteProvider } from './context/PaletteContext';
import { MotionProvider } from './context/MotionContext';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import Leadership from './components/Leadership';
import Contact from './components/Contact';
import StylePanel from './components/StylePanel';
import MotionLayer from './motion/MotionLayer';
import './index.css';

export default function App() {
  return (
    <PaletteProvider>
      <MotionProvider>
        <MotionLayer />
        <div className="site">
          <Nav />
          <main>
            <Hero />
            <About />
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
