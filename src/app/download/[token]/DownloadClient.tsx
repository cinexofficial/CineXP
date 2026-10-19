"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  VscArrowLeft,
  VscCloudDownload,
  VscError,
  VscFile,
} from "react-icons/vsc";
import AdSlot from "@/components/ads/AdSlot";
import styles from "./download.module.css";
import { trackExperience } from '@/lib/experience-analytics';

interface Download {
  url: string;
  title: string;
  quality: string;
  size: string;
  poster: string;
  subtitleUrl?: string;
}

export default function DownloadClient({
  token,
  waitingPageEnabled = true,
  networkEnabled = false,
}: {
  token: string;
  waitingPageEnabled?: boolean;
  networkEnabled?: boolean;
}) {
  const [download, setDownload] = useState<Download | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/download/resolve?token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.url)
          throw new Error(data.error || "This download is unavailable.");
        const fileUrl = new URL(data.url, window.location.origin);
        if (!['https:', 'http:'].includes(fileUrl.protocol)) throw new Error('This download link is not supported.');
        data.url = fileUrl.href;
        if (data.subtitleUrl) {
          try {
            const subtitleUrl = new URL(data.subtitleUrl, window.location.origin);
            data.subtitleUrl = ['https:', 'http:'].includes(subtitleUrl.protocol) ? subtitleUrl.href : undefined;
          } catch { data.subtitleUrl = undefined; }
        }
        return data as Download;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setDownload(data);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason.message || "Unable to load your download. Please try again.",
          );
      });
    return () => controller.abort();
  }, [token, attempt]);
  return (
    <div className={styles.wrapper}>
      <Link className="cx-text-link" href="/">
        <VscArrowLeft /> Back to discover
      </Link>
      <div className={styles.card} aria-busy={!download && !error}>
        <p className="cx-eyebrow">Your download</p>
        {error ? (
          <div className="cx-empty" role="alert">
            <VscError />
            <h1>Let’s try that again.</h1>
            <p>{error}</p>
            <button
              className="cx-button"
              onClick={() => {
                setError("");
                setAttempt(attempt + 1);
              }}
            >
              Retry download
            </button>
          </div>
        ) : download ? (
          <>
            <div className={styles.media}>
              {download.poster && (
                <img src={download.poster} alt="" width={100} height={150} />
              )}
              <div>
                <h1>{download.title}</h1>
                <p>
                  {[download.quality, download.size]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <div className={styles.ready}>
              <VscCloudDownload />
              <div>
                <h2>Ready when you are.</h2>
                <p>Your link is ready. Choose a file below.</p>
              </div>
            </div>
            <a
              className="cx-button"
              href={download.url}
              onClick={() => trackExperience('download_link_action', { kind: 'file' })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <VscCloudDownload /> Download file
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            {download.subtitleUrl && (
              <a
                className="cx-button cx-button--secondary"
                href={download.subtitleUrl}
                onClick={() => trackExperience('download_link_action', { kind: 'subtitles' })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <VscFile /> Download subtitles
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </>
        ) : (
          <div className={styles.loading} role="status">
            <div className="cx-skeleton" />
            <p>Finding your download…</p>
          </div>
        )}
      </div>
      {waitingPageEnabled && <AdSlot placement="download-below-actions" networkEnabled={networkEnabled} />}
    </div>
  );
}
