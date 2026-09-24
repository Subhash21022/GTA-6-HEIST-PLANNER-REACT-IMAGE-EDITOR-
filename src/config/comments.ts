import type { CrewMember } from './crew';

export interface CitizenComment {
  id: string;
  handle: string;
  name: string;
  avatarColor: string;
  avatarInitial: string;
  verified: boolean;
  text: string;
  timeAgo: string;
  likes: string;
}

export interface ViralPostMetadata {
  platform: 'ViceGram' | 'Bleeter';
  authorName: string;
  authorHandle: string;
  authorAvatarColor: string;
  authorVerified: boolean;
  caption: string;
  hashtags: string[];
  musicTrack: string;
  initialLikes: number;
  commentsCount: string;
  sharesCount: string;
  liveViewers: string;
}

export const CITIZEN_COMMENTS_POOL = {
  loud: [
    {
      handle: '@fl_man_daily',
      name: 'Leonida Man',
      avatarColor: '#ff6b35',
      verified: true,
      text: 'Bro who just saw 3 cop cars chasing a muscle car on Washington Beach?! 💀😭',
    },
    {
      handle: '@bayside_bree',
      name: 'Bree In Vice',
      avatarColor: '#ff2d78',
      verified: false,
      text: 'Sable Trust got hit AGAIN lol ain\'t no way 💀💀',
    },
    {
      handle: '@ocean_drifter',
      name: 'Ocean Drive Drift',
      avatarColor: '#00f0ff',
      verified: true,
      text: 'LOOK AT THAT APEX DRIFT AROUND THE PALM TREES HOLY W DRIVER 🔥🏎️',
    },
    {
      handle: '@gator_patrol',
      name: 'Swamp Gator',
      avatarColor: '#10b981',
      verified: false,
      text: 'AIR-1 chopper spotlight is literally illuminating my living room rn 🚁👀',
    },
    {
      handle: '@vice_shopper',
      name: 'Malibu Dave',
      avatarColor: '#f59e0b',
      verified: false,
      text: 'Bro think he in Fast & Furious 😭 VCPD cruisers spinning out on the sand',
    },
    {
      handle: '@miami_snaps',
      name: 'Vice Snaps',
      avatarColor: '#a855f7',
      verified: true,
      text: '5 stars in under 2 minutes is CRAZY work ⭐️⭐️⭐️⭐️⭐️',
    },
    {
      handle: '@lucia_fanclub',
      name: 'Lucia & Jason Watch',
      avatarColor: '#ec4899',
      verified: false,
      text: 'Someone tell Lucia and Jason to chill out the whole city is on lockdown 💀',
    },
    {
      handle: '@noose_spotter',
      name: 'Tactical Leonida',
      avatarColor: '#3b82f6',
      verified: true,
      text: 'NOOSE Bearcat armored vehicles just crossed the Venetian causeway stay inside!!',
    },
    {
      handle: '@vice_crocs',
      name: 'Tropical Dan',
      avatarColor: '#14b8a6',
      verified: false,
      text: 'MY SLIPPERS FLEW OFF WHEN THAT V8 ROARED BY MY BALCONY 😭😭',
    },
  ],
  subtle: [
    {
      handle: '@vice_insider',
      name: 'Vice Insider',
      avatarColor: '#00f0ff',
      verified: true,
      text: 'Wait did someone just walk out of the vault with duffel bags and casually call a cab? 💀',
    },
    {
      handle: '@security_fails',
      name: 'Leonida Sec Fails',
      avatarColor: '#ff2d78',
      verified: true,
      text: 'Security guards were literally watching Bleeter reels while the vault got emptied lmaoo',
    },
    {
      handle: '@ghost_spotter',
      name: 'Silent Ingress',
      avatarColor: '#8b5cf6',
      verified: false,
      text: 'Zero alarms triggered?! Who planned this heist, Ethan Hunt?! 👻💼',
    },
    {
      handle: '@downtown_dan',
      name: 'Downtown Dan',
      avatarColor: '#f59e0b',
      verified: false,
      text: 'The branch manager is definitely getting fired tomorrow morning 😭',
    },
    {
      handle: '@crypto_vice',
      name: 'Leonida Crypto',
      avatarColor: '#10b981',
      verified: false,
      text: 'Cleanest ghost exfiltration in Vice City history no cap 🧢🔥',
    },
    {
      handle: '@telecom_geek',
      name: 'Grid Hacker VC',
      avatarColor: '#06b6d4',
      verified: true,
      text: 'They looped the CCTV with an empty corridor recording for 30 minutes straight genius 🧠',
    },
    {
      handle: '@sunshine_sam',
      name: 'Sammy Sunset',
      avatarColor: '#f97316',
      verified: false,
      text: 'Average Tuesday afternoon in Vice City honestly 🌴🍹',
    },
  ],
};

