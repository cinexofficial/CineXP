"use client";

import Image from 'next/image';
import { useEffect, useRef } from "react";
import { VscClose, VscRefresh, VscPlay } from "react-icons/vsc";
import { getImageUrl } from "@/lib/tmdb";

interface RandomItem {
  url: string;
  title: string;
  poster_path: string | null;
  media_type: string;
  id: number;
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReroll: () => void;
  onConfirm: () => void;
  item: RandomItem | null;
  isLoading: boolean;
  error?: string;
}

export default function RandomizerModal({
  isOpen,
  onClose,
  onReroll,
  onConfirm,
  item,
  isLoading,
  error,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="cx-dialog"
      aria-labelledby="random-title"
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not([disabled])",
          ),
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="cx-dialog-header">
        <h2 id="random-title">Leave it to chance.</h2>
        <button
          className="cx-icon-button"
          onClick={onClose}
          aria-label="Close selection"
        >
          <VscClose />
        </button>
      </div>
      <p className="cx-dialog-copy">
        A little less scrolling. A little more discovery.
      </p>
      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <div
            className="cx-dialog-poster cx-skeleton"
            aria-label="Finding a title"
          />
        ) : (
          <>
            {item?.poster_path && (
              <Image
                className="cx-dialog-poster"
                src={getImageUrl(item.poster_path, "w342")}
                alt=""
                width={175}
                height={263}
              />
            )}
            <p className="cx-dialog-title">{item?.title}</p>
            <p className="cx-dialog-copy">
              {error ||
                (item?.media_type === "tv"
                  ? "Your next series, perhaps?"
                  : "Your next movie night, perhaps?")}
            </p>
          </>
        )}
      </div>
      <div className="cx-dialog-actions">
        <button
          className="cx-button"
          disabled={isLoading || !item}
          onClick={onConfirm}
        >
          <VscPlay /> Explore title
        </button>
        <button
          className="cx-button cx-button--secondary"
          disabled={isLoading}
          onClick={onReroll}
        >
          <VscRefresh /> {error ? "Try again" : "Pick another"}
        </button>
      </div>
    </dialog>
  );
}
