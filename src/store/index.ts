import { create } from 'zustand';
import { TARGETS, type Target } from '../config/targets';
import { CREW_MEMBERS, type CrewMember } from '../config/crew';
import type { AnalysisResult } from '../analysis/scoring';
import { saveMeta, loadMeta, clearMeta, saveImage, loadImage, clearAllImages } from '../utils/storage';

export type Screen =
  | 'title'
  | 'target'
  | 'crew'
  | 'infiltration'
  | 'getaway'
  | 'playback'
  | 'briefing'
  | 'result';

const SCREEN_ORDER: Screen[] = [
  'title', 'target', 'crew', 'infiltration', 'getaway', 'playback', 'briefing', 'result',
];

export interface Toast {
  id: number;
  message: string;
}

interface AppState {
  screen: Screen;
  target: Target | null;
  crew: CrewMember[];
  infiltrationImage: string | null;
  infiltrationResult: AnalysisResult | null;
  getawayImage: string | null;
  getawayResult: AnalysisResult | null;
  briefingImage: string | null;
  finalImage: string | null;
  newsHeadlineImage: string | null;
  codename: string;
  toasts: Toast[];
  editorOpen: boolean;
  hasSavedState: boolean;
  customCrewPortraits: Record<string, string>;
  reconImages: Record<string, string>;

  setScreen: (s: Screen) => void;
  goBack: () => void;
  setTarget: (t: Target) => void;
  setCrew: (c: CrewMember[]) => void;
  setInfiltrationImage: (img: string | null) => void;
  setInfiltrationResult: (r: AnalysisResult | null) => void;
  setGetawayImage: (img: string | null) => void;
  setGetawayResult: (r: AnalysisResult | null) => void;
  setBriefingImage: (img: string | null) => void;
  setFinalImage: (img: string | null) => void;
  setNewsHeadlineImage: (img: string | null) => void;
  setCodename: (c: string) => void;
  setEditorOpen: (open: boolean) => void;
  addToast: (message: string) => void;
  removeToast: (id: number) => void;
  setCustomCrewPortrait: (crewId: string, dataUrl: string) => void;
  setReconImage: (targetId: string, dataUrl: string) => void;
  startOver: () => void;
  persistState: () => void;
  restoreState: () => Promise<void>;
  checkSavedState: () => void;
}

let toastId = 0;

export const useStore = create<AppState>((set, get) => ({
  screen: 'title',
  target: null,
  crew: [],
  infiltrationImage: null,
  infiltrationResult: null,
  getawayImage: null,
  getawayResult: null,
  briefingImage: null,
  finalImage: null,
  newsHeadlineImage: null,
  codename: '',
  toasts: [],
  editorOpen: false,
  hasSavedState: false,
  customCrewPortraits: {},
  reconImages: {},

  setScreen: (s) => set({ screen: s }),

  goBack: () => {
    const { screen } = get();
    const idx = SCREEN_ORDER.indexOf(screen);
    if (idx > 0) {
      set({ screen: SCREEN_ORDER[idx - 1] });
    }
  },

  setTarget: (t) => set({ target: t }),
  setCrew: (c) => set({ crew: c }),

  setInfiltrationImage: (img) => {
    set({ infiltrationImage: img });
    if (img) saveImage('infiltration-annotated', img);
  },

  setInfiltrationResult: (r) => set({ infiltrationResult: r }),

  setGetawayImage: (img) => {
    set({ getawayImage: img });
    if (img) saveImage('getaway-annotated', img);
  },

  setGetawayResult: (r) => set({ getawayResult: r }),

  setBriefingImage: (img) => {
    set({ briefingImage: img });
    if (img) saveImage('briefing-board', img);
  },

  setFinalImage: (img) => {
    set({ finalImage: img });
    if (img) saveImage('briefing-final', img);
  },

  setNewsHeadlineImage: (img) => {
    set({ newsHeadlineImage: img });
    if (img) saveImage('news-headline', img);
  },

  setCodename: (c) => set({ codename: c }),

  setEditorOpen: (open) => set({ editorOpen: open }),

  addToast: (message) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  setCustomCrewPortrait: (crewId, dataUrl) => {
    set((s) => ({
      customCrewPortraits: { ...s.customCrewPortraits, [crewId]: dataUrl },
    }));
    saveImage(`crew-portrait-${crewId}`, dataUrl);
  },

  setReconImage: (targetId, dataUrl) => {
    set((s) => ({
      reconImages: { ...s.reconImages, [targetId]: dataUrl },
    }));
    saveImage(`recon-${targetId}`, dataUrl);
  },

  startOver: () => {
    clearMeta();
    clearAllImages();
    set({
      screen: 'title',
      target: null,
      crew: [],
      infiltrationImage: null,
      infiltrationResult: null,
      getawayImage: null,
      getawayResult: null,
      briefingImage: null,
      finalImage: null,
      newsHeadlineImage: null,
      codename: '',
      hasSavedState: false,
      customCrewPortraits: {},
      reconImages: {},
    });
  },

  persistState: () => {
    const { target, crew, infiltrationResult, getawayResult, screen } = get();
    if (!target) return;
    saveMeta({
      targetId: target.id,
      crewIds: crew.map((c) => c.id),
      infiltrationScore: infiltrationResult?.score ?? null,
      getawayScore: getawayResult?.score ?? null,
      screen,
    });
  },

  restoreState: async () => {
    const meta = loadMeta();
    if (!meta) return;

    const target = TARGETS.find((t) => t.id === meta.targetId) ?? null;
    const crew = meta.crewIds
      .map((id) => CREW_MEMBERS.find((c) => c.id === id))
      .filter((c): c is CrewMember => c !== undefined);

    const infiltrationImage = await loadImage('infiltration-annotated');
    const getawayImage = await loadImage('getaway-annotated');
    const briefingImage = await loadImage('briefing-board');
    const finalImage = await loadImage('briefing-final');
    const newsHeadlineImage = await loadImage('news-headline');

    const customCrewPortraits: Record<string, string> = {};
    for (const c of crew) {
      const img = await loadImage(`crew-portrait-${c.id}`);
      if (img) customCrewPortraits[c.id] = img;
    }

    const reconImages: Record<string, string> = {};
    if (target) {
      const recon = await loadImage(`recon-${target.id}`);
      if (recon) reconImages[target.id] = recon;
    }

    let screen = meta.screen as Screen;
    if (!SCREEN_ORDER.includes(screen)) screen = 'target';

    set({
      target,
      crew,
      infiltrationImage,
      getawayImage,
      briefingImage,
      finalImage,
      newsHeadlineImage,
      screen,
      customCrewPortraits,
      reconImages,
    });
  },

  checkSavedState: () => {
    const meta = loadMeta();
    set({ hasSavedState: meta !== null });
  },
}));
