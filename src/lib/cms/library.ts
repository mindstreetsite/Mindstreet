import type { BlockTheme, BlockType, CmsBlock, CmsCard, CmsPage } from "@/lib/cms/types";

export { swatchesFor, themesFor, surfaceById, type Surface } from "@/lib/design/palette";

export const SITE_HOST = "www.mindstreet.se";

const loremBody =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const experienceHeading =
  "Vi har en bred och lång samlad erfarenhet från bank och finans";

const leadHeading =
  "Vi kan bank och finans. Erfarna, kompetenta konsulter som kliver in och får saker gjorda.";

const leadBody =
  "Våra konsulter kan AML. Vi driver program och projekt, gör gapanalyser och bemannar interimroller – men vi går också in hands-on som AML- och KYC-specialister, transaktionsmonitorerare och riskmodellerare. Vi stöttar dessutom i rekryteringsprocesser, rådgivning och utbildning.";

export type BlockFields = {
  heading: string | null;
  body: string | null;
  eyebrow: boolean;
  image: boolean;
  image2: boolean;
  button: boolean;
  imageSide: boolean;
  align: boolean;
  theme: boolean;
  quote: boolean;
};

export const library: {
  type: BlockType;
  label: string;
  description: string;
}[] = [
  {
    type: "pageHeader",
    label: "Header",
    description: "Logga och meny",
  },
  {
    type: "hero",
    label: "Hero",
    description: "Helbild med rubrik",
  },
  {
    type: "lead",
    label: "Ingress",
    description: "Stor rubrik och text",
  },
  {
    type: "text",
    label: "Text",
    description: "Rubrik och stycke",
  },
  {
    type: "textColumn",
    label: "Textspalt",
    description: "Rubriker och stycken",
  },
  {
    type: "imageText",
    label: "Bild och text",
    description: "Ett foto, överrad och knapp",
  },
  {
    type: "contact",
    label: "Kontakt",
    description: "Ett foto, överrad och knapp",
  },
  {
    type: "contactCards",
    label: "Kontaktkort",
    description: "Flera kort med bild ovanför kontaktuppgifter",
  },
  {
    type: "contactUs",
    label: "Kontakta oss",
    description: "Header, text och kontaktkort",
  },
  {
    type: "imagePair",
    label: "Två bilder och text",
    description: "Två överlappande foton",
  },
  {
    type: "split",
    label: "Bild och text (startsida)",
    description: "Den äldre split-layouten",
  },
  {
    type: "sectionHeader",
    label: "Sektionsrubrik",
    description: "Rubrik med linje",
  },
  {
    type: "banner",
    label: "Banner",
    description: "Bakgrundsbild och rubrik",
  },
  {
    type: "highlight",
    label: "Highlight",
    description: "Helbild med knapp",
  },
  {
    type: "article",
    label: "Artikel",
    description: "Längre text, bild och citat",
  },
  {
    type: "expertise",
    label: "Expertområden",
    description: "Kort med rubrik, text och länk",
  },
  {
    type: "offering",
    label: "Erbjudande",
    description: "Utfällbara rader med länk",
  },
  {
    type: "news",
    label: "Nyheter",
    description: "Bild och rubrik, två och två",
  },
  {
    type: "newsTwelve",
    label: "Nyheter, 12",
    description: "Bild och rubrik, tolv i taget",
  },
  {
    type: "statement",
    label: "Text och knapp",
    description: "Text med valfri knapp",
  },
];

