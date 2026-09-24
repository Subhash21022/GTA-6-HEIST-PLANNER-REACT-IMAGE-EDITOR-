import type { AnalysisResult } from '../analysis/scoring';
import type { CrewMember } from './crew';

export interface WantedLevelInfo {
  stars: number; // 1 to 5
  title: string;
  statusText: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'MAXIMUM';
  dispatchAgency: string;
  color: string;
  glowColor: string;
}

export interface PoliceDispatchMessage {
  id: string;
  callsign: string;
  unit: string;
  channel: string;
  message: string;
  urgency: 'routine' | 'alert' | 'urgent' | 'critical';
  timestamp: string;
}

/**
 * Calculates the dynamic GTA Wanted Level (1 to 5 stars) based on
 * the chosen tactical approach, camera exposures, guard alerts, roadblocks,
 * and crew specialist perks (e.g. Hacker nullifying cameras, Muscle suppressing guards).
 */
export function calculateWantedLevel(
  approach: 'subtle' | 'loud',
  infiltrationResult: AnalysisResult | null,
  getawayResult: AnalysisResult | null,
  crew: CrewMember[] = [],
): WantedLevelInfo {
  const hasHacker = crew.some(
    (c) => c && (c.modifierId === 'hacker' || c.role?.toLowerCase() === 'hacker' || c.id === 'hacker' || c.id === 'zara'),
  );
  const hasMuscle = crew.some(
    (c) => c && (c.modifierId === 'muscle' || c.role?.toLowerCase() === 'muscle' || c.id === 'muscle' || c.id === 'sable'),
  );

  const rawCameras = infiltrationResult?.crossings.filter((c) =>
    (c.hazardLabel || c.hazardId).toLowerCase().includes('cam'),
  ).length ?? 0;
  const rawGuards = infiltrationResult?.crossings.filter((c) => {
    const text = (c.hazardLabel || c.hazardId).toLowerCase();
    return text.includes('patrol') || text.includes('guard');
  }).length ?? 0;
  const rawRoadblocks = getawayResult?.crossings.filter((c) => {
    const text = (c.hazardLabel || c.hazardId).toLowerCase();
    return text.includes('roadblock') || text.includes('checkpoint');
  }).length ?? 0;

  const effectiveCameras = hasHacker ? 0 : rawCameras;
  const effectiveGuards = hasMuscle ? 0 : rawGuards;
  const effectiveRoadblocks = rawRoadblocks;

  if (approach === 'subtle') {
    // 1 Star: Completely undetected / silent ghost operator
    if (effectiveCameras === 0 && effectiveGuards === 0 && effectiveRoadblocks === 0) {
      return {
        stars: 1,
        title: '1 STAR — SUSPECT UNIDENTIFIED',
        statusText: 'SILENT INGRESS // GHOST OPERATOR // NO ACTIVE PURSUIT',
        threatLevel: 'LOW',
        dispatchAgency: 'VCPD ROUTINE SURVEILLANCE',
        color: '#ffc83b',
        glowColor: 'rgba(255, 200, 59, 0.4)',
      };
    }

    // 2 Stars: Local security spotted something on CCTV
    if (effectiveCameras <= 2 && effectiveGuards === 0 && effectiveRoadblocks === 0) {
      return {
        stars: 2,
        title: '2 STARS — LOCAL SECURITY ALERT',
        statusText: 'CCTV FOOTAGE DETECTED // PATROL UNITS INVESTIGATING',
        threatLevel: 'MEDIUM',
        dispatchAgency: 'VCPD DISTRICT PATROL',
        color: '#ff9400',
        glowColor: 'rgba(255, 148, 0, 0.45)',
      };
    }

    // 3 Stars: Guards alerted, citywide police response
    return {
      stars: 3,
      title: '3 STARS — CITYWIDE POLICE RESPONSE',
      statusText: 'SKY-WEAZEL CHOPPER AIR SUPPORT // INTERCEPT UNITS DISPATCHED',
      threatLevel: 'HIGH',
      dispatchAgency: 'VCPD TACTICAL AIR SUPPORT',
      color: '#ff5500',
      glowColor: 'rgba(255, 85, 0, 0.5)',
    };
  }

  // LOUD APPROACH: Starts at 4 Stars (C4 Breach) and escalates to 5 Stars (SWAT Intercept)
  const loudEscalation = effectiveRoadblocks + (effectiveGuards > 0 ? 1 : 0) + (getawayResult && getawayResult.score < 85 ? 1 : 0);

  if (loudEscalation >= 2) {
    return {
      stars: 5,
      title: '5 STARS — MAXIMUM TACTICAL MANHUNT',
      statusText: 'NOOSE & SWAT ARMORED INTERCEPT // FULL CITY LOCKDOWN',
      threatLevel: 'MAXIMUM',
      dispatchAgency: 'NOOSE TACTICAL COMMAND & VCPD SWAT',
      color: '#ff1275',
      glowColor: 'rgba(255, 18, 117, 0.65)',
    };
  }

  return {
    stars: 4,
    title: '4 STARS — ARMED HEIST MOBILIZATION',
    statusText: 'C4 BREACH REPORTED // SWAT TAC-UNITS ON SCENE',
    threatLevel: 'EXTREME',
    dispatchAgency: 'VCPD SWAT TAC-UNITS',
    color: '#ff2a44',
    glowColor: 'rgba(255, 42, 68, 0.6)',
  };
}

