import type { Metadata } from "next";
import { RememberPublicPath } from "@/components/remember-public-path";
import { SITE_ORIGIN } from "@/lib/cms/library";
import { jsonLdHtml, organizationJsonLd, SITE_DESCRIPTION, SITE_NAME } from "@/lib/cms/seo";
import { lato } from "@/lib/design/lato";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_NAME,
    template: `%s – ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: SITE_NAME,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={lato.variable}>
      <body>
        <RememberPublicPath />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(organizationJsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