const defaults: Record<BlockType, Omit<CmsBlock, "id" | "type">> = {
  pageHeader: {
    heading: "",
    body: "",
  },
  hero: {
    heading: "Lorem ipsum",
    body: loremBody,
  },
  text: {
    heading: "Lorem ipsum dolor sit amet",
    body: loremBody,
    theme: "white",
  },
  textColumn: {
    heading: "",
    body: "",
  },
  split: {
    heading: "Lorem ipsum dolor",
    body: loremBody,
  },
  banner: {
    heading: "Lorem ipsum",
    body: "Lorem ipsum",
  },
  imageText: {
    heading: experienceHeading,
    body: "",
    eyebrow: "Om Mindstreet",
    buttonLabel: "Läs mer",
    buttonHref: "/#kontakt",
    imageSide: "right",
    image: "/images/about.jpg",
    theme: "sand",
  },
  contact: {
    heading: experienceHeading,
    body: "",
    eyebrow: "Om Mindstreet",
    buttonLabel: "Läs mer",
    buttonHref: "/#kontakt",
    imageSide: "right",
    image: "/images/about.jpg",
    theme: "sand",
    contactName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    contactLinkedIn: "",
  },
  contactCards: {
    heading: "",
    body: "",
  },
  contactUs: {
    heading: "Lorem ipsum dolor sit amet",
    body: loremBody,
    theme: "sand",
    buttonLabel: "",
    buttonHref: "",
  },
  imagePair: {
    heading: experienceHeading,
    body: "",
    eyebrow: "Om Mindstreet",
    buttonLabel: "Läs mer",
    buttonHref: "/#kontakt",
    imageSide: "left",
    image: "/images/news-2.jpg",
    image2: "/images/news-4.jpg",
    theme: "sand",
  },
  sectionHeader: {
    heading: "Våra tjänster",
    body: "",
    align: "left",
    theme: "white",
  },
  highlight: {
    heading: "Morning seminar",
    body: "Rådmansgatan 14",
    buttonLabel: "Anmäl dig",
    buttonHref: "/#kontakt",
    image: "/images/seminar.jpg",
  },
  lead: {
    heading: leadHeading,
    body: leadBody,
    theme: "white",
  },
  article: {
    heading: "Lorem ipsum dolor sit amet",
    body: `${loremBody}\n\n${loremBody}`,
    image: "/images/about.jpg",
    imageSide: "right",
    theme: "white",
  },
  expertise: {
    heading: "Våra expertområden",
    body: "",
  },
  offering: {
    heading: "Vårt erbjudande",
    body: "",
  },
  news: {
    heading: "Mindblowing news",
    body: "",
  },
  newsTwelve: {
    heading: "Mindblowing news",
    body: "",
  },
  statement: {
    heading: "",
    body: "Tia nonsenis ex eum volenim dit aut mil estisit verupiet aut quis dus quunt eum fugiati duciiss imillutatur. Itatur aut eaquam quidendio ommod eseque sam faccatum et oditiae volorum",
    buttonLabel: "Contact us",
    buttonHref: "/#kontakt",
    align: "center",
  },
};

const expertiseCardBody =
  "Betalningsmarknaden förändras i rasande fart. Samtidigt som nya betaltjänster växer fram, ställs allt högre krav på att branschen ska anpassa sig till nya regler och ny infrastruktur.";

const expertiseCardHeadings = ["Betalningar", "Kreditrisk", "AML", "Systembyten/Tech"];

export function createCard(heading = "Nytt område"): CmsCard {
  return {
    id: crypto.randomUUID(),
    heading,
    body: expertiseCardBody,
    href: "",
  };
}

export function createContactCard(): CmsCard {
  return {
    id: crypto.randomUUID(),
    heading: "",
    body: "",
    href: "",
    image: "",
    contactName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    contactLinkedIn: "",
  };
}

export function createExpertiseItems(): CmsCard[] {
  return expertiseCardHeadings.map((heading) => createCard(heading));
}

