import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "2026 연봉 실수령액 계산기 | 주휴수당 & 4대보험 계산",
  description:
    "2026년 최신 4대보험 요율 반영 연봉·월급 실수령액 계산기. 아르바이트 시급 주휴수당, 주급, 월급 환산까지 무료로 1초 만에 계산하세요. 국민연금 4.5%, 건강보험 3.545%, 장기요양 12.95%, 고용보험 0.9% 완벽 반영.",
  keywords: [
    "연봉 실수령액 계산기",
    "2026 연봉 계산기",
    "월급 실수령액",
    "주휴수당 계산기",
    "4대보험 계산",
    "시급 계산기",
    "알바 주휴수당",
    "근로소득세 계산",
    "실수령액",
    "2026 최저시급",
  ],
  openGraph: {
    title: "2026 연봉 실수령액 & 주휴수당 통합 계산기",
    description:
      "세전 연봉·월급 실수령액부터 아르바이트 주휴수당·주급·월급까지 1초 만에 계산. 2026년 최신 4대보험 요율 완벽 반영.",
    type: "website",
    locale: "ko_KR",
    url: "https://salary-calculator-seven-sepia.vercel.app",
    siteName: "2026 연봉 계산기",
  },
  twitter: {
    card: "summary_large_image",
    title: "2026 연봉 실수령액 & 주휴수당 통합 계산기",
    description:
      "2026년 최신 4대보험 요율 반영. 연봉·월급·시급·주휴수당 무료 계산.",
  },
  verification: {
    google: "coYlpU9HVJXVvz9RmjkNZQHXaurqiUiewwUGPb8qXCw",
    other: {
      "naver-site-verification": "d7341c532adf99346c1686b70b439a45b2fb9dfd",
    },
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://salary-calculator-seven-sepia.vercel.app",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4403789108346139"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
