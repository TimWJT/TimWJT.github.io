import SmartLink from '../motion/SmartLink';

const links = [
  { href: '#about', label: 'About' },
  { href: '#projects', label: 'Projects' },
  { href: '#leadership', label: 'Leadership' },
  { href: '#contact', label: 'Contact' },
];

export default function Nav() {
  return (
    <nav className="nav" aria-label="Main">
      <SmartLink href="#" className="nav-logo">
        TW
      </SmartLink>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <SmartLink href={link.href}>{link.label}</SmartLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
