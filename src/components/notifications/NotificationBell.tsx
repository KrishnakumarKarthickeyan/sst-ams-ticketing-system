'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTickets } from '../../context/TicketContext';
import { supabase } from '../../lib/supabase/client';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Notification } from '../../types/ticket';

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 0) return 'Just now';
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead, refetchData } = useTickets();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const userNotifs = notifications.filter(n => {
      if (user.role === 'SuperAdmin') return true;
      return n.userId === user.id;
    });
    setLocalNotifications(userNotifs);
  }, [notifications, user]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!user || !supabase) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Realtime notification received:', payload);
          if (refetchData) {
            refetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchData]);

  // Click outside listener to close the notification popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  const unreadNotifications = localNotifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;
  const displayNotifications = localNotifications.slice(0, 10);

  const handleMarkAllRead = async () => {
    // One batched update — not a one-by-one loop.
    await markAllNotificationsRead(unreadNotifications.map(n => n.id));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg border border-line hover:bg-surface-muted text-ink-secondary hover:text-ink transition relative"
        title="Alerts"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-expanded={isOpen}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-ink rounded-full text-[11px] font-bold text-white flex items-center justify-center border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-line rounded-lg shadow-lg z-50 overflow-hidden text-xs">
          <div className="p-3 border-b border-line flex justify-between items-center bg-surface-muted">
            <span className="text-xs font-extrabold text-ink uppercase tracking-wider">Alert Center</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-6 px-2 text-[11px] text-ink-secondary hover:text-ink font-bold uppercase gap-1 flex items-center"
              >
                <CheckCheck size={11} />
                <span>Mark all read</span>
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {displayNotifications.length === 0 ? (
              <div className="p-8 text-center text-ink-muted italic flex flex-col items-center justify-center gap-2">
                <Inbox size={16} className="text-ink-muted" />
                <span className="text-[11px] font-sans">No alerts or notifications</span>
              </div>
            ) : (
              displayNotifications.map((n) => (
                <div key={n.id} className={`p-3 text-[11px] transition ${n.isRead ? 'bg-surface' : 'bg-surface-muted/60'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className={`font-bold leading-tight ${n.isRead ? 'text-ink-secondary' : 'text-ink'}`}>
                      {n.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-ink-muted font-sans">{formatRelativeTime(n.createdAt)}</span>
                      {!n.isRead && (
                        <button
                          onClick={() => markNotificationRead(n.id)}
                          className="text-ink-muted hover:text-ink transition"
                          title="Mark as read"
                        >
                          <CheckCheck size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-ink-secondary text-[11px] mt-1 leading-relaxed font-sans">{n.message}</p>
                  {(n.linkPath || n.ticketId) && (
                    <Link
                      href={n.linkPath || `/tickets/${n.ticketId}`}
                      onClick={() => {
                        setIsOpen(false);
                        if (!n.isRead) markNotificationRead(n.id);
                      }}
                      className="inline-block text-[11px] font-bold text-ink hover:underline mt-1.5 uppercase tracking-wider"
                    >
                      View Details &rarr;
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
