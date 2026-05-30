'use client';

import React, { useState, useEffect, startTransition } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Activity,
  Cpu,
  Terminal,
  Layers,
  Zap,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  TrendingUp,
  Award,
  Check,
  FileText,
  Play,
  ArrowUpRight,
  Building2,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Info,
  Calendar,
  MessageSquare
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import { BrandedLogo } from '@/components/ui/BrandedLogo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [selectedTab, setSelectedTab] = useState('customer');
  
  // Workload Board interactive states
  const [workloadBalanced, setWorkloadBalanced] = useState(false);
  const [consultants, setConsultants] = useState([
    { name: 'Keerthana S.', type: 'Technical', active: 5, utilization: 86, module: 'ABAP/Fiori' },
    { name: 'Balaji R.', type: 'Functional', active: 6, utilization: 92, module: 'MM/SD' },
    { name: 'Sarah Jenkins', type: 'Functional', active: 3, utilization: 62, module: 'FICO' },
    { name: 'Krishna K.', type: 'Technical', active: 4, utilization: 78, module: 'Basis/Hana' }
  ]);

  // Handle scroll detection for glassmorphic header
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    toast.success('Demo Request Submitted! Our enterprise specialist will contact you in 2 hours.');
  };

  const handleToggleBalancing = () => {
    setWorkloadBalanced(!workloadBalanced);
    if (!workloadBalanced) {
      setConsultants(prev =>
        prev.map(c => {
          if (c.name === 'Balaji R.') return { ...c, active: 4, utilization: 72 };
          if (c.name === 'Sarah Jenkins') return { ...c, active: 4, utilization: 78 };
          if (c.name === 'Keerthana S.') return { ...c, active: 4, utilization: 75 };
          return c;
        })
      );
      toast.success('AI Workload Balancer successfully re-allocated 2 high-priority tickets.');
    } else {
      setConsultants([
        { name: 'Keerthana S.', type: 'Technical', active: 5, utilization: 86, module: 'ABAP/Fiori' },
        { name: 'Balaji R.', type: 'Functional', active: 6, utilization: 92, module: 'MM/SD' },
        { name: 'Sarah Jenkins', type: 'Functional', active: 3, utilization: 62, module: 'FICO' },
        { name: 'Krishna K.', type: 'Technical', active: 4, utilization: 78, module: 'Basis/Hana' }
      ]);
    }
  };

  // Mock charts data
  const ticketTrendsData = [
    { name: 'Mon', active: 42, resolved: 35 },
    { name: 'Tue', active: 38, resolved: 40 },
    { name: 'Wed', active: 48, resolved: 32 },
    { name: 'Thu', active: 35, resolved: 45 },
    { name: 'Fri', active: 30, resolved: 48 },
    { name: 'Sat', active: 18, resolved: 22 },
    { name: 'Sun', active: 12, resolved: 15 }
  ];

  const contractHoursData = [
    { name: 'Jan', utilized: 80, budgeted: 120 },
    { name: 'Feb', utilized: 95, budgeted: 120 },
    { name: 'Mar', utilized: 110, budgeted: 120 },
    { name: 'Apr', utilized: 142, budgeted: 120 }, // Breach/Alert
    { name: 'May', utilized: 118, budgeted: 120 }
  ];

  return (
    <div className="min-h-screen bg-zinc-50/30 text-zinc-900 selection:bg-indigo-600 selection:text-white flex flex-col font-sans">
      
      {/* ── HEADER ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-zinc-200/50 shadow-sm py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandedLogo width={28} height={28} />
              <span className="font-bold text-sm tracking-tight text-zinc-900">SST Support Studio</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-zinc-500">
              <a href="#features" className="hover:text-zinc-900 transition">Features</a>
              <a href="#overview" className="hover:text-zinc-900 transition">Platform</a>
              <a href="#ai" className="hover:text-zinc-900 transition">AI Capabilities</a>
              <a href="#utilization" className="hover:text-zinc-900 transition">SLA Governance</a>
              <a href="#security" className="hover:text-zinc-900 transition">Security</a>
              <a href="#analytics" className="hover:text-zinc-900 transition">Analytics</a>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="h-9 text-[13px] font-medium text-zinc-600 hover:text-zinc-900">
              <Link href="/login">Portal Login</Link>
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-9 text-[13px] font-semibold bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg px-4 shadow-sm transition active:scale-[0.98]">
                  Request a Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-md p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-zinc-900">Schedule a Platform Demo</DialogTitle>
                  <DialogDescription className="text-sm text-zinc-500">
                    Experience how SST can automate your SAP AMS operations and SLA tracking.
                  </DialogDescription>
                </DialogHeader>
                {demoSubmitted ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-md font-bold text-zinc-900">Request Received</h3>
                    <p className="text-sm text-zinc-500">Our solution engineering team will reach out shortly to align schedule details.</p>
                  </div>
                ) : (
                  <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500">Full Name</label>
                      <input required type="text" placeholder="John Doe" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500">Work Email</label>
                      <input required type="email" placeholder="j.doe@enterprise.com" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500">Enterprise Organization</label>
                      <input required type="text" placeholder="Acme Logistics Corp" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-500">Primary Database / ERP System</label>
                      <select className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                        <option>SAP S/4HANA Cloud</option>
                        <option>SAP ECC 6.0</option>
                        <option>Hybrid IT/Multicloud ERP</option>
                        <option>Other / Non-SAP Enterprise</option>
                      </select>
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-sm">
                        Submit & Request Schedule
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* ── SECTION 1: HERO ── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden relative border-b border-zinc-200/40 bg-gradient-to-b from-white to-zinc-50/20">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold tracking-tight">
              <Sparkles size={13} className="animate-spin duration-1000" />
              AI-Powered Enterprise ITSM & SAP AMS Platform
            </div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.1] md:leading-[1.05]">
              Enterprise Service Management, Reimagined with AI
            </h1>
            
            {/* Subheadline */}
            <p className="text-md md:text-[17px] text-zinc-500 font-medium leading-relaxed max-w-2xl mx-auto">
              Manage SAP AMS, IT Operations, Service Requests, Escalations, SLAs, Contract Hours, and Consultant Workloads from a single intelligent platform.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition active:scale-[0.98]">
                    Book a Demo
                    <ArrowRight size={15} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-md p-6">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-zinc-900">Schedule a Platform Demo</DialogTitle>
                    <DialogDescription className="text-sm text-zinc-500">
                      Configure integrations and SLA schedules in our custom enterprise sandbox.
                    </DialogDescription>
                  </DialogHeader>
                  {demoSubmitted ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={24} />
                      </div>
                      <h3 className="text-md font-bold text-zinc-900">Request Received</h3>
                    </div>
                  ) : (
                    <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500">Full Name</label>
                        <input required type="text" placeholder="John Doe" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-sm text-zinc-900 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500">Work Email</label>
                        <input required type="email" placeholder="j.doe@enterprise.com" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-sm text-zinc-900 focus:outline-none" />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-sm">
                          Request Schedule
                        </Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-11 px-6 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 font-semibold rounded-xl flex items-center gap-2">
                    <Play size={14} className="fill-zinc-400 stroke-zinc-400" />
                    Watch Platform Tour
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-4xl p-2 overflow-hidden shadow-2xl">
                  <div className="aspect-video bg-zinc-900 rounded-xl flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer hover:bg-white/20 hover:scale-105 transition active:scale-95 shadow-lg">
                      <Play size={28} className="fill-white translate-x-0.5" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-white font-bold text-lg">SST Support Studio Platform Tour</h3>
                      <p className="text-zinc-400 text-xs max-w-md">Overview of tenant management, real-time SLA engines, consultant workloads, and AI recommendation frameworks.</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="mt-16 md:mt-20 relative max-w-6xl mx-auto">
            {/* Background Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-violet-500/10 rounded-[2rem] filter blur-2xl -z-10"></div>
            
            {/* Main Mockup Frame */}
            <div className="border border-zinc-200 rounded-2xl bg-white shadow-2xl p-4 md:p-6 space-y-6">
              
              {/* Dashboard Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/80 block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-400/80 block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-400/80 block"></span>
                  </div>
                  <div className="h-5 w-[1px] bg-zinc-200"></div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">SST COMMAND CENTER</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-zinc-500 border-zinc-200 bg-zinc-50/50 text-[11px] px-2 py-0.5 rounded-full font-medium">
                    <Database size={11} className="mr-1 text-zinc-400 inline" />
                    AWS Singapore (sin1)
                  </Badge>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                    <Activity size={11} className="mr-1 text-emerald-500 inline animate-pulse" />
                    SLA: 99.86% MET
                  </Badge>
                </div>
              </div>

              {/* Mockup Dashboard Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1: Live Tickets (ITSM Engine) */}
                <div className="space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-zinc-900 flex items-center gap-1.5">
                      <FileText size={14} className="text-zinc-500" />
                      Active Enterprise Service Incidents
                    </h3>
                    <span className="text-[11px] text-zinc-450 font-mono">Real-time update</span>
                  </div>
                  
                  {/* Ticket List */}
                  <div className="space-y-3">
                    {/* Ticket 1 */}
                    <div className="p-4 border border-zinc-150 rounded-xl hover:border-zinc-300 bg-zinc-50/30 transition flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold px-2 py-0 hover:bg-transparent rounded-full">
                            Critical P1
                          </Badge>
                          <span className="text-[11px] text-zinc-400 font-mono">SST-FI-1042</span>
                          <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.2 rounded">SAP FICO</span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-950">SAP Month-End Ledger Closure Blocked (Posting Error)</h4>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><Building2 size={13} /> Apex Global Industries</span>
                          <span className="flex items-center gap-1"><Clock size={13} /> SLA Due in 42m</span>
                        </div>
                      </div>
                      <div className="flex items-end justify-between md:flex-col md:justify-center md:items-end shrink-0 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 border border-white flex items-center justify-center text-[10px] font-bold text-zinc-600">
                            KS
                          </div>
                          <span className="text-xs text-zinc-650 font-medium">Keerthana S.</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">Assigned 12m ago</span>
                      </div>
                    </div>

                    {/* Ticket 2 */}
                    <div className="p-4 border border-zinc-150 rounded-xl hover:border-zinc-300 bg-zinc-50/30 transition flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-semibold px-2 py-0 hover:bg-transparent rounded-full">
                            High P2
                          </Badge>
                          <span className="text-[11px] text-zinc-400 font-mono">SST-SD-1029</span>
                          <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.2 rounded">SAP MM/SD</span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-950">Outbound Delivery Sales Order API Delay</h4>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><Building2 size={13} /> Titan Energy Corp</span>
                          <span className="flex items-center gap-1"><Clock size={13} /> SLA: Met (Resolved)</span>
                        </div>
                      </div>
                      <div className="flex items-end justify-between md:flex-col md:justify-center md:items-end shrink-0 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 border border-white flex items-center justify-center text-[10px] font-bold text-zinc-600">
                            BR
                          </div>
                          <span className="text-xs text-zinc-650 font-medium">Balaji R.</span>
                        </div>
                        <span className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5">
                          <CheckCircle2 size={12} /> Closed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Dashboard Analytics Widgets */}
                <div className="space-y-6">
                  
                  {/* Widget 1: AI Insight Panel */}
                  <div className="p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-100/50 rounded-bl-full flex items-center justify-center text-indigo-500">
                      <Sparkles size={16} />
                    </div>
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                      <Cpu size={12} className="animate-pulse" />
                      AI Service Recommendations
                    </h4>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="bg-white/80 border border-indigo-100 p-2.5 rounded-lg space-y-1 shadow-sm">
                        <p className="font-semibold text-zinc-900">SLA Breach Risk (P1 Ledger Block)</p>
                        <p className="text-[11px] text-zinc-500">High technical complexity detected in transport queue. Action suggested:</p>
                        <div className="flex items-center gap-1.5 text-indigo-750 font-semibold text-[10px] bg-indigo-50/50 py-0.5 px-2 rounded w-fit mt-1">
                          <Zap size={10} /> Assign technical lead Keerthana S.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Widget 2: Contract Hour Consumption Gauge */}
                  <div className="p-4 border border-zinc-150 rounded-xl space-y-3 bg-zinc-50/10">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Contract Hours Burn-down</h4>
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium hover:bg-transparent rounded-full">
                        At Risk
                      </Badge>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Apex Global (FICO Hours Used)</span>
                        <span className="font-semibold text-zinc-900">142 / 250 hrs</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '56.8%' }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>56.8% consumed</span>
                        <span>108 hrs remaining</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Contract Health Index</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Healthy
                      </span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: TRUST BAR ── */}
      <section id="trust" className="py-12 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-8">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Enterprise SLA and IT Operations Standard</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {/* Trust Indicator 1 */}
            <div className="flex flex-col items-center text-center space-y-2 p-4 border border-zinc-100 hover:border-zinc-200 rounded-2xl bg-zinc-50/20 transition-all duration-300 group hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 group-hover:bg-indigo-50 group-hover:text-indigo-650 group-hover:border-indigo-100 transition">
                <Shield size={18} />
              </div>
              <span className="text-xs font-bold text-zinc-900">Enterprise Ready</span>
            </div>
            
            {/* Trust Indicator 2 */}
            <div className="flex flex-col items-center text-center space-y-2 p-4 border border-zinc-100 hover:border-zinc-200 rounded-2xl bg-zinc-50/20 transition-all duration-300 group hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 group-hover:bg-indigo-50 group-hover:text-indigo-650 group-hover:border-indigo-100 transition">
                <Cpu size={18} />
              </div>
              <span className="text-xs font-bold text-zinc-900">AI Powered</span>
            </div>

            {/* Trust Indicator 3 */}
            <div className="flex flex-col items-center text-center space-y-2 p-4 border border-zinc-100 hover:border-zinc-200 rounded-2xl bg-zinc-50/20 transition-all duration-300 group hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 group-hover:bg-indigo-50 group-hover:text-indigo-650 group-hover:border-indigo-100 transition">
                <Clock size={18} />
              </div>
              <span className="text-xs font-bold text-zinc-900">SLA Driven</span>
            </div>

            {/* Trust Indicator 4 */}
            <div className="flex flex-col items-center text-center space-y-2 p-4 border border-zinc-100 hover:border-zinc-200 rounded-2xl bg-zinc-50/20 transition-all duration-300 group hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 group-hover:bg-indigo-50 group-hover:text-indigo-650 group-hover:border-indigo-100 transition">
                <Lock size={18} />
              </div>
              <span className="text-xs font-bold text-zinc-900">Secure by Design</span>
            </div>

            {/* Trust Indicator 5 */}
            <div className="flex flex-col items-center text-center space-y-2 p-4 border border-zinc-100 hover:border-zinc-200 rounded-2xl bg-zinc-50/20 transition-all duration-300 group hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 group-hover:bg-indigo-50 group-hover:text-indigo-650 group-hover:border-indigo-100 transition">
                <Layers size={18} />
              </div>
              <span className="text-xs font-bold text-zinc-900">Multi-Tenant</span>
            </div>

            {/* Trust Indicator 6 */}
            <div className="flex flex-col items-center text-center space-y-2 p-4 border border-zinc-100 hover:border-zinc-200 rounded-2xl bg-zinc-50/20 transition-all duration-300 group hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-650 group-hover:bg-indigo-50 group-hover:text-indigo-650 group-hover:border-indigo-100 transition">
                <Users size={18} />
              </div>
              <span className="text-xs font-bold text-zinc-900">Real-Time Sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: WHY ENTERPRISES CHOOSE US ── */}
      <section id="features" className="py-20 bg-zinc-50/10">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Built for Mission-Critical Operations</h2>
            <p className="text-sm font-medium text-zinc-500">Six differentiators that set SST Support Studio apart from standard IT ticketing systems.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 group">
              <CardHeader className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition duration-300">
                  <Sparkles size={18} />
                </div>
                <CardTitle className="text-base font-bold text-zinc-900">AI Service Intelligence</CardTitle>
                <CardDescription className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Automatically classify incident categories, determine priority vectors, and fetch historical resolutions for FICO, SD, MM, and ABAP modules.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 2 */}
            <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 group">
              <CardHeader className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-105 transition duration-300">
                  <AlertTriangle size={18} />
                </div>
                <CardTitle className="text-base font-bold text-zinc-900">Smart Escalation Management</CardTitle>
                <CardDescription className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Flag business-critical blockages. Notify managers and consultants automatically while logging escalation timelines and SLA overrides.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 3 */}
            <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 group">
              <CardHeader className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition duration-300">
                  <Clock size={18} />
                </div>
                <CardTitle className="text-base font-bold text-zinc-900">Contract & Hours Governance</CardTitle>
                <CardDescription className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Track actual technical and functional hours logged on tickets. Reconcile monthly allocations and remaining capacities in real-time.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 4 */}
            <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 group">
              <CardHeader className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-105 transition duration-300">
                  <Users size={18} />
                </div>
                <CardTitle className="text-base font-bold text-zinc-900">Consultant Workload Optimization</CardTitle>
                <CardDescription className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Track functional vs. technical consultant utilization. Distribute ticket workloads automatically to prevent burnout and ensure SLA compliance.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 5 */}
            <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 group">
              <CardHeader className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-105 transition duration-300">
                  <Database size={18} />
                </div>
                <CardTitle className="text-base font-bold text-zinc-900">SAP AMS Focused Operations</CardTitle>
                <CardDescription className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Associate Transport Requests with tickets, track functional submissions, and approve technical designs with audit-trailed validation.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 6 */}
            <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 group">
              <CardHeader className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-150 text-zinc-650 flex items-center justify-center group-hover:scale-105 transition duration-300">
                  <Layers size={18} />
                </div>
                <CardTitle className="text-base font-bold text-zinc-900">End-to-End Visibility</CardTitle>
                <CardDescription className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Full lifecycle timeline audits of all ticket updates, comments, and field changes. High-contrast shells protect data isolation.
                </CardDescription>
              </CardHeader>
            </Card>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: PLATFORM OVERVIEW (TABBED) ── */}
      <section id="overview" className="py-20 bg-white border-y border-zinc-200/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Interactive Platform Showcase</h2>
            <p className="text-sm font-medium text-zinc-500">SST encapsulates four distinct workspaces into one unified portal engine.</p>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-10">
            <div className="flex justify-center">
              <TabsList className="bg-zinc-100/80 p-1 rounded-xl flex gap-1 border border-zinc-200/40">
                <TabsTrigger value="customer" className="rounded-lg text-xs font-semibold px-4 py-2 transition-smooth">Customer Portal</TabsTrigger>
                <TabsTrigger value="consultant" className="rounded-lg text-xs font-semibold px-4 py-2 transition-smooth">Consultant Workspace</TabsTrigger>
                <TabsTrigger value="manager" className="rounded-lg text-xs font-semibold px-4 py-2 transition-smooth">Manager Command Center</TabsTrigger>
                <TabsTrigger value="admin" className="rounded-lg text-xs font-semibold px-4 py-2 transition-smooth">Super Admin Tower</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab content wrapper */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Descriptions */}
              <div className="lg:col-span-4 space-y-6">
                <TabsContent value="customer" className="space-y-4 mt-0">
                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-transparent rounded-full px-2.5 font-semibold text-[10px] uppercase">Sarah Jenkins (Customer View)</Badge>
                  <h3 className="text-2xl font-bold text-zinc-900 leading-tight">Empower Requesters & Track SLA Real-time</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Customers can create support tickets, view system article recommendations, escalate delays, upload attachments, and rate the resolution satisfaction directly from their landing screen.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-650 font-medium pt-2">
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Create ticket with file attachments</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Transparent SLA status tracking</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Provide CSAT feedback on closure</li>
                  </ul>
                </TabsContent>

                <TabsContent value="consultant" className="space-y-4 mt-0">
                  <Badge className="bg-violet-50 text-violet-750 hover:bg-transparent rounded-full px-2.5 font-semibold text-[10px] uppercase">Keerthana S. (Consultant View)</Badge>
                  <h3 className="text-2xl font-bold text-zinc-900 leading-tight">Consultant Workspaces & Effort Management</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Consultants can inspect tickets assigned to their modules, record technical or functional estimated hours, log actual work spent, file Transport Requests, and request ticket closures.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-650 font-medium pt-2">
                    <li className="flex items-center gap-2"><Check size={14} className="text-violet-600" /> Submit timesheets for approval</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-violet-600" /> Set Transport Request audit logs</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-violet-600" /> Request closures with work summaries</li>
                  </ul>
                </TabsContent>

                <TabsContent value="manager" className="space-y-4 mt-0">
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-transparent rounded-full px-2.5 font-semibold text-[10px] uppercase">SAP Manager (Command Center)</Badge>
                  <h3 className="text-2xl font-bold text-zinc-900 leading-tight">Operational Governance & Effort Approval</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Managers oversee SLAs, reallocate ticket loads based on real-time consultant utilization, approve closure requests and timesheets, and manage contract hours capacity.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-650 font-medium pt-2">
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> Timesheet approvals & hour burn-downs</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> Manage consultant utilization rates</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" /> Approve ticket deletion & escalations</li>
                  </ul>
                </TabsContent>

                <TabsContent value="admin" className="space-y-4 mt-0">
                  <Badge className="bg-zinc-50 text-zinc-750 border border-zinc-150 hover:bg-transparent rounded-full px-2.5 font-semibold text-[10px] uppercase">Super Admin View</Badge>
                  <h3 className="text-2xl font-bold text-zinc-900 leading-tight">Enterprise Controls & RLS Isolation</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Super Admins manage organizational scopes, configure consultants, audit database logs, and oversee the platform-wide multi-tenant architecture configurations.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-650 font-medium pt-2">
                    <li className="flex items-center gap-2"><Check size={14} className="text-zinc-600" /> Configure multi-tenant isolation</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-zinc-600" /> Real-time system audit logs</li>
                    <li className="flex items-center gap-2"><Check size={14} className="text-zinc-600" /> Manage profiles & organization maps</li>
                  </ul>
                </TabsContent>

                <div className="pt-2">
                  <Button asChild className="h-10 text-[13px] bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl">
                    <Link href="/login">Launch Portal Workspace &rarr;</Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Visual Mockup for selected tab */}
              <div className="lg:col-span-8 border border-zinc-200/80 rounded-2xl bg-zinc-50/50 p-4 md:p-6 shadow-sm relative min-h-[380px]">
                
                {/* Visual rendering according to active tab */}
                <TabsContent value="customer" className="mt-0">
                  <div className="border border-zinc-200 bg-white rounded-xl shadow-sm p-4 space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-zinc-50">
                      <h4 className="text-xs font-bold text-zinc-900">New Service Ticket Details</h4>
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-transparent">Active SLA</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">Requester Profile</span>
                        <span className="font-semibold text-zinc-800">Sarah Jenkins (IT Lead)</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">Organization</span>
                        <span className="font-semibold text-zinc-800">Apex Global Industries</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">SLA Resolution Target</span>
                        <span className="font-semibold text-zinc-800">May 31, 2026 12:00 PM</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 block">System / Module</span>
                        <span className="font-semibold text-zinc-800">S/4HANA — SD Module</span>
                      </div>
                    </div>
                    
                    {/* CSAT mock */}
                    <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-zinc-850">Resolution Quality Feedback</p>
                        <p className="text-[11px] text-zinc-400">Provide feedback to close ticket.</p>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className="text-amber-400 text-sm">★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="consultant" className="mt-0">
                  <div className="border border-zinc-200 bg-white rounded-xl shadow-sm p-4 space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-zinc-50">
                      <h4 className="text-xs font-bold text-zinc-900">Consultant Timesheet Log</h4>
                      <span className="text-xs font-mono text-zinc-400">SST-QM-1008</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center p-2.5 bg-zinc-50 border border-zinc-100 rounded-lg">
                        <div>
                          <p className="font-semibold text-zinc-850">Functional Analysis & Spec Mapping</p>
                          <p className="text-[11px] text-zinc-400">Consultant Type: Functional</p>
                        </div>
                        <span className="font-mono font-bold text-zinc-900">24.00 hrs</span>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-zinc-50 border border-zinc-100 rounded-lg">
                        <div>
                          <p className="font-semibold text-zinc-850">ABAP Implementation & Transport Request Creation</p>
                          <p className="text-[11px] text-zinc-400">Consultant Type: Technical</p>
                        </div>
                        <span className="font-mono font-bold text-zinc-900">10.00 hrs</span>
                      </div>
                    </div>

                    {/* Transport request info */}
                    <div className="p-3 border border-violet-100 bg-violet-50/20 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-violet-750 font-medium flex items-center gap-1"><Terminal size={12} /> Transport ID logged:</span>
                      <span className="font-mono font-bold text-violet-850">DEVK901242</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="manager" className="mt-0">
                  <div className="border border-zinc-200 bg-white rounded-xl shadow-sm p-4 space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-zinc-50">
                      <h4 className="text-xs font-bold text-zinc-900">Pending Timesheet Approvals</h4>
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-100 hover:bg-transparent">2 Actions Required</Badge>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Item 1 */}
                      <div className="p-3 border border-zinc-150 rounded-lg flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-zinc-900">Apex Global (SST-SD-1029)</p>
                          <p className="text-[11px] text-zinc-400">Balaji R. — 24.00 hrs — MM Module</p>
                        </div>
                        <div className="flex gap-2">
                          <Button className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded">Approve</Button>
                          <Button variant="outline" className="h-7 text-[11px] font-medium border-zinc-200 hover:bg-zinc-50 rounded">Reject</Button>
                        </div>
                      </div>
                      
                      {/* Item 2 */}
                      <div className="p-3 border border-zinc-150 rounded-lg flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-zinc-900">Titan Energy (SST-QM-1008)</p>
                          <p className="text-[11px] text-zinc-400">Keerthana S. — 10.00 hrs — ABAP</p>
                        </div>
                        <div className="flex gap-2">
                          <Button className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded">Approve</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="admin" className="mt-0">
                  <div className="border border-zinc-200 bg-white rounded-xl shadow-sm p-4 space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-zinc-50">
                      <h4 className="text-xs font-bold text-zinc-900">System Security Audit Log</h4>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><Lock size={10} /> RLS ACTIVE</span>
                    </div>

                    <div className="space-y-2 font-mono text-[11px] text-zinc-500">
                      <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg flex justify-between">
                        <span>[12:14:02] SELECT profiles BY auth.uid()</span>
                        <span className="text-emerald-600 font-semibold">ALLOWED (Tenant Match)</span>
                      </div>
                      <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg flex justify-between">
                        <span>[12:14:05] SELECT tickets BY org_id (SST-QM-1008)</span>
                        <span className="text-emerald-600 font-semibold">ALLOWED (Tenant Match)</span>
                      </div>
                      <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg flex justify-between">
                        <span>[12:15:31] GET /api/health HTTP/1.1</span>
                        <span className="text-zinc-650">200 OK (sin1)</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

              </div>
            </div>
          </Tabs>
        </div>
      </section>

      {/* ── SECTION 5: AI CAPABILITIES ── */}
      <section id="ai" className="py-20 bg-zinc-50/10 border-b border-zinc-200/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">AI Service Intelligence Core</h2>
            <p className="text-sm font-medium text-zinc-500">How our embedded AI framework automates ticket lifecycle operations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 border border-zinc-150 rounded-2xl bg-white space-y-3 hover:border-indigo-300 hover:shadow-sm transition group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Sparkles size={16} />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">AI Ticket Classification</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">Reads free-text descriptions of SAP faults and automatically maps them to FICO, MM, SD, or BASIS modules with high confidence scoring.</p>
            </div>

            {/* Card 2 */}
            <div className="p-6 border border-zinc-150 rounded-2xl bg-white space-y-3 hover:border-indigo-300 hover:shadow-sm transition group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Zap size={16} />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">AI Priority Recommendations</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">Assesses the severity of ledger or order blockages to suggest correct priority levels (P1 to P4), bypassing human ticketing bottlenecks.</p>
            </div>

            {/* Card 3 */}
            <div className="p-6 border border-zinc-150 rounded-2xl bg-white space-y-3 hover:border-indigo-300 hover:shadow-sm transition group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Clock size={16} />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">AI SLA Risk Detection</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">Constantly monitors timesheet logs and outstanding tasks. Flags tickets that are at risk of breaching customer SLA targets.</p>
            </div>

            {/* Card 4 */}
            <div className="p-6 border border-zinc-150 rounded-2xl bg-white space-y-3 hover:border-indigo-300 hover:shadow-sm transition group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Users size={16} />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">AI Resource Suggestions</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">Scans consultant profiles, matching required module competencies and utilization rates to recommend the optimal assignee.</p>
            </div>

            {/* Card 5 */}
            <div className="p-6 border border-zinc-150 rounded-2xl bg-white space-y-3 hover:border-indigo-300 hover:shadow-sm transition group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <TrendingUp size={16} />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">AI Trend Analytics</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">Identifies recurring system faults (e.g. repetitive MM transport failures), suggesting preventive knowledgebase upgrades.</p>
            </div>

            {/* Card 6 */}
            <div className="p-6 border border-zinc-150 rounded-2xl bg-white space-y-3 hover:border-indigo-300 hover:shadow-sm transition group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Layers size={16} />
              </div>
              <h4 className="text-sm font-bold text-zinc-900">AI Service Insights</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">Extracts structural efficiency ratings to deliver a high-level command dashboard of resolve times and workload balances.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: SERVICE OPERATIONS COMMAND CENTER ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            
            {/* Stat 1 */}
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Tickets Managed</span>
              <p className="text-3xl font-extrabold text-zinc-900">12,845+</p>
              <span className="text-[10px] text-emerald-600 font-semibold block">▲ 14% vs Last Qtr</span>
            </div>

            {/* Stat 2 */}
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">SLA Compliance</span>
              <p className="text-3xl font-extrabold text-zinc-900">99.86%</p>
              <span className="text-[10px] text-emerald-600 font-semibold block">✓ Exceeds 98.5% Target</span>
            </div>

            {/* Stat 3 */}
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Hours Utilized</span>
              <p className="text-3xl font-extrabold text-zinc-900">3,248 hrs</p>
              <span className="text-[10px] text-zinc-450 block">Functional & Tech Logs</span>
            </div>

            {/* Stat 4 */}
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Escalations Resolved</span>
              <p className="text-3xl font-extrabold text-zinc-900">100%</p>
              <span className="text-[10px] text-emerald-600 font-semibold block">Avg Resolution: 3.4 hrs</span>
            </div>

            {/* Stat 5 */}
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">CSAT Rating</span>
              <p className="text-3xl font-extrabold text-zinc-900">4.92 / 5</p>
              <span className="text-[10px] text-emerald-600 font-semibold block">Based on 1,420 votes</span>
            </div>

            {/* Stat 6 */}
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Resolution Speed</span>
              <p className="text-3xl font-extrabold text-zinc-900">+34%</p>
              <span className="text-[10px] text-emerald-600 font-semibold block">Efficiency Gains YoY</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 7: CONTRACT & UTILIZATION MANAGEMENT ── */}
      <section id="utilization" className="py-20 bg-zinc-50/20 border-y border-zinc-200/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-semibold tracking-tight">
                <Award size={12} /> Enterprise Contract Governance
              </div>
              <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                Control Support Budget Consumption in Real-Time
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                AMS and IT operations models succeed when billing is fully transparent. SST monitors contract period scopes, logs detailed functional/technical hours, and warns managers before threshold overflows.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Contract Period Tracking</h4>
                    <p className="text-[11px] text-zinc-400">Baseline contract scope limits automatically mapped against client configurations.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Capacity Burn-down Warning</h4>
                    <p className="text-[11px] text-zinc-400">System warns managers at 80% consumption to trigger scope revision processes.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Customer Health Mapping</h4>
                    <p className="text-[11px] text-zinc-400">Real-time satisfaction and SLA compliance scoring determine tenant health indexes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Graphic Dashboard UI */}
            <div className="lg:col-span-7 border border-zinc-200 bg-white rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">Tenant Hours Capacity Overview</h4>
                  <p className="text-[10px] text-zinc-400">Monthly contract budget governance dashboard</p>
                </div>
                <Badge className="bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-transparent">May 2026</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Burn Chart Mockup */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Apex Global Capacity</span>
                  <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-medium">Monthly Allocation</span>
                      <span className="font-bold text-zinc-900">250.00 Hours</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-medium">Approved Utilization</span>
                      <span className="font-bold text-indigo-650">142.00 Hours</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-medium">Remaining Scope</span>
                      <span className="font-bold text-emerald-600">108.00 Hours</span>
                    </div>
                    
                    {/* Burn Graphic */}
                    <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '56.8%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Tenant List */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Enterprise Account Health</span>
                  <div className="space-y-2">
                    {/* Customer 1 */}
                    <div className="p-3 border border-zinc-100 bg-zinc-50/20 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-800">Apex Global</span>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-transparent text-[10px]">Healthy (99.8%)</Badge>
                    </div>

                    {/* Customer 2 */}
                    <div className="p-3 border border-zinc-100 bg-zinc-50/20 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-800">Titan Energy</span>
                      </div>
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-100 hover:bg-transparent text-[10px]">Active Watch (96.5%)</Badge>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 8: WORKLOAD & RESOURCE MANAGEMENT ── */}
      <section id="workload" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Resource Visual Workload Board */}
            <div className="lg:col-span-7 border border-zinc-200 bg-zinc-50/20 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200/50">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">SST Resource Allocator Board</h4>
                  <p className="text-[10px] text-zinc-450 font-medium">Track consultant capacity and balance active assignments</p>
                </div>
                <Button
                  onClick={handleToggleBalancing}
                  variant="outline"
                  className="h-8 text-[11px] font-semibold border-indigo-150 text-indigo-600 hover:bg-indigo-50/30 gap-1.5 rounded-lg shrink-0"
                >
                  <RefreshCw size={11} className={workloadBalanced ? 'animate-spin' : ''} />
                  {workloadBalanced ? 'Restore Baseline' : 'Auto Balance Load'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consultants.map((c, idx) => (
                  <div key={idx} className="p-4 border border-zinc-150 bg-white rounded-xl space-y-3 relative overflow-hidden group hover:border-zinc-300 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-100 text-xs font-bold text-zinc-650 flex items-center justify-center">
                          {c.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{c.name}</p>
                          <p className="text-[10px] text-zinc-400">{c.type} Consultant</p>
                        </div>
                      </div>
                      <Badge className="bg-zinc-100 text-zinc-550 text-[10px] px-2 hover:bg-transparent font-medium">{c.module}</Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500 font-medium">Workload (Active Tickets)</span>
                        <span className="font-bold text-zinc-800">{c.active} tickets</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500 font-medium">Utilization Rate</span>
                        <span className={`font-bold ${c.utilization > 90 ? 'text-red-500' : c.utilization > 80 ? 'text-amber-500' : 'text-emerald-600'}`}>{c.utilization}%</span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${c.utilization > 90 ? 'bg-red-500' : c.utilization > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${c.utilization}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-750 border border-violet-100 text-[11px] font-semibold tracking-tight">
                <Users size={12} /> Workload & Resource Balancing
              </div>
              <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                Align Consultant Competencies and Capacities
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Ensure ticket backlogs are balanced. Avoid bottlenecks in your SLA queues by dynamically managing technical (basis/HANA/ABAP) and functional (FICO/MM/SD) resources.
              </p>

              <div className="space-y-4 text-xs text-zinc-650 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><Check size={11} /></div>
                  <span>Balanced Technical vs Functional assignments</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><Check size={11} /></div>
                  <span>Auto-balancing algorithms prevent developer burn</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><Check size={11} /></div>
                  <span>Track resolution velocity per consultant type</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 9: ENTERPRISE SECURITY ── */}
      <section id="security" className="py-20 bg-zinc-50/20 border-y border-zinc-200/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Enterprise-Grade Security Standards</h2>
            <p className="text-sm font-medium text-zinc-500">Securing tenant isolations and SAP integrations across all operational scopes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Security Item 1 */}
            <div className="p-6 bg-white border border-zinc-150 rounded-2xl space-y-4 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                <Lock size={18} />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Role-Based Access Control</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Strict compartmentalization. Users are mapped to SuperAdmin, Manager, Consultant, or Customer roles to control data exposure.
              </p>
            </div>

            {/* Security Item 2 */}
            <div className="p-6 bg-white border border-zinc-150 rounded-2xl space-y-4 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                <FileText size={18} />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Timeline Audit Trails</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Every ticket field modification, comment edit, status transition, and SLA override is permanently logged with actor timestamps.
              </p>
            </div>

            {/* Security Item 3 */}
            <div className="p-6 bg-white border border-zinc-150 rounded-2xl space-y-4 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                <Shield size={18} />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Secure Storage Buckets</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Ticket attachments and logs are uploaded directly to secured Supabase storage buckets with restricted access keys.
              </p>
            </div>

            {/* Security Item 4 */}
            <div className="p-6 bg-white border border-zinc-150 rounded-2xl space-y-4 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                <Database size={18} />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Encrypted DB Operations</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Database reads and writes are fully encrypted in transit. Failures on credential checks abort operations instantly.
              </p>
            </div>

            {/* Security Item 5 */}
            <div className="p-6 bg-white border border-zinc-150 rounded-2xl space-y-4 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                <Users size={18} />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Multi-Tenant Isolation</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Row Level Security (RLS) policies prevent cross-tenant leakage. Customers can never view data from other companies.
              </p>
            </div>

            {/* Security Item 6 */}
            <div className="p-6 bg-white border border-zinc-150 rounded-2xl space-y-4 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                <Activity size={18} />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Compliance Auditing</h4>
              <p className="text-xs text-zinc-550 leading-relaxed font-medium">
                Platform conforms to NetWeaver enterprise security architectures, enforcing encrypted data operations at all levels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 10: PLATFORM ANALYTICS ── */}
      <section id="analytics" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Enterprise Performance Analytics</h2>
            <p className="text-sm font-medium text-zinc-500">Track operations health using official metrics and charts.</p>
          </div>

          {mounted ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart 1: Ticket Trends */}
              <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-700">Ticket Volatility Trends</CardTitle>
                  <CardDescription className="text-xs text-zinc-450">Active vs. Resolved Tickets over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ticketTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                      <ChartTooltip />
                      <Area type="monotone" dataKey="active" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#activeGrad)" name="Active" />
                      <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#resolvedGrad)" name="Resolved" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Chart 2: Customer SLA Hour Burn-down */}
              <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-700">Enterprise Hours Consumption</CardTitle>
                  <CardDescription className="text-xs text-zinc-450">Monthly utilized support hours against baseline budget</CardDescription>
                </CardHeader>
                <CardContent className="h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contractHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                      <ChartTooltip />
                      <Bar dataKey="budgeted" fill="#e4e4e7" radius={[4, 4, 0, 0]} name="Budget" />
                      <Bar dataKey="utilized" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Consumed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <span className="text-xs text-zinc-400">Loading charts...</span>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 11: CUSTOMER TESTIMONIALS ── */}
      <section className="py-20 bg-zinc-50/20 border-t border-zinc-200/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Partnering with Industry Leaders</h2>
            <p className="text-sm font-medium text-zinc-500">How enterprise operators manage SLAs with SST Support Studio.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Testimonial 1 */}
            <div className="p-8 bg-white border border-zinc-150 rounded-2xl space-y-6 shadow-sm relative">
              <span className="text-4xl text-zinc-250 absolute top-4 left-4 font-serif select-none">“</span>
              <p className="text-sm text-zinc-650 italic leading-relaxed pt-2">
                SST transitioned our SAP AMS ticketing from chaos to mathematical clarity. The ability to track functional and technical hours side-by-side against monthly limits prevented project cost overruns completely.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-8 h-8 rounded-full bg-zinc-100 font-bold text-zinc-600 text-xs flex items-center justify-center">IT</div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">Head of Enterprise ERP Systems</h4>
                  <p className="text-[10px] text-zinc-400">Global Logistics Conglomerate</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-8 bg-white border border-zinc-150 rounded-2xl space-y-6 shadow-sm relative">
              <span className="text-4xl text-zinc-250 absolute top-4 left-4 font-serif select-none">“</span>
              <p className="text-sm text-zinc-650 italic leading-relaxed pt-2">
                The row-level security isolation was a strict audit requirement for our partner contracts. SST enforces tenant boundaries while keeping Vercel rendering speeds adjacent to Singapore databases.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-8 h-8 rounded-full bg-zinc-100 font-bold text-zinc-600 text-xs flex items-center justify-center">CT</div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">Chief Technology Officer</h4>
                  <p className="text-[10px] text-zinc-400">Multi-national Energy & Gas Supplier</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 12: FINAL CTA ── */}
      <section className="py-20 md:py-28 bg-white text-zinc-900 border-t border-zinc-200/40 relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-3xl -z-10"></div>

        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Transform Service Operations into a Strategic Advantage
          </h2>
          <p className="text-md text-zinc-550 leading-relaxed font-medium max-w-xl mx-auto">
            One platform. Complete visibility. AI-powered execution.
          </p>
          <div className="pt-4 flex justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-12 px-8 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-sm shadow-md transition active:scale-[0.98] flex items-center gap-2">
                  Request a Demo
                  <ArrowRight size={15} />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-md p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-zinc-900">Schedule a Platform Demo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500">Full Name</label>
                    <input required type="text" placeholder="John Doe" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-sm text-zinc-900 focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500">Work Email</label>
                    <input required type="email" placeholder="j.doe@enterprise.com" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-sm text-zinc-900 focus:outline-none" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-sm">
                      Submit Demo Request
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-zinc-50 border-t border-zinc-200/60 py-12 md:py-16 text-[13px] text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-zinc-200/60">
          
          {/* Logo & Info column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandedLogo width={24} height={24} />
              <span className="font-bold text-sm tracking-tight text-zinc-900">SST Support Studio</span>
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium max-w-xs">
              AI-Powered Enterprise ITSM & SAP AMS Platform for high-performance service operations.
            </p>
            <div className="flex gap-2 items-center text-[11px] text-zinc-400">
              <Shield size={12} className="text-zinc-400" />
              <span>Conforms to NetWeaver enterprise security architectures</span>
            </div>
          </div>

          {/* Platform Column */}
          <div className="space-y-3">
            <h5 className="font-bold text-zinc-900 text-xs uppercase tracking-wider">Platform</h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-zinc-900 transition">Customer Portal</Link></li>
              <li><Link href="/login" className="hover:text-zinc-900 transition">Consultant Workspace</Link></li>
              <li><Link href="/login" className="hover:text-zinc-900 transition">Manager Command Center</Link></li>
              <li><Link href="/login" className="hover:text-zinc-900 transition">Super Admin Tower</Link></li>
            </ul>
          </div>

          {/* Solutions Column */}
          <div className="space-y-3">
            <h5 className="font-bold text-zinc-900 text-xs uppercase tracking-wider">Solutions</h5>
            <ul className="space-y-2 text-xs">
              <li><span className="text-zinc-400 font-medium">SAP AMS Support</span></li>
              <li><span className="text-zinc-400 font-medium">IT Service Management</span></li>
              <li><span className="text-zinc-400 font-medium">SLA Timer Engines</span></li>
              <li><span className="text-zinc-400 font-medium">Workload Allocators</span></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-3">
            <h5 className="font-bold text-zinc-900 text-xs uppercase tracking-wider">Legal</h5>
            <ul className="space-y-2 text-xs">
              <li><span className="text-zinc-400 font-medium">Privacy Policy</span></li>
              <li><span className="text-zinc-400 font-medium">Terms of Service</span></li>
              <li><span className="text-zinc-400 font-medium">RLS Tenant Isolations</span></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <span>&copy; {new Date().getFullYear()} SST SAP Support Desk. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="hover:text-zinc-700 cursor-pointer">LinkedIn</span>
            <span className="hover:text-zinc-700 cursor-pointer">Twitter / X</span>
            <span className="hover:text-zinc-700 cursor-pointer">GitHub Enterprise</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
