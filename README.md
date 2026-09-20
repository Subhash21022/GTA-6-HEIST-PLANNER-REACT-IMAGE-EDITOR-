# Heist Planner — A GTA VI Fan Concept

An interactive browser experience where you plan a heist in Vice City: pick a target, assemble a crew of specialists, draw infiltration and getaway routes on procedurally generated blueprints using **@unlayer/react-image-editor**, watch the plan play out, then export a shareable mission briefing as a PNG.

Built for the **Build with React Image Editor Challenge**.

> **Disclaimer:** This is an unofficial, non-commercial fan concept. Grand Theft Auto and GTA VI are trademarks of Take-Two Interactive / Rockstar Games. This project is not affiliated with, endorsed by, or sponsored by them. All artwork is original or user-supplied.

## Features

- **8-screen flow:** Title → Target Selection → Crew Assembly → Infiltration Planning → Getaway Planning → Playback → Briefing Board → Result/Export
- **3 hand-authored targets** with unique floor plans, hazard layouts, and getaway maps (Sable Trust Bank, Gilded Flamingo Casino, Villa Aurelia)
- **6 crew members** with gameplay-affecting modifiers (hacker neutralises cameras, driver shortens getaway, etc.)
- **Procedural blueprint & map rendering** — canvas-drawn floor plans with walls, cameras, patrol routes, vault markers, and a paper-grain aesthetic
- **Route analysis pipeline:** pixel diff → grid downsampling → ink detection → dilation → BFS connectivity → hazard rasterization → crossing detection → weighted scoring
- **Animated playback** of planned routes with event log
- **Briefing board composer** — 1920 × 1080 collage with maps, crew polaroids, grade stamp, and operation codename
- **Image editor integration** via @unlayer/react-image-editor for drawing routes and adding final touches
- **"Try a sample plan"** button on each planning stage for instant demo
- **Persistence** — saves progress to localStorage (metadata) and IndexedDB (images) so you can resume
- **Download PNG / Copy to clipboard** for the final briefing
- **Accessibility** — skip link, focus-visible outlines, aria labels, `prefers-reduced-motion` support, narrow-screen overlay
- **Zero backend** — fully client-side, Vercel-deployable as a static site

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 6 (strict mode) |
| Build | Vite 8.3 |
| Image Editor | @unlayer/react-image-editor v1.0.2 |
| State | Zustand 5 |
| Storage | idb-keyval (IndexedDB) + localStorage |
| Rendering | Canvas 2D API (procedural blueprints, maps, briefing board) |
| Fonts | @fontsource — Bebas Neue, Special Elite, Space Mono |
| Testing | Vitest 5 |
| Linting | oxlint |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type-check
npm run typecheck

# Run tests
npm test

# Lint
npm run lint

# Production build
npm run build
```

## Image Setup

Place the following images in `public/images/`:

| Filename | Purpose |
|----------|---------|
| `hero-bg.png` | Title screen background (city skyline) |
| `logo.png` | Title screen logo icon |
| `crew-rico.png` | Rico Valens portrait |
| `crew-zara.png` | Zara Nyx portrait |
| `crew-milo.png` | Milo Torque portrait |
| `crew-sable.png` | Sable Cross portrait |
| `crew-kai.png` | Kai Mendez portrait |
| `crew-lena.png` | Lena Argent portrait |
| `target-sable.png` | Sable Trust Bank hero image |
| `target-flamingo.png` | Gilded Flamingo Casino hero image |
| `target-villa.png` | Villa Aurelia hero image |

The app works without these images (the UI degrades gracefully with empty thumbnails) but looks best with them.

## Project Structure

```
src/
  config/        # Copy strings, theme tokens, scoring constants, target/crew data
  store/         # Zustand store with screen state machine
  analysis/      # Ink detection, grid ops, BFS connectivity, hazard detection, scoring
  render/        # Canvas renderers for blueprints, maps, portraits, briefing board
  editor/        # EditorModal component and tool configurations
  screens/       # One component per screen (Title, Target, Crew, Planning, Playback, Briefing, Result)
  ui/            # Shared UI (Toast notifications, NarrowScreen overlay)
  utils/         # Canvas helpers, storage (localStorage + IndexedDB), seeded RNG
```

## How It Works

1. **Pick a target** — choose from three heist locations with varying difficulty
2. **Assemble a crew** — select 3 of 6 specialists; each applies a scoring modifier
3. **Draw the infiltration route** — open the image editor on a procedural blueprint, sketch a path from entry → vault → exit
4. **Draw the getaway route** — same flow on a city street map, from target → safehouse
5. **Watch the playback** — animated dot traces your path with hazard exposure events
6. **Review the briefing** — auto-composed 1920 × 1080 board; optionally edit with the image editor
7. **Export** — download as PNG or copy to clipboard

## Analysis Pipeline

Routes are scored on three axes (weighted sum to 100):

- **Completeness (60%):** Did the path reach entry → vault → exit?
- **Stealth (30%):** How many camera/patrol/hazard crossings? Crew modifiers can neutralise specific hazards
- **Efficiency (10%):** Route length vs. par (sample route length)

Grades: S (95+), A (85+), B (70+), C (55+), D (40+), F (<40). Plans scoring 55+ are marked APPROVED.

## Deployment

Static site — deploy to Vercel, Netlify, or any static host:

```bash
npm run build
# Output in dist/
```

No environment variables, secrets, or backend required.

## License

[MIT](./LICENSE)
