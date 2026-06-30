export function defaultEffects() {
  return {
    scrollReveal: false,
    splitHeading: false,
    magneticLinks: false,
    tiltCards: false,
    sectionLine: false,
    scrollProgress: false,
    scrollRail: false,
    ghostTicker: false,
    lattice: false,
    cursorGlow: false,
    pillHover: false,
    linkDraw: false,
    heroParallax: false,
    contactStagger: false,
    noiseGrain: false,
  };
}

function fx(overrides) {
  return { ...defaultEffects(), ...overrides };
}

const base = {
  scrollReveal: true,
  sectionLine: true,
};

export const motionPresets = [
  {
    id: 'still',
    name: 'Still',
    description: 'No animation. Static page.',
    effects: fx({}),
  },
  {
    id: 'full',
    name: 'Full',
    description: 'Fade-in, lines, name stagger, magnetic links, card tilt, top bar, whisper, pills.',
    effects: fx({
      ...base,
      splitHeading: true,
      magneticLinks: true,
      tiltCards: true,
      scrollProgress: true,
      ghostTicker: true,
      pillHover: true,
    }),
  },
  {
    id: 'fade',
    name: 'Fade',
    description: 'Sections gently fade in as you scroll down.',
    effects: fx({ scrollReveal: true }),
  },
  {
    id: 'lines',
    name: 'Lines',
    description: 'Fade in plus a short accent line under each section heading.',
    effects: fx({ ...base }),
  },
  {
    id: 'stagger',
    name: 'Name stagger',
    description: 'Your name at the top animates in letter by letter.',
    effects: fx({ ...base, splitHeading: true }),
  },
  {
    id: 'magnetic',
    name: 'Magnetic',
    description: 'Links subtly pull toward your cursor when you hover near them.',
    effects: fx({ ...base, magneticLinks: true }),
  },
  {
    id: 'topbar',
    name: 'Top bar',
    description: 'A thin accent line at the top fills as you scroll the page.',
    effects: fx({ ...base, scrollProgress: true }),
  },
  {
    id: 'cards',
    name: 'Cards',
    description: 'Project cards tilt slightly and show a soft glare on hover.',
    effects: fx({ ...base, tiltCards: true }),
  },
  {
    id: 'whisper',
    name: 'Whisper',
    description: 'Faded tech words breathe softly in the background behind your name.',
    effects: fx({ scrollReveal: true, ghostTicker: true }),
  },
  {
    id: 'pills',
    name: 'Pills',
    description: 'Skill tags in About lift slightly when you hover them.',
    effects: fx({ ...base, pillHover: true }),
  },
  {
    id: 'draw',
    name: 'Draw',
    description: 'Link underlines draw in from left to right on hover.',
    effects: fx({ ...base, linkDraw: true }),
  },
];
