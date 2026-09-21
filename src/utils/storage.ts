import { get, set, del } from 'idb-keyval';

const LS_KEY = 'heist-planner-state';

export interface PersistedMeta {
  targetId: string;
  crewIds: string[];
  infiltrationScore: number | null;
  getawayScore: number | null;
  screen: string;
  approach?: 'subtle' | 'loud';
}

export function saveMeta(meta: PersistedMeta): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(meta));
  } catch {
    /* quota exceeded or private browsing — silently fail */
  }
}

export function loadMeta(): PersistedMeta | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedMeta;
  } catch {
    return null;
  }
}

export function clearMeta(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

export async function saveImage(key: string, dataUrl: string): Promise<void> {
  try {
    await set(key, dataUrl);
  } catch {
    /* IDB not available — fall through to in-memory */
  }
}

export async function loadImage(key: string): Promise<string | null> {
  try {
    const val = await get<string>(key);
    return val ?? null;
  } catch {
    return null;
  }
}

export async function deleteImage(key: string): Promise<void> {
  try {
    await del(key);
  } catch {
    /* ignore */
  }
}

export async function clearAllImages(): Promise<void> {
  const keys = [
    'infiltration-annotated',
    'getaway-annotated',
    'briefing-board',
    'briefing-final',
  ];
  for (const k of keys) {
    await deleteImage(k);
  }
}
