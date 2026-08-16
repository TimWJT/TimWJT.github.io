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
  location: 'Sydney, NSW',
  citizenship: 'NZ Citizen',
  resume: 'Tim_Wang_Resume.pdf',
  links: {
    linkedin: 'https://www.linkedin.com/in/timwang01/',
    github: 'https://github.com/TimWJT',
    syncs: 'https://syncs.org.au/',
  },
};

/**
 * Bodies dropped into the interactive hero. `heavy` ones are the headline
 * facts (bigger, denser, kept on mobile); `light` ones are supporting tech.
 */
export const physicsHero = {
  tokens: [
    { label: 'Bot Battle 2026: 1st of 94', weight: 'heavy' },
    { label: 'SYNCS Co-President', weight: 'heavy' },
    { label: 'Godot', weight: 'heavy' },
    { label: 'Python', weight: 'heavy' },
    { label: 'React', weight: 'light' },
    { label: 'PyTorch', weight: 'light' },
    { label: 'PostgreSQL', weight: 'light' },
    { label: 'Java', weight: 'light' },
    { label: 'C', weight: 'light' },
    { label: 'SQL', weight: 'light' },
    { label: 'Supabase', weight: 'light' },
    { label: 'Optuna', weight: 'light' },
    { label: 'GDScript', weight: 'light' },
    { label: 'A* pathfinding', weight: 'light' },
    { label: 'Cyber Security', weight: 'light' },
  ],
};

export const education = {
  school: 'University of Sydney',
  degree: 'Bachelor of Advanced Computing',
  major: 'Computer Science and Cyber Security',
  period: 'Jul 2023 to Expected Nov 2027',
  note: 'Penultimate year',
  stats: [
    { label: 'WAM', value: '78.88 (Distinction)' },
    { label: 'ATAR', value: '97.55' },
  ],
};

export const about = {
  paragraphs: [
    'Penultimate-year Bachelor of Advanced Computing student at the University of Sydney, majoring in Computer Science and Cyber Security. NZ citizen, now based in Sydney.',
    'I like building things that move: enemy AI in a Godot platformer, a competition bot that plans fourteen steps into the future, a matching algorithm that replaces a spreadsheet nobody wanted to maintain.',
    'Outside code, I co-lead SYNCS across 54 executives and 5,000+ members, helped grow Gym Society from zero to 850+ members, and play piano (ABRSM Grade 7). I care about bringing people together through events as much as through software.',
  ],
};

export const experience = [
  {
    role: 'Software Developer',
    org: 'Pancreas Segmentation from Medical Images',
    period: 'Aug 2026 to Oct 2026',
    context: 'Capstone · 7-person team · Client: University of Sydney',
    stack: ['Python', 'PyTorch', 'nnU-Net', 'MONAI'],
    highlights: [
      'Developing a deep learning model to segment the pancreas from CT and MRI scans, targeting benchmark accuracy against state-of-the-art models.',
      'Evaluating generalisability across multi-centre datasets for open-source release to the research community.',
    ],
  },
  {
    role: 'Software Developer',
    org: 'Refugee English Language Tutoring (RELT)',
    period: 'Aug 2026 to Present',
    context: '2-person team',
    stack: ['SQL', 'Web Development'],
    link: 'https://www.reltutoring.org/',
    highlights: [
      'Replacing a manual Excel workflow with a SQL-backed web application for a charity serving 200+ weekly participants.',
      'Designing an automated matching algorithm to replace manual review, pairing on availability, language, and goals.',
    ],
  },
];

