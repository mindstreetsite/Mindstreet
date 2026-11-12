import { defaultMenu, isArticlePage, isBuiltinMenuTemplate } from "@/lib/cms/library";
import { seedPages } from "@/lib/cms/seed";
import type { CmsBlock, CmsFooter, CmsFooterLink, CmsLink, CmsPage, PageRole, PageSeo } from "@/lib/cms/types";

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
const LOCAL_SEED_VERSION = "mindstreet-cms-seed-version";
export const SEED_VERSION = "expertomraden-v1";
const RESERVED = new Set(["admin"]);
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CmsState = {
  pages: CmsPage[];
  archive: PageArchiveEntry[];
  templates: CmsTemplate[];
  templateArchive: TemplateArchiveEntry[];
  menu?: CmsLink[];
  footer?: CmsFooter;
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
    const inBlocks = page.blocks.some((block) => blockShowsImage(block, url));
    const inSeo = page.seo?.image === url;
    if (!inBlocks && !inSeo) continue;
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
  const seo = seoWithoutImage(page.seo, url);
  const blocksSame = blocks.every((block, index) => block === page.blocks[index]);
  const pendingSame =
    pending === undefined ||
    (page.pending !== undefined &&
      pending.every((block, index) => block === page.pending![index]));
  const seoSame = seo === page.seo;
  if (blocksSame && pendingSame && seoSame) return page;
  const next: CmsPage = { ...page, blocks };
  if (pending === undefined) delete next.pending;
  else next.pending = pending;
  if (seo) next.seo = seo;
  else delete next.seo;
  return next;
}

function seoWithoutImage(seo: PageSeo | undefined, url: string): PageSeo | undefined {
  if (!seo || seo.image !== url) return seo;
  const next: PageSeo = { ...seo };
  delete next.image;
  if (!next.title && !next.description && !next.noindex) return undefined;
  return next;
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
    state: changed
      ? { pages, archive, templates, templateArchive, menu: state.menu, footer: state.footer }
      : state,
    changed,
  };
}

function archivedPageSlugs(archive: PageArchiveEntry[]): Set<string> {
  const slugs = new Set<string>();
  for (const entry of archive) {
    slugs.add(entry.slug);
    for (const page of entry.pages) slugs.add(page.slug);
  }
  return slugs;
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
          const archived = archivedPageSlugs(archive);
          const missing = seedPages.filter(
            (page) => !existing.has(page.slug) && !archived.has(page.slug),
          );
          return missing.length ? [...missing, ...pages] : pages;
        })();

  return {
    pages: nextPages,
    archive,
    templates: templatesNotMatchingPages(templates, nextPages),
    templateArchive: templateArchive.filter((entry) => !entry.hiddenPage),
    menu: hydrateMenu(raw.menu, nextPages),
    footer: hydrateFooter(raw.footer),
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
      seedVersion: window.localStorage.getItem(LOCAL_SEED_VERSION),
    });
  } catch {
    return null;
  }
}

export function clearLocalSnapshot() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_PAGES);
  window.localStorage.removeItem(LOCAL_ARCHIVE);
  window.localStorage.removeItem(LOCAL_TEMPLATES);
  window.localStorage.removeItem(LOCAL_TEMPLATE_ARCHIVE);
  window.localStorage.removeItem(LOCAL_SEED_VERSION);
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

export function purgeArchivedPages(id: string, archive: PageArchiveEntry[]): PageArchiveEntry[] | null {
  if (!archive.some((item) => item.id === id)) return null;
  return archive.filter((item) => item.id !== id);
}

export function purgeArchivedTemplate(
  id: string,
  templateArchive: TemplateArchiveEntry[],
): TemplateArchiveEntry[] | null {
  if (!templateArchive.some((item) => item.id === id)) return null;
  return templateArchive.filter((item) => item.id !== id);
}

