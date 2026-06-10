import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/context/app-context";
import { Header } from "@/components/header";
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
  title: "GoalGuru — Pasaulio čempionato totalizatorius",
  description:
    "Pasaulio čempionato 2026 spėjimų žaidimas. Tik virtualūs taškai — jokių pinigų.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="lt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-slate-100">
        <AppProvider>
          <Header />
          <main className="mx-auto max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
            GoalGuru · FIFA World Cup 2026 · Tik žaidimo taškai — jokių pinigų
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
