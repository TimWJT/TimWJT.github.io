import { useEffect, useRef, useState } from 'react';
import { profile, education, experience, projects, leadership, skills } from './data/content';
import SpinningTop from './motion/SpinningTop';
import FooterLanding from './motion/FooterLanding';
import TouchWord from './motion/TouchWord';
import PlayfulSquares from './motion/PlayfulSquares';
import './index.css';
const Arrow = () => <span aria-hidden="true">↗</span>;
const resume = `${import.meta.env.BASE_URL}${profile.resume}`;
const External = ({ href, children, ...props }) => <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
function Navigation() {
  const [open, setOpen] = useState(false);
  useEffect(() => { const close = event => { if (event.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  return <header className="site-header"><nav className="nav wrap" aria-label="Main navigation"><SpinningTop /><button className="nav-toggle" aria-controls="nav-menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close −' : 'Menu +'}</button><div id="nav-menu" className={`nav-menu ${open ? 'is-open' : ''}`}>{[['projects', 'Work'], ['about', 'About'], ['contact', 'Contact']].map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>)}<External href={resume} className="resume-link">Résumé <Arrow /></External></div></nav></header>;
}
const SectionLabel = ({ number, children }) => <div className="section-label"><span>{number}</span><span>{children}</span></div>;
function Hero() {
  const stageRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!stage || !preference) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const scene = sceneRef.current;
      const bounds = scene.getBoundingClientRect();
      const stageBounds = stage.getBoundingClientRect();
      if (bounds.height <= 0 || bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const distance = Math.max(1, bounds.height - stageBounds.height);
      const progress = Math.min(1, Math.max(0, (90 - bounds.top) / distance));
      stage.style.setProperty('--scene-progress', progress);
      stage.style.setProperty('--name-y', `${progress * -24}px`);
      stage.style.setProperty('--scene-scale', 1 - progress * 0.055);
      stage.querySelectorAll('.square-scroll').forEach((group, index) => {
        const motions = [[-120, 90, -90], [50, -30, 90], [70, 90, 180], [-150, -80, -180]];
        const [x, y, turn] = motions[index];
        group.setAttribute('transform', `translate(${x * progress} ${y * progress}) rotate(${turn * progress} ${group.dataset.cx} ${group.dataset.cy})`);
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const configure = () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.cancelAnimationFrame(frame);
      frame = 0;
      stage.style.removeProperty('--scene-progress');
      stage.style.removeProperty('--name-y');
      stage.style.removeProperty('--scene-scale');
      stage.querySelectorAll('.square-scroll').forEach(group => group.removeAttribute('transform'));
      if (!preference.matches) {
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        update();
      }
    };
    configure();
    preference.addEventListener('change', configure);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      preference.removeEventListener('change', configure);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="hero wrap" aria-labelledby="hero-title">
      <div className="hero-scroll-scene" ref={sceneRef}>
      <div className="hero-stage" ref={stageRef}>
        <PlayfulSquares />
        <h1 id="hero-title" className="hero-name" aria-label="Tim Wang">
          <span>Tim</span><em>Wang</em>
        </h1>
      </div>
      </div>
      <div className="hero-bottom">
        <div className="hero-intro"><p>Software developer.<br />Computing student in Sydney.</p></div>
        <div className="hero-context">
          <p>I make games, build tools, and co-lead<br />the Sydney Computing Society.</p>
        </div>
      </div>
    </section>
  );
}

function Project({ project, index }) {
  return <article className={`project ${index === 0 ? 'project-featured' : ''}`}><div className="project-index">{String(index + 1).padStart(2, '0')}</div><div className="project-body"><div className="project-meta"><span>{project.period}</span><span>{project.stack.slice(0, 3).join(' / ')}</span></div><h3><External href={project.link}>{project.title} <Arrow /></External></h3>{project.result && <p className="project-result">{project.result}</p>}<p className="project-description">{project.description}</p>{project.highlights && <details className="project-details"><summary>Behind the build <span aria-hidden="true">+</span></summary><div className="details-content"><p className="project-context">{project.context}</p><ul>{project.highlights.map(item => <li key={item}>{item}</li>)}</ul></div></details>}{project.actions && <div className="project-actions">{project.actions.map(action => <External className="text-link" key={action.href} href={action.href.startsWith('/') ? `${import.meta.env.BASE_URL}${action.href.slice(1)}` : action.href}>{action.label} <Arrow /></External>)}</div>}</div>{index === 0 && <div className="project-stat" aria-label="First place out of 94 teams"><span className="stat-caption">SUSQUEHANNA × SYNCS</span><div>01<span>/94</span></div><span className="stat-caption">BOT BATTLE · 2026</span></div>}</article>;
}
function Work() {
  return <section id="projects" className="work wrap" aria-labelledby="work-title"><SectionLabel number="01">Selected work</SectionLabel><div className="section-heading"><h2 id="work-title">Things I’ve <em>built.</em></h2></div><div>{projects.slice(0, 3).map((project, index) => <Project key={project.title} project={project} index={index} />)}</div><details className="project-archive"><summary><span>More projects <span className="archive-count">({projects.length - 3})</span></span><span className="archive-toggle" aria-hidden="true">+</span></summary><div>{projects.slice(3).map((project, index) => <Project key={project.title} project={project} index={index + 3} />)}</div></details></section>;
}
function About() {
  return <section id="about" className="about-section" aria-labelledby="about-title"><div className="wrap"><div className="about-layout"><h2 id="about-title">A bit <em>about me.</em></h2><div className="about-copy"><p>I’m Tim, a computing student based in Sydney. I like working on problems where I can see the result: a game character finding its way through a level, a bot choosing its next move, or a tool making someone’s day easier.</p><p>At the University of Sydney, I study Computer Science and Cyber Security. Outside of that, I co-lead the Sydney Computing Society, help run the Gym Society, and play piano.</p><External className="text-link" href={resume}>The full résumé <Arrow /></External></div></div><div className="about-facts"><div className="education"><span className="small-label">Education</span><h3>{education.school}</h3><p>{education.degree}<br />{education.major}</p><p className="muted">2023 — Expected 2027 · WAM 78.88</p></div><div className="skills"><span className="small-label">What I work with</span>{skills.map(group => <div className="skill-group" key={group.label}><h3>{group.label}</h3><p>{group.items.join(' · ')}</p></div>)}</div></div></div></section>;
}
function Experience() {
  return (
    <section id="experience" className="experience-section" aria-labelledby="experience-title">
      <div className="experience wrap">
        <div className="experience-intro">
          <SectionLabel number="03">Experience</SectionLabel>
          <h2 id="experience-title">What I’m<br /><em>working on.</em></h2>
        </div>
        <div className="experience-entries">
          {experience.map((item, index) => <article className="experience-row" key={item.org}>
            <div className="experience-date"><span className="experience-number">0{index + 1}</span>{item.period.replaceAll(' to ', ' — ')}<span>{item.role}</span></div>
            <div>
              <h3>{item.link ? <External href={item.link}>{item.org} <Arrow /></External> : item.org}</h3>
              <p className="experience-context">{item.context}</p>
              {item.highlights.map(text => <p key={text}>{text}</p>)}
              <p className="stack-line">{item.stack.join(' / ')}</p>
            </div>
          </article>)}
        </div>
      </div>
    </section>
  );
}
function Community() {
  return (
    <section id="leadership" className="community-section" aria-labelledby="community-title">
      <div className="community wrap">
        <div className="community-intro">
          <h2 id="community-title">Outside <em>of code.</em></h2>
          <p>I also spend a lot of time running student societies, organising events, and working with sponsors.</p>
        </div>
        <div className="community-grid">
          {leadership.map((org, index) => <article className={`community-row ${index === 0 ? 'community-featured' : ''}`} key={org.org}>
            <div className="community-content">
              <span className="community-number">0{index + 1}</span>
              <h3>{org.link ? <External href={org.link}>{org.org} <Arrow /></External> : org.org}</h3>
              <p className="community-role">{org.roles[0].title}</p>
              <p>{org.roles[0].highlights[0]}</p>
              <details><summary>Roles & contributions <span aria-hidden="true">+</span></summary>
                {org.roles.map(role => <div className="role-block" key={role.title}>
                  <h4>{role.title} <span>{role.period.replaceAll(' to ', ' — ')}</span></h4>
                  <ul>{role.highlights.map(text => <li key={text}>{text}</li>)}</ul>
                </div>)}
              </details>
            </div>
            {index === 0 && <div className="community-stat"><strong>5,000<span>+</span></strong><span>SYNCS members</span><span>A team of 54 students</span></div>}
          </article>)}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return <footer id="contact" className="contact">
    <div className="wrap contact-content">
      <h2>Get in <TouchWord /></h2>
      <nav className="contact-links" aria-label="Contact and profiles">
        <a className="contact-email" href={`mailto:${profile.email}`}><span>{profile.email}</span><Arrow /></a>
        <External href={profile.links.github}>GitHub <Arrow /></External>
        <External href={profile.links.linkedin}>LinkedIn <Arrow /></External>
        <External href={resume}>Résumé <Arrow /></External>
      </nav>
      <div className="footer-bottom"><span className="wordmark">tim wang</span><span>Sydney, Australia</span></div>
    </div>
    <FooterLanding />
  </footer>;
}

export default function App() { return <div id="top"><a className="skip-link" href="#main">Skip to content</a><Navigation /><main id="main"><Hero /><Work /><About /><Experience /><Community /></main><Contact /></div>; }