export function templatesNotMatchingPages(templates: CmsTemplate[], pages: CmsPage[]): CmsTemplate[] {
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

export function hydrateTemplateArchiveEntry(value: unknown): TemplateArchiveEntry | null {
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

export function hydrateTemplate(value: unknown): CmsTemplate | null {
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

export function hydrateArchiveEntry(value: unknown): PageArchiveEntry | null {
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

function pagePath(slug: string): string {
  return slug ? `/${slug}` : "/";
}

function rewritePath(href: string, fromSlug: string, toSlug: string): string {
  const fromPath = pagePath(fromSlug);
  const toPath = pagePath(toSlug);
  const value = href.trim();
  if (!fromSlug) {
    if (value === "/" || value === "") return toPath;
    return href;
  }
  if (value === fromPath) return toPath;
  if (value.startsWith(`${fromPath}/`)) return `${toPath}${value.slice(fromPath.length)}`;
  return href;
}

function rewriteMenuPaths(items: CmsLink[], fromSlug: string, toSlug: string): CmsLink[] {
  return items.map((item) => ({
    ...item,
    href: rewritePath(item.href, fromSlug, toSlug),
    children: item.children?.map((child) => ({
      ...child,
      href: rewritePath(child.href, fromSlug, toSlug),
    })),
  }));
}

function rewriteBlockPaths(block: CmsBlock, fromSlug: string, toSlug: string): CmsBlock {
  return {
    ...block,
    buttonHref: block.buttonHref !== undefined ? rewritePath(block.buttonHref, fromSlug, toSlug) : block.buttonHref,
    button2Href:
      block.button2Href !== undefined ? rewritePath(block.button2Href, fromSlug, toSlug) : block.button2Href,
    parentSlug: block.parentSlug === fromSlug ? toSlug || undefined : block.parentSlug,
    items: block.items?.map((item) => ({
      ...item,
      href: rewritePath(item.href, fromSlug, toSlug),
    })),
    menu: block.menu ? rewriteMenuPaths(block.menu, fromSlug, toSlug) : block.menu,
  };
}

function rewriteStoredPaths(page: CmsPage, fromSlug: string, toSlug: string): CmsPage {
  return {
    ...page,
    links: rewriteMenuPaths(page.links, fromSlug, toSlug),
    blocks: page.blocks.map((block) => rewriteBlockPaths(block, fromSlug, toSlug)),
    pending: page.pending?.map((block) => rewriteBlockPaths(block, fromSlug, toSlug)),
  };
}

export function retargetPageSlug(
  pages: CmsPage[],
  menu: CmsLink[],
  fromSlug: string,
  toSlug: string,
): { pages: CmsPage[] | null; menu: CmsLink[] | null; error: string | null } {
  if (fromSlug === toSlug) return { pages, menu, error: null };

  const slugMap = new Map<string, string>([[fromSlug, toSlug]]);
  for (const page of pages) {
    if (page.parentSlug !== fromSlug || !fromSlug) continue;
    const prefix = `${fromSlug}/`;
    if (!page.slug.startsWith(prefix)) continue;
    const next = toSlug ? `${toSlug}/${page.slug.slice(prefix.length)}` : page.slug.slice(prefix.length);
    if (next.split("/").filter(Boolean).length > 2) {
      return {
        pages: null,
        menu: null,
        error: "Sökvägen kan bara ha en undersida, till exempel /expertomraden/aml.",
      };
    }
    slugMap.set(page.slug, next);
  }

  const nextPages = pages.map((page) => {
    const slug = slugMap.get(page.slug) ?? page.slug;
    const parentSlug =
      page.parentSlug !== undefined ? (slugMap.get(page.parentSlug) ?? page.parentSlug) : undefined;
    let next: CmsPage =
      slug === page.slug && parentSlug === page.parentSlug
        ? page
        : { ...page, slug, parentSlug: parentSlug || undefined };
    for (const [from, to] of slugMap) {
      next = rewriteStoredPaths(next, from, to);
    }
    return next;
  });

  let nextMenu = menu;
  for (const [from, to] of slugMap) {
    nextMenu = rewriteMenuPaths(nextMenu, from, to);
  }

  return { pages: nextPages, menu: nextMenu, error: null };
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

export type PublishListItem = {
  page: CmsPage;
  child: boolean;
};

function articlePublishedAt(page: CmsPage): string {
  return page.blocks.find((block) => block.type === "article")?.publishedAt?.trim() ?? "";
}

function articleSortLabel(page: CmsPage): string {
  const heading = page.blocks.find((block) => block.type === "article")?.heading.trim() ?? "";
  return heading || pageTitle(page);
}

function comparePublishArticles(a: CmsPage, b: CmsPage): number {
  const left = articlePublishedAt(a);
  const right = articlePublishedAt(b);
  if (left && right && left !== right) return right.localeCompare(left);
  if (left && !right) return -1;
  if (!left && right) return 1;
  return articleSortLabel(a).localeCompare(articleSortLabel(b), "sv");
}

export function publishListPages(pages: CmsPage[]): PublishListItem[] {
  const tree = orderedPages(pages);
  const home = tree.find((page) => page.role === "home");
  const news = tree.find((page) => page.role === "news");
  const nestArticles = Boolean(news);
  const articles = nestArticles
    ? tree
        .filter(
          (page) => page.role !== "home" && page.role !== "news" && isArticlePage(page),
        )
        .sort(comparePublishArticles)
    : [];
  const articleSlugs = new Set(articles.map((page) => page.slug));

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

  const items: PublishListItem[] = [];
  const placed = new Set<string>();

  function skipNode(page: CmsPage): boolean {
    return (news !== undefined && page.slug === news.slug) || articleSlugs.has(page.slug);
  }

  function walk(page: CmsPage, child: boolean) {
    if (placed.has(page.slug) || skipNode(page)) return;
    placed.add(page.slug);
    items.push({ page, child: child || Boolean(page.parentSlug) });
    for (const childPage of children.get(page.slug) ?? []) {
      walk(childPage, true);
    }
  }

  const knownSlugs = new Set(pages.map((page) => page.slug));

  if (home) walk(home, false);
  for (const root of roots) walk(root, false);
  for (const page of pages) {
    if (placed.has(page.slug) || skipNode(page)) continue;
    if (page.parentSlug && knownSlugs.has(page.parentSlug)) continue;
    walk(page, Boolean(page.parentSlug));
  }

  if (news && !placed.has(news.slug)) {
    placed.add(news.slug);
    items.push({ page: news, child: false });
    for (const childPage of children.get(news.slug) ?? []) {
      walk(childPage, true);
    }
  }

  for (const article of articles) {
    if (placed.has(article.slug)) continue;
    placed.add(article.slug);
    items.push({ page: article, child: true });
    for (const childPage of children.get(article.slug) ?? []) {
      walk(childPage, true);
    }
  }

  return items;
}

export function hydratePage(value: unknown): CmsPage | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Partial<CmsPage> & { slug?: unknown; blocks?: unknown };
  if (typeof page.slug !== "string" || !Array.isArray(page.blocks)) return null;

  const slug = page.slug;
  const parentFromSlug = slug.includes("/") ? slug.slice(0, slug.lastIndexOf("/")) : undefined;

  const pending = Array.isArray(page.pending) ? hydrateBlocks(page.pending) : undefined;
  const seo = hydrateSeo(page.seo);

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
    ...(seo ? { seo } : {}),
  };
}

function hydrateSeo(value: unknown): PageSeo | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<PageSeo>;
  const seo: PageSeo = {};
  if (typeof raw.title === "string" && raw.title.trim()) seo.title = raw.title.trim();
  if (typeof raw.description === "string" && raw.description.trim()) {
    seo.description = raw.description.trim();
  }
  if (typeof raw.image === "string" && raw.image.trim()) seo.image = raw.image.trim();
  if (raw.noindex === true) seo.noindex = true;
  return seo.title || seo.description || seo.image || seo.noindex ? seo : undefined;
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

export function hydrateCmsLinks(value: unknown): CmsLink[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isCmsLink);
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

export function hydrateFooter(value: unknown): CmsFooter | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<CmsFooter>;
  const links = Array.isArray(raw.links)
    ? raw.links.filter(
        (item): item is CmsFooterLink =>
          !!item &&
          typeof item === "object" &&
          typeof item.label === "string" &&
          typeof item.href === "string",
      )
    : [];
  return {
    street: typeof raw.street === "string" ? raw.street : "",
    postal: typeof raw.postal === "string" ? raw.postal : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    email: typeof raw.email === "string" ? raw.email : "",
    links,
  };
}

function hydrateMenu(value: unknown, pages: CmsPage[]): CmsLink[] | undefined {
  if (Array.isArray(value)) return value.filter(isCmsLink);
  return savedMenu(pages);
}
