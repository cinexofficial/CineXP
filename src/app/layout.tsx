import type { Metadata, Viewport } from "next";
import Navbar from "@/components/ui/Navbar";
import CacheBuster from "@/components/CacheBuster";
import SiteFooter from "@/components/ui/SiteFooter";
import ExperienceProvider from "@/components/ui/ExperienceProvider";
import ExperienceAnalytics from '@/components/ExperienceAnalytics';
import { Outfit } from "next/font/google";
import "./globals.css";
import "./experience.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
});
export const metadata: Metadata = {
  title: {
    template: "%s | CineXP",
    default: "CineXP | Premium Streaming",
  },
  description:
    "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CineXP",
    statusBarStyle: "black-translucent",
  },
  applicationName: "CineXP",
  metadataBase: new URL("https://www.cinexp.site"),
  openGraph: {
    title: "CineXP | Premium Streaming",
    description:
      "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
    url: "https://www.cinexp.site",
    siteName: "CineXP",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://www.cinexp.site/og-rect-v2.png",
        width: 1200,
        height: 630,
        alt: "CineXP - Premium Streaming",
      },
      {
        url: "https://www.cinexp.site/og-square-v2.png",
        width: 800,
        height: 800,
        alt: "CineXP - Premium Streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CineXP | Premium Streaming",
    description:
      "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
    images: ["https://www.cinexp.site/og-rect-v2.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon-192x192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#101210",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://www.cinexp.site/#website",
                  url: "https://www.cinexp.site/",
                  name: "CineXP",
                  alternateName: ["CineXP.site", "Cine XP"],
                  description:
                    "Advanced Movie & TV Series streaming platform. Watch the latest hit movies and TV shows for free in HD.",
                  publisher: {
                    "@id": "https://www.cinexp.site/#organization",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://www.cinexp.site/#organization",
                  name: "CineXP",
                  url: "https://www.cinexp.site/",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://www.cinexp.site/og-square-v2.png",
                    width: 800,
                    height: 800,
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body>
        <ExperienceProvider>
          <a href="#main-content" className="cx-skip">
            Skip to content
          </a>
          <Navbar />
          {process.env.NODE_ENV === 'development' && process.env.TMDB_PREVIEW_ORIGIN && <div className="cx-preview-notice" role="status">Design preview · sample catalog · live playback requires configured sources</div>}
          <CacheBuster />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </ExperienceProvider>
        <ExperienceAnalytics />
      </body>
    </html>
  );
}
