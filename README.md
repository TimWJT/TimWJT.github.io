# Tim Wang — Personal Website

Personal portfolio hosted on GitHub Pages at [timwjt.github.io](https://timwjt.github.io).

## Preview locally

```bash
npm install
npm run dev
```

Open the URL in the terminal (prefers port **17331** — not 5173 if that's another project).

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `docs/` |
| `npm run preview` | Serve the built `docs/` folder |
| `npm test` | Headless render smoke test (28 assertions) |

`npm test` mounts the real app in jsdom and asserts the sections, project count,
resume link, debug-panel gating, and accessibility invariants all still hold
(36 assertions). Run it after editing `src/data/content.js`.

## Editing content

**All site copy lives in `src/data/content.js`.** Nothing else needs touching to
update the site:

| Export | Drives |
|--------|--------|
| `profile` | Name, tagline, email, social links, resume filename |
| `education` | The education card in About |
| `about` | About paragraphs |
| `experience` | Experience section (capstone, RELT) |
| `projects` | Project cards — set `featured: true` to make one span two columns |
| `leadership` | Leadership timeline; each org holds a `roles` array |
| `skills` | Skill pill groups |

A project entry supports `title`, `result`, `stack` (array), `period`,
`context`, `description`, `highlights` (array), `link`, and `featured`.
Everything except `title`, `stack`, and `description` is optional.

## Updating the resume

The LaTeX source lives in `resume/Tim_Wang_Resume.tex`. After editing it:

```bash
cd resume
pdflatex Tim_Wang_Resume.tex
cp Tim_Wang_Resume.pdf ../public/
```

`public/Tim_Wang_Resume.pdf` is what the hero, nav, and contact buttons link to.
Keep `src/data/content.js` in sync with it.

## Social preview

`public/og-image.png` is the 1200x630 card that shows when the site is linked on
LinkedIn, Slack, X, Discord, etc. Regenerate it after changing the tagline:

```bash
pip install pillow
python scripts/make-og-image.py
```

SEO and sharing metadata (Open Graph, Twitter card, JSON-LD `Person` schema,
canonical URL) live in `index.html`. `public/robots.txt` and
`public/sitemap.xml` point at `https://timwjt.github.io/`.

## Design panel (debug only, hidden from visitors)

The colour/motion panel is hidden by default. Three ways to open it:

1. **Type `design`** anywhere on the page (not while focused in a text field)
2. **Add `?design` to the URL** — `timwjt.github.io/?design` or `localhost:17331/?design`
3. **`localStorage.setItem('timwang-debug', '1')`** in the console, then reload

Once open it stays open in that browser. To hide it again: press **Escape**,
click the **✕**, or type `design` a second time — any of which clears the saved
flag.

Inside the panel, **← →** cycle colours and motion styles, and **Browse all
motion styles** lists them all. Your picks persist in `localStorage` separately
from the unlock flag.

The secret, storage key, and URL flag are the three constants at the top of
`src/hooks/useDebugUnlock.js`.

## Designs included

| Style | Vibe |
|-------|------|
| Clean Light | White, simple sans — default |
| Clean Dark | Solid dark, no glow |
| Editorial | Serif, magazine spacing |
| Swiss | Sharp grid, bold sans |
| Warm Paper | Cream, calm |
| Resume | Narrow, formal |
| Brutalist | Thick borders, mono |
| Notebook | Soft blue, literary |
| Newspaper | Print rules and hierarchy |
| Gallery | Airy, large type |
| Ink | High-contrast B&W |
| Olive Studio | Muted green |
| Slate Pro | Corporate grey |
| Mono Stack | All monospace |
| Academic | Navy, university feel |
| Soft Serif | Gentle, light motion |
| Flat Bold | Bold headings, scroll line |
| Personal Letter | Written introduction feel |

No glass blur, no lattice, no cursor glow by default.

## Accessibility

- Skip-to-content link, visible `:focus-visible` rings on every interactive element
- Mobile hamburger nav with `aria-expanded` / `aria-controls`, closes on Escape
- Scroll-spy highlights the current section in the nav
- `prefers-reduced-motion` disables transitions, grain, lattice, and cursor glow
- Print stylesheet strips chrome and expands link URLs

## Deploy

Push to `main` → the **Deploy to GitHub Pages** workflow runs `npm run build`
and publishes `docs/`. Set **Settings → Pages → Source** to **GitHub Actions**.
