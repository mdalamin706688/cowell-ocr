import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

// Fonts load via <link> at runtime — next/font/google fetches at build time,
// which fails on CI runners / Turbopack. CSS vars live in globals.css.

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "COWELL OCR — 現地調査デジタル化",
  description: "LED現地調査シートをOCRでGoogleスプレッドシートに自動変換",
  ...(basePath
    ? { metadataBase: new URL(`https://mdalamin706688.github.io${basePath}`) }
    : {}),
  icons: {
    icon: [
      { url: `${basePath}/favicon.ico`, sizes: "any" },
      { url: `${basePath}/favicon.png`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/favicon-16.png`, sizes: "16x16", type: "image/png" },
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
    ],
    apple: [
      { url: `${basePath}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
      { url: `${basePath}/apple-touch-icon.svg`, sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: [`${basePath}/favicon.ico`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const iconSvg = `${basePath}/favicon.svg`;
  const iconPng = `${basePath}/favicon.png`;
  const iconIco = `${basePath}/favicon.ico`;
  const appleHref = `${basePath}/apple-touch-icon.png`;

  return (
    <html lang="ja" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600&display=swap"
        />
        <link rel="icon" href={iconIco} sizes="any" />
        <link rel="icon" href={iconPng} type="image/png" sizes="32x32" />
        <link rel="icon" href={iconSvg} type="image/svg+xml" sizes="any" />
        <link rel="shortcut icon" href={iconIco} />
        <link rel="apple-touch-icon" href={appleHref} sizes="180x180" />
      </head>
      <body
        className="notranslate font-sans antialiased"
        translate="no"
        suppressHydrationWarning
      >
        <div className="grain" aria-hidden="true" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
