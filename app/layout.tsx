import type { Metadata } from "next";
import { Geist, Geist_Mono, Gowun_Batang } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 체험단 리뷰(글쓰기) 도구라는 주제에 맞춘 편집기 느낌의 한글 세리프 — 제목에만 절제해서 사용한다.
const gowunBatang = Gowun_Batang({
  variable: "--font-gowun",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewAuto — 체험단 리뷰 자동화",
  description: "체험단 리뷰 글 작성을 반자동화하는 개인용 로컬 웹앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${gowunBatang.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page font-sans text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
