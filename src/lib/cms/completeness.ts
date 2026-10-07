import { blockLabel, fieldsFor, isNewsBlock } from "@/lib/cms/library";
import type { BlockType, CmsBlock, CmsCard, CmsPage } from "@/lib/cms/types";

export type CompletenessField =
  | "title"
  | "heading"
  | "body"
  | "eyebrow"
  | "image"
  | "image2"
  | "buttonLabel"
  | "buttonHref"
  | "quote"
  | "href"
  | "publishedAt"
  | "childLink"
  | "parentLink";

export type CompletenessIssue = {
  id: string;
  message: string;
  fieldMessage: string;
  field: CompletenessField;
  blockId?: string;
  itemId?: string;
};

export function cmsPagePath(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+/, "").replace(/\/+$/, "");
}

export function pageCompletenessIssues(
  page: CmsPage,
  pages: CmsPage[],
  options?: { requireTitle?: boolean },
): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];

  if (options?.requireTitle && blank(page.title)) {
    issues.push({
      id: completenessFieldId({ field: "title" }),
      field: "title",
      message: "Fyll i sidnamn.",
      fieldMessage: "Fyll i sidnamn.",
    });
  }

  for (const block of page.blocks) {
    issues.push(...blockCompletenessIssues(block));
  }

  if (page.slug && page.slug !== page.parentSlug) {
    const parent = page.parentSlug
      ? pages.find((other) => other.slug === page.parentSlug)
      : undefined;
    if (parent && !pageHasLinkTo(parent, page.slug)) {
      issues.push({
        id: completenessFieldId({ field: "parentLink" }),
        field: "parentLink",
        message: `Föräldern ${titleOf(parent)} saknar länk hit.`,
        fieldMessage: "",
      });
    }

    for (const child of pages) {
      if (child.parentSlug !== page.slug) continue;
      if (pageHasLinkTo(page, child.slug)) continue;
      issues.push({
        id: completenessFieldId({ field: "childLink", itemId: child.slug }),
        field: "childLink",
        message: `Länka till undersidan ${titleOf(child)} från den här sidan.`,
        fieldMessage: "",
      });
    }
  }

  return issues;
}

export function isPageComplete(
  page: CmsPage,
  pages: CmsPage[],
  options?: { requireTitle?: boolean },
): boolean {
  return pageCompletenessIssues(page, pages, options).length === 0;
}

export function findCompletenessIssue(
  issues: CompletenessIssue[],
  field: CompletenessField,
  blockId?: string,
  itemId?: string,
): CompletenessIssue | undefined {
  return issues.find(
    (issue) => issue.field === field && issue.blockId === blockId && issue.itemId === itemId,
  );
}

export function completenessFieldId(parts: {
  field: CompletenessField;
  blockId?: string;
  itemId?: string;
}): string {
  return ["cms-field", parts.blockId ?? "page", parts.itemId, parts.field]
    .filter(Boolean)
    .join("-")
    .replace(/[^A-Za-z0-9_-]/g, "-");
}

export function pageHasLinkTo(page: CmsPage, slug: string): boolean {
  const target = cmsPagePath(slug);
  if (!target) return false;
  return collectPageHrefs(page).has(target);
}

