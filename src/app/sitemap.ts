import type { MetadataRoute } from "next";
import { readCmsState } from "@/lib/cms/blob-store";
import { pageUrl } from "@/lib/cms/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const stored = await readCmsState();
    return stored.state.pages
      .filter((page) => page.published && page.seo?.noindex !== true)
      .map((page) => ({ url: pageUrl(page.slug) }));
  } catch {
    return [];
  }
}
