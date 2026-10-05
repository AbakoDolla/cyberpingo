"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { IconBell, IconX, IconArrowRight } from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";
import { useTranslation } from "@/lib/i18n";
import { listMyNotifications, subscribeToNotifications } from "@/services/notification.service";
import type { AppNotification } from "@/types/api";

const DISPLAY_DURATION_MS = 14000; // Visible for 14 seconds
const RECHECK_INTERVAL_MS = 60000; // Periodically surfaces again every 60s if unread

export default function BroadcastTicker() {
  const { profile } = useUser();
  const userId = profile?.id ?? null;
  const { lang } = useTranslation();
  const isEn = lang === "en";

  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);
  const recheckTimer = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (notif: AppNotification) => {
    setNotification(notif);
    setVisible(true);

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      setVisible(false);
    }, DISPLAY_DURATION_MS);
  };

  // Listen to realtime notifications from Supabase
  useEffect(() => {
    if (!userId) return;

    // Fetch latest notification on mount
    listMyNotifications(userId, 3)
      .then((items) => {
        const latest = items.find((item) => !item.read_at) || items[0];
        if (latest) {
          showNotification(latest);
        }
      })
      .catch(() => undefined);

    const unsubscribe = subscribeToNotifications(userId, (newNotif) => {
      showNotification(newNotif);
    });

    return () => {
      unsubscribe();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [userId]);

  // Periodic reappearance cycle ("défilant de temps en temps")
  useEffect(() => {
    if (!notification) return;

    recheckTimer.current = setInterval(() => {
      // Re-trigger the ticker periodically if user hasn't explicitly dismissed forever
      if (!visible) {
        setVisible(true);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
          setVisible(false);
        }, DISPLAY_DURATION_MS);
      }
    }, RECHECK_INTERVAL_MS);

    return () => {
      if (recheckTimer.current) clearInterval(recheckTimer.current);
    };
  }, [notification, visible]);

  if (!visible || !notification) {
    return null;
  }

  const targetLink = notification.link || "/notifications";

  return (
    <div
      className="broadcast-ticker fixed top-0 left-0 right-0 z-50 bg-[#070d18]/95 backdrop-blur-md border-b border-cyan-500/30 text-white shadow-[0_4px_25px_rgba(0,240,255,0.18)] transition-all duration-300"
      role="status"
      aria-live="polite"
      onMouseEnter={() => {
        setIsPaused(true);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
      }}
      onMouseLeave={() => {
        setIsPaused(false);
        dismissTimer.current = setTimeout(() => setVisible(false), 5000);
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-xs sm:text-sm">
        {/* Left Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-mono font-semibold text-[11px] uppercase tracking-wider animate-pulse">
            <IconBell size={12} className="text-cyan-400" />
            {isEn ? "Broadcast" : "Annonce"}
          </span>
        </div>

        {/* Scrolling text container */}
        <div className="flex-1 overflow-hidden relative whitespace-nowrap">
          <div
            className={`inline-block whitespace-nowrap will-change-transform ${
              isPaused ? "" : "animate-marquee"
            }`}
          >
            <Link
              href={targetLink}
              className="inline-flex items-center gap-2 hover:text-cyan-300 transition-colors group cursor-pointer"
            >
              <strong className="text-cyan-100 font-semibold">{notification.title}</strong>
              {notification.body && (
                <span className="text-cyan-100/70 font-normal">
                  — {notification.body}
                </span>
              )}
              <span className="inline-flex items-center text-cyan-400 font-mono text-[11px] group-hover:translate-x-1 transition-transform">
                {isEn ? "Open" : "Voir"} <IconArrowRight size={12} className="ml-1" />
              </span>
            </Link>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
          }}
          className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label={isEn ? "Dismiss announcement" : "Fermer l'annonce"}
        >
          <IconX size={15} />
        </button>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-marquee {
          animation: marquee 22s linear infinite;
        }
      `}</style>
    </div>
  );
}
