'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTickets } from '../../context/TicketContext';
import { Bell, LogOut, User, Search, CheckCheck, Menu } from 'lucide-react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Sidebar } from './Sidebar';
import { BrandedLogo } from '../ui/BrandedLogo';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, markNotificationRead } = useTickets();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!user) return null;

  // Filter notifications for current user role
  const userNotifications = notifications.filter(n => {
    if (user.role === 'SuperAdmin') return true; // See all alerts
    return n.userId === user.id;
  });

  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 border-b border-zinc-200 bg-white sticky top-0 z-40 px-6 flex items-center gap-4 justify-between">
      {/* Mobile Menu Trigger */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition">
              <Menu size={16} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <Sidebar isMobile={true} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tickets, knowledge base, settings..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition relative"
            title="Alerts"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-950 rounded-full text-[9px] font-bold text-white flex items-center justify-center font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                <span className="text-xs font-bold text-zinc-900 font-mono uppercase tracking-wider">Alert Center</span>
                {unreadCount > 0 && (
                  <span className="text-[9px] font-semibold text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded">
                    {unreadCount} Unread
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100">
                {userNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400">
                    No notifications yet.
                  </div>
                ) : (
                  userNotifications.map((n) => (
                    <div key={n.id} className={`p-3 text-xs transition ${n.isRead ? 'bg-white' : 'bg-zinc-50/70'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <span className={`font-bold ${n.isRead ? 'text-zinc-700' : 'text-zinc-950'}`}>{n.title}</span>
                        {!n.isRead && (
                          <button
                            onClick={() => markNotificationRead(n.id)}
                            className="text-zinc-400 hover:text-zinc-900 transition"
                            title="Mark as read"
                          >
                            <CheckCheck size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                      {(n.linkPath || n.ticketId) && (
                        <Link
                          href={n.linkPath || `/tickets/${n.ticketId}`}
                          onClick={() => {
                            setShowNotifications(false);
                            if (!n.isRead) markNotificationRead(n.id);
                          }}
                          className="inline-block text-[10px] font-bold text-zinc-900 hover:underline mt-1 font-mono"
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

        {/* User Card Tag */}
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
          <div className="w-5 h-5 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
            <BrandedLogo width={12} height={12} iconOnly={true} />
          </div>
          <div className="text-left leading-tight">
            <span className="font-bold text-zinc-800 block">{user.name}</span>
            <span className="text-[9px] text-zinc-500 block truncate max-w-[120px]">{user.company || 'Global Support'}</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition"
          title="Sign Out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
};