const textColumnStarters: { heading: string; body: string }[] = [
  {
    heading: "Större förändringar inom AML?",
    body: "AMLR-krav, tillsynsärenden eller stora förändringsprojekt – våra konsulter hjälper er oavsett vilket. De kliver in både strategiskt och operativt, omedelbart eller med längre framförhållning. Behövs det sätter vi ihop ett helt projektteam: erfarna projektledare som driver och samordnar arbetet, och specialister som tar fram, kvalitetssäkrar och uppdaterar processer, rutiner, riskmodeller och styrdokument. Vi kan också bemanna kompletta team inom KYC/EDD och transaktionsmonitorering. När utmaningarna hopar sig och det oförutsedda inträffar kan vi avlasta er och ge er exakt rätt kompetens i rätt tid.",
  },
  {
    heading: "Behöver ni hjälp med modellvalideringar?",
    body: "Vårt AML-team validerar modeller för transaktionsmonitorering, kundriskklassificering, screening och mer specialiserade ändamål, för både privat- och företagskunder, i och utanför Sverige.\n\nVi arbetar efter en beprövad, strukturerad och transparent valideringsmetod. Resultatet blir modeller som inte bara uppfyller de regulatoriska kraven, utan som också skapar värde och större effektivitet. Ni får alltid en slutrapport med resultat och tydliga rekommendationer som är lätta att följa.",
  },
];

export function createTextColumnSection(heading = "", body = ""): CmsCard {
  return {
    id: crypto.randomUUID(),
    heading,
    body,
    href: "",
  };
}

export function createTextColumnItems(): CmsCard[] {
  return textColumnStarters.map((item) => createTextColumnSection(item.heading, item.body));
}

const offeringAdvice =
  "Ibland behöver man ett bollplank, ett annat perspektiv och en djupare kompetens i ett ämne. Mindstreet hjälper dig med seniora rådgivare till ledningsgrupper, specifika projekt eller inför större beslut.";

export function createOfferingRow(
  heading: string,
  body = offeringAdvice,
  buttonLabel = "Read more",
): CmsCard {
  return {
    id: crypto.randomUUID(),
    heading,
    body,
    href: "/#kontakt",
    buttonLabel,
  };
}

export function createOfferingItems(): CmsCard[] {
  return ["Konsulttjänster", "Interimstjänster", "Rådgivning", "Rekrytering"].map((heading) =>
    createOfferingRow(heading),
  );
}

const newsStarters: { heading: string; image: string }[] = [
  {
    heading: "Behöver du en interimschef från branschen?",
    image: "/images/news-1.jpg",
  },
  {
    heading: "Tips på hur du lyckas med ett systembyte",
    image: "/images/news-3.jpg",
  },
  {
    heading: "Vi välkomnar ytterligare en stjärnkollega Anders Gustafsson till Mindstreet-teamet!",
    image: "/images/news-2.jpg",
  },
  {
    heading: "Tips på hur du lyckas med ett systembyte",
    image: "/images/news-4.jpg",
  },
];

export function createNewsItem(heading = "Ny nyhet", image = ""): CmsCard {
  return {
    id: crypto.randomUUID(),
    heading,
    body: "",
    href: "",
    image,
    published: false,
  };
}

export function createNewsItems(count = newsStarters.length): CmsCard[] {
  return Array.from({ length: count }, (_, index) => {
    const starter = newsStarters[index % newsStarters.length];
    return createNewsItem(starter.heading, starter.image);
  });
}

export function isNewsBlock(type: BlockType): boolean {
  return type === "news" || type === "newsTwelve";
}

export function newsCardFromArticle(block: CmsBlock, slug: string, published: boolean): CmsCard {
  return {
    id: crypto.randomUUID(),
    heading: block.heading.trim(),
    body: "",
    href: `/${slug}`,
    image: block.image ?? "",
    publishedAt: block.publishedAt ?? "",
    published,
  };
}

function newsHref(value: string) {
  return value.trim().toLowerCase().replace(/^\/+/, "").replace(/\/+$/, "");
}

