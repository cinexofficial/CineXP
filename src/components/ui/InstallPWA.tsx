"use client";

import { useEffect, useState } from "react";
import { VscDesktopDownload } from "react-icons/vsc";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Installation is an explicit footer action, never an unsolicited popup. */
export default function InstallPWA() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installed = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  if (!prompt) return null;
  return (
    <button
      type="button"
      className="cx-text-link cx-install"
      onClick={async () => {
        try {
          await prompt.prompt();
          await prompt.userChoice;
        } finally {
          setPrompt(null);
        }
      }}
    >
      <VscDesktopDownload aria-hidden="true" /> Install app
    </button>
  );
}
