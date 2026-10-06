import { NewsBlock } from "@/components/cms/news-block";
import { OfferingBlock } from "@/components/cms/offering-block";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { renderInline } from "@/lib/cms/inline";
import { articleParagraphs, quoteAfterIndex, resolveTheme } from "@/lib/cms/library";
import { formatNewsDate } from "@/lib/cms/news-date";
import type { CmsBlock, CmsLink, CmsPage } from "@/lib/cms/types";
import type { ReactNode } from "react";
import "./page-blocks.css";

export function PageBlocks({
  page,
  menu,
  preview = false,
  publishedAt = "",
}: {
  page: CmsPage;
  menu?: CmsLink[];
  preview?: boolean;
  publishedAt?: string;
}) {
  const firstIsHero = page.blocks[0]?.type === "hero";
  const hasPageHeader = page.blocks.some((block) => block.type === "pageHeader");
  const parentHref = page.parentSlug ? `/${page.parentSlug}` : "/";

  return (
    <div id="top">
      {firstIsHero || hasPageHeader ? null : (
        <header className="cms-topbar">
          <a href="/" className="logo-link">
            <img src="/icons/logo.svg" width={239} height={46} alt="Mindstreet" />
          </a>
        </header>
      )}
      {page.blocks.map((block, index) => (
        <BlockView
          key={block.id}
          block={block}
          menu={menu}
          withHeader={firstIsHero && index === 0}
          preview={preview}
          parentHref={parentHref}
          publishedAt={publishedAt}
        />
      ))}
      {page.links.length > 0 ? (
        <nav className="cms-page-links" aria-label="Länkar">
          <ul>
            {page.links.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <SiteFooter />
    </div>
  );
}

function articleBackHref(parentSlug: string | undefined, pageParentHref: string): string {
  if (parentSlug === undefined) return pageParentHref;
  return parentSlug ? `/${parentSlug}` : "/";
}

function BlockView({
  block,
  menu,
  withHeader,
  preview,
  parentHref,
  publishedAt,
}: {
  block: CmsBlock;
  menu?: CmsLink[];
  withHeader: boolean;
  preview: boolean;
  parentHref: string;
  publishedAt: string;
}) {
  if (block.type === "pageHeader") {
    return <Header variant="bar" items={menu} />;
  }

  if (block.type === "hero") {
    const heroButtons = [
      { label: block.buttonLabel?.trim() ?? "", href: block.buttonHref?.trim() || "#" },
      { label: block.button2Label?.trim() ?? "", href: block.button2Href?.trim() || "#" },
    ].filter((button) => button.label);
    return (
      <section className="hero cms-hero">
        {block.image ? (
          <img className="hero-photo" src={block.image} alt="" />
        ) : (
          <div className="hero-photo cms-hero-fallback" />
        )}
        <div className="hero-shade" />
        {block.shape ? (
          <img className="hero-shape" src="/icons/hero-shape.svg" alt="" />
        ) : null}
        {withHeader ? <Header items={menu} /> : null}
        <div className="hero-content">
          <div>
            <h1>{block.heading}</h1>
            {block.body ? <p className="cms-hero-lead">{block.body}</p> : null}
          </div>
          {heroButtons.length > 0 ? (
            <div className="hero-actions">
              {heroButtons.map((button, index) => (
                <a key={index} className="btn btn-light" href={button.href}>
                  {button.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (block.type === "text") {
    return (
      <ThemedSurface block={block}>
        <div className="intro">
          <h2>{block.heading}</h2>
          <p>{block.body}</p>
        </div>
      </ThemedSurface>
    );
  }

  if (block.type === "textColumn") {
    return (
      <section className="cms-text-column">
        {(block.items ?? []).map((item) => {
          const paragraphs = articleParagraphs(item.body);
          if (!item.heading.trim() && paragraphs.length === 0) return null;
          return (
            <div key={item.id} className="cms-text-column-section">
              {item.heading.trim() ? <h2>{item.heading}</h2> : null}
              {paragraphs.map((paragraph, index) => (
                <ArticleParagraph key={index} text={paragraph} />
              ))}
            </div>
          );
        })}
      </section>
    );
  }

  if (block.type === "split") {
    const theme = resolveTheme(block);
    return (
      <section className={`about cms-theme-${theme}`}>
        {(block.shape ?? theme === "mist") ? <ModuleShape /> : null}
        <div className="about-inner">
          {block.image ? (
            <img className="about-photo" src={block.image} alt="" />
          ) : (
            <div className="about-photo cms-photo-fallback" />
          )}
          <div className="about-copy">
            <h2>{block.heading}</h2>
            <p>{block.body}</p>
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "banner") {
    return (
      <section className="seminar-wrap">
        <div className="seminar">
          {block.image ? (
            <img src={block.image} alt="" />
          ) : (
            <div className="cms-banner-fallback" />
          )}
          <div className="seminar-shade" />
          <div className="seminar-copy">
            {block.body ? <p>{block.body}</p> : null}
            <h2>{block.heading}</h2>
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "imageText" || block.type === "contact") {
    const side = block.imageSide === "left" ? "left" : "right";
    const theme = resolveTheme(block);
    return (
      <section className={`cms-media cms-theme-${theme}`}>
        {(block.shape ?? theme === "mist") ? (
          <ModuleShape align={side === "right" ? "left" : undefined} />
        ) : null}
        <div className={`cms-media-inner is-image-${side}`}>
          {side === "left" ? <ModulePhoto src={block.image} /> : null}
          <ModuleCopy block={block} />
          {side === "right" ? <ModulePhoto src={block.image} /> : null}
        </div>
      </section>
    );
  }

  if (block.type === "imagePair") {
    const side = block.imageSide === "right" ? "right" : "left";
    const theme = resolveTheme(block);
    return (
      <section className={`cms-media cms-media-pair cms-theme-${theme}`}>
        {(block.shape ?? theme === "mist") ? (
          <ModuleShape align={side === "right" ? "left" : undefined} />
        ) : null}
        <div className={`cms-media-inner is-image-${side}`}>
          {side === "left" ? <PairPhotos block={block} /> : null}
          <ModuleCopy block={block} />
          {side === "right" ? <PairPhotos block={block} /> : null}
        </div>
      </section>
    );
  }

  if (block.type === "sectionHeader") {
    const align = block.align === "center" ? "center" : "left";
    return (
      <ThemedSurface block={block}>
        <div className={`cms-divider is-${align}`}>
          <div className="cms-divider-inner">
            <h2>{block.heading}</h2>
          </div>
        </div>
      </ThemedSurface>
    );
  }

  if (block.type === "highlight") {
    return (
      <section className="seminar-wrap">
        <div className="seminar">
          {block.image ? (
            <img src={block.image} alt="" />
          ) : (
            <div className="cms-banner-fallback" />
          )}
          <div className="seminar-shade" />
          <div className="seminar-copy">
            {block.body ? <p>{block.body}</p> : null}
            <h2>{block.heading}</h2>
            {block.buttonLabel ? (
              <a className="btn btn-cream" href={block.buttonHref || "#"}>
                {block.buttonLabel}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "article") {
    const paragraphs = articleParagraphs(block.body);
    const quote = block.quote?.trim() ?? "";
    const credit = block.quoteCredit?.trim() ?? "";
    const after = quote ? quoteAfterIndex(block.quoteAfter, paragraphs.length) : -1;
    const articleDate = block.publishedAt?.trim() || publishedAt;
    const dateLabel = formatNewsDate(articleDate);
    return (
      <ThemedSurface block={block}>
        <a className="cms-article-back" href={articleBackHref(block.parentSlug, parentHref)}>
          <ArticleBackIcon />
          Tillbaka
        </a>
        <article className="cms-article">
          <div className="cms-article-intro">
            {block.heading ? <h2>{block.heading}</h2> : null}
            {dateLabel ? (
              <time className="cms-article-date" dateTime={articleDate}>
                {dateLabel}
              </time>
            ) : null}
          </div>
          <ModulePhoto src={block.image} />
          <div className="cms-article-copy">
            {after === -1 && quote ? <ArticleQuote quote={quote} credit={credit} /> : null}
            {paragraphs.map((paragraph, index) => (
              <div key={index}>
                <ArticleParagraph text={paragraph} />
                {after === index && quote ? <ArticleQuote quote={quote} credit={credit} /> : null}
              </div>
            ))}
          </div>
        </article>
      </ThemedSurface>
    );
  }

  if (block.type === "lead") {
    return (
      <ThemedSurface block={block}>
        <div className="intro">
          <h2>{block.heading}</h2>
          <p>{block.body}</p>
        </div>
      </ThemedSurface>
    );
  }

  if (block.type === "statement") {
    const align = block.align === "left" || block.align === "right" ? block.align : "center";
    const theme = resolveTheme(block);
    return (
      <section className={`cms-statement is-${align} cms-theme-${theme}`}>
        {(block.shape ?? theme === "mist") ? <ModuleShape /> : null}
        <div className="cms-statement-inner">
          {block.body ? <p>{block.body}</p> : null}
          {block.buttonLabel ? (
            <a className="btn cms-statement-link" href={block.buttonHref || "#"}>
              {block.buttonLabel}
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  if (block.type === "offering") {
    return <OfferingBlock heading={block.heading} items={block.items ?? []} />;
  }

  if (block.type === "news" || block.type === "newsTwelve") {
    return (
      <NewsBlock
        heading={block.heading}
        items={block.items ?? []}
        preview={preview}
        pageSize={block.type === "newsTwelve" ? 12 : 4}
      />
    );
  }

  if (block.type === "contactCards") {
    const items = block.items ?? [];
    return (
      <section className="cms-contact-cards">
        <div className="section-inner">
          {block.heading.trim() || block.body.trim() || block.buttonLabel?.trim() ? (
            <div className="cms-contact-cards-intro">
              {block.heading.trim() ? <h2>{block.heading}</h2> : null}
              {block.body.trim() ? <p className="cms-contact-cards-text">{block.body}</p> : null}
              {block.buttonLabel?.trim() ? (
                <a className="btn cms-statement-link" href={block.buttonHref?.trim() || "#"}>
                  {block.buttonLabel}
                </a>
              ) : null}
            </div>
          ) : null}
          <div className="cms-contact-card-grid">
            {items.map((item) => (
              <article key={item.id}>
                {item.image ? <img className="cms-contact-card-photo" src={item.image} alt="" /> : null}
                <ContactDetailList
                  icons
                  name={item.contactName}
                  title={item.contactTitle}
                  email={item.contactEmail}
                  phone={item.contactPhone}
                  linkedIn={item.contactLinkedIn}
                />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "expertise") {
    const items = block.items ?? [];
    return (
      <section className="cms-expertise">
        <div className="section-inner">
          {block.heading ? <h2>{block.heading}</h2> : null}
          <div className="cms-expertise-grid">
            {items.map((item) => (
              <article key={item.id}>
                {item.heading ? <h3>{item.heading}</h3> : null}
                {item.body ? <p>{item.body}</p> : null}
                <CardArrow heading={item.heading} href={item.href} />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return null;
}

function CardArrow({ heading, href }: { heading: string; href: string }) {
  const icon = <img className="cms-expertise-arrow" src="/icons/arrow.svg" width={23} height={23} alt="" />;
  if (!href.trim()) return icon;
  return (
    <a className="cms-expertise-link" href={href} aria-label={heading || href}>
      {icon}
    </a>
  );
}

function ThemedSurface({
  block,
  children,
}: {
  block: CmsBlock;
  children: React.ReactNode;
}) {
  const theme = resolveTheme(block);
  return (
    <section className={`cms-surface cms-theme-${theme}`}>
      {(block.shape ?? theme === "mist") ? <ModuleShape /> : null}
      <div className="cms-surface-inner">{children}</div>
    </section>
  );
}

function ModuleShape({ align }: { align?: "left" }) {
  return (
    <img
      className={align === "left" ? "cms-media-shape is-left" : "cms-media-shape"}
      src="/icons/about-shape.svg"
      width={1440}
      height={833}
      alt=""
    />
  );
}

function contactHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function ContactDetailList({
  name = "",
  title = "",
  email = "",
  phone = "",
  linkedIn = "",
  icons = false,
}: {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  icons?: boolean;
}) {
  const lines = {
    name: name.trim(),
    title: title.trim(),
    email: email.trim(),
    phone: phone.trim(),
    linkedIn: linkedIn.trim(),
  };
  if (!lines.name && !lines.title && !lines.email && !lines.phone && !lines.linkedIn) return null;

  return (
    <ul className="cms-contact-lines">
      {lines.name ? <li>{lines.name}</li> : null}
      {lines.title ? <li>{lines.title}</li> : null}
      {lines.email ? (
        <li>
          <a href={`mailto:${lines.email}`}>
            {icons ? <MailIcon /> : null}
            {lines.email}
          </a>
        </li>
      ) : null}
      {lines.phone ? (
        <li>
          <a href={`tel:${lines.phone.replace(/[^\d+]/g, "")}`}>
            {icons ? <PhoneIcon /> : null}
            {lines.phone}
          </a>
        </li>
      ) : null}
      {lines.linkedIn ? (
        <li>
          <a href={contactHref(lines.linkedIn)} target="_blank" rel="noreferrer">
            {icons ? <LinkedInMark /> : null}
            LinkedIn
          </a>
        </li>
      ) : null}
    </ul>
  );
}

function MailIcon() {
  return (
    <svg className="cms-contact-icon" viewBox="0 0 24 18" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2.4 1.2h19.2c1 0 1.8.8 1.8 1.8v12c0 1-.8 1.8-1.8 1.8H2.4c-1 0-1.8-.8-1.8-1.8v-12c0-1 .8-1.8 1.8-1.8zm1 2.2 8.6 6.6 8.6-6.6-1.1-1.1L12 8.2 4.5 2.3 3.4 3.4z"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="cms-contact-icon is-phone" viewBox="0 0 42 41" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.5 0Q11 0 13 4.5Q15 9 15 10.5Q15 12 12.5 14.5Q10 17 11 19Q12 21 15 24Q18 27 21.5 29Q25 31 27.5 28.5Q30 26 31.5 26Q33 26 37.5 28Q42 30 41 35.5Q40 41 35 41Q30 41 27 40Q24 39 19 36.5Q14 34 11 31Q8 28 6.5 26Q5 24 2.5 18Q0 12 0 7.5Q0 3 3.5 2Q7 1 7.5 0.5Q8 0 9.5 0Z"
      />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg className="cms-contact-icon is-in" viewBox="3.3 3.2 17.4 17.5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"
      />
    </svg>
  );
}

function ContactLines({ block }: { block: CmsBlock }) {
  if (block.type !== "contact") return null;
  return (
    <ContactDetailList
      icons
      name={block.contactName}
      title={block.contactTitle}
      email={block.contactEmail}
      phone={block.contactPhone}
      linkedIn={block.contactLinkedIn}
    />
  );
}

function ModuleCopy({ block }: { block: CmsBlock }) {
  return (
    <div className="cms-module-copy">
      {block.eyebrow ? <p className="cms-eyebrow">{block.eyebrow}</p> : null}
      {block.heading ? <h2>{block.heading}</h2> : null}
      <ContactLines block={block} />
      {block.body ? <p className="cms-module-text">{block.body}</p> : null}
      {block.buttonLabel ? (
        <a className="btn btn-dark" href={block.buttonHref || "#"}>
          {block.buttonLabel}
        </a>
      ) : null}
    </div>
  );
}

function ArticleParagraph({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];
  let key = 0;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push(<p key={key++}>{renderInline(paragraph.join("\n"))}</p>);
    paragraph = [];
  }

  function flushBullets() {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key++}>
        {bullets.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  }

  function flushNumbers() {
    if (numbers.length === 0) return;
    blocks.push(
      <ol key={key++}>
        {numbers.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ol>,
    );
    numbers = [];
  }

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      flushParagraph();
      flushBullets();
      flushNumbers();
      blocks.push(
        <p key={key++} className="cms-article-subhead">
          {renderInline(line.slice(2))}
        </p>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      flushNumbers();
      bullets.push(line.slice(2));
      continue;
    }
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      flushBullets();
      numbers.push(numbered[1]);
      continue;
    }
    flushBullets();
    flushNumbers();
    paragraph.push(line);
  }

  flushParagraph();
  flushBullets();
  flushNumbers();
  return <>{blocks}</>;
}

function ArticleQuote({ quote, credit }: { quote: string; credit: string }) {
  return (
    <blockquote>
      <div className="cms-article-quote-text">
        <ArticleParagraph text={quote} />
      </div>
      {credit ? <p className="cms-article-quote-credit">{renderInline(credit)}</p> : null}
    </blockquote>
  );
}

function ArticleBackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19 11H7.83l4.88-4.88a1 1 0 0 0-1.42-1.41l-6.59 6.58a1 1 0 0 0 0 1.42l6.59 6.58a1 1 0 0 0 1.42-1.41L7.83 13H19a1 1 0 0 0 0-2Z"
      />
    </svg>
  );
}

function ModulePhoto({ src }: { src?: string }) {
  if (src) {
    return <img className="cms-media-photo" src={src} alt="" />;
  }
  return <div className="cms-media-photo cms-photo-fallback" />;
}

function PairPhotos({ block }: { block: CmsBlock }) {
  return (
    <div className="cms-pair-photos">
      {block.image ? (
        <img src={block.image} alt="" />
      ) : (
        <div className="cms-photo-fallback" />
      )}
      {block.image2 ? (
        <img src={block.image2} alt="" />
      ) : (
        <div className="cms-photo-fallback" />
      )}
    </div>
  );
}
