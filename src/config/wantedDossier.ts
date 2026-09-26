import type { CrewMember } from './crew';
import type { Target } from './targets';
import type { WantedLevelInfo } from './wantedLevel';
import type { HeistPayoutBreakdown } from './payout';
import { formatCurrency } from './payout';

export interface CriminalCharge {
  code: string;
  title: string;
  severity: 'CLASS 1 FELONY' | 'CLASS 2 FELONY' | 'CAPITAL FELONY';
  description: string;
}

export interface SuspectProfile {
  crewId: string;
  name: string;
  role: string;
  alias: string;
  bookingNumber: string;
  portrait: string;
  height: string;
  weight: string;
  hair: string;
  eyes: string;
  status: 'ACTIVE FUGITIVE' | 'ARMED & DANGEROUS' | 'KEY ACCOMPLICE' | 'PRIMARY TARGET';
  specialtyWarning: string;
}

export interface WantedDossierData {
  caseFileNumber: string;
  codename: string;
  targetName: string;
  targetType: string;
  approach: 'subtle' | 'loud';
  wantedStars: number;
  threatLevel: string;
  totalStolen: number;
  totalStolenFormatted: string;
  bountyReward: number;
  bountyRewardFormatted: string;
  suspects: SuspectProfile[];
  charges: CriminalCharge[];
  investigatingUnit: string;
  leadInvestigator: string;
  boloNotice: string;
  getawayIntel: string;
  lastKnownLocation: string;
}

const ALIASES: Record<string, string> = {
  zara: 'THE CIPHER',
  sable: 'THE SLEDGE',
  enzo: 'GHOST PEDAL',
  nora: 'COLD HANDS',
  marcus: 'DEADEYE',
  val: 'CHAMELEON',
  tariq: 'THE BREAKER',
  cleo: 'PHANTOM',
};

const PHYSICAL_PROFILES: Record<string, { height: string; weight: string; hair: string; eyes: string; warning: string }> = {
  zara: { height: '5\'7"', weight: '135 lbs', hair: 'Dark / Braided', eyes: 'Brown', warning: 'Expert in telecom interception and optical sensor looping.' },
  sable: { height: '6\'3"', weight: '240 lbs', hair: 'Buzz cut', eyes: 'Hazel', warning: 'High-caliber weapon specialist. Extreme physical threat.' },
  enzo: { height: '5\'10"', weight: '165 lbs', hair: 'Slicked Black', eyes: 'Brown', warning: 'Master getaway driver. Capable of high-speed pursuit evasion.' },
  nora: { height: '5\'5"', weight: '125 lbs', hair: 'Blonde / Tied', eyes: 'Blue', warning: 'Precision safecracker. Bypasses time-locks and vault tumblers.' },
  marcus: { height: '6\'1"', weight: '190 lbs', hair: 'Shaved', eyes: 'Brown', warning: 'Ex-military marksman. Lethal accuracy over 800 yards.' },
  val: { height: '5\'9"', weight: '150 lbs', hair: 'Brown / Dyed', eyes: 'Green', warning: 'Master of social engineering, false credentials, and disguise.' },
  tariq: { height: '5\'11"', weight: '185 lbs', hair: 'Black', eyes: 'Brown', warning: 'Demolitions specialist with military kinetic ordnance.' },
  cleo: { height: '5\'6"', weight: '130 lbs', hair: 'Silver / Short', eyes: 'Amber', warning: 'Acrobatic infiltrator. Navigates HVAC and motion lasers.' },
};

