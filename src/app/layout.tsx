import type { Metadata } from "next";
import { lato } from "@/lib/design/lato";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mindstreet",
  description:
    "Vi kan bank och finans. Erfarna, kompetenta konsulter som kliver in och får saker gjorda.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={lato.variable}>
      <body>{children}</body>
    </html>
  );
}
