import { PageBlocks } from "@/components/cms/page-blocks";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { readCmsState } from "@/lib/cms/blob-store";
import { articleNewsCards, resolvedMenu } from "@/lib/cms/library";
import { newsDateForSlug } from "@/lib/cms/news-date";
import { articleJsonLd, jsonLdHtml } from "@/lib/cms/seo";
import { getPublishedPage } from "@/lib/cms/storage";
import type { CmsFooter, CmsLink } from "@/lib/cms/types";

function MissingChrome({
  menu,
  footer,
  title,
  body,
  actions = false,
}: {
  menu?: CmsLink[];
  footer?: CmsFooter | null;
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
      <SiteFooter footer={footer} />
    </div>
  );
}

export function MissingPage({ menu, footer }: { menu?: CmsLink[]; footer?: CmsFooter | null }) {
  return (
    <MissingChrome
      menu={menu}
      footer={footer}
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
  const footer = stored.state.footer;
  const page = getPublishedPage(slug, stored.state.pages);
  if (!page) return <MissingPage menu={menu} footer={footer} />;

  const publishedAt = newsDateForSlug(page.slug, stored.state.pages);
  const jsonLd = articleJsonLd(page, publishedAt);

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
      ) : null}
      <PageBlocks
        page={page}
        menu={menu}
        footer={footer}
        publishedAt={publishedAt}
        articleItems={articleNewsCards(stored.state.pages)}
      />
    </>
  );
}
