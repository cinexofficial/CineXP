import type { Metadata, Viewport } from "next";
import Navbar from "@/components/ui/Navbar";
import InstallPWA from "@/components/ui/InstallPWA";
import CacheBuster from "@/components/CacheBuster";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Outfit } from 'next/font/google';
import Script from 'next/script';
import "./globals.css";

const outfit = Outfit({ 
  subsets: ['latin'], 
  display: 'swap', 
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700'] 
});
export const metadata: Metadata = {
  title: {
    template: "%s | CineXP",
    default: "CineXP | Premium Streaming",
  },
  description: "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CineXP",
    statusBarStyle: "black-translucent",
  },
  applicationName: "CineXP",
  metadataBase: new URL('https://www.cinexp.site'),
  openGraph: {
    title: "CineXP | Premium Streaming",
    description: "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
    url: 'https://www.cinexp.site',
    siteName: 'CineXP',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://www.cinexp.site/og-rect-v2.png',
        width: 1200,
        height: 630,
        alt: 'CineXP - Premium Streaming',
      },
      {
        url: 'https://www.cinexp.site/og-square-v2.png',
        width: 800,
        height: 800,
        alt: 'CineXP - Premium Streaming',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineXP | Premium Streaming',
    description: 'Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.',
    images: ['https://www.cinexp.site/og-rect-v2.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#04010a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { getAdSettings } from "@/lib/settings";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adSettings = await getAdSettings();

  return (
    <html lang="en" className={outfit.variable}>
      <head>
        <link rel="preconnect" href="https://pl29183322.profitablecpmratenetwork.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.highperformanceformat.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://www.cinexp.site/#website",
                  "url": "https://www.cinexp.site/",
                  "name": "CineXP",
                  "alternateName": ["CineXP.site", "Cine XP"],
                  "description": "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
                  "publisher": {
                    "@id": "https://www.cinexp.site/#organization"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": "https://www.cinexp.site/#organization",
                  "name": "CineXP",
                  "url": "https://www.cinexp.site/",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://www.cinexp.site/og-square-v2.png",
                    "width": 800,
                    "height": 800
                  }
                }
              ]
            }),
          }}
        />
      </head>
      <body>
        {adSettings.socialBarEnabled && (
          <Script src="https://eagerdazzle.com/5f/69/5d/5f695dea02fd6964afe023097b2af686.js" strategy="afterInteractive" />
        )}
        
        {/* Monetag MultiTag - Handles Popunder, Vignette, and Interstitials.
            Adsterra Popunder is commented out below to prevent double-popup user frustration. */}
        {adSettings.popunderEnabled && (
          <Script 
            src="https://quge5.com/88/tag.min.js" 
            strategy="afterInteractive"
            data-zone="241599"
            data-cfasync="false"
          />
        )}
        <BackgroundGradient />
        <Navbar />
        <InstallPWA />
        <CacheBuster />
        <main>
          {children}
        </main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
