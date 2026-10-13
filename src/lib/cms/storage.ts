import { defaultMenu, isBuiltinMenuTemplate } from "@/lib/cms/library";
import { seedPages } from "@/lib/cms/seed";
import type { CmsBlock, CmsLink, CmsPage, PageRole } from "@/lib/cms/types";

export type PageArchiveEntry = {
  id: string;
  slug: string;
  deletedAt: string;
  pages: CmsPage[];
};

export type CmsTemplate = {
  slug: string;
  title: string;
  parentSlug?: string;
  role?: PageRole;
  blocks: CmsBlock[];
};

export type TemplateArchiveEntry = {
  id: string;
  slug: string;
  deletedAt: string;
  template: CmsTemplate;
  hiddenPage: boolean;
};

export type TemplateWriteResult = {
  templates: CmsTemplate[] | null;
  archive: TemplateArchiveEntry[] | null;
  error: string | null;
};

export type ArchiveWriteResult = {
  next: CmsPage[] | null;
  archive: PageArchiveEntry[] | null;
  slug?: string;
  error: string | null;
};

const LOCAL_PAGES = "mindstreet-cms-pages";
const LOCAL_ARCHIVE = "mindstreet-cms-page-archive";
const LOCAL_TEMPLATES = "mindstreet-cms-templates";
const LOCAL_TEMPLATE_ARCHIVE = "mindstreet-cms-template-archive";
export const SEED_VERSION = "expertomraden-v1";
const RESERVED = new Set(["admin"]);
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CmsState = {
  pages: CmsPage[];
  archive: PageArchiveEntry[];
  templates: CmsTemplate[];
  templateArchive: TemplateArchiveEntry[];
  menu?: CmsLink[];
};

export function seedState(): CmsState {
  return {
    pages: seedPages,
    archive: [],
    templates: [],
    templateArchive: [],
    menu: defaultMenu(),
  };
}

export function serializeState(state: CmsState) {
  return { ...state, seedVersion: SEED_VERSION };
}

export type PublishedImageUse = {
  slug: string;
  title: string;
};

function blockShowsImage(block: CmsBlock, url: string): boolean {
  if (block.image === url || block.image2 === url) return true;
  const news = block.type === "news" || block.type === "newsTwelve";
  return (block.items ?? []).some((item) => {
    if (item.image !== url) return false;
    if (news && item.published === false) return false;
    return true;
  });
}

export function publishedImageUses(pages: CmsPage[], url: string): PublishedImageUse[] {
  const uses: PublishedImageUse[] = [];
  for (const page of pages) {
    if (!page.published) continue;
    if (!page.blocks.some((block) => blockShowsImage(block, url))) continue;
    uses.push({ slug: page.slug, title: pageTitle(page) });
  }
  return uses;
}

export function blocksWithoutImage(blocks: CmsBlock[], url: string): CmsBlock[] {
  return blocks.map((block) => {
    const items = block.items?.some((item) => item.image === url)
      ? block.items.map((item) => (item.image === url ? { ...item, image: "" } : item))
      : block.items;
    if (block.image !== url && block.image2 !== url && items === block.items) return block;
    const next: CmsBlock = { ...block, items };
    if (next.image === url) delete next.image;
    if (next.image2 === url) delete next.image2;
    return next;
  });
}

function pageWithoutImage(page: CmsPage, url: string): CmsPage {
  const blocks = blocksWithoutImage(page.blocks, url);
  const pending = page.pending ? blocksWithoutImage(page.pending, url) : undefined;
  const blocksSame = blocks.every((block, index) => block === page.blocks[index]);
  const pendingSame =
    pending === undefined ||
    (page.pending !== undefined &&
      pending.every((block, index) => block === page.pending![index]));
  if (blocksSame && pendingSame) return page;
  return pending === undefined ? { ...page, blocks } : { ...page, blocks, pending };
}

export function withoutImage(state: CmsState, url: string): { state: CmsState; changed: boolean } {
  const pages = state.pages.map((page) => pageWithoutImage(page, url));
  const archive = state.archive.map((entry) => {
    const entryPages = entry.pages.map((page) => pageWithoutImage(page, url));
    if (entryPages.every((page, index) => page === entry.pages[index])) return entry;
    return { ...entry, pages: entryPages };
  });
  const templates = state.templates.map((template) => {
    const blocks = blocksWithoutImage(template.blocks, url);
    if (blocks.every((block, index) => block === template.blocks[index])) return template;
    return { ...template, blocks };
  });
  const templateArchive = state.templateArchive.map((entry) => {
    const blocks = blocksWithoutImage(entry.template.blocks, url);
    if (blocks.every((block, index) => block === entry.template.blocks[index])) return entry;
    return { ...entry, template: { ...entry.template, blocks } };
  });
  const changed =
    pages.some((page, index) => page !== state.pages[index]) ||
    archive.some((entry, index) => entry !== state.archive[index]) ||
    templates.some((template, index) => template !== state.templates[index]) ||
    templateArchive.some((entry, index) => entry !== state.templateArchive[index]);
  return {
    state: changed ? { pages, archive, templates, templateArchive, menu: state.menu } : state,
    changed,
  };
}

