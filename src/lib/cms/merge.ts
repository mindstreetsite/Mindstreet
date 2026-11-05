import { resolvedMenu } from "@/lib/cms/library";
import {
  hydrateArchiveEntry,
  hydrateCmsLinks,
  hydratePage,
  hydrateTemplate,
  hydrateTemplateArchiveEntry,
  pageTitle,
  templatesNotMatchingPages,
  type CmsState,
  type CmsTemplate,
  type PageArchiveEntry,
  type TemplateArchiveEntry,
} from "@/lib/cms/storage";
import type { CmsLink, CmsPage } from "@/lib/cms/types";

export type ItemChange<T> = {
  id: string;
  next: T | null;
  base: T | null;
};

export type CmsChange = {
  pages: ItemChange<CmsPage>[];
  archive: ItemChange<PageArchiveEntry>[];
  templates: ItemChange<CmsTemplate>[];
  templateArchive: ItemChange<TemplateArchiveEntry>[];
  menu?: { next: CmsLink[]; base: CmsLink[] | null };
};

export type CmsConflicts = {
  pages: string[];
  archive: string[];
  templates: string[];
  templateArchive: string[];
  menu: boolean;
};

export type ApplyChangeResult = {
  state: CmsState;
  conflicts: CmsConflicts;
  applied: boolean;
};

export type AbsorbRemoteResult = {
  state: CmsState;
  confirmed: CmsState;
  conflicts: CmsConflicts;
  advanceEtag: boolean;
};

export function emptyChange(): CmsChange {
  return {
    pages: [],
    archive: [],
    templates: [],
    templateArchive: [],
  };
}

export function emptyConflicts(): CmsConflicts {
  return {
    pages: [],
    archive: [],
    templates: [],
    templateArchive: [],
    menu: false,
  };
}

export function isChangeEmpty(change: CmsChange): boolean {
  return (
    change.pages.length === 0 &&
    change.archive.length === 0 &&
    change.templates.length === 0 &&
    change.templateArchive.length === 0 &&
    change.menu === undefined
  );
}

export function hasConflicts(conflicts: CmsConflicts): boolean {
  return (
    conflicts.pages.length > 0 ||
    conflicts.archive.length > 0 ||
    conflicts.templates.length > 0 ||
    conflicts.templateArchive.length > 0 ||
    conflicts.menu
  );
}

export function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function diffItems<T>(
  base: T[],
  next: T[],
  idOf: (item: T) => string,
): ItemChange<T>[] {
  const baseMap = new Map(base.map((item) => [idOf(item), item]));
  const nextMap = new Map(next.map((item) => [idOf(item), item]));
  const ids = new Set([...baseMap.keys(), ...nextMap.keys()]);
  const changes: ItemChange<T>[] = [];
  for (const id of ids) {
    const from = baseMap.get(id) ?? null;
    const to = nextMap.get(id) ?? null;
    if (jsonEqual(from, to)) continue;
    changes.push({ id, base: from, next: to });
  }
  return changes;
}

export function diffStates(base: CmsState, next: CmsState): CmsChange {
  const change: CmsChange = {
    pages: diffItems(base.pages, next.pages, (page) => page.slug),
    archive: diffItems(base.archive, next.archive, (entry) => entry.id),
    templates: diffItems(base.templates, next.templates, (template) => template.slug),
    templateArchive: diffItems(
      base.templateArchive,
      next.templateArchive,
      (entry) => entry.id,
    ),
  };
  const baseMenu = resolvedMenu(base.menu);
  const nextMenu = resolvedMenu(next.menu);
  if (!jsonEqual(baseMenu, nextMenu)) {
    change.menu = { base: base.menu ?? null, next: nextMenu };
  }
  return change;
}

function applyItems<T>(
  latest: T[],
  changes: ItemChange<T>[],
  idOf: (item: T) => string,
  trust: boolean,
): { items: T[]; conflicts: string[]; applied: boolean } {
  if (changes.length === 0) {
    return { items: latest, conflicts: [], applied: false };
  }

  const map = new Map(latest.map((item) => [idOf(item), item]));
  const conflicts: string[] = [];
  let applied = false;

  for (const change of changes) {
    const current = map.get(change.id) ?? null;
    if (jsonEqual(current, change.next)) continue;
    if (!trust && !jsonEqual(current, change.base)) {
      conflicts.push(change.id);
      continue;
    }
    if (change.next === null) map.delete(change.id);
    else map.set(change.id, change.next);
    applied = true;
  }

  const items: T[] = [];
  const seen = new Set<string>();
  for (const item of latest) {
    const id = idOf(item);
    const current = map.get(id);
    if (!current) continue;
    items.push(current);
    seen.add(id);
  }
  for (const change of changes) {
    if (!change.next || seen.has(change.id)) continue;
    if (map.get(change.id) !== change.next) continue;
    items.push(change.next);
    seen.add(change.id);
  }

  return { items, conflicts, applied };
}

