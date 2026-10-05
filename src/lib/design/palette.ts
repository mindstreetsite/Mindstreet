import type { BlockTheme, BlockType } from "@/lib/cms/types";

/** Primitive values from the Figma Test-page palette. Keep in sync with :root in globals.css. */
export const color = {
  navy: "#0A2A3A",
  steel: "#5E7F9A",
  fog: "#E8E7E7",
  charcoal: "#3A3A45",
  rust: "#955035",
  sage: "#719F8D",
  coral: "#E37C64",
  sand: "rgba(205, 183, 151, 0.5)",
  mist: "#E9EDEF",
  slate: "#54809E",
  coralTint: "rgba(227, 124, 100, 0.4)",
  linen: "#E6DBCB",
  ice: "#C4DBE5",
  blush: "rgba(225, 188, 171, 0.4)",
  white: "#FFFFFF",
  navyLys: "#CBD9E3",
  navyMork: "#060E14",
  steelLys: "#C5D3DB",
  steelMork: "#364E60",
  fogLys: "#F5F5F4",
  fogMork: "#B0AFAF",
  charcoalLys: "#C4C4CA",
  charcoalMork: "#1C1C22",
  rustLys: "#D6BEAF",
  rustMork: "#54301E",
} as const;

/** Unnamed Figma samples that are not surfaces or admin roles. */
export const leftoverSwatches = ["#C9856F", "#829D8F", "#C6B99E"] as const;

export const onDark = color.white;
export const onLight = color.navy;

export type Surface = {
  id: BlockTheme;
  label: string;
  color: string;
  on: string;
};

const darkTextSurfaces = new Set<BlockTheme>([
  "ink",
  "steel",
  "slate",
  "charcoal",
  "rust",
  "sage",
]);

function surface(id: BlockTheme, label: string, value: string): Surface {
  return {
    id,
    label,
    color: value,
    on: darkTextSurfaces.has(id) ? onDark : onLight,
  };
}

export const surfaces: Surface[] = [
  surface("sand", "Sand", color.sand),
  surface("mist", "Dimma", color.mist),
  surface("cream", "Grädde", color.rustLys),
  surface("white", "Vit", color.white),
  surface("slate", "Slate", color.slate),
  surface("coralTint", "Coral (tunn)", color.coralTint),
  surface("coral", "Coral", color.coral),
  surface("sage", "Sage", color.sage),
  surface("linen", "Linen", color.linen),
  surface("ink", "Navy", color.navy),
  surface("steel", "Steel blue", color.steel),
  surface("fog", "Warm gray", color.fog),
  surface("charcoal", "Dark gray", color.charcoal),
  surface("rust", "Rust", color.rust),
  surface("ice", "Ice", color.ice),
  surface("blush", "Blush", color.blush),
];

const surfacesById = new Map(surfaces.map((item) => [item.id, item]));

export function surfaceById(id: BlockTheme): Surface | undefined {
  return surfacesById.get(id);
}

export const roles = {
  canvas: color.fogLys,
  paper: color.white,
  rail: color.navy,
  primary: color.navy,
  text: color.navy,
  muted: color.steel,
  border: color.charcoalLys,
  accent: color.rust,
  notice: color.rustLys,
  noticeText: color.rust,
  danger: color.rustMork,
  positive: color.sage,
} as const;

const moduleSurfaces: BlockTheme[] = [
  "sand",
  "coral",
  "sage",
  "slate",
  "steel",
  "ink",
  "fog",
  "mist",
  "linen",
  "ice",
  "blush",
];

const textSurfaces: BlockTheme[] = ["white", "fog", "mist", "linen", "blush", "sand"];

const statementSurfaces: BlockTheme[] = [...textSurfaces, "ink", "charcoal", "rust"];

const themesByType: Partial<Record<BlockType, BlockTheme[]>> = {
  imageText: moduleSurfaces,
  contact: moduleSurfaces,
  imagePair: moduleSurfaces,
  split: moduleSurfaces,
  lead: textSurfaces,
  text: textSurfaces,
  article: textSurfaces,
  sectionHeader: textSurfaces,
  statement: statementSurfaces,
};

function surfacesFor(ids: BlockTheme[]): Surface[] {
  return ids.flatMap((id) => {
    const item = surfacesById.get(id);
    return item ? [item] : [];
  });
}

export function themesFor(type: BlockType): Surface[] {
  const ids = themesByType[type];
  return ids ? surfacesFor(ids) : [];
}

export function swatchesFor(type: BlockType, current?: BlockTheme): Surface[] {
  const allowed = themesFor(type);
  if (!current || allowed.some((item) => item.id === current)) return allowed;
  const extra = surfacesById.get(current);
  return extra ? [extra, ...allowed] : allowed;
}
