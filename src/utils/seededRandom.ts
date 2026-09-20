export function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

const ADJECTIVES = [
  'Silent', 'Golden', 'Crimson', 'Neon', 'Midnight', 'Velvet',
  'Shadow', 'Solar', 'Iron', 'Coral', 'Amber', 'Scarlet',
  'Phantom', 'Electric', 'Emerald', 'Obsidian', 'Sterling', 'Blazing',
];

const ANIMALS = [
  'Flamingo', 'Panther', 'Barracuda', 'Iguana', 'Pelican', 'Viper',
  'Marlin', 'Falcon', 'Stingray', 'Mantis', 'Osprey', 'Gecko',
  'Cobra', 'Heron', 'Jaguar', 'Mako', 'Raptor', 'Toucan',
];

export function generateCodename(seed: number): string {
  const rng = seededRandom(seed);
  const adj = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(rng() * ANIMALS.length)];
  return `${adj} ${animal}`;
}
