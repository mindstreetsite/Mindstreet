"use client";

import {
  cloneElement,
  FormEvent,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  applyInline,
  applyLineFormat,
  applyTextStyle,
  clearFormatting,
  inspectFormat,
  type LineFormat,
  type TextStyle,
} from "@/lib/cms/inline";
import {
  findCompletenessIssue,
  isPageComplete,
  pageCompletenessIssues,
  type CompletenessIssue,
} from "@/lib/cms/completeness";
import { formatNewsDate, newsDateForSlug } from "@/lib/cms/news-date";
import { LockedFooterNote } from "@/components/cms/locked-footer";
import { PageBlocks } from "@/components/cms/page-blocks";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import {
  SITE_HOST,
  articleNewsCards,
  articleParagraphs,
  backfillTestArticleNews,
  blockLabel,
  builtinMenuTemplate,
  cloneTemplateBlocks,
  createBlock,
  createCard,
  createContactCard,
  createOfferingRow,
  createTextColumnSection,
  fieldsFor,
  isArticlePage,
  isBuiltinMenuTemplate,
  isBuiltinNewsTemplate,
  isNewsBlock,
  MENU_TEMPLATE_SLUG,
  library,
  newsTemplateChoices,
  parseQuotePlacement,
  quoteAfterIndex,
  quotePlacementValue,
  removeArticleNews,
  resolvedMenu,
  resolveTheme,
  syncAllArticleNews,
  swatchesFor,
  usesExpandedTheme,
} from "@/lib/cms/library";
import {
  blocksWithoutImage,
  composeSlug,
  deletePagesToArchive,
  deleteTemplateChoice,
  hasPendingChanges,
  hydrateState,
  orderedPages,
  pagesRemovedWith,
  pageDraft,
  pageTitle,
  SEED_VERSION,
  publishedImageUses,
  readLocalSnapshot,
  restoreArchivedPages,
  restoreTemplateChoice,
  rootPages,
  slugifyTitle,
  templateChoices,
  validateSlug,
  withoutImage,
  withoutPending,
  type CmsState,
  type CmsTemplate,
  type PageArchiveEntry,
  type PublishedImageUse,
  type TemplateArchiveEntry,
} from "@/lib/cms/storage";
import type { BlockTheme, BlockType, CmsBlock, CmsCard, CmsLink, CmsPage, PageRole } from "@/lib/cms/types";
import "./admin.css";

const PREVIEW_WIDTH = 1440;

