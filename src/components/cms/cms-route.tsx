import { PageBlocks } from "@/components/cms/page-blocks";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { readCmsState } from "@/lib/cms/blob-store";
import { articleNewsCards, resolvedMenu } from "@/lib/cms/library";
import { newsDateForSlug } from "@/lib/cms/news-date";
import { getPublishedPage } from "@/lib/cms/storage";
import type { CmsLink } from "@/lib/cms/types";

function MissingChrome({
  menu,
  title,
  body,
  actions = false,
}: {
  menu?: CmsLink[];
  title: string;
  body: string;
  actions?: boolean;
}) {
  return (
    <div className="cms-missing-page">
      <Header variant="bar" theme="ink" items={menu} />
      <main className="cms-missing">
        <div>
          <h1>{title}</h1>
          <p>{body}</p>
          {actions ? (
            <div className="cms-missing-actions">
              <a className="btn btn-dark" href="/admin">
                Till admin
              </a>
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function MissingPage({ menu }: { menu?: CmsLink[] }) {
  return (
    <MissingChrome
      menu={menu}
      title="Sidan finns inte"
      body="Det finns ingen sida på den här sökvägen."
      actions
    />
  );
}

export async function CmsRoute({ slug }: { slug: string }) {
  let stored;
  try {
    stored = await readCmsState();
  } catch {
    return (
      <MissingChrome
        title="Sidan kunde inte hämtas"
        body="Innehållet är inte tillgängligt just nu."
      />
    );
  }

  const menu = resolvedMenu(stored.state.menu);
  const page = getPublishedPage(slug, stored.state.pages);
  if (!page) return <MissingPage menu={menu} />;

  return (
    <PageBlocks
      page={page}
      menu={menu}
      publishedAt={newsDateForSlug(page.slug, stored.state.pages)}
      articleItems={articleNewsCards(stored.state.pages)}
    />
  );
}