export function hydrateState(value: unknown): CmsState {
  if (!value || typeof value !== "object") return seedState();
  const raw = value as Partial<CmsState> & { seedVersion?: unknown };
  const pages = Array.isArray(raw.pages)
    ? raw.pages.map(hydratePage).filter((page): page is CmsPage => page !== null)
    : [];
  const archive = Array.isArray(raw.archive)
    ? raw.archive.map(hydrateArchiveEntry).filter((entry): entry is PageArchiveEntry => entry !== null)
    : [];
  const templates = Array.isArray(raw.templates)
    ? raw.templates.map(hydrateTemplate).filter((template): template is CmsTemplate => template !== null)
    : [];
  const templateArchive = Array.isArray(raw.templateArchive)
    ? raw.templateArchive
        .map(hydrateTemplateArchiveEntry)
        .filter((entry): entry is TemplateArchiveEntry => entry !== null)
    : [];

  const nextPages =
    raw.seedVersion === SEED_VERSION
      ? pages
      : (() => {
          const existing = new Set(pages.map((page) => page.slug));
          const missing = seedPages.filter((page) => !existing.has(page.slug));
          return missing.length ? [...missing, ...pages] : pages;
        })();

  return {
    pages: nextPages,
    archive,
    templates: templatesNotMatchingPages(templates, nextPages),
    templateArchive: templateArchive.filter((entry) => !entry.hiddenPage),
    menu: hydrateMenu(raw.menu, nextPages),
  };
}

export function readLocalSnapshot(): CmsState | null {
  if (typeof window === "undefined") return null;
  try {
    const pages = readLocalJson(LOCAL_PAGES);
    if (!Array.isArray(pages) || pages.length === 0) return null;
    return hydrateState({
      pages,
      archive: readLocalJson(LOCAL_ARCHIVE) ?? [],
      templates: readLocalJson(LOCAL_TEMPLATES) ?? [],
      templateArchive: readLocalJson(LOCAL_TEMPLATE_ARCHIVE) ?? [],
      seedVersion: window.localStorage.getItem("mindstreet-cms-seed-version"),
    });
  } catch {
    return null;
  }
}