async function loadLibraryImages() {
  const response = await fetch("/api/library-images", { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as { images?: string[]; error?: string } | null;
  if (!response.ok) throw new Error(data?.error ?? "Kunde inte läsa bildbiblioteket.");
  return data?.images ?? [];
}

type Panel = "pages" | "create" | "news" | "components" | "images" | "archive";
type EditorMode = "content" | "structure" | "full";

const BLANK_TEMPLATE = "__blank__";
const UNSELECTED_TEMPLATE = "__unselected__";
const HOME_OPTION = "__home__";

function slugToOption(slug: string): string {
  return slug === "" ? HOME_OPTION : slug;
}

function optionToSlug(value: string): string {
  return value === HOME_OPTION ? "" : value;
}

function newsRoleError(role: "" | PageRole, pages: CmsPage[], ignoreSlug: string): string | null {
  if (role !== "news") return null;
  return pages.some((page) => page.role === "news" && page.slug !== ignoreSlug)
    ? "Det finns redan en nyhetssida."
    : null;
}

function uniqueTemplateSlug(title: string, pages: CmsPage[], templates: CmsTemplate[]): string {
  const base = slugifyTitle(title);
  if (!base) return "";
  const taken = new Set<string>([
    ...pages.map((page) => page.slug),
    ...templates.map((template) => template.slug),
    MENU_TEMPLATE_SLUG,
  ]);
  if (!taken.has(base)) return base;
  let index = 2;
  while (taken.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function articlePublishedAt(page: CmsPage): string {
  return page.blocks.find((block) => block.type === "article")?.publishedAt?.trim() ?? "";
}

function articleLabel(page: CmsPage): string {
  const heading = page.blocks.find((block) => block.type === "article")?.heading.trim() ?? "";
  return heading || pageTitle(page);
}

function compareArticles(a: CmsPage, b: CmsPage): number {
  const left = articlePublishedAt(a);
  const right = articlePublishedAt(b);
  if (left && right && left !== right) return right.localeCompare(left);
  if (left && !right) return -1;
  if (!left && right) return 1;
  return articleLabel(a).localeCompare(articleLabel(b), "sv");
}

function showsContent(mode: EditorMode) {
  return mode !== "structure";
}

function showsStructure(mode: EditorMode) {
  return mode !== "content";
}

function DragGrip() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
      <circle cx="2" cy="2.5" r="1.15" fill="currentColor" />
      <circle cx="8" cy="2.5" r="1.15" fill="currentColor" />
      <circle cx="2" cy="8" r="1.15" fill="currentColor" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
      <circle cx="2" cy="13.5" r="1.15" fill="currentColor" />
      <circle cx="8" cy="13.5" r="1.15" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 4.4h9.6M6.3 4.4V3.2A.8.8 0 0 1 7.1 2.4h1.8a.8.8 0 0 1 .8.8v1.2M4.5 4.4l.55 8a.9.9 0 0 0 .9.8h4.1a.9.9 0 0 0 .9-.8l.55-8M6.7 6.7v4.2M9.3 6.7v4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RoleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="admin-switch">
      <span className="admin-switch-copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className="admin-switch-ui">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="admin-switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

function FieldSwitch({
  label,
  checked,
  onChange,
  stacked = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  stacked?: boolean;
}) {
  return (
    <label className={stacked ? "admin-inline-switch is-stacked" : "admin-inline-switch"}>
      <span>{label}</span>
      <span className="admin-switch-ui">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="admin-switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

function RoleSwitches({
  role,
  onChange,
}: {
  role: "" | PageRole;
  onChange: (role: "" | PageRole) => void;
}) {
  return (
    <div className="admin-role-switches">
      <RoleSwitch
        label="Homepage"
        description="Adressen är www.mindstreet.se. Sidnamnet ändrar inte URL:en."
        checked={role === "home"}
        onChange={(on) => onChange(on ? "home" : "")}
      />
      <RoleSwitch
        label="Nyhetssidan"
        description="Nya nyheter publiceras i Mindblowing news och på den här sidan."
        checked={role === "news"}
        onChange={(on) => onChange(on ? "news" : "")}
      />
    </div>
  );
}

const panels: { id: Panel; kicker: string; title: string }[] = [
  { id: "pages", kicker: "Befintliga", title: "Publicerade sidor" },
  { id: "create", kicker: "Ny sida", title: "Skapa ny sida av mall" },
  { id: "news", kicker: "Nyhet", title: "Lägg till nyhet" },
  { id: "components", kicker: "Bibliotek", title: "Skapa ny sidmall utifrån komponenter" },
  { id: "images", kicker: "Bilder", title: "Bildbibliotek" },
];

export default function AdminPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("pages");
  const [titleInput, setTitleInput] = useState("");
  const [componentTarget, setComponentTarget] = useState(BLANK_TEMPLATE);
  const [blankBlocks, setBlankBlocks] = useState<CmsBlock[]>([]);
  const [blankTitle, setBlankTitle] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [createRole, setCreateRole] = useState<"" | PageRole>("");
  const [editBlocks, setEditBlocks] = useState<CmsBlock[]>([]);
  const [parentSlug, setParentSlug] = useState("");
  const [draftBlocks, setDraftBlocks] = useState<CmsBlock[]>([]);
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [published, setPublished] = useState(true);
  const [lastSavedSlug, setLastSavedSlug] = useState<string | null>(null);
  const [structureSlug, setStructureSlug] = useState<string | null>(null);
  const [newsEditSlug, setNewsEditSlug] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [archive, setArchive] = useState<PageArchiveEntry[]>([]);
  const [templates, setTemplates] = useState<CmsTemplate[]>([]);
  const [templateArchive, setTemplateArchive] = useState<TemplateArchiveEntry[]>([]);
  const [menu, setMenu] = useState<CmsLink[]>([]);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<"page" | "template" | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [phase, setPhase] = useState<"loading" | "locked" | "ready">("loading");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const dragOriginRef = useRef<number | null>(null);
  const pagesRef = useRef(pages);
  const archiveRef = useRef(archive);
  const templatesRef = useRef(templates);
  const templateArchiveRef = useRef(templateArchive);
  const menuRef = useRef(menu);
  const etagRef = useRef<string | null>(null);
  const saveChain = useRef(Promise.resolve<string | null>(null));
  const saveTimer = useRef<number | null>(null);
  const saveWaiters = useRef<Array<(error: string | null) => void>>([]);
  const draftKey = useRef<string | null>(null);
  pagesRef.current = pages;
  archiveRef.current = archive;
  templatesRef.current = templates;
  templateArchiveRef.current = templateArchive;
  menuRef.current = menu;

  function snapshot(): CmsState {
    return {
      pages: pagesRef.current,
      archive: archiveRef.current,
      templates: templatesRef.current,
      templateArchive: templateArchiveRef.current,
      menu: menuRef.current,
    };
  }

  function forgetUploadedImage(url: string) {
    const next = withoutImage(snapshot(), url);
    if (next.changed) {
      applyState(next.state, etagRef.current);
      void saveNow();
    }
    setDraftBlocks((current) => blocksWithoutImage(current, url));
    setBlankBlocks((current) => blocksWithoutImage(current, url));
  }

  function applyState(state: CmsState, etag: string | null) {
    pagesRef.current = state.pages;
    archiveRef.current = state.archive;
    templatesRef.current = state.templates;
    templateArchiveRef.current = state.templateArchive;
    const nextMenu = resolvedMenu(state.menu);
    menuRef.current = nextMenu;
    etagRef.current = etag;
    setPages(state.pages);
    setArchive(state.archive);
    setTemplates(state.templates);
    setTemplateArchive(state.templateArchive);
    setMenu(nextMenu);
    setSelectedSlug((current) => current ?? orderedPages(state.pages)[0]?.slug ?? null);
  }

  async function loadCms() {
    const response = await fetch("/api/cms", { cache: "no-store" });
    if (response.status === 401) {
      setPhase("locked");
      return;
    }
    if (!response.ok) {
      setNotice("Kunde inte läsa sidorna.");
      setPhase("ready");
      return;
    }

    const data = (await response.json()) as {
      state: CmsState;
      etag: string | null;
      empty: boolean;
    };
    let state = data.state;
    let etag = data.etag;
    const local = readLocalSnapshot();

    if (local) {
      const pageSlugs = new Set(state.pages.map((page) => page.slug));
      const archiveIds = new Set(state.archive.map((entry) => entry.id));
      const templateSlugs = new Set(state.templates.map((template) => template.slug));
      const templateArchiveIds = new Set(state.templateArchive.map((entry) => entry.id));
      const merged: CmsState = {
        pages: [...state.pages, ...local.pages.filter((page) => !pageSlugs.has(page.slug))],
        archive: [...state.archive, ...local.archive.filter((entry) => !archiveIds.has(entry.id))],
        templates: [
          ...state.templates,
          ...local.templates.filter((template) => !templateSlugs.has(template.slug)),
        ],
        templateArchive: [
          ...state.templateArchive,
          ...local.templateArchive.filter((entry) => !templateArchiveIds.has(entry.id)),
        ],
        menu: state.menu ?? local.menu,
      };
      const changed =
        data.empty ||
        merged.pages.length !== state.pages.length ||
        merged.archive.length !== state.archive.length ||
        merged.templates.length !== state.templates.length ||
        merged.templateArchive.length !== state.templateArchive.length;

      if (changed) {
        const saved = await fetch("/api/cms", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state: data.empty ? local : merged, etag }),
        });
        if (saved.ok) {
          const body = (await saved.json()) as { etag?: string };
          state = hydrateState({
            ...(data.empty ? local : merged),
            seedVersion: SEED_VERSION,
          });
          etag = body.etag ?? etag;
        }
      }
    }

    applyState(state, etag);
    const filled = backfillTestArticleNews(state.pages) ?? state.pages;
    const synced = syncAllArticleNews(filled);
    if (synced !== state.pages) {
      pagesRef.current = synced;
      setPages(synced);
      await saveNow();
    }
    setPhase("ready");
  }

  useEffect(() => {
    let cancelled = false;
    void loadCms().catch(() => {
      if (!cancelled) {
        setNotice("Kunde inte läsa sidorna.");
        setPhase("ready");
      }
    });
    return () => {
      cancelled = true;
    };
    // The loader only runs when the admin screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = pages.find((page) => page.slug === selectedSlug) ?? null;
  const structurePage =
    structureSlug === null
      ? null
      : (pages.find((page) => page.slug === structureSlug) ?? null);
  const listedPages = orderedPages(pages);
  const incompleteSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const page of pages) {
      if (pageCompletenessIssues(page, pages).length > 0) slugs.add(page.slug);
    }
    return slugs;
  }, [pages]);
  const selectedDraft = selected ? pageDraft(selected) : null;
  const selectedChanged = selected ? hasPendingChanges(selected) : false;
  const selectedIssues = selectedDraft ? pageCompletenessIssues(selectedDraft, pages) : [];
  const structureDraft = structurePage ? pageDraft(structurePage) : null;
  const structureChanged = structurePage ? hasPendingChanges(structurePage) : false;
  const structureIssues = structureDraft ? pageCompletenessIssues(structureDraft, pages) : [];
  const templateOptions = templateChoices(templates);
  const newsTemplateOptions = newsTemplateChoices(templateOptions);
  const newsArticles = useMemo(
    () => pages.filter((page) => isArticlePage(page)).sort(compareArticles),
    [pages],
  );
  const publishedArticles = newsArticles.filter((page) => page.published);
  const historicalArticles = newsArticles.filter((page) => !page.published);
  const newsArticle =
    panel === "news" && newsEditSlug
      ? (newsArticles.find((page) => page.slug === newsEditSlug) ?? null)
      : null;
  const newsDraft = newsArticle ? pageDraft(newsArticle) : null;
  const newsChanged = newsArticle ? hasPendingChanges(newsArticle) : false;
  const newsIssues = newsDraft ? pageCompletenessIssues(newsDraft, pages) : [];
  const visibleTemplateOptions =
    panel === "news" ? newsTemplateOptions : [builtinMenuTemplate(), ...templateOptions];
  const templatePage = visibleTemplateOptions.find((page) => page.slug === templateSlug) ?? null;
  const menuSelected = panel === "create" && isBuiltinMenuTemplate(templateSlug ?? "");
  const articleItems = articleNewsCards(pages);
  const pendingDelete =
    deleteTarget === "page" && deleteSlug !== null
      ? (pages.find((page) => page.slug === deleteSlug) ?? null)
      : null;
  const pendingTemplateDelete =
    deleteTarget === "template" && deleteSlug !== null
      ? (templateOptions.find((page) => page.slug === deleteSlug) ?? null)
      : null;
  const pendingRemoved = deleteSlug !== null ? pagesRemovedWith(deleteSlug, pages) : [];
  const parents = rootPages(pages).filter((page) => page.slug);
  const previewSlug =
    panel === "news"
      ? slugifyTitle(titleInput)
      : panel === "create" && createRole === "home"
        ? ""
        : composeSlug(parentSlug || undefined, slugifyTitle(titleInput));
  const editorTitle =
    titleInput.trim() || (panel === "news" ? "Ny nyhet" : "Ny sida");
  const createIssues =
    templatePage && !menuSelected
      ? pageCompletenessIssues(
          {
            slug: titleInput.trim() ? previewSlug : "",
            title: titleInput.trim(),
            parentSlug:
              panel === "news" || (panel === "create" && createRole === "home")
                ? undefined
                : parentSlug || undefined,
            role: panel === "create" ? createRole || undefined : undefined,
            published,
            links: [],
            blocks: draftBlocks,
          },
          pages,
          { requireTitle: Boolean(titleInput.trim() || parentSlug) },
        )
      : [];
  const blankMode = componentTarget === BLANK_TEMPLATE;
  const componentPage = blankMode
    ? null
    : (templateOptions.find((page) => page.slug === componentTarget) ?? null);
  const editingExisting =
    !blankMode && editingSlug === componentTarget && componentPage !== null;
  const structureEditable = blankMode || editingExisting;
  const componentBlocks = blankMode
    ? blankBlocks
    : editingExisting
      ? editBlocks
      : (componentPage?.blocks ?? []);
  const templateDraftTitle = blankMode
    ? blankTitle.trim() || "Ny sidmall"
    : editingExisting
      ? editTitle.trim() || "Ny sidmall"
      : componentPage
        ? pageTitle(componentPage)
        : "Ny sidmall";

  function enqueueSave(): Promise<string | null> {
    const run = saveChain.current.then(async () => {
      const response = await fetch("/api/cms", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: snapshot(), etag: etagRef.current }),
      });
      const data = (await response.json().catch(() => null)) as { etag?: string; error?: string } | null;
      if (!response.ok) return data?.error ?? "Kunde inte spara.";
      if (data?.etag) etagRef.current = data.etag;
      return null;
    });
    saveChain.current = run.then(
      (error) => error,
      () => "Kunde inte spara.",
    );
    return run;
  }

  function scheduleSave(): Promise<string | null> {
    return new Promise((resolve) => {
      saveWaiters.current.push(resolve);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        const waiters = saveWaiters.current;
        saveWaiters.current = [];
        void enqueueSave().then((error) => {
          if (error) setNotice(error);
          for (const waiter of waiters) waiter(error);
        });
      }, 400);
    });
  }

  async function saveNow(): Promise<string | null> {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const waiters = saveWaiters.current;
    saveWaiters.current = [];
    const error = await enqueueSave();
    if (error) setNotice(error);
    else setNotice(null);
    for (const waiter of waiters) waiter(error);
    return error;
  }

  function updateMenu(next: CmsLink[]) {
    menuRef.current = next;
    setMenu(next);
    void scheduleSave();
  }

  function persist(updater: (current: CmsPage[]) => CmsPage[]) {
    const next = syncAllArticleNews(updater(pagesRef.current));
    pagesRef.current = next;
    setPages(next);
    void scheduleSave();
    return true;
  }

  function findTemplate(slug: string | null) {
    if (slug === null) return null;
    const choices = templateChoices(templatesRef.current);
    return newsTemplateChoices(choices).find((page) => page.slug === slug) ??
      choices.find((page) => page.slug === slug) ??
      null;
  }

  function resetCreateForm() {
    draftKey.current = null;
    setTitleInput("");
    setParentSlug("");
    setCreateRole("");
    setPublished(true);
    const template = findTemplate(templateSlug);
    setDraftBlocks(template ? cloneTemplateBlocks(template.blocks) : []);
  }

  function loadPageDraft(slug: string) {
    draftKey.current = `${slug}:new`;
    setTemplateSlug(slug);
    setNotice(null);
    if (isBuiltinMenuTemplate(slug)) {
      setDraftBlocks([]);
      setTitleInput("");
      setParentSlug("");
      setCreateRole("");
      setPublished(true);
      return;
    }
    const template = findTemplate(slug);
    if (!template) {
      setDraftBlocks([]);
      setTitleInput("");
      setParentSlug("");
      setCreateRole("");
      setPublished(true);
      return;
    }
    setTitleInput("");
    setDraftBlocks(cloneTemplateBlocks(template.blocks));
    setParentSlug("");
    setCreateRole("");
    setPublished(true);
  }

  function chooseTemplate(slug: string) {
    setNewsEditSlug(null);
    if (slug === templateSlug) {
      setNotice(null);
      return;
    }
    if (panel === "news") {
      const template = findTemplate(slug);
      setTemplateSlug(slug);
      setDraftBlocks(template ? cloneTemplateBlocks(template.blocks) : []);
      setNotice(null);
      return;
    }
    loadPageDraft(slug);
  }

  function openNewsArticle(slug: string) {
    setNewsEditSlug(slug);
    setSelectedSlug(slug);
    setStructureSlug(null);
    setTemplateSlug(null);
    setDraftBlocks([]);
    setNotice(null);
  }

  async function createPage(event: FormEvent) {
    event.preventDefault();
    const title = titleInput.trim();
    const role = panel === "news" ? "" : createRole;
    const parent = panel === "news" || role === "home" ? undefined : parentSlug || undefined;
    if ((!title && parent) || (role === "news" && !title)) {
      setNotice("Skriv ett sidnamn.");
      return;
    }

    if (!findTemplate(templateSlug)) {
      setNotice("Välj en sidmall till vänster.");
      return;
    }

    const segment = title ? slugifyTitle(title) : "";
    const slug = role === "home" ? "" : composeSlug(parent, segment);
    const current = pagesRef.current;
    const roleError = newsRoleError(role, current, slug);
    if (roleError) {
      setNotice(roleError);
      return;
    }
    const slugError = validateSlug(slug, current);
    if (slugError) {
      setNotice(slugError);
      return;
    }

    if (parent && !current.some((page) => page.slug === parent)) {
      setNotice("Välj en befintlig förälder.");
      return;
    }

    const draft: CmsPage = {
      slug,
      title,
      parentSlug: parent,
      role: role || undefined,
      published,
      links: [],
      blocks: draftBlocks,
    };
    const complete = isPageComplete(draft, current);
    const page: CmsPage = {
      ...draft,
      published: published && complete,
    };
    pagesRef.current = syncAllArticleNews([...current, page]);
    setPages(pagesRef.current);
    if (await saveNow()) return;
    setSelectedSlug(page.slug);
    setLastSavedSlug(page.slug);
    resetCreateForm();
    setPanel("pages");
    if (!complete && published) {
      setNotice("Sidan sparades som utkast eftersom fält eller undersideslänkar saknas.");
    } else {
      setNotice(null);
    }
  }

  function togglePublished(slug: string) {
    const current = pagesRef.current;
    const page = current.find((entry) => entry.slug === slug);
    if (!page) return;
    if (!page.published && pageCompletenessIssues(page, current).length > 0) {
      setNotice("Fyll i alla fält och länka undersidorna innan sidan publiceras.");
      return;
    }
    const nextPublished = !page.published;
    persist((pages) =>
      pages.map((entry) => (entry.slug === slug ? { ...entry, published: nextPublished } : entry)),
    );
    setNotice(null);
  }

  async function publishPendingChanges(slug: string) {
    const current = pagesRef.current;
    const page = current.find((entry) => entry.slug === slug);
    if (!page || !hasPendingChanges(page)) return;
    const draft = pageDraft(page);
    if (!isPageComplete(draft, current)) {
      setNotice("Fyll i alla fält och länka undersidorna innan ändringarna publiceras.");
      return;
    }
    const nextPage: CmsPage = {
      ...withoutPending(page),
      blocks: draft.blocks,
      published: true,
    };
    pagesRef.current = syncAllArticleNews(
      current.map((entry) => (entry.slug === slug ? nextPage : entry)),
    );
    setPages(pagesRef.current);
    if (await saveNow()) return;
    setNotice(null);
  }

  async function discardPendingChanges(slug: string) {
    const current = pagesRef.current;
    const page = current.find((entry) => entry.slug === slug);
    if (!page || page.pending === undefined) return;
    pagesRef.current = current.map((entry) =>
      entry.slug === slug ? withoutPending(entry) : entry,
    );
    setPages(pagesRef.current);
    if (await saveNow()) return;
    setNotice(null);
  }

  function openDelete(slug: string) {
    setDeleteTarget("page");
    setDeleteSlug(slug);
    setDeleteInput("");
    setNotice(null);
  }

  function openDeleteTemplate(slug: string) {
    setDeleteTarget("template");
    setDeleteSlug(slug);
    setDeleteInput("");
    setNotice(null);
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteSlug(null);
    setDeleteInput("");
  }

  async function confirmDelete() {
    if (deleteSlug === null) return;
    const address = pageAddress(deleteSlug);
    if (!addressMatches(deleteInput, address)) return;
    const result = deletePagesToArchive(deleteSlug, pagesRef.current, archiveRef.current);
    if (result.error || !result.next || !result.archive) {
      setNotice(result.error ?? "Kunde inte ta bort sidan.");
      return;
    }
    const removed = pagesRemovedWith(deleteSlug, pagesRef.current);
    pagesRef.current = syncAllArticleNews(
      removeArticleNews(
        result.next,
        removed.map((page) => page.slug),
      ),
    );
    archiveRef.current = result.archive;
    setPages(pagesRef.current);
    setArchive(result.archive);
    if (await saveNow()) return;
    closeDelete();
    setStructureSlug(null);
    setSelectedSlug(orderedPages(result.next)[0]?.slug ?? null);
    setNotice("Sidan är borttagen och ligger under Borttagna sidor och mallar.");
  }

  async function confirmDeleteTemplate() {
    if (deleteSlug === null) return;
    const stored = templatesRef.current.find((template) => template.slug === deleteSlug);
    const address = stored?.title.trim() || deleteSlug;
    if (!addressMatches(deleteInput, address)) return;
    const result = deleteTemplateChoice(
      deleteSlug,
      templatesRef.current,
      templateArchiveRef.current,
    );
    if (result.error || !result.templates || !result.archive) {
      setNotice(result.error ?? "Kunde inte ta bort mallen.");
      return;
    }
    templatesRef.current = result.templates;
    templateArchiveRef.current = result.archive;
    setTemplates(result.templates);
    setTemplateArchive(result.archive);
    if (await saveNow()) return;
    if (templateSlug === deleteSlug) {
      setTemplateSlug(null);
      setDraftBlocks([]);
    }
    closeDelete();
    setNotice("Mallen är borttagen och ligger under Borttagna sidor och mallar.");
  }

  async function restoreTemplate(id: string) {
    const result = restoreTemplateChoice(id, templatesRef.current, templateArchiveRef.current);
    if (!result.templates || !result.archive) {
      setNotice(result.error ?? "Kunde inte återställa mallen.");
      return;
    }
    templatesRef.current = result.templates;
    templateArchiveRef.current = result.archive;
    setTemplates(result.templates);
    setTemplateArchive(result.archive);
    if (await saveNow()) return;
    const entry = templateArchive.find((item) => item.id === id);
    if (entry) {
      setTemplateSlug(entry.slug);
      setDraftBlocks(cloneTemplateBlocks(entry.template.blocks));
    }
    setNotice(result.error ?? "Mallen är återställd.");
  }

  async function restorePage(id: string) {
    const result = restoreArchivedPages(id, pagesRef.current, archiveRef.current);
    if (!result.next) {
      setNotice(result.error ?? "Kunde inte återställa sidan.");
      return;
    }
    pagesRef.current = syncAllArticleNews(result.next);
    setPages(pagesRef.current);
    if (result.archive) {
      archiveRef.current = result.archive;
      setArchive(result.archive);
    }
    if (await saveNow()) return;
    if (typeof result.slug === "string") setSelectedSlug(result.slug);
    setNotice(result.error ?? "Sidan är återställd.");
  }

  function findComponentSource(slug: string) {
    return templateChoices(templatesRef.current).find((page) => page.slug === slug) ?? null;
  }

  function beginTemplateEdit(source: CmsPage, extra?: CmsBlock) {
    const blocks = structuredClone(source.blocks);
    setEditTitle(source.title);
    setEditBlocks(extra ? [...blocks, extra] : blocks);
    setEditingSlug(source.slug);
    setNotice(null);
  }

  function addBlock(type: BlockType) {
    const block = createBlock(type);
    if (componentTarget === BLANK_TEMPLATE) {
      setBlankBlocks((current) => [...current, block]);
      setNotice(null);
      return;
    }
    if (editingSlug === componentTarget) {
      setEditBlocks((current) => [...current, block]);
      setNotice(null);
      return;
    }
    const source = findComponentSource(componentTarget);
    if (!source) {
      setNotice("Välj en mall först.");
      return;
    }
    beginTemplateEdit(source, block);
  }

  async function saveBlankTemplate() {
    const title = blankTitle.trim();
    if (!title) {
      setNotice("Skriv ett mallnamn.");
      return;
    }
    const slug = uniqueTemplateSlug(title, pagesRef.current, templatesRef.current);
    if (!slug) {
      setNotice("Skriv ett mallnamn.");
      return;
    }
    const blocks = blankBlocks;
    const template: CmsTemplate = {
      slug,
      title,
      blocks,
    };
    templatesRef.current = [...templatesRef.current, template];
    setTemplates(templatesRef.current);
    if (await saveNow()) return;
    setBlankBlocks([]);
    setBlankTitle("");
    setPanel("create");
    loadPageDraft(slug);
    setNotice("Sidmallen är sparad.");
  }

  async function saveExistingTemplate() {
    const source = findComponentSource(componentTarget);
    if (!source) {
      setNotice("Välj en mall först.");
      return;
    }
    const title = editTitle.trim();
    if (!title) {
      setNotice("Skriv ett mallnamn.");
      return;
    }
    const slug = source.slug;
    const blocks = editBlocks;
    const template: CmsTemplate = { slug, title, blocks };
    templatesRef.current = templatesRef.current.some((item) => item.slug === slug)
      ? templatesRef.current.map((item) => (item.slug === slug ? template : item))
      : [...templatesRef.current, template];
    setTemplates(templatesRef.current);
    setEditBlocks(blocks);
    setComponentTarget(slug);
    setEditingSlug(slug);
    if (await saveNow()) return;
    setNotice("Sidmallen är sparad.");
  }

  function saveComponentTemplate() {
    if (blankMode) {
      void saveBlankTemplate();
      return;
    }
    void saveExistingTemplate();
  }

  function editingPage() {
    return structurePage ?? selected;
  }

  function updatePending(slug: string, updater: (blocks: CmsBlock[]) => CmsBlock[]) {
    persist((current) =>
      current.map((page) => {
        if (page.slug !== slug) return page;
        const source = page.pending ?? structuredClone(page.blocks);
        return { ...page, pending: updater(source) };
      }),
    );
  }

  function updateBlock(id: string, patch: Partial<CmsBlock>) {
    const target = editingPage();
    if (!target) return;
    updatePending(target.slug, (blocks) =>
      blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    );
  }

  function applyBlockOrder(blocks: CmsBlock[], from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= blocks.length || to > blocks.length) return blocks;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    const insertAt = from < to ? to - 1 : to;
    next.splice(insertAt, 0, item);
    return next;
  }

  function reorderComponentBlocks(from: number, to: number) {
    if (from === to || from + 1 === to) return;
    if (blankMode) {
      setBlankBlocks((current) => applyBlockOrder(current, from, to));
      return;
    }
    if (editingExisting) {
      setEditBlocks((current) => applyBlockOrder(current, from, to));
    }
  }

  function removeComponentBlock(id: string) {
    if (blankMode) {
      setBlankBlocks((current) => current.filter((block) => block.id !== id));
      setNotice(null);
      return;
    }
    if (!editingExisting) return;
    setEditBlocks((current) => current.filter((block) => block.id !== id));
    setNotice(null);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = editingPage();
    if (!target) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= pageDraft(target).blocks.length) return;
    updatePending(target.slug, (blocks) => {
      if (nextIndex < 0 || nextIndex >= blocks.length) return blocks;
      const next = [...blocks];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function removeBlock(id: string) {
    const target = editingPage();
    if (!target) return;
    updatePending(target.slug, (blocks) => blocks.filter((block) => block.id !== id));
  }

  function updateDraftBlock(id: string, patch: Partial<CmsBlock>) {
    setDraftBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    );
  }

  function moveDraftBlock(index: number, direction: -1 | 1) {
    setDraftBlocks((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function removeDraftBlock(id: string) {
    setDraftBlocks((current) => current.filter((block) => block.id !== id));
  }

  function openStructure(slug: string) {
    setStructureSlug(slug);
    setSelectedSlug(slug);
    setPanel("create");
    setNotice(null);
  }

  function closeStructure() {
    setStructureSlug(null);
    setPanel("pages");
    setNotice(null);
  }

  function openNewsPanel() {
    setStructureSlug(null);
    setNewsEditSlug(null);
    setPanel("news");
    setNotice(null);
    setPublished(true);
    setCreateRole("");
    setParentSlug("");
    const options = newsTemplateChoices(templateChoices(templatesRef.current));
    if (templateSlug === null || !options.some((page) => page.slug === templateSlug)) {
      setTemplateSlug(null);
      setDraftBlocks([]);
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError(null);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setLoginError(data?.error ?? "Fel lösenord.");
      return;
    }
    setPassword("");
    setPhase("loading");
    await loadCms();
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/";
  }

  useEffect(() => {
    if (phase !== "ready" || panel !== "create" || templateSlug === null) return;
    const key = `${templateSlug}:new`;
    if (draftKey.current === key) return;
    loadPageDraft(templateSlug);
    // Hydrates the selected template once, so the draft stays on this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, panel, templateSlug]);

  if (phase !== "ready") {
    return (
      <main className="admin-gate">
        <form onSubmit={login}>
          <MindstreetMark />
          <h1>{phase === "loading" ? "Hämtar sidor" : "Logga in"}</h1>
          {phase === "locked" ? (
            <>
              <p>Sidorna är gemensamma. Logga in för att ändra dem.</p>
              <label>
                Lösenord
                <input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {loginError ? <p className="admin-notice">{loginError}</p> : null}
              <button className="admin-primary" type="submit">
                Logga in
              </button>
            </>
          ) : (
            <p>Hämtar det gemensamma innehållet.</p>
          )}
        </form>
      </main>
    );
  }

  return (
    <div className="admin">
      <aside className="admin-rail" aria-label="Adminmeny">
        <MindstreetMark />
        <nav className="admin-nav" aria-label="Avsnitt">
          {panels.map((item) => (
            <button
              key={item.id}
              type="button"
              className={panel === item.id ? "is-active" : undefined}
              data-label={item.title}
              aria-label={item.title}
              aria-current={panel === item.id ? "page" : undefined}
              onClick={() => {
                if (item.id === "news") {
                  openNewsPanel();
                  return;
                }
                setStructureSlug(null);
                setPanel(item.id);
                setNotice(null);
              }}
            >
              <RailIcon name={item.id} />
            </button>
          ))}
        </nav>
        <div className="admin-rail-foot">
          <button
            type="button"
            className={panel === "archive" ? "is-active" : undefined}
            data-label="Borttagna sidor och mallar"
            aria-label="Borttagna sidor och mallar"
            aria-current={panel === "archive" ? "page" : undefined}
            onClick={() => {
              setStructureSlug(null);
              setPanel("archive");
              setNotice(null);
            }}
          >
            <RailIcon name="archive" />
          </button>
          <button
            type="button"
            className="admin-logout"
            data-label="Logga ut"
            aria-label="Logga ut"
            onClick={() => void logout()}
          >
            <RailIcon name="logout" />
          </button>
        </div>
      </aside>

      <div className="admin-stage">
        {notice ? <p className="admin-notice">{notice}</p> : null}

        <main className="admin-main">
          {panel === "pages" ? (
              <div className="admin-panel">
                <PageHeading kicker="Befintliga" title="Publicerade sidor" />
              <div className="admin-pages-layout">
                <section aria-label="Befintliga sidor">
                  <ul className="admin-page-list">
                    {listedPages.map((page) => (
                      <li key={page.slug || "/"} className={page.parentSlug ? "is-child" : undefined}>
                        <button
                          type="button"
                          className={page.slug === selectedSlug ? "is-selected" : undefined}
                          onClick={() => {
                            setSelectedSlug(page.slug);
                            setNotice(null);
                          }}
                        >
                          <span className="admin-page-row">
                            <span className="admin-page-name">{pageTitle(page)}</span>
                            <span className="admin-page-flags">
                              <span className={page.published ? "admin-status is-live" : "admin-status"}>
                                {page.published ? "Publicerad" : "Utkast"}
                              </span>
                              {hasPendingChanges(page) ? (
                                <span className="admin-status">Ändrad</span>
                              ) : null}
                              {incompleteSlugs.has(page.slug) ? (
                                <span className="admin-status is-incomplete">Ofullständig</span>
                              ) : null}
                            </span>
                          </span>
                          <small>
                            {pageAddress(page.slug)}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                {selected ? (
                  <section aria-label="Vald sida">
                    <div className="admin-main-head">
                      <div>
                        <p className="admin-kicker">Sida</p>
                        <h2 className="admin-title">{pageTitle(selected)}</h2>
                        <p className="admin-preview">
                          {pageAddress(selected.slug)}
                        </p>
                      </div>
                      <div className="admin-main-actions">
                        <div className="admin-action-row">
                          <a
                            className={selectedChanged ? "admin-quiet" : "admin-primary"}
                            href={`/${selected.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Öppna sida
                          </a>
                          <button
                            type="button"
                            className="admin-quiet"
                            onClick={() => openStructure(selected.slug)}
                          >
                            Ändra uppbyggnad
                          </button>
                          <PublishControls
                            published={selected.published}
                            changed={selectedChanged}
                            onToggle={() => togglePublished(selected.slug)}
                            onPublish={() => void publishPendingChanges(selected.slug)}
                            onDiscard={() => void discardPendingChanges(selected.slug)}
                          />
                        </div>
                      </div>
                    </div>

                    <PendingBanner show={selectedChanged} />
                    <CompletenessBanner issues={selectedIssues} published={selected.published} />

                    <section className="admin-canvas" aria-label="Sidans block">
                      <h3>Sidan</h3>
                      {!selectedDraft || selectedDraft.blocks.length === 0 ? (
                        <p className="admin-empty">
                          Inga komponenter ännu. Lägg till ett block under Skapa ny sidmall utifrån komponenter.
                        </p>
                      ) : (
                        <PageBlockList
                          blocks={selectedDraft.blocks}
                          mode="content"
                          issues={selectedIssues}
                          pages={pages}
                          parents={rootPages(pages).filter(
                            (page) => page.slug && page.slug !== selected.slug,
                          )}
                          pageParentSlug={selected.parentSlug ?? ""}
                          onChange={(id, patch) => updateBlock(id, patch)}
                          onImage={(id, src, field) => updateBlock(id, { [field]: src })}
                          onItems={(id, items) => updateBlock(id, { items })}
                        />
                      )}
                      <LockedFooterNote />
                    </section>

                    <section className="admin-danger" aria-label="Ta bort sida">
                      <h3>Ta bort sidan</h3>
                      <p>
                        {pages.some((page) => page.parentSlug === selected.slug)
                          ? "Sidan och dess undersidor försvinner från webbplatsen. En kopia sparas under Borttagna sidor och mallar och kan återställas."
                          : "Sidan försvinner från webbplatsen. En kopia sparas under Borttagna sidor och mallar och kan återställas."}
                      </p>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => openDelete(selected.slug)}
                      >
                        Ta bort sida
                      </button>
                    </section>
                  </section>
                ) : (
                  <p className="admin-empty">Inga sidor.</p>
                )}

                {selectedDraft ? (
                  <PageMiniature
                    url={pageAddress(selected.slug)}
                    page={selectedDraft}
                    menu={menu}
                    publishedAt={newsDateForSlug(selected.slug, pages)}
                    articleItems={articleItems}
                  />
                ) : null}
              </div>
              </div>
          ) : null}

          {panel === "create" || panel === "news" ? (
            <div className="admin-panel">
              <PageHeading
                kicker={
                  panel === "create" && structurePage
                    ? "Uppbyggnad"
                    : panel === "news" && newsArticle
                      ? "Redigera"
                      : panel === "news"
                        ? "Nyhet"
                        : "Ny sida"
                }
                title={
                  panel === "create" && structurePage
                    ? pageTitle(structurePage)
                    : panel === "news" && newsArticle
                      ? articleLabel(newsDraft ?? newsArticle)
                      : panel === "news"
                        ? "Lägg till nyhet"
                        : "Skapa ny sida av mall"
                }
              />
              {panel === "create" && structurePage ? (
                <div className="admin-pages-layout is-create">
                  <section aria-label="Sidans delar">
                    <div className="admin-on-page">
                      <h3>På {pageTitle(structurePage)}</h3>
                      {!structureDraft || structureDraft.blocks.length === 0 ? (
                        <p className="admin-empty">Inga komponenter ännu.</p>
                      ) : (
                        <ol>
                          {structureDraft.blocks.map((block) => (
                            <li key={block.id}>
                              <strong>{blockLabel(block.type)}</strong>
                              <span>{block.heading}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                      <LockedFooterNote />
                    </div>
                  </section>

                  <section aria-label="Uppbyggnad">
                    <div className="admin-main-head">
                      <div>
                        <p className="admin-kicker">Uppbyggnad</p>
                        <h2 className="admin-title">{pageTitle(structurePage)}</h2>
                        <p className="admin-preview">{pageAddress(structurePage.slug)}</p>
                      </div>
                      <div className="admin-main-actions">
                        <div className="admin-action-row">
                          <button type="button" className="admin-quiet" onClick={closeStructure}>
                            Publicerade sidor
                          </button>
                          <a
                            className={structureChanged ? "admin-quiet" : "admin-primary"}
                            href={`/${structurePage.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Öppna sida
                          </a>
                          <PublishControls
                            published={structurePage.published}
                            changed={structureChanged}
                            onToggle={() => togglePublished(structurePage.slug)}
                            onPublish={() => void publishPendingChanges(structurePage.slug)}
                            onDiscard={() => void discardPendingChanges(structurePage.slug)}
                          />
                        </div>
                      </div>
                    </div>

                    <PendingBanner show={structureChanged} />
                    <CompletenessBanner
                      issues={structureIssues}
                      published={structurePage.published}
                    />

                    <section className="admin-canvas" aria-label="Sidans block">
                      <h3>Sidan</h3>
                      {!structureDraft || structureDraft.blocks.length === 0 ? (
                        <p className="admin-empty">
                          Inga komponenter ännu. Lägg till ett block under Skapa ny sidmall utifrån
                          komponenter.
                        </p>
                      ) : (
                        <PageBlockList
                          blocks={structureDraft.blocks}
                          mode="structure"
                          issues={structureIssues}
                          pages={pages}
                          parents={rootPages(pages).filter(
                            (page) => page.slug && page.slug !== structurePage.slug,
                          )}
                          pageParentSlug={structurePage.parentSlug ?? ""}
                          onChange={(id, patch) => updateBlock(id, patch)}
                          onImage={(id, src, field) => updateBlock(id, { [field]: src })}
                          onItems={(id, items) => updateBlock(id, { items })}
                          onMove={moveBlock}
                          onRemove={removeBlock}
                        />
                      )}
                      <LockedFooterNote />
                    </section>
                  </section>

                  <PageMiniature
                    url={pageAddress(structurePage.slug)}
                    page={structureDraft ?? structurePage}
                    menu={menu}
                    publishedAt={newsDateForSlug(structurePage.slug, pages)}
                    articleItems={articleItems}
                  />
                </div>
              ) : (
                <div className="admin-pages-layout is-create">
                  <section aria-label={panel === "news" ? "Nyheter" : "Sidmallar"}>
                    <label className="admin-pick" htmlFor="create-template">
                      Mall
                      <select
                        id="create-template"
                        value={templateSlug === null ? UNSELECTED_TEMPLATE : slugToOption(templateSlug)}
                        onChange={(event) => {
                          const slug = event.target.value;
                          if (slug === UNSELECTED_TEMPLATE) return;
                          chooseTemplate(optionToSlug(slug));
                        }}
                      >
                        <option value={UNSELECTED_TEMPLATE} disabled>
                          Välj mall
                        </option>
                        {visibleTemplateOptions.map((page) => (
                          <option key={page.slug || "/"} value={slugToOption(page.slug)}>
                            {page.parentSlug && !isBuiltinNewsTemplate(page.slug)
                              ? `– ${pageTitle(page)}`
                              : pageTitle(page)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {menuSelected ? (
                      <div className="admin-on-page">
                        <h3>På Meny</h3>
                        {menu.length === 0 ? (
                          <p className="admin-empty">Inga rader i menyn ännu.</p>
                        ) : (
                          <ol>
                            {menu.map((item, index) => (
                              <li key={`${item.label}-${index}`}>
                                <strong>{item.label.trim() || `Rad ${index + 1}`}</strong>
                                <span>{item.href}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    ) : templatePage ? (
                      <div className="admin-on-page">
                        <h3>På {pageTitle(templatePage)}</h3>
                        {templatePage.blocks.length === 0 ? (
                          <p className="admin-empty">Mallen har inga komponenter ännu.</p>
                        ) : (
                          <ol>
                            {templatePage.blocks.map((block) => (
                              <li key={block.id}>
                                <strong>{blockLabel(block.type)}</strong>
                                <span>{block.heading}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        <LockedFooterNote />
                      </div>
                    ) : null}
                    {templatePage &&
                    panel !== "news" &&
                    !isBuiltinNewsTemplate(templatePage.slug) &&
                    !isBuiltinMenuTemplate(templatePage.slug) ? (
                      <section className="admin-danger" aria-label="Ta bort mall">
                        <h3>Ta bort mallen</h3>
                        <p>
                          Mallen försvinner från listan. En kopia sparas under Borttagna sidor och mallar
                          och kan återställas. Sidor som redan finns påverkas inte.
                        </p>
                        <button
                          type="button"
                          className="admin-danger-button"
                          onClick={() => openDeleteTemplate(templatePage.slug)}
                        >
                          Ta bort mall
                        </button>
                      </section>
                    ) : null}
                    {panel === "news" ? (
                      <div className="admin-news-archive">
                        <ArticleGroup
                          title="Publicerade"
                          empty="Inga publicerade artiklar."
                          pages={publishedArticles}
                          selectedSlug={newsArticle?.slug ?? null}
                          onOpen={openNewsArticle}
                        />
                        <ArticleGroup
                          title="Historiska"
                          empty="Inga historiska artiklar."
                          pages={historicalArticles}
                          selectedSlug={newsArticle?.slug ?? null}
                          onOpen={openNewsArticle}
                        />
                      </div>
                    ) : null}
                  </section>

                  {panel === "news" && newsArticle ? (
                    <section aria-label="Redigera nyhet">
                      <div className="admin-main-head">
                        <div>
                          <p className="admin-kicker">Nyhet</p>
                          <h2 className="admin-title">{articleLabel(newsDraft ?? newsArticle)}</h2>
                          <p className="admin-preview">{pageAddress(newsArticle.slug)}</p>
                        </div>
                        <div className="admin-main-actions">
                          <div className="admin-action-row">
                            <a
                              className={newsChanged ? "admin-quiet" : "admin-primary"}
                              href={`/${newsArticle.slug}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Öppna sida
                            </a>
                            <PublishControls
                              published={newsArticle.published}
                              changed={newsChanged}
                              onToggle={() => togglePublished(newsArticle.slug)}
                              onPublish={() => void publishPendingChanges(newsArticle.slug)}
                              onDiscard={() => void discardPendingChanges(newsArticle.slug)}
                            />
                          </div>
                        </div>
                      </div>
                      <PendingBanner show={newsChanged} />
                      <CompletenessBanner issues={newsIssues} published={newsArticle.published} />
                      <section className="admin-canvas" aria-label="Sidans block">
                        <h3>Sidan</h3>
                        {!newsDraft || newsDraft.blocks.length === 0 ? (
                          <p className="admin-empty">Inga komponenter ännu.</p>
                        ) : (
                          <PageBlockList
                            blocks={newsDraft.blocks}
                            mode="content"
                            issues={newsIssues}
                            pages={pages}
                            parents={rootPages(pages).filter(
                              (page) => page.slug && page.slug !== newsArticle.slug,
                            )}
                            pageParentSlug={newsArticle.parentSlug ?? ""}
                            onChange={(id, patch) => updateBlock(id, patch)}
                            onImage={(id, src, field) => updateBlock(id, { [field]: src })}
                            onItems={(id, items) => updateBlock(id, { items })}
                          />
                        )}
                        <LockedFooterNote />
                      </section>
                    </section>
                  ) : menuSelected ? (
                    <section aria-label="Meny">
                      <div className="admin-main-head">
                        <div>
                          <p className="admin-kicker">Meny</p>
                          <h2 className="admin-title">Meny</h2>
                        </div>
                      </div>
                      <section className="admin-canvas" aria-label="Menyrader">
                        <h3>Menyn</h3>
                        <MenuRows items={menu} pages={orderedPages(pages)} onChange={updateMenu} />
                      </section>
                    </section>
                  ) : templatePage ? (
                    <section aria-label={panel === "news" ? "Ny nyhet" : "Ny sida"}>
                      <form onSubmit={createPage}>
                        <div className="admin-main-head">
                          <div>
                            <p className="admin-kicker">{panel === "news" ? "Ny nyhet" : "Ny sida"}</p>
                            <h2 className="admin-title">{editorTitle}</h2>
                            <p className="admin-preview">{pageAddress(previewSlug)}</p>
                          </div>
                          <div className="admin-main-actions">
                            <div className="admin-action-row">
                              <label className="admin-check">
                                <input
                                  type="checkbox"
                                  checked={published}
                                  onChange={(event) => setPublished(event.target.checked)}
                                />
                                Publicera
                              </label>
                              <button type="submit" className="admin-primary">
                                {panel === "news" ? "Spara nyhet" : "Spara sida"}
                              </button>
                              {lastSavedSlug !== null ? (
                                <a
                                  className="admin-quiet"
                                  href={lastSavedSlug ? `/${lastSavedSlug}` : "/"}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Öppna sida
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <CompletenessBanner issues={createIssues} />

                        <div className="admin-create-fields">
                          <AdminField
                            label="Sidnamn"
                            htmlFor="page-title"
                            issue={findCompletenessIssue(createIssues, "title")}
                          >
                            <input
                              id="page-title"
                              value={titleInput}
                              onChange={(event) => setTitleInput(event.target.value)}
                              placeholder={panel === "news" ? "Ny nyhet" : "Våra expertområden"}
                              autoFocus
                            />
                          </AdminField>
                          <p className="admin-derived-url">
                            <span>URL</span>
                            {pageAddress(previewSlug)}
                          </p>
                          {panel === "news" ? null : (
                            <label htmlFor="page-parent">
                              Förälder
                              <select
                                id="page-parent"
                                value={createRole === "home" ? "" : parentSlug}
                                disabled={createRole === "home"}
                                onChange={(event) => setParentSlug(event.target.value)}
                              >
                                <option value="">Ingen</option>
                                {parents.map((page) => (
                                  <option key={page.slug || "/"} value={page.slug}>
                                    {pageTitle(page)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          {panel === "news" ? null : (
                            <RoleSwitches
                              role={createRole}
                              onChange={(next) => {
                                setCreateRole(next);
                                if (next === "home") setParentSlug("");
                              }}
                            />
                          )}
                        </div>

                        <section className="admin-canvas" aria-label="Sidans block">
                          <h3>Sidan</h3>
                          {draftBlocks.length === 0 ? (
                            <p className="admin-empty">Mallen har inga komponenter ännu.</p>
                          ) : (
                            <PageBlockList
                              blocks={draftBlocks}
                              mode="full"
                              issues={createIssues}
                              pages={pages}
                              onChange={(id, patch) => updateDraftBlock(id, patch)}
                              onImage={(id, src, field) => updateDraftBlock(id, { [field]: src })}
                              onItems={(id, items) => updateDraftBlock(id, { items })}
                              onMove={moveDraftBlock}
                              onRemove={removeDraftBlock}
                            />
                          )}
                          <LockedFooterNote />
                        </section>
                      </form>
                    </section>
                  ) : (
                    <section aria-label={panel === "news" ? "Ny nyhet" : "Ny sida"}>
                      <p className="admin-empty">Välj en sidmall till vänster.</p>
                    </section>
                  )}

                  {panel === "news" && newsArticle ? (
                    <PageMiniature
                      url={pageAddress(newsArticle.slug)}
                      page={newsDraft ?? newsArticle}
                      menu={menu}
                      publishedAt={newsDateForSlug(newsArticle.slug, pages)}
                      articleItems={articleItems}
                    />
                  ) : menuSelected ? (
                    <PageMiniature url={pageAddress("")} summary="Meny">
                      <MenuPreview items={menu} />
                    </PageMiniature>
                  ) : (
                    <PageMiniature
                      url={pageAddress(previewSlug)}
                      menu={menu}
                      publishedAt={newsDateForSlug(previewSlug, pages)}
                      articleItems={articleItems}
                      page={{
                        slug:
                          panel === "create" && createRole === "home"
                            ? ""
                            : previewSlug || (panel === "news" ? "ny-nyhet" : "ny-sida"),
                        title: panel === "news" ? titleInput.trim() || "Ny nyhet" : editorTitle,
                        parentSlug:
                          panel === "news" || (panel === "create" && createRole === "home")
                            ? undefined
                            : parentSlug || undefined,
                        role: panel === "create" ? createRole || undefined : undefined,
                        published,
                        links: [],
                        blocks: templatePage ? draftBlocks : [],
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ) : null}

          {panel === "components" ? (
            <div className="admin-panel">
              <PageHeading kicker="Bibliotek" title="Skapa ny sidmall utifrån komponenter" />
              <div className="admin-main-head admin-template-head">
                <div>
                  <p className="admin-kicker">
                    {editingExisting ? "Redigera sidmall" : blankMode ? "Ny sidmall" : "Sidmall"}
                  </p>
                  <h2 className="admin-title">{templateDraftTitle}</h2>
                </div>
                <div className="admin-main-actions">
                  <div className="admin-action-row">
                    {structureEditable ? (
                      <button type="button" className="admin-primary" onClick={saveComponentTemplate}>
                        Spara sidmall
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-primary"
                        onClick={() => {
                          if (componentPage) beginTemplateEdit(componentPage);
                        }}
                      >
                        Redigera
                      </button>
                    )}
                    {componentPage ? (
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => openDeleteTemplate(componentPage.slug)}
                      >
                        Ta bort mall
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="admin-pages-layout is-components">
                <section aria-label="På ny sidmall">
                  <div className="admin-on-page">
                    <h3>På {templateDraftTitle}</h3>
                    {componentBlocks.length === 0 ? (
                      <p className="admin-empty">Inga komponenter på sidan ännu.</p>
                    ) : (
                      <ol
                        className={
                          dropIndex === componentBlocks.length ? "is-drop-end" : undefined
                        }
                      >
                        {componentBlocks.map((block, index) => (
                          <li
                            key={block.id}
                            className={[
                              structureEditable ? "is-draggable" : "",
                              dragIndex === index ? "is-dragging" : "",
                              dropIndex === index ? "is-drop-before" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onPointerDown={(event) => {
                              if (!structureEditable) return;
                              if (event.button !== 0) return;
                              if ((event.target as HTMLElement).closest("button")) return;
                              dragOriginRef.current = event.clientY;
                              dragIndexRef.current = null;
                              try {
                                event.currentTarget.setPointerCapture(event.pointerId);
                              } catch {
                                // Pointer capture is unavailable for some synthetic drags.
                              }
                            }}
                            onPointerMove={(event) => {
                              if (dragOriginRef.current === null) return;
                              if (dragIndexRef.current === null) {
                                if (Math.abs(event.clientY - dragOriginRef.current) < 4) return;
                                dragIndexRef.current = index;
                                setDragIndex(index);
                              }
                              const rows = event.currentTarget.parentElement?.children;
                              if (!rows) return;
                              let next = rows.length;
                              for (let i = 0; i < rows.length; i += 1) {
                                const rect = (rows[i] as HTMLElement).getBoundingClientRect();
                                if (event.clientY < rect.top + rect.height / 2) {
                                  next = i;
                                  break;
                                }
                              }
                              setDropIndex((current) => (current === next ? current : next));
                            }}
                            onPointerUp={(event) => {
                              const from = dragIndexRef.current;
                              const rows = event.currentTarget.parentElement?.children;
                              let to = rows?.length ?? index;
                              if (rows) {
                                for (let i = 0; i < rows.length; i += 1) {
                                  const rect = (rows[i] as HTMLElement).getBoundingClientRect();
                                  if (event.clientY < rect.top + rect.height / 2) {
                                    to = i;
                                    break;
                                  }
                                }
                              }
                              dragOriginRef.current = null;
                              dragIndexRef.current = null;
                              setDragIndex(null);
                              setDropIndex(null);
                              if (from === null) return;
                              reorderComponentBlocks(from, to);
                            }}
                            onPointerCancel={() => {
                              dragOriginRef.current = null;
                              dragIndexRef.current = null;
                              setDragIndex(null);
                              setDropIndex(null);
                            }}
                          >
                            <div className="admin-block-head">
                              <span className="admin-block-label">
                                {structureEditable ? (
                                  <span className="admin-drag-handle" aria-hidden="true">
                                    <DragGrip />
                                  </span>
                                ) : null}
                                <strong>{blockLabel(block.type)}</strong>
                              </span>
                              {structureEditable ? (
                                <button
                                  type="button"
                                  className="admin-icon-button"
                                  aria-label={`Ta bort ${blockLabel(block.type)}`}
                                  onClick={() => removeComponentBlock(block.id)}
                                >
                                  <TrashIcon />
                                </button>
                              ) : null}
                            </div>
                            <span>{block.heading}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    <LockedFooterNote />
                  </div>
                </section>

                <section aria-label="Komponenter">
                  <label className="admin-pick" htmlFor="component-target">
                    Utgå från
                    <select
                      id="component-target"
                      value={
                        blankMode || !componentPage
                          ? BLANK_TEMPLATE
                          : slugToOption(componentPage.slug)
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        setComponentTarget(
                          value === BLANK_TEMPLATE ? BLANK_TEMPLATE : optionToSlug(value),
                        );
                        setEditingSlug(null);
                        setNotice(null);
                      }}
                    >
                      <option value={BLANK_TEMPLATE}>Blank sida</option>
                      {templateOptions.map((page) => (
                        <option key={page.slug || "/"} value={slugToOption(page.slug)}>
                          {page.parentSlug ? `– ${pageTitle(page)}` : pageTitle(page)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {structureEditable ? (
                    <div className="admin-create-fields">
                      <label htmlFor="template-title">
                        Mallnamn
                        <input
                          id="template-title"
                          value={blankMode ? blankTitle : editTitle}
                          onChange={(event) =>
                            blankMode
                              ? setBlankTitle(event.target.value)
                              : setEditTitle(event.target.value)
                          }
                          placeholder="Ny sidmall"
                        />
                      </label>
                    </div>
                  ) : null}

                  <BlockCatalog onAdd={addBlock} />
                </section>

                <PageMiniature
                  url=""
                  menu={menu}
                  publishedAt={newsDateForSlug(blankMode ? "" : (componentPage?.slug ?? ""), pages)}
                  articleItems={articleItems}
                  page={{
                    slug: blankMode ? "ny-mall" : componentPage?.slug || "ny-mall",
                    title: templateDraftTitle,
                    published: blankMode ? false : (componentPage?.published ?? false),
                    links: [],
                    blocks: blankMode
                      ? blankBlocks
                      : editingExisting
                        ? editBlocks
                        : (componentPage?.blocks ?? []),
                  }}
                />
              </div>
            </div>
          ) : null}

          {panel === "images" ? (
            <div className="admin-panel">
              <PageHeading kicker="Bilder" title="Bildbibliotek" />
              <BlobLibrary pages={pages} onRemoved={forgetUploadedImage} />
            </div>
          ) : null}

          {panel === "archive" ? (
            <div className="admin-panel">
              <PageHeading kicker="Borttagna" title="Borttagna sidor och mallar" />
              <div className="admin-archive-layout">
                <section className="admin-archive" aria-label="Borttagna sidor">
                  <h3>Borttagna sidor</h3>
                  <p>Kopian ligger kvar här tills sidan återställs.</p>
                  {archive.length === 0 ? (
                    <p className="admin-empty">Inga borttagna sidor.</p>
                  ) : (
                    <ul>
                      {archive.map((entry) => {
                        const page =
                          entry.pages.find((item) => item.slug === entry.slug) ?? entry.pages[0];
                        return (
                          <li key={entry.id}>
                            <span>{pageTitle(page)}</span>
                            <small>
                              {pageAddress(page.slug)}
                              {entry.pages.length > 1
                                ? ` · ${entry.pages.length - 1} undersidor`
                                : ""}
                            </small>
                            <small>{formatDeletedAt(entry.deletedAt)}</small>
                            <button
                              type="button"
                              className="admin-quiet"
                              onClick={() => restorePage(entry.id)}
                            >
                              Återställ
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
                <section className="admin-archive" aria-label="Borttagna mallar">
                  <h3>Borttagna mallar</h3>
                  <p>Kopian ligger kvar här tills mallen återställs.</p>
                  {templateArchive.length === 0 ? (
                    <p className="admin-empty">Inga borttagna mallar.</p>
                  ) : (
                    <ul>
                      {templateArchive.map((entry) => (
                        <li key={entry.id}>
                          <span>{entry.template.title.trim() || entry.template.slug}</span>
                          <small>Mall</small>
                          <small>{formatDeletedAt(entry.deletedAt)}</small>
                          <button
                            type="button"
                            className="admin-quiet"
                            onClick={() => restoreTemplate(entry.id)}
                          >
                            Återställ
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </main>
      </div>
      {pendingDelete ? (
        <DeletePageDialog
          title={pageTitle(pendingDelete)}
          address={pageAddress(pendingDelete.slug)}
          childCount={Math.max(0, pendingRemoved.length - 1)}
          value={deleteInput}
          onChange={setDeleteInput}
          onCancel={() => {
            closeDelete();
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
      {pendingTemplateDelete ? (
        <DeletePageDialog
          mode="template"
          title={pageTitle(pendingTemplateDelete)}
          address={pendingTemplateDelete.title.trim() || pendingTemplateDelete.slug}
          childCount={0}
          value={deleteInput}
          onChange={setDeleteInput}
          onCancel={() => {
            closeDelete();
          }}
          onConfirm={confirmDeleteTemplate}
        />
      ) : null}
    </div>
  );
}

function ArticleGroup({
  title,
  empty,
  pages,
  selectedSlug,
  onOpen,
}: {
  title: string;
  empty: string;
  pages: CmsPage[];
  selectedSlug: string | null;
  onOpen: (slug: string) => void;
}) {
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      {pages.length === 0 ? (
        <p className="admin-empty">{empty}</p>
      ) : (
        <ul className="admin-page-list">
          {pages.map((page) => {
            const date = formatNewsDate(articlePublishedAt(page));
            const selected = page.slug === selectedSlug;
            return (
              <li key={page.slug || "/"}>
                <button
                  type="button"
                  className={selected ? "is-selected" : undefined}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onOpen(page.slug)}
                >
                  <span className="admin-page-row">
                    <span className="admin-page-name">{articleLabel(page)}</span>
                    <span className="admin-page-flags">
                      {hasPendingChanges(page) ? <span className="admin-status">Ändrad</span> : null}
                    </span>
                  </span>
                  <small>{date || pageAddress(page.slug)}</small>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PageHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="admin-page-head">
      <p className="admin-kicker">{kicker}</p>
      <h2 className="admin-title">{title}</h2>
    </header>
  );
}

function PendingBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="admin-completeness" role="status">
      <p>
        Sidan har ändringar som inte syns på webbplatsen. Publicera för att de ska slå igenom.
      </p>
    </div>
  );
}

function PublishControls({
  published,
  changed,
  onToggle,
  onPublish,
  onDiscard,
}: {
  published: boolean;
  changed: boolean;
  onToggle: () => void;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  const label = published ? "Publiserad" : "Ej publiserad";
  const statusClass = published ? "admin-publish is-live" : "admin-publish";
  return (
    <>
      {changed ? (
        <span className={statusClass}>{label}</span>
      ) : (
        <button type="button" className={statusClass} aria-pressed={published} onClick={onToggle}>
          {label}
        </button>
      )}
      {changed ? (
        <>
          <button type="button" className="admin-primary" onClick={onPublish}>
            Publicera ändringar
          </button>
          <button type="button" className="admin-quiet" onClick={onDiscard}>
            Ångra
          </button>
        </>
      ) : null}
    </>
  );
}

function CompletenessBanner({
  issues,
  published = false,
}: {
  issues: CompletenessIssue[];
  published?: boolean;
}) {
  if (issues.length === 0) return null;

  return (
    <div className="admin-completeness" role="alert">
      {published ? (
        <p>
          Sidan är publicerad men ofullständig. Den kan inte publiceras igen förrän fälten och
          undersideslänkarna är klara.
        </p>
      ) : null}
      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            {issue.fieldMessage ? (
              <button
                type="button"
                onClick={() =>
                  document.getElementById(issue.id)?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
              >
                {issue.message}
              </button>
            ) : (
              issue.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminField({
  label,
  issue,
  htmlFor,
  children,
}: {
  label: string;
  issue?: CompletenessIssue;
  htmlFor?: string;
  children: ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const errorId = issue ? `${issue.id}-error` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        "aria-invalid": issue ? true : undefined,
        "aria-describedby": errorId,
      })
    : children;

  return (
    <label htmlFor={htmlFor} id={issue?.id} className={issue ? "is-invalid" : undefined}>
      {label}
      {control}
      {issue ? (
        <span className="admin-field-error" id={errorId}>
          {issue.fieldMessage}
        </span>
      ) : null}
    </label>
  );
}

function PageBlockList({
  blocks,
  mode,
  issues = [],
  pages,
  parents,
  pageParentSlug = "",
  onChange,
  onImage,
  onItems,
  onMove,
  onRemove,
}: {
  blocks: CmsBlock[];
  mode: EditorMode;
  issues?: CompletenessIssue[];
  pages: CmsPage[];
  parents?: CmsPage[];
  pageParentSlug?: string;
  onChange: (id: string, patch: Partial<CmsBlock>) => void;
  onImage: (id: string, src: string, field: "image" | "image2") => void;
  onItems: (id: string, items: CmsCard[]) => void;
  onMove?: (index: number, direction: -1 | 1) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <ol>
      {blocks.map((block, index) => (
        <li key={block.id}>
          <div className="admin-block-head">
            <strong>{blockLabel(block.type)}</strong>
            {onMove && onRemove && showsStructure(mode) ? (
              <div>
                <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}>
                  Upp
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === blocks.length - 1}
                >
                  Ner
                </button>
                {isNewsBlock(block.type) ? null : (
                  <button type="button" onClick={() => onRemove(block.id)}>
                    Ta bort
                  </button>
                )}
              </div>
            ) : null}
          </div>
          <BlockFieldsEditor
            block={block}
            mode={mode}
            issues={issues}
            onChange={(patch) => onChange(block.id, patch)}
            onImage={(src, field) => onImage(block.id, src, field)}
            parents={parents}
            pages={pages}
            pageParentSlug={pageParentSlug}
          />
          {block.type === "expertise" ? (
            <ExpertiseCards
              blockId={block.id}
              items={block.items ?? []}
              pages={pages}
              issues={issues}
              mode={mode}
              onChange={(items) => onItems(block.id, items)}
            />
          ) : null}
          {block.type === "contactCards" || block.type === "contactUs" ? (
            <ContactCards
              items={block.items ?? []}
              mode={mode}
              onChange={(items) => onItems(block.id, items)}
            />
          ) : null}
          {block.type === "offering" ? (
            <OfferingRows
              blockId={block.id}
              items={block.items ?? []}
              pages={pages}
              issues={issues}
              mode={mode}
              onChange={(items) => onItems(block.id, items)}
            />
          ) : null}
          {showsContent(mode) && isNewsBlock(block.type) ? <NewsCards pages={pages} /> : null}
          {block.type === "textColumn" ? (
            <TextColumnSections
              blockId={block.id}
              items={block.items ?? []}
              issues={issues}
              mode={mode}
              onChange={(items) => onItems(block.id, items)}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function BlockFieldsEditor({
  block,
  issues = [],
  onChange,
  onImage,
  parents,
  pages,
  pageParentSlug = "",
  mode = "full",
}: {
  block: CmsBlock;
  issues?: CompletenessIssue[];
  onChange: (patch: Partial<CmsBlock>) => void;
  onImage: (src: string, field: "image" | "image2") => void;
  parents?: CmsPage[];
  pages?: CmsPage[];
  pageParentSlug?: string;
  mode?: EditorMode;
}) {
  const content = showsContent(mode);
  const structure = showsStructure(mode);
  const fields = fieldsFor(block.type);
  const eyebrowIssue = findCompletenessIssue(issues, "eyebrow", block.id);
  const headingIssue = findCompletenessIssue(issues, "heading", block.id);
  const bodyIssue = findCompletenessIssue(issues, "body", block.id);
  const quoteIssue = findCompletenessIssue(issues, "quote", block.id);
  const buttonIssue = findCompletenessIssue(issues, "buttonLabel", block.id);
  const hrefIssue = findCompletenessIssue(issues, "buttonHref", block.id);
  const pageLinkSelect = block.type === "imageText" || block.type === "imagePair";
  const savedHref = block.buttonHref ?? "";
  const linkPages = pages ?? [];
  const savedHrefListed = linkPages.some((page) => `/${page.slug}` === savedHref);
  const imageIssue = findCompletenessIssue(issues, "image", block.id);
  const image2Issue = findCompletenessIssue(issues, "image2", block.id);
  if (block.type === "banner") {
    return (
      <>
        {content ? (
          <AdminField label={fields.body ?? "Liten rad"} issue={bodyIssue}>
            <textarea
              rows={2}
              value={block.body}
              onChange={(event) => onChange({ body: event.target.value })}
            />
          </AdminField>
        ) : null}
        {content ? (
          <AdminField label={fields.heading ?? "Rubrik"} issue={headingIssue}>
            <input
              value={block.heading}
              onChange={(event) => onChange({ heading: event.target.value })}
            />
          </AdminField>
        ) : null}
        {structure ? (
          <>
            <AdminField label="Knapp" issue={buttonIssue}>
              <input
                value={block.buttonLabel ?? ""}
                onChange={(event) => onChange({ buttonLabel: event.target.value })}
              />
            </AdminField>
            <AdminField label="Länk" issue={hrefIssue}>
              <input
                value={block.buttonHref ?? ""}
                onChange={(event) => onChange({ buttonHref: event.target.value })}
              />
            </AdminField>
          </>
        ) : null}
        {content ? (
          <ImageField
            src={block.image}
            emptyLabel="Ingen bild vald."
            chooseLabel={block.image ? "Byt bild" : "Välj bild"}
            issue={imageIssue}
            onChoose={(src) => onImage(src, "image")}
            onClear={() => onChange({ image: undefined })}
          />
        ) : null}
        {structure ? (
          <label>
            Storlek
            <select
              value={block.size === "small" ? "small" : "large"}
              onChange={(event) => onChange({ size: event.target.value as CmsBlock["size"] })}
            >
              <option value="large">Stor</option>
              <option value="small">Liten</option>
            </select>
          </label>
        ) : null}
      </>
    );
  }

  const quoteFields =
    block.quote !== undefined ? (
      <>
        <FormattedText
          label="Citat"
          rows={3}
          value={block.quote}
          issue={quoteIssue}
          lines
          onChange={(quote) => onChange({ quote })}
        />
        <AdminField label="Källa">
          <input
            value={block.quoteCredit ?? ""}
            onChange={(event) => onChange({ quoteCredit: event.target.value })}
          />
        </AdminField>
        <QuotePlacement
          body={block.body}
          value={block.quoteAfter}
          onChange={(quoteAfter) => onChange({ quoteAfter })}
        />
      </>
    ) : null;

  return (
    <>
      {structure && block.type === "article" && parents ? (
        <label>
          Förälder
          <select
            value={block.parentSlug !== undefined ? block.parentSlug : pageParentSlug}
            onChange={(event) => onChange({ parentSlug: event.target.value })}
          >
            <option value="">Ingen</option>
            {parents.map((page) => (
              <option key={page.slug || "/"} value={page.slug}>
                {pageTitle(page)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {structure && fields.theme ? (
        block.type === "imageText" ? (
          <div className="admin-theme-row">
            <ColorSwatch
              value={resolveTheme(block)}
              options={swatchesFor(block.type, resolveTheme(block))}
              onChange={(theme) => onChange({ theme })}
            />
            <FieldSwitch
              label="Figur"
              stacked
              checked={block.shape ?? resolveTheme(block) === "mist"}
              onChange={(shape) => onChange({ shape })}
            />
          </div>
        ) : (
          <ColorSwatch
            value={resolveTheme(block)}
            options={swatchesFor(block.type, resolveTheme(block))}
            onChange={(theme) => onChange({ theme })}
          />
        )
      ) : null}
      {structure && usesExpandedTheme(block.type) && block.type !== "imageText" ? (
        <label className="admin-check">
          <input
            type="checkbox"
            checked={block.shape ?? resolveTheme(block) === "mist"}
            onChange={(event) => onChange({ shape: event.target.checked })}
          />
          Figur
        </label>
      ) : null}
      {content && fields.eyebrow ? (
        <AdminField label="Överrad" issue={eyebrowIssue}>
          <input
            value={block.eyebrow ?? ""}
            onChange={(event) => onChange({ eyebrow: event.target.value })}
          />
        </AdminField>
      ) : null}
      {content && fields.heading ? (
        block.type === "text" ? (
          <AdminField label={fields.heading} issue={headingIssue}>
            <textarea
              rows={4}
              value={block.heading}
              onChange={(event) => onChange({ heading: event.target.value })}
            />
          </AdminField>
        ) : (
          <AdminField label={fields.heading} issue={headingIssue}>
            <input
              value={block.heading}
              onChange={(event) => onChange({ heading: event.target.value })}
            />
          </AdminField>
        )
      ) : null}
      {content && block.type === "contact" ? (
        <>
          <AdminField label="Namn">
            <input
              value={block.contactName ?? ""}
              onChange={(event) => onChange({ contactName: event.target.value })}
            />
          </AdminField>
          <AdminField label="Titel">
            <input
              value={block.contactTitle ?? ""}
              onChange={(event) => onChange({ contactTitle: event.target.value })}
            />
          </AdminField>
          <AdminField label="Mailadress">
            <input
              type="email"
              value={block.contactEmail ?? ""}
              onChange={(event) => onChange({ contactEmail: event.target.value })}
            />
          </AdminField>
          <AdminField label="Telefonnummer">
            <input
              type="tel"
              value={block.contactPhone ?? ""}
              onChange={(event) => onChange({ contactPhone: event.target.value })}
            />
          </AdminField>
          <AdminField label="LinkedIn">
            <input
              value={block.contactLinkedIn ?? ""}
              onChange={(event) => onChange({ contactLinkedIn: event.target.value })}
            />
          </AdminField>
        </>
      ) : null}
      {content && block.type === "article" ? (
        <AdminField
          label="Publiceringsdatum"
          issue={findCompletenessIssue(issues, "publishedAt", block.id)}
        >
          <input
            type="date"
            value={block.publishedAt ?? ""}
            onChange={(event) => onChange({ publishedAt: event.target.value })}
          />
        </AdminField>
      ) : null}
      {content && fields.body ? (
        block.type === "article" ? (
          <FormattedText
            label={fields.body}
            rows={8}
            value={block.body}
            issue={bodyIssue}
            lines
            onChange={(body) => onChange({ body })}
          />
        ) : (
          <AdminField label={fields.body} issue={bodyIssue}>
            <textarea
              rows={block.type === "statement" ? 6 : 5}
              value={block.body}
              onChange={(event) => onChange({ body: event.target.value })}
            />
          </AdminField>
        )
      ) : null}
      {structure && block.type === "hero" ? (
        <>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={block.shape === true}
              onChange={(event) => onChange({ shape: event.target.checked ? true : undefined })}
            />
            Vector
          </label>
          <AdminField label="Knapp">
            <input
              value={block.buttonLabel ?? ""}
              onChange={(event) => onChange({ buttonLabel: event.target.value })}
            />
          </AdminField>
          <AdminField label="Sida">
            <select
              value={block.buttonHref ?? ""}
              onChange={(event) => onChange({ buttonHref: event.target.value })}
            >
              <option value="">Ingen sida</option>
              {(pages ?? []).map((page) => (
                <option key={page.slug || "/"} value={`/${page.slug}`}>
                  {pageTitle(page)}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Knapp 2">
            <input
              value={block.button2Label ?? ""}
              onChange={(event) => onChange({ button2Label: event.target.value })}
            />
          </AdminField>
          <AdminField label="Sida">
            <select
              value={block.button2Href ?? ""}
              onChange={(event) => onChange({ button2Href: event.target.value })}
            >
              <option value="">Ingen sida</option>
              {(pages ?? []).map((page) => (
                <option key={`2-${page.slug || "/"}`} value={`/${page.slug}`}>
                  {pageTitle(page)}
                </option>
              ))}
            </select>
          </AdminField>
        </>
      ) : null}
      {content && fields.quote ? (
        <>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={block.quote !== undefined}
              onChange={(event) =>
                onChange({
                  quote: event.target.checked ? block.quote ?? "" : undefined,
                  quoteAfter: event.target.checked ? block.quoteAfter ?? 0 : undefined,
                  quoteCredit: event.target.checked ? (block.quoteCredit ?? "") : undefined,
                })
              }
            />
            Citat i texten
          </label>
          {quoteFields}
        </>
      ) : null}
      {structure && block.type === "statement" ? (
        <label>
          Justering
          <select
            value={block.align ?? "center"}
            onChange={(event) => onChange({ align: event.target.value as CmsBlock["align"] })}
          >
            <option value="left">Vänster</option>
            <option value="center">Centrerad</option>
            <option value="right">Höger</option>
          </select>
        </label>
      ) : null}
      {structure && fields.button && block.type === "statement" ? (
        <>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={block.buttonLabel !== undefined}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? {
                        buttonLabel: block.buttonLabel || "Contact us",
                        buttonHref: block.buttonHref || "/#kontakt",
                      }
                    : { buttonLabel: undefined, buttonHref: undefined },
                )
              }
            />
            Knapp
          </label>
          {block.buttonLabel !== undefined ? (
            <>
              <AdminField label="Knapp" issue={buttonIssue}>
                <input
                  value={block.buttonLabel}
                  onChange={(event) => onChange({ buttonLabel: event.target.value })}
                />
              </AdminField>
              <AdminField label="Länk" issue={hrefIssue}>
                <input
                  value={block.buttonHref ?? ""}
                  onChange={(event) => onChange({ buttonHref: event.target.value })}
                />
              </AdminField>
            </>
          ) : null}
        </>
      ) : null}
      {structure && fields.button && (block.type === "contactCards" || block.type === "contactUs") ? (
        <>
          <AdminField label="Knapp">
            <input
              value={block.buttonLabel ?? ""}
              onChange={(event) => onChange({ buttonLabel: event.target.value })}
            />
          </AdminField>
          <AdminField label="Sida">
            <select
              value={block.buttonHref ?? ""}
              onChange={(event) => onChange({ buttonHref: event.target.value })}
            >
              <option value="">Ingen sida</option>
              {(pages ?? []).map((page) => (
                <option key={page.slug || "/"} value={`/${page.slug}`}>
                  {pageTitle(page)}
                </option>
              ))}
            </select>
          </AdminField>
        </>
      ) : null}
      {structure && fields.button && block.type === "imageText" ? (
        <>
          <FieldSwitch
            label="Knapp"
            checked={block.buttonLabel !== undefined}
            onChange={(enabled) =>
              onChange(
                enabled
                  ? {
                      buttonLabel: block.buttonLabel || "Läs mer",
                      buttonHref: block.buttonHref || "",
                    }
                  : { buttonLabel: undefined, buttonHref: undefined },
              )
            }
          />
          {block.buttonLabel !== undefined ? (
            <>
              <AdminField label="Knapp" issue={buttonIssue}>
                <input
                  value={block.buttonLabel}
                  onChange={(event) => onChange({ buttonLabel: event.target.value })}
                />
              </AdminField>
              <AdminField label="Länk" issue={hrefIssue}>
                <select
                  value={savedHref}
                  onChange={(event) => onChange({ buttonHref: event.target.value })}
                >
                  <option value="">Ingen sida</option>
                  {savedHref && !savedHrefListed ? (
                    <option value={savedHref}>{savedHref}</option>
                  ) : null}
                  {linkPages.map((page) => (
                    <option key={page.slug || "/"} value={`/${page.slug}`}>
                      {pageTitle(page)}
                    </option>
                  ))}
                </select>
              </AdminField>
            </>
          ) : null}
        </>
      ) : null}
      {structure &&
      fields.button &&
      block.type !== "statement" &&
      block.type !== "imageText" &&
      block.type !== "contactCards" &&
      block.type !== "contactUs" ? (
        <>
          <AdminField label="Knapp" issue={buttonIssue}>
            <input
              value={block.buttonLabel ?? ""}
              onChange={(event) => onChange({ buttonLabel: event.target.value })}
            />
          </AdminField>
          <AdminField label="Länk" issue={hrefIssue}>
            {pageLinkSelect ? (
              <select
                value={savedHref}
                onChange={(event) => onChange({ buttonHref: event.target.value })}
              >
                <option value="">Ingen sida</option>
                {savedHref && !savedHrefListed ? <option value={savedHref}>{savedHref}</option> : null}
                {linkPages.map((page) => (
                  <option key={page.slug || "/"} value={`/${page.slug}`}>
                    {pageTitle(page)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={block.buttonHref ?? ""}
                onChange={(event) => onChange({ buttonHref: event.target.value })}
              />
            )}
          </AdminField>
        </>
      ) : null}
      {structure && (fields.imageSide || fields.align) ? (
        <div className="admin-field-row">
          {fields.imageSide ? (
            <label>
              Bildsida
              <select
                value={block.imageSide ?? "left"}
                onChange={(event) =>
                  onChange({ imageSide: event.target.value as CmsBlock["imageSide"] })
                }
              >
                <option value="left">Vänster</option>
                <option value="right">Höger</option>
              </select>
            </label>
          ) : null}
          {fields.align ? (
            <label>
              Justering
              <select
                value={block.align ?? "left"}
                onChange={(event) => onChange({ align: event.target.value as CmsBlock["align"] })}
              >
                <option value="left">Vänster</option>
                <option value="center">Centrerad</option>
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      {content && fields.image ? (
        <ImageField
          src={block.image}
          emptyLabel="Ingen bild vald."
          chooseLabel={block.image ? "Byt bild" : "Välj bild"}
          issue={imageIssue}
          onChoose={(src) => onImage(src, "image")}
          onClear={() => onChange({ image: undefined })}
        />
      ) : null}
      {content && fields.image2 ? (
        <ImageField
          src={block.image2}
          emptyLabel="Ingen andra bild vald."
          chooseLabel={block.image2 ? "Byt andra bilden" : "Välj andra bilden"}
          issue={image2Issue}
          onChoose={(src) => onImage(src, "image2")}
          onClear={() => onChange({ image2: undefined })}
        />
      ) : null}
    </>
  );
}

function pageAddress(slug: string) {
  return slug ? `${SITE_HOST}/${slug}` : SITE_HOST;
}

function addressMatches(input: string, address: string) {
  const value = input.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return value === address;
}

function formatDeletedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function DeletePageDialog({
  title,
  address,
  childCount,
  value,
  onChange,
  onCancel,
  onConfirm,
  mode = "page",
}: {
  title: string;
  address: string;
  childCount: number;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  mode?: "page" | "template" | "news";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = addressMatches(value, address);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-page-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches) onConfirm();
        }}
      >
        <h2 id="delete-page-title">Ta bort {title}?</h2>
        <p>
          Skriv <strong>{address}</strong> för att bekräfta.{" "}
          {mode === "news" ? (
            "Nyheten tas bort från sidan."
          ) : (
            <>
              {mode === "template"
                ? "Mallen tas bort från listan. Sidor som redan finns påverkas inte."
                : childCount > 0
                  ? `Sidan och ${childCount} ${childCount === 1 ? "undersida" : "undersidor"} tas bort från webbplatsen.`
                  : "Sidan tas bort från webbplatsen."}{" "}
              Kopian sparas i arkivet.
            </>
          )}
        </p>
        <label>
          {mode === "news" ? "Rubrik" : mode === "template" ? "Mallnamn" : "Adress"}
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={address}
          />
        </label>
        <div className="admin-modal-actions">
          <button type="button" className="admin-quiet" onClick={onCancel}>
            Avbryt
          </button>
          <button type="submit" className="admin-danger-button" disabled={!matches}>
            {mode === "news" ? "Ta bort nyhet" : mode === "template" ? "Ta bort mall" : "Ta bort sida"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MenuPreview({ items }: { items: CmsLink[] }) {
  const links = items
    .map((item) => ({
      label: item.label.trim(),
      href: item.href.trim() || "#",
      children: (item.children ?? [])
        .map((child) => ({ label: child.label.trim(), href: child.href.trim() || "#" }))
        .filter((child) => child.label),
    }))
    .filter((item) => item.label);

  return (
    <div className="admin-menu-preview">
      <Header variant="bar" items={items} />
      <div className="menu-layer is-open is-preview">
        <nav className="menu-panel" aria-label="Huvudmeny">
          <span className="menu-close" aria-hidden="true">
            <span />
            <span />
          </span>
          <ul>
            {links.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                {item.children.length > 0 ? (
                  <span className="menu-parent" aria-expanded="true">
                    {item.label}
                    <svg className="menu-parent-arrow" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
                      <path
                        d="M3.5 6.5 9 12l5.5-5.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : (
                  <a href={item.href}>{item.label}</a>
                )}
                {item.children.length > 0 ? (
                  <ul>
                    {item.children.map((child, childIndex) => (
                      <li key={`${child.label}-${childIndex}`}>
                        <a href={child.href}>{child.label}</a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <SiteFooter />
    </div>
  );
}

function PageMiniature({
  page,
  menu,
  url,
  summary,
  children,
  publishedAt = "",
  articleItems = [],
}: {
  page?: CmsPage;
  menu?: CmsLink[];
  url: string;
  summary?: string;
  children?: ReactNode;
  publishedAt?: string;
  articleItems?: CmsCard[];
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const count = page?.blocks.length ?? 0;
  const previousCount = useRef(count);
  const [scale, setScale] = useState(0.32);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.clientWidth;
      if (width <= 1) return;
      const next = (width - 1) / PREVIEW_WIDTH;
      setScale((current) => (Math.abs(current - next) < 0.002 ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const added = count - previousCount.current;
    previousCount.current = count;
    if (added !== 1) return;
    frame.scrollTo({ top: frame.scrollHeight, behavior: "smooth" });
  }, [count]);

  const listsNews =
    page?.role === "news" &&
    !page.blocks.some(
      (block) =>
        block.type === "articleList" || block.type === "news" || block.type === "newsTwelve",
    );
  const hasNewsFeed = Boolean(listsNews && articleItems.length > 0);
  const label =
    summary ??
    (count === 0 && !hasNewsFeed
      ? "Footer"
      : count === 0
        ? "Nyheter och footer"
        : `${count} komponent${count === 1 ? "" : "er"} och footer`);
  const showHint = Boolean(page) && count === 0 && !hasNewsFeed;

  return (
    <aside className="admin-miniature" aria-label="Förhandsvisning av sidan">
      <div className="admin-miniature-label">
        <p className="admin-kicker">Förhandsvisning</p>
        <span>{label}</span>
      </div>
      <div className="admin-miniature-window">
        <div className="admin-miniature-chrome">
          <i />
          <i />
          <i />
          {url ? <em>{url}</em> : null}
        </div>
        <div
          className={showHint ? "admin-miniature-frame is-empty" : "admin-miniature-frame"}
          ref={frameRef}
        >
          <div
            className="admin-miniature-page"
            inert
            aria-hidden="true"
            style={{ width: PREVIEW_WIDTH, zoom: scale }}
          >
            {children ??
              (page ? (
                <PageBlocks
                  page={page}
                  menu={menu}
                  preview
                  publishedAt={publishedAt}
                  articleItems={articleItems}
                />
              ) : null)}
          </div>
          {showHint ? (
            <p className="admin-miniature-hint">
              Lägg till en komponent så byggs sidan upp här.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function FormattedText({
  label,
  rows,
  value,
  issue,
  lines = false,
  onChange,
}: {
  label: string;
  rows: number;
  value: string;
  issue?: CompletenessIssue;
  lines?: boolean;
  onChange: (value: string) => void;
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const errorId = issue ? `${issue.id}-error` : undefined;
  const format = lines ? inspectFormat(value, selection.start, selection.end) : null;

  function rememberSelection() {
    const field = fieldRef.current;
    if (!field) return;
    const next = { start: field.selectionStart, end: field.selectionEnd };
    selectionRef.current = next;
    setSelection(next);
  }

  function keepFieldSelection(event: { preventDefault: () => void }) {
    rememberSelection();
    event.preventDefault();
  }

  function pickedSelection() {
    const field = fieldRef.current;
    if (field && document.activeElement === field) {
      return { start: field.selectionStart, end: field.selectionEnd };
    }
    return selectionRef.current;
  }

  function replace(next: { value: string; start: number; end: number }) {
    const range = { start: next.start, end: next.end };
    selectionRef.current = range;
    setSelection(range);
    onChange(next.value);
    requestAnimationFrame(() => {
      const field = fieldRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(next.start, next.end);
    });
  }

  function formatInline(kind: "bold" | "italic" | "underline" | "link") {
    const picked = pickedSelection();
    const url = kind === "link" ? window.prompt("Klistra in länken", "https://") ?? "" : "";
    if (kind === "link" && !url.trim()) return;
    const next = applyInline(value, picked.start, picked.end, kind, url);
    if (!next) {
      window.alert("Länken behöver börja med https://, http://, /, #, mailto: eller tel:.");
      return;
    }
    replace(next);
  }

  function formatLine(kind: LineFormat) {
    const picked = pickedSelection();
    replace(applyLineFormat(value, picked.start, picked.end, kind));
  }

  function formatStyle(style: TextStyle) {
    const picked = selectionRef.current;
    replace(applyTextStyle(value, picked.start, picked.end, style));
  }

  function clearSelected() {
    const picked = pickedSelection();
    replace(clearFormatting(value, picked.start, picked.end));
  }

  return (
    <div id={issue?.id} className={issue ? "admin-format is-invalid" : "admin-format"}>
      <span>{label}</span>
      {lines && format ? (
        <div className="admin-format-bar">
          <select
            aria-label="Textstil"
            value={format.style}
            onPointerDown={rememberSelection}
            onChange={(event) => formatStyle(event.target.value as TextStyle)}
          >
            <option value="normal">Normal</option>
            <option value="heading">Rubrik</option>
          </select>
          <span className="admin-format-rule" aria-hidden="true" />
          <button
            type="button"
            aria-label="Fetstil"
            title="Fetstil"
            aria-pressed={format.bold}
            onMouseDown={keepFieldSelection}
            onClick={() => formatInline("bold")}
          >
            B
          </button>
          <button
            type="button"
            className="admin-format-italic"
            aria-label="Kursiv"
            title="Kursiv"
            aria-pressed={format.italic}
            onMouseDown={keepFieldSelection}
            onClick={() => formatInline("italic")}
          >
            I
          </button>
          <button
            type="button"
            className="admin-format-underline"
            aria-label="Understrykning"
            title="Understrykning"
            aria-pressed={format.underline}
            onMouseDown={keepFieldSelection}
            onClick={() => formatInline("underline")}
          >
            U
          </button>
          <button
            type="button"
            aria-label="Punktlista"
            title="Punktlista"
            aria-pressed={format.bullet}
            onMouseDown={keepFieldSelection}
            onClick={() => formatLine("bullet")}
          >
            <BulletListIcon />
          </button>
          <button
            type="button"
            aria-label="Numrerad lista"
            title="Numrerad lista"
            aria-pressed={format.number}
            onMouseDown={keepFieldSelection}
            onClick={() => formatLine("number")}
          >
            <NumberListIcon />
          </button>
          <button
            type="button"
            aria-label="Hyperlänk"
            title="Hyperlänk"
            onMouseDown={keepFieldSelection}
            onClick={() => formatInline("link")}
          >
            <LinkIcon />
          </button>
          <button
            type="button"
            aria-label="Ta bort formatering"
            title="Ta bort formatering"
            onMouseDown={keepFieldSelection}
            onClick={clearSelected}
          >
            <span className="admin-format-clear" aria-hidden="true">
              T<sub>x</sub>
            </span>
          </button>
        </div>
      ) : (
        <div className="admin-format-tools">
          <button type="button" onMouseDown={rememberSelection} onClick={() => formatInline("bold")}>
            Fetstil
          </button>
          <button type="button" onMouseDown={rememberSelection} onClick={() => formatInline("link")}>
            Länk
          </button>
        </div>
      )}
      <textarea
        ref={fieldRef}
        rows={rows}
        value={value}
        aria-invalid={issue ? true : undefined}
        aria-describedby={errorId}
        onSelect={rememberSelection}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onChange={(event) => onChange(event.target.value)}
      />
      {issue ? (
        <span className="admin-field-error" id={errorId}>
          {issue.fieldMessage}
        </span>
      ) : null}
    </div>
  );
}

function BulletListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="3.5" cy="5" r="1.15" fill="currentColor" />
      <circle cx="3.5" cy="9" r="1.15" fill="currentColor" />
      <circle cx="3.5" cy="13" r="1.15" fill="currentColor" />
      <path d="M7 5h8M7 9h8M7 13h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function NumberListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M7 4.5h8M7 9h8M7 13.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <text x="1" y="6.3" fill="currentColor" fontSize="6.5" fontFamily="sans-serif">
        1
      </text>
      <text x="1" y="10.8" fill="currentColor" fontSize="6.5" fontFamily="sans-serif">
        2
      </text>
      <text x="1" y="15.3" fill="currentColor" fontSize="6.5" fontFamily="sans-serif">
        3
      </text>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuotePlacement({
  body,
  value,
  onChange,
}: {
  body: string;
  value: number | undefined;
  onChange: (quoteAfter: number) => void;
}) {
  const count = articleParagraphs(body).length;
  if (count === 0) return null;

  const selected = quotePlacementValue(quoteAfterIndex(value, count));
  const options = [
    { value: "before", label: "Före texten" },
    ...Array.from({ length: count }, (_, index) => ({
      value: String(index + 1),
      label: index === count - 1 ? "Efter texten" : `Efter stycke ${index + 1}`,
    })),
  ];

  return (
    <label>
      Placering
      <select
        value={selected}
        onChange={(event) => onChange(parseQuotePlacement(event.target.value))}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextColumnSections({
  blockId,
  items,
  issues = [],
  onChange,
  mode = "full",
}: {
  blockId: string;
  items: CmsCard[];
  issues?: CompletenessIssue[];
  onChange: (items: CmsCard[]) => void;
  mode?: EditorMode;
}) {
  const content = showsContent(mode);
  const structure = showsStructure(mode);

  function patch(id: string, next: Partial<CmsCard>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  return (
    <fieldset className="admin-cards">
      <legend>Avsnitt</legend>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="admin-block-head">
              <strong>{item.heading.trim() || `Avsnitt ${index + 1}`}</strong>
              {structure ? (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((row) => row.id !== item.id))}
                >
                  Ta bort
                </button>
              ) : null}
            </div>
            {content ? (
              <>
                <AdminField
                  label="Rubrik"
                  issue={findCompletenessIssue(issues, "heading", blockId, item.id)}
                >
                  <input
                    value={item.heading}
                    onChange={(event) => patch(item.id, { heading: event.target.value })}
                  />
                </AdminField>
                <FormattedText
                  label="Text"
                  rows={6}
                  value={item.body}
                  issue={findCompletenessIssue(issues, "body", blockId, item.id)}
                  lines
                  onChange={(body) => patch(item.id, { body })}
                />
              </>
            ) : null}
          </li>
        ))}
      </ol>
      {structure ? (
        <button type="button" onClick={() => onChange([...items, createTextColumnSection()])}>
          Lägg till avsnitt
        </button>
      ) : null}
    </fieldset>
  );
}

function ExpertiseCards({
  blockId,
  items,
  pages,
  issues = [],
  onChange,
  mode = "full",
}: {
  blockId: string;
  items: CmsCard[];
  pages: CmsPage[];
  issues?: CompletenessIssue[];
  onChange: (items: CmsCard[]) => void;
  mode?: EditorMode;
}) {
  const content = showsContent(mode);
  const structure = showsStructure(mode);

  function patch(id: string, next: Partial<CmsCard>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  return (
    <fieldset className="admin-cards">
      <legend>Kort</legend>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="admin-block-head">
              <strong>{item.heading.trim() || `Kort ${index + 1}`}</strong>
              {structure ? (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((row) => row.id !== item.id))}
                >
                  Ta bort
                </button>
              ) : null}
            </div>
            {content ? (
              <>
                <AdminField
                  label="Rubrik"
                  issue={findCompletenessIssue(issues, "heading", blockId, item.id)}
                >
                  <input
                    value={item.heading}
                    onChange={(event) => patch(item.id, { heading: event.target.value })}
                  />
                </AdminField>
                <AdminField
                  label="Text"
                  issue={findCompletenessIssue(issues, "body", blockId, item.id)}
                >
                  <textarea
                    rows={4}
                    value={item.body}
                    onChange={(event) => patch(item.id, { body: event.target.value })}
                  />
                </AdminField>
              </>
            ) : null}
            {structure ? (
              <AdminField
                label="Undersida"
                issue={findCompletenessIssue(issues, "href", blockId, item.id)}
              >
                <select
                  value={item.href}
                  onChange={(event) => patch(item.id, { href: event.target.value })}
                >
                  <option value="">Ingen sida</option>
                  {pages.map((page) => (
                    <option key={page.slug || "/"} value={`/${page.slug}`}>
                      {page.title}
                    </option>
                  ))}
                </select>
              </AdminField>
            ) : null}
          </li>
        ))}
      </ol>
      {structure ? (
        <button type="button" onClick={() => onChange([...items, createCard()])}>
          Lägg till kort
        </button>
      ) : null}
    </fieldset>
  );
}

function PageChoice({
  value,
  pages,
  pageHrefs,
  onChange,
}: {
  value: string;
  pages: CmsPage[];
  pageHrefs: Set<string>;
  onChange: (href: string) => void;
}) {
  return (
    <AdminField label="Länk">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Välj sida</option>
        {value && !pageHrefs.has(value) ? <option value={value}>{value}</option> : null}
        {pages.map((page) => (
          <option key={page.slug || "/"} value={`/${page.slug}`}>
            {page.parentSlug ? `– ${pageTitle(page)}` : pageTitle(page)}
          </option>
        ))}
      </select>
    </AdminField>
  );
}

function MenuRows({
  items,
  pages,
  onChange,
}: {
  items: CmsLink[];
  pages: CmsPage[];
  onChange: (items: CmsLink[]) => void;
}) {
  function patch(index: number, next: Partial<CmsLink>) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)));
  }

  function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return list;
    const next = [...list];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    return next;
  }

  const pageHrefs = new Set(pages.map((page) => `/${page.slug}`));

  return (
    <fieldset className="admin-cards">
      <legend>Meny</legend>
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            <div className="admin-block-head">
              <strong>Rad {index + 1}</strong>
              <div>
                <button
                  type="button"
                  onClick={() => onChange(move(items, index, -1))}
                  disabled={index === 0}
                >
                  Upp
                </button>
                <button
                  type="button"
                  onClick={() => onChange(move(items, index, 1))}
                  disabled={index === items.length - 1}
                >
                  Ner
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Ta bort
                </button>
              </div>
            </div>
            <AdminField label="Rubrik">
              <input
                value={item.label}
                onChange={(event) => patch(index, { label: event.target.value })}
              />
            </AdminField>
            <PageChoice
              value={item.href}
              pages={pages}
              pageHrefs={pageHrefs}
              onChange={(href) => patch(index, { href })}
            />
            <fieldset className="admin-cards admin-submenu">
              <legend>Undermeny</legend>
              <ol>
                {(item.children ?? []).map((child, childIndex) => (
                  <li key={childIndex}>
                    <div className="admin-block-head">
                      <strong>Underrad {childIndex + 1}</strong>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            patch(index, {
                              children: move(item.children ?? [], childIndex, -1),
                            })
                          }
                          disabled={childIndex === 0}
                        >
                          Upp
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patch(index, {
                              children: move(item.children ?? [], childIndex, 1),
                            })
                          }
                          disabled={childIndex === (item.children ?? []).length - 1}
                        >
                          Ner
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patch(index, {
                              children: (item.children ?? []).filter((_, row) => row !== childIndex),
                            })
                          }
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                    <AdminField label="Rubrik">
                      <input
                        value={child.label}
                        onChange={(event) =>
                          patch(index, {
                            children: (item.children ?? []).map((row, rowIndex) =>
                              rowIndex === childIndex ? { ...row, label: event.target.value } : row,
                            ),
                          })
                        }
                      />
                    </AdminField>
                    <PageChoice
                      value={child.href}
                      pages={pages}
                      pageHrefs={pageHrefs}
                      onChange={(href) =>
                        patch(index, {
                          children: (item.children ?? []).map((row, rowIndex) =>
                            rowIndex === childIndex ? { ...row, href } : row,
                          ),
                        })
                      }
                    />
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => patch(index, { children: [...(item.children ?? []), { label: "", href: "" }] })}
              >
                Lägg till underrad
              </button>
            </fieldset>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onChange([...items, { label: "", href: "" }])}>
        Lägg till rad
      </button>
    </fieldset>
  );
}

function ContactCards({
  items,
  onChange,
  mode = "full",
}: {
  items: CmsCard[];
  onChange: (items: CmsCard[]) => void;
  mode?: EditorMode;
}) {
  const content = showsContent(mode);
  const structure = showsStructure(mode);

  function patch(id: string, next: Partial<CmsCard>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  return (
    <fieldset className="admin-cards">
      <legend>Kort</legend>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="admin-block-head">
              <strong>{item.contactName?.trim() || `Kort ${index + 1}`}</strong>
              {structure ? (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((row) => row.id !== item.id))}
                >
                  Ta bort
                </button>
              ) : null}
            </div>
            {content ? (
              <>
                <ImageField
                  src={item.image}
                  emptyLabel="Ingen bild vald."
                  chooseLabel={item.image ? "Byt bild" : "Välj bild"}
                  onChoose={(src) => patch(item.id, { image: src })}
                  onClear={() => patch(item.id, { image: "" })}
                />
                <AdminField label="Namn">
                  <input
                    value={item.contactName ?? ""}
                    onChange={(event) => patch(item.id, { contactName: event.target.value })}
                  />
                </AdminField>
                <AdminField label="Titel">
                  <input
                    value={item.contactTitle ?? ""}
                    onChange={(event) => patch(item.id, { contactTitle: event.target.value })}
                  />
                </AdminField>
                <AdminField label="Mailadress">
                  <input
                    type="email"
                    value={item.contactEmail ?? ""}
                    onChange={(event) => patch(item.id, { contactEmail: event.target.value })}
                  />
                </AdminField>
                <AdminField label="Telefonnummer">
                  <input
                    type="tel"
                    value={item.contactPhone ?? ""}
                    onChange={(event) => patch(item.id, { contactPhone: event.target.value })}
                  />
                </AdminField>
                <AdminField label="LinkedIn">
                  <input
                    value={item.contactLinkedIn ?? ""}
                    onChange={(event) => patch(item.id, { contactLinkedIn: event.target.value })}
                  />
                </AdminField>
              </>
            ) : null}
          </li>
        ))}
      </ol>
      {structure ? (
        <button type="button" onClick={() => onChange([...items, createContactCard()])}>
          Lägg till kort
        </button>
      ) : null}
    </fieldset>
  );
}

function NewsCards({ pages }: { pages: CmsPage[] }) {
  const items = articleNewsCards(pages);

  return (
    <fieldset className="admin-cards">
      <legend>Nyheter</legend>
      <p className="admin-empty">Nyheterna fylls i under Lägg till nyhet.</p>
      {items.length === 0 ? (
        <p className="admin-empty">Inga nyheter ännu.</p>
      ) : (
        <ol>
          {items.map((item, index) => {
            const slug = item.href.replace(/^\/+/, "");
            const title = pages.find((page) => page.slug === slug)?.title.trim() || item.heading;
            const date = item.publishedAt ? formatNewsDate(item.publishedAt) : "";
            return (
              <li key={item.id} className="admin-news-card">
                <div className="admin-block-head">
                  <strong>Nyhet {index + 1}</strong>
                  {item.published === false ? <span className="admin-news-draft">Utkast</span> : null}
                </div>
                {item.image ? <img src={item.image} alt="" /> : null}
                {date ? <p>{date}</p> : null}
                <p>{title}</p>
              </li>
            );
          })}
        </ol>
      )}
    </fieldset>
  );
}

function OfferingRows({
  blockId,
  items,
  pages,
  issues = [],
  onChange,
  mode = "full",
}: {
  blockId: string;
  items: CmsCard[];
  pages: CmsPage[];
  issues?: CompletenessIssue[];
  onChange: (items: CmsCard[]) => void;
  mode?: EditorMode;
}) {
  const content = showsContent(mode);
  const structure = showsStructure(mode);

  function patch(id: string, next: Partial<CmsCard>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  return (
    <fieldset className="admin-cards">
      <legend>Rader</legend>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <div className="admin-block-head">
              <strong>{item.heading.trim() || `Rad ${index + 1}`}</strong>
              {structure ? (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((row) => row.id !== item.id))}
                >
                  Ta bort
                </button>
              ) : null}
            </div>
            {content ? (
              <>
                <AdminField
                  label="Rubrik"
                  issue={findCompletenessIssue(issues, "heading", blockId, item.id)}
                >
                  <input
                    value={item.heading}
                    onChange={(event) => patch(item.id, { heading: event.target.value })}
                  />
                </AdminField>
                <AdminField
                  label="Text"
                  issue={findCompletenessIssue(issues, "body", blockId, item.id)}
                >
                  <textarea
                    rows={4}
                    value={item.body}
                    onChange={(event) => patch(item.id, { body: event.target.value })}
                  />
                </AdminField>
              </>
            ) : null}
            {structure ? (
              <>
                <AdminField
                  label="Knapp"
                  issue={findCompletenessIssue(issues, "buttonLabel", blockId, item.id)}
                >
                  <input
                    value={item.buttonLabel ?? ""}
                    onChange={(event) => patch(item.id, { buttonLabel: event.target.value })}
                  />
                </AdminField>
                <AdminField
                  label="Undersida"
                  issue={findCompletenessIssue(issues, "href", blockId, item.id)}
                >
                  <select
                    value={item.href}
                    onChange={(event) => patch(item.id, { href: event.target.value })}
                  >
                    <option value="">Ingen sida</option>
                    {pages.map((page) => (
                      <option key={page.slug || "/"} value={`/${page.slug}`}>
                        {page.title}
                      </option>
                    ))}
                  </select>
                </AdminField>
              </>
            ) : null}
          </li>
        ))}
      </ol>
      {structure ? (
        <button type="button" onClick={() => onChange([...items, createOfferingRow("Ny rad")])}>
          Lägg till rad
        </button>
      ) : null}
    </fieldset>
  );
}

function BlockCatalog({ onAdd }: { onAdd: (type: BlockType) => void }) {
  return (
    <section className="admin-library" aria-label="Komponentbibliotek">
      <ul>
        {library.map((item) => (
          <li key={item.type}>
            <button type="button" onClick={() => onAdd(item.type)}>
              <span className={`admin-thumb admin-thumb-${item.type}`} aria-hidden="true" />
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ColorSwatch({
  value,
  onChange,
  options,
}: {
  value: BlockTheme;
  onChange: (theme: BlockTheme) => void;
  options: { id: BlockTheme; label: string; color: string }[];
}) {
  return (
    <fieldset className="admin-swatches">
      <legend>Bakgrund</legend>
      <div>
        {options.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={value === theme.id ? "is-active" : undefined}
            style={{ background: theme.color }}
            aria-pressed={value === theme.id}
            aria-label={theme.label}
            title={theme.label}
            onClick={() => onChange(theme.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function ImageField({
  src,
  emptyLabel,
  chooseLabel,
  issue,
  onChoose,
  onClear,
}: {
  src?: string;
  emptyLabel: string;
  chooseLabel: string;
  issue?: CompletenessIssue;
  onChoose: (src: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/library-images", { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !data?.url) {
        setError(data?.error ?? "Kunde inte ladda upp bilden.");
        return;
      }
      const next = await loadLibraryImages();
      setImages(next.includes(data.url) ? next : [data.url, ...next]);
      onChoose(data.url);
      setOpen(false);
    } catch {
      setError("Kunde inte ladda upp bilden.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadLibraryImages()
      .then((next) => {
        if (!cancelled) {
          setImages(next);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Kunde inte läsa bilderna.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      id={issue?.id}
      className={issue ? "admin-image is-invalid" : "admin-image"}
      ref={rootRef}
    >
      {src ? <img src={src} alt="" /> : <p>{emptyLabel}</p>}
      <div>
        <button
          type="button"
          className="admin-file"
          aria-expanded={open}
          aria-invalid={issue ? true : undefined}
          aria-describedby={issue ? `${issue.id}-error` : undefined}
          onClick={() => setOpen((current) => !current)}
        >
          {chooseLabel}
        </button>
        {src ? (
          <button type="button" onClick={onClear}>
            Ta bort bild
          </button>
        ) : null}
      </div>
      {issue ? (
        <span className="admin-field-error" id={`${issue.id}-error`}>
          {issue.fieldMessage}
        </span>
      ) : null}
      {open ? (
        <div className="admin-image-picker">
          <p>Uppladdade bilder</p>
          <label className="admin-upload">
            {uploading ? "Laddar upp…" : "Ladda upp bild"}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadImage(file);
              }}
            />
          </label>
          {error ? <p>{error}</p> : null}
          {images === null && !error ? <p>Hämtar bilder…</p> : null}
          {images?.length === 0 ? <p>Inga bilder att välja.</p> : null}
          {images && images.length > 0 ? (
            <ul>
              {images.map((image) => {
                const name = image.split("/").pop() ?? image;
                return (
                  <li key={image}>
                    <button
                      type="button"
                      className={src === image ? "is-selected" : undefined}
                      aria-pressed={src === image}
                      aria-label={name}
                      title={name}
                      onClick={() => {
                        onChoose(image);
                        setOpen(false);
                      }}
                    >
                      <img src={image} alt="" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DeleteBlobDialog({
  url,
  uses,
  deleting,
  onCancel,
  onConfirm,
}: {
  url: string;
  uses: PublishedImageUse[];
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const blocked = uses.length > 0;

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onCancel();
      }}
    >
      <div className="admin-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-blob-title">
        <h2 id="delete-blob-title">{blocked ? "Bilden kan inte tas bort" : "Ta bort bilden?"}</h2>
        {blocked ? (
          <>
            <p>
              <strong>{blobFileName(url)}</strong> visas på {uses.length === 1 ? "en publicerad sida" : "publicerade sidor"}. Byt
              ut eller ta bort bilden där först, så att {uses.length === 1 ? "sidan" : "sidorna"} inte går sönder.
            </p>
            <ul className="admin-modal-uses">
              {uses.map((page) => (
                <li key={page.slug || "/"}>
                  <strong>{page.title}</strong>
                  <small>
                    {pageAddress(page.slug)}
                  </small>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            <strong>{blobFileName(url)}</strong> tas bort från Vercel Blob. Kopior i utkast, mallar och arkiv
            försvinner också.
          </p>
        )}
        <img className="admin-blob-confirm" src={url} alt="" />
        <div className="admin-modal-actions">
          <button type="button" className="admin-quiet" disabled={deleting} onClick={onCancel}>
            {blocked ? "Stäng" : "Avbryt"}
          </button>
          {blocked ? null : (
            <button type="button" className="admin-danger-button" disabled={deleting} onClick={onConfirm}>
              {deleting ? "Tar bort…" : "Ta bort bild"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function blobFileName(url: string) {
  const name = decodeURIComponent(url.split("/").pop() ?? url);
  return name.replace(/-[A-Za-z0-9]{8,}(?=\.[^.]+$)/, "");
}

function BlobLibrary({ pages, onRemoved }: { pages: CmsPage[]; onRemoved: (url: string) => void }) {
  const [images, setImages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadImages() {
    const response = await fetch("/api/library-images", { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as { images?: string[]; error?: string } | null;
    if (!response.ok) throw new Error(data?.error ?? "Kunde inte läsa bilderna.");
    return data?.images ?? [];
  }

  useEffect(() => {
    let cancelled = false;
    loadImages()
      .then((next) => {
        if (!cancelled) {
          setImages(next);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setImages([]);
          setError(reason instanceof Error ? reason.message : "Kunde inte läsa bilderna.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingUrl) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) setPendingUrl(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingUrl, deleting]);

  async function uploadImages(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    const failed: string[] = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgress(`Laddar upp ${index + 1} av ${files.length}…`);
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/library-images", { method: "POST", body: form });
        const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!response.ok || !data?.url) failed.push(file.name);
      }
      setImages(await loadImages());
      if (failed.length > 0) {
        setError(`Kunde inte ladda upp ${failed.join(", ")}.`);
      }
    } catch {
      setError("Kunde inte ladda upp bilderna.");
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!pendingUrl) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/library-images", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: pendingUrl }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        warning?: string;
        pages?: { title?: string }[];
      } | null;
      if (!response.ok) {
        const titles = (data?.pages ?? [])
          .map((page) => page.title?.trim())
          .filter((title): title is string => Boolean(title));
        setError(
          titles.length > 0
            ? `${data?.error ?? "Bilden används på publicerade sidor."} ${titles.join(", ")}.`
            : (data?.error ?? "Kunde inte ta bort bilden."),
        );
        return;
      }
      onRemoved(pendingUrl);
      setImages((current) => current?.filter((image) => image !== pendingUrl) ?? []);
      setPendingUrl(null);
      if (data?.warning) setError(data.warning);
    } catch {
      setError("Kunde inte ta bort bilden.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="admin-blob" aria-label="Uppladdade bilder">
      <p>
        Uppladdade bilder sparas i Vercel Blob och är gemensamma för alla som redigerar. En bild som
        visas på en publicerad sida går inte att ta bort. Övriga kopior i utkast, mallar och arkiv
        försvinner tillsammans med bilden.
      </p>
      <div className="admin-blob-toolbar">
        <label className="admin-upload">
          {progress ?? "Ladda upp bilder"}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
            multiple
            disabled={uploading || deleting}
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              if (files.length > 0) void uploadImages(files);
            }}
          />
        </label>
      </div>
      {error ? <p className="admin-blob-error">{error}</p> : null}
      {images === null ? <p>Hämtar bilder…</p> : null}
      {images?.length === 0 ? <p className="admin-empty">Inga uppladdade bilder ännu.</p> : null}
      {images && images.length > 0 ? (
        <ul className="admin-blob-grid">
          {images.map((image) => {
            const name = blobFileName(image);
            return (
              <li key={image} className="admin-blob-card">
                <img src={image} alt="" />
                <span title={name}>{name}</span>
                <button type="button" onClick={() => setPendingUrl(image)}>
                  Ta bort
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {pendingUrl ? (
        <DeleteBlobDialog
          url={pendingUrl}
          uses={publishedImageUses(pages, pendingUrl)}
          deleting={deleting}
          onCancel={() => setPendingUrl(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </section>
  );
}

function MindstreetMark() {
  return (
    <span className="admin-mark" role="img" aria-label="Mindstreet">
      <img src="/icons/logo-footer.svg" alt="" />
    </span>
  );
}

function RailIcon({ name }: { name: Panel | "logout" }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "pages") {
    return (
      <svg {...props}>
        <path d="M8 6.5h9.5A1.5 1.5 0 0 1 19 8v11.5A1.5 1.5 0 0 1 17.5 21h-9A1.5 1.5 0 0 1 7 19.5V8A1.5 1.5 0 0 1 8.5 6.5H8Z" />
        <path d="M7 17.5H5.5A1.5 1.5 0 0 1 4 16V4.5A1.5 1.5 0 0 1 5.5 3H15" />
      </svg>
    );
  }

  if (name === "create") {
    return (
      <svg {...props}>
        <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14A1.5 1.5 0 0 0 7.5 20.5h9A1.5 1.5 0 0 0 18 19V8.5L14 3.5Z" />
        <path d="M14 3.5V8h4.2" />
        <path d="M12 11.5v5" />
        <path d="M9.5 14h5" />
      </svg>
    );
  }

  if (name === "news") {
    return (
      <svg {...props}>
        <path d="M5 6.5h11.5A1.5 1.5 0 0 1 18 8v11H6.5A1.5 1.5 0 0 1 5 17.5v-11Z" />
        <path d="M5 8H4.2A1.2 1.2 0 0 0 3 9.2v8.3A2.5 2.5 0 0 0 5.5 20H18" />
        <path d="M8 10.5h7" />
        <path d="M8 13.5h5" />
        <path d="M8 16.5h6" />
      </svg>
    );
  }

  if (name === "components") {
    return (
      <svg {...props}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
      </svg>
    );
  }

  if (name === "images") {
    return (
      <svg {...props}>
        <rect x="3.5" y="5" width="17" height="14" rx="1.6" />
        <path d="M3.5 15.5 8.2 11l3.2 3.1 2.3-2.2 5.3 4.6" />
        <circle cx="15.5" cy="9" r="1.2" />
      </svg>
    );
  }

  if (name === "archive") {
    return (
      <svg {...props}>
        <path d="M4.5 7h15" />
        <path d="M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7" />
        <path d="M6.2 7l.7 11.2A1.5 1.5 0 0 0 8.4 19.5h7.2a1.5 1.5 0 0 0 1.5-1.3L17.8 7" />
        <path d="M10 11v4.5" />
        <path d="M14 11v4.5" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10" />
      <path d="M10 12h9" />
      <path d="M16 8.5 19.5 12 16 15.5" />
    </svg>
  );
}