export function generateWantedDossier(params: {
  codename: string;
  target: Target | null;
  approach: 'subtle' | 'loud';
  crew: CrewMember[];
  customCrewPortraits: Record<string, string>;
  score: number;
  grade: string;
  wantedInfo: WantedLevelInfo;
  payoutBreakdown: HeistPayoutBreakdown;
}): WantedDossierData {
  const {
    codename,
    target,
    approach,
    crew,
    customCrewPortraits,
    wantedInfo,
    payoutBreakdown,
  } = params;

  const targetName = target?.name || 'SABLE TRUST BANK';
  const targetType = target?.vaultType ? `${target.vaultType.toUpperCase()} VAULT` : 'COMMERCIAL FINANCIAL REPOSITORY';
  const caseSeed = Math.abs(codename.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1986));
  const caseFileNumber = `VCPD-2026-${(caseSeed % 89999 + 10000)}`;

  // Bounty Calculation: Base bounty scales exponentially by stars + 12% of loot
  const starBounties = [50000, 150000, 350000, 750000, 1500000];
  const starIdx = Math.max(0, Math.min(4, wantedInfo.stars - 1));
  const baseBounty = starBounties[starIdx];
  const lootBountyAddition = Math.round(payoutBreakdown.actualGrossTake * 0.12);
  const bountyReward = Math.min(2500000, baseBounty + lootBountyAddition);

  // Suspect Profiles
  const suspects: SuspectProfile[] = crew.map((c, i) => {
    const phys = PHYSICAL_PROFILES[c.id] || {
      height: '5\'11"',
      weight: '175 lbs',
      hair: 'Dark',
      eyes: 'Brown',
      warning: 'Extremely dangerous fugitive operative.',
    };

    return {
      crewId: c.id,
      name: c.name,
      role: c.role,
      alias: ALIASES[c.id] || `OPERATIVE #${i + 1}`,
      bookingNumber: `VCPD-BK-${(caseSeed * (i + 3)) % 89999 + 10000}`,
      portrait: customCrewPortraits[c.id] || c.portrait,
      height: phys.height,
      weight: phys.weight,
      hair: phys.hair,
      eyes: phys.eyes,
      status: i === 0 ? 'PRIMARY TARGET' : (wantedInfo.stars >= 4 ? 'ARMED & DANGEROUS' : 'ACTIVE FUGITIVE'),
      specialtyWarning: phys.warning,
    };
  });

  // Procedural Criminal Charges
  const charges: CriminalCharge[] = [
    {
      code: 'FS-812.13(2)(a)',
      title: 'ARMED GRAND LARCENY (VAULT ASSETS)',
      severity: 'CLASS 1 FELONY',
      description: `Unlawful theft and extraction of ${formatCurrency(payoutBreakdown.actualGrossTake)} in insured bullion, diamonds, and bearer bonds from ${targetName}.`,
    },
  ];

  if (approach === 'loud') {
    charges.push({
      code: 'FS-790.161',
      title: 'DISCHARGE OF MILITARY-GRADE HIGH EXPLOSIVES',
      severity: 'CAPITAL FELONY',
      description: 'Detonation of kinetic C4 breach charges causing catastrophic structural trauma to commercial infrastructure.',
    });
  } else {
    charges.push({
      code: 'FS-815.06',
      title: 'CLASS-1 FEDERAL CYBER TERRORISM & SYSTEM INTRUSION',
      severity: 'CLASS 1 FELONY',
      description: 'Unauthorized cipher injection, telecom feed looping, and optical biometric spoofing across metropolitan security grids.',
    });
  }

  if (wantedInfo.stars >= 3) {
    charges.push({
      code: 'FS-784.07',
      title: 'AGGRAVATED ASSAULT ON LAW ENFORCEMENT UNITS',
      severity: 'CLASS 1 FELONY',
      description: 'Brandishing automated munitions, reckless suppression fire, and deliberate endangerment of responding VCPD squad cars.',
    });
  }

  if (wantedInfo.stars >= 4) {
    charges.push({
      code: 'FS-316.1935',
      title: 'FELONY VEHICULAR EVASION & HIGH-SPEED INTERCEPT FLEEING',
      severity: 'CLASS 2 FELONY',
      description: 'Speeds exceeding 140 MPH through Vice City transit corridors; evasion of multiple tactical PIT intercept maneuvers.',
    });
  }

  charges.push({
    code: 'FS-896.101',
    title: 'OFFSHORE MONEY LAUNDERING & ORGANIZED RACKETEERING',
    severity: 'CLASS 1 FELONY',
    description: `Attempted laundering of ${formatCurrency(payoutBreakdown.syndicateAmount)} through offshore Cayman shell accounts.`,
  });

  const leadInvestigators = [
    'DET. LT. H. MANCUSO (BADGE #4409)',
    'CAPT. S. VALENTINE (VCPD TACTICAL)',
    'SPECIAL AGENT J. CROCKETT (FBI / JOINT TASK FORCE)',
    'DET. S. DELGADO (VICE SQUAD)',
  ];
  const leadInvestigator = leadInvestigators[caseSeed % leadInvestigators.length];

  return {
    caseFileNumber,
    codename,
    targetName,
    targetType,
    approach,
    wantedStars: wantedInfo.stars,
    threatLevel: wantedInfo.threatLevel,
    totalStolen: payoutBreakdown.actualGrossTake,
    totalStolenFormatted: formatCurrency(payoutBreakdown.actualGrossTake),
    bountyReward,
    bountyRewardFormatted: formatCurrency(bountyReward),
    suspects,
    charges,
    investigatingUnit: 'VICE CITY POLICE DEPT. • MAJOR CRIMES DIVISION / FBI JTF',
    leadInvestigator,
    boloNotice: 'ALL SUSPECTS MUST BE CONSIDERED ARMED AND EXTREMELY DANGEROUS. CITIZENS ARE WARNED NOT TO ATTEMPT DIRECT APPREHENSION. NOTIFY VCPD DISPATCH IMMEDIATELY.',
    getawayIntel: approach === 'loud'
      ? 'Suspects utilized heavily armored rapid-transit muscle vehicle equipped with tire reinforcement and nitro booster.'
      : 'Suspects utilized suppressed low-profile sports coupe with tinted radar-absorbing finish; zero transponder ping.',
    lastKnownLocation: `${targetName} perimeter → Ocean Drive Causeway eastbound toward Starfish Island.`,
  };
}
