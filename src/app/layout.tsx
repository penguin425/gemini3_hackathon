import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP, Yuji_Mai } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const yujiMai = Yuji_Mai({
  variable: "--font-yuji-mai",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "俳句DJ 🐧 〜 ペン芭蕉のビートチャレンジ 〜",
  description: "AIがあなたの俳句を解析し、オリジナルの和風BGMを生成！伝説のDJペン芭蕉が採点する新感覚歌遊びゲーム。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} ${yujiMai.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}