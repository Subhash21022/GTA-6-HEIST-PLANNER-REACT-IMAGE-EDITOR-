export interface ToolsConfig {
  crop?: boolean | { enabled?: boolean; icon?: string };
  resize?: boolean | { enabled?: boolean; icon?: string };
  filter?: boolean | { enabled?: boolean; icon?: string };
  draw?: boolean | { enabled?: boolean; icon?: string };
  text?: boolean | { enabled?: boolean; icon?: string };
  shapes?: boolean | { enabled?: boolean; icon?: string };
  stickers?: boolean | { enabled?: boolean; icon?: string };
  frame?: boolean | { enabled?: boolean; icon?: string };
}

export const PLANNING_TOOLS: ToolsConfig = {
  crop: false,
  resize: false,
  filter: false,
  draw: true,
  text: true,
  shapes: true,
  stickers: true,
  frame: false,
};

export const BRIEFING_TOOLS: ToolsConfig = {
  crop: false,
  resize: false,
  filter: true,
  draw: true,
  text: true,
  shapes: true,
  stickers: true,
  frame: true,
};

export const DISGUISE_TOOLS: ToolsConfig = {
  crop: false,
  resize: false,
  filter: true,
  draw: true,
  text: true,
  shapes: true,
  stickers: true,
  frame: true,
};

export const RECON_TOOLS: ToolsConfig = {
  crop: false,
  resize: false,
  filter: true,
  draw: true,
  text: true,
  shapes: true,
  stickers: true,
  frame: false,
};

export const NEWS_TOOLS: ToolsConfig = {
  crop: false,
  resize: false,
  filter: true,
  draw: true,
  text: true,
  shapes: true,
  stickers: true,
  frame: true,
};
