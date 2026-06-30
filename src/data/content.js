export const profile = {
  name: 'Tim Wang',
  legalName: 'Juntian Wang',
  tagline: 'Building games, running communities, solving problems.',
  roles: [
    'Advanced Computing @ USYD',
    'SYNCS Co-President',
    'Game developer',
  ],
  email: 'tim200465@gmail.com',
  links: {
    linkedin: 'https://www.linkedin.com/in/timwang01/',
    github: 'https://github.com/TimWJT',
    syncs: 'https://syncs.org.au/',
  },
};

export const about = {
  paragraphs: [
    'Penultimate-year Bachelor of Advanced Computing student at the University of Sydney, majoring in Computer Science and Cyber Security. Distinction WAM. NZ citizen, now based in Sydney.',
    'I like building things that move — whether that is enemy AI in a Godot platformer, a competitive bot for SYNCS Bot Battle, or quiet physics experiments in code.',
    'Outside code, I co-lead SYNCS, helped grow Gym Society from zero to 850+ members, and play piano (ABRSM Grade 7). I care about bringing people together through events as much as through software.',
  ],
};

export const projects = [
  {
    title: 'Godot 2D Platformer',
    stack: 'GDScript',
    description:
      'Custom A* pathfinding, modular state machines, and constraint-based character movement including inverse kinematics work.',
    link: 'https://github.com/TimWJT',
  },
  {
    title: 'Bot Battle 2025 — 3rd Place',
    stack: 'Python',
    description:
      'Carcassonne bot using BFS tile placement and ML-tuned parameters. Two-week Susquehanna × SYNCS competition.',
    link: 'https://syncs.org.au/',
  },
  {
    title: 'Bot Battle 2024 — 7th of 72',
    stack: 'Python',
    description:
      'Risk-style simulation bot with efficient set logic for complex move handling.',
    link: 'https://syncs.org.au/',
  },
  {
    title: 'Tanks Game',
    stack: 'Java',
    description:
      'Classic tanks recreation applying OOP principles and Java UI patterns.',
    link: 'https://github.com/TimWJT',
  },
];

export const leadership = [
  {
    org: 'Sydney Computing Society (SYNCS)',
    role: 'Co-President',
    period: 'Sep 2025 — Present',
    highlights: [
      'Lead executive team and society direction',
      'Industry events with 160–240+ attendees',
      '$9,000 sponsorship secured as Industry Liaison',
    ],
  },
  {
    org: 'USYD Gym Society',
    role: 'Secretary & Co-Founder',
    period: 'Jan 2025 — Present',
    highlights: [
      'Grew membership from 0 to 850+',
      'Planned community events and executive coordination',
    ],
  },
  {
    org: 'Piano Society',
    role: 'Event Director',
    period: 'Jul — Oct 2024',
    highlights: ['Organised concerts and community gatherings'],
  },
];

export const skills = {
  technical: [
    'Python',
    'Java',
    'C',
    'GDScript',
    'SQL',
    'Git',
    'CI/CD',
  ],
  other: [
    'Game development',
    'Event coordination',
    'Sponsorship & partnerships',
    'Music composition',
    'English & Mandarin',
  ],
};
