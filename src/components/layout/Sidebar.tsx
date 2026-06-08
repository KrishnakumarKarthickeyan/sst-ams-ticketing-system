'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { BrandedLogo } from '../ui/BrandedLogo';
import { BRAND_CONFIG } from '../../config/branding';
import {
  LayoutDashboard,
  Building2,
  Users,
  Ticket,
  Clock,
  FileSpreadsheet,
  History,
  Settings,
  FolderLock,
  KanbanSquare,
  Bookmark,
  Activity,
  Cpu,
  FileCode2,
  MessageSquare,
  FileText,
  UserCheck,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobile = false }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Read collapsed preference from localStorage only on desktop-side
  React.useEffect(() => {
    if (!isMobile) {
      const saved = localStorage.getItem('sst_sidebar_collapsed');
      if (saved) {
        setIsCollapsed(saved === 'true');
      }
    }
  }, [isMobile]);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sst_sidebar_collapsed', String(nextState));
  };

  if (!user) return null;

  // Custom menu definitions per role
  const adminMenu: MenuItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={16} /> },
    { title: 'Service Desk', href: '/admin/tickets', icon: <Ticket size={16} /> },
    { title: 'SAP Managers', href: '/admin/managers', icon: <UserCheck size={16} /> },
    { title: 'Consultants', href: '/admin/consultants', icon: <Users size={16} /> },
    { title: 'Customers 360', href: '/admin/organizations', icon: <Building2 size={16} /> },
    { title: 'Global Reports', href: '/admin/reports', icon: <FileSpreadsheet size={16} /> },
    { title: 'Audit Logs', href: '/admin/audit-logs', icon: <History size={16} /> },
    { title: 'Settings', href: '/admin/settings', icon: <Settings size={16} /> },
    { title: 'Contacts Directory', href: '/admin/contacts', icon: <Users size={16} /> },
    { title: 'Profile Settings', href: '/admin/profile', icon: <User size={16} /> }
  ];

  const managerMenu: MenuItem[] = [
    { title: 'Dashboard', href: '/manager/dashboard', icon: <LayoutDashboard size={16} /> },
    { title: 'Tickets Desk', href: '/manager/tickets', icon: <Ticket size={16} /> },
    { title: 'Timesheet Approvals', href: '/manager/effort-approvals', icon: <CheckSquare size={16} /> },
    { title: 'Consultants Workload', href: '/manager/consultants', icon: <UserCheck size={16} /> },
    { title: 'SLA Monitoring', href: '/manager/sla-monitoring', icon: <Clock size={16} /> },
    { title: 'Knowledgebase', href: '/manager/knowledgebase', icon: <Bookmark size={16} /> },
    { title: 'Performance Reports', href: '/manager/reports', icon: <FileSpreadsheet size={16} /> },
    { title: 'Profile Settings', href: '/manager/profile', icon: <User size={16} /> }
  ];

  const consultantMenu: MenuItem[] = [
    { title: 'Dashboard', href: '/consultant/dashboard', icon: <LayoutDashboard size={16} /> },
    { title: 'My Tickets', href: '/consultant/my-tickets', icon: <Ticket size={16} /> },
    { title: 'My Reports', href: '/consultant/reports', icon: <FileSpreadsheet size={16} /> },
    { title: 'Profile Settings', href: '/consultant/profile', icon: <User size={16} /> }
  ];

  const customerMenu: MenuItem[] = [
    { title: 'Dashboard', href: '/customer/dashboard', icon: <LayoutDashboard size={16} /> },
    { title: 'My Tickets', href: '/customer/tickets', icon: <Ticket size={16} /> },
    { title: 'Create Ticket', href: '/customer/create-ticket', icon: <FileCode2 size={16} /> },
    { title: 'Support Reports', href: '/customer/reports', icon: <FileText size={16} /> },
    { title: 'Contacts', href: '/customer/contacts', icon: <Users size={16} /> },
    { title: 'Profile Settings', href: '/customer/profile', icon: <User size={16} /> }
  ];

  let activeMenu: MenuItem[] = [];
  let roleLabel = '';

  switch (user.role) {
    case 'SuperAdmin':
      activeMenu = adminMenu;
      roleLabel = 'SUPER ADMIN';
      break;
    case 'Manager':
      activeMenu = managerMenu;
      roleLabel = 'SAP MANAGER';
      break;
    case 'Consultant':
      activeMenu = consultantMenu;
      roleLabel = 'CONSULTANT';
      break;
    case 'Customer':
      activeMenu = customerMenu;
      roleLabel = 'SAP CUSTOMER';
      break;
  }

  const effectiveCollapsed = isMobile ? false : isCollapsed;
  const sidebarWidthClass = effectiveCollapsed ? 'w-16' : 'w-64';

  return (
    <aside className={`${isMobile ? 'w-full h-full' : `${sidebarWidthClass} h-screen sticky top-0 hidden md:flex`} border-r border-zinc-200 bg-white flex flex-col transition-all duration-200`}>
      {/* Brand Header */}
      {effectiveCollapsed ? (
        <div className="h-16 border-b border-zinc-200 flex items-center justify-center">
          <Link href="/dashboard" className="flex items-center justify-center">
            <BrandedLogo width={24} height={24} iconOnly={true} />
          </Link>
        </div>
      ) : (
        <div className="h-16 px-6 border-b border-zinc-200 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <BrandedLogo width={28} height={28} />
            <div>
              <span className="font-bold tracking-tight text-xs text-zinc-900 block font-mono leading-tight">{BRAND_CONFIG.shortName}</span>
              <span className="text-[9px] font-bold text-zinc-400 block tracking-wider uppercase leading-none mt-0.5">{roleLabel}</span>
            </div>
          </Link>
        </div>
      )}

      {/* Navigation menu list */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
        <TooltipProvider delayDuration={100}>
          {activeMenu.map((item) => {
            const isActive = pathname === item.href;
            
            const linkElement = (
              <Link
                key={item.title}
                href={item.href}
                className={`flex items-center rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  effectiveCollapsed ? 'justify-center p-2.5 w-10 mx-auto' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-zinc-950 text-white font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-zinc-400'}>{item.icon}</span>
                {!effectiveCollapsed && <span>{item.title}</span>}
              </Link>
            );

            if (effectiveCollapsed) {
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    {linkElement}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkElement;
          })}
        </TooltipProvider>
      </nav>

      {/* Collapse Toggle Button (Desktop only) */}
      {!isMobile && (
        <div className="p-3 border-t border-zinc-200">
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition w-full flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wider font-mono"
          >
            {effectiveCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <>
                <ChevronLeft size={14} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* System Health / Footer */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50/50">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider justify-center md:justify-start">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          {!effectiveCollapsed && <span>System status: OK</span>}
        </div>
      </div>
    </aside>
  );
};
