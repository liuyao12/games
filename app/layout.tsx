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
  metadataBase: new URL("https://yin-yang-ping-pong.liuyao401844.chatgpt.site"),
  title: "Yin · Yang Ping Pong",
  description: "A two-player, two-ball game of balance for touchscreens and mouse.",
  openGraph: {
    title: "Yin · Yang Ping Pong",
    description: "Two players. Two balls. One balance.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Yin and Yang balls launching toward one another" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yin · Yang Ping Pong",
    description: "Two players. Two balls. One balance.",
    images: ["/og.png"],
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
