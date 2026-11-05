import type { BlockTheme, BlockType, ShapeColor, TextColor } from "@/lib/cms/types";

/** Primitive values from the Figma Test-page palette. Keep in sync with :root in globals.css. */
export const color = {
  navy: "#0A2A3A",
  steel: "#5E7F9A",
  fog: "#E8E7E7",
  charcoal: "#3A3A45",
  rust: "#955035",
  brown: "#B37C55",
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
  /** Figma figure fill. Not a module background. */
  figure: "#E8F0F4",
  /** Figma heading and body ink. Also an article background, with white text. */
  indigo: "#21134D",
  /** Text and heading swatch only. Not a module background. */
  black: "#000000",
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
export const onLight = color.indigo;

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
  "indigo",
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
  surface("linen", "Linne", color.linen),
  surface("ink", "Marinblå", color.navy),
  surface("steel", "Stålblå", color.steel),
  surface("fog", "Varmgrå", color.fog),
  surface("charcoal", "Mörkgrå", color.charcoal),
  surface("rust", "Rost", color.rust),
  surface("brown", "Brun", color.brown),
  surface("ice", "Ice", color.ice),
  surface("blush", "Blush", color.blush),
];

const indigoSurface = surface("indigo", "Indigo", color.indigo);

const surfacesById = new Map<BlockTheme, Surface>([
  ...surfaces.map((item) => [item.id, item] as const),
  [indigoSurface.id, indigoSurface],
]);

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

export type TextSwatch = {
  id: TextColor;
  label: string;
  color: string;
};

export const textColorSwatches: TextSwatch[] = [
  { id: "auto", label: "Automatisk", color: "" },
  ...surfaces.map((item) => ({ id: item.id, label: item.label, color: item.color })),
  { id: "indigo", label: "Indigo", color: color.indigo },
  { id: "black", label: "Svart", color: color.black },
];

const textColorById = new Map(textColorSwatches.map((item) => [item.id, item]));

function figureMix(value: string, percent: number): string {
  return `color-mix(in srgb, ${value} ${percent}%, transparent)`;
}

/** Dark surfaces sit at 50%, with a more transparent 25% pair. */
function darkFigure(id: ShapeColor, softId: ShapeColor, label: string, value: string) {
  return [
    { id, label: `${label} 50 %`, color: figureMix(value, 50) },
    { id: softId, label: `${label} 25 %`, color: figureMix(value, 25) },
  ];
}

/** Other surfaces sit at 30%, with a more transparent 15% pair. */
function lightFigure(id: ShapeColor, softId: ShapeColor, label: string, value: string) {
  return [
    { id, label: `${label} 30 %`, color: figureMix(value, 30) },
    { id: softId, label: `${label} 15 %`, color: figureMix(value, 15) },
  ];
}

export const figureSwatches: { id: ShapeColor; label: string; color: string }[] = [
  { id: "haze", label: "Ljusblå 50 %", color: figureMix(color.figure, 50) },
  { id: "linen", label: "Linne 30 %", color: `color-mix(in srgb, ${color.linen} 30%, transparent)` },
  { id: "veil", label: "Vit 10 %", color: "rgba(255, 255, 255, 0.1)" },
  ...darkFigure("navy", "navySoft", "Marinblå", color.navy),
  ...darkFigure("steel", "steelSoft", "Stålblå", color.steel),
  ...darkFigure("slate", "slateSoft", "Slate", color.slate),
  ...darkFigure("charcoal", "charcoalSoft", "Mörkgrå", color.charcoal),
  ...darkFigure("rust", "rustSoft", "Rost", color.rust),
  ...darkFigure("sage", "sageSoft", "Sage", color.sage),
  ...darkFigure("indigo", "indigoSoft", "Indigo", color.indigo),
  ...lightFigure("coral", "coralSoft", "Coral", color.coral),
  ...lightFigure("brown", "brownSoft", "Brun", color.brown),
  ...lightFigure("ice", "iceSoft", "Ice", color.ice),
  ...lightFigure("cream", "creamSoft", "Grädde", color.rustLys),
];

const figureFillById = new Map(figureSwatches.map((item) => [item.id, item.color]));

export function figureFill(id?: ShapeColor): string {
  return figureFillById.get(id ?? "haze") ?? figureMix(color.figure, 50);
}

export function resolveTextColor(id?: TextColor): string | undefined {
  if (!id || id === "auto") return undefined;
  return textColorById.get(id)?.color;
}

/** Same colors as rubrikfärg and textfärg, without Automatisk. */
const colorSurfaces: BlockTheme[] = [...surfaces.map((item) => item.id), "indigo"];

const themesByType: Partial<Record<BlockType, BlockTheme[]>> = {
  imageText: colorSurfaces,
  contact: colorSurfaces,
  contactCards: colorSurfaces,
  imagePair: colorSurfaces,
  text: colorSurfaces,
  textColumn: colorSurfaces,
  contactUs: colorSurfaces,
  article: colorSurfaces,
  sectionHeader: colorSurfaces,
  statement: colorSurfaces,
  pageHeader: colorSurfaces,
  expertise: colorSurfaces,
  offering: colorSurfaces,
  news: colorSurfaces,
  newsTwelve: colorSurfaces,
  articleList: colorSurfaces,
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
