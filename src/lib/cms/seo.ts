import type { Metadata } from "next";
import { footer, intro } from "@/content/home";
import { plainText } from "@/lib/cms/inline";
import { isArticlePage, SITE_ORIGIN } from "@/lib/cms/library";
import type { CmsPage, PageSeo } from "@/lib/cms/types";

export const SITE_NAME = "Mindstreet";
export const SITE_DESCRIPTION = intro.heading;
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 150;

const BRAND_SUFFIX = ` – ${SITE_NAME}`;

export function compactSeo(seo: PageSeo | undefined): PageSeo | undefined {
  if (!seo) return undefined;
  const next: PageSeo = {};
  const title = seo.title?.trim();
  const description = seo.description?.trim();
  const image = seo.image?.trim();
  if (title) next.title = title;
  if (description) next.description = description;
  if (image) next.image = image;
  if (seo.noindex) next.noindex = true;
  return next.title || next.description || next.image || next.noindex ? next : undefined;
}

export function pagePath(slug: string): string {
  return slug ? `/${slug}` : "/";
}

export function pageUrl(slug: string): string {
  return `${SITE_ORIGIN}${pagePath(slug)}`;
}

export function absoluteUrl(path: string): string {
  const value = path.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

export function fallbackSeoTitle(page: CmsPage): string {
  const name = page.title.trim();
  if (!page.slug) {
    if (!name || name === SITE_NAME || name === "Startsida") return SITE_NAME;
    return name;
  }
  return name || page.slug;
}

export function fallbackSeoDescription(page: CmsPage): string {
  for (const block of page.blocks) {
    const body = clipText(plainText(stripTags(block.body)));
    if (body) return body;
  }
  for (const block of page.blocks) {
    const heading = clipText(plainText(stripTags(block.heading)));
    if (heading) return heading;
  }
  return SITE_DESCRIPTION;
}

export function fallbackSeoImage(page: CmsPage): string | undefined {
  for (const block of page.blocks) {
    const image = block.image?.trim() || block.image2?.trim();
    if (image) return image;
    for (const item of block.items ?? []) {
      const itemImage = item.image?.trim();
      if (itemImage) return itemImage;
    }
  }
  return undefined;
}

export type ResolvedSeo = {
  title: string;
  description: string;
  image?: string;
  noindex: boolean;
  canonical: string;
  fullTitle: string;
};

export function resolvedSeo(page: CmsPage): ResolvedSeo {
  const title = page.seo?.title?.trim() || fallbackSeoTitle(page);
  const description = page.seo?.description?.trim() || fallbackSeoDescription(page);
  const image = page.seo?.image?.trim() || fallbackSeoImage(page);
  return {
    title,
    description,
    image,
    noindex: page.seo?.noindex === true,
    canonical: pageUrl(page.slug),
    fullTitle: brandedTitle(title),
  };
}

export function pageMetadata(page: CmsPage | null): Metadata {
  if (!page) {
    return {
      title: { absolute: `Sidan finns inte${BRAND_SUFFIX}` },
      robots: { index: false, follow: false },
    };
  }

  const seo = resolvedSeo(page);
  const imageUrl = seo.image ? absoluteUrl(seo.image) : undefined;
  return {
    title: { absolute: seo.fullTitle },
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: seo.fullTitle,
      description: seo.description,
      url: seo.canonical,
      locale: "sv_SE",
      siteName: SITE_NAME,
      type: isArticlePage(page) ? "article" : "website",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: seo.fullTitle,
      description: seo.description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export function organizationJsonLd() {
  const postal = parsePostal(footer.address[1] ?? "");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_ORIGIN,
    email: footer.email,
    telephone: footer.phone.label,
    address: {
      "@type": "PostalAddress",
      streetAddress: footer.address[0],
      postalCode: postal.code,
      addressLocality: postal.city,
      addressCountry: "SE",
    },
    sameAs: [footer.linkedIn],
  };
}

export function articleJsonLd(page: CmsPage, publishedAt: string) {
  if (!isArticlePage(page)) return null;
  const seo = resolvedSeo(page);
  const article = page.blocks.find((block) => block.type === "article");
  const headline = article?.heading.trim() || seo.title;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    description: seo.description,
    url: seo.canonical,
    mainEntityOfPage: seo.canonical,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };
  if (seo.image) data.image = absoluteUrl(seo.image);
  if (publishedAt.trim()) data.datePublished = publishedAt.trim();
  return data;
}

export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function brandedTitle(title: string): string {
  if (title === SITE_NAME || title.endsWith(BRAND_SUFFIX)) return title;
  return `${title}${BRAND_SUFFIX}`;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function clipText(value: string, max = SEO_DESCRIPTION_MAX): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const space = slice.lastIndexOf(" ");
  const cut = space >= Math.floor(max / 2) ? slice.slice(0, space) : slice;
  return `${cut.replace(/[\s.,;:!?-]+$/u, "")}…`;
}

function parsePostal(value: string): { code: string; city: string } {
  const match = /^(\d{3}\s?\d{2})\s+(.+)$/.exec(value.trim());
  if (!match) return { code: value, city: "Stockholm" };
  return { code: match[1], city: match[2] };
}
