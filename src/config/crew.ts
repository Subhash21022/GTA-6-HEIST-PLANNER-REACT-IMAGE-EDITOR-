import type { CrewModifierId } from './scoring';

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  modifierId: CrewModifierId;
  bio: string;
  portrait: string;
  colors: { primary: string; accent: string; rim: string };
}

export const CREW_MEMBERS: CrewMember[] = [
  {
    id: 'rico',
    name: 'Rico Valens',
    role: 'Driver',
    modifierId: 'driver',
    bio: 'Ex-speedboat racer who knows every back road and canal in Leonida.',
    portrait: '/images/crew-rico.png',
    colors: { primary: '#1a1a3a', accent: '#ff6b35', rim: '#ff6b35' },
  },
  {
    id: 'zara',
    name: 'Zara Nyx',
    role: 'Hacker',
    modifierId: 'hacker',
    bio: 'Former telecom security — can loop any camera feed in under thirty seconds.',
    portrait: '/images/crew-zara.png',
    colors: { primary: '#1a1a3a', accent: '#00e5c7', rim: '#00e5c7' },
  },
  {
    id: 'milo',
    name: 'Milo Torque',
    role: 'Safecracker',
    modifierId: 'safecracker',
    bio: 'Third-generation locksmith with a perfect record on biometric vaults.',
    portrait: '/images/crew-milo.png',
    colors: { primary: '#1a1a3a', accent: '#ffaa22', rim: '#ffaa22' },
  },
  {
    id: 'sable',
    name: 'Sable Cross',
    role: 'Muscle',
    modifierId: 'muscle',
    bio: 'Retired cage fighter — handles hostile encounters so the crew doesn\'t have to.',
    portrait: '/images/crew-sable.png',
    colors: { primary: '#1a1a3a', accent: '#ff2d78', rim: '#ff2d78' },
  },
  {
    id: 'kai',
    name: 'Kai Mendez',
    role: 'Inside Man',
    modifierId: 'insideMan',
    bio: 'Planted in security firms across Vice City — always has someone on the inside.',
    portrait: '/images/crew-kai.png',
    colors: { primary: '#1a1a3a', accent: '#c084fc', rim: '#c084fc' },
  },
  {
    id: 'lena',
    name: 'Lena Argent',
    role: 'Face',
    modifierId: 'face',
    bio: 'Con artist and disguise expert — can talk her way past any checkpoint.',
    portrait: '/images/crew-lena.png',
    colors: { primary: '#1a1a3a', accent: '#00d4ff', rim: '#00d4ff' },
  },
];

export const CREW_PICK_COUNT = 3;
