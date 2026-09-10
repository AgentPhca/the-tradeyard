import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopOnNavigate } from "@/components/layout/ScrollToTopOnNavigate";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Condensed display face for the Card Detail page's player name only —
// everything else in the app stays on Inter.
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: "The Tradeyard",
  description: "Your trades happen on the Yard",
};

// Pinch-to-zoom is deliberately disabled (userScalable: false) for a more
// app-like feel on mobile — combined with never letting a focusable form
// field render below 16px (see components/ui/Input.tsx and friends),
// which is what actually triggers iOS Safari's own auto-zoom-on-focus.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${oswald.variable} bg-background font-sans text-text antialiased`}>
        <ScrollToTopOnNavigate />
        {children}
        <Footer />
      </body>
    </html>
  );
}