function readLocalJson(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function templateChoices(templates: CmsTemplate[]): CmsPage[] {
  return orderedPages(
    templates.filter((template) => !isBuiltinMenuTemplate(template.slug)).map(templateAsPage),
  );
}

export function deleteTemplateChoice(
  slug: string,
  templates: CmsTemplate[],
  templateArchive: TemplateArchiveEntry[],
): TemplateWriteResult {
  if (isBuiltinMenuTemplate(slug)) {
    return { templates: null, archive: null, error: "Mallen kan inte tas bort." };
  }
  const stored = templates.find((template) => template.slug === slug);
  if (!stored) {
    return { templates: null, archive: null, error: "Mallen finns inte." };
  }

  const entry: TemplateArchiveEntry = {
    id: crypto.randomUUID(),
    slug,
    deletedAt: new Date().toISOString(),
    template: stored,
    hiddenPage: false,
  };

  return {
    templates: templates.filter((item) => item.slug !== slug),
    archive: [entry, ...templateArchive],
    error: null,
  };
}

export function restoreTemplateChoice(
  id: string,
  templates: CmsTemplate[],
  templateArchive: TemplateArchiveEntry[],
): TemplateWriteResult {
  const entry = templateArchive.find((item) => item.id === id);
  if (!entry) {
    return { templates: null, archive: null, error: "Arkivkopian finns inte." };
  }

  const archive = templateArchive.filter((item) => item.id !== id);
  if (templates.some((template) => template.slug === entry.slug)) {
    return { templates: null, archive: null, error: "Mallen finns redan." };
  }

  return { templates: [...templates, entry.template], archive, error: null };
}

export function pagesRemovedWith(slug: string, pages: CmsPage[]): CmsPage[] {
  const removed = new Set<string>([slug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const page of pages) {
      if (page.parentSlug && removed.has(page.parentSlug) && !removed.has(page.slug)) {
        removed.add(page.slug);
        grew = true;
      }
    }
  }
  return pages.filter((page) => removed.has(page.slug));
}

export function deletePagesToArchive(
  slug: string,
  pages: CmsPage[],
  archive: PageArchiveEntry[],
): ArchiveWriteResult {
  const removed = pagesRemovedWith(slug, pages);
  if (!removed.some((page) => page.slug === slug)) {
    return { next: null, archive: null, error: "Sidan finns inte." };
  }

  const entry: PageArchiveEntry = {
    id: crypto.randomUUID(),
    slug,
    deletedAt: new Date().toISOString(),
    pages: removed,
  };
  const next = pages.filter((page) => !removed.some((item) => item.slug === page.slug));
  return {
    next,
    archive: [entry, ...archive],
    error: null,
  };
}

export function restoreArchivedPages(
  id: string,
  pages: CmsPage[],
  archive: PageArchiveEntry[],
): ArchiveWriteResult {
  const entry = archive.find((item) => item.id === id);
  if (!entry) {
    return { next: null, archive: null, error: "Arkivkopian finns inte." };
  }

  const conflict = entry.pages.find((page) => pages.some((live) => live.slug === page.slug));
  if (conflict) {
    return {
      next: null,
      archive: null,
      error: `Sökvägen /${conflict.slug} används redan, så sidan kan inte återställas.`,
    };
  }

  return {
    next: [...pages, ...entry.pages],
    archive: archive.filter((item) => item.id !== id),
    slug: entry.slug,
    error: null,
  };
}

function templatesNotMatchingPages(templates: CmsTemplate[], pages: CmsPage[]): CmsTemplate[] {
  const live = new Set(pages.map((page) => page.slug));
  return templates.filter((template) => !live.has(template.slug));
}

function templateAsPage(template: CmsTemplate): CmsPage {
  return {
    slug: template.slug,
    title: template.title,
    parentSlug: template.parentSlug,
    role: template.role,
    published: false,
    links: [],
    blocks: template.blocks,
  };
}

function hydrateTemplateArchiveEntry(value: unknown): TemplateArchiveEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<TemplateArchiveEntry>;
  if (typeof entry.id !== "string" || typeof entry.slug !== "string" || typeof entry.deletedAt !== "string") {
    return null;
  }
  const template = hydrateTemplate(entry.template);
  if (!template || template.slug !== entry.slug) return null;
  return {
    id: entry.id,
    slug: entry.slug,
    deletedAt: entry.deletedAt,
    template,
    hiddenPage: entry.hiddenPage === true,
  };
}

function hydrateTemplate(value: unknown): CmsTemplate | null {
  const page = hydratePage(value);
  if (!page) return null;
  return {
    slug: page.slug,
    title: page.title,
    parentSlug: page.parentSlug,
    role: page.role,
    blocks: page.blocks,
  };
}

function hydrateArchiveEntry(value: unknown): PageArchiveEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<PageArchiveEntry>;
  if (typeof entry.id !== "string" || typeof entry.slug !== "string") return null;
  if (typeof entry.deletedAt !== "string" || !Array.isArray(entry.pages)) return null;
  const pages = entry.pages.map(hydratePage).filter((page): page is CmsPage => page !== null);
  if (!pages.some((page) => page.slug === entry.slug)) return null;
  return { id: entry.id, slug: entry.slug, deletedAt: entry.deletedAt, pages };
}

export function getPublishedPage(slug: string, pages: CmsPage[]): CmsPage | null {
  const page = pages.find((item) => item.slug === slug) ?? null;
  if (!page || !page.published) return null;
  if (page.pending === undefined) return page;
  const { pending: _pending, ...published } = page;
  return published;
}

export function pageDraft(page: CmsPage): CmsPage {
  return page.pending ? { ...page, blocks: page.pending } : page;
}

export function hasPendingChanges(page: CmsPage): boolean {
  return page.pending !== undefined && JSON.stringify(page.pending) !== JSON.stringify(page.blocks);
}

export function withoutPending(page: CmsPage): CmsPage {
  if (page.pending === undefined) return page;
  const { pending: _pending, ...rest } = page;
  return rest;
}

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");
}

export function slugifyTitle(input: string): string {
  return normalizeSlug(
    input
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "-"),
  );
}

