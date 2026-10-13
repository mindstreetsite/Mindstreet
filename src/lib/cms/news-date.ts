import { cmsPagePath } from "@/lib/cms/completeness";
import type { CmsPage } from "@/lib/cms/types";

const months = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
];

export function formatNewsDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${String(day).padStart(2, "0")} ${months[month - 1]} ${year}`;
}

export function newsDateForSlug(slug: string, pages: CmsPage[]): string {
  const target = cmsPagePath(slug);
  if (!target) return "";

  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.type !== "news" && block.type !== "newsTwelve") continue;
      for (const item of block.items ?? []) {
        const publishedAt = item.publishedAt?.trim() ?? "";
        if (publishedAt && cmsPagePath(item.href) === target) return publishedAt;
      }
    }
  }

  const page = pages.find((item) => cmsPagePath(item.slug) === target);
  const article = page?.blocks.find((block) => block.type === "article");
  return article?.publishedAt?.trim() ?? "";
}
