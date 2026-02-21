import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "700"],
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  variable: "--font-noto-serif-jp",
  weight: ["400", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "音詠 (Oto-Yomi)",
  description: "五七五を詠み、音を奏でる現代の松尾芭蕉育成ゲーム",
  openGraph: {
    title: "音詠 (Oto-Yomi)",
    description: "五七五を詠み、音を奏でる現代の松尾芭蕉育成ゲーム",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={cn(
          "min-h-screen bg-[#0F0F1A] font-sans antialiased text-[#F5F0E8]",
          notoSansJP.variable,
          notoSerifJP.variable,
          inter.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
