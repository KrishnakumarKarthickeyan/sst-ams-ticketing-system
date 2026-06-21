'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { matchesTicketNumber } from '../../lib/ticket-search';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useTickets } from '../../context/TicketContext';
import { LogOut, Search, Menu, ChevronDown, UserCircle, Settings, Ticket as TicketIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Sidebar } from './Sidebar';
import { BrandedLogo } from '../ui/BrandedLogo';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '../ui/dropdown-menu';

const ROLE_BASE: Record<string, string> = {
  SuperAdmin: '/admin',
  Manager: '/manager',
  Consultant: '/consultant',
  Customer: '/customer',
};

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { tickets } = useTickets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close the search results when clicking away.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const base = user ? (ROLE_BASE[user.role] || '/consultant') : '/consultant';
  const ticketsListPath = user?.role === 'Consultant' ? `${base}/my-tickets` : `${base}/tickets`;

  // Live results from the loaded ticket set — matches number, title, org, module.
  const results = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (s.length < 2) return [];
    return (tickets || [])
      .filter(t =>
        matchesTicketNumber(t.ticketNumber, s) ||
        (t.title || '').toLowerCase().includes(s) ||
        (t.organization || '').toLowerCase().includes(s) ||
        (t.sapModule || '').toLowerCase().includes(s))
      .slice(0, 8);
  }, [query, tickets]);

  if (!user) return null;

  const goToTicket = (id: string) => {
    setSearchOpen(false);
    setQuery('');
    router.push(`${base}/tickets/${id}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[0]) { goToTicket(results[0].id); return; }
    const s = query.trim();
    if (s) { setSearchOpen(false); router.push(`${ticketsListPath}?search=${encodeURIComponent(s)}`); }
  };

  return (
    <header className="h-16 border-b border-line bg-surface sticky top-0 z-40 px-6 flex items-center gap-4 justify-between">
      {/* Mobile Menu Trigger */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button aria-label="Open navigation menu" className="p-2 rounded-lg border border-line hover:bg-surface-muted text-ink-secondary transition">
              <Menu size={16} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <Sidebar isMobile={true} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Search Bar — live ticket search with a results dropdown */}
      <div className="flex-1 max-w-md hidden md:block" ref={searchRef}>
        <div className="relative">
          <form onSubmit={onSubmit}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search tickets by number, title, customer or module…"
              className="w-full bg-surface-muted border border-line rounded-lg pl-9 pr-4 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition"
            />
          </form>

          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 mt-2 bg-surface border border-line rounded-lg shadow-lg z-50 overflow-hidden">
              {results.length === 0 ? (
                <div className="p-4 text-center text-[11px] text-ink-muted italic">No tickets match “{query.trim()}”.</div>
              ) : (
                <ul className="max-h-80 overflow-y-auto divide-y divide-line">
                  {results.map(t => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => goToTicket(t.id)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-muted transition flex items-start gap-2"
                      >
                        <TicketIcon size={13} className="mt-0.5 shrink-0 text-ink-muted" />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-ink">{t.ticketNumber || t.id}</span>
                          <span className="block text-[11px] text-ink-secondary truncate">{t.title}</span>
                          <span className="block text-[11px] text-ink-muted truncate">{t.organization} · {t.sapModule} · {t.status}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 ml-auto">
        <NotificationBell />

        {/* User menu — expands to profile details + settings + sign out */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 px-3 py-1 rounded-lg bg-surface-muted border border-line text-xs text-ink-secondary hover:bg-surface-subtle transition focus:outline-none">
              <div className="w-5 h-5 rounded-full bg-surface-subtle border border-line flex items-center justify-center overflow-hidden shrink-0">
                <BrandedLogo width={12} height={12} iconOnly={true} />
              </div>
              <div className="text-left leading-tight">
                <span className="font-bold text-ink block">{user.name}</span>
                <span className="text-[11px] text-ink-secondary block truncate max-w-[120px]">{user.company || 'Global Support'}</span>
              </div>
              <ChevronDown size={13} className="text-ink-muted shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-surface-subtle border border-line flex items-center justify-center shrink-0">
                  <UserCircle size={18} className="text-ink-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{user.name}</p>
                  <p className="text-[11px] font-normal text-ink-muted truncate">{user.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-[11px] text-ink-secondary space-y-1">
              <div className="flex justify-between gap-2"><span className="text-ink-muted">Role</span><span className="font-semibold text-ink">{user.role}</span></div>
              {user.company && <div className="flex justify-between gap-2"><span className="text-ink-muted">Organization</span><span className="font-semibold text-ink truncate max-w-[150px]">{user.company}</span></div>}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`${base}/profile`} className="cursor-pointer">
                <Settings size={14} className="mr-2" /> Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-critical focus:text-critical">
              <LogOut size={14} className="mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick logout */}
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
