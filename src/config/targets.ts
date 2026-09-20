export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room {
  label: string;
  rect: Rect;
}

export interface Door {
  x: number;
  y: number;
  horizontal: boolean;
}

export interface EntryPoint {
  id: string;
  label: string;
  zone: Rect;
}

export interface Camera {
  id: string;
  position: Point;
  angle: number;
  fov: number;
  range: number;
}

export interface PatrolPath {
  id: string;
  points: Point[];
}

export interface Hazard {
  id: string;
  label: string;
  zone: Rect;
}

export interface TargetLayout {
  canvasWidth: number;
  canvasHeight: number;
  rooms: Room[];
  walls: [Point, Point][];
  doors: Door[];
  entries: EntryPoint[];
  vault: Rect;
  exits: EntryPoint[];
  cameras: Camera[];
  patrols: PatrolPath[];
  hazards: Hazard[];
  parLength: number;
  sampleRoute: Point[];
}

export interface GetawayLayout {
  canvasWidth: number;
  canvasHeight: number;
  roads: [Point, Point][];
  water: Rect[];
  bridge: { from: Point; to: Point; width: number };
  blocks: Rect[];
  parks: Rect[];
  start: Rect;
  safehouse: Rect;
  roadblocks: Hazard[];
  sampleRoute: Point[];
  parLength: number;
  streetNames: { pos: Point; label: string; angle: number }[];
}

export interface Target {
  id: string;
  name: string;
  dossierText: string;
  difficulty: number;
  cameraCount: number;
  guardCount: number;
  vaultType: string;
  baseTake: number;
  heroImage: string;
  blueprintImage?: string;
  layout: TargetLayout;
  getaway: GetawayLayout;
}

