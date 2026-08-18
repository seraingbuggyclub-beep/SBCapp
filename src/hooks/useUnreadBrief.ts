'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { getLatestAnnouncementDate } from '@/modules/announcements/actions';

const STORAGE_KEY = 'sbc_last_read_brief_date';

export function useUnreadBrief() {
  const [hasUnreadBrief, setHasUnreadBrief] = useState(false);
  const pathname = usePathname();

  const markAsRead = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setHasUnreadBrief(false);
      window.dispatchEvent(new Event('sbc_brief_read'));
    } catch {
      // safe fallback
    }
  }, []);

  const checkUnread = useCallback(async () => {
    try {
      const latestDateStr = await getLatestAnnouncementDate();
      if (!latestDateStr) {
        setHasUnreadBrief(false);
        return;
      }

      const lastReadStr = localStorage.getItem(STORAGE_KEY);
      if (!lastReadStr) {
        setHasUnreadBrief(true);
        return;
      }

      const latestTime = new Date(latestDateStr).getTime();
      const lastReadTime = new Date(lastReadStr).getTime();

      if (latestTime > lastReadTime) {
        setHasUnreadBrief(true);
      } else {
        setHasUnreadBrief(false);
      }
    } catch (e) {
      console.warn('Erreur vérification brief non lu:', e);
    }
  }, []);

  useEffect(() => {
    // Si on est sur /pit-lane, marquer comme lu immédiatement
    if (pathname === '/pit-lane') {
      markAsRead();
    } else {
      checkUnread();
    }

    const handleBriefReadEvent = () => {
      setHasUnreadBrief(false);
    };

    window.addEventListener('sbc_brief_read', handleBriefReadEvent);
    window.addEventListener('storage', checkUnread);

    return () => {
      window.removeEventListener('sbc_brief_read', handleBriefReadEvent);
      window.removeEventListener('storage', checkUnread);
    };
  }, [pathname, checkUnread, markAsRead]);

  return { hasUnreadBrief, markAsRead };
}