export function applyChange(
  latest: CmsState,
  change: CmsChange,
  trust = false,
): ApplyChangeResult {
  const pages = applyItems(latest.pages, change.pages, (page) => page.slug, trust);
  const archive = applyItems(latest.archive, change.archive, (entry) => entry.id, trust);
  const templates = applyItems(
    latest.templates,
    change.templates,
    (template) => template.slug,
    trust,
  );
  const templateArchive = applyItems(
    latest.templateArchive,
    change.templateArchive,
    (entry) => entry.id,
    trust,
  );

  let menu = latest.menu;
  let menuConflict = false;
  let menuApplied = false;
  if (change.menu) {
    const currentMenu = resolvedMenu(latest.menu);
    const nextMenu = resolvedMenu(change.menu.next);
    const baseMenu = resolvedMenu(change.menu.base ?? undefined);
    if (jsonEqual(currentMenu, nextMenu)) {
      menu = change.menu.next;
    } else if (trust || jsonEqual(currentMenu, baseMenu)) {
      menu = change.menu.next;
      menuApplied = true;
    } else {
      menuConflict = true;
    }
  }

  const nextPages = pages.items;
  const nextTemplates = templatesNotMatchingPages(templates.items, nextPages);
  const nextTemplateArchive = templateArchive.items.filter((entry) => !entry.hiddenPage);

  return {
    state: {
      pages: nextPages,
      archive: archive.items,
      templates: nextTemplates,
      templateArchive: nextTemplateArchive,
      menu,
    },
    conflicts: {
      pages: pages.conflicts,
      archive: archive.conflicts,
      templates: templates.conflicts,
      templateArchive: templateArchive.conflicts,
      menu: menuConflict,
    },
    applied:
      pages.applied ||
      archive.applied ||
      templates.applied ||
      templateArchive.applied ||
      menuApplied,
  };
}

function absorbItems<T>(
  local: T[],
  confirmed: T[],
  remote: T[],
  idOf: (item: T) => string,
): { items: T[]; confirmed: T[]; conflicts: string[] } {
  const localMap = new Map(local.map((item) => [idOf(item), item]));
  const confirmedMap = new Map(confirmed.map((item) => [idOf(item), item]));
  const remoteMap = new Map(remote.map((item) => [idOf(item), item]));
  const ids = new Set([...localMap.keys(), ...confirmedMap.keys(), ...remoteMap.keys()]);

  const nextMap = new Map<string, T | null>();
  const confirmedNextMap = new Map<string, T | null>();
  const conflicts: string[] = [];

  for (const id of ids) {
    const base = confirmedMap.get(id) ?? null;
    const ours = localMap.get(id) ?? null;
    const theirs = remoteMap.get(id) ?? null;
    if (jsonEqual(ours, theirs) || jsonEqual(ours, base)) {
      nextMap.set(id, theirs);
      confirmedNextMap.set(id, theirs);
      continue;
    }
    if (jsonEqual(theirs, base)) {
      nextMap.set(id, ours);
      confirmedNextMap.set(id, base);
      continue;
    }
    nextMap.set(id, ours);
    confirmedNextMap.set(id, base);
    conflicts.push(id);
  }

  function assemble(source: T[], map: Map<string, T | null>, extra: T[]): T[] {
    const items: T[] = [];
    const seen = new Set<string>();
    for (const item of source) {
      const id = idOf(item);
      const value = map.get(id);
      if (!value) continue;
      items.push(value);
      seen.add(id);
    }
    for (const item of extra) {
      const id = idOf(item);
      if (seen.has(id)) continue;
      const value = map.get(id);
      if (!value) continue;
      items.push(value);
      seen.add(id);
    }
    return items;
  }

  return {
    items: assemble(remote, nextMap, local),
    confirmed: assemble(remote, confirmedNextMap, confirmed),
    conflicts,
  };
}

function absorbMenu(
  local: CmsLink[] | undefined,
  confirmed: CmsLink[] | undefined,
  remote: CmsLink[] | undefined,
): { menu: CmsLink[] | undefined; confirmed: CmsLink[] | undefined; conflict: boolean } {
  const ours = resolvedMenu(local);
  const base = resolvedMenu(confirmed);
  const theirs = resolvedMenu(remote);
  if (jsonEqual(ours, theirs) || jsonEqual(ours, base)) {
    return { menu: remote, confirmed: remote, conflict: false };
  }
  if (jsonEqual(theirs, base)) {
    return { menu: local, confirmed, conflict: false };
  }
  return { menu: local, confirmed, conflict: true };
}

