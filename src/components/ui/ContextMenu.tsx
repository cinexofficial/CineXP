"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  FaPlay, 
  FaPlus, 
  FaCheck, 
  FaTrash, 
  FaShareAlt, 
  FaInfoCircle, 
  FaTimes 
} from "react-icons/fa";
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/lib/watchlist";
import { removeFromWatchHistory } from "@/lib/history";
import { generateSlug } from "@/lib/utils";
import Link from "next/link";

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string | number;
    title: string;
    type: "movie" | "tv";
    poster_path: string | null;
    backdrop_path: string | null;
  };
  showRemoveHistory?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, isOpen, onClose, item, showRemoveHistory }) => {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const inWatchlist = isInWatchlist(item.id, item.type);

  useEffect(() => {
    
    // Also close on scroll to prevent floating menu issues
    const handleScroll = () => onClose();

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [onClose]);

  if (!mounted) return null;

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWatchlist) {
      removeFromWatchlist(item.id, item.type);
    } else {
      addToWatchlist({
        id: item.id,
        type: item.type,
        title: item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
      });
    }
    onClose();
  };

  const handleRemoveHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromWatchHistory(item.id);
    onClose();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/media/${item.type}/${generateSlug(item.id, item.title)}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
    onClose();
  };

  // Position logic
  const menuWidth = 240;
  const menuHeight = 350;
  let posX = x;
  let posY = y;

  if (typeof window !== "undefined") {
    if (x + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 20;
    if (y + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 20;
    if (posX < 20) posX = 20;
    if (posY < 20) posY = 20;
  }

  const menuPortal = (
    <AnimatePresence>
      {isOpen && (
        <div className="context-menu-root" style={{ position: 'fixed', inset: 0, zIndex: 9999999 }}>
          {/* Overlay to catch clicks - Optimizing for performance by removing full-screen blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(0,0,0,0.15)', // Simpler background, no blur
            }} 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 450 }}
            style={{
              position: "absolute",
              top: posY,
              left: posX,
              width: `${menuWidth}px`,
              pointerEvents: "auto",
            }}
          >
            <div className="menu-container">
              <div className="menu-header">
                <span className="menu-title">{item.title}</span>
                <button onClick={onClose} className="close-icon-btn" aria-label="Close menu"><FaTimes /></button>
              </div>

              <div className="menu-body">
                <Link href={`/media/${item.type}/${generateSlug(item.id, item.title)}`} className="menu-link-item primary-action" onClick={onClose}>
                  <div className="item-content">
                    <FaPlay className="icon-m" />
                    <span className="label-m">Watch Now</span>
                  </div>
                </Link>

                <button className="menu-btn-item" onClick={handleWatchlistToggle}>
                  <div className="item-content">
                    {inWatchlist ? <FaCheck className="icon-m highlight" /> : <FaPlus className="icon-m" />}
                    <span className="label-m">{inWatchlist ? "In Watchlist" : "Add to Watchlist"}</span>
                  </div>
                </button>

                <button className="menu-btn-item" onClick={handleShare}>
                  <div className="item-content">
                    <FaShareAlt className="icon-m" />
                    <span className="label-m">Share</span>
                  </div>
                </button>

                <Link href={`/media/${item.type}/${generateSlug(item.id, item.title)}`} className="menu-link-item" onClick={onClose}>
                  <div className="item-content">
                    <FaInfoCircle className="icon-m" />
                    <span className="label-m">View Details</span>
                  </div>
                </Link>

                {showRemoveHistory && (
                  <>
                    <div className="menu-separator" />
                    <button className="menu-btn-item delete-action" onClick={handleRemoveHistory}>
                      <div className="item-content">
                        <FaTrash className="icon-m" />
                        <span className="label-m">Remove from History</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>

            <style jsx>{`
              .menu-container {
                background: rgba(15, 8, 28, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 18px;
                box-shadow: 0 15px 45px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255,255,255,0.05);
                overflow: hidden;
                padding: 8px;
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
              }
              .menu-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 12px 8px;
              }
              .menu-title {
                font-size: 0.65rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: rgba(255, 255, 255, 0.3);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 150px;
              }
              .close-icon-btn {
                background: transparent;
                border: none;
                color: rgba(255, 255, 255, 0.4);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 0.75rem;
                transition: all 0.2s;
              }
              .close-icon-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

              .menu-body { display: flex; flex-direction: column; gap: 4px; }
              
              .menu-link-item, .menu-btn-item {
                display: block !important;
                width: 100% !important;
                background: transparent;
                border: none;
                padding: 0 !important;
                margin: 0 !important;
                text-decoration: none !important;
                cursor: pointer;
                border-radius: 10px;
                transition: all 0.2s ease;
                color: #fff !important;
                outline: none;
              }

              .item-content {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                padding: 10px 14px !important;
                width: 100%;
                box-sizing: border-box;
              }

              .menu-link-item:hover, .menu-btn-item:hover {
                background: rgba(255, 255, 255, 0.08);
                transform: translateX(3px);
              }

              .primary-action {
                background: linear-gradient(135deg, #e50914, #b20710) !important;
                margin-bottom: 2px !important;
                box-shadow: 0 4px 12px rgba(229, 9, 20, 0.2);
              }
              .primary-action:hover {
                transform: translateY(-1px) translateX(0) !important;
                box-shadow: 0 6px 18px rgba(229, 9, 20, 0.4);
                filter: brightness(1.1);
              }

              .label-m { font-size: 0.9rem; font-weight: 600; }
              .icon-m { font-size: 1rem; width: 18px; text-align: center; opacity: 0.9; }
              .highlight { color: #e50914; opacity: 1; }
              .delete-action:hover .item-content { color: #ff453a !important; background: rgba(255, 69, 58, 0.1); }
              .menu-separator { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0; }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(menuPortal, document.body);
};

export default ContextMenu;