export function getViralComments(
  approach: 'subtle' | 'loud',
  crew: CrewMember[] = [],
  targetName: string = 'TARGET',
): CitizenComment[] {
  const pool = approach === 'loud' ? CITIZEN_COMMENTS_POOL.loud : CITIZEN_COMMENTS_POOL.subtle;
  const list: CitizenComment[] = pool.map((c, idx) => ({
    id: `comm-${idx}`,
    handle: c.handle,
    name: c.name,
    avatarColor: c.avatarColor,
    avatarInitial: c.name[0].toUpperCase(),
    verified: c.verified,
    text: c.text.replace('Sable Trust', targetName),
    timeAgo: `${(idx + 1) * 2}s ago`,
    likes: `${Math.floor(120 + idx * 85)}`,
  }));

  // Dynamic crew specific comments
  if (crew.some((c) => c.modifierId === 'hacker')) {
    list.unshift({
      id: 'comm-hacker',
      handle: '@fiber_optic_vc',
      name: 'Grid Specialist',
      avatarColor: '#00e5c7',
      avatarInitial: 'G',
      verified: true,
      text: 'Every single traffic light on Ocean Drive just flashed green all at once who is hacking the grid?! 🚥🤯',
      timeAgo: 'Just now',
      likes: '1.4K',
    });
  }

  if (crew.some((c) => c.modifierId === 'driver')) {
    list.unshift({
      id: 'comm-driver',
      handle: '@street_kings_vc',
      name: 'Vice Tuners',
      avatarColor: '#ff6b35',
      avatarInitial: 'V',
      verified: true,
      text: 'That counter-steer 4-wheel drift through the construction zone was pure art 🏁🏎️💨',
      timeAgo: 'Just now',
      likes: '2.8K',
    });
  }

  return list;
}

export function generateViralPostMetadata(
  targetName: string,
  approach: 'subtle' | 'loud',
  _crew: CrewMember[] = [],
  score: number = 88,
): ViralPostMetadata {
  const upperTarget = targetName.toUpperCase();

  if (approach === 'loud') {
    return {
      platform: 'ViceGram',
      authorName: 'Vice City Citizen Cam',
      authorHandle: '@vicecity_live',
      authorAvatarColor: '#ff007f',
      authorVerified: true,
      caption: `BRO IS CURRENTLY DOING 140 MPH ON OCEAN DRIVE ESCAPING 5 PATROL CARS AFTER BLOWING UP ${upperTarget} 💀😭💥🏎️💨 VCPD CANNOT KEEP UP!`,
      hashtags: ['#ViceCity', '#PoliceChase', '#Leonida', '#Bravado', '#GTA6', '#ViralReels'],
      musicTrack: 'Vice Wave (140 BPM Pursuit Remix) - DJ Leonida',
      initialLikes: Math.floor(380000 + score * 1200),
      commentsCount: '24.8K',
      sharesCount: '91.4K',
      liveViewers: '184.2K',
    };
  }

  return {
    platform: 'ViceGram',
    authorName: 'Vice Street Chronicles',
    authorHandle: '@vicestreet_daily',
    authorAvatarColor: '#00f0ff',
    authorVerified: true,
    caption: `HOW DID THEY WALK OUT OF ${upperTarget} WITH 3 DUFFEL BAGS OF CASH WITHOUT A SINGLE ALARM GOING OFF?! 👻💼🔥 Ghost heist of the century!`,
    hashtags: ['#ViceCity', '#GhostHeist', '#Leonida', '#CleanWork', '#GTA6', '#Bleeter'],
    musicTrack: 'Midnight Palms (Lo-Fi Drive) - Vice City FM',
    initialLikes: Math.floor(290000 + score * 950),
    commentsCount: '16.3K',
    sharesCount: '62.7K',
    liveViewers: '129.5K',
  };
}
