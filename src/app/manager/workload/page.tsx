'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '@/context/TicketContext';
import { Activity, Users, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManagerWorkloadAnalytics } from '@/components/analytics/manager-workload-analytics';

type Timeframe = 'All' | '30' | '90' | 'YTD';

export default function ManagerWorkloadPage() {
  const { tickets, profiles, contracts } = useTickets();

  const [timeframe, setTimeframe] = useState<Timeframe>('All');
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [activeSubTab, setActiveSubTab] = useState<'consultants' | 'customers'>('consultants');

  const isWithinTimeframe = (dateStr: string) => {
    if (timeframe === 'All') return true;
    const date = new Date(dateStr).getTime();
    const now = new Date();
    if (timeframe === '30') return date >= now.setDate(now.getDate() - 30);
    if (timeframe === '90') return date >= now.setDate(now.getDate() - 90);
    if (timeframe === 'YTD') return date >= new Date(now.getFullYear(), 0, 1).getTime();
    return true;
  };

  const filteredTickets = useMemo(() => {
    return (tickets || []).filter(t => {
      if (!isWithinTimeframe(t.createdAt)) return false;
      if (selectedModule !== 'All' && t.sapModule !== selectedModule) return false;
      if (selectedCompany !== 'All' && t.organization !== selectedCompany) return false;
      return true;
    });
  }, [tickets, timeframe, selectedModule, selectedCompany]);

  const moduleOptions = useMemo(
    () => Array.from(new Set((tickets || []).map(t => t.sapModule).filter(Boolean))),
    [tickets],
  );
  const companyOptions = useMemo(
    () => Array.from(new Set((tickets || []).map(t => t.organization).filter(Boolean))),
    [tickets],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Activity size={20} className="text-ink-secondary" /> Workload &amp; Utilization Analytics</span>}
        description="Audit resource balance, track SLA violations, and monitor company hour allocation."
        actions={
          <ToggleGroup type="single" value={activeSubTab} onValueChange={v => v && setActiveSubTab(v as 'consultants' | 'customers')} className="bg-surface-subtle">
            <ToggleGroupItem value="consultants" className="gap-1.5 px-3"><Users size={12} /> Resource Workloads</ToggleGroupItem>
            <ToggleGroupItem value="customers" className="gap-1.5 px-3"><Building2 size={12} /> Customer Utilization</ToggleGroupItem>
          </ToggleGroup>
        }
        meta={
          <>
            <ToggleGroup type="single" value={timeframe} onValueChange={v => v && setTimeframe(v as Timeframe)} className="bg-surface-subtle">
              {(['All', '30', '90', 'YTD'] as const).map(t => (
                <ToggleGroupItem key={t} value={t} className="px-2.5">{t === '30' ? '30d' : t === '90' ? '90d' : t}</ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="All Modules" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Modules</SelectItem>
                {moduleOptions.map(mod => <SelectItem key={mod} value={mod}>{mod}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue placeholder="All Companies" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Companies</SelectItem>
                {companyOptions.map(org => <SelectItem key={org} value={org}>{org}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <ManagerWorkloadAnalytics
        section={activeSubTab}
        tickets={filteredTickets}
        profiles={profiles}
        contracts={contracts}
        now={Date.now()}
      />
    </div>
  );
}
