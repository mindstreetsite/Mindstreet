export type BlockType =
  | "hero"
  | "text"
  | "textColumn"
  | "split"
  | "banner"
  | "imageText"
  | "contact"
  | "contactCards"
  | "imagePair"
  | "sectionHeader"
  | "highlight"
  | "lead"
  | "article"
  | "expertise"
  | "offering"
  | "news"
  | "newsTwelve"
  | "statement"
  | "pageHeader";

export type ImageSide = "left" | "right";
export type BlockAlign = "left" | "center" | "right";
export type BlockTheme =
  | "sand"
  | "mist"
  | "cream"
  | "white"
  | "slate"
  | "coralTint"
  | "coral"
  | "sage"
  | "linen"
  | "ink"
  | "steel"
  | "fog"
  | "charcoal"
  | "rust"
  | "ice"
  | "blush";

export type CmsCard = {
  id: string;
  heading: string;
  body: string;
  href: string;
  image?: string;
  publishedAt?: string;
  published?: boolean;
  buttonLabel?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
};

export type CmsBlock = {
  id: string;
  type: BlockType;
  heading: string;
  body: string;
  items?: CmsCard[];
  image?: string;
  image2?: string;
  eyebrow?: string;
  buttonLabel?: string;
  buttonHref?: string;
  quote?: string;
  quoteCredit?: string;
  quoteAfter?: number;
  publishedAt?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  imageSide?: ImageSide;
  align?: BlockAlign;
  theme?: BlockTheme;
  shape?: boolean;
  parentSlug?: string;
  menu?: CmsLink[];
};

export type CmsLink = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export type CmsPage = {
  slug: string;
  title: string;
  parentSlug?: string;
  published: boolean;
  links: CmsLink[];
  blocks: CmsBlock[];
};