export function composeSlug(parentSlug: string | undefined, segment: string): string {
  const child = normalizeSlug(segment);
  const parent = parentSlug ? normalizeSlug(parentSlug) : "";
  if (!child) return parent;
  if (!parent) return child;
  return `${parent}/${child}`;
}

export function validateSlug(
  input: string,
  pages: CmsPage[],
  ignore: ReadonlySet<string> = new Set(),
): string | null {
  const slug = normalizeSlug(input);

  if (!slug) {
    if (pages.some((page) => page.slug === "" && !ignore.has(page.slug))) {
      return "Det finns redan en startsida.";
    }
    return null;
  }

  const parts = slug.split("/");
  if (parts.length > 2) {
    return "Sökvägen kan bara ha en undersida, till exempel /expertomraden/aml.";
  }
  if (parts.some((part) => !SEGMENT.test(part))) {
    return "Använd bara små bokstäver, siffror och bindestreck.";
  }
  if (RESERVED.has(parts[0])) return "Den sökvägen är upptagen.";
  if (pages.some((page) => page.slug === slug && !ignore.has(page.slug))) {
    return "Det finns redan en sida med den sökvägen.";
  }

  return null;
}

export function pageTitle(page: CmsPage): string {
  if (!page.slug && !page.title.trim()) return "Startsida";
  return page.title.trim() || page.slug;
}

export function rootPages(pages: CmsPage[]): CmsPage[] {
  return pages.filter((page) => !page.parentSlug);
}

export function orderedPages(pages: CmsPage[]): CmsPage[] {
  const children = new Map<string, CmsPage[]>();
  const roots: CmsPage[] = [];

  for (const page of pages) {
    if (page.parentSlug) {
      const list = children.get(page.parentSlug) ?? [];
      list.push(page);
      children.set(page.parentSlug, list);
    } else {
      roots.push(page);
    }
  }

  const result: CmsPage[] = [];
  const placed = new Set<string>();

  function walk(page: CmsPage) {
    result.push(page);
    placed.add(page.slug);
    for (const child of children.get(page.slug) ?? []) {
      walk(child);
    }
  }

  for (const root of roots) walk(root);
  for (const page of pages) {
    if (!placed.has(page.slug)) result.push(page);
  }

  return result;
}

function hydratePage(value: unknown): CmsPage | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Partial<CmsPage> & { slug?: unknown; blocks?: unknown };
  if (typeof page.slug !== "string" || !Array.isArray(page.blocks)) return null;

  const slug = page.slug;
  const parentFromSlug = slug.includes("/") ? slug.slice(0, slug.lastIndexOf("/")) : undefined;

  const pending = Array.isArray(page.pending) ? hydrateBlocks(page.pending) : undefined;

  return {
    slug,
    title: typeof page.title === "string" && page.title.trim() ? page.title : slug,
    parentSlug:
      typeof page.parentSlug === "string" && page.parentSlug ? page.parentSlug : parentFromSlug,
    role: page.role === "home" || page.role === "news" ? page.role : undefined,
    published: page.published !== false,
    links: Array.isArray(page.links) ? page.links.filter(isCmsLink) : [],
    blocks: hydrateBlocks(page.blocks),
    pending,
  };
}

function hydrateBlocks(value: unknown): CmsBlock[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => hydrateBlock(item));
}

function hydrateBlock(value: unknown): CmsBlock {
  const block = value as CmsBlock;
  const type = (block as { type?: string } | null)?.type;
  if (type === "highlight") {
    return { ...block, type: "banner", size: block.size === "small" ? "small" : "large" };
  }
  if (type === "lead") {
    return { ...block, type: "text" };
  }
  if (type === "split") {
    return {
      ...block,
      type: "imageText",
      imageSide: "left",
      theme: block.theme ?? "mist",
      eyebrow: undefined,
      buttonLabel: undefined,
      buttonHref: undefined,
    };
  }
  return block;
}

function isCmsLink(value: unknown): value is CmsLink {
  if (!value || typeof value !== "object") return false;
  const link = value as CmsLink;
  return typeof link.label === "string" && typeof link.href === "string";
}

function savedMenu(pages: CmsPage[]): CmsLink[] | undefined {
  for (const page of orderedPages(pages)) {
    const block = page.blocks[0];
    if (!block || (block.type !== "hero" && block.type !== "pageHeader")) continue;
    if ((block.menu ?? []).some((item) => item.label.trim())) return block.menu;
  }
  return undefined;
}

function hydrateMenu(value: unknown, pages: CmsPage[]): CmsLink[] | undefined {
  if (Array.isArray(value)) return value.filter(isCmsLink);
  return savedMenu(pages);
}
