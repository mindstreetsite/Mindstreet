import { syncAllArticleNews } from "./library";
import { hydrateState, SEED_VERSION } from "./storage";
import type { CmsPage } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function page(slug: string, blocks: CmsPage["blocks"], extras: Partial<CmsPage> = {}): CmsPage {
  return {
    slug,
    title: slug || "Hem",
    published: true,
    links: [],
    blocks,
    ...extras,
  };
}

const archivedAml = hydrateState({
  pages: [page("", [{ id: "home", type: "text", heading: "Hem", body: "" }])],
  archive: [
    {
      id: "archive-aml",
      slug: "expertomraden/aml",
      deletedAt: "2026-01-01T00:00:00.000Z",
      pages: [
        page("expertomraden/aml", [
          { id: "aml", type: "hero", heading: "AML", body: "AML" },
        ]),
      ],
    },
  ],
});

assert(
  !archivedAml.pages.some((item) => item.slug === "expertomraden/aml"),
  "Archived seed subpage stays out of live pages",
);
assert(
  archivedAml.pages.some((item) => item.slug === "expertomraden"),
  "Other seed pages are still added",
);
assert(
  archivedAml.archive.some((entry) => entry.slug === "expertomraden/aml"),
  "Deleted page remains in the trash",
);

const versioned = hydrateState({
  pages: [page("", [{ id: "home", type: "text", heading: "Hem", body: "" }])],
  archive: archivedAml.archive,
  seedVersion: SEED_VERSION,
});
assert(versioned.pages.length === 1, "Current seed version does not reinsert seed pages");

const news = page("nyheter", [
  {
    id: "news",
    type: "news",
    heading: "Nyheter",
    body: "",
    items: [
      {
        id: "starter-a",
        heading: "Tips på hur du lyckas med ett systembyte",
        body: "",
        href: "",
        image: "/images/news-3.jpg",
        published: false,
      },
      {
        id: "starter-b",
        heading: "Tips på hur du lyckas med ett systembyte",
        body: "",
        href: "",
        image: "/images/news-4.jpg",
        published: false,
      },
    ],
  },
]);
const article = page("tips", [
  {
    id: "article",
    type: "article",
    heading: "Tips på hur du lyckas med ett systembyte",
    body: "",
    image: "/images/hero.jpg",
    publishedAt: "2026-01-01",
  },
]);

const synced = syncAllArticleNews([news, article]);
const items = synced.find((item) => item.slug === "nyheter")?.blocks[0].items ?? [];
const tips = items.filter((item) => item.heading === "Tips på hur du lyckas med ett systembyte");
assert(tips.length === 1, "Duplicate starter cards collapse to one article card");
assert(tips[0]?.href === "/tips", "Starter card is retargeted to the article");

const again = syncAllArticleNews(synced);
const againItems = again.find((item) => item.slug === "nyheter")?.blocks[0].items ?? [];
assert(
  againItems.filter((item) => item.heading === "Tips på hur du lyckas med ett systembyte").length === 1,
  "A later save does not recreate the duplicate",
);

console.log("trash check ok");