export const TARGETS: Target[] = [
  {
    id: 'sable-trust',
    name: 'Sable Trust Bank',
    dossierText:
      'Downtown branch of Sable Trust, the oldest private bank in Leonida. The main hall has marble floors and a central teller island. Two security cameras cover the lobby. The vault sits behind a reinforced steel door in the back corridor. Rumour has it the night shift runs a skeleton crew — three guards on rotation. The service entrance faces the alley.',
    difficulty: 2,
    cameraCount: 4,
    guardCount: 3,
    vaultType: 'Steel reinforced',
    baseTake: 2_400_000,
    heroImage: '/images/target-sable.png',
    blueprintImage: '/images/blueprint-sable.png',
    layout: {
      canvasWidth: 1600,
      canvasHeight: 1000,
      rooms: [
        { label: 'Main Lobby', rect: { x: 200, y: 200, w: 500, h: 400 } },
        { label: 'Teller Area', rect: { x: 350, y: 350, w: 200, h: 100 } },
        { label: 'Back Corridor', rect: { x: 700, y: 250, w: 150, h: 500 } },
        { label: 'Vault Room', rect: { x: 900, y: 350, w: 300, h: 250 } },
        { label: 'Manager Office', rect: { x: 900, y: 150, w: 250, h: 180 } },
        { label: 'Security Room', rect: { x: 200, y: 650, w: 200, h: 150 } },
        { label: 'Service Hall', rect: { x: 450, y: 650, w: 250, h: 150 } },
        { label: 'Break Room', rect: { x: 1250, y: 350, w: 200, h: 250 } },
      ],
      walls: [
        [{ x: 150, y: 150 }, { x: 750, y: 150 }],
        [{ x: 150, y: 150 }, { x: 150, y: 850 }],
        [{ x: 150, y: 850 }, { x: 750, y: 850 }],
        [{ x: 750, y: 150 }, { x: 750, y: 850 }],
        [{ x: 750, y: 250 }, { x: 900, y: 250 }],
        [{ x: 750, y: 750 }, { x: 900, y: 750 }],
        [{ x: 850, y: 150 }, { x: 1500, y: 150 }],
        [{ x: 850, y: 150 }, { x: 850, y: 850 }],
        [{ x: 850, y: 850 }, { x: 1500, y: 850 }],
        [{ x: 1500, y: 150 }, { x: 1500, y: 850 }],
        [{ x: 850, y: 340 }, { x: 1500, y: 340 }],
        [{ x: 850, y: 610 }, { x: 1500, y: 610 }],
        [{ x: 1250, y: 340 }, { x: 1250, y: 610 }],
        [{ x: 150, y: 640 }, { x: 750, y: 640 }],
        [{ x: 440, y: 640 }, { x: 440, y: 850 }],
      ],
      doors: [
        { x: 300, y: 150, horizontal: true },
        { x: 750, y: 450, horizontal: false },
        { x: 900, y: 470, horizontal: false },
        { x: 1100, y: 340, horizontal: true },
        { x: 300, y: 640, horizontal: true },
        { x: 580, y: 850, horizontal: true },
        { x: 850, y: 470, horizontal: false },
      ],
      entries: [
        { id: 'E1', label: 'Front entrance', zone: { x: 260, y: 140, w: 80, h: 30 } },
        { id: 'E2', label: 'Service entrance', zone: { x: 540, y: 840, w: 80, h: 30 } },
      ],
      vault: { x: 950, y: 400, w: 200, h: 150 },
      exits: [
        { id: 'X1', label: 'Front exit', zone: { x: 260, y: 140, w: 80, h: 30 } },
        { id: 'X2', label: 'Back alley', zone: { x: 540, y: 840, w: 80, h: 30 } },
        { id: 'X3', label: 'Fire escape', zone: { x: 1490, y: 450, w: 30, h: 80 } },
      ],
      cameras: [
        { id: 'C1', position: { x: 200, y: 200 }, angle: 135, fov: 60, range: 200 },
        { id: 'C2', position: { x: 650, y: 200 }, angle: 225, fov: 60, range: 200 },
        { id: 'C3', position: { x: 850, y: 470 }, angle: 0, fov: 70, range: 180 },
        { id: 'C4', position: { x: 1200, y: 350 }, angle: 180, fov: 60, range: 150 },
      ],
      patrols: [
        { id: 'P1', points: [{ x: 300, y: 400 }, { x: 600, y: 400 }, { x: 600, y: 600 }, { x: 300, y: 600 }] },
        { id: 'P2', points: [{ x: 780, y: 300 }, { x: 780, y: 700 }] },
      ],
      hazards: [
        { id: 'L1', label: 'Laser grid', zone: { x: 880, y: 430, w: 40, h: 80 } },
      ],
      parLength: 120,
      sampleRoute: [
        { x: 580, y: 855 },
        { x: 580, y: 750 },
        { x: 500, y: 700 },
        { x: 500, y: 640 },
        { x: 500, y: 550 },
        { x: 720, y: 550 },
        { x: 780, y: 500 },
        { x: 850, y: 470 },
        { x: 920, y: 470 },
        { x: 1000, y: 470 },
        { x: 1000, y: 470 },
        { x: 1100, y: 470 },
        { x: 1100, y: 340 },
        { x: 1100, y: 250 },
        { x: 1200, y: 200 },
        { x: 1400, y: 200 },
        { x: 1500, y: 490 },
      ],
    },
    getaway: {
      canvasWidth: 1600,
      canvasHeight: 1000,
      roads: [
        [{ x: 100, y: 300 }, { x: 1500, y: 300 }],
        [{ x: 100, y: 500 }, { x: 800, y: 500 }],
        [{ x: 100, y: 700 }, { x: 1500, y: 700 }],
        [{ x: 300, y: 100 }, { x: 300, y: 900 }],
        [{ x: 600, y: 100 }, { x: 600, y: 900 }],
        [{ x: 900, y: 100 }, { x: 900, y: 900 }],
        [{ x: 1200, y: 100 }, { x: 1200, y: 900 }],
        [{ x: 900, y: 500 }, { x: 1500, y: 500 }],
        [{ x: 800, y: 500 }, { x: 800, y: 700 }],
      ],
      water: [
        { x: 0, y: 850, w: 1600, h: 150 },
      ],
      bridge: { from: { x: 700, y: 850 }, to: { x: 900, y: 850 }, width: 40 },
      blocks: [
        { x: 120, y: 320, w: 160, h: 160 },
        { x: 320, y: 320, w: 260, h: 160 },
        { x: 620, y: 320, w: 260, h: 160 },
        { x: 920, y: 320, w: 260, h: 160 },
        { x: 1220, y: 320, w: 260, h: 160 },
        { x: 120, y: 520, w: 160, h: 160 },
        { x: 320, y: 520, w: 260, h: 160 },
        { x: 620, y: 520, w: 160, h: 160 },
        { x: 920, y: 520, w: 260, h: 160 },
        { x: 1220, y: 520, w: 260, h: 160 },
        { x: 120, y: 720, w: 160, h: 110 },
        { x: 320, y: 720, w: 260, h: 110 },
        { x: 620, y: 720, w: 260, h: 110 },
        { x: 920, y: 720, w: 260, h: 110 },
        { x: 1220, y: 720, w: 260, h: 110 },
      ],
      parks: [
        { x: 340, y: 540, w: 220, h: 140 },
      ],
      start: { x: 560, y: 265, w: 80, h: 70 },
      safehouse: { x: 1350, y: 720, w: 100, h: 80 },
      roadblocks: [
        { id: 'RB1', label: 'Police roadblock', zone: { x: 880, y: 280, w: 40, h: 40 } },
        { id: 'RB2', label: 'Police roadblock', zone: { x: 1180, y: 480, w: 40, h: 40 } },
      ],
      sampleRoute: [
        { x: 600, y: 300 },
        { x: 750, y: 300 },
        { x: 900, y: 300 },
        { x: 900, y: 400 },
        { x: 900, y: 500 },
        { x: 1050, y: 500 },
        { x: 1200, y: 500 },
        { x: 1200, y: 600 },
        { x: 1200, y: 700 },
        { x: 1350, y: 700 },
        { x: 1400, y: 750 },
      ],
      parLength: 100,
      streetNames: [
        { pos: { x: 400, y: 290 }, label: 'OCEAN DRIVE', angle: 0 },
        { pos: { x: 1000, y: 690 }, label: 'PALM BOULEVARD', angle: 0 },
        { pos: { x: 590, y: 450 }, label: 'MARINA ST', angle: -90 },
        { pos: { x: 1190, y: 450 }, label: 'FLAMINGO AVE', angle: -90 },
      ],
    },
  },
  {
    id: 'gilded-flamingo',
    name: 'The Gilded Flamingo Casino',
    dossierText:
      'The crown jewel of the Vice City strip. High rollers and low morals fill its neon-lit gaming floors. The counting room sits on the mezzanine behind biometric doors. Cameras blanket the floor — eight visible, possibly more hidden. A private elevator connects to the penthouse suite. The loading dock on the south side handles armoured cash transfers at 3 AM sharp.',
    difficulty: 3,
    cameraCount: 6,
    guardCount: 5,
    vaultType: 'Biometric counting room',
    baseTake: 5_800_000,
    heroImage: '/images/target-flamingo.png',
    blueprintImage: '/images/blueprint-flamingo.png',
    layout: {
      canvasWidth: 1600,
      canvasHeight: 1000,
      rooms: [
        { label: 'Gaming Floor', rect: { x: 200, y: 150, w: 600, h: 500 } },
        { label: 'VIP Lounge', rect: { x: 850, y: 150, w: 300, h: 250 } },
        { label: 'Counting Room', rect: { x: 850, y: 450, w: 300, h: 200 } },
        { label: 'Kitchen', rect: { x: 200, y: 700, w: 300, h: 150 } },
        { label: 'Backstage', rect: { x: 550, y: 700, w: 250, h: 150 } },
        { label: 'Staff Corridor', rect: { x: 800, y: 680, w: 120, h: 170 } },
        { label: 'Security Hub', rect: { x: 1200, y: 150, w: 250, h: 200 } },
        { label: 'Loading Dock', rect: { x: 1200, y: 450, w: 250, h: 200 } },
        { label: 'Elevator Shaft', rect: { x: 1180, y: 370, w: 60, h: 60 } },
      ],
      walls: [
        [{ x: 150, y: 100 }, { x: 850, y: 100 }],
        [{ x: 150, y: 100 }, { x: 150, y: 900 }],
        [{ x: 150, y: 900 }, { x: 950, y: 900 }],
        [{ x: 850, y: 100 }, { x: 850, y: 680 }],
        [{ x: 150, y: 680 }, { x: 850, y: 680 }],
        [{ x: 540, y: 680 }, { x: 540, y: 900 }],
        [{ x: 800, y: 100 }, { x: 1500, y: 100 }],
        [{ x: 800, y: 680 }, { x: 800, y: 900 }],
        [{ x: 950, y: 680 }, { x: 950, y: 900 }],
        [{ x: 1500, y: 100 }, { x: 1500, y: 700 }],
        [{ x: 800, y: 420 }, { x: 1500, y: 420 }],
        [{ x: 800, y: 680 }, { x: 1500, y: 680 }],
        [{ x: 1180, y: 100 }, { x: 1180, y: 420 }],
        [{ x: 1180, y: 420 }, { x: 1180, y: 680 }],
      ],
      doors: [
        { x: 400, y: 100, horizontal: true },
        { x: 850, y: 300, horizontal: false },
        { x: 1000, y: 420, horizontal: true },
        { x: 850, y: 550, horizontal: false },
        { x: 400, y: 680, horizontal: true },
        { x: 1180, y: 550, horizontal: false },
        { x: 1350, y: 680, horizontal: true },
        { x: 870, y: 900, horizontal: true },
      ],
      entries: [
        { id: 'E1', label: 'Main entrance', zone: { x: 360, y: 90, w: 80, h: 30 } },
        { id: 'E2', label: 'Loading dock', zone: { x: 1310, y: 670, w: 80, h: 30 } },
      ],
      vault: { x: 900, y: 480, w: 200, h: 140 },
      exits: [
        { id: 'X1', label: 'Main entrance', zone: { x: 360, y: 90, w: 80, h: 30 } },
        { id: 'X2', label: 'Loading dock', zone: { x: 1310, y: 670, w: 80, h: 30 } },
        { id: 'X3', label: 'Staff exit', zone: { x: 830, y: 890, w: 80, h: 30 } },
      ],
      cameras: [
        { id: 'C1', position: { x: 200, y: 150 }, angle: 135, fov: 70, range: 250 },
        { id: 'C2', position: { x: 750, y: 150 }, angle: 225, fov: 60, range: 200 },
        { id: 'C3', position: { x: 500, y: 600 }, angle: 0, fov: 80, range: 180 },
        { id: 'C4', position: { x: 850, y: 450 }, angle: 90, fov: 60, range: 180 },
        { id: 'C5', position: { x: 1450, y: 150 }, angle: 225, fov: 60, range: 200 },
        { id: 'C6', position: { x: 1450, y: 450 }, angle: 225, fov: 70, range: 200 },
      ],
      patrols: [
        { id: 'P1', points: [{ x: 300, y: 300 }, { x: 700, y: 300 }, { x: 700, y: 550 }, { x: 300, y: 550 }] },
        { id: 'P2', points: [{ x: 900, y: 200 }, { x: 1100, y: 200 }, { x: 1100, y: 380 }, { x: 900, y: 380 }] },
        { id: 'P3', points: [{ x: 1250, y: 500 }, { x: 1400, y: 500 }, { x: 1400, y: 650 }, { x: 1250, y: 650 }] },
      ],
      hazards: [],
      parLength: 140,
      sampleRoute: [
        { x: 400, y: 105 },
        { x: 400, y: 250 },
        { x: 500, y: 350 },
        { x: 650, y: 400 },
        { x: 750, y: 500 },
        { x: 810, y: 550 },
        { x: 850, y: 550 },
        { x: 900, y: 550 },
        { x: 1000, y: 550 },
        { x: 1000, y: 500 },
        { x: 1000, y: 450 },
        { x: 1100, y: 420 },
        { x: 1180, y: 550 },
        { x: 1350, y: 680 },
      ],
    },
    getaway: {
      canvasWidth: 1600,
      canvasHeight: 1000,
      roads: [
        [{ x: 100, y: 250 }, { x: 1500, y: 250 }],
        [{ x: 100, y: 500 }, { x: 1500, y: 500 }],
        [{ x: 100, y: 750 }, { x: 700, y: 750 }],
        [{ x: 250, y: 100 }, { x: 250, y: 900 }],
        [{ x: 500, y: 100 }, { x: 500, y: 900 }],
        [{ x: 750, y: 100 }, { x: 750, y: 900 }],
        [{ x: 1000, y: 100 }, { x: 1000, y: 900 }],
        [{ x: 1300, y: 100 }, { x: 1300, y: 500 }],
        [{ x: 1000, y: 750 }, { x: 1500, y: 750 }],
      ],
      water: [
        { x: 700, y: 760, w: 300, h: 240 },
      ],
      bridge: { from: { x: 750, y: 750 }, to: { x: 750, y: 900 }, width: 40 },
      blocks: [
        { x: 270, y: 270, w: 210, h: 210 },
        { x: 520, y: 270, w: 210, h: 210 },
        { x: 770, y: 270, w: 210, h: 210 },
        { x: 1020, y: 270, w: 260, h: 210 },
        { x: 270, y: 520, w: 210, h: 210 },
        { x: 520, y: 520, w: 210, h: 210 },
        { x: 770, y: 520, w: 210, h: 210 },
        { x: 1020, y: 520, w: 260, h: 210 },
        { x: 120, y: 770, w: 110, h: 110 },
        { x: 270, y: 770, w: 210, h: 110 },
        { x: 520, y: 770, w: 160, h: 110 },
        { x: 1020, y: 770, w: 260, h: 110 },
      ],
      parks: [
        { x: 790, y: 540, w: 170, h: 170 },
      ],
      start: { x: 1270, y: 460, w: 60, h: 80 },
      safehouse: { x: 140, y: 780, w: 90, h: 80 },
      roadblocks: [
        { id: 'RB1', label: 'Police roadblock', zone: { x: 730, y: 240, w: 40, h: 40 } },
        { id: 'RB2', label: 'Police roadblock', zone: { x: 480, y: 490, w: 40, h: 40 } },
        { id: 'RB3', label: 'Police roadblock', zone: { x: 230, y: 740, w: 40, h: 40 } },
      ],
      sampleRoute: [
        { x: 1300, y: 500 },
        { x: 1200, y: 500 },
        { x: 1000, y: 500 },
        { x: 850, y: 500 },
        { x: 750, y: 500 },
        { x: 600, y: 500 },
        { x: 500, y: 500 },
        { x: 500, y: 600 },
        { x: 500, y: 750 },
        { x: 350, y: 750 },
        { x: 250, y: 750 },
        { x: 180, y: 790 },
      ],
      parLength: 110,
      streetNames: [
        { pos: { x: 350, y: 240 }, label: 'SUNSET STRIP', angle: 0 },
        { pos: { x: 800, y: 490 }, label: 'BAYSHORE AVE', angle: 0 },
        { pos: { x: 490, y: 400 }, label: 'NEON BLVD', angle: -90 },
        { pos: { x: 990, y: 650 }, label: 'CORAL WAY', angle: -90 },
      ],
    },
  },
  {
    id: 'villa-aurelia',
    name: 'Villa Aurelia',
    dossierText:
      'A private estate perched on the Leonida coast, home to a reclusive tech billionaire. The grounds include a pool house, a detached art gallery, and a panic room hidden beneath the master bedroom. Motion sensors line the garden perimeter. The art collection alone is worth forty million — if you can get past the laser grid in the gallery wing. Best approached from the sea wall at low tide.',
    difficulty: 4,
    cameraCount: 5,
    guardCount: 4,
    vaultType: 'Panic room (subterranean)',
    baseTake: 12_000_000,
    heroImage: '/images/target-villa.png',
    blueprintImage: '/images/blueprint-villa.png',
    layout: {
      canvasWidth: 1600,
      canvasHeight: 1000,
      rooms: [
        { label: 'Garden', rect: { x: 100, y: 100, w: 400, h: 350 } },
        { label: 'Pool House', rect: { x: 100, y: 500, w: 250, h: 200 } },
        { label: 'Main Hall', rect: { x: 550, y: 150, w: 400, h: 300 } },
        { label: 'Gallery Wing', rect: { x: 1000, y: 150, w: 350, h: 300 } },
        { label: 'Master Bedroom', rect: { x: 550, y: 500, w: 300, h: 250 } },
        { label: 'Kitchen', rect: { x: 900, y: 500, w: 250, h: 250 } },
        { label: 'Panic Room', rect: { x: 650, y: 780, w: 200, h: 150 } },
        { label: 'Sea Wall Path', rect: { x: 1200, y: 550, w: 300, h: 100 } },
        { label: 'Garage', rect: { x: 1200, y: 700, w: 250, h: 150 } },
      ],
      walls: [
        [{ x: 50, y: 50 }, { x: 1000, y: 50 }],
        [{ x: 50, y: 50 }, { x: 50, y: 750 }],
        [{ x: 50, y: 750 }, { x: 530, y: 750 }],
        [{ x: 1000, y: 50 }, { x: 1000, y: 480 }],
        [{ x: 530, y: 50 }, { x: 530, y: 480 }],
        [{ x: 530, y: 480 }, { x: 1000, y: 480 }],
        [{ x: 50, y: 480 }, { x: 530, y: 480 }],
        [{ x: 530, y: 480 }, { x: 530, y: 960 }],
        [{ x: 530, y: 960 }, { x: 900, y: 960 }],
        [{ x: 900, y: 480 }, { x: 900, y: 960 }],
        [{ x: 870, y: 480 }, { x: 1550, y: 480 }],
        [{ x: 1550, y: 480 }, { x: 1550, y: 900 }],
        [{ x: 900, y: 900 }, { x: 1550, y: 900 }],
        [{ x: 960, y: 50 }, { x: 1400, y: 50 }],
        [{ x: 1400, y: 50 }, { x: 1400, y: 480 }],
        [{ x: 870, y: 480 }, { x: 870, y: 780 }],
        [{ x: 530, y: 780 }, { x: 870, y: 780 }],
        [{ x: 1180, y: 480 }, { x: 1180, y: 900 }],
        [{ x: 1180, y: 680 }, { x: 1550, y: 680 }],
      ],
      doors: [
        { x: 530, y: 300, horizontal: false },
        { x: 1000, y: 300, horizontal: false },
        { x: 700, y: 480, horizontal: true },
        { x: 900, y: 600, horizontal: false },
        { x: 700, y: 780, horizontal: true },
        { x: 1180, y: 600, horizontal: false },
        { x: 300, y: 480, horizontal: true },
        { x: 1350, y: 680, horizontal: true },
      ],
      entries: [
        { id: 'E1', label: 'Garden gate', zone: { x: 200, y: 40, w: 80, h: 30 } },
        { id: 'E2', label: 'Sea wall', zone: { x: 1400, y: 470, w: 80, h: 30 } },
      ],
      vault: { x: 680, y: 810, w: 140, h: 100 },
      exits: [
        { id: 'X1', label: 'Garden gate', zone: { x: 200, y: 40, w: 80, h: 30 } },
        { id: 'X2', label: 'Garage', zone: { x: 1400, y: 890, w: 80, h: 30 } },
        { id: 'X3', label: 'Sea wall', zone: { x: 1400, y: 470, w: 80, h: 30 } },
      ],
      cameras: [
        { id: 'C1', position: { x: 100, y: 100 }, angle: 135, fov: 70, range: 200 },
        { id: 'C2', position: { x: 950, y: 150 }, angle: 180, fov: 60, range: 220 },
        { id: 'C3', position: { x: 1350, y: 100 }, angle: 225, fov: 60, range: 200 },
        { id: 'C4', position: { x: 700, y: 480 }, angle: 180, fov: 70, range: 180 },
        { id: 'C5', position: { x: 1200, y: 680 }, angle: 90, fov: 60, range: 200 },
      ],
      patrols: [
        { id: 'P1', points: [{ x: 200, y: 200 }, { x: 400, y: 200 }, { x: 400, y: 400 }, { x: 200, y: 400 }] },
        { id: 'P2', points: [{ x: 600, y: 200 }, { x: 900, y: 200 }, { x: 900, y: 400 }, { x: 600, y: 400 }] },
        { id: 'P3', points: [{ x: 1250, y: 550 }, { x: 1500, y: 550 }] },
      ],
      hazards: [
        { id: 'L1', label: 'Laser grid', zone: { x: 1050, y: 200, w: 250, h: 200 } },
        { id: 'M1', label: 'Motion sensor', zone: { x: 150, y: 350, w: 300, h: 80 } },
      ],
      parLength: 160,
      sampleRoute: [
        { x: 1440, y: 485 },
        { x: 1350, y: 530 },
        { x: 1250, y: 570 },
        { x: 1180, y: 600 },
        { x: 1050, y: 600 },
        { x: 950, y: 600 },
        { x: 900, y: 600 },
        { x: 800, y: 600 },
        { x: 700, y: 550 },
        { x: 700, y: 480 },
        { x: 700, y: 600 },
        { x: 700, y: 700 },
        { x: 700, y: 780 },
        { x: 750, y: 850 },
        { x: 750, y: 900 },
        { x: 700, y: 780 },
        { x: 600, y: 700 },
        { x: 550, y: 600 },
        { x: 350, y: 480 },
        { x: 300, y: 480 },
        { x: 240, y: 55 },
      ],
    },
    getaway: {
      canvasWidth: 1600,
      canvasHeight: 1000,
      roads: [
        [{ x: 100, y: 200 }, { x: 1500, y: 200 }],
        [{ x: 100, y: 450 }, { x: 1500, y: 450 }],
        [{ x: 100, y: 700 }, { x: 1500, y: 700 }],
        [{ x: 200, y: 100 }, { x: 200, y: 900 }],
        [{ x: 500, y: 100 }, { x: 500, y: 900 }],
        [{ x: 800, y: 100 }, { x: 800, y: 700 }],
        [{ x: 1100, y: 100 }, { x: 1100, y: 900 }],
        [{ x: 1400, y: 100 }, { x: 1400, y: 900 }],
      ],
      water: [
        { x: 800, y: 710, w: 300, h: 290 },
      ],
      bridge: { from: { x: 950, y: 700 }, to: { x: 950, y: 850 }, width: 40 },
      blocks: [
        { x: 220, y: 220, w: 260, h: 210 },
        { x: 520, y: 220, w: 260, h: 210 },
        { x: 820, y: 220, w: 260, h: 210 },
        { x: 1120, y: 220, w: 260, h: 210 },
        { x: 220, y: 470, w: 260, h: 210 },
        { x: 520, y: 470, w: 260, h: 210 },
        { x: 1120, y: 470, w: 260, h: 210 },
        { x: 120, y: 720, w: 60, h: 160 },
        { x: 220, y: 720, w: 260, h: 160 },
        { x: 520, y: 720, w: 260, h: 160 },
        { x: 1120, y: 720, w: 260, h: 160 },
      ],
      parks: [
        { x: 540, y: 490, w: 220, h: 170 },
      ],
      start: { x: 1370, y: 660, w: 60, h: 80 },
      safehouse: { x: 140, y: 740, w: 60, h: 80 },
      roadblocks: [
        { id: 'RB1', label: 'Police roadblock', zone: { x: 1080, y: 440, w: 40, h: 40 } },
        { id: 'RB2', label: 'Police roadblock', zone: { x: 480, y: 190, w: 40, h: 40 } },
      ],
      sampleRoute: [
        { x: 1400, y: 700 },
        { x: 1300, y: 700 },
        { x: 1100, y: 700 },
        { x: 1100, y: 600 },
        { x: 1100, y: 450 },
        { x: 950, y: 450 },
        { x: 800, y: 450 },
        { x: 650, y: 450 },
        { x: 500, y: 450 },
        { x: 500, y: 550 },
        { x: 500, y: 700 },
        { x: 350, y: 700 },
        { x: 200, y: 700 },
        { x: 170, y: 760 },
      ],
      parLength: 130,
      streetNames: [
        { pos: { x: 350, y: 190 }, label: 'COASTAL HIGHWAY', angle: 0 },
        { pos: { x: 800, y: 440 }, label: 'VILLA ROAD', angle: 0 },
        { pos: { x: 1090, y: 400 }, label: 'CLIFF DR', angle: -90 },
        { pos: { x: 490, y: 600 }, label: 'HARBOR LANE', angle: -90 },
      ],
    },
  },
];
