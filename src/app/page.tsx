'use client';

import React, { useState, useEffect } from 'react';
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
  MessageSquare,
  HeartHandshake,
  ShieldAlert,
  Sliders,
  BarChart3,
  DollarSign,
  UserCheck,
  ArrowRightLeft,
  Search,
  ExternalLink,
  ChevronDown
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
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
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
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  
  // Showcase tab select
  const [selectedShowcaseTab, setSelectedShowcaseTab] = useState('customer-360');
  // Analytics tab select
  const [selectedAnalyticsTab, setSelectedAnalyticsTab] = useState('ticket-vol');

  // Accordion open states
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Dynamic simulation state for Resource balancer demo
  const [simulationBalanced, setSimulationBalanced] = useState(false);
  const [simulateConsultants, setSimulateConsultants] = useState([
    { name: 'David Foster', type: 'Functional', active: 6, hours: 145, load: 'Overloaded' },
    { name: 'Sarah Jenkins', type: 'Technical', active: 2, hours: 45, load: 'Available' },
    { name: 'Keerthana S.', type: 'Technical', active: 5, hours: 130, load: 'Near Capacity' },
    { name: 'Balaji R.', type: 'Functional', active: 1, hours: 25, load: 'Available' }
  ]);

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
    toast.success('Enterprise consultation request received. An architect will reach out shortly.');
  };

  const runBalanceSimulation = () => {
    setSimulationBalanced(!simulationBalanced);
    if (!simulationBalanced) {
      setSimulateConsultants([
        { name: 'David Foster', type: 'Functional', active: 3, hours: 85, load: 'Healthy' },
        { name: 'Sarah Jenkins', type: 'Technical', active: 3, hours: 75, load: 'Healthy' },
        { name: 'Keerthana S.', type: 'Technical', active: 4, hours: 110, load: 'Healthy' },
        { name: 'Balaji R.', type: 'Functional', active: 4, hours: 75, load: 'Healthy' }
      ]);
      toast.success('Simulation: Rebalanced ticket queue across available SLA consultants.');
    } else {
      setSimulateConsultants([
        { name: 'David Foster', type: 'Functional', active: 6, hours: 145, load: 'Overloaded' },
        { name: 'Sarah Jenkins', type: 'Technical', active: 2, hours: 45, load: 'Available' },
        { name: 'Keerthana S.', type: 'Technical', active: 5, hours: 130, load: 'Near Capacity' },
        { name: 'Balaji R.', type: 'Functional', active: 1, hours: 25, load: 'Available' }
      ]);
    }
  };

  // --- SECTION 6: ANALYTICS CHARTS ---
  const ticketVolumeData = [
    { name: 'Jan', raised: 240, closed: 180 },
    { name: 'Feb', raised: 320, closed: 290 },
    { name: 'Mar', raised: 410, closed: 350 },
    { name: 'Apr', raised: 380, closed: 420 },
    { name: 'May', raised: 480, closed: 460 },
    { name: 'Jun', raised: 510, closed: 490 }
  ];

  const slaComplianceData = [
    { name: 'Jan', compliance: 97.5 },
    { name: 'Feb', compliance: 98.2 },
    { name: 'Mar', compliance: 98.9 },
    { name: 'Apr', compliance: 97.1 },
    { name: 'May', compliance: 98.7 },
    { name: 'Jun', compliance: 99.1 }
  ];

  const customerHealthTrend = [
    { name: 'Jan', healthy: 82, atRisk: 12, critical: 6 },
    { name: 'Feb', healthy: 85, atRisk: 10, critical: 5 },
    { name: 'Mar', healthy: 89, atRisk: 8, critical: 3 },
    { name: 'Apr', healthy: 87, atRisk: 9, critical: 4 },
    { name: 'May', healthy: 92, atRisk: 6, critical: 2 },
    { name: 'Jun', healthy: 95, atRisk: 4, critical: 1 }
  ];

  const escalationTrendData = [
    { name: 'Jan', count: 18 },
    { name: 'Feb', count: 14 },
    { name: 'Mar', count: 9 },
    { name: 'Apr', count: 12 },
    { name: 'May', count: 7 },
    { name: 'Jun', count: 3 }
  ];

  const consultantUtilTrend = [
    { name: 'Jan', util: 84 },
    { name: 'Feb', util: 88 },
    { name: 'Mar', util: 92 },
    { name: 'Apr', util: 81 },
    { name: 'May', util: 78 },
    { name: 'Jun', util: 76 }
  ];

  const contractUtilTrend = [
    { name: 'Jan', burnt: 72, limit: 100 },
    { name: 'Feb', burnt: 81, limit: 100 },
    { name: 'Mar', burnt: 92, limit: 100 },
    { name: 'Apr', burnt: 98, limit: 100 },
    { name: 'May', burnt: 78, limit: 100 },
    { name: 'Jun', burnt: 68, limit: 100 }
  ];

  const resolutionTimeTrend = [
    { name: 'Jan', minutes: 210 },
    { name: 'Feb', minutes: 180 },
    { name: 'Mar', minutes: 145 },
    { name: 'Apr', minutes: 160 },
    { name: 'May', minutes: 120 },
    { name: 'Jun', minutes: 98 }
  ];

  const approvalTrendData = [
    { name: 'Jan', pending: 65, approved: 180 },
    { name: 'Feb', pending: 42, approved: 230 },
    { name: 'Mar', pending: 28, approved: 310 },
    { name: 'Apr', pending: 35, approved: 290 },
    { name: 'May', pending: 18, approved: 340 },
    { name: 'Jun', pending: 8, approved: 390 }
  ];

  const closureTrendData = [
    { name: 'Jan', closureRate: 78 },
    { name: 'Feb', closureRate: 83 },
    { name: 'Mar', closureRate: 89 },
    { name: 'Apr', closureRate: 91 },
    { name: 'May', closureRate: 94 },
    { name: 'Jun', closureRate: 97 }
  ];

  // Visual Palette
  const CHART_COLORS = ['#1e1b4b', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#71717a'];

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-950 selection:text-white flex flex-col font-sans antialiased scroll-smooth">
      
      {/* ── HEADER NAVIGATION ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-zinc-200/50 shadow-sm py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3">
              <BrandedLogo width={28} height={28} />
              <span className="font-extrabold text-md tracking-wider text-zinc-950 font-mono">ASSIST360</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-8 text-[12px] uppercase tracking-wider font-bold text-zinc-500 font-mono">
              <a href="#features" className="hover:text-zinc-950 transition">Difference</a>
              <a href="#showcase" className="hover:text-zinc-950 transition">Showcase</a>
              <a href="#analytics" className="hover:text-zinc-950 transition">Analytics</a>
              <a href="#security" className="hover:text-zinc-950 transition">Security</a>
              <a href="#compare" className="hover:text-zinc-950 transition">Comparison</a>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="h-9 text-[12px] font-bold uppercase tracking-wider font-mono text-zinc-600 hover:text-zinc-950">
              <Link href="/login">Portal Login</Link>
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-9 text-[11px] font-bold uppercase tracking-wider font-mono bg-zinc-950 hover:bg-zinc-900 text-white rounded-lg px-4 shadow-sm transition active:scale-[0.98]">
                  Book a Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-md p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-zinc-900">Request Platform Demo</DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 font-mono">
                    Experience the ASSIST360 Enterprise Command Center.
                  </DialogDescription>
                </DialogHeader>
                {demoSubmitted ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-250 text-zinc-900 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-md font-bold text-zinc-900">Request Received</h3>
                    <p className="text-xs text-zinc-500 font-mono">An operations architect will reach out shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Full Name</label>
                      <input required type="text" placeholder="David Vance" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Business Email</label>
                      <input required type="email" placeholder="d.vance@company.com" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Enterprise Organization</label>
                      <input required type="text" placeholder="Enterprise Group" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="submit" className="w-full bg-zinc-950 hover:bg-zinc-900 text-white font-bold uppercase tracking-wider text-[11px] py-2.5 rounded-xl font-mono">
                        Submit & Schedule
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* ── SECTION 1: GLOBAL HERO EXPERIENCE ── */}
      <section className="pt-32 pb-20 md:pt-44 md:pb-32 relative border-b border-zinc-200/50 bg-gradient-to-b from-white to-zinc-50/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* HERO LEFT */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <Badge variant="outline" className="text-[10px] font-bold border-zinc-300 font-mono tracking-widest text-zinc-650 bg-zinc-100 py-1 uppercase rounded-full">
                SaaS Enterprise Platform
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-zinc-950 leading-[1.05]">
                Run Your Entire SAP AMS Operation From One Platform
              </h1>
              <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed max-w-xl">
                Manage customers, consultants, contracts, tickets, approvals, escalations, SLAs, workloads, service delivery, and executive reporting through a single enterprise command center.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="h-11 px-6 bg-zinc-950 hover:bg-zinc-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition active:scale-[0.98]">
                      Book a Demo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-md p-6">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold text-zinc-900">Request Platform Demo</DialogTitle>
                      <DialogDescription className="text-xs text-zinc-500 font-mono">
                        Experience the ASSIST360 Enterprise Command Center.
                      </DialogDescription>
                    </DialogHeader>
                    {demoSubmitted ? (
                      <div className="text-center py-6 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-250 text-zinc-900 flex items-center justify-center mx-auto">
                          <CheckCircle2 size={24} />
                        </div>
                        <h3 className="text-md font-bold text-zinc-900">Request Received</h3>
                        <p className="text-xs text-zinc-500 font-mono">An operations architect will reach out shortly.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Full Name</label>
                          <input required type="text" placeholder="David Vance" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Business Email</label>
                          <input required type="email" placeholder="d.vance@company.com" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Enterprise Organization</label>
                          <input required type="text" placeholder="Enterprise Group" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                        </div>
                        <DialogFooter className="pt-2">
                          <Button type="submit" className="w-full bg-zinc-950 hover:bg-zinc-900 text-white font-bold uppercase tracking-wider text-[11px] py-2.5 rounded-xl font-mono">
                            Submit & Schedule
                          </Button>
                        </DialogFooter>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>

                <Button asChild variant="outline" className="h-11 px-6 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider rounded-xl">
                  <a href="#showcase">Explore Platform</a>
                </Button>
              </div>

              {/* Micro Trust Indicators */}
              <div className="pt-6 border-t border-zinc-200/80 grid grid-cols-2 gap-y-3 gap-x-6 text-[11px] font-bold font-mono text-zinc-550 uppercase">
                <span className="flex items-center gap-2">
                  <Check size={12} className="text-zinc-950 stroke-[3px]" /> Enterprise Ready
                </span>
                <span className="flex items-center gap-2">
                  <Check size={12} className="text-zinc-950 stroke-[3px]" /> SLA Driven
                </span>
                <span className="flex items-center gap-2">
                  <Check size={12} className="text-zinc-950 stroke-[3px]" /> Multi Role Architecture
                </span>
                <span className="flex items-center gap-2">
                  <Check size={12} className="text-zinc-950 stroke-[3px]" /> Real Time Analytics
                </span>
              </div>
            </div>

            {/* HERO RIGHT: FLOATING DASHBOARD VISUALIZATION */}
            <div className="lg:col-span-6 relative flex items-center justify-center min-h-[380px]">
              
              {/* Decorative Ambient Background Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 -z-10"></div>
              
              {/* Main Core Stack Frame */}
              <div className="relative w-full max-w-lg p-6 bg-white/40 border border-zinc-200/80 rounded-2xl shadow-xl backdrop-blur-md space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-250 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 block"></span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Operations Console</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono border-emerald-300 text-emerald-800 bg-emerald-50 font-bold rounded uppercase">
                    System active
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Floating Card 1: SLA Health */}
                  <Card className="bg-white border-zinc-200 shadow-sm p-4 hover:scale-[1.02] transition duration-300">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">SLA Health</span>
                      <Activity size={12} className="text-emerald-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-zinc-950">98.7%</span>
                      <span className="text-[9px] text-zinc-500 font-mono">Compliance</span>
                    </div>
                  </Card>

                  {/* Floating Card 2: Escalation Alerts */}
                  <Card className="bg-white border-zinc-200 shadow-sm p-4 border-l-2 border-l-red-500 hover:scale-[1.02] transition duration-300">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Alerts Queue</span>
                      <ShieldAlert size={12} className="text-red-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-zinc-950">2</span>
                      <span className="text-[9px] text-zinc-500 font-mono">Critical Items</span>
                    </div>
                  </Card>
                </div>

                {/* Floating Card 3: Ticket Trends chart mockup */}
                <Card className="bg-white border-zinc-200 shadow-sm p-4 hover:scale-[1.02] transition duration-300 space-y-2">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Weekly Ticket Intake Trend</span>
                    <span className="text-[8px] text-zinc-500 font-mono">Weekly logs</span>
                  </div>
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ticketVolumeData.slice(-4)} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                        <defs>
                          <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="raised" stroke="#18181b" strokeWidth={2} fill="url(#heroChartGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  {/* Floating Card 4: Consultant Capacity */}
                  <Card className="bg-white border-zinc-200 shadow-sm p-4 hover:scale-[1.02] transition duration-300">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">Resource load</span>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">Utilization:</span>
                        <span className="font-bold text-zinc-950">84%</span>
                      </div>
                      <Progress value={84} className="h-1 bg-zinc-100 [&>div]:bg-zinc-900" />
                    </div>
                  </Card>

                  {/* Floating Card 5: Contract Burn */}
                  <Card className="bg-white border-zinc-200 shadow-sm p-4 hover:scale-[1.02] transition duration-300">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">Customer Burn</span>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">Hours Burnt:</span>
                        <span className="font-bold text-zinc-950">72%</span>
                      </div>
                      <Progress value={72} className="h-1 bg-zinc-100 [&>div]:bg-zinc-900" />
                    </div>
                  </Card>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 2: SOCIAL PROOF ── */}
      <section className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">Trusted by High Performing Service Organizations</h2>
            <p className="text-2xl font-black tracking-tight text-zinc-950">Proven Scale for Global Operations</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <Card className="p-6 bg-zinc-50/50 border-zinc-200 text-center shadow-sm hover:border-zinc-350 transition duration-300">
              <span className="text-3xl font-black font-mono text-zinc-950 block">99.95%</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mt-2">Platform Availability</span>
            </Card>
            <Card className="p-6 bg-zinc-50/50 border-zinc-200 text-center shadow-sm hover:border-zinc-350 transition duration-300">
              <span className="text-3xl font-black font-mono text-zinc-950 block">500,000+</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mt-2">Service Hours Managed</span>
            </Card>
            <Card className="p-6 bg-zinc-50/50 border-zinc-200 text-center shadow-sm hover:border-zinc-350 transition duration-300">
              <span className="text-3xl font-black font-mono text-zinc-950 block">50,000+</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mt-2">Tickets Resolved</span>
            </Card>
            <Card className="p-6 bg-zinc-50/50 border-zinc-200 text-center shadow-sm hover:border-zinc-350 transition duration-300">
              <span className="text-3xl font-black font-mono text-zinc-950 block">98.7%</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mt-2">SLA Compliance</span>
            </Card>
            <Card className="p-6 bg-zinc-50/50 border-zinc-200 text-center shadow-sm hover:border-zinc-350 transition duration-300">
              <span className="text-3xl font-black font-mono text-zinc-950 block">95%</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mt-2">Customer Satisfaction</span>
            </Card>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: THE PROBLEM ── */}
      <section className="py-20 bg-zinc-50/40 border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <Badge variant="outline" className="text-[9px] font-bold border-red-200 font-mono tracking-widest text-red-700 bg-red-50 py-0.5 uppercase rounded-full">
              Operations Audit
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-950">
              Service Delivery Shouldn't Be Spread Across 10 Different Tools
            </h2>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">
              Managing enterprise clients and SLAs in separate ticketing systems, Excel timesheets, and email loops creates operational friction and delivery blindspots.
            </p>
          </div>

          {/* Comparison challenges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4 border border-red-200/80 bg-red-50/20 p-6 rounded-2xl">
              <h3 className="text-xs uppercase font-bold text-red-800 tracking-wider font-mono border-b border-red-100 pb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> The Disjointed Traditional Setup
              </h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-red-650 font-bold font-mono">01.</span>
                  <div>
                    <span className="font-bold text-zinc-950 block">Ticket Chaos</span>
                    <span className="text-zinc-500">Tickets assigned without knowing module specialization, causing resolution delays.</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-red-650 font-bold font-mono">02.</span>
                  <div>
                    <span className="font-bold text-zinc-950 block">No Visibility Into Customer Health</span>
                    <span className="text-zinc-500">CSAT and escalations are disconnected, leaving delivery heads blind to account risks.</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-red-650 font-bold font-mono">03.</span>
                  <div>
                    <span className="font-bold text-zinc-950 block">Poor Resource Planning</span>
                    <span className="text-zinc-500">Consultant utilization is estimated, leading to overload or unassigned benches.</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-red-650 font-bold font-mono">04.</span>
                  <div>
                    <span className="font-bold text-zinc-950 block">Contract Hours Are Hard To Track</span>
                    <span className="text-zinc-500">Burnt actual hours are logged in offline spreadsheets, causing billing leaks.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border border-zinc-350 bg-white p-6 rounded-2xl shadow-sm">
              <h3 className="text-xs uppercase font-bold text-zinc-800 tracking-wider font-mono border-b border-zinc-150 pb-2 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-zinc-950" /> Unified Command Tower
              </h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-zinc-950 font-bold font-mono">01.</span>
                  <div>
                    <span className="font-bold text-zinc-950 block">Module-Driven Routing</span>
                    <span className="text-zinc-500">ASSIST360 automatically matches incoming tickets to module-certified consultants.</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-950 font-bold font-mono">02.</span>
                  <div>
                    <span className="font-bold text-zinc-950 block">Customer Health Scoring</span>
                    <span className="text-zinc-500">Real-time health grading combines CSAT scores, SLA response rates, and active escalations.</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-950 font-bold font-mono">03.</span>
                  <div>
                    <span className="font-bold text-zinc-950 block">Telemetry Workload Balancing</span>
                    <span className="text-zinc-500">Consolidated backlogs and approved actual hours track consultant capacity automatically.</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-950 font-bold font-mono">04.</span>
                  <div>
                    <span className="font-bold text-zinc-950 block">Contract Burn Accountability</span>
                    <span className="text-zinc-500">Hour consumption calculates strictly from manager-approved actual effort records in real-time.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: THE ASSIST360 DIFFERENCE ── */}
      <section id="features" className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">System Architecture</h2>
            <p className="text-3xl font-black tracking-tight text-zinc-950">One Platform. Complete Visibility.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-zinc-200 p-6 bg-zinc-50/20 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-3">
                <FileText size={20} className="text-zinc-950" />
                <CardTitle className="text-sm font-bold text-zinc-950 font-mono uppercase">Ticket Operations</CardTitle>
                <CardDescription className="text-xs text-zinc-550 font-medium font-sans">
                  Manage incidents, service requests, enhancements, and change requests. Route tickets according to technical or functional categories automatically.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-zinc-200 p-6 bg-zinc-50/20 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-3">
                <HeartHandshake size={20} className="text-zinc-950" />
                <CardTitle className="text-sm font-bold text-zinc-950 font-mono uppercase">Customer Success</CardTitle>
                <CardDescription className="text-xs text-zinc-550 font-medium font-sans">
                  Track customer health metrics, satisfaction ratings, and active escalations. Stay ahead of contract renewals with warning telemetry tags.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-zinc-200 p-6 bg-zinc-50/20 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-3">
                <Users size={20} className="text-zinc-950" />
                <CardTitle className="text-sm font-bold text-zinc-950 font-mono uppercase">Consultant Operations</CardTitle>
                <CardDescription className="text-xs text-zinc-550 font-medium font-sans">
                  Monitor capacity and approved actual efforts. Distribute queues dynamically to maintain high SLA compliance and optimal resource utilization.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-zinc-200 p-6 bg-zinc-50/20 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-3">
                <Calendar size={20} className="text-zinc-950" />
                <CardTitle className="text-sm font-bold text-zinc-950 font-mono uppercase">Contract Governance</CardTitle>
                <CardDescription className="text-xs text-zinc-550 font-medium font-sans">
                  Track monthly hour limits and remaining capacities. Avoid billing leakage by locking timesheet edits behind manager validation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-zinc-200 p-6 bg-zinc-50/20 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-3">
                <Zap size={20} className="text-zinc-950" />
                <CardTitle className="text-sm font-bold text-zinc-950 font-mono uppercase">Approval Workflows</CardTitle>
                <CardDescription className="text-xs text-zinc-550 font-medium font-sans">
                  Streamline timesheet effort logs, ticket closure validations, soft delete approvals, and access unlock requests in a central operations queue.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-zinc-200 p-6 bg-zinc-50/20 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-3">
                <TrendingUp size={20} className="text-zinc-950" />
                <CardTitle className="text-sm font-bold text-zinc-950 font-mono uppercase">Executive Analytics</CardTitle>
                <CardDescription className="text-xs text-zinc-550 font-medium font-sans">
                  Generate cross-customer reports, trend charts, response times, and billing burn graphs with zero caching latency.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: PRODUCT SHOWCASE ── */}
      <section id="showcase" className="py-20 bg-zinc-50/40 border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">Product Walkthrough</h2>
            <p className="text-3xl font-black tracking-tight text-zinc-950">Built For Enterprise Service Delivery</p>
          </div>

          <Tabs value={selectedShowcaseTab} onValueChange={setSelectedShowcaseTab} className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="bg-zinc-100 p-1 border border-zinc-200 w-fit gap-1 rounded-xl">
                <TabsTrigger value="customer-360" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Customer 360</TabsTrigger>
                <TabsTrigger value="consultant-360" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Consultant 360</TabsTrigger>
                <TabsTrigger value="manager-command" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Manager Center</TabsTrigger>
                <TabsTrigger value="executive-tower" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Executive Tower</TabsTrigger>
              </TabsList>
            </div>

            {/* Showcase Visual Panels */}
            <div className="border border-zinc-200 rounded-2xl bg-white p-6 shadow-sm min-h-[360px]">
              
              <TabsContent value="customer-360" className="space-y-6 mt-0">
                <div className="flex flex-col lg:flex-row justify-between gap-6 pb-4 border-b border-zinc-100">
                  <div className="space-y-1 max-w-md">
                    <Badge variant="outline" className="bg-zinc-100 font-mono text-[9px] uppercase font-bold text-zinc-600 rounded">Workspace: Client Portal</Badge>
                    <h3 className="text-lg font-black text-zinc-950">Consolidated Customer Profile View</h3>
                    <p className="text-xs text-zinc-550">Empowers clients to audit their own contract balances, raise tickets, and verify open cases.</p>
                  </div>
                  <div className="flex gap-4 font-mono text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[9px] uppercase">Active Contract</span>
                      <span className="font-bold text-zinc-950">AMS Support Limit</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[9px] uppercase">CSAT score</span>
                      <span className="font-bold text-emerald-700">4.8 / 5.0</span>
                    </div>
                  </div>
                </div>
                
                {/* Table representation */}
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-50 text-[9px] font-mono">
                      <TableRow>
                        <TableHead>Customer Profile</TableHead>
                        <TableHead>Contracts</TableHead>
                        <TableHead className="text-center">Open Tickets</TableHead>
                        <TableHead className="text-center">Health Status</TableHead>
                        <TableHead className="text-center">Escalations</TableHead>
                        <TableHead className="text-center">Satisfaction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs font-mono">
                      <TableRow>
                        <TableCell className="font-bold text-zinc-950">Apex Global Industries</TableCell>
                        <TableCell>S/4HANA AMS (250h/mo)</TableCell>
                        <TableCell className="text-center font-bold">4</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[8px] uppercase font-bold">Healthy</Badge>
                        </TableCell>
                        <TableCell className="text-center text-zinc-400">0</TableCell>
                        <TableCell className="text-center font-bold text-emerald-700">4.8 / 5.0</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold text-zinc-950">Titan Energy Corp</TableCell>
                        <TableCell>Basis Maintenance (100h/mo)</TableCell>
                        <TableCell className="text-center font-bold">2</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-amber-50 text-amber-800 border-amber-250 text-[8px] uppercase font-bold">Watchlist</Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-red-500">1</TableCell>
                        <TableCell className="text-center font-bold text-zinc-400">N/A</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="consultant-360" className="space-y-6 mt-0">
                <div className="flex flex-col lg:flex-row justify-between gap-6 pb-4 border-b border-zinc-100">
                  <div className="space-y-1 max-w-md">
                    <Badge variant="outline" className="bg-zinc-100 font-mono text-[9px] uppercase font-bold text-zinc-600 rounded">Workspace: Consultant Ledger</Badge>
                    <h3 className="text-lg font-black text-zinc-950">Consultant Utilization & Timesheet Control</h3>
                    <p className="text-xs text-zinc-550">Tracks logged functional vs. technical efforts against estimated hours to optimize capacities.</p>
                  </div>
                  <div className="flex gap-4 font-mono text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[9px] uppercase">Average Load</span>
                      <span className="font-bold text-zinc-950">82% Capacity</span>
                    </div>
                  </div>
                </div>

                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-50 text-[9px] font-mono">
                      <TableRow>
                        <TableHead>Consultant</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Active Backlog</TableHead>
                        <TableHead className="text-right">Approved Hours</TableHead>
                        <TableHead className="text-center">SLA Compliance</TableHead>
                        <TableHead className="text-center">Workload Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs font-mono">
                      <TableRow>
                        <TableCell className="font-bold text-zinc-950">Keerthana S.</TableCell>
                        <TableCell>Technical (ABAP)</TableCell>
                        <TableCell className="text-center font-bold">5</TableCell>
                        <TableCell className="text-right font-bold">132.5h</TableCell>
                        <TableCell className="text-center text-emerald-700 font-bold">98.2%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-250 text-[8px] uppercase font-bold">Near Capacity</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold text-zinc-950">David Foster</TableCell>
                        <TableCell>Functional (FICO)</TableCell>
                        <TableCell className="text-center font-bold">1</TableCell>
                        <TableCell className="text-right font-bold">34.0h</TableCell>
                        <TableCell className="text-center text-emerald-700 font-bold">100%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 text-[8px] uppercase font-bold">Available</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="manager-command" className="space-y-6 mt-0">
                <div className="flex flex-col lg:flex-row justify-between gap-6 pb-4 border-b border-zinc-100">
                  <div className="space-y-1 max-w-md">
                    <Badge variant="outline" className="bg-zinc-100 font-mono text-[9px] uppercase font-bold text-zinc-600 rounded">Workspace: Manager Dashboard</Badge>
                    <h3 className="text-lg font-black text-zinc-950">Manager Governance & SLA Risk Audit</h3>
                    <p className="text-xs text-zinc-550">Allows managers to oversee ticket assignments, process approvals, and mitigate SLA breaches.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Simulator box */}
                  <div className="p-4 border border-zinc-200 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Resource Balancer Demo</span>
                      <Button onClick={runBalanceSimulation} className="h-7 text-[9px] font-bold uppercase tracking-wider font-mono bg-zinc-950 hover:bg-zinc-900 text-white rounded">
                        Rebalance Queue
                      </Button>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      {simulateConsultants.map(c => (
                        <div key={c.name} className="flex justify-between items-center p-2 bg-zinc-50 rounded border border-zinc-150">
                          <span className="font-bold text-zinc-900">{c.name}</span>
                          <div className="flex gap-4">
                            <span className="text-zinc-500">{c.active} Tickets</span>
                            <Badge variant="outline" className={`text-[8px] uppercase ${
                              c.load === 'Overloaded' ? 'bg-red-50 text-red-700 border-red-200' :
                              c.load === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              c.load === 'Near Capacity' ? 'bg-amber-50 text-amber-700 border-amber-250' :
                              'bg-zinc-100 text-zinc-600'
                            }`}>
                              {c.load}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions list preview */}
                  <div className="p-4 border border-zinc-200 rounded-xl space-y-3 font-mono text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Pending approvals</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-zinc-50 rounded border border-zinc-150">
                        <div>
                          <span className="font-bold text-zinc-900 block">Closure: SST-MM-1024</span>
                          <span className="text-[10px] text-zinc-500">Titan Energy (Total Actual Hours: 14.5h)</span>
                        </div>
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[8px] uppercase">Awaiting</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-zinc-50 rounded border border-zinc-150">
                        <div>
                          <span className="font-bold text-zinc-900 block">Timesheet Log Approval</span>
                          <span className="text-[10px] text-zinc-500">David Foster (4.0 hours - Functional)</span>
                        </div>
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[8px] uppercase">Awaiting</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="executive-tower" className="space-y-6 mt-0">
                <div className="flex flex-col lg:flex-row justify-between gap-6 pb-4 border-b border-zinc-100">
                  <div className="space-y-1 max-w-md">
                    <Badge variant="outline" className="bg-zinc-100 font-mono text-[9px] uppercase font-bold text-zinc-600 rounded">Workspace: Executive Control Tower</Badge>
                    <h3 className="text-lg font-black text-zinc-950">Executive Control Tower Dashboard</h3>
                    <p className="text-xs text-zinc-550">High-level contract burn rates, compliance trends, and customer risk scoring metrics.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 border-zinc-200 text-center font-mono">
                    <span className="text-[9px] font-bold text-zinc-400 block uppercase">Global SLA Compliance</span>
                    <span className="text-xl font-bold text-emerald-700 mt-2 block">98.7%</span>
                  </Card>
                  <Card className="p-4 border-zinc-200 text-center font-mono">
                    <span className="text-[9px] font-bold text-zinc-400 block uppercase">Contract Utilization</span>
                    <span className="text-xl font-bold text-zinc-950 mt-2 block">76.4%</span>
                  </Card>
                  <Card className="p-4 border-zinc-200 text-center font-mono">
                    <span className="text-[9px] font-bold text-zinc-400 block uppercase">Active Escalations</span>
                    <span className="text-xl font-bold text-red-600 mt-2 block">2</span>
                  </Card>
                  <Card className="p-4 border-zinc-200 text-center font-mono">
                    <span className="text-[9px] font-bold text-zinc-400 block uppercase">Total Approved Efforts</span>
                    <span className="text-xl font-bold text-zinc-950 mt-2 block">2,410.5h</span>
                  </Card>
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </section>

      {/* ── SECTION 6: ENTERPRISE ANALYTICS ── */}
      <section id="analytics" className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">Operations Intelligence</h2>
            <p className="text-3xl font-black tracking-tight text-zinc-950">Data That Drives Decisions</p>
          </div>

          <Tabs value={selectedAnalyticsTab} onValueChange={setSelectedAnalyticsTab} className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="bg-zinc-100 p-1 border border-zinc-200 flex-wrap gap-1 rounded-xl max-w-full justify-start md:justify-center h-auto">
                <TabsTrigger value="ticket-vol" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Ticket Volume</TabsTrigger>
                <TabsTrigger value="sla-trend" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">SLA Compliance</TabsTrigger>
                <TabsTrigger value="cust-health" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Customer Health</TabsTrigger>
                <TabsTrigger value="esc-trend" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Escalations</TabsTrigger>
                <TabsTrigger value="util-trend" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Utilization</TabsTrigger>
                <TabsTrigger value="contract-util" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Contract Burn</TabsTrigger>
                <TabsTrigger value="res-time" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Resolution Time</TabsTrigger>
                <TabsTrigger value="approval-trend" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Approvals</TabsTrigger>
                <TabsTrigger value="closure-trend" className="text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg">Closure Rate</TabsTrigger>
              </TabsList>
            </div>

            <Card className="border border-zinc-200 bg-white p-6 rounded-xl shadow-sm">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    if (selectedAnalyticsTab === 'ticket-vol') {
                      return (
                        <BarChart data={ticketVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="raised" name="Tickets Raised" fill="#1e1b4b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="closed" name="Tickets Closed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      );
                    }
                    if (selectedAnalyticsTab === 'sla-trend') {
                      return (
                        <AreaChart data={slaComplianceData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="slaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} domain={[90, 100]} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Area type="monotone" dataKey="compliance" name="SLA Compliance %" stroke="#10b981" fill="url(#slaGrad)" strokeWidth={2} />
                        </AreaChart>
                      );
                    }
                    if (selectedAnalyticsTab === 'cust-health') {
                      return (
                        <BarChart data={customerHealthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="healthy" name="Healthy Clients" fill="#10b981" stackId="health" />
                          <Bar dataKey="atRisk" name="At Risk Clients" fill="#f59e0b" stackId="health" />
                          <Bar dataKey="critical" name="Critical Clients" fill="#ef4444" stackId="health" />
                        </BarChart>
                      );
                    }
                    if (selectedAnalyticsTab === 'esc-trend') {
                      return (
                        <LineChart data={escalationTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Line type="monotone" dataKey="count" name="Escalated Tickets Count" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      );
                    }
                    if (selectedAnalyticsTab === 'util-trend') {
                      return (
                        <LineChart data={consultantUtilTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} domain={[50, 100]} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Line type="monotone" dataKey="util" name="Avg Utilization %" stroke="#4f46e5" strokeWidth={2} />
                        </LineChart>
                      );
                    }
                    if (selectedAnalyticsTab === 'contract-util') {
                      return (
                        <BarChart data={contractUtilTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="burnt" name="Hours Consumed" fill="#312e81" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="limit" name="Contract Ceiling" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      );
                    }
                    if (selectedAnalyticsTab === 'res-time') {
                      return (
                        <AreaChart data={resolutionTimeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4338ca" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#4338ca" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Area type="monotone" dataKey="minutes" name="Resolution Time (min)" stroke="#4338ca" fill="url(#resGrad)" strokeWidth={2} />
                        </AreaChart>
                      );
                    }
                    if (selectedAnalyticsTab === 'approval-trend') {
                      return (
                        <BarChart data={approvalTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="pending" name="Pending Log Requests" fill="#f59e0b" stackId="appr" />
                          <Bar dataKey="approved" name="Approved Logs" fill="#10b981" stackId="appr" />
                        </BarChart>
                      );
                    }
                    if (selectedAnalyticsTab === 'closure-trend') {
                      return (
                        <LineChart data={closureTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                          <YAxis stroke="#71717a" fontSize={9} domain={[60, 100]} className="font-mono" />
                          <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Line type="monotone" dataKey="closureRate" name="First-Time Right Closure Rate %" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                      );
                    }
                    return null;
                  })()}
                </ResponsiveContainer>
              </div>
            </Card>
          </Tabs>
        </div>
      </section>

      {/* ── SECTION 7: WORKFLOW VISUALIZATION ── */}
      <section className="py-20 bg-zinc-50/40 border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">Delivery Lifecycle</h2>
            <p className="text-3xl font-black tracking-tight text-zinc-950">Designed Around Real Service Operations</p>
          </div>

          {/* Timeline UI */}
          <div className="relative max-w-3xl mx-auto px-4">
            {/* Center line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-200 -translate-x-1/2"></div>
            
            <div className="space-y-12 relative">
              {/* Point 1 */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="md:w-1/2 text-right md:pr-8 space-y-1">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Step 01</span>
                  <h4 className="text-sm font-bold text-zinc-950">Customer Raises Ticket</h4>
                  <p className="text-xs text-zinc-500">Client files ticket via portal or email. Dynamic filters suggest relevant articles.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-950 shrink-0 z-10 flex items-center justify-center font-mono font-bold text-xs text-zinc-950 shadow-sm">
                  1
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

              {/* Point 2 */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="hidden md:block md:w-1/2"></div>
                <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-950 shrink-0 z-10 flex items-center justify-center font-mono font-bold text-xs text-zinc-950 shadow-sm">
                  2
                </div>
                <div className="md:w-1/2 text-left md:pl-8 space-y-1">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Step 02</span>
                  <h4 className="text-sm font-bold text-zinc-950">Manager Reviews</h4>
                  <p className="text-xs text-zinc-500">Manager validates priorities, checks contract hourly burns, and reviews client context.</p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="md:w-1/2 text-right md:pr-8 space-y-1">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Step 03</span>
                  <h4 className="text-sm font-bold text-zinc-950">Resource Assignment</h4>
                  <p className="text-xs text-zinc-500">Module matching and load balancing allocate the case to the right certified engineer.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-950 shrink-0 z-10 flex items-center justify-center font-mono font-bold text-xs text-zinc-950 shadow-sm">
                  3
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

              {/* Point 4 */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="hidden md:block md:w-1/2"></div>
                <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-950 shrink-0 z-10 flex items-center justify-center font-mono font-bold text-xs text-zinc-950 shadow-sm">
                  4
                </div>
                <div className="md:w-1/2 text-left md:pl-8 space-y-1">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Step 04</span>
                  <h4 className="text-sm font-bold text-zinc-950">Consultant Execution</h4>
                  <p className="text-xs text-zinc-500">Engineer resolves issues, designs enhancements, and logs actual efforts with Transport Requests.</p>
                </div>
              </div>

              {/* Point 5 */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="md:w-1/2 text-right md:pr-8 space-y-1">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Step 05</span>
                  <h4 className="text-sm font-bold text-zinc-950">Approval Process</h4>
                  <p className="text-xs text-zinc-500">Logged effort entries route directly to the manager dashboard queue for timesheet auditing.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-950 shrink-0 z-10 flex items-center justify-center font-mono font-bold text-xs text-zinc-950 shadow-sm">
                  5
                </div>
                <div className="hidden md:block md:w-1/2"></div>
              </div>

              {/* Point 6 */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="hidden md:block md:w-1/2"></div>
                <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-950 shrink-0 z-10 flex items-center justify-center font-mono font-bold text-xs text-zinc-950 shadow-sm">
                  6
                </div>
                <div className="md:w-1/2 text-left md:pl-8 space-y-1">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Step 06</span>
                  <h4 className="text-sm font-bold text-zinc-950">Closure & CSAT Feedback</h4>
                  <p className="text-xs text-zinc-500">Resolution closes the ticket, and the customer provides scoring feedback (CSAT).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: CUSTOMER SUCCESS STORIES ── */}
      <section className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">Case Studies</h2>
            <p className="text-3xl font-black tracking-tight text-zinc-950">Trusted by High Performing Service Teams</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-zinc-50/20 border-zinc-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition duration-300">
              <p className="text-xs text-zinc-600 italic">"Assist360 gave us complete visibility across service delivery, combining timesheets with ticket workflows."</p>
              <div className="pt-6 font-mono">
                <span className="font-bold text-xs text-zinc-950 block">Emma Richardson</span>
                <span className="text-[10px] text-zinc-400 block">VP Operations</span>
              </div>
            </Card>

            <Card className="p-6 bg-zinc-50/20 border-zinc-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition duration-300">
              <p className="text-xs text-zinc-600 italic">"We reduced ticket turnaround times by over 40% with module-based routing and automated SLA warnings."</p>
              <div className="pt-6 font-mono">
                <span className="font-bold text-xs text-zinc-950 block">Michael Thompson</span>
                <span className="text-[10px] text-zinc-400 block">Director of Managed Services</span>
              </div>
            </Card>

            <Card className="p-6 bg-zinc-50/20 border-zinc-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition duration-300">
              <p className="text-xs text-zinc-600 italic">"The contract and utilization tracking alone transformed our AMS operation, saving billing leakages."</p>
              <div className="pt-6 font-mono">
                <span className="font-bold text-xs text-zinc-950 block">Sophia Walker</span>
                <span className="text-[10px] text-zinc-400 block">Head of Customer Success</span>
              </div>
            </Card>

            <Card className="p-6 bg-zinc-50/20 border-zinc-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition duration-300">
              <p className="text-xs text-zinc-600 italic">"The executive dashboard provides exactly what leadership needs: burn rates, compliance, and CSAT scores."</p>
              <div className="pt-6 font-mono">
                <span className="font-bold text-xs text-zinc-950 block">Daniel Foster</span>
                <span className="text-[10px] text-zinc-400 block">IT Operations Director</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: CONTRACT GOVERNANCE SHOWCASE ── */}
      <section className="py-20 bg-zinc-50/40 border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <Badge variant="outline" className="bg-indigo-50 border-indigo-150 text-[9px] font-mono font-bold uppercase rounded">Operational Control</Badge>
              <h2 className="text-3xl font-black text-zinc-950 leading-tight">Know Exactly Where Every Service Hour Goes</h2>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed font-sans">
                Track contracted limits, monthly budget hours, actual efforts, and remaining capacities. Foresee contract utilization trends to request extensions before capacity boundaries breach.
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-white border border-zinc-200 rounded-lg">
                  <span className="text-[9px] text-zinc-400 block uppercase">Contracted</span>
                  <span className="font-bold text-zinc-950">2,500 Hours</span>
                </div>
                <div className="p-3 bg-white border border-zinc-200 rounded-lg">
                  <span className="text-[9px] text-zinc-400 block uppercase">Burnt</span>
                  <span className="font-bold text-indigo-700">1,820 Hours</span>
                </div>
              </div>
            </div>

            {/* Visual illustration of hour consumption forecast */}
            <div className="lg:col-span-7">
              <Card className="border border-zinc-200 p-6 bg-white rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-2">Contract hours consumption forecasting</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={contractUtilTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Area type="monotone" dataKey="burnt" stroke="#312e81" fill="#c7d2fe" fillOpacity={0.3} strokeWidth={2} name="Burnt Hours" />
                      <Area type="monotone" dataKey="limit" stroke="#71717a" strokeDasharray="4 4" fill="none" name="Upper Limit" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 10: RESOURCE MANAGEMENT SHOWCASE ── */}
      <section className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual Workload Distribution Card */}
            <div className="lg:col-span-7 order-last lg:order-first">
              <Card className="border border-zinc-200 p-6 bg-white rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-2">Resource allocation by module</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={simulateConsultants} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={8} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="hours" name="Burnt Hours" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="active" name="Active Tickets" fill="#1e1b4b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <Badge variant="outline" className="bg-zinc-50 border-zinc-250 text-[9px] font-mono font-bold uppercase rounded">Governance</Badge>
              <h2 className="text-3xl font-black text-zinc-950 leading-tight">Manage Consultants At Scale</h2>
              <p className="text-xs text-zinc-550 leading-relaxed font-sans">
                Review available functional vs. technical consultant capacities. Group resources by certified SAP modules, check active ticket backlogs, and distribute workloads to optimize delivery.
              </p>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="text-zinc-500">Utilization Rate Avg:</span>
                  <span className="font-bold text-zinc-950">84% Portfolio-wide</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="text-zinc-500">Functional vs Tech split:</span>
                  <span className="font-bold text-zinc-950">40% / 60%</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 11: ESCALATION WAR ROOM ── */}
      <section className="py-20 bg-zinc-50/40 border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 text-[9px] font-mono font-bold uppercase rounded">Escalation command</Badge>
              <h2 className="text-3xl font-black text-zinc-950 leading-tight">Never Miss A Critical Escalation Again</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Escalated tickets route to the Escalation War Room instantly. Monitor escalation aging times, ownership records, and mitigation steps. High-contrast indicators ensure delays receive immediate attention.
              </p>
              <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-2 font-mono text-xs text-zinc-800">
                <span className="font-bold text-red-650 block text-[10px] uppercase">Active Escalation Alerts</span>
                <div className="flex justify-between text-[11px] border-b border-zinc-50 pb-1">
                  <span>Apex Global (P1 Post Error):</span>
                  <span className="text-red-650 font-bold">Pending 42m</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Titan Energy (Sales API):</span>
                  <span className="text-amber-700 font-bold">Resolved</span>
                </div>
              </div>
            </div>

            {/* Escalation trend visualization */}
            <div className="lg:col-span-7">
              <Card className="border border-zinc-200 p-6 bg-white rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-2">Operational Escalation Trends</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={escalationTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} name="Escalation Count" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 12: SLA GOVERNANCE ── */}
      <section className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual SLA metric details */}
            <div className="lg:col-span-7 order-last lg:order-first">
              <Card className="border border-zinc-200 p-6 bg-white rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-2">SLA compliance monthly trend</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={slaComplianceData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="slaGradCol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} domain={[95, 100]} className="font-mono" />
                      <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Area type="monotone" dataKey="compliance" stroke="#10b981" fill="url(#slaGradCol)" strokeWidth={2} name="SLA compliance %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-800 text-[9px] font-mono font-bold uppercase rounded">Compliance engine</Badge>
              <h2 className="text-3xl font-black text-zinc-950 leading-tight">Protect Service Quality</h2>
              <p className="text-xs text-zinc-550 leading-relaxed font-sans">
                ASSIST360 automatically computes response and resolution targets using your client agreements. Warning states notify managers when cases approach thresholds, minimizing breaches.
              </p>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="text-zinc-550">SLA Response rate:</span>
                  <span className="font-bold text-zinc-900">99.1% Met</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="text-zinc-550">SLA Resolution compliance:</span>
                  <span className="font-bold text-zinc-900">98.7% Met</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 13: ENTERPRISE SECURITY ── */}
      <section id="security" className="py-20 bg-zinc-50/40 border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">Information Security</h2>
            <p className="text-3xl font-black tracking-tight text-zinc-950">Built With Enterprise Security In Mind</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-zinc-200 p-6 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-2 font-mono">
                <Shield size={16} className="text-zinc-950" />
                <CardTitle className="text-xs font-bold text-zinc-950 uppercase">Role-Based Access Control</CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-sans">
                  Granular roles restrict operations: customers log issues, consultants record efforts, and managers oversee contract capacities.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white border-zinc-200 p-6 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-2 font-mono">
                <Terminal size={16} className="text-zinc-950" />
                <CardTitle className="text-xs font-bold text-zinc-950 uppercase">Unified Audit Logs</CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-sans">
                  Track every configuration modification, comment creation, and status override in real-time postgres audit trail tables.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white border-zinc-200 p-6 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-2 font-mono">
                <Lock size={16} className="text-zinc-950" />
                <CardTitle className="text-xs font-bold text-zinc-950 uppercase">Secure Authentication</CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-sans">
                  Enforces password complexity checks, forced resets on initial deployment, and secure Supabase JWT session validations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white border-zinc-200 p-6 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-2 font-mono">
                <Database size={16} className="text-zinc-950" />
                <CardTitle className="text-xs font-bold text-zinc-950 uppercase">Data Encryption</CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-sans">
                  Enforces SSL in transit and AES-256 block encryption at rest across all transactional databases and S3 buckets.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white border-zinc-200 p-6 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-2 font-mono">
                <Sliders size={16} className="text-zinc-950" />
                <CardTitle className="text-xs font-bold text-zinc-950 uppercase">Granular Permissions</CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-sans">
                  Row Level Security (RLS) restricts access globally, ensuring clients can never view other clients' data pipelines.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white border-zinc-200 p-6 shadow-sm hover:scale-[1.01] transition duration-300">
              <CardHeader className="p-0 space-y-2 font-mono">
                <Activity size={16} className="text-zinc-950" />
                <CardTitle className="text-xs font-bold text-zinc-950 uppercase">Activity Tracking</CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-sans">
                  Logs device logins, timesheet modifications, and ticket status changes to safeguard security posture compliance.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* ── SECTION 14: WHY ASSIST360 (COMPARISON TABLE) ── */}
      <section id="compare" className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">Market Comparison</h2>
            <p className="text-3xl font-black tracking-tight text-zinc-950">Why Enterprise Teams Choose ASSIST360</p>
          </div>

          <div className="border border-zinc-200 rounded-2xl overflow-hidden max-w-4xl mx-auto shadow-sm">
            <Table>
              <TableHeader className="bg-zinc-50 font-mono text-[10px]">
                <TableRow>
                  <TableHead className="py-3 px-6 font-bold text-zinc-500">Feature Matrix</TableHead>
                  <TableHead className="py-3 px-6 text-center font-bold text-zinc-400">Traditional Ticketing Tool</TableHead>
                  <TableHead className="py-3 px-6 text-center font-bold text-zinc-950 bg-zinc-100">ASSIST360 Platform</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-mono">
                {[
                  { name: 'Ticket Management', trad: 'Basic fields', our: 'SAP Module-specific routing' },
                  { name: 'Customer Health', trad: 'Manual survey sheets', our: 'Real-time CSAT & Escalation indexes' },
                  { name: 'Contract Governance', trad: 'Disconnected Excel trackers', our: 'Approved Hour burn-down logic' },
                  { name: 'Resource Planning', trad: 'Estimated queues', our: 'Workload & Utilization load balancing' },
                  { name: 'SLA Management', trad: 'Static breach times', our: 'Dynamic warnings & notifications' },
                  { name: 'Executive Analytics', trad: 'Export to CSV', our: 'Direct telemetry reporting dashboards' },
                  { name: 'Consultant Performance', trad: 'Unmonitored efforts', our: 'Functional vs Technical hour split metrics' },
                  { name: 'Escalation Governance', trad: 'Logged via emails', our: 'Unified Escalation War Room feeds' },
                  { name: 'Customer Success', trad: 'Unlinked tools', our: 'Integrated account health ledger' },
                  { name: 'Executive Reporting', trad: 'Cached monthly reports', our: 'Real-time telemetry widgets' }
                ].map(row => (
                  <TableRow key={row.name} className="hover:bg-zinc-50/50 transition">
                    <TableCell className="py-3 px-6 font-bold text-zinc-900">{row.name}</TableCell>
                    <TableCell className="py-3 px-6 text-center text-zinc-500">{row.trad}</TableCell>
                    <TableCell className="py-3 px-6 text-center font-bold text-zinc-950 bg-zinc-50/20">{row.our}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ── SECTION 15: EXECUTIVE DASHBOARD PREVIEW ── */}
      <section className="py-20 bg-zinc-50/40 border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-zinc-400 tracking-widest font-mono">Product Telemetry</h2>
            <p className="text-3xl font-black tracking-tight text-zinc-950">Executive Control Tower Interface</p>
          </div>

          <div className="border border-zinc-200 rounded-3xl bg-white p-6 shadow-xl relative max-w-5xl mx-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 block"></span>
                <span className="font-bold text-xs text-zinc-950 font-mono tracking-wider">ASSIST360 EXECUTIVE Cockpit</span>
              </div>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-250 text-[10px] font-bold font-mono rounded">
                Live Data Binding
              </Badge>
            </div>

            {/* Dashboard Mockup Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
              <Card className="p-4 border-zinc-200 space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Customer Health Board</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Apex Global:</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[8px] uppercase">Healthy</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Titan Energy:</span>
                    <Badge className="bg-red-50 text-red-700 border-red-200 text-[8px] uppercase">Critical</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-zinc-200 space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">SLA Breach Risks</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>SST-MM-1024:</span>
                    <span className="text-red-650 font-bold">12m to breach</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SST-FI-1032:</span>
                    <span className="text-amber-700 font-bold">34m warning</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-zinc-200 space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Capacity Balance</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>David Foster:</span>
                    <span className="font-bold text-zinc-900">145h logged</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Keerthana S.:</span>
                    <span className="font-bold text-zinc-900">130h logged</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-center">
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-[9px] text-zinc-400 uppercase block">Active SLA Rate</span>
                <span className="text-lg font-bold text-emerald-700">98.7%</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-[9px] text-zinc-400 uppercase block">Burnt contract Hours</span>
                <span className="text-lg font-bold text-zinc-950">76.4%</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-[9px] text-zinc-400 uppercase block">Pending approvals</span>
                <span className="text-lg font-bold text-zinc-950">8</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-[9px] text-zinc-400 uppercase block">Active Client Accounts</span>
                <span className="text-lg font-bold text-zinc-950">12</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 16: STATISTICS WALL ── */}
      <section className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            <div className="space-y-1">
              <span className="text-3xl font-black font-mono text-zinc-950 block">500K+</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">Hours Tracked</span>
            </div>
            <div className="space-y-1">
              <span className="text-3xl font-black font-mono text-zinc-950 block">50K+</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">Tickets Managed</span>
            </div>
            <div className="space-y-1">
              <span className="text-3xl font-black font-mono text-zinc-950 block">98.7%</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">SLA Compliance</span>
            </div>
            <div className="space-y-1">
              <span className="text-3xl font-black font-mono text-zinc-950 block">95%</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">Customer Satisfaction</span>
            </div>
            <div className="space-y-1">
              <span className="text-3xl font-black font-mono text-zinc-950 block">99.95%</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">Platform Availability</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 17: FINAL CTA ── */}
      <section className="py-20 md:py-28 relative bg-zinc-50 border-b border-zinc-200/50">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <Badge variant="outline" className="text-[9px] font-bold border-zinc-300 font-mono tracking-widest text-zinc-650 bg-zinc-100 py-0.5 uppercase rounded-full">
            Operations Consolidation
          </Badge>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-950">
            Stop Managing Service Delivery Across Multiple Systems
          </h2>
          <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed max-w-xl mx-auto">
            Bring customers, consultants, contracts, tickets, approvals, SLAs, and analytics into one unified platform.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-11 px-6 bg-zinc-950 hover:bg-zinc-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg">
                  Book a Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-md p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-zinc-900">Request Platform Demo</DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 font-mono">
                    Experience the ASSIST360 Enterprise Command Center.
                  </DialogDescription>
                </DialogHeader>
                {demoSubmitted ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-250 text-zinc-900 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-md font-bold text-zinc-900">Request Received</h3>
                    <p className="text-xs text-zinc-500 font-mono">An operations architect will reach out shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Full Name</label>
                      <input required type="text" placeholder="David Vance" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Business Email</label>
                      <input required type="email" placeholder="d.vance@company.com" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Enterprise Organization</label>
                      <input required type="text" placeholder="Enterprise Group" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-950 focus:outline-none" />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="submit" className="w-full bg-zinc-950 hover:bg-zinc-900 text-white font-bold uppercase tracking-wider text-[11px] py-2.5 rounded-xl font-mono">
                        Submit & Schedule
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="h-11 px-6 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider rounded-xl">
              Talk To Sales
            </Button>
          </div>
        </div>
      </section>

      {/* ── SECTION 18: FOOTER ── */}
      <footer className="bg-zinc-950 text-zinc-400 py-16 text-xs border-t border-zinc-900 font-mono">
        <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4">
            <span className="font-extrabold text-white tracking-wider uppercase text-[10px] block">Platform</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">Ticket Operations</a></li>
              <li><a href="#" className="hover:text-white transition">Contract Governance</a></li>
              <li><a href="#" className="hover:text-white transition">Consultant Operations</a></li>
              <li><a href="#" className="hover:text-white transition">Analytics Engine</a></li>
              <li><a href="#" className="hover:text-white transition">Approvals Workspace</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-white tracking-wider uppercase text-[10px] block">Company</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">About Us</a></li>
              <li><a href="#" className="hover:text-white transition">Contact</a></li>
              <li><a href="#" className="hover:text-white transition">Careers</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-white tracking-wider uppercase text-[10px] block">Resources</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition">Support Desk</a></li>
              <li><a href="#" className="hover:text-white transition">Security Controls</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-white tracking-wider uppercase text-[10px] block">Legal</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-8 border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px]">
          <span>© 2026 Support Studio Technologies. All Rights Reserved.</span>
          <span>Powered by ASSIST360.</span>
        </div>
      </footer>

    </div>
  );
}
