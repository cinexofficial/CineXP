import type { Metadata } from "next";
import DownloadClient from "./DownloadClient";
import { getAdSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Download",
  description: "Access your download and subtitle files.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const adSettings = await getAdSettings();

  return (
    <div className="page-wrapper container">
      <DownloadClient
        key={resolvedParams.token}
        token={resolvedParams.token}
        waitingPageEnabled={
          adSettings.placements['download-below-actions'].enabled
        }
        networkEnabled={adSettings.placements['download-below-actions'].networkEnabled}
      />
    </div>
  );
}
