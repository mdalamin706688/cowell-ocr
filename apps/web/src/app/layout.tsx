import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["400", "500", "600"],
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "COWELL OCR — 現地調査デジタル化",
  description: "LED現地調査シートをOCRでGoogleスプレッドシートに自動変換",
  ...(basePath
    ? { metadataBase: new URL(`https://mdalamin706688.github.io${basePath}`) }
    : {}),
  icons: {
    icon: [
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
      { url: `${basePath}/favicon.png`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/favicon.ico`, sizes: "any" },
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
        <link rel="icon" href={iconSvg} type="image/svg+xml" sizes="any" />
        <link rel="icon" href={iconPng} type="image/png" sizes="32x32" />
        <link rel="icon" href={iconIco} sizes="any" />
        <link rel="shortcut icon" href={iconIco} />
        <link rel="apple-touch-icon" href={appleHref} sizes="180x180" />
      </head>
      <body
        className={`${inter.variable} ${noto.variable} notranslate font-sans antialiased`}
        translate="no"
        suppressHydrationWarning
      >
        <div className="grain" aria-hidden="true" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
