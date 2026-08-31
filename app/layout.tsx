import type { Metadata } from "next";
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
  metadataBase: new URL("https://liuyao12.github.io/games/yin-yang/"),
  title: "Yin · Yang — Territory in Motion",
  description: "Place and aim two opposing balls, then watch them redraw the board one brick at a time.",
  openGraph: {
    title: "Yin · Yang — Territory in Motion",
    description: "Choose both opening moves. Every strike changes the frontier.",
  },
  twitter: {
    card: "summary",
    title: "Yin · Yang — Territory in Motion",
    description: "Choose both opening moves. Every strike changes the frontier.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
