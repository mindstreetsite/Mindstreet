import { CmsRoute } from "@/components/cms/cms-route";
import { metadataForSlug } from "@/lib/cms/page-metadata";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return metadataForSlug("");
}

export default function HomePage() {
  return <CmsRoute slug="" />;
}
