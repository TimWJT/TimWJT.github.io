# Tim Wang — Personal Website

Personal portfolio hosted on GitHub Pages at https://timwjt.github.io.

## Development

- `npm install` installs dependencies.
- `npm run dev` starts the local preview (prefers port 17331).
- `npm run build` generates the production site in `docs/`.
- `npm test` checks content, links, assets, expandable details, mobile navigation, and rendering.

## Design and content

The portfolio uses an editorial layout with large sans-serif and serif typography, restrained motion, and a projects-first structure. Project details and the project archive use native accessible disclosures. The header top stays still until clicked. Four quick presses deploy it into the hero with randomized bounce physics; activation farther down the page returns to the top first. Scrolling never powers it. Leaving the hero docks it again. The squares support dragging, spring return, and keyboard controls without visible instruction labels. Reduced-motion preferences disable automatic hero movement, square inertia, and smooth scrolling; the explicitly activated toy remains playable. Experience uses a charcoal surface, and community uses a blue grid layout. Interaction code lives in `src/motion/SpinningTop.jsx`, `src/motion/PlayfulSquares.jsx`, and `src/motion/topPhysics.js`.

Edit project, experience, education, and community data in `src/data/content.js`. Page composition and introduction copy live in `src/App.jsx`; styles live in `src/index.css`. The older design components and contexts remain in source for reference but are no longer bundled or active.

The standalone Markdown Viewer in `public/markdown-viewer/` and résumé PDF are retained. Google Fonts supplies the typefaces, with local system fallbacks.

## Deployment

The existing GitHub Pages workflow builds and deploys on a push to main or master. Local builds also refresh the checked-in `docs/` output.
