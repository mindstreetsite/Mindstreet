import { ArticleBackLink } from "@/components/cms/article-back-link";
import { ContactFormFields } from "@/components/cms/contact-form";
import { NewsBlock } from "@/components/cms/news-block";
import { OfferingBlock } from "@/components/cms/offering-block";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { blockSurfaceProps } from "@/lib/cms/block-style";
import { figureFill, surfaceById } from "@/lib/design/palette";
import { HeadingText, plainText, renderBreaks, renderInline, RichText } from "@/lib/cms/inline";
import { articleParagraphs, quoteAfterIndex, resolveTheme } from "@/lib/cms/library";
import { formatNewsDate } from "@/lib/cms/news-date";
import type { CmsBlock, CmsCard, CmsLink, CmsPage, ShapeColor } from "@/lib/cms/types";
import "./page-blocks.css";

function themedProps(block: CmsBlock, className: string) {
  const themed = block.theme ? `${className} cms-theme-${block.theme}` : className;
  const props = blockSurfaceProps(block, themed);
  const surface = block.theme ? surfaceById(block.theme) : undefined;
  if (!surface) return props;
  return {
    ...props,
    style: { ...props.style, background: surface.color, color: surface.on },
  };
}

export function PageBlocks({
  page,
  menu,
  preview = false,
  publishedAt = "",
  articleItems = [],
}: {
  page: CmsPage;
  menu?: CmsLink[];
  preview?: boolean;
  publishedAt?: string;
  articleItems?: CmsCard[];
}) {
  const first = page.blocks[0]?.type;
  const firstIsHero = first === "hero";
  const hasOwnHeader = firstIsHero || first === "pageHeader" || first === "contactUs";
  const parentHref = page.parentSlug ? `/${page.parentSlug}` : "/";
  const listsNews =
    page.role === "news" &&
    !page.blocks.some(
      (block) =>
        block.type === "articleList" || block.type === "news" || block.type === "newsTwelve",
    );
  const newsFeed = listsNews
    ? preview
      ? articleItems
      : articleItems.filter((item) => item.published !== false)
    : [];

  return (
    <div id="top">
      {hasOwnHeader ? null : <Header variant="bar" theme="ink" items={menu} />}
      {page.blocks.map((block, index) => (
        <BlockView
          key={block.id}
          block={block}
          menu={menu}
          withHeader={firstIsHero && index === 0}
          preview={preview}
          parentHref={parentHref}
          publishedAt={publishedAt}
          articleItems={articleItems}
        />
      ))}
      {newsFeed.length > 0 ? (
        <NewsBlock heading="Nyheter och artiklar" items={newsFeed} preview={preview} pageSize={12} />
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
  articleItems,
}: {
  block: CmsBlock;
  menu?: CmsLink[];
  withHeader: boolean;
  preview: boolean;
  parentHref: string;
  publishedAt: string;
  articleItems: CmsCard[];
}) {
  if (block.type === "pageHeader") {
    return <Header variant="bar" items={menu} theme={resolveTheme(block)} />;
  }

  if (block.type === "hero") {
    const heroButtons = [
      { label: block.buttonLabel?.trim() ?? "", href: block.buttonHref?.trim() || "#" },
      { label: block.button2Label?.trim() ?? "", href: block.button2Href?.trim() || "#" },
    ].filter((button) => button.label);
    return (
      <section {...blockSurfaceProps(block, "hero cms-hero")}>
        {block.image ? (
          <img className="hero-photo" src={block.image} alt="" />
        ) : (
          <div className="hero-photo cms-hero-fallback" />
        )}
        <div className="hero-shade" />
        {block.shape ? (
          <div
            className={figureClass("hero-shape", block.shapeColor ?? "veil")}
            style={figureStyle(block.shapeColor ?? "veil")}
            aria-hidden="true"
          />
        ) : null}
        {withHeader ? <Header items={menu} /> : null}
        <div className="hero-content">
          <div>
            <HeadingText text={block.heading} as="h1" />
            {block.body ? <RichText text={block.body} className="cms-hero-lead" /> : null}
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
      <ThemedSurface block={block} shape="text">
        <div className="intro">
          <div>
            <HeadingText text={block.heading} as="h2" />
          </div>
          {block.body.trim() ? (
            <div>
              <RichText text={block.body} />
            </div>
          ) : null}
        </div>
      </ThemedSurface>
    );
  }

  if (block.type === "image") {
    return (
      <section className="cms-image">
        {block.image ? (
          <img src={block.image} alt="" />
        ) : (
          <div className="cms-image-fallback" />
        )}
      </section>
    );
  }

  if (block.type === "textColumn") {
    return (
      <section {...themedProps(block, "cms-text-column")}>
        {(block.items ?? []).map((item) => {
          if (!item.heading.trim() && !item.body.trim()) return null;
          return (
            <div key={item.id} className="cms-text-column-section">
              {item.heading.trim() ? <HeadingText text={item.heading} as="h2" /> : null}
              {item.body.trim() ? <RichText text={item.body} /> : null}
            </div>
          );
        })}
      </section>
    );
  }

  if (block.type === "banner") {
    const size = block.size === "small" ? "small" : "large";
    return (
      <section {...blockSurfaceProps(block, "seminar-wrap")}>
        <div className={`seminar is-${size}`}>
          {block.image ? (
            <img src={block.image} alt="" />
          ) : (
            <div className="cms-banner-fallback" />
          )}
          <div className="seminar-shade" />
          <div className="seminar-copy">
            {block.body ? <RichText text={block.body} /> : null}
            <HeadingText text={block.heading} as="h2" />
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

  if (block.type === "imageText" || block.type === "contact") {
    const side = block.imageSide === "left" ? "left" : "right";
    const theme = resolveTheme(block);
    return (
      <section {...blockSurfaceProps(block, `cms-media cms-theme-${theme}`)}>
        {(block.shape ?? theme === "mist") ? (
          <ModuleShape align={side === "right" ? "left" : undefined} color={block.shapeColor} />
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
      <section {...blockSurfaceProps(block, `cms-media cms-media-pair cms-theme-${theme}`)}>
        {(block.shape ?? theme === "mist") ? (
          <ModuleShape align={side === "right" ? "left" : undefined} color={block.shapeColor} />
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
            <HeadingText text={block.heading} as="h2" />
          </div>
        </div>
      </ThemedSurface>
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
        <div className="cms-article-back-bar">
          <ArticleBackLink href={articleBackHref(block.parentSlug, parentHref)}>
            <ArticleBackIcon />
            Tillbaka
          </ArticleBackLink>
        </div>
        <article className="cms-article">
          <div className="cms-article-intro">
            {block.heading ? <HeadingText text={block.heading} as="h2" /> : null}
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
                <RichText text={paragraph} />
                {after === index && quote ? <ArticleQuote quote={quote} credit={credit} /> : null}
              </div>
            ))}
          </div>
        </article>
      </ThemedSurface>
    );
  }

  if (block.type === "statement") {
    const align = block.align === "left" || block.align === "right" ? block.align : "center";
    const theme = resolveTheme(block);
    return (
      <section {...blockSurfaceProps(block, `cms-statement is-${align} cms-theme-${theme}`)}>
        {(block.shape ?? theme === "mist") ? <ModuleShape color={block.shapeColor} /> : null}
        <div className="cms-statement-inner">
          {block.body ? <RichText text={block.body} /> : null}
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
    return (
      <OfferingBlock
        heading={block.heading}
        items={block.items ?? []}
        {...themedProps(block, "offering")}
      />
    );
  }

  if (block.type === "news" || block.type === "newsTwelve") {
    return (
      <NewsBlock
        heading={block.heading}
        items={block.items ?? []}
        preview={preview}
        pageSize={block.type === "newsTwelve" ? 12 : 4}
        {...themedProps(block, "news")}
      />
    );
  }

  if (block.type === "articleList") {
    return (
      <NewsBlock
        heading={block.heading}
        items={articleItems}
        preview={preview}
        pageSize={12}
        {...themedProps(block, "news")}
      />
    );
  }

  if (block.type === "contactCards" || block.type === "contactUs") {
    const items = block.items ?? [];
    const cards = (
      <section
        {...(block.type === "contactCards"
          ? themedProps(block, "cms-contact-cards")
          : { className: "cms-contact-cards" })}
      >
        <div className="section-inner">
          {block.type === "contactCards" &&
          (block.heading.trim() || block.body.trim() || block.buttonLabel?.trim()) ? (
            <div className="cms-contact-cards-intro">
              {block.heading.trim() ? <HeadingText text={block.heading} as="h2" /> : null}
              {block.body.trim() ? <RichText text={block.body} className="cms-contact-cards-text" /> : null}
              {block.buttonLabel?.trim() ? (
                <a className="btn cms-statement-link" href={block.buttonHref?.trim() || "#"}>
                  {block.buttonLabel}
                </a>
              ) : null}
            </div>
          ) : null}
          {block.type === "contactUs" && block.buttonLabel?.trim() ? (
            <div className="cms-contact-cards-intro">
              <a className="btn cms-statement-link" href={block.buttonHref?.trim() || "#"}>
                {block.buttonLabel}
              </a>
            </div>
          ) : null}
          <div className="cms-contact-card-grid">
            {items.map((item) => (
              <article key={item.id}>
                {item.image ? <img className="cms-contact-card-photo" src={item.image} alt="" /> : null}
                <ContactDetailList
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
    if (block.type === "contactCards") return cards;
    const theme = resolveTheme(block);
    return (
      <div {...blockSurfaceProps(block, `cms-contact-us cms-theme-${theme}`)}>
        {(block.shape ?? true) ? (
          <div
            className={figureClass("cms-contact-us-shape", block.shapeColor)}
            style={figureStyle(block.shapeColor)}
            aria-hidden="true"
          />
        ) : null}
        <Header variant="bar" items={menu} />
        <div className="intro">
          <div>
            <HeadingText text={block.heading} as="h2" />
          </div>
          {block.body.trim() ? (
            <div>
              <RichText text={block.body} />
            </div>
          ) : null}
        </div>
        {cards}
      </div>
    );
  }

  if (block.type === "contactForm") {
    const address = block.heading.trim();
    return (
      <section className="cms-contact-form">
        <div className="section-inner">
          <div className="cms-contact-form-photo">
            {block.image ? <img src={block.image} alt="" /> : null}
            {address ? <p className="cms-contact-form-address">{renderBreaks(address)}</p> : null}
          </div>
          <ContactFormFields buttonLabel={block.buttonLabel?.trim() || "Submit"} />
        </div>
      </section>
    );
  }

  if (block.type === "expertise") {
    const items = block.items ?? [];
    return (
      <section {...themedProps(block, "cms-expertise")}>
        <div className="section-inner">
          {block.heading ? <HeadingText text={block.heading} as="h2" /> : null}
          <div className="cms-expertise-grid">
            {items.map((item) => (
              <article key={item.id}>
                {item.heading ? <HeadingText text={item.heading} as="h3" /> : null}
                {item.body ? <RichText text={item.body} /> : null}
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
    <a className="cms-expertise-link" href={href} aria-label={plainText(heading) || href}>
      {icon}
    </a>
  );
}

function ThemedSurface({
  block,
  children,
  shape,
}: {
  block: CmsBlock;
  children: React.ReactNode;
  shape?: "text";
}) {
  const theme = resolveTheme(block);
  return (
    <section {...blockSurfaceProps(block, `cms-surface cms-theme-${theme}`)}>
      {(block.shape ?? theme === "mist") ? <ModuleShape variant={shape} color={block.shapeColor} /> : null}
      <div className="cms-surface-inner">{children}</div>
    </section>
  );
}

function figureClass(base: string, color?: ShapeColor) {
  return `${base} is-figure-${color ?? "haze"}`;
}

function figureStyle(color?: ShapeColor): React.CSSProperties {
  return { background: figureFill(color) };
}

function ModuleShape({
  align,
  variant,
  color,
}: {
  align?: "left";
  variant?: "text";
  color?: ShapeColor;
}) {
  const className = [
    figureClass("cms-media-shape", color),
    align === "left" ? "is-left" : "",
    variant === "text" ? "is-text" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={className} style={figureStyle(color)} aria-hidden="true" />;
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
}: {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
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
      {lines.name ? <li className="cms-contact-name">{lines.name}</li> : null}
      {lines.title ? <li>{lines.title}</li> : null}
      {lines.email ? (
        <li className="cms-contact-email">
          <a href={`mailto:${lines.email}`}>{lines.email}</a>
        </li>
      ) : null}
      {lines.phone ? (
        <li>
          <a href={`tel:${lines.phone.replace(/[^\d+]/g, "")}`}>{lines.phone}</a>
        </li>
      ) : null}
      {lines.linkedIn ? (
        <li>
          <a href={contactHref(lines.linkedIn)} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </li>
      ) : null}
    </ul>
  );
}

function ContactLines({ block }: { block: CmsBlock }) {
  if (block.type !== "contact") return null;
  return (
    <ContactDetailList
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
      {block.eyebrow ? <p className="cms-eyebrow">{renderBreaks(block.eyebrow)}</p> : null}
      {block.heading ? <HeadingText text={block.heading} as="h2" /> : null}
      <ContactLines block={block} />
      {block.body ? (
        <div className="cms-module-text">
          <RichText text={block.body} />
        </div>
      ) : null}
      {block.buttonLabel ? (
        <a className="btn btn-dark" href={block.buttonHref || "#"}>
          {block.buttonLabel}
        </a>
      ) : null}
    </div>
  );
}

function ArticleQuote({ quote, credit }: { quote: string; credit: string }) {
  return (
    <blockquote>
      <div className="cms-article-quote-text">
        <RichText text={quote} />
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
