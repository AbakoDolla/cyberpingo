"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconBell, IconX, IconArrowRight, IconCheck } from "@/components/ui/Icon";
import { useUser, useUserActions } from "@/context/UserContext";
import { useTranslation } from "@/lib/i18n";
import { listMyNotifications, markNotificationRead, subscribeToNotifications } from "@/services/notification.service";
import type { AppNotification } from "@/types/api";

const STORAGE_KEY = "cyberpingo_read_broadcasts";

/**
 * Returns IDs of announcements already marked as read in local storage.
 */
function getReadBroadcastIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/**
 * Persists an announcement ID as read in localStorage.
 */
function recordBroadcastAsRead(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const ids = getReadBroadcastIds();
    ids.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Persists multiple announcement IDs as read in localStorage.
 */
function recordAllBroadcastsAsRead(ids: string[]) {
  if (typeof window === "undefined" || !ids.length) return;
  try {
    const existing = getReadBroadcastIds();
    ids.forEach((id) => existing.add(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(existing).slice(-200)));
  } catch {
    // Ignore
  }
}

export default function BroadcastTicker() {
  const { profile } = useUser();
  const userId = profile?.id ?? null;
  const { setUnreadNotifications } = useUserActions();
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const router = useRouter();

  const [unreadItems, setUnreadItems] = useState<AppNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Load unread announcements on mount or when user changes
  const loadUnread = useCallback(async () => {
    if (!userId) {
      setUnreadItems([]);
      return;
    }
    try {
      const items = await listMyNotifications(userId, 20);
      const readIds = getReadBroadcastIds();
      // Keep strictly notifications that are not marked as read in DB and not marked read in storage
      const unread = items.filter((item) => !item.read_at && !readIds.has(item.id));
      setUnreadItems(unread);
      setCurrentIndex(0);
    } catch {
      // Fail silently
    }
  }, [userId]);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  // Realtime subscription for incoming broadcast notifications
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToNotifications(userId, (newNotif) => {
      const readIds = getReadBroadcastIds();
      if (!newNotif.read_at && !readIds.has(newNotif.id)) {
        setUnreadItems((prev) => {
          if (prev.some((item) => item.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Cross-component and cross-tab reactive synchronization
  useEffect(() => {
    const handleNotificationRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      const readId = customEvent.detail?.id;
      if (readId) {
        recordBroadcastAsRead(readId);
        setUnreadItems((prev) => prev.filter((item) => item.id !== readId));
      }
    };

    const handleAllRead = () => {
      setUnreadItems((prev) => {
        recordAllBroadcastsAsRead(prev.map((item) => item.id));
        return [];
      });
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const readIds = getReadBroadcastIds();
        setUnreadItems((prev) => prev.filter((item) => !readIds.has(item.id)));
      }
    };

    window.addEventListener("cyberpingo:notification-read", handleNotificationRead);
    window.addEventListener("cyberpingo:all-notifications-read", handleAllRead);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("cyberpingo:notification-read", handleNotificationRead);
      window.removeEventListener("cyberpingo:all-notifications-read", handleAllRead);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Multi-item auto rotation every 14 seconds when multiple unread announcements exist and not paused
  useEffect(() => {
    if (unreadItems.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % unreadItems.length);
    }, 14000);

    return () => clearInterval(timer);
  }, [unreadItems.length, isPaused]);

  // If there are no unread notifications, nothing is displayed
  if (unreadItems.length === 0) {
    return null;
  }

  const activeNotification = unreadItems[currentIndex] || unreadItems[0];
  if (!activeNotification) return null;

  // Mark as read action: records in storage, updates state, decrements global unread counter & Supabase
  const handleMarkAsRead = async (e?: React.MouseEvent, notificationToRead = activeNotification) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const notifId = notificationToRead.id;

    // 1. Immediately store in localStorage so it never reappears even across tabs/reloads
    recordBroadcastAsRead(notifId);

    // 2. Remove from active state
    setUnreadItems((prev) => {
      const remaining = prev.filter((item) => item.id !== notifId);
      return remaining;
    });
    setCurrentIndex((prev) => Math.max(0, prev > 0 ? prev - 1 : 0));

    // 3. Decrement global unread notification counter in header
    setUnreadNotifications((count) => Math.max(0, count - 1));

    // 4. Notify other listeners/pages
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cyberpingo:notification-read", {
          detail: { id: notifId },
        })
      );
    }

    // 5. Persist to Supabase
    try {
      await markNotificationRead(notifId);
    } catch {
      // Already recorded in localStorage
    }
  };

  const handleOpenLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    const targetUrl = activeNotification.link || "/notifications";
    await handleMarkAsRead(undefined, activeNotification);
    router.push(targetUrl);
  };

  const hasMultiple = unreadItems.length > 1;

  return (
    <aside
      className="broadcast-ticker sticky top-0 left-0 right-0 z-[60] bg-[#040a17]/95 backdrop-blur-md border-b border-cyan-500/30 text-white shadow-[0_4px_25px_rgba(0,240,255,0.18)] transition-all duration-300"
      role="region"
      aria-label={isEn ? "Platform announcement" : "Annonce de la plateforme"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2.5 sm:gap-4 text-xs sm:text-sm">
        {/* Left Badge & Pagination if multiple */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-mono font-semibold text-[11px] uppercase tracking-wider animate-pulse">
            <IconBell size={12} className="text-cyan-400" />
            <span className="hidden xs:inline">{isEn ? "Broadcast" : "Annonce"}</span>
          </span>

          {hasMultiple && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-200/70 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : unreadItems.length - 1));
                }}
                className="hover:text-cyan-200 px-0.5 cursor-pointer"
                title={isEn ? "Previous announcement" : "Annonce précédente"}
              >
                ‹
              </button>
              <span>{currentIndex + 1}/{unreadItems.length}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev + 1) % unreadItems.length);
                }}
                className="hover:text-cyan-200 px-0.5 cursor-pointer"
                title={isEn ? "Next announcement" : "Annonce suivante"}
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Announcement Message Container */}
        <div className="flex-1 min-w-0 overflow-hidden relative">
          <button
            type="button"
            onClick={handleOpenLink}
            className="text-left w-full truncate flex items-center gap-2 hover:text-cyan-300 transition-colors group cursor-pointer focus:outline-none"
            title={activeNotification.title}
          >
            <div
              className={`inline-flex items-center gap-2 truncate will-change-transform ${
                isPaused ? "" : "animate-cp-marquee"
              }`}
            >
              <strong className="text-cyan-100 font-semibold flex-shrink-0">
                {activeNotification.title}
              </strong>
              {activeNotification.body && (
                <span className="text-cyan-100/75 font-normal truncate hidden sm:inline">
                  — {activeNotification.body}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Right Actions: J'ai lu, Voir, Close */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Explicit 'J'ai lu' (Mark as read) button */}
          <button
            type="button"
            onClick={handleMarkAsRead}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 hover:text-white rounded-lg text-[11px] sm:text-xs font-semibold shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all cursor-pointer whitespace-nowrap active:scale-95"
            title={isEn ? "Mark announcement as read (will no longer show)" : "Marquer l'annonce comme lue (ne s'affichera plus)"}
          >
            <IconCheck size={13} className="text-cyan-300" />
            <span>{isEn ? "Mark as read" : "J'ai lu"}</span>
          </button>

          {/* Open Link Button */}
          <button
            type="button"
            onClick={handleOpenLink}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-white/90 hover:text-white rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
            title={isEn ? "Open announcement link" : "Ouvrir le lien de l'annonce"}
          >
            <span>{isEn ? "Open" : "Voir"}</span>
            <IconArrowRight size={12} />
          </button>

          {/* Dismiss 'X' Button */}
          <button
            type="button"
            onClick={handleMarkAsRead}
            className="p-1 sm:p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
            title={isEn ? "Dismiss and mark as read" : "Fermer et marquer comme lu"}
            aria-label={isEn ? "Dismiss and mark as read" : "Fermer et marquer comme lu"}
          >
            <IconX size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

