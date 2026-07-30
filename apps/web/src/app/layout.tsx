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
  title: "Cowell OCR — 現地調査デジタル化",
  description: "LED現地調査シートをOCRでGoogleスプレッドシートに自動変換",
  ...(basePath
    ? { metadataBase: new URL(`https://mdalamin706688.github.io${basePath}`) }
    : {}),
  icons: {
    icon: [
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
      { url: `${basePath}/icon.svg`, type: "image/svg+xml" },
    ],
    apple: [{ url: `${basePath}/apple-touch-icon.svg`, sizes: "180x180", type: "image/svg+xml" }],
    shortcut: [`${basePath}/favicon.svg`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const iconHref = `${basePath}/favicon.svg`;
  const appleHref = `${basePath}/apple-touch-icon.svg`;

  return (
    <html lang="ja" translate="no" suppressHydrationWarning>
      <head>
        {/* Resolve persisted shell geometry before CSS paints. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    if (localStorage.getItem('cowell_sidebar_collapsed') === '1') {
      document.documentElement.classList.add('sidebar-collapsed');
    }
  } catch (e) {}
  document.documentElement.classList.add('sidebar-state-ready');
})();
`,
          }}
        />
        <meta name="google" content="notranslate" />
        <link rel="icon" href={iconHref} type="image/svg+xml" sizes="any" />
        <link rel="icon" href={iconHref} />
        <link rel="shortcut icon" href={iconHref} />
        <link rel="apple-touch-icon" href={appleHref} />
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
