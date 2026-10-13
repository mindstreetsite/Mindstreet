export type BlockType =
  | "hero"
  | "text"
  | "textColumn"
  | "image"
  | "banner"
  | "imageText"
  | "contact"
  | "contactCards"
  | "contactUs"
  | "imagePair"
  | "sectionHeader"
  | "article"
  | "expertise"
  | "offering"
  | "news"
  | "newsTwelve"
  | "articleList"
  | "statement"
  | "pageHeader";

export type ImageSide = "left" | "right";
export type BlockAlign = "left" | "center" | "right";
export type BlockSize = "large" | "small";
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
  button2Label?: string;
  button2Href?: string;
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
  size?: BlockSize;
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

export type PageRole = "home" | "news";

export type CmsPage = {
  slug: string;
  title: string;
  parentSlug?: string;
  role?: PageRole;
  published: boolean;
  links: CmsLink[];
  blocks: CmsBlock[];
  pending?: CmsBlock[];
};
