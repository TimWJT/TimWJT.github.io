import { useMotionPreset } from '../context/MotionContext';
import MagneticLink from './MagneticLink';

export default function SmartLink({
  href,
  children,
  className = '',
  external = false,
  ...rest
}) {
  const { motion: preset } = useMotionPreset();
  const { magneticLinks, linkDraw } = preset.effects;
  const extra = [linkDraw ? 'link-draw' : '', className].filter(Boolean).join(' ');

  if (magneticLinks) {
    return (
      <MagneticLink href={href} className={extra} external={external} {...rest}>
        {children}
      </MagneticLink>
    );
  }

  const props = external ? { target: '_blank', rel: 'noreferrer' } : {};

  return (
    <a href={href} className={`smart-link ${extra}`} {...props} {...rest}>
      {children}
    </a>
  );
}
