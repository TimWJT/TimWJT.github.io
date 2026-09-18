export const profile = {
  name: 'Tim Wang',
  legalName: 'Juntian Wang',
  tagline: 'Software, games, and communities.',
  roles: [
    'Advanced Computing @ USYD',
    'Former SYNCS Co-President',
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
    { label: 'Former SYNCS Co-President', weight: 'heavy' },
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
    'Outside code, I co-led SYNCS across 54 executives and 5,000+ members, helped grow Gym Society from zero to 850+ members, and play piano (ABRSM Grade 7). I care about bringing people together through events as much as through software.',
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
      'Working in a seven-person capstone team on a deep learning model that identifies the pancreas in CT and MRI scans.',
      'Testing the model on datasets from different medical centres, with an open-source release planned for researchers.',
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
      'Building a web application for a charity that supports more than 200 participants each week, replacing its manual spreadsheet workflow.',
      'Developing a matching system that pairs tutors and learners by availability, language, and learning goals.',
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
      'An autonomous game-playing bot that took first place out of 94 teams. I built its decision-making system and a planner that weighs the risks and rewards of each move.',
    highlights: [
      'Engineered the decision-making system, using game-state tracking to coordinate survival, pursuit, and resource-gathering.',
      'Built a predictive planner evaluating up to 36 movement directions across 14 future time steps, selecting actions by net present value of projected rewards and risks.',
      'Ran a distributed optimisation pipeline across CPU cores on 2 machines, coordinating Optuna trials through Supabase-hosted PostgreSQL.',
    ],
    link: 'https://github.com/TimWJT/bot-battle-2026',
    featured: true,
  },
  {
    title: 'Markdown Viewer',
    result: 'Desktop app · Windows, macOS, Linux',
    stack: ['Rust', 'Tauri', 'JavaScript'],
    period: 'Aug 2026',
    context: 'Individual project · Shipped',
    description:
      'A small desktop app for reading Markdown files, with smooth zoom, live reload, and no account or internet connection required.',
    highlights: [
      'Zoom is a GPU-composited scale transform rather than font resizing, so text never reflows mid-gesture and the page can be panned once it outgrows the window.',
      'The entire UI compiles to one self-contained HTML file that makes no network requests, running unchanged in a browser or inside a 2.3 MB native shell.',
      'Live-reloads while you edit the file in another editor, and registers itself as the system handler for .md files.',
    ],
    actions: [
      { label: 'Try it in your browser', href: '/markdown-viewer/', variant: 'primary' },
      {
        label: 'Download',
        href: 'https://github.com/TimWJT/markdown-viewer/releases/latest',
        variant: 'ghost',
        external: true,
      },
    ],
    link: 'https://github.com/TimWJT/markdown-viewer',
    featured: true,
  },
  {
    title: 'Lumen Fall',
    stack: ['Godot', 'GDScript'],
    period: 'Jan 2024 to Present',
    context: '2D action game · 2-person team · In development',
    description:
      'A 2D action game I’m building with a teammate. My focus is the combat system and enemy navigation, including pathfinding that accounts for jumps and level geometry.',
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
      'A multiplayer web game with shared rooms, timed rounds, and live leaderboards.',
    link: 'https://meta-game-arena.vercel.app/',
  },
  {
    title: 'Finvolution',
    result: 'Special Category Award',
    stack: ['Godot', 'GDScript'],
    period: 'Jun 2026',
    context: '4-person team · 72-hour USYD Game Jam',
    description:
      'A browser strategy game our four-person team made in 72 hours for the USYD Game Jam. It won a Special Category Award.',
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
      'A Carcassonne bot that compares tile placements and rotations to find the most promising move. Our team placed third out of 28.',
    link: 'https://github.com/TimWJT/syncs-bot-battle-2025-carcassonne',
  },
  {
    title: 'Bot Battle 2024',
    result: '7th of 72 teams',
    stack: ['Python'],
    period: 'Jul 2024',
    context: 'Individual project · Risk environment',
    description:
      'A Risk bot that adapts its strategy to the map and its opponents. My first Bot Battle entry, finishing seventh out of 72 teams.',
    link: 'https://github.com/TimWJT/syncs-bot-battle-2024-risk',
  },
  {
    title: 'Tanks Game',
    stack: ['Java'],
    period: '2024',
    context: 'Individual project',
    description:
      'A recreation of the classic tanks game in Java, built to explore object-oriented game design.',
    link: 'https://github.com/TimWJT',
  },
];

export const leadership = [
  {
    org: 'Sydney Computing Society (SYNCS)',
    link: 'https://syncs.org.au/about',
    roles: [
      {
        title: 'Former Co-President',
        period: 'Sep 2025 to Sep 2026',
        highlights: [
          'I co-led a team of 54 students running events and programs for more than 5,000 members.',
          'Managed relations with the School of Computer Science and the Faculty of Engineering, and represented SYNCS in industry partnerships.',
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
          'Helping students use Notion through workshops, templates, and feedback to the product team.',
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
          'Helped start the society and grow it to more than 850 members in its first year.',
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
