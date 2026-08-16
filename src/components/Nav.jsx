import { useEffect, useState } from 'react';
import { profile } from '../data/content';
import SmartLink from '../motion/SmartLink';

const links = [
  { href: '#about', label: 'About' },
  { href: '#experience', label: 'Experience' },
  { href: '#projects', label: 'Projects' },
  { href: '#leadership', label: 'Leadership' },
  { href: '#contact', label: 'Contact' },
];

const sectionIds = links.map((l) => l.href.slice(1));

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <nav className="nav" aria-label="Main">
      <SmartLink href="#top" className="nav-logo" onClick={() => setOpen(false)}>
        TW
      </SmartLink>

      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="nav-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={open ? 'nav-burger is-open' : 'nav-burger'} aria-hidden="true">
          <i />
          <i />
        </span>
      </button>

      <ul id="nav-menu" className={open ? 'nav-menu is-open' : 'nav-menu'}>
        {links.map((link) => (
          <li key={link.href}>
            <SmartLink
              href={link.href}
              className={active === link.href.slice(1) ? 'is-active' : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </SmartLink>
          </li>
        ))}
        <li>
          <a
            className="nav-resume"
            href={`${import.meta.env.BASE_URL}${profile.resume}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            Resume
          </a>
        </li>
      </ul>
    </nav>
  );
}
