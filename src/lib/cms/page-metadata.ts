import type { Metadata } from "next";
import { readCmsState } from "@/lib/cms/blob-store";
import { pageMetadata } from "@/lib/cms/seo";
import { getPublishedPage } from "@/lib/cms/storage";

export async function metadataForSlug(slug: string): Promise<Metadata> {
  try {
    const stored = await readCmsState();
    return pageMetadata(getPublishedPage(slug, stored.state.pages));
  } catch {
    return pageMetadata(null);
  }
}
