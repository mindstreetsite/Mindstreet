import { CmsRoute } from "@/components/cms/cms-route";
import { metadataForSlug } from "@/lib/cms/page-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return metadataForSlug(slug.join("/"));
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <CmsRoute slug={slug.join("/")} />;
}
