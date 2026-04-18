import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/ui/Navbar";
import CommandPalette from "@/components/ui/CommandPalette";
import InstallPWA from "@/components/ui/InstallPWA";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineXP | Premium Streaming",
  description: "Advanced Movie & TV Series streaming platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CineXP",
    statusBarStyle: "black-translucent",
  },
  applicationName: "CineXP",
};

export const viewport: Viewport = {
  themeColor: "#04010a",
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
    <html lang="en">
      <body>
        <Navbar />
        <CommandPalette />
        <InstallPWA />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
