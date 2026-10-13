import { about, expertise, intro, seminar } from "@/content/home";
import type { CmsBlock, CmsPage } from "@/lib/cms/types";

const PARENT_SLUG = "expertomraden";
const experienceHeading =
  "Vi har en bred och lång samlad erfarenhet från bank och finans";

const sharedLeadHeading = "Betalningsmarknaden förändras i rasande fart.";
const sharedLeadBody =
  "Samtidigt som nya betaltjänster växer fram, ställs allt högre krav på att branschen ska anpassa sig till nya regler och ny infrastruktur.";

function block(id: string, type: CmsBlock["type"], rest: Omit<CmsBlock, "id" | "type">): CmsBlock {
  return { id, type, ...rest };
}

function areaPage({
  segment,
  title,
  leadHeading,
  leadBody,
}: {
  segment: string;
  title: string;
  leadHeading: string;
  leadBody: string;
}): CmsPage {
  return {
    slug: `${PARENT_SLUG}/${segment}`,
    title,
    parentSlug: PARENT_SLUG,
    published: true,
    links: [],
    blocks: [
      block(`${segment}-hero`, "hero", {
        heading: title,
        body: leadBody,
        image: "/images/hero.jpg",
      }),
      block(`${segment}-lead`, "text", {
        heading: leadHeading,
        body: leadBody,
      }),
      block(`${segment}-image`, "imageText", {
        heading: experienceHeading,
        body: about.body,
        eyebrow: "Om Mindstreet",
        buttonLabel: "Läs mer",
        buttonHref: "/#kontakt",
        imageSide: "right",
        image: "/images/about.jpg",
      }),
      block(`${segment}-banner`, "banner", {
        heading: seminar.title,
        body: seminar.kicker,
        buttonLabel: "Anmäl dig",
        buttonHref: "/#kontakt",
        image: "/images/seminar.jpg",
        size: "large",
      }),
    ],
  };
}

export const seedPages: CmsPage[] = [
  {
    slug: PARENT_SLUG,
    title: expertise.title,
    published: true,
    links: expertise.items.map((item) => ({
      label: item.title,
      href: item.href,
    })),
    blocks: [
      block("expertomraden-hero", "hero", {
        heading: expertise.title,
        body: sharedLeadBody,
        image: "/images/hero.jpg",
      }),
      block("expertomraden-lead", "text", {
        heading: intro.heading,
        body: intro.body,
      }),
      block("expertomraden-image", "imageText", {
        heading: experienceHeading,
        body: about.body,
        eyebrow: about.title,
        buttonLabel: about.cta.label,
        buttonHref: about.cta.href,
        imageSide: "right",
        image: about.image.src,
      }),
    ],
  },
  areaPage({
    segment: "betalningar",
    title: "Betalningar",
    leadHeading: sharedLeadHeading,
    leadBody: sharedLeadBody,
  }),
  areaPage({
    segment: "kreditrisk",
    title: "Kreditrisk",
    leadHeading: sharedLeadHeading,
    leadBody: sharedLeadBody,
  }),
  areaPage({
    segment: "aml",
    title: "AML",
    leadHeading: intro.heading,
    leadBody: intro.body,
  }),
  areaPage({
    segment: "systembyten",
    title: "Systembyten/Tech",
    leadHeading: sharedLeadHeading,
    leadBody: sharedLeadBody,
  }),
];
