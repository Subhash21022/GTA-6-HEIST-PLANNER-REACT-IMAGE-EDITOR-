# The Vice Syndicate: GTA VI Heist Board & Tactical Command

An interactive GTA VI-inspired web experience where you plan high-stakes heists across Vice City: recon targets, select tactical approaches (**Subtle** vs. **Loud**), crack bank vault tumblers in an authentic **Safe-Cracking Mini-Game**, assemble specialist crews, draw architectural infiltration & high-speed getaway routes on procedural blueprints using **[@unlayer/react-image-editor](https://github.com/unlayer/react-image-editor)**, simulate the heist with interactive telemetry, witness the getaway via an animated **Sky-Weazel 4 CCTV Police Pursuit** with dynamic sirens and multi-voice news broadcasts, split the loot in **The Cut**, and generate procedural **VCPD & FBI Most Wanted Evidence Dossiers**.

Built for the **Build with React Image Editor Challenge** by [Unlayer](https://unlayer.com/).

> **Disclaimer:** This is an unofficial, non-commercial fan concept. Grand Theft Auto and GTA VI are trademarks of Take-Two Interactive / Rockstar Games. This project is not affiliated with, endorsed by, or sponsored by them. All artwork is original or user-supplied.

---

## ⚡ Recent Updates & Major Features

### 1. 🔐 Rotary Tumbler Vault Safe-Cracking Mini-Game
- **Authentic Heavy Vault Door:** Photorealistic heavy brushed-steel vault door with high-specular brass tumbler combination dial (0–99), tension needle, and locking pin indicators.
- **Precision Controls:** Turn the dial smoothly using **mouse drag / touch swipe**, **keyboard arrow keys (`[←]` / `[→]`)**, or **mouse scroll wheel**.
- **Procedural Web Audio Synthesizers:**
  - *Proximity Dial Clicks:* Mechanical tumbler clicks increase in frequency and sharpen as the dial nears the secret combination gate ($\le 3^\circ$).
  - *Heavy Metallic Clank:* A resonant pin-locking sound fires when each of the 3 gates is cracked.
  - *Pneumatic Steam Hiss:* High-pressure release sound effect plays upon unsealing all 3 locks.
  - *Silent Alarm Klaxon:* High-tension pulsing alarm if the 30-second countdown expires.
- **Crew Specialist Synergy:** Equipping **Nora "Specter" Bell** activates her *Acoustic Stethoscope Perk*, doubling sweet-spot audio fidelity and expanding gate tolerance.
- **Heist Payout Impact:** Successfully cracking the safe awards **+$450,000 in bearer bonds & diamonds** to "The Cut" payout screen and guarantees an S-Rank vault extraction!

### 2. 🚨 VCPD / FBI "MOST WANTED" Mugshot & Evidence Board
- **Dual-Mode 1920×1080 High-Resolution Canvas:**
  - **FBI Corkboard Case File:** Pinboard with authentic cork texture, crime scene polaroids, evidence exhibit tags (*"EXHIBIT A: SAPPHIRE HARBOR VAULT BLUEPRINT"*), red yarn strings connecting targets and crew, procedural coffee ring stains, and classified stamps.
  - **Retro VCPD Wanted Poster:** Iconic 80s/modern Vice City Police Department street bulletin with monochrome duo-tone crew mugshots, warning headers (*"ARMED & EXTREMELY DANGEROUS"*), active FBI bounties (up to $2,500,000), Florida criminal statutes, and police dispatch hotlines.
- **Procedural Criminal Dossier:** Automatically generates Florida penal code statutes (Grand Larceny, Cyber Espionage, Explosives Trafficking), syndicate codenames, aliases, and booking numbers based on your assembled crew.
- **Full React Image Editor Tie-In:** Click *"Customize Evidence Dossier"* to open `@unlayer/react-image-editor` pre-loaded with forensic tools—add red yarn annotations, classified watermarks, fingerprint stamps, evidence tags, and custom text before high-res PNG export.

### 3. 🌊 Vice City Sunset Neon Shutter & Cinematic Blur Transition
- **60fps Fluid Screen Transition:** Replaces harsh screen cuts with an ultra-smooth cinematic transition.
- **Ocean Drive Anamorphic Sweep:** Dual-tone neon gradient sweep (**Ocean Drive Cyan `#00e5ff`** & **Sunset Pink `#ff2d78`**) glides horizontally across the screen like an anamorphic lens flare.
- **Silky Blur & Scale Dynamics:** The outgoing screen gracefully blurs (`blur(10px)`) and scales down (`scale(0.97)`), while the incoming screen smoothly scales in (`scale(1.03) → scale(1.0)`) into crisp focus with zero pop-in.

### 4. 💰 "The Cut" Heist Payout & Crew Splitter
- **Dynamic Loot Allocation:** Interactive cut distribution sliders for the **Mastermind**, chosen specialists (**Zara, Milo, Rico, Sable, Nora**), and **Syndicate Money Laundering / Fence fees**.
- **Real-Time Web Audio Cash Tally:** Procedural ticking cash SFX as numbers ramp up.
- **Dynamic Valuation:** Automatically factors in base target loot, grade multipliers, tactical bonuses (Ghost Operator / Kinetic Breach), and Safe-Cracking mini-game loot (+$450,000).
- **Cryptographic Wire Transfer Slip:** Instant generation of a verifiable offshore transfer receipt complete with unique transaction hashes and download capability.

### 5. 📱 ViceGram / Bleeter 9:16 Viral Social Reel Generator
- **Vertical Smartphone Getaway Canvas:** 9:16 aspect ratio video reel simulator tracking your getaway car drifting through Ocean Drive.
- **Live Social Commentary Stream:** Procedural citizen reactions and memes (*"Bro really drifted past VCPD HQ 💀"*, *"Is that the Ocean Drive vault car?!"*).
- **React Image Editor Integration:** Crop, stamp viral stickers, and overlay custom captions directly using `@unlayer/react-image-editor`.

### 6. 📹 Weazel News Live CCTV Pursuit & Multi-Cam HUD
- **Sky-Weazel 4 Helicopter Pursuit:** Real-time animated canvas tracking getaway vehicles through Vice City streets with police cruiser intercept physics, drifting tire smoke, and gyro-stabilized FLIR crosshairs.
- **Multi-Cam Switcher:** Switch live feeds between *Sky-Weazel 4 Chopper*, *Street CCTV Intersection*, *Vault Security Feed*, and *Police Dashcam*.
- **AI Voice News Anchor & Police Scanner:** Multi-voice Web Speech API news broadcast accompanied by synthesized police scanner radio dispatch chatter.
- **Desynchronized 3-Cruiser Siren Engine:** Real-time Web Audio sirens with continuous frequency drift (Lead Wail, Flanker Yelp, Tactical Piercer) and manual police air horn bursts.

### 7. 📊 Vercel Speed Insights Integration
- Integrated `@vercel/speed-insights/react` directly in the application root (`<SpeedInsights />`) to deliver real-time Core Web Vitals monitoring, performance score tracking, and production telemetry.

---

## 🎨 Multi-Touchpoint React Image Editor Showcase

Rather than using `@unlayer/react-image-editor` as a simple cosmetic previewer, **The Vice Syndicate integrates the editor across 7 core mission workflows**, making it the primary interactive driver of gameplay and visual storytelling:

| # | Heist Workflow | Screen / Modal | Editor Capabilities & Custom Toolset |
|---|---|---|---|
| **1** | **Infiltration Blueprint Planning** | `PlanScreen` (Stage 1) | Freehand tactical brush strokes analyzed by the BFS topological routing & Euclidean ink detection engine. |
| **2** | **Getaway Navigation Planning** | `PlanScreen` (Stage 2) | Route plotting across Vice City street maps with roadblock collision raycasting and speed calculations. |
| **3** | **Surveillance Reconnaissance** | `TargetScreen` | Marking up architectural target photos with directional arrows, tactical callouts, highlighters, and crops. |
| **4** | **Undercover Crew Dossiers** | `CrewScreen` | Customizing operative mugshots with tactical balaclavas, stealth shades, disguises, and polaroid frames. |
| **5** | **1920×1080 Master Briefing Board** | `BriefingScreen` | Stamping classified watermarks, operation codenames, syndicate seals, and exporting high-res operational dossiers. |
| **6** | **VCPD & FBI Evidence Locker** | `ResultScreen` / Evidence Board | Forensic annotations: drawing connecting red yarn, blood spatter, fingerprint stamps, and "EXHIBIT A" tags over 1080p case files. |
| **7** | **ViceGram Viral Social Reel** | `ResultScreen` / Viral Reel | 9:16 vertical smartphone crop, meme sticker stamps, filter grading, and viral headline text overlays before social sharing. |

### Deep Programmatic API Control (`src/editor/EditorModal.tsx`)
The application wraps `@unlayer/react-image-editor` in a custom HUD interface with extensive runtime features:
- **Dynamic Theme Switching:** Toggle seamlessly between `dark` and `light` themes via `updateOptions()`.
- **Runtime Internationalization:** Instant locale switching (`en`, `es`, `fr`, `de`, `ja`).
- **Dynamic Toolbar Docking:** Flip docking between `left` and `right` screen edges.
- **Contextual Tool Configurations:** Mounts specialized toolsets tailored to the current context (`drawing`-only for blueprints, `crop`/`filter` for recon, full forensic suite for evidence dossiers).
- **Change Detection & State Management:** Tracks unsaved changes via `hasChanges()`, allows instant image reset, and provides one-click snapshot exports.

---

## 📐 How React Image Editor Drives the Mathematical Analysis Engine

When players sketch infiltration paths through bank vaults or getaway routes across Vice City streets, **their brushstrokes are converted into mathematical trajectories that directly drive simulation scoring and heist outcomes:**

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

### Step-by-Step Mathematical Pipeline

#### 1. Dual-Buffer Euclidean Ink Extraction (`src/analysis/ink.ts`)
The engine rasterizes both the pristine base blueprint (`baseData`) and the player's edited canvas (`editedData`) into raw `Uint8ClampedArray` pixel buffers. For every sampled coordinate cell, the engine calculates the Euclidean color distance in 3D RGB space:

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
* **Nora "Specter" Bell (Infiltrator):** Doubles acoustic audio fidelity in the Safe-Cracking mini-game and expands tumbler lock tolerance.

#### 6. Weighted Scoring Formula & Grade Assignment (`src/analysis/scoring.ts`)
The final heist plan is graded on a weighted 100-point scale:

$$\text{Final Score} = (\text{Completeness} \times 0.60) + (\text{Stealth} \times 0.30) + (\text{Efficiency} \times 0.10)$$

| Score Range | Grade | Outcome | Status |
|:---:|:---:|:---:|:---:|
| **95 – 100** | **S** | Mastermind Execution | **APPROVED** |
| **85 – 94** | **A** | Professional Operation | **APPROVED** |
| **70 – 84** | **B** | Solid Plan | **APPROVED** |
| **55 – 69** | **C** | High Risk — Barely Passable | **APPROVED** |
| **40 – 54** | **D** | Compromised Route | **FAILED** |
| **< 40** | **F** | Disaster / Incomplete | **FAILED** |

#### 7. Tactical Approach Mechanics: Subtle vs. Loud Branching
The GTA V/Movie-style tactical choice dynamically reshapes both the canvas editor and the simulation mathematics:
* **Plan A: The Subtle Route (Ghost Operator):**
  * **Blueprint Overlays:** Renders ventilation ducts, keycard bypass terminals, and precise CCTV cones.
  * **Mathematical Penalties:** Camera exposures carry a 1.5× penalty ($-\text{penalty} \times 1.5$) unless neutralized by the Hacker. Uncompromised runs earn a $+5$ point **GHOST OPERATOR** stealth bonus.
  * **Playback Telemetry:** Silent ingress with cyan stealth sensor pings and whisper telemetry.
* **Plan B: The Loud Route (Kinetic Breach):**
  * **Blueprint Overlays:** Renders C4 structural weak points with blast radius arcs and SWAT intercept warning zones.
  * **Mathematical Penalties:** Ignores camera cones ($0$ camera detection penalty). Instead, guards/SWAT carry a $1.2\times$ confrontation penalty ($-\text{penalty} \times 1.2$), and high-speed blitz trajectories earn a $+5$ point **KINETIC BREACH** bonus.
  * **Playback Telemetry:** Kinetic C4 wall detonations, thermal lance vault breaching, and hot-pink breach telemetry.

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | React | `19.2.8` | Next-generation React with strict mode, hooks, and Concurrent Mode |
| **Language** | TypeScript | `~6.0.2` | Strict type safety across mathematical models, state, and rendering |
| **Build Tool** | Vite | `8.3.0` | Ultra-fast HMR and optimized Rolldown production bundling (< 1s build) |
| **Image Editor** | **[@unlayer/react-image-editor](https://github.com/unlayer/react-image-editor)** | `^1.0.2` | Core creative engine for drawing, annotating, stamping, filtering & cropping |
| **Performance** | **[@vercel/speed-insights](https://vercel.com/docs/speed-insights)** | `^2.0.0` | Real-time Core Web Vitals monitoring & production telemetry |
| **State Management** | Zustand | `^5.0.15` | Centralized reactive store for mission configuration, crew, and scores |
| **Animation Engine** | GSAP + `@gsap/react` | `^3.15.0` | High-performance 60fps UI animations, timeline triggers, and sweeps |
| **Local Persistence** | `idb-keyval` | `^6.3.0` | Asynchronous IndexedDB storage for heavy blueprint canvas data |
| **Audio Engine** | Web Audio API | Native | Pure procedural synthesizers: tumbler clicks, steam hiss, sirens, cash tickers |
| **Voice Synthesis** | Web Speech API | Native | Multi-voice AI Weazel News anchors & VCPD police scanner dispatches |
| **Graphics Engine** | HTML5 Canvas 2D | Native | Procedural blueprints, 1080p briefing boards, FBI corkboards, CCTV chases |
| **Typography** | Fontsource + Rockstar Fonts | `^5.3.0` | Authentic **Pricedown**, **Chalet (London & NY 1960)**, Space Mono, Bebas Neue |
| **Testing** | Vitest | `^5.0.1` | **58/58 unit tests passing** across 6 test suites |
| **Linter** | oxlint | `^1.81.0` | High-speed Rust-based linter for clean, robust code |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `18.0.0` or higher
- npm `9.0.0` or higher

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/Subhash21022/GTA-6-HEIST-PLANNER-REACT-IMAGE-EDITOR-.git
cd GTA-6-HEIST-PLANNER-REACT-IMAGE-EDITOR-

# Install dependencies
npm install

# Launch development server
npm run dev
# Open http://localhost:5174 in your browser
```

### Verification & Testing

```bash
# Run unit test suite (58 unit tests)
npm test

# Type-check TypeScript codebase
npm run typecheck

# Run linter
npm run lint

# Compile production bundle
npm run build
```

---

## 📦 Production Deployment

The project is built as an ultra-fast, zero-backend static single-page application (SPA). It can be deployed in seconds to any modern hosting platform:

```bash
npm run build
# Production output is generated in the dist/ folder
```

### Vercel Deployment
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set Framework Preset to **Vite**.
3. Deploy! Vercel Speed Insights is automatically pre-configured via `@vercel/speed-insights/react` for instant Core Web Vitals analytics.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
