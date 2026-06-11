import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pastex | Secure P2P File & Text Sharing",
  description: "Pastex is a secure, real-time, peer-to-peer text and file sharing web application. No logins, no limits, instant transfers. Open-source and built for speed.",
  keywords: "p2p file sharing, webrtc, secure text sharing, no login file transfer, open source, pastex, neo brutalism UI",
  authors: [{ name: "Pastex" }],
  creator: "Pastex",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pastex.app",
    title: "Pastex | Secure P2P File & Text Sharing",
    description: "Instantly share files and text peer-to-peer securely. No logins required.",
    siteName: "Pastex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pastex | Secure P2P File & Text Sharing",
    description: "Instantly share files and text peer-to-peer securely. No logins required.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-display selection:bg-neo-black selection:text-neo-yellow">{children}</body>
    </html>
  );
}
