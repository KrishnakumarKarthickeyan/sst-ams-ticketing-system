'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Search, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Sidebar } from './Sidebar';
import { BrandedLogo } from '../ui/BrandedLogo';
import { NotificationBell } from '../notifications/NotificationBell';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="h-16 border-b border-line bg-surface sticky top-0 z-40 px-6 flex items-center gap-4 justify-between">
      {/* Mobile Menu Trigger */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg border border-line hover:bg-surface-muted text-ink-secondary transition">
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search tickets, knowledge base, settings..."
            className="w-full bg-surface-muted border border-line rounded-lg pl-9 pr-4 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Realtime Notification Bell Component */}
        <NotificationBell />

        {/* User Card Tag */}
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-lg bg-surface-muted border border-line text-xs text-ink-secondary">
          <div className="w-5 h-5 rounded-full bg-surface-subtle border border-line flex items-center justify-center overflow-hidden shrink-0">
            <BrandedLogo width={12} height={12} iconOnly={true} />
          </div>
          <div className="text-left leading-tight">
            <span className="font-bold text-ink block">{user.name}</span>
            <span className="text-[11px] text-ink-secondary block truncate max-w-[120px]">{user.company || 'Global Support'}</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg border border-line hover:bg-surface-muted text-ink-secondary hover:text-ink transition"
          title="Sign Out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
};