export function prependArticleNews(pages: CmsPage[], card: CmsCard): CmsPage[] {
  const target = newsHref(card.href);
  return pages.map((page) => {
    if (!page.published || !page.blocks.some((block) => isNewsBlock(block.type))) return page;
    let changed = false;
    const blocks = page.blocks.map((block) => {
      if (!isNewsBlock(block.type)) return block;
      const items = block.items ?? [];
      if (target && items.some((item) => newsHref(item.href) === target)) return block;
      changed = true;
      return { ...block, items: [{ ...card }, ...items] };
    });
    return changed ? { ...page, blocks } : page;
  });
}

export function setArticleNewsPublished(pages: CmsPage[], slug: string, published: boolean): CmsPage[] {
  const target = newsHref(slug);
  if (!target) return pages;
  return pages.map((page) => {
    if (!page.blocks.some((block) => isNewsBlock(block.type))) return page;
    let changed = false;
    const blocks = page.blocks.map((block) => {
      if (!isNewsBlock(block.type)) return block;
      let itemsChanged = false;
      const items = (block.items ?? []).map((item) => {
        if (newsHref(item.href) !== target || item.published === published) return item;
        itemsChanged = true;
        return { ...item, published };
      });
      if (!itemsChanged) return block;
      changed = true;
      return { ...block, items };
    });
    return changed ? { ...page, blocks } : page;
  });
}

export function backfillTestArticleNews(pages: CmsPage[]): CmsPage[] | null {
  const source = pages.find((page) => page.title.trim().toLowerCase() === "test populera nyheter");
  const article = source?.blocks.find((block) => block.type === "article");
  if (!source || !article) return null;
  const next = setArticleNewsPublished(
    prependArticleNews(pages, newsCardFromArticle(article, source.slug, source.published)),
    source.slug,
    source.published,
  );
  return next.some((page, index) => page !== pages[index]) ? next : null;
}

export function articleParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function quoteAfterIndex(quoteAfter: number | undefined, count: number): number {
  if (count === 0) return -1;
  const raw = quoteAfter ?? 0;
  if (raw < 0) return -1;
  return Math.min(raw, count - 1);
}

export function createBlock(type: BlockType): CmsBlock {
  return {
    id: crypto.randomUUID(),
    type,
    ...defaults[type],
    ...(type === "expertise" ? { items: createExpertiseItems() } : {}),
    ...(type === "offering" ? { items: createOfferingItems() } : {}),
    ...(type === "news" ? { items: createNewsItems() } : {}),
    ...(type === "newsTwelve" ? { items: createNewsItems(12) } : {}),
    ...(type === "textColumn" ? { items: createTextColumnItems() } : {}),
    ...(type === "contactCards" || type === "contactUs" ? { items: [createContactCard()] } : {}),
  };
}

export function cloneTemplateBlocks(blocks: CmsBlock[]): CmsBlock[] {
  return blocks.map((block) => {
    const next: CmsBlock = {
      id: crypto.randomUUID(),
      type: block.type,
      heading: "",
      body: "",
    };
    if (block.imageSide) next.imageSide = block.imageSide;
    if (block.align) next.align = block.align;
    if (block.theme) next.theme = block.theme;
    if (block.shape !== undefined) next.shape = block.shape;
    if (block.type === "contact") {
      next.contactName = "";
      next.contactTitle = "";
      next.contactEmail = "";
      next.contactPhone = "";
      next.contactLinkedIn = "";
    }
    if (block.quote !== undefined) {
      next.quote = "";
      if (block.quoteAfter !== undefined) next.quoteAfter = block.quoteAfter;
      if (block.quoteCredit !== undefined) next.quoteCredit = "";
    }
    if (
      block.type === "expertise" ||
      block.type === "offering" ||
      block.type === "textColumn" ||
      isNewsBlock(block.type)
    ) {
      next.items = (block.items ?? []).map((item) => ({
        id: crypto.randomUUID(),
        heading: "",
        body: "",
        href: isNewsBlock(block.type) ? item.href : "",
        ...(isNewsBlock(block.type)
          ? { image: item.image ?? "", publishedAt: item.publishedAt ?? "", published: false }
          : {}),
        ...(block.type === "offering" || item.buttonLabel !== undefined
          ? { buttonLabel: "" }
          : {}),
      }));
    }
    if (block.type === "contactCards" || block.type === "contactUs") {
      next.items = (block.items ?? []).map(() => createContactCard());
    }
    return next;
  });
}