function blockCompletenessIssues(block: CmsBlock): CompletenessIssue[] {
  const fields = fieldsFor(block.type);
  const issues: CompletenessIssue[] = [];

  if (
    fields.eyebrow &&
    block.type !== "contact" &&
    block.type !== "imageText" &&
    block.type !== "imagePair" &&
    blank(block.eyebrow)
  ) {
    issues.push(blockIssue(block, "eyebrow", "Fyll i överrad", "fyll i överrad"));
  }
  if (fields.heading && block.type !== "contactCards" && blank(block.heading)) {
    issues.push(blockIssue(block, "heading", "Fyll i rubrik", "fyll i rubrik"));
  }
  if (
    fields.body &&
    block.type !== "contactCards" &&
    block.type !== "imageText" &&
    block.type !== "imagePair" &&
    block.type !== "hero" &&
    blank(block.body)
  ) {
    issues.push(blockIssue(block, "body", "Fyll i text", "fyll i text"));
  }
  if (fields.image && blank(block.image)) {
    issues.push(blockIssue(block, "image", "Välj bild", "välj bild"));
  }
  if (fields.image2 && blank(block.image2)) {
    issues.push(blockIssue(block, "image2", "Välj andra bilden", "välj andra bilden"));
  }

  const buttonRequired =
    fields.button &&
    block.type !== "contact" &&
    block.type !== "contactCards" &&
    block.type !== "contactUs" &&
    block.type !== "imageText" &&
    block.type !== "imagePair" &&
    (block.type !== "statement" || block.buttonLabel !== undefined);
  if (buttonRequired) {
    if (blank(block.buttonLabel)) {
      issues.push(blockIssue(block, "buttonLabel", "Fyll i knapp", "fyll i knapp"));
    }
    if (blank(block.buttonHref)) {
      issues.push(blockIssue(block, "buttonHref", "Fyll i länk", "fyll i länk"));
    }
  }

  if (fields.quote && block.quote !== undefined && blank(block.quote)) {
    issues.push(blockIssue(block, "quote", "Fyll i citat", "fyll i citat"));
  }

  const items = block.items ?? [];
  if (block.type === "expertise") {
    items.forEach((item, index) => {
      issues.push(...cardIssues(block, item, index, ["heading", "body"]));
    });
  } else if (block.type === "offering") {
    items.forEach((item, index) => {
      issues.push(...cardIssues(block, item, index, ["heading", "body", "buttonLabel"]));
    });
  } else if (isNewsBlock(block.type)) {
    items.forEach((item, index) => {
      issues.push(...cardIssues(block, item, index, ["image", "publishedAt", "heading"]));
    });
  } else if (block.type === "textColumn") {
    items.forEach((item, index) => {
      issues.push(...cardIssues(block, item, index, ["heading", "body"]));
    });
  }

  return issues;
}

function cardIssues(
  block: CmsBlock,
  item: CmsCard,
  index: number,
  fields: Array<"heading" | "body" | "href" | "buttonLabel" | "image" | "publishedAt">,
): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  const itemLabel = `${itemKind(block.type)} ${index + 1}`;
  for (const field of fields) {
    const missing =
      field === "image"
        ? blank(item.image)
        : field === "publishedAt"
          ? blank(item.publishedAt)
          : field === "buttonLabel"
            ? blank(item.buttonLabel)
            : field === "href"
              ? blank(item.href)
              : field === "heading"
                ? blank(item.heading)
                : blank(item.body);
    if (!missing) continue;
    const copy = itemFieldCopy(field);
    issues.push(
      blockIssue(block, field, copy.fieldMessage, copy.banner, {
        itemId: item.id,
        itemLabel,
      }),
    );
  }
  return issues;
}

function itemKind(type: BlockType): string {
  if (type === "expertise") return "kort";
  if (type === "offering") return "rad";
  if (isNewsBlock(type)) return "nyhet";
  return "avsnitt";
}

function itemFieldCopy(field: CompletenessField): { fieldMessage: string; banner: string } {
  if (field === "heading") return { fieldMessage: "Fyll i rubrik", banner: "fyll i rubrik" };
  if (field === "body") return { fieldMessage: "Fyll i text", banner: "fyll i text" };
  if (field === "buttonLabel") return { fieldMessage: "Fyll i knapp", banner: "fyll i knapp" };
  if (field === "href") return { fieldMessage: "Välj undersida", banner: "välj undersida" };
  if (field === "image") return { fieldMessage: "Välj bild", banner: "välj bild" };
  return { fieldMessage: "Välj datum", banner: "välj datum" };
}

function blockIssue(
  block: CmsBlock,
  field: CompletenessField,
  fieldMessage: string,
  banner: string,
  extra?: { itemId?: string; itemLabel?: string },
): CompletenessIssue {
  const blockName = blockLabel(block.type);
  const where = extra?.itemLabel ? `${blockName}, ${extra.itemLabel}` : blockName;
  return {
    id: completenessFieldId({ blockId: block.id, itemId: extra?.itemId, field }),
    blockId: block.id,
    itemId: extra?.itemId,
    field,
    fieldMessage,
    message: `${where}: ${banner}.`,
  };
}

function collectPageHrefs(page: CmsPage): Set<string> {
  const hrefs = new Set<string>();
  for (const block of page.blocks) {
    const buttonHref = block.buttonHref?.trim();
    if (buttonHref) hrefs.add(cmsPagePath(buttonHref));
    const button2Href = block.button2Href?.trim();
    if (button2Href) hrefs.add(cmsPagePath(button2Href));
    for (const item of block.items ?? []) {
      const href = item.href.trim();
      if (href) hrefs.add(cmsPagePath(href));
    }
  }
  return hrefs;
}

function blank(value: string | undefined): boolean {
  return !(value ?? "").trim();
}

function titleOf(page: CmsPage): string {
  return page.title.trim() || page.slug;
}
