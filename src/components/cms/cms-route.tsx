import { PageBlocks } from "@/components/cms/page-blocks";
import { SiteFooter } from "@/components/site-footer";
import { readCmsState } from "@/lib/cms/blob-store";
import { newsDateForSlug } from "@/lib/cms/news-date";
import { getPublishedPage } from "@/lib/cms/storage";

export function MissingPage() {
  return (
    <>
      <main className="cms-missing">
        <div>
          <h1>Sidan finns inte</h1>
          <p>Det finns ingen sida på den här sökvägen.</p>
          <div className="cms-missing-actions">
            <a className="btn btn-dark" href="/admin">
              Till admin
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export async function CmsRoute({ slug }: { slug: string }) {
  let stored;
  try {
    stored = await readCmsState();
  } catch {
    return (
      <main className="cms-missing">
        <div>
          <h1>Sidan kunde inte hämtas</h1>
          <p>Innehållet är inte tillgängligt just nu.</p>
        </div>
      </main>
    );
  }

  const page = getPublishedPage(slug, stored.state.pages);
  if (!page) return <MissingPage />;

  return (
    <PageBlocks
      page={page}
      menu={stored.state.menu}
      publishedAt={newsDateForSlug(page.slug, stored.state.pages)}
    />
  );
}