/**
 * Procedural VCPD Police Radio Dispatch Dialogue Pool
 */
export function getPoliceDispatchPool(
  targetName: string,
  approach: 'subtle' | 'loud',
  wantedStars: number,
): PoliceDispatchMessage[] {
  const upperTarget = targetName.toUpperCase();

  if (approach === 'loud' || wantedStars >= 4) {
    return [
      {
        id: 'disp-l1',
        callsign: 'VCPD DISPATCH',
        unit: 'CENTRAL 10',
        channel: 'TAC-1 // 460.125 MHz',
        message: `All units code 3, 10-43 in progress at ${upperTarget}! Heavy C4 structural blast reported, suspect vehicle fleeing scene!`,
        urgency: 'critical',
        timestamp: '19:42:04',
      },
      {
        id: 'disp-l2',
        callsign: 'AIR-1 FLIR',
        unit: 'SKY-WEAZEL GIMBAL',
        channel: 'TAC-1 // 460.125 MHz',
        message: `Air-1 has visual on suspect getaway car traveling northbound on Ocean Drive! Weaving through evening traffic!`,
        urgency: 'urgent',
        timestamp: '19:42:11',
      },
      {
        id: 'disp-l3',
        callsign: 'CRUISER 2-BRAVO',
        unit: 'PURSUIT INTERCEPT',
        channel: 'TAC-1 // 460.125 MHz',
        message: `Suspect is refusing to yield! Requesting authorization for high-speed PIT maneuver on Ocean Beach thoroughfare!`,
        urgency: 'critical',
        timestamp: '19:42:19',
      },
      {
        id: 'disp-l4',
        callsign: 'VCPD DISPATCH',
        unit: 'COMMAND DESK',
        channel: 'TAC-1 // 460.125 MHz',
        message: `PIT maneuver authorized! SWAT intercept squads deploy spike strips at Starfish Bridge roadblock!`,
        urgency: 'critical',
        timestamp: '19:42:27',
      },
      {
        id: 'disp-l5',
        callsign: 'AIR-1 FLIR',
        unit: 'SKY-WEAZEL GIMBAL',
        channel: 'TAC-1 // 460.125 MHz',
        message: `Suspect took a hard power-slide into the industrial canal bypass! Heavy tire smoke detected, perimeter units hold the bridge!`,
        urgency: 'urgent',
        timestamp: '19:42:35',
      },
      {
        id: 'disp-l6',
        callsign: 'SWAT COMMAND',
        unit: 'TACTICAL BEARCAT',
        channel: 'TAC-1 // 460.125 MHz',
        message: `All units be advised, suspect is armed and executing a coordinated getaway. Deploy lethal tactical interdiction!`,
        urgency: 'critical',
        timestamp: '19:42:44',
      },
    ];
  }

  // Subtle / Low Wanted Level Transmissions
  return [
    {
      id: 'disp-s1',
      callsign: 'VCPD DISPATCH',
      unit: 'CENTRAL 10',
      channel: 'TAC-2 // 453.250 MHz',
      message: `Silent alarm trip reported at ${upperTarget}. Nearby patrol units, investigate code 2 for perimeter check.`,
      urgency: 'routine',
      timestamp: '19:42:04',
    },
    {
      id: 'disp-s2',
      callsign: 'UNIT 4-DELTA',
      unit: 'SECTOR PATROL',
      channel: 'TAC-2 // 453.250 MHz',
      message: `10-4 dispatch, en route. No visible structural damage on exterior. Security gates appear bypassed.`,
      urgency: 'alert',
      timestamp: '19:42:12',
    },
    {
      id: 'disp-s3',
      callsign: 'AIR-1 FLIR',
      unit: 'SKY-WEAZEL GIMBAL',
      channel: 'TAC-2 // 453.250 MHz',
      message: `Air-1 scanning perimeter cameras. Unidentified vehicle observed departing service exit, maintaining street speed.`,
      urgency: 'alert',
      timestamp: '19:42:21',
    },
    {
      id: 'disp-s4',
      callsign: 'VCPD DISPATCH',
      unit: 'COMMAND DESK',
      channel: 'TAC-2 // 453.250 MHz',
      message: `Cruiser 2, initiate covert pacing of suspect vehicle. Run automated plate check and request backup if verified.`,
      urgency: 'alert',
      timestamp: '19:42:30',
    },
    {
      id: 'disp-s5',
      callsign: 'CRUISER 2-BRAVO',
      unit: 'PURSUIT INTERCEPT',
      channel: 'TAC-2 // 453.250 MHz',
      message: `Plates returning cloned! Suspect just accelerated hard down Washington Avenue, upgrading to active code 3 pursuit!`,
      urgency: 'urgent',
      timestamp: '19:42:40',
    },
  ];
}
