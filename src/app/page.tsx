'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  Server,
  Globe,
  Settings,
  HelpCircle,
  Star,
  ShieldCheck,
  ClipboardList,
  BookOpen,
  Workflow,
  Eye,
  Download,
  Maximize2,
  CheckSquare,
  Code,
  Share2,
  Compass,
  FileSpreadsheet,
  AlertCircle
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
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Radar,
  ScatterChart,
  Scatter
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

// Custom post-mount counter for client-only number incrementation (prevents hydration mismatch)
function AnimatedCounter({ value, suffix = "", duration = 1500 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const stepsCount = 60;
    const increment = end / stepsCount;
    const stepDuration = duration / stepsCount;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= stepsCount) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(Math.floor(increment * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Modals & User Telemetry States
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoType, setDemoType] = useState('Standard Platform Demo');
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');

  // Hero interactive states
  const [heroTicketsCount, setHeroTicketsCount] = useState(142);
  const [heroSlaRate, setHeroSlaRate] = useState(99.42);
  const [heroEscalations, setHeroEscalations] = useState(2);
  const [heroSatisfaction, setHeroSatisfaction] = useState(4.92);
  const [heroLogOutput, setHeroLogOutput] = useState<string[]>([
    'SYSTEM: Initialized analytics bridge...',
    'AI: Classifying incoming SAP incident ticket #SST-429...',
    'AI: Auto-routed ticket to Basis Operations Desk (Confidence: 98%)'
  ]);
  const [heroLoading, setHeroLoading] = useState(false);

  // Platform Overview States
  const [activePlatformRole, setActivePlatformRole] = useState<'customer' | 'consultant' | 'manager' | 'executive' | 'admin'>('manager');
  const [overviewStep, setOverviewStep] = useState(0);

  // AI Sections State
  const [selectedAiFeature, setSelectedAiFeature] = useState('classify');

  // Live Analytics tab state (12 Charts total)
  const [activeAnalyticsCategory, setActiveAnalyticsCategory] = useState<'volume' | 'sla' | 'productivity' | 'security'>('volume');

  // Command Center Showcase (Manager View) State
  const [commandCenterLogs, setCommandCenterLogs] = useState<string[]>([
    'CRITICAL: Incident #SST-902 (DB Latency Spike) SLA at risk (12m remaining)',
    'ACTION: Auto-assigned escalation response team.',
    'SECURITY: Single Sign-On token verified for Tenant Client B.'
  ]);
  const [managerApprovals, setManagerApprovals] = useState(3);
  const [managerSlaBreaches, setManagerSlaBreaches] = useState(1);

  // Mount logic
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
    toast.success(`Briefing request for "${demoType}" submitted successfully.`);
    setTimeout(() => {
      setDemoSubmitted(false);
      setDemoModalOpen(false);
      setDemoName('');
      setDemoEmail('');
      setDemoCompany('');
    }, 2000);
  };

  const handleHeroSimulate = () => {
    setHeroLoading(true);
    setTimeout(() => {
      const newCount = Math.floor(Math.random() * 50) + 120;
      const newSla = parseFloat((98.5 + Math.random() * 1.4).toFixed(2));
      const newEsc = Math.floor(Math.random() * 4);
      const newCsat = parseFloat((4.8 + Math.random() * 0.19).toFixed(2));
      setHeroTicketsCount(newCount);
      setHeroSlaRate(newSla);
      setHeroEscalations(newEsc);
      setHeroSatisfaction(newCsat);
      setHeroLogOutput((prev) => [
        `AI: Classified ${newCount} active operations tickets.`,
        `TELEMETRY: SLA adjusted to ${newSla}% based on active backlog.`,
        `MONITOR: CSAT score calculated at ${newCsat} stars.`,
        ...prev.slice(0, 2)
      ]);
      setHeroLoading(false);
      toast.success('Live operations telemetry updated.');
    }, 800);
  };

  const executeManagerApproval = (ticketId: string) => {
    setManagerApprovals((prev) => Math.max(0, prev - 1));
    setCommandCenterLogs((prev) => [
      `MANAGER: Approved request ${ticketId} (Transport Request Promotion).`,
      ...prev.slice(0, 3)
    ]);
    toast.success(`Request ${ticketId} approved and promoted.`);
  };

  const triggerManagerMitigate = () => {
    if (managerSlaBreaches > 0) {
      setManagerSlaBreaches(0);
      setCommandCenterLogs((prev) => [
        `AI ACTION: Redeployed 2 idle consultants from Tier-1 support to clear queue.`,
        `RESOLVED: SLA breach warnings successfully mitigated.`,
        ...prev.slice(0, 3)
      ]);
      toast.success('Mitigation scripts executed. Operations balanced.');
    } else {
      toast.info('All SLAs are currently in optimal state.');
    }
  };

  // --- 12 DISTINCT DATASETS FOR RECHARTS (NO REPEATED PATTERNS) ---

  // 1. Ticket Volume Trend (Stacked Area Chart)
  const dataVolumeTrend = [
    { month: 'Jan', Incidents: 240, Requests: 680, Problems: 15, Changes: 45 },
    { month: 'Feb', Incidents: 210, Requests: 740, Problems: 12, Changes: 60 },
    { month: 'Mar', Incidents: 310, Requests: 890, Problems: 24, Changes: 75 },
    { month: 'Apr', Incidents: 290, Requests: 820, Problems: 18, Changes: 55 },
    { month: 'May', Incidents: 180, Requests: 940, Problems: 9, Changes: 90 },
    { month: 'Jun', Incidents: 150, Requests: 1050, Problems: 5, Changes: 110 }
  ];

  // 2. Resolution Trend (Line Chart with dot highlights)
  const dataResolutionTrend = [
    { month: 'Jan', avgMin: 54 },
    { month: 'Feb', avgMin: 48 },
    { month: 'Mar', avgMin: 42 },
    { month: 'Apr', avgMin: 35 },
    { month: 'May', avgMin: 28 },
    { month: 'Jun', avgMin: 19 }
  ];

  // 3. SLA Achievement (Bar Chart with radius styling)
  const dataSlaAchievement = [
    { month: 'Jan', slaPct: 97.4 },
    { month: 'Feb', slaPct: 98.1 },
    { month: 'Mar', slaPct: 98.6 },
    { month: 'Apr', slaPct: 98.9 },
    { month: 'May', slaPct: 99.3 },
    { month: 'Jun', slaPct: 99.7 }
  ];

  // 4. Escalation Analysis (Composed Chart: Bar for Volume, Line for Escalation %)
  const dataEscalationAnalysis = [
    { month: 'Jan', totalTickets: 935, escalationRate: 8.4 },
    { month: 'Feb', totalTickets: 962, escalationRate: 7.1 },
    { month: 'Mar', totalTickets: 1224, escalationRate: 5.8 },
    { month: 'Apr', totalTickets: 1128, escalationRate: 4.2 },
    { month: 'May', totalTickets: 1129, escalationRate: 3.1 },
    { month: 'Jun', totalTickets: 1215, escalationRate: 1.8 }
  ];

  // 5. Consultant Productivity (Radar Chart showing core metrics)
  const dataProductivityRadar = [
    { subject: 'Response Speed', A: 95, B: 85, fullMark: 100 },
    { subject: 'Resolution Rate', A: 98, B: 90, fullMark: 100 },
    { subject: 'CSAT Index', A: 99, B: 88, fullMark: 100 },
    { subject: 'Hours Logged', A: 84, B: 95, fullMark: 100 },
    { subject: 'SLA Adherence', A: 99, B: 92, fullMark: 100 },
    { subject: 'Collaborative SLA', A: 92, B: 78, fullMark: 100 }
  ];

  // 6. Customer Satisfaction (Donut/Pie Chart)
  const dataCsatPie = [
    { name: '5 Stars (Excellent)', value: 1890, color: '#09090b' },
    { name: '4 Stars (Good)', value: 420, color: '#27272a' },
    { name: '3 Stars (Average)', value: 140, color: '#52525b' },
    { name: '2 Stars (Below Avg)', value: 40, color: '#71717a' },
    { name: '1 Star (Critical)', value: 10, color: '#a1a1aa' }
  ];

  // 7. Category Breakdown (Standard Flat Pie Chart)
  const dataCategoryPie = [
    { name: 'SAP ABAP Operations', value: 450, color: '#18181b' },
    { name: 'Basis System Admin', value: 310, color: '#3f3f46' },
    { name: 'Security & GRC Roles', value: 240, color: '#71717a' },
    { name: 'FI/CO Finance Support', value: 180, color: '#a1a1aa' },
    { name: 'SD/MM Logistics Ops', value: 120, color: '#e4e4e7' }
  ];

  // 8. Priority Heatmap (Stacked Horizontal Bar representing priority spreads)
  const dataPrioritySpread = [
    { team: 'SAP Basis Desk', P1: 8, P2: 24, P3: 45, P4: 12 },
    { team: 'ABAP Custom Dev', teamCode: 'ABAP', P1: 15, P2: 42, P3: 98, P4: 35 },
    { team: 'GRC & Security Desk', teamCode: 'GRC', P1: 2, P2: 12, P3: 54, P4: 8 },
    { team: 'FICO Finance Desk', teamCode: 'FI', P1: 4, P2: 18, P3: 38, P4: 19 }
  ];

  // 9. Workload Distribution (Radar Chart comparing Team Loads)
  const dataWorkloadRadar = [
    { subject: 'Backlog Queue', Basis: 68, ABAP: 94, GRC: 35, FICO: 50 },
    { subject: 'In-Progress Case Load', Basis: 82, ABAP: 88, GRC: 42, FICO: 65 },
    { subject: 'Awaiting Signoff', Basis: 30, ABAP: 75, GRC: 15, FICO: 28 },
    { subject: 'Escalated/P1s', Basis: 45, ABAP: 90, GRC: 10, FICO: 20 },
    { subject: 'On-Call Capacity', Basis: 95, ABAP: 60, GRC: 90, FICO: 85 }
  ];

  // 10. Monthly Volume Growth (Scatter Chart showing ticket correlations)
  const dataGrowthScatter = [
    { x: 100, y: 200, z: 200, name: 'Jan' },
    { x: 120, y: 220, z: 260, name: 'Feb' },
    { x: 170, y: 300, z: 400, name: 'Mar' },
    { x: 140, y: 250, z: 280, name: 'Apr' },
    { x: 190, y: 350, z: 500, name: 'May' },
    { x: 230, y: 410, z: 680, name: 'Jun' }
  ];

  // 11. Team Performance (Grouped Side-By-Side Bars showing Closed vs Open)
  const dataTeamPerformance = [
    { team: 'Basis', Closed: 482, ActiveBacklog: 24 },
    { team: 'ABAP Dev', Closed: 624, ActiveBacklog: 82 },
    { team: 'Security', Closed: 310, ActiveBacklog: 12 },
    { team: 'Logistics', Closed: 284, ActiveBacklog: 35 },
    { team: 'Finance', Closed: 395, ActiveBacklog: 19 }
  ];

  // 12. Operational Health (Double Line Chart showing Availability & Network Latency)
  const dataOperationalHealth = [
    { hour: '00:00', availability: 99.99, latencyMs: 42 },
    { hour: '04:00', availability: 100.00, latencyMs: 38 },
    { hour: '08:00', availability: 99.98, latencyMs: 58 },
    { hour: '12:00', availability: 99.95, latencyMs: 64 },
    { hour: '16:00', availability: 99.99, latencyMs: 45 },
    { hour: '20:00', availability: 100.00, latencyMs: 39 }
  ];

  // AI Diagnostic logs mapping
  const AI_METADATA: Record<string, { title: string; latency: string; confidence: string; status: string; log: string }> = {
    classify: {
      title: 'AI Incident Classification Engine',
      latency: '11ms',
      confidence: '99.4%',
      status: 'Active',
      log: 'Incident payload #SST-982 analyzed. Predicted class: [BASIS-MEM-SPIKE]. Action: Set RLS context & tagged module.'
    },
    priority: {
      title: 'AI Priority & Impact Evaluator',
      latency: '6ms',
      confidence: '98.9%',
      status: 'Active',
      log: 'Sentiment analysis on email body completed. Urgency: [High]. Priority forced: P1 CRITICAL (business impact detected).'
    },
    escalation: {
      title: 'AI SLA Escalation Risk Forecast',
      latency: '24ms',
      confidence: '96.2%',
      status: 'Active',
      log: 'Backlog telemetry processed. Incident #SST-902 identified as 85% risk of SLA breach. Automatic alert dispatched to Manager Operations Center.'
    },
    sla: {
      title: 'AI Proactive SLA Risk Monitor',
      latency: '15ms',
      confidence: '95.8%',
      status: 'Active',
      log: 'Calculated predicted effort vs elapsed time for 142 cases. 2 items flag warnings. Suggested resolution time: 24m.'
    },
    workload: {
      title: 'AI Autonomous Workload Balancer',
      latency: '45ms',
      confidence: '97.4%',
      status: 'Balanced',
      log: 'Identified bottleneck in ABAP customization desk. Recommended redistributing 3 minor enhancement requests to MM queue.'
    },
    resource: {
      title: 'AI Resource Smart Recommendations',
      latency: '82ms',
      confidence: '94.8%',
      status: 'Online',
      log: 'Matching consultant credentials. Found matching expert: [C. Dupont - Basis L3 Cert]. Task #SST-1102 matched and recommended.'
    },
    trend: {
      title: 'AI Predictive Trend Modeler',
      latency: '140ms',
      confidence: '93.5%',
      status: 'Monitoring',
      log: 'Analyzed weekly operational indicators. Projected 12% rise in financial operations tickets due to upcoming end-of-quarter freeze.'
    },
    insights: {
      title: 'AI Executive Insights Engine',
      latency: '210ms',
      confidence: '98.1%',
      status: 'Active',
      log: 'Weekly command briefing generated: [SLA at 99.42%], [Deflection rate: 42.5%], [Critical Risk Index: 0.12]. Ready for Executive view.'
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#09090b] selection:bg-[#09090b] selection:text-white flex flex-col antialiased font-sans">
      
      {/* ── HEADER NAVIGATION ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-zinc-200 py-3 shadow-sm'
            : 'bg-white py-5 border-b border-zinc-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-3 group">
              <BrandedLogo width={28} height={28} />
              <span className="font-bold text-sm tracking-widest text-zinc-900 font-mono transition-colors group-hover:text-zinc-500">ASSIST360</span>
            </Link>
            
            <nav className="hidden lg:flex items-center gap-8 text-[11px] uppercase tracking-widest font-mono font-bold text-zinc-500">
              <a href="#overview" className="hover:text-zinc-900 transition-colors">Platform</a>
              <a href="#ai-intelligence" className="hover:text-zinc-900 transition-colors">AI Intelligence</a>
              <a href="#analytics-section" className="hover:text-zinc-900 transition-colors">Live Analytics</a>
              <a href="#command-center" className="hover:text-zinc-900 transition-colors">Command Center</a>
              <a href="#security" className="hover:text-zinc-900 transition-colors">Security</a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="h-9 text-[11px] font-semibold uppercase tracking-widest font-mono text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50">
              <Link href="/login">Assist360 Login</Link>
            </Button>
            
            <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setDemoType('Standard Platform Demo')}
                  className="h-9 text-[11px] font-bold uppercase tracking-widest font-mono bg-zinc-900 hover:bg-zinc-800 text-white rounded px-4 shadow-sm transition-all active:scale-[0.98]"
                >
                  Request Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-zinc-200 rounded-lg max-w-md p-6 text-zinc-900 shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold uppercase tracking-wider text-zinc-900 font-mono">Request Enterprise Briefing</DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 font-sans mt-1">
                    Schedule a live architect-led walkthrough of the Assist360 ESM platform, configured for your tenant workload profile.
                  </DialogDescription>
                </DialogHeader>
                {demoSubmitted ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-200 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">Briefing Scheduled</h3>
                    <p className="text-xs text-zinc-500">Our Enterprise Accounts desk will contact you within 2 business hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-500 font-mono">Name</label>
                      <input 
                        required 
                        type="text" 
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                        placeholder="Elizabeth Vance" 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-500 font-mono">Corporate Email</label>
                      <input 
                        required 
                        type="email" 
                        value={demoEmail}
                        onChange={(e) => setDemoEmail(e.target.value)}
                        placeholder="e.vance@company.com" 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-500 font-mono">Company</label>
                      <input 
                        required 
                        type="text" 
                        value={demoCompany}
                        onChange={(e) => setDemoCompany(e.target.value)}
                        placeholder="Enterprise Holdings Inc." 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900" 
                      />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[10px] py-2.5 rounded font-mono">
                        Submit & Request Review
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="min-h-screen pt-36 pb-20 md:pt-44 md:pb-28 relative flex items-center bg-white overflow-hidden border-b border-zinc-200">
        {/* Subtle grid lines in background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f1f4_1px,transparent_1px),linear-gradient(to_bottom,#f1f1f4_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-40"></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] bg-zinc-50 rounded-full blur-[120px] -z-10 opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-6 md:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* HERO LEFT COLUMN */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-zinc-50/80 py-1 px-3 uppercase rounded-full">
                Enterprise Service Operations
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.08] font-sans">
                The Enterprise Service Management Platform Built For Modern Operations
              </h1>
              
              <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed max-w-xl">
                Unify service delivery, incident management, workflow automation, resource planning, customer support, and operational intelligence in one AI-powered platform.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button 
                  onClick={() => {
                    setDemoType('Standard Platform Demo');
                    setDemoModalOpen(true);
                  }}
                  className="h-11 px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-bold uppercase tracking-widest rounded shadow-md active:scale-[0.98] transition-all"
                >
                  Start Enterprise Demo
                </Button>

                <Button 
                  onClick={() => {
                    setDemoType('Platform Tour');
                    setDemoModalOpen(true);
                  }}
                  variant="outline"
                  className="h-11 px-6 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 font-mono text-xs font-bold uppercase tracking-widest rounded active:scale-[0.98] transition-all"
                >
                  Watch Platform Tour
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-8 border-t border-zinc-100 grid grid-cols-2 gap-y-4 gap-x-6 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-zinc-900" /> Enterprise Grade Security
                </span>
                <span className="flex items-center gap-2">
                  <Cpu size={14} className="text-zinc-900" /> AI Powered Workflows
                </span>
                <span className="flex items-center gap-2">
                  <Activity size={14} className="text-zinc-900" /> Real-Time Analytics
                </span>
                <span className="flex items-center gap-2">
                  <Layers size={14} className="text-zinc-900" /> Multi-Tenant Architecture
                </span>
              </div>
            </div>

            {/* HERO RIGHT COLUMN: MASSIVE INTERACTIVE DASHBOARD */}
            <div className="lg:col-span-6">
              <div className="relative w-full p-6 bg-white border border-zinc-200 rounded-lg shadow-xl space-y-4">
                
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Service Performance Telemetry</span>
                  </div>
                  <Button 
                    onClick={handleHeroSimulate} 
                    disabled={heroLoading} 
                    className="h-7 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-[9px] font-mono uppercase font-bold flex items-center gap-1.5 text-zinc-900 rounded"
                  >
                    <RefreshCw size={10} className={heroLoading ? 'animate-spin' : ''} /> 
                    {heroLoading ? 'Querying...' : 'Update Telemetry'}
                  </Button>
                </div>

                {heroLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3">
                    <RefreshCw size={24} className="animate-spin text-zinc-400" />
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Compiling Active Metrics...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                      
                      {/* Metric Card 1: Open Tickets */}
                      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded hover:border-zinc-300 transition-all">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Active Workload</span>
                        <div className="mt-1 text-xl font-extrabold text-zinc-900">
                          {mounted ? <AnimatedCounter value={heroTicketsCount} /> : heroTicketsCount}
                        </div>
                        <span className="text-[7px] text-zinc-400 block mt-0.5">Tickets in SLA queue</span>
                      </div>

                      {/* Metric Card 2: SLA Status */}
                      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded hover:border-zinc-300 transition-all">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">SLA Compliance</span>
                        <div className="mt-1 text-xl font-extrabold text-emerald-600">
                          {heroSlaRate}%
                        </div>
                        <span className="text-[7px] text-zinc-400 block mt-0.5">Target minimum: 98.5%</span>
                      </div>

                      {/* Metric Card 3: Escalations */}
                      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded hover:border-zinc-300 transition-all">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Escalations</span>
                        <div className={`mt-1 text-xl font-extrabold ${heroEscalations > 2 ? 'text-red-500' : 'text-zinc-900'}`}>
                          {heroEscalations}
                        </div>
                        <span className="text-[7px] text-zinc-400 block mt-0.5">Awaiting manager sync</span>
                      </div>

                      {/* Metric Card 4: CSAT Rating */}
                      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded hover:border-zinc-300 transition-all">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Customer Satisfaction</span>
                        <div className="mt-1 text-md font-bold text-zinc-900 flex items-center gap-1">
                          <Star size={12} fill="#09090b" className="stroke-none" /> {heroSatisfaction} / 5.0
                        </div>
                        <span className="text-[7px] text-zinc-400 block mt-0.5">Based on 2,500+ surveys</span>
                      </div>

                      {/* Metric Card 5: Operational Health */}
                      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded hover:border-zinc-300 transition-all">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Availability</span>
                        <div className="mt-1 text-md font-bold text-emerald-600">99.99%</div>
                        <span className="text-[7px] text-zinc-400 block mt-0.5">All services optimal</span>
                      </div>

                      {/* Metric Card 6: Efficiency Index */}
                      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded hover:border-zinc-300 transition-all">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">AI Deflection</span>
                        <div className="mt-1 text-md font-bold text-zinc-900">42.5%</div>
                        <span className="text-[7px] text-emerald-600 block mt-0.5">Deflected from agents</span>
                      </div>

                    </div>

                    {/* Miniature Resolution Trend Chart */}
                    <div className="p-3 bg-zinc-50 border border-zinc-100 rounded space-y-2">
                      <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">Resolution Time Trend (Last 6 Months)</span>
                      <div className="h-24 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dataResolutionTrend} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                            <defs>
                              <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#09090b" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#09090b" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" stroke="#a1a1aa" fontSize={7} tickLine={false} axisLine={false} />
                            <YAxis stroke="#a1a1aa" fontSize={7} tickLine={false} axisLine={false} domain={[0, 60]} />
                            <Area type="monotone" dataKey="avgMin" stroke="#09090b" fill="url(#heroChartGrad)" strokeWidth={1.5} dot={{ r: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Simulated terminal activity log */}
                    <div className="p-3 bg-[#09090b] text-zinc-400 border border-zinc-800 rounded font-mono text-[9px] space-y-1">
                      <div className="flex justify-between items-center text-[7px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 mb-1.5">
                        <span>Terminal Activity Output</span>
                        <span>Live Sync Ready</span>
                      </div>
                      {heroLogOutput.map((log, index) => (
                        <p key={index} className="truncate">
                          <span className="text-zinc-600">&gt;</span> {log}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="py-12 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-8">
          <div className="text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">Trusted by Operations Teams Worldwide</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-4xl mx-auto">
            <div className="space-y-1">
              <div className="text-2xl font-extrabold font-mono text-zinc-900">
                {mounted ? <AnimatedCounter value={50000} suffix="+" /> : '50,000+'}
              </div>
              <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">Active Operators</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold font-mono text-zinc-900">
                {mounted ? <AnimatedCounter value={5} suffix="M+" /> : '5,000,000+'}
              </div>
              <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">Tickets Processed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold font-mono text-zinc-900">99.99%</div>
              <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">SLA Guarantee</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold font-mono text-zinc-900">
                {mounted ? <AnimatedCounter value={150} suffix="+" /> : '150+'}
              </div>
              <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">Enterprise Customers</div>
            </div>
          </div>

          {/* Premium monochrome company SVG logos */}
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale pt-2">
            {['Stripe', 'Vercel', 'Linear', 'Notion', 'Slack', 'Figma'].map((brand) => (
              <span key={brand} className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-600">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANIMATED PLATFORM OVERVIEW ── */}
      <section id="overview" className="py-24 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-zinc-50 rounded-full">
              Operations Workflow
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">Animated Platform Overview</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Experience the end-to-end flow of ticketing data. Click on any workspace role below to explore their dashboard mockup and active responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Stepper Navigation */}
            <div className="lg:col-span-4 space-y-2 font-mono">
              {[
                { id: 'customer', step: '01', title: 'Customer Portal', subtitle: 'Submit cases & audit live hours' },
                { id: 'consultant', step: '02', title: 'Consultant Workspace', subtitle: 'Pick tasks & log actual hours' },
                { id: 'manager', step: '03', title: 'Manager Operations Center', subtitle: 'Mitigate risk & balance loads' },
                { id: 'executive', step: '04', title: 'Executive Command Center', subtitle: 'Track portfolio KPI compliance' },
                { id: 'admin', step: '05', title: 'Super Admin Governance', subtitle: 'System auditing & tenant RLS' }
              ].map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    setActivePlatformRole(role.id as any);
                    setOverviewStep(role.step === '01' ? 0 : role.step === '02' ? 1 : role.step === '03' ? 2 : role.step === '04' ? 3 : 4);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-all text-xs flex gap-4 ${
                    activePlatformRole === role.id
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-md'
                      : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <span className={`font-extrabold ${activePlatformRole === role.id ? 'text-zinc-400' : 'text-zinc-300'}`}>{role.step}</span>
                  <div className="space-y-0.5">
                    <span className="font-bold uppercase block">{role.title}</span>
                    <span className={`text-[10px] block font-sans ${activePlatformRole === role.id ? 'text-zinc-400' : 'text-zinc-400'}`}>{role.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Dashboard Mockup Display */}
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePlatformRole}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white border-zinc-200 p-6 shadow-md rounded-lg space-y-4">
                    
                    {/* Mock Header */}
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-3 font-mono text-[10px] text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-zinc-900"></span>
                        <span className="font-bold uppercase tracking-wider text-zinc-900">
                          {activePlatformRole === 'customer' && 'Customer Service Access Portal'}
                          {activePlatformRole === 'consultant' && 'Consultant workbench cockpit'}
                          {activePlatformRole === 'manager' && 'Manager Operations Center'}
                          {activePlatformRole === 'executive' && 'Executive KPI board'}
                          {activePlatformRole === 'admin' && 'Super admin governance console'}
                        </span>
                      </div>
                      <Badge className="bg-zinc-50 text-zinc-600 border border-zinc-200 text-[8px] uppercase tracking-wider font-bold">
                        ACTIVE CONTEXT
                      </Badge>
                    </div>

                    {/* Mock Screen Content */}
                    {activePlatformRole === 'customer' && (
                      <div className="space-y-4">
                        <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                          Customers have transparent, real-time access to request assistance, verify logged support efforts, request priority changes, and access historical change records under strict tenant isolation.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg space-y-2 font-mono">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Submit Service Request</span>
                            <div className="space-y-2 text-[10px]">
                              <div className="bg-white border border-zinc-200 rounded p-1.5 text-zinc-400">System Outage - SAP MM Module</div>
                              <div className="bg-white border border-zinc-200 rounded p-1.5 text-zinc-400">Impact: High Priority</div>
                              <Button className="w-full bg-zinc-900 text-white font-mono text-[8px] h-6 uppercase font-bold">Dispatch to Desk</Button>
                            </div>
                          </div>
                          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg space-y-3 font-mono">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Active Ticket Status</span>
                            <div className="space-y-2 text-[10px]">
                              <div className="flex justify-between items-center bg-white border border-zinc-100 p-2 rounded">
                                <span>#SST-942: DB Upgrade</span>
                                <Badge className="bg-blue-50 text-blue-700 text-[8px] font-bold">IN PROGRESS</Badge>
                              </div>
                              <div className="flex justify-between items-center bg-white border border-zinc-100 p-2 rounded">
                                <span>#SST-902: Security Patch</span>
                                <Badge className="bg-emerald-50 text-emerald-700 text-[8px] font-bold">RESOLVED</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePlatformRole === 'consultant' && (
                      <div className="space-y-4">
                        <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                          Delivery teams and consultants manage assignations through clear Kanban views, tracking progress, logging actual vs estimated hours, and reading AI suggested troubleshooting links.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[10px]">
                          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase block mb-1">To Do Queue</span>
                            <div className="bg-white border border-zinc-200 p-2 rounded shadow-sm mb-1.5">SST-982: Setup GRC Profiles</div>
                            <div className="bg-white border border-zinc-200 p-2 rounded shadow-sm">SST-991: ABAP Audit Report</div>
                          </div>
                          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase block mb-1">In Progress</span>
                            <div className="bg-white border border-zinc-200 p-2 rounded shadow-sm relative">
                              <span>SST-942: Patch Kernels</span>
                              <span className="text-[8px] text-zinc-400 block mt-1">Logged: 4.5h / 8.0h</span>
                            </div>
                          </div>
                          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase block mb-1">Peer Review</span>
                            <div className="bg-white border border-zinc-200 p-2 rounded shadow-sm text-zinc-400">SST-902: DB Failover</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePlatformRole === 'manager' && (
                      <div className="space-y-4">
                        <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                          Service Delivery Managers audit queue workloads, review consultant capacity allocations, approve transport orders, and receive automated risk alerts.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[10px]">
                          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg space-y-2">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase block">Pending approvals</span>
                            <div className="flex justify-between items-center bg-white p-2 rounded border border-zinc-200">
                              <span>Transport #DEVK90124 (ABAP)</span>
                              <Button size="sm" onClick={() => executeManagerApproval('DEVK90124')} className="h-6 text-[8px] uppercase font-bold bg-zinc-950 text-white">Approve</Button>
                            </div>
                          </div>
                          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg space-y-2">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase block">Operations Risk Warning</span>
                            <div className="bg-white p-2 rounded border border-zinc-200 flex justify-between items-center">
                              <div>
                                <span className="font-bold text-red-500 block">SLA BREACH ALERT</span>
                                <span className="text-[8px] text-zinc-400">2 cases near deadline limits</span>
                              </div>
                              <Button size="sm" onClick={triggerManagerMitigate} className="h-6 text-[8px] uppercase font-bold bg-zinc-50 border border-zinc-200 text-zinc-900 hover:bg-zinc-100">Mitigate</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePlatformRole === 'executive' && (
                      <div className="space-y-4">
                        <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                          Executives audit operational portfolios at a macro level, reviewing SLA compliance percentages, financial burns, resource utilization metrics, and overall department satisfaction indices.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
                          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded">
                            <span className="text-[8px] text-zinc-400 uppercase block">SLA Compliance</span>
                            <span className="text-sm font-extrabold text-emerald-600 mt-1 block">99.42%</span>
                          </div>
                          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded">
                            <span className="text-[8px] text-zinc-400 uppercase block">Total CSAT</span>
                            <span className="text-sm font-extrabold text-zinc-900 mt-1 block">4.92 / 5.0</span>
                          </div>
                          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded">
                            <span className="text-[8px] text-zinc-400 uppercase block">Resource Load</span>
                            <span className="text-sm font-extrabold text-zinc-900 mt-1 block">84% Optimal</span>
                          </div>
                          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded">
                            <span className="text-[8px] text-zinc-400 uppercase block">Budget Utilized</span>
                            <span className="text-sm font-extrabold text-zinc-900 mt-1 block">62.8%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePlatformRole === 'admin' && (
                      <div className="space-y-4">
                        <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                          Super Admins govern application postures, managing row-level partition keys, auditing system integration logs, verifying MFA enforce flags, and managing federated directory connectors.
                        </p>
                        <div className="p-4 bg-[#09090b] text-zinc-400 border border-zinc-800 rounded font-mono text-[9px] space-y-2">
                          <div className="flex justify-between border-b border-zinc-800 pb-1 text-zinc-500 text-[8px] uppercase tracking-widest">
                            <span>Admin Audit Trail Logs</span>
                            <span>SSO Connectors Enabled</span>
                          </div>
                          <p><span className="text-emerald-500 font-bold">[OK]</span> Enforced MFA audit verification check for all tenant clients.</p>
                          <p><span className="text-emerald-500 font-bold">[OK]</span> Rotated JWT encryption security credentials (AES-256).</p>
                          <p><span className="text-blue-500 font-bold">[INFO]</span> Partition audit complete: 10 tenant databases isolated successfully.</p>
                        </div>
                      </div>
                    )}

                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      </section>

      {/* ── AI SECTION ── */}
      <section id="ai-intelligence" className="py-24 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-white rounded-full">
              Machine Learning
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">AI That Understands Service Delivery</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Assist360 processes ticketing logs with dedicated classification and prediction models to slash response times and deflect issues automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* AI Menu selector */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-2">
              <div className="space-y-1.5 font-mono">
                {[
                  { id: 'classify', title: 'AI Ticket Classification' },
                  { id: 'priority', title: 'AI Priority Detection' },
                  { id: 'escalation', title: 'AI Escalation Prediction' },
                  { id: 'sla', title: 'AI SLA Risk Detection' },
                  { id: 'workload', title: 'AI Workload Balancing' },
                  { id: 'resource', title: 'AI Resource Recommendations' },
                  { id: 'trend', title: 'AI Trend Analysis' },
                  { id: 'insights', title: 'AI Executive Insights' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedAiFeature(item.id)}
                    className={`w-full text-left p-3 text-[10px] uppercase tracking-wider font-bold rounded border transition-all font-mono ${
                      selectedAiFeature === item.id
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Console Mockup */}
            <div className="lg:col-span-8">
              <Card className="bg-white border-zinc-200 p-6 shadow-md rounded-lg h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                    <span className="font-extrabold text-zinc-900 uppercase tracking-wider">
                      {AI_METADATA[selectedAiFeature].title}
                    </span>
                    <Badge className="bg-zinc-50 text-emerald-700 border border-zinc-200 text-[8px] uppercase font-bold font-mono">
                      {AI_METADATA[selectedAiFeature].status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
                      <span className="text-[8px] text-zinc-400 uppercase tracking-widest block font-bold">Model Latency</span>
                      <span className="text-zinc-900 font-extrabold block mt-1">
                        {AI_METADATA[selectedAiFeature].latency}
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
                      <span className="text-[8px] text-zinc-400 uppercase tracking-widest block font-bold">Model Confidence</span>
                      <span className="text-emerald-600 font-extrabold block mt-1">
                        {AI_METADATA[selectedAiFeature].confidence}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-lg space-y-1.5">
                    <span className="text-[8px] text-zinc-500 block uppercase tracking-widest">Diagnostic Output stream</span>
                    <p className="leading-relaxed select-none">
                      <span className="text-zinc-600 font-bold">&gt;</span> {AI_METADATA[selectedAiFeature].log}
                    </p>
                  </div>
                </div>

                {/* Animated visual telemetry bar representation */}
                <div className="pt-4 border-t border-zinc-100 flex flex-col gap-2 font-mono">
                  <div className="flex justify-between text-[8px] text-zinc-400 uppercase">
                    <span>Active Model Deflection Rate</span>
                    <span className="font-bold text-zinc-900">42.5% Target Achieved</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-zinc-900 h-2 rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '42.5%' }}
                      transition={{ duration: 1 }}
                      viewport={{ once: true }}
                    />
                  </div>
                </div>

              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ── LIVE ANALYTICS SECTION (12 UNIQUE CHARTS) ── */}
      <section id="analytics-section" className="py-24 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-zinc-50 rounded-full">
              Intelligence Console
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">Enterprise Live Analytics</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Interact with the 12 unique charts below. Each visualization displays distinct operations ledger metadata to monitor operational health in real-time.
            </p>
          </div>

          <div className="space-y-8">
            
            {/* Category tabs */}
            <div className="flex justify-center">
              <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 font-mono text-[9px]">
                <button
                  onClick={() => setActiveAnalyticsCategory('volume')}
                  className={`px-4 py-2 uppercase font-bold rounded-md transition-all ${
                    activeAnalyticsCategory === 'volume' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  01. Ticket Volumes & SLA
                </button>
                <button
                  onClick={() => setActiveAnalyticsCategory('sla')}
                  className={`px-4 py-2 uppercase font-bold rounded-md transition-all ${
                    activeAnalyticsCategory === 'sla' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  02. Resolution & Escalations
                </button>
                <button
                  onClick={() => setActiveAnalyticsCategory('productivity')}
                  className={`px-4 py-2 uppercase font-bold rounded-md transition-all ${
                    activeAnalyticsCategory === 'productivity' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  03. Team & Productivity
                </button>
                <button
                  onClick={() => setActiveAnalyticsCategory('security')}
                  className={`px-4 py-2 uppercase font-bold rounded-md transition-all ${
                    activeAnalyticsCategory === 'security' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  04. Health & Security
                </button>
              </div>
            </div>

            {/* Grid display of charts based on active category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeAnalyticsCategory === 'volume' && (
                <>
                  {/* Chart 1: Ticket Volume Trend */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">1. Ticket Volume Trend (Stacked Area)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataVolumeTrend} margin={{ top: 5, right: 5, left: -42, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                          <Area type="monotone" dataKey="Requests" name="Service Requests" stackId="1" stroke="#09090b" fill="#09090b" fillOpacity={0.08} />
                          <Area type="monotone" dataKey="Incidents" name="Incidents" stackId="1" stroke="#27272a" fill="#27272a" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 2: Category Breakdown */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">2. Category Breakdown (Flat Pie)</span>
                    <div className="h-56 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <Pie
                            data={dataCategoryPie}
                            cx="50%"
                            cy="50%"
                            outerRadius={65}
                            dataKey="value"
                            label={({ name = 'Unknown', percent = 0 }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {dataCategoryPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 3: SLA Achievement */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">3. SLA Achievement % (Bar Chart)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataSlaAchievement} margin={{ top: 5, right: 5, left: -42, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} domain={[90, 100]} className="font-mono" />
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                          <Bar dataKey="slaPct" name="SLA Compliance %" fill="#09090b" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </>
              )}

              {activeAnalyticsCategory === 'sla' && (
                <>
                  {/* Chart 4: Resolution Trend */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">4. Resolution Trend (Avg Min Line)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dataResolutionTrend} margin={{ top: 5, right: 5, left: -42, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                          <Line type="monotone" dataKey="avgMin" name="Avg Resolution SLA (min)" stroke="#09090b" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 5: Escalation Analysis */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">5. Escalation Rate Analysis (Composed)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dataEscalationAnalysis} margin={{ top: 5, right: 5, left: -42, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                          <Bar dataKey="totalTickets" name="Total Tickets" fill="#f1f1f4" yAxisId={0} radius={[2, 2, 0, 0]} />
                          <Line type="monotone" dataKey="escalationRate" name="Escalation Rate %" stroke="#09090b" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 6: Customer Satisfaction */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">6. Customer Satisfaction (Donut)</span>
                    <div className="h-56 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <Pie
                            data={dataCsatPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {dataCsatPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </>
              )}

              {activeAnalyticsCategory === 'productivity' && (
                <>
                  {/* Chart 7: Consultant Productivity */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">7. Consultant Productivity Metrics (Radar)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dataProductivityRadar}>
                          <PolarGrid stroke="#e4e4e7" />
                          <PolarAngleAxis dataKey="subject" stroke="#71717a" fontSize={7} className="font-mono" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#a1a1aa" fontSize={7} />
                          <Radar name="Primary SLA team" dataKey="A" stroke="#09090b" fill="#09090b" fillOpacity={0.1} />
                          <Radar name="Contract benchmarks" dataKey="B" stroke="#71717a" fill="#71717a" fillOpacity={0.05} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 8: Workload Distribution */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">8. Workload Distribution (Multi-Radar)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dataWorkloadRadar}>
                          <PolarGrid stroke="#e4e4e7" />
                          <PolarAngleAxis dataKey="subject" stroke="#71717a" fontSize={7} className="font-mono" />
                          <Radar name="SAP Basis Load" dataKey="Basis" stroke="#09090b" fill="#09090b" fillOpacity={0.1} />
                          <Radar name="ABAP Dev Queue" dataKey="ABAP" stroke="#a1a1aa" fill="none" strokeDasharray="3 3" />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 9: Team Performance */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">9. Team Closed vs Open (Grouped Bar)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataTeamPerformance} margin={{ top: 5, right: 5, left: -42, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                          <XAxis dataKey="team" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                          <Bar dataKey="Closed" name="Closed Tickets" fill="#09090b" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="ActiveBacklog" name="Awaiting Response" fill="#71717a" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </>
              )}

              {activeAnalyticsCategory === 'security' && (
                <>
                  {/* Chart 10: Operational Health */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">10. Operational Health (Double Line)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dataOperationalHealth} margin={{ top: 5, right: 5, left: -42, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                          <XAxis dataKey="hour" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                          <Line type="monotone" dataKey="latencyMs" name="Avg Latency (ms)" stroke="#09090b" strokeWidth={1.5} dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="availability" name="Availability %" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 11: Priority Spread */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">11. Priority Heatmap/Spread (Stacked Bar)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataPrioritySpread} layout="vertical" margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                          <XAxis type="number" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <YAxis dataKey="team" type="category" stroke="#a1a1aa" fontSize={7} tickLine={false} className="font-mono" />
                          <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                          <Bar dataKey="P1" name="P1 Critical" fill="#09090b" stackId="priority" />
                          <Bar dataKey="P2" name="P2 High" fill="#27272a" stackId="priority" />
                          <Bar dataKey="P3" name="P3 Medium" fill="#71717a" stackId="priority" />
                          <Bar dataKey="P4" name="P4 Low" fill="#e4e4e7" stackId="priority" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 12: Monthly Growth */}
                  <Card className="bg-white border-zinc-200 p-5 rounded-lg shadow-sm space-y-3">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">12. Compounding Growth (Scatter correlation)</span>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 5, right: 5, left: -42, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                          <XAxis type="number" dataKey="x" name="Requests Volume" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <YAxis type="number" dataKey="y" name="Closed Items" stroke="#a1a1aa" fontSize={8} tickLine={false} className="font-mono" />
                          <ChartTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Scatter name="Growth Points" data={dataGrowthScatter} fill="#09090b" shape="circle" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── COMMAND CENTER SHOWCASE (MANAGER VIEW) ── */}
      <section id="command-center" className="py-24 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-white rounded-full">
              Operations Control Deck
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">Manager Command Center</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Oversee pending requests, escalate blockers, approve release orders, and execute mitigation scripts from a central high-contrast control console.
            </p>
          </div>

          <div className="border border-zinc-200 rounded-lg bg-white p-6 shadow-md max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-100 pb-4 gap-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 block animate-pulse"></span>
                <span className="font-bold text-zinc-900 uppercase tracking-wider">Active Command Center Cockpit</span>
              </div>
              <Badge className="bg-zinc-50 text-zinc-600 border border-zinc-200 text-[8px] font-bold font-mono rounded-full uppercase tracking-wider px-2.5 py-0.5">
                Real-time DB connection: Isolation verified
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              
              {/* Approvals Widget */}
              <Card className="p-4 bg-zinc-50 border-zinc-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">Pending Approvals</span>
                  <span className="text-zinc-900 font-extrabold">{managerApprovals} requests</span>
                </div>
                {managerApprovals > 0 ? (
                  <div className="space-y-2">
                    <div className="bg-white border border-zinc-200 p-2 rounded flex justify-between items-center text-[10px]">
                      <span>TR #DEVK90124 (ABAP Release)</span>
                      <Button size="sm" onClick={() => executeManagerApproval('DEVK90124')} className="h-6 text-[8px] uppercase font-bold bg-zinc-950 text-white">Approve</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-zinc-400 text-[10px]">All approvals processed.</div>
                )}
              </Card>

              {/* SLA breaches monitoring */}
              <Card className="p-4 bg-zinc-50 border-zinc-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">SLA Breaches Risk Index</span>
                  <span className={`font-extrabold ${managerSlaBreaches > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-900'}`}>{managerSlaBreaches} Warnings</span>
                </div>
                <div className="space-y-2 text-[10px]">
                  {managerSlaBreaches > 0 ? (
                    <div className="bg-white border border-zinc-200 p-2 rounded flex justify-between items-center">
                      <div>
                        <span className="font-bold block">SST-SEC-902 (Basis)</span>
                        <span className="text-[8px] text-zinc-400">Time to breach: 12m</span>
                      </div>
                      <Button size="sm" onClick={triggerManagerMitigate} className="h-6 text-[8px] uppercase font-bold bg-zinc-900 text-white">Mitigate</Button>
                    </div>
                  ) : (
                    <div className="bg-white border border-zinc-200 p-2 rounded text-center text-emerald-600 font-bold">
                      All SLAs compliant. No risks detected.
                    </div>
                  )}
                </div>
              </Card>

              {/* Action Log Widget */}
              <Card className="p-4 bg-zinc-50 border-zinc-100 space-y-3">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Active Team Workload</span>
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between">
                    <span>Basis Ops Desk:</span>
                    <span className="font-bold">4 active tasks</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ABAP Dev Desk:</span>
                    <span className="font-bold text-red-500">12 tasks (High Load)</span>
                  </div>
                </div>
              </Card>

            </div>

            {/* Simulated Live logs */}
            <div className="p-4 bg-[#09090b] text-zinc-400 border border-zinc-800 rounded font-mono text-[9px] space-y-1">
              <span className="text-[7px] text-zinc-500 block uppercase tracking-widest border-b border-zinc-800 pb-1 mb-1.5">Command Center Audit Log stream</span>
              {commandCenterLogs.map((log, index) => (
                <p key={index} className="truncate">
                  <span className="text-zinc-600">&gt;</span> {log}
                </p>
              ))}
            </div>

            <div className="border-t border-zinc-100 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-center text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
                <span className="text-[9px] text-zinc-400 uppercase block">Avg SLA Adherence</span>
                <span className="text-md font-extrabold text-emerald-600 mt-1 block">99.42%</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
                <span className="text-[9px] text-zinc-400 uppercase block">System Availability</span>
                <span className="text-md font-extrabold text-zinc-900 mt-1 block">99.99%</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
                <span className="text-[9px] text-zinc-400 uppercase block">Assigned Engineers</span>
                <span className="text-md font-extrabold text-zinc-900 mt-1 block">24 Operators</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg">
                <span className="text-[9px] text-zinc-400 uppercase block">Autopilot status</span>
                <span className="text-md font-extrabold text-emerald-600 mt-1 block">ONLINE</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CUSTOMER SUCCESS SECTION ── */}
      <section className="py-24 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-zinc-50 rounded-full">
              Customer Experience
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">Everything Your Customers Expect</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Give your clients an interactive and fully transparent portal to request services, monitor SLAs, audit logged support efforts, and track history.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: FileText, title: 'Raise Tickets', desc: 'Create service incident cases using dynamic request catalogs with customized priority routing fields.' },
              { icon: Activity, title: 'Track Progress', desc: 'Audit ticket states, assignments, and logged effort timelines. Stay updated in real-time.' },
              { icon: Download, title: 'Download Attachments', desc: 'Directly download patch files, test cases reports, and log bundles securely.' },
              { icon: Clock, title: 'Review Actual Hours', desc: 'Transparency by design: Audit logged consultant time allocations against target estimates.' },
              { icon: ShieldAlert, title: 'Escalate Requests', desc: 'Trigger escalation alerts to managers if response metrics near warning thresholds.' },
              { icon: CheckSquare, title: 'View SLA Status', desc: 'Monitor contractual SLA indicators, response counts, and resolution compliance logs.' },
              { icon: BookOpen, title: 'Access Service History', desc: 'Comprehensive audit trailing of historical changes, closed logs, and historical resolutions.' }
            ].map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <Card key={idx} className="bg-white border-zinc-200 p-6 space-y-4 hover:border-zinc-400 hover:shadow-md transition-all rounded-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 bg-zinc-50 rounded border border-zinc-200 flex items-center justify-center text-zinc-900">
                      <IconComponent size={18} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase font-mono tracking-wider">{card.title}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed font-sans">{card.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONSULTANT EXPERIENCE SECTION ── */}
      <section className="py-24 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-white rounded-full">
              Delivery Workbench
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">Built For High-Performance Delivery Teams</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Empower your delivery engineers with high-performance workspaces, automated queues routing, effort logs widgets, and integrated systems knowledge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Layers, title: 'Assignment Boards', desc: 'Manage tickets and requests using visual Kanban layouts categorized by queue statuses.' },
              { icon: Cpu, title: 'Ticket Workbench', desc: 'Consolidate communications history, attachment files, and systems diagnostic parameters inside a single console.' },
              { icon: Clock, title: 'Actual Hours Log', desc: 'Track effort spent on tasks down to the minute. Log actual hours directly to system records.' },
              { icon: TrendingUp, title: 'Estimated Hours', desc: 'Compare real effort logs against original estimates. Identify workload slippage warning thresholds.' },
              { icon: MessageSquare, title: 'Collaboration Window', desc: 'Discuss incident cases directly with team members and customers. Log threads on records.' },
              { icon: CheckSquare, title: 'System Approvals', desc: 'Approve transport orders or release changes in system environments securely.' },
              { icon: BookOpen, title: 'Knowledge Base', desc: 'Integrated documentation repository: Find standard operating manuals and troubleshooting articles.' },
              { icon: Lock, title: 'Secure Audits', desc: 'Each modification is cataloged inside postgres audit ledger tables for governance verification.' }
            ].map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <Card key={idx} className="bg-white border-zinc-200 p-5 space-y-3.5 hover:border-zinc-400 hover:shadow-md transition-all rounded-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-8 h-8 bg-zinc-50 rounded border border-zinc-200 flex items-center justify-center text-zinc-900">
                      <IconComponent size={14} />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 uppercase font-mono tracking-wider">{card.title}</h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">{card.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── EXECUTIVE INSIGHTS SECTION ── */}
      <section className="py-24 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-zinc-50 rounded-full">
              Executive Dashboard
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">Executive KPI Board</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Consolidate operations performance indexes, resource capacities, SLA breaches, and contract financials inside an elegant executive-ready summary layout.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto font-mono text-xs">
            
            {[
              { title: 'Portfolio SLA Compliance', value: '99.42%', change: '+0.15% vs last week', color: 'text-emerald-600', sparkline: [98, 98.5, 99.1, 99.42] },
              { title: 'Open Service Tickets', value: '142 Cases', change: '-12% backlog reduction', color: 'text-zinc-900', sparkline: [170, 162, 150, 142] },
              { title: 'Critical P1 Escalations', value: '2 Active', change: 'All auto-assigned to desks', color: 'text-zinc-900', sparkline: [4, 1, 3, 2] },
              { title: 'Avg Resolution Time', value: '19.4 min', change: '-4m efficiency gain', color: 'text-zinc-900', sparkline: [28, 24, 21, 19.4] },
              { title: 'Resource Utilization Rate', value: '84% Load', change: 'Within optimal threshold', color: 'text-zinc-900', sparkline: [80, 85, 82, 84] },
              { title: 'Customer Health Score', value: '98.5 / 100', change: '+1.2 points satisfaction', color: 'text-emerald-600', sparkline: [95, 96.2, 97.8, 98.5] },
              { title: 'Contract Utilization Burn', value: '62.8%', change: 'Averages 120h remaining', color: 'text-zinc-900', sparkline: [50, 54, 58, 62.8] },
              { title: 'Active Risk Indicators', value: '0.12 Index', change: 'Minimal warnings reported', color: 'text-emerald-600', sparkline: [0.25, 0.18, 0.15, 0.12] }
            ].map((item, idx) => (
              <Card key={idx} className="bg-zinc-50 border-zinc-200 p-5 space-y-3 rounded-lg hover:border-zinc-400 transition-all flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[8px] text-zinc-400 uppercase font-bold block">{item.title}</span>
                  <div className={`text-xl font-extrabold ${item.color}`}>{item.value}</div>
                  <span className="text-[7px] text-zinc-400 block">{item.change}</span>
                </div>
                
                {/* Micro sparkline visualization */}
                <div className="h-6 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={item.sparkline.map((val, i) => ({ val, i }))}>
                      <Line type="monotone" dataKey="val" stroke="#09090b" strokeWidth={1} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}

          </div>
        </div>
      </section>

      {/* ── CUSTOMER TESTIMONIALS ── */}
      <section className="py-24 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-white rounded-full">
              Testimonials
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">Enterprise Customer Stories</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Discover how modern organizations rely on Assist360 to scale support operations and protect service availability metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { name: 'Sarah Jenkins', role: 'CIO', company: 'Global Group Inc.', rating: 5, quote: 'Assist360 completely transformed how our teams manage service delivery. Outages are resolved 65% faster.' },
              { name: 'Marcus Vance', role: 'Head of IT', company: 'Apex Systems', rating: 5, quote: 'The SLA auditing and real-time dashboard are beyond anything we have used before. Perfect transparency.' },
              { name: 'Elena Rostova', role: 'Service Delivery Director', company: 'Vektor Logistics', rating: 5, quote: 'Our support teams transitioned from spreadsheets to Assist360 in days. Ticketing overhead fell by 40%.' },
              { name: 'David Kim', role: 'Operations Manager', company: 'Nexus Retail', rating: 5, quote: 'The AI incident routing deflection automated half of our baseline incidents, letting engineers focus on complex issues.' },
              { name: 'Patricia Brooks', role: 'VP of Infrastructure', company: 'Summit Solutions', rating: 5, quote: 'Audit trails and Row Level Security make Assist360 a highly trusted enterprise tool. Solid architecture.' },
              { name: 'Hiroshi Tanaka', role: 'IT Ops Director', company: 'Shinsei Heavy Ind.', rating: 5, quote: 'SLA risk forecasting alerts our managers 30 minutes before breaches happen. It completely saved our compliance score.' },
              { name: 'Clara Dupont', role: 'Head of Global Support', company: 'Avenir Telecom', rating: 5, quote: 'Our customers love the client portal. They log in, audit actual hours spent on requests, and download reports.' },
              { name: 'Liam O Connor', role: 'IT Service Manager', company: 'Horizon Energy', rating: 5, quote: 'The platform is extremely clean and fast. Type safety guarantees error-free logs and reliable scheduling.' }
            ].map((test, idx) => (
              <Card key={idx} className="bg-white border-zinc-200 p-5 rounded-lg flex flex-col justify-between hover:border-zinc-400 hover:shadow-md transition-all">
                <div className="space-y-4">
                  <div className="flex gap-0.5 text-zinc-900">
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} size={12} fill="#09090b" className="stroke-none" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed font-sans italic">"{test.quote}"</p>
                </div>
                
                <div className="pt-4 border-t border-zinc-100 mt-4 flex items-center gap-3">
                  {/* Photo Placeholder */}
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-mono font-bold text-[10px]">
                    {test.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="font-mono text-[10px]">
                    <span className="font-extrabold text-zinc-900 block">{test.name}</span>
                    <span className="text-zinc-400 block mt-0.5">{test.role} · {test.company}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── G2 STYLE REVIEW SECTION ── */}
      <section className="py-24 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* G2 Rating Summary */}
            <div className="lg:col-span-5 text-center lg:text-left space-y-4 font-mono">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Operational Trust</span>
              <div className="text-6xl font-extrabold text-zinc-900 tracking-tight">4.9 / 5</div>
              <div className="flex justify-center lg:justify-start gap-1 text-zinc-900 pt-1">
                {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#09090b" className="stroke-none" />)}
              </div>
              <p className="text-xs text-zinc-500 font-sans max-w-sm">
                Based on 2,500+ reviews from IT leaders, enterprise administrators, and service managers on G2, Gartner, and Capterra.
              </p>
            </div>

            {/* Progress metrics */}
            <div className="lg:col-span-7 space-y-4 font-mono text-xs">
              {[
                { title: 'Ease of Use', score: 98, scoreText: '9.8 / 10' },
                { title: 'Quality of Support', score: 99, scoreText: '9.9 / 10' },
                { title: 'Platform Reliability', score: 99.9, scoreText: '9.99 / 10' },
                { title: 'Feature Depth', score: 95, scoreText: '9.5 / 10' },
                { title: 'Rate of Innovation', score: 96, scoreText: '9.6 / 10' }
              ].map((item) => (
                <div key={item.title} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-zinc-500 uppercase">{item.title}</span>
                    <span className="text-zinc-900">{item.scoreText}</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-zinc-900 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.score}` }}
                      transition={{ duration: 1 }}
                      viewport={{ once: true }}
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── SECURITY SECTION ── */}
      <section id="security" className="py-24 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-white rounded-full">
              Information Security
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono">Enterprise Security By Design</h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Assist360 is built on next-generation security architectures to protect tenant databases, enforce RLS policies, and track operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left font-mono text-xs">
            {[
              { icon: Key, title: 'SSO Ready', desc: 'Secure federated logins (SAML 2.0 / OIDC) bind directly to your existing directory provider.' },
              { icon: UserCheck, title: 'Role-Based Access', desc: 'Enforce granular capabilities permissions (RBAC) across departments and queues.' },
              { icon: Shield, title: 'Audit Trails Ledger', desc: 'Every transaction modification, hours log, and approval is logged in secure postgres audit ledgers.' },
              { icon: Lock, title: 'E2E Encryption', desc: 'Enforces AES-256 encryption at rest and TLS 1.3 in transit across database schemas.' },
              { icon: Building2, title: 'SOC Ready Architecture', desc: 'Architected to comply with SOC 2 Type II audit, ISO 27001, and HIPAA compliance policies.' },
              { icon: Server, title: 'Secure File Storage', desc: 'Tenant attachments are stored in isolated file buckets under strict RLS access policies.' },
              { icon: Sliders, title: 'Session Governance', desc: 'Enforce session timeouts, concurrency limitations, and automated lock schedules.' },
              { icon: CheckSquare, title: 'Authentication Controls', desc: 'Verify device footprints, track login IP logs, and mandate MFA challenge prompts.' }
            ].map((item, idx) => {
              const IconComponent = item.icon || Shield;
              return (
                <Card key={idx} className="bg-white border-zinc-200 p-5 rounded-lg space-y-3 hover:border-zinc-400 transition-all flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="w-8 h-8 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-900">
                      <IconComponent size={14} />
                    </div>
                    <span className="font-extrabold uppercase block text-zinc-900 tracking-wider">{item.title}</span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">{item.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA SECTION ── */}
      <section className="py-28 relative bg-white border-b border-zinc-200">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f5f5f7_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f7_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30"></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
          <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono tracking-widest text-zinc-500 bg-zinc-50 rounded-full px-3 py-1 uppercase">
            Start Scaling Operations
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 uppercase font-mono leading-tight">
            Transform Service Operations Into A Competitive Advantage
          </h2>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-xl mx-auto font-sans">
            Join modern organizations using Assist360 to manage service delivery, incident workloads, and customer SLAs at scale.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button 
              onClick={() => {
                setDemoType('Standard Platform Demo');
                setDemoModalOpen(true);
              }}
              className="h-11 px-8 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-bold uppercase tracking-widest rounded shadow-md active:scale-[0.98] transition-all"
            >
              Book Enterprise Demo
            </Button>
            
            <Button asChild variant="outline" className="h-11 px-8 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 font-mono text-xs font-bold uppercase tracking-widest rounded active:scale-[0.98] transition-all">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white text-zinc-500 py-16 text-xs border-t border-zinc-200 font-mono">
        <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <BrandedLogo width={24} height={24} />
              <span className="font-bold text-xs tracking-wider text-zinc-900 font-mono uppercase">ASSIST360</span>
            </Link>
            <p className="text-[11px] font-sans text-zinc-400 leading-relaxed max-w-xs">
              The Enterprise Service Management Platform built for global operations. Real-time data-binding under strict tenant isolation.
            </p>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-zinc-900 tracking-wider uppercase text-[10px] block">Platform</span>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#overview" className="hover:text-zinc-900 transition-colors">Incident Desk</a></li>
              <li><a href="#overview" className="hover:text-zinc-900 transition-colors">Request Catalog</a></li>
              <li><a href="#overview" className="hover:text-zinc-900 transition-colors">Kanban Board</a></li>
              <li><a href="#overview" className="hover:text-zinc-900 transition-colors">Audit Logging</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-zinc-900 tracking-wider uppercase text-[10px] block">Resources</span>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#ai-intelligence" className="hover:text-zinc-900 transition-colors">AI Intelligence</a></li>
              <li><a href="#analytics-section" className="hover:text-zinc-900 transition-colors">Live Analytics</a></li>
              <li><a href="#command-center" className="hover:text-zinc-900 transition-colors">Manager Dashboard</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-zinc-900 tracking-wider uppercase text-[10px] block">Security</span>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#security" className="hover:text-zinc-900 transition-colors">Single Sign-On</a></li>
              <li><a href="#security" className="hover:text-zinc-900 transition-colors">Access Controls</a></li>
              <li><a href="#security" className="hover:text-zinc-900 transition-colors">Ledger Audit Logs</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-zinc-900 tracking-wider uppercase text-[10px] block">Company</span>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#" className="hover:text-zinc-900 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-zinc-900 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-zinc-900 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-8 border-t border-zinc-100 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-zinc-400">
          <span>Copyright © Support Studio Technologies. All Rights Reserved.</span>
          <div className="flex gap-4">
            <span>Powered by Assist360.</span>
            <span>Security audit: SOC 2 compliant</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Stub key icon for security section fallback
function Key(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 1.5 1.5M15.5 7.5 14 6" />
    </svg>
  );
}