export const projects = [
  {
    title: 'Bot Battle 2026',
    result: '1st of 94 teams',
    stack: ['Python', 'Optuna', 'Supabase', 'PostgreSQL'],
    period: 'Jul 2026',
    context: 'Primary developer · 2-person team · Agar.io environment',
    description:
      'Susquehanna x SYNCS annual two-week competition to build an autonomous bot for a new game environment each year.',
    highlights: [
      'Engineered the decision-making system, using game-state tracking to coordinate survival, pursuit, and resource-gathering.',
      'Built a predictive planner evaluating up to 36 movement directions across 14 future time steps, selecting actions by net present value of projected rewards and risks.',
      'Ran a distributed optimisation pipeline across CPU cores on 2 machines, coordinating Optuna trials through Supabase-hosted PostgreSQL.',
    ],
    link: 'https://github.com/TimWJT/bot-battle-2026',
    featured: true,
  },
  {
    title: 'Lumen Fall',
    stack: ['Godot', 'GDScript'],
    period: 'Jan 2024 to Present',
    context: '2D action game · 2-person team · In development',
    description:
      'A 2D action game built on systems designed to be extended rather than rewritten.',
    highlights: [
      'Designed a modular, data-driven combat framework supporting 100+ weapon configurations through reusable components.',
      'Developed a physics-aware A* navigation system that constructs paths from level geometry and validates jumps.',
    ],
    link: 'https://github.com/TimWJT',
    featured: true,
  },
  {
    title: 'Hivemind',
    stack: ['React', 'Supabase', 'PostgreSQL'],
    period: 'Jun 2026 to Present',
    context: 'Individual project · In development',
    description:
      'Real-time multiplayer web game with room creation, timed rounds, live results, and leaderboards.',
    link: 'https://meta-game-arena.vercel.app/',
  },
  {
    title: 'Finvolution',
    result: 'Special Category Award',
    stack: ['Godot', 'GDScript'],
    period: 'Jun 2026',
    context: '4-person team · 72-hour USYD Game Jam',
    description:
      'Browser-playable strategy game shipped in 72 hours at an event with 200 participants across 44 teams.',
    highlights: [
      'Built a reusable object-oriented framework for 10+ enemy types with configurable spawning, progression, and difficulty scaling.',
    ],
    link: 'https://richardlr03.itch.io/finvolution',
  },
  {
    title: 'Bot Battle 2025',
    result: '3rd of 28 teams',
    stack: ['Python'],
    period: 'Jul 2025',
    context: 'Primary developer · 4-person team · Carcassonne environment',
    description:
      'Bot simulating every tile placement and rotation, scoring structures by ownership and completion likelihood.',
    link: 'https://github.com/TimWJT/syncs-bot-battle-2025-carcassonne',
  },
  {
    title: 'Bot Battle 2024',
    result: '7th of 72 teams',
    stack: ['Python'],
    period: 'Jul 2024',
    context: 'Individual project · Risk environment',
    description:
      'Multi-phase decision engine that adapted expansion, attack, and defence to map control and opponent strength.',
    link: 'https://github.com/TimWJT/syncs-bot-battle-2024-risk',
  },
  {
    title: 'Tanks Game',
    stack: ['Java'],
    period: '2024',
    context: 'Individual project',
    description:
      'Classic tanks recreation applying OOP design principles and Java UI patterns.',
    link: 'https://github.com/TimWJT',
  },
];

export const leadership = [
  {
    org: 'Sydney Computing Society (SYNCS)',
    link: 'https://syncs.org.au/about',
    roles: [
      {
        title: 'Co-President',
        period: 'Sep 2025 to Present',
        highlights: [
          'Co-lead a 54-person executive and subcommittee team serving 5,000+ members, providing direction and oversight across 8 portfolios.',
          'Manage relations with the School of Computer Science and the Faculty of Engineering, and represent SYNCS in industry partnerships.',
          'Launched a food sponsorship initiative, established a competition events portfolio, and rebuilt the Notion workspace.',
        ],
      },
      {
        title: 'Industry Liaison',
        period: 'Sep 2024 to Sep 2025',
        highlights: [
          'Coordinated events with 16 companies, including a networking night for 160+ attendees.',
          'Individually secured $9,000 in sponsorship funding through outreach and negotiations.',
        ],
      },
      {
        title: 'Industry Subcommittee',
        period: 'Mar 2024 to Sep 2024',
        highlights: [
          'Organised sponsor events and presented introductory information to 200+ incoming Faculty of Engineering students.',
        ],
      },
    ],
  },
  {
    org: 'Notion',
    link: 'https://www.notion.so/',
    roles: [
      {
        title: 'Campus Leader',
        period: 'Aug 2026 to Present',
        highlights: [
          'Selected as a student ambassador to grow campus adoption through workshops, templates, and product feedback.',
        ],
      },
    ],
  },
  {
    org: 'USYD Gym Society',
    roles: [
      {
        title: 'Secretary and Co-Founder',
        period: 'Jan 2025 to Present',
        highlights: [
          'Grew membership from 0 to 850+ in the society’s first year.',
          'Planned community events and coordinated the executive team.',
        ],
      },
    ],
  },
  {
    org: 'Piano Society',
    roles: [
      {
        title: 'Event Director',
        period: 'Jul 2024 to Oct 2024',
        highlights: ['Organised concerts and community gatherings.'],
      },
    ],
  },
];

export const skills = [
  {
    label: 'Languages',
    items: ['Python', 'Java', 'C', 'SQL', 'GDScript', 'Bash'],
  },
  {
    label: 'Tools and tech',
    items: ['Supabase', 'PostgreSQL', 'Git', 'Jenkins', 'JUnit', 'CI/CD', 'React'],
  },
  {
    label: 'AI and optimisation',
    items: ['PyTorch', 'nnU-Net', 'MONAI', 'Optuna', 'LLM APIs (OpenRouter)'],
  },
  {
    label: 'Beyond code',
    items: [
      'Game development',
      'Event coordination',
      'Sponsorship and partnerships',
      'Piano (ABRSM Grade 7)',
      'English and Mandarin',
    ],
  },
];
