import type { Metadata } from "next";
import { Syne, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Cowell OCR — 現地調査デジタル化",
  description: "LED現地調査シートをOCRでGoogleスプレッドシートに自動変換",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${syne.variable} ${noto.variable} font-sans antialiased`}>
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