export function blockLabel(type: BlockType): string {
  return library.find((item) => item.type === type)?.label ?? type;
}

export function blockHasImage(type: BlockType): boolean {
  return (
    type === "hero" ||
    type === "split" ||
    type === "banner" ||
    type === "imageText" ||
    type === "contact" ||
    type === "imagePair" ||
    type === "highlight" ||
    type === "article"
  );
}

export function blockHasTheme(type: BlockType): boolean {
  return usesExpandedTheme(type);
}

const expandedThemeTypes = new Set<BlockType>([
  "imageText",
  "lead",
  "text",
  "contactUs",
  "contact",
  "imagePair",
  "split",
  "sectionHeader",
  "article",
  "statement",
]);

export function usesExpandedTheme(type: BlockType): boolean {
  return expandedThemeTypes.has(type);
}

export function resolveTheme(block: CmsBlock): BlockTheme {
  if (block.theme) return block.theme;
  if (block.type === "imageText" || block.type === "contact" || block.type === "imagePair") {
    return block.imageSide === "left" ? "mist" : "sand";
  }
  if (block.type === "split") return "mist";
  return "white";
}

const none: Omit<BlockFields, "heading" | "body"> = {
  eyebrow: false,
  image: false,
  image2: false,
  button: false,
  imageSide: false,
  align: false,
  theme: false,
  quote: false,
};

export function fieldsFor(type: BlockType): BlockFields {
  if (type === "banner") {
    return { ...none, heading: "Rubrik", body: "Liten rad", image: true };
  }

  if (type === "imageText") {
    return {
      ...none,
      heading: "Rubrik",
      body: "Text",
      eyebrow: true,
      image: true,
      button: true,
      imageSide: true,
      theme: true,
    };
  }

  if (type === "contact") {
    return {
      ...none,
      heading: "Rubrik",
      body: null,
      eyebrow: true,
      image: true,
      button: true,
      imageSide: true,
      theme: true,
    };
  }

  if (type === "imagePair") {
    return {
      ...none,
      heading: "Rubrik",
      body: "Text",
      eyebrow: true,
      image: true,
      image2: true,
      button: true,
      imageSide: true,
      theme: true,
    };
  }

  if (type === "sectionHeader") {
    return { ...none, heading: "Rubrik", body: null, align: true, theme: true };
  }

  if (type === "highlight") {
    return { ...none, heading: "Rubrik", body: "Liten rad", image: true, button: true };
  }

  if (type === "contactCards") {
    return { ...none, heading: "Rubrik", body: "Text", button: true };
  }

  if (type === "contactUs") {
    return { ...none, heading: "Rubrik", body: "Text", button: true, theme: true };
  }

  if (type === "expertise" || type === "offering" || isNewsBlock(type)) {
    return { ...none, heading: "Rubrik", body: null };
  }

  if (type === "statement") {
    return { ...none, heading: null, body: "Text", button: true, theme: true };
  }

  if (type === "lead" || type === "text") {
    return { ...none, heading: "Rubrik", body: "Text", theme: true };
  }

  if (type === "pageHeader" || type === "textColumn") {
    return { ...none, heading: null, body: null };
  }

  if (type === "article") {
    return {
      ...none,
      heading: "Rubrik",
      body: "Text",
      quote: true,
      image: true,
      imageSide: true,
      theme: true,
    };
  }

  if (type === "split") {
    return { ...none, heading: "Rubrik", body: "Text", image: true, theme: true };
  }

  return {
    ...none,
    heading: "Rubrik",
    body: "Text",
    image: blockHasImage(type),
  };
}
