# The Vice Syndicate: GTA VI Heist Board & Tactical Command

An interactive GTA VI-inspired web experience where you plan high-stakes heists across Vice City: recon targets, select tactical approaches (**Subtle** vs. **Loud**), assemble specialist crews, draw architectural infiltration & high-speed getaway routes on procedural blueprints using **[@unlayer/react-image-editor](https://github.com/unlayer/react-image-editor)**, simulate the heist with interactive telemetry, and witness the getaway via an animated **Sky-Weazel 4 CCTV Police Pursuit** with dynamic sirens and authentic GTA soundscapes.

Built for the **Build with React Image Editor Challenge** by [Unlayer](https://unlayer.com/).

> **Disclaimer:** This is an unofficial, non-commercial fan concept. Grand Theft Auto and GTA VI are trademarks of Take-Two Interactive / Rockstar Games. This project is not affiliated with, endorsed by, or sponsored by them. All artwork is original or user-supplied.

## Key Features

- **9-Screen Tactical Mission Flow:** Title → Target Selection → Approach Selection (Subtle vs. Loud) → Crew Assembly → Infiltration Blueprint Planning → Getaway Navigation Planning → Telemetry Playback → Briefing Board → Weazel News Debrief & Live CCTV
- **Tactical Approach Selection (GTA V / Movie Style):**
  - **Plan A (The Subtle Route):** Silent ingress, air duct routing, keycard bypass, zero-alarm tolerance, Hacker/Safecracker synergy, and Ghost Operator scoring bonuses.
  - **Plan B (The Loud Route):** Kinetic C4 structural breach points, thermite drills, SWAT intercept crossfire zones, Muscle/Driver blitz synergy, and Vault Blown Weazel News headlines.
- **Deep React Image Editor Integration:**
  - **Blueprint Route Drawing:** Brush strokes sketched by the player are extracted as mathematical trajectories that drive graph connectivity (BFS), hazard collision detection, and mission pass/fail grades.
  - **Surveillance Recon (`TargetScreen`):** Mark up target reconnaissance photos with arrows, cropping, and tactical notes.
  - **Crew Disguises (`CrewScreen`):** Customize specialist mugshots with masks, shades, and tactical gear.
  - **1920×1080 Master Briefing Board (`BriefingScreen`):** Add classified watermarks, stamps, and codenames before exporting.
- **Sky-Weazel 4 Live Police Pursuit CCTV:**
  - Real-time animated canvas simulating a news helicopter tracking getaway cars through Vice City streets.
  - Gyro-stabilized FLIR crosshair with cinematic camera shake and bank tilts.
  - Dynamic getaway car drifting, acceleration physics, screeching tire smoke, and intercepting police cruisers.
- **Synthesized GTA Audio & Randomized Siren Engine:**
  - Zero static, studio-grade Web Audio synthesizers for menu hover blips, select chimes, heist stingers, and fanfare.
  - 3 desynchronized police cruisers (Lead Wail, Flanker Yelp, Tactical Piercer) with continuous frequency drift and tactical police air horn bursts.
  - Interactive neon sound control widget in the bottom-right corner with mute toggle and expandable volume slider.
- **Authentic Rockstar Games Typography:**
  - **Pricedown:** Official GTA franchise title font for mission headings, score stamps, cash values, and logos.
  - **Chalet (London & New York 1960):** Official GTA 5 / GTA Online HUD, menu, telemetry, and button typography.
- **Zero Backend:** 100% client-side, lightning-fast static build, deployable anywhere (Vercel, Netlify, Cloudflare Pages).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 (strict mode) |
| Build Tool | Vite 8.3 |
| Image Editor | **[@unlayer/react-image-editor](https://github.com/unlayer/react-image-editor)** v1.0.2 |
| State Management | Zustand 5 |
| Client Storage | idb-keyval (IndexedDB) + localStorage |
| Rendering Engine | Canvas 2D API (procedural blueprints, maps, briefing board, CCTV pursuit) |
| Audio Engine | Web Audio API (real-time synthesizers, dynamics compressor limiter, sirens) |
| Typography | **Pricedown** & **Chalet London/New York 1960** (Rockstar Games Official GTA Fonts) |
| Testing | Vitest 5 (12/12 unit tests passing) |
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

## Asset Optimization

All visuals in `public/images/` are bundled directly in the repository and optimized for high performance:
- **Total Payload:** Optimized from ~61.5 MB down to **12.89 MB (~79% reduction)**.
- **Format:** Pristine 24-bit RGB/RGBA PNGs with Lanczos resampling and Deflate optimization — zero gradient banding, zero visual compression artifacts, and instant loading on web deployments.
- **Included Assets:** 6 specialist crew portraits, 3 target reconnaissance visuals, 3 blueprint backdrops, title hero background, and transparent vector logo.

## 🎨 How React Image Editor Drives the Mathematical Analysis Engine

Rather than using `@unlayer/react-image-editor` as a cosmetic viewer, **Heist Planner makes the image editor the primary interactive controller of the simulation**. 

When players sketch infiltration paths through bank vaults or getaway routes across Vice City streets, **their brushstrokes are converted into mathematical trajectories that directly drive simulation scoring and heist outcomes.**

```
┌───────────────────────────────────────┐
│     @unlayer/react-image-editor       │  (Player sketches path with brush, shapes, or highlighter)
└──────────────────┬────────────────────┘
                   │  ImageEditorSaveResult (PNG DataURL)
                   ▼
┌───────────────────────────────────────┐
│  Dual-Buffer Euclidean Ink Detection  │  (Diffs clean blueprint vs. edited canvas: ΔE > Threshold)
└──────────────────┬────────────────────┘
                   │  Binary Ink Grid
                   ▼
┌───────────────────────────────────────┐
│   2D Morphological Dilation Kernel    │  (Closes micro-gaps from fast cursor sweeps & anti-aliasing)
└──────────────────┬────────────────────┘
                   │  Continuous Topological Graph
                   ▼
┌───────────────────────────────────────┐
│      BFS Topological Path Routing     │  (Verifies Entry ➔ Vault ➔ Exit; extracts ordered 2D trajectory)
└──────────────────┬────────────────────┘
                   │  Reconstructed Ordered Trajectory
                   ▼
┌───────────────────────────────────────┐
│  Spatial Hazard Collision Detection   │  (Raycasts against camera cones, guard patrols, roadblocks)
└──────────────────┬────────────────────┘
                   │  Crossings & Exposure Events
                   ▼
┌───────────────────────────────────────┐
│  Crew Synergy & Weighted Score Engine │  (Applies specialist perks: Hacker, Safecracker, Driver, Muscle)
└──────────────────┬────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Final Score (0–100)  •  Letter Grade (S / A / B / C / D / F)  •  APPROVED/FAILED │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Step-by-Step Mathematical Pipeline

#### 1. Dual-Buffer Euclidean Ink Extraction (`src/analysis/ink.ts`)
When the editor returns the updated canvas, the engine rasterizes both the pristine base blueprint (`baseData`) and the player's edited canvas (`editedData`) into raw `Uint8ClampedArray` pixel buffers. For every sampled coordinate cell, the engine calculates the Euclidean color distance in 3D RGB space:

$$\Delta E = \sqrt{(R_{\text{edited}} - R_{\text{base}})^2 + (G_{\text{edited}} - G_{\text{base}})^2 + (B_{\text{edited}} - B_{\text{base}})^2}$$

If $\Delta E > \text{threshold}$, the coordinate is classified as player-drawn ink. This ensures that pre-existing blueprint gridlines, architectural walls, and room labels are never misidentified as drawn paths.

#### 2. Morphological Dilation & Grid Downsampling (`src/analysis/grid.ts`)
To prevent broken paths caused by rapid mouse strokes, pen lifts, or canvas anti-aliasing, a mathematical **morphological dilation kernel** expands the detected ink grid:

$$I_{\text{dilated}}(x, y) = \max_{(dx, dy) \in K} I(x + dx, y + dy)$$

This produces an unbroken 2D discrete traversal matrix while downsampling the computation space for instantaneous sub-millisecond route analysis.

#### 3. Breadth-First Search (BFS) Topological Validation (`src/analysis/connectivity.ts`)
A multi-stage BFS traversal verifies whether the player's ink forms a valid, continuous route across all required heist mission objectives:
* **Infiltration Stage:** 
  $$\text{Entry Checkpoint} \longrightarrow \text{Vault Objective} \longrightarrow \text{Exfiltration Zone}$$
  The engine validates that the drawn path enters through an authorized door/vent, reaches within the vault contact radius, and reaches an external getaway exit.
* **Getaway Stage:**
  $$\text{Target Departure Zone} \longrightarrow \text{City Safehouse}$$
* **Trajectory Reconstruction:** The BFS tree backtracks from the destination to reconstruct an ordered array of 2D coordinates representing the exact traversal timeline.

#### 4. Spatial Hazard Raycasting & Collision Detection (`src/analysis/hazards.ts`)
The target blueprints feature real-time security obstacles mapped onto geometric hazard grids:
* **CCTV Cameras:** Field-of-View (FOV) triangular cones defined by position, angle, sweep arc, and range radius:
  $$\text{Camera Cone} = \{ P \mid \|P - P_{\text{cam}}\| \le R \land |\theta(P - P_{\text{cam}}) - \theta_{\text{cam}}| \le \frac{\text{FOV}}{2} \}$$
* **Guard Patrols:** Dynamic patrol waypoints with active alert radii.
* **Roadblocks (Getaway):** Police intercept checkpoints placed along major thoroughfares.

The reconstructed trajectory is traversed step-by-step; any segment intersecting an active hazard zone registers a stealth violation event.

#### 5. Crew Synergy Modifiers (`src/config/scoring.ts`)
The specialists chosen during Crew Assembly directly modify the environmental mathematics:
* **Zara Nyx (Hacker):** Neutralizes camera feeds, nullifying detection events from CCTV cones.
* **Milo Torque (Safecracker):** Expands the mathematical vault reach radius by $+4$ grid cells, allowing looser path tolerances.
* **Rico Valens (Driver):** Mitigates getaway path length penalties and reduces roadblock delays.
* **Sable Cross (Muscle):** Absorbs guard patrol confrontation penalties.

#### 6. Weighted Scoring Formula & Grade Assignment (`src/analysis/scoring.ts`)
The final heist plan is graded on a weighted 100-point scale:

$$\text{Final Score} = (\text{Completeness} \times 0.60) + (\text{Stealth} \times 0.30) + (\text{Efficiency} \times 0.10)$$

* **Completeness (60%):** Evaluates objective achievement:
  * Reached Entry: $+20$ pts
  * Reached Vault: $+20$ pts
  * Reached Exit: $+20$ pts
* **Stealth (30%):** Starts at 30 pts, deducting weighted penalties for camera crossings and guard detections (mitigated by crew perks).
* **Efficiency (10%):** Compares path length $L$ against the target's theoretical par distance $L_{\text{par}}$:
  $$\text{Efficiency} = \max\left(0, 10 - \frac{|L - L_{\text{par}}|}{L_{\text{par}}} \times 10\right)$$

| Score Range | Grade | Outcome | Status |
|:---:|:---:|:---:|:---:|
| **95 – 100** | **S** | Mastermind Execution | **APPROVED** |
| **85 – 94** | **A** | Professional Operation | **APPROVED** |
| **70 – 84** | **B** | Solid Plan | **APPROVED** |
| **55 – 69** | **C** | High Risk — Barely Passable | **APPROVED** |
| **40 – 54** | **D** | Compromised Route | **FAILED** |
| **< 40** | **F** | Disaster / Incomplete | **FAILED** |

#### 7. Tactical Approach Mechanics: Subtle vs. Loud Branching (`src/analysis/scoring.ts` & `src/render/`)
The GTA V/Movie-style tactical choice dynamically reshapes both the canvas editor and the simulation mathematics:
* **Plan A: The Subtle Route (Ghost Operator):**
  * **Blueprint Overlays:** Renders ventilation ducts, keycard bypass terminals, and precise CCTV cones.
  * **Mathematical Penalties:** Camera exposures carry a 1.5× penalty ($-\text{penalty} \times 1.5$) unless neutralized by the Hacker. Uncompromised runs earn a $+5$ point **GHOST OPERATOR** stealth bonus.
  * **Playback Telemetry:** Silent ingress with cyan stealth sensor pings and whisper telemetry.
  * **Debrief:** Weazel News prints `ZERO ALARMS AT [TARGET]` with a green `GHOST HEIST` stamp.
* **Plan B: The Loud Route (Kinetic Breach):**
  * **Blueprint Overlays:** Renders C4 structural weak points with blast radius arcs and SWAT intercept warning zones.
  * **Mathematical Penalties:** Ignores camera cones ($0$ camera detection penalty). Instead, guards/SWAT carry a $1.2\times$ confrontation penalty ($-\text{penalty} \times 1.2$), and high-speed blitz trajectories earn a $+5$ point **KINETIC BREACH** bonus.
  * **Playback Telemetry:** Kinetic C4 wall detonations, thermal lance vault breaching, and hot-pink breach telemetry.
  * **Debrief:** Weazel News prints `BREAKING: C4 BLAST ROCKS [TARGET]` with a red `VAULT BLOWN` stamp.

---

### Multi-Touchpoint React Image Editor Integration

`@unlayer/react-image-editor` is embedded across **5 distinct game workflows**:

1. **Infiltration Planning Table:** Drawing tactical ingress/egress routes on procedural architectural blueprints.
2. **Getaway Navigation Table:** Plotting high-speed escape trajectories across Vice City street maps.
3. **Surveillance Recon (`TargetScreen`):** Annotating location photos with custom text, arrows, and filters.
4. **Crew Dossiers (`CrewScreen`):** Customizing operative mugshots and polaroids with stickers and framing.
5. **1920×1080 Master Briefing Board (`BriefingScreen`) & News Debrief (`ResultScreen`):** Adding stamps, classified watermarks, operation codenames, and final notes before exporting the mission dossier as a high-resolution PNG.

### Deep Programmatic API Control (`src/editor/EditorModal.tsx`)

The application wraps `@unlayer/react-image-editor` inside a custom HUD interface with extensive runtime control:
* **Live Theme Switching:** Toggle dynamically between `dark` and `light` themes via `updateOptions()`.
* **Internationalization:** Instant runtime locale switching (`en`, `es`, `fr`, `de`, `ja`).
* **Dynamic Docking:** Flip toolbar docking between `left` and `right` positions.
* **Contextual Tool Configurations:** Mounts customized toolsets tailored for each screen (`drawing`-only for blueprints, `crop`/`filter` for recon, full creative suite for briefings).
* **State & Change Detection:** Tracks unsaved changes via `hasChanges()`, allows instant image reset, and provides one-click snapshot exports.

## Deployment

Static site — deploy to Vercel, Netlify, or any static host:

```bash
npm run build
# Output in dist/
```

No environment variables, secrets, or backend required.

## License

[MIT](./LICENSE)
