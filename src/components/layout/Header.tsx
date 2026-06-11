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
        {/* Realtime Notification Bell Component */}
        <NotificationBell />

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