function finishState(
  pages: CmsPage[],
  archive: PageArchiveEntry[],
  templates: CmsTemplate[],
  templateArchive: TemplateArchiveEntry[],
  menu: CmsLink[] | undefined,
): CmsState {
  return {
    pages,
    archive,
    templates: templatesNotMatchingPages(templates, pages),
    templateArchive: templateArchive.filter((entry) => !entry.hiddenPage),
    menu,
  };
}

export function absorbRemote(local: CmsState, confirmed: CmsState, remote: CmsState): AbsorbRemoteResult {
  const pages = absorbItems(local.pages, confirmed.pages, remote.pages, (page) => page.slug);
  const archive = absorbItems(local.archive, confirmed.archive, remote.archive, (entry) => entry.id);
  const templates = absorbItems(
    local.templates,
    confirmed.templates,
    remote.templates,
    (template) => template.slug,
  );
  const templateArchive = absorbItems(
    local.templateArchive,
    confirmed.templateArchive,
    remote.templateArchive,
    (entry) => entry.id,
  );
  const menu = absorbMenu(local.menu, confirmed.menu, remote.menu);
  const conflicts: CmsConflicts = {
    pages: pages.conflicts,
    archive: archive.conflicts,
    templates: templates.conflicts,
    templateArchive: templateArchive.conflicts,
    menu: menu.conflict,
  };

  return {
    state: finishState(
      pages.items,
      archive.items,
      templates.items,
      templateArchive.items,
      menu.menu,
    ),
    confirmed: finishState(
      pages.confirmed,
      archive.confirmed,
      templates.confirmed,
      templateArchive.confirmed,
      menu.confirmed,
    ),
    conflicts,
    advanceEtag: !hasConflicts(conflicts),
  };
}

function parseItemChanges<T>(
  value: unknown,
  hydrate: (value: unknown) => T | null,
  idOf: (item: T) => string,
): ItemChange<T>[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const changes: ItemChange<T>[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const raw = row as { id?: unknown; next?: unknown; base?: unknown };
    if (typeof raw.id !== "string") return null;
    const next = raw.next == null ? null : hydrate(raw.next);
    if (raw.next != null && next === null) return null;
    const base = raw.base == null ? null : hydrate(raw.base);
    if (raw.base != null && base === null) return null;
    if (next && idOf(next) !== raw.id) return null;
    if (base && idOf(base) !== raw.id) return null;
    changes.push({ id: raw.id, next, base });
  }
  return changes;
}

export function parseCmsChange(value: unknown): CmsChange | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const pages = parseItemChanges(raw.pages, hydratePage, (page) => page.slug);
  const archive = parseItemChanges(raw.archive, hydrateArchiveEntry, (entry) => entry.id);
  const templates = parseItemChanges(raw.templates, hydrateTemplate, (template) => template.slug);
  const templateArchive = parseItemChanges(
    raw.templateArchive,
    hydrateTemplateArchiveEntry,
    (entry) => entry.id,
  );
  if (!pages || !archive || !templates || !templateArchive) return null;

  const change: CmsChange = { pages, archive, templates, templateArchive };
  if (raw.menu === undefined) return change;
  if (!raw.menu || typeof raw.menu !== "object") return null;
  const menu = raw.menu as { next?: unknown; base?: unknown };
  const next = hydrateCmsLinks(menu.next);
  if (!next) return null;
  const base =
    menu.base == null ? null : (hydrateCmsLinks(menu.base) ?? null);
  if (menu.base != null && base === null) return null;
  change.menu = { next, base };
  return change;
}

export function conflictNotice(conflicts: CmsConflicts, pages: CmsPage[]): string {
  const names = conflicts.pages.map((slug) => {
    const page = pages.find((item) => item.slug === slug);
    return page ? pageTitle(page) : slug || "Startsida";
  });
  if (names.length === 1) {
    return `Sidan ${names[0]} har ändrats av någon annan. Ladda om innan du fortsätter.`;
  }
  if (names.length > 1) {
    return `Sidorna ${names.join(", ")} har ändrats av någon annan. Ladda om innan du fortsätter.`;
  }
  if (conflicts.menu) {
    return "Menyn har ändrats av någon annan. Ladda om innan du fortsätter.";
  }
  if (conflicts.templates.length === 1) {
    return `Mallen ${conflicts.templates[0]} har ändrats av någon annan. Ladda om innan du fortsätter.`;
  }
  if (conflicts.templates.length > 1) {
    return "Mallarna har ändrats av någon annan. Ladda om innan du fortsätter.";
  }
  return "Innehållet har ändrats av någon annan. Ladda om innan du fortsätter.";
}
