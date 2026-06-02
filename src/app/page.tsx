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
  ChevronDown,
  Server,
  Globe,
  Settings,
  HelpCircle,
  Star,
  ShieldCheck,
  ClipboardList,
  BookOpen,
  Workflow
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
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoType, setDemoType] = useState('Standard Demo');

  // Interactive UI State
  const [heroRefreshTime, setHeroRefreshTime] = useState(new Date().toLocaleTimeString());
  const [heroIncidents, setHeroIncidents] = useState(14);
  const [heroSla, setHeroSla] = useState(98.7);
  const [heroSatisfy, setHeroSatisfy] = useState(4.9);
  const [heroLoading, setHeroLoading] = useState(false);

  // Section 4: AI Platform Showcase State
  const [activeAiCapability, setActiveAiCapability] = useState('classify');
  
  // Section 5: Enterprise ITSM Suite State
  const [selectedSuiteItem, setSelectedSuiteItem] = useState<string | null>(null);

  // Section 6: Dashboard Tab Select
  const [selectedDashboardTab, setSelectedDashboardTab] = useState('exec');

  // Section 7: Workflow Automation State
  const [workflowStep, setWorkflowStep] = useState(0);
  const [workflowAutoplay, setWorkflowAutoplay] = useState(false);

  // Section 8: Analytics Tab Select
  const [selectedAnalyticsTab, setSelectedAnalyticsTab] = useState('health');

  // Section 15: Comparison Matrix Search Filter
  const [compareFilter, setCompareFilter] = useState('');

  // Section 16: Control Tower Interactive Actions
  const [controlTowerCriticalAlerts, setControlTowerCriticalAlerts] = useState(2);
  const [controlTowerLog, setControlTowerLog] = useState<string[]>([
    'System initialization successful.',
    'AI Ticket routing engine: Listening for input.',
    'Incident P1-902 assigned to Security Operations.'
  ]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Workflow autoplay handler
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (workflowAutoplay) {
      interval = setInterval(() => {
        setWorkflowStep((prev) => (prev + 1) % 8);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [workflowAutoplay]);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    toast.success(`Demo request for "${demoType}" submitted successfully.`);
    setTimeout(() => {
      setDemoSubmitted(false);
      setDemoModalOpen(false);
    }, 2000);
  };

  const handleHeroRefresh = () => {
    setHeroLoading(true);
    setTimeout(() => {
      setHeroIncidents(Math.floor(Math.random() * 8) + 8);
      setHeroSla(parseFloat((98.2 + Math.random() * 1.5).toFixed(2)));
      setHeroSatisfy(parseFloat((4.8 + Math.random() * 0.19).toFixed(1)));
      setHeroRefreshTime(new Date().toLocaleTimeString());
      setHeroLoading(false);
      toast.success('Live operations telemetry updated.');
    }, 800);
  };

  const triggerControlTowerAiAction = () => {
    if (controlTowerCriticalAlerts > 0) {
      setControlTowerCriticalAlerts((prev) => prev - 1);
      setControlTowerLog((prev) => [
        `AI Agent automatically resolved incident SST-SEC-921 (Latency Anomaly).`,
        ...prev
      ]);
      toast.success('AI Remediation workflow completed successfully.');
    } else {
      toast.info('No pending critical alerts require manual AI intervention.');
    }
  };

  // --- MOCK DATA FOR THE LIGHT CHARTS ---
  const ticketVolumeData = [
    { name: 'Jan', incidents: 1200, requests: 3400, resolved: 4400 },
    { name: 'Feb', incidents: 1100, requests: 3600, resolved: 4600 },
    { name: 'Mar', incidents: 1400, requests: 4200, resolved: 5300 },
    { name: 'Apr', incidents: 950, requests: 3900, resolved: 4800 },
    { name: 'May', incidents: 800, requests: 4500, resolved: 5200 },
    { name: 'Jun', incidents: 720, requests: 4900, resolved: 5550 }
  ];

  const slaComplianceData = [
    { name: 'Jan', compliance: 98.2 },
    { name: 'Feb', compliance: 98.5 },
    { name: 'Mar', compliance: 98.9 },
    { name: 'Apr', compliance: 98.4 },
    { name: 'May', compliance: 98.7 },
    { name: 'Jun', compliance: 99.1 }
  ];

  const departmentPerformanceData = [
    { name: 'IT Support', volume: 450, compliance: 99.2, duration: 18 },
    { name: 'HR Services', volume: 220, compliance: 98.4, duration: 24 },
    { name: 'Finance Operations', volume: 180, compliance: 97.9, duration: 32 },
    { name: 'Facilities Desk', volume: 130, compliance: 98.1, duration: 28 },
    { name: 'Customer Service', volume: 540, compliance: 99.4, duration: 12 }
  ];

  const assetHealthData = [
    { name: 'Servers', healthy: 840, risk: 12, fail: 2 },
    { name: 'Endpoints', healthy: 12400, risk: 85, fail: 15 },
    { name: 'Cloud Clusters', healthy: 320, risk: 4, fail: 0 },
    { name: 'Database Pools', healthy: 180, risk: 2, fail: 1 }
  ];

  const csatTrendData = [
    { name: 'Jan', satisfaction: 4.82 },
    { name: 'Feb', satisfaction: 4.85 },
    { name: 'Mar', satisfaction: 4.89 },
    { name: 'Apr', satisfaction: 4.87 },
    { name: 'May', satisfaction: 4.91 },
    { name: 'Jun', satisfaction: 4.93 }
  ];

  const changeSuccessData = [
    { name: 'Jan', success: 94.5 },
    { name: 'Feb', success: 95.2 },
    { name: 'Mar', success: 96.1 },
    { name: 'Apr', success: 95.8 },
    { name: 'May', success: 97.4 },
    { name: 'Jun', success: 98.2 }
  ];

  const AI_CAPABILITIES_METADATA: Record<string, { title: string; latency: string; confidence: string; status: string; log: string }> = {
    classify: {
      title: 'AI Incident Classification Engine',
      latency: '8ms',
      confidence: '99.4%',
      status: 'Active',
      log: 'Payload analyzed. Identified category: [SAP-BASIS-FAILOVER]. Assigned risk level: HIGH.'
    },
    route: {
      title: 'AI Automated Incident Routing',
      latency: '12ms',
      confidence: '98.7%',
      status: 'Active',
      log: 'Routing lookup. Match found: [ABAP-DEV-TEAM-C]. Load balance capacity verified at 74% load.'
    },
    priority: {
      title: 'AI Real-time Priority Detection',
      latency: '6ms',
      confidence: '99.1%',
      status: 'Active',
      log: 'Sentiment and impact scan complete. Urgency: [Business Stopped]. Priority forced: P1 CRITICAL.'
    },
    knowledge: {
      title: 'AI Knowledge Suggestion Systems',
      latency: '42ms',
      confidence: '95.8%',
      status: 'Active',
      log: 'Searching database. 3 relevant articles extracted. KB-902 (Kernel patch procedure) suggested to engineer.'
    },
    rootcause: {
      title: 'AI Root Cause Diagnostic Analyzer',
      latency: '110ms',
      confidence: '94.2%',
      status: 'Completed',
      log: 'Analyzing change records. Root cause correlation found: [Change Order #1042 - DB Pool resize] at 21:04 UTC.'
    },
    resolution: {
      title: 'AI Actionable Resolution Recommendations',
      latency: '85ms',
      confidence: '96.5%',
      status: 'Ready',
      log: 'Remediation script compiled. Fix command: [cluster.db_pool.recycle()]. SLA savings estimated at 38m.'
    },
    escalation: {
      title: 'AI Proactive Escalation Prediction',
      latency: '18ms',
      confidence: '93.7%',
      status: 'Monitoring',
      log: 'Telemetry check. Risk score: [High Risk of SLA breach]. ETA remaining: 14m. Warning triggered.'
    },
    slarisk: {
      title: 'AI SLA Risk Forecasting Telemetry',
      latency: '24ms',
      confidence: '97.2%',
      status: 'Active',
      log: 'Historical modeling complete. Predicted resolution time: 38m. Contractual SLA limit: 30m. Breach Risk: 84%.'
    },
    capacity: {
      title: 'AI Live Capacity Planning',
      latency: '150ms',
      confidence: '95.1%',
      status: 'Active',
      log: 'Team capacity balance recalculated. Suggesting transfer of 4 cases from Functional FICO to MM certified benched.'
    }
  };

  const ITSM_SUITE_METADATA: Record<string, { description: string; dbSchema: string; tableCount: number; keyMetrics: string; icon: React.ComponentType<any> }> = {
    'Incident Management': {
      description: 'Streamline logging, tracking, diagnosing, and resolving critical service outages and incidents.',
      dbSchema: 'Public.incidents_ledger',
      tableCount: 8,
      keyMetrics: 'Mean Time to Resolution (MTTR), First Contact Resolution (FCR)',
      icon: ShieldCheck
    },
    'Service Requests': {
      description: 'Address employee and customer queries, equipment provisioning, access requests, and software upgrades.',
      dbSchema: 'Public.service_requests_queue',
      tableCount: 5,
      keyMetrics: 'Request Turnaround SLA, User Approvals Pending',
      icon: ClipboardList
    },
    'Workflow Automation': {
      description: 'Build flexible state transitions, automatic approvals, escalations routing, and custom notifications.',
      dbSchema: 'Public.workflow_configurations',
      tableCount: 6,
      keyMetrics: 'Automation rate, Path cycle times',
      icon: Workflow
    },
    'Analytics': {
      description: 'Generate live reports, performance burn-downs, and cost analytics widgets without caching delays.',
      dbSchema: 'Public.analytics_metrics',
      tableCount: 7,
      keyMetrics: 'Report load speed, Dashboard count',
      icon: BarChart3
    },
    'AI Intelligence': {
      description: 'Predict SLA risk anomalies, automate ticket categorization, and suggest diagnostic actions instantly.',
      dbSchema: 'Public.ai_diagnostics',
      tableCount: 10,
      keyMetrics: 'Prediction accuracy, Processing speed',
      icon: Sparkles
    },
    'Knowledge Management': {
      description: 'Compile solutions, configurations, policies, and diagnostic wikis in a central secure hub.',
      dbSchema: 'Public.knowledge_base_articles',
      tableCount: 3,
      keyMetrics: 'Article Helpful Votes, Search Deflection Ratio',
      icon: BookOpen
    },
    'Asset Management': {
      description: 'Track hardware, licenses, virtual machines, cloud instances, and resource lifecycles.',
      dbSchema: 'Public.assets_inventory',
      tableCount: 12,
      keyMetrics: 'Total Active Asset Value, License Compliance Ratio',
      icon: Server
    },
    'Security': {
      description: 'Protect corporate assets with fine-grained Row Level Security (RLS) policies, Okta SSO, and TLS encryption.',
      dbSchema: 'Public.compliance_audits_trail',
      tableCount: 11,
      keyMetrics: 'Audit Coverage Score, Active Vulnerability Remediation Days',
      icon: Lock
    },
    'Customer Success': {
      description: 'Address external customer support incidents, case queues, SLAs, and technical communications.',
      dbSchema: 'Public.customer_cases',
      tableCount: 8,
      keyMetrics: 'External Case Backlog, Customer Retention Rate',
      icon: Users
    },
    'Executive Reporting': {
      description: 'Generate cross-customer reports, trend charts, response times, and billing burn graphs with zero caching latency.',
      dbSchema: 'Public.executive_widgets',
      tableCount: 5,
      keyMetrics: 'Mean CSAT Rating, Core SLA adherence',
      icon: TrendingUp
    }
  };

  const COMPARISON_ROWS = [
    { feature: 'AI Automation', traditional: 'Basic field filling macros', assist: 'Autonomous Incident classification, routing, and P1 prediction' },
    { feature: 'Workflow Automation', traditional: 'Static sequential approvals', assist: 'Dynamic, multi-tenant state transitions and conditional routing' },
    { feature: 'Executive Analytics', traditional: 'Cached CSV exports', assist: 'Live telemetry, SLA forecasting, and cost tracking dashboards' },
    { feature: 'Enterprise Governance', traditional: 'Ad-hoc log monitoring', assist: 'Strict row-level security (RLS) and real-time ledger audits' },
    { feature: 'Service Catalog', traditional: 'Text list of tickets', assist: 'Dynamic pricing, self-service request portals, and provisioning flow' },
    { feature: 'Asset Management', traditional: 'Offline spreadsheets', assist: 'Integrated database of systems, licenses, and VM structures' },
    { feature: 'CMDB', traditional: 'No mapping capabilities', assist: 'Full topology graphs mapping incidents to infrastructure failures' },
    { feature: 'SLA Management', traditional: 'Static compliance numbers', assist: 'Dynamic SLA risk modeling and escalation war room triggers' },
    { feature: 'Scalability', traditional: 'Single database bottlenecks', assist: 'Cloud-native multi-tenant architecture processing 50k+ daily actions' },
    { feature: 'Multi-Tenant Architecture', traditional: 'Siloed database deployments', assist: 'Secure database sharing with robust RLS policies' },
    { feature: 'Executive Reporting', traditional: 'Manually built monthly PDFs', assist: 'Always-live cockpits with data binding directly to operational pipelines' },
    { feature: 'Customer Success Analytics', traditional: 'Post-resolution surveys', assist: 'Real-time customer health scores, sentiment monitoring, and renewal risk flags' }
  ];

  const filteredComparisonRows = COMPARISON_ROWS.filter(row =>
    row.feature.toLowerCase().includes(compareFilter.toLowerCase()) ||
    row.traditional.toLowerCase().includes(compareFilter.toLowerCase()) ||
    row.assist.toLowerCase().includes(compareFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-[#111827] selection:bg-[#111827] selection:text-white flex flex-col font-sans antialiased scroll-smooth">
      
      {/* ── HEADER NAVIGATION ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] py-3 shadow-sm'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3">
              <BrandedLogo width={26} height={26} />
              <span className="font-extrabold text-sm tracking-wider text-[#111827] font-mono">ASSIST360</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-8 text-[11px] uppercase tracking-widest font-mono font-bold text-[#6B7280]">
              <a href="#why-assist" className="hover:text-[#111827] transition">Why Platform</a>
              <a href="#ai-showcase" className="hover:text-[#111827] transition">AI Systems</a>
              <a href="#itsm-suite" className="hover:text-[#111827] transition">ITSM Suite</a>
              <a href="#dashboard-exp" className="hover:text-[#111827] transition">Dashboard</a>
              <a href="#workflow-automation" className="hover:text-[#111827] transition">Workflow</a>
              <a href="#analytics-section" className="hover:text-[#111827] transition">Analytics</a>
              <a href="#compare" className="hover:text-[#111827] transition">Comparison</a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="h-9 text-[11px] font-bold uppercase tracking-widest font-mono text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFA]">
              <Link href="/login">Sign In</Link>
            </Button>
            
            <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setDemoType('Standard Platform Demo')}
                  className="h-9 text-[11px] font-bold uppercase tracking-widest font-mono bg-[#111827] hover:bg-[#6B7280] text-white rounded px-4 shadow-sm transition active:scale-[0.98]"
                >
                  Book a Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-[#E5E7EB] rounded max-w-md p-6 text-[#111827] shadow-lg">
                <DialogHeader>
                  <DialogTitle className="text-md font-bold uppercase tracking-wider text-[#111827]">Request platform demo</DialogTitle>
                  <DialogDescription className="text-xs text-[#6B7280] font-mono mt-1">
                    Book an architecture review and live demo for the ASSIST360 platform.
                  </DialogDescription>
                </DialogHeader>
                {demoSubmitted ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 rounded bg-[#FAFAFA] border border-[#E5E7EB] text-[#10B981] flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Request Confirmed</h3>
                    <p className="text-xs text-[#6B7280] font-mono">Our Solutions Desk will reach out shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-[#6B7280] font-mono">Name</label>
                      <input required type="text" placeholder="Sarah Jenkins" className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded p-2.5 text-xs text-[#111827] placeholder-[#6B7280] focus:outline-none focus:border-[#111827]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-[#6B7280] font-mono">Enterprise Email</label>
                      <input required type="email" placeholder="s.jenkins@company.com" className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded p-2.5 text-xs text-[#111827] placeholder-[#6B7280] focus:outline-none focus:border-[#111827]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-[#6B7280] font-mono">Company / Organization</label>
                      <input required type="text" placeholder="Global Group Inc." className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded p-2.5 text-xs text-[#111827] placeholder-[#6B7280] focus:outline-none focus:border-[#111827]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-[#6B7280] font-mono">Briefing Type</label>
                      <select 
                        value={demoType} 
                        onChange={(e) => setDemoType(e.target.value)} 
                        className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded p-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#111827]"
                      >
                        <option value="Platform Demo">Start Enterprise Demo</option>
                        <option value="Executive Briefing">Book Executive Briefing</option>
                        <option value="Product Tour Consultation">Watch Product Tour Consultation</option>
                      </select>
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="submit" className="w-full bg-[#111827] hover:bg-[#6B7280] text-white font-bold uppercase tracking-wider text-[10px] py-2.5 rounded font-mono">
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

      {/* ── SECTION 1: HOME PAGE HERO ── */}
      <section className="min-h-screen pt-32 pb-20 md:pt-40 md:pb-28 relative flex items-center bg-[#FFFFFF] border-b border-[#E5E7EB] overflow-hidden">
        {/* Background Network Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>
        
        <div className="max-w-7xl mx-auto px-6 md:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* HERO LEFT */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2">
                <BrandedLogo width={22} height={22} />
                <span className="text-[11px] font-bold tracking-widest text-[#111827] font-mono uppercase">Assist360</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#111827] leading-[1.1]">
                The Modern Enterprise Service Management Platform
              </h1>
              
              <p className="text-sm md:text-base text-[#6B7280] font-medium leading-relaxed max-w-xl">
                Unify service operations, incident management, requests, approvals, analytics, AI automation, and enterprise workflows through a single intelligent platform.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button 
                  onClick={() => {
                    setDemoType('Start Enterprise Demo');
                    setDemoModalOpen(true);
                  }}
                  className="h-11 px-6 bg-[#111827] hover:bg-[#6B7280] text-white font-mono text-xs font-bold uppercase tracking-wider rounded shadow-sm"
                >
                  Book a Demo
                </Button>

                <Button 
                  onClick={() => {
                    setDemoType('Book Executive Briefing');
                    setDemoModalOpen(true);
                  }}
                  variant="outline"
                  className="h-11 px-6 border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#FAFAFA] hover:border-[#6B7280] font-mono text-xs font-bold uppercase tracking-wider rounded"
                >
                  Explore Platform
                </Button>
              </div>

              {/* Below CTA Checklist */}
              <div className="pt-6 border-t border-[#E5E7EB] grid grid-cols-2 gap-y-3 gap-x-6 text-[11px] font-bold font-mono text-[#6B7280] uppercase">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Enterprise Ready
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#2563EB]" /> AI Powered
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#2563EB]" /> Scalable Architecture
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Real-Time Analytics
                </span>
              </div>
            </div>

            {/* HERO RIGHT: PRODUCT SHOWCASE */}
            <div className="lg:col-span-6 relative flex items-center justify-center min-h-[440px]">
              
              {/* Outer boundary frame */}
              <div className="relative w-full max-w-lg p-6 bg-white border border-[#E5E7EB] rounded-lg shadow-xl space-y-4">
                
                {/* Visual title top */}
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6B7280]">Service Operations Console</span>
                  </div>
                  <Button 
                    onClick={handleHeroRefresh} 
                    disabled={heroLoading} 
                    className="h-6 px-2 bg-[#FAFAFA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[9px] font-mono uppercase font-bold flex items-center gap-1 text-[#111827]"
                  >
                    <RefreshCw size={10} className={heroLoading ? 'animate-spin' : ''} /> 
                    {heroLoading ? 'Reading...' : 'Refresh'}
                  </Button>
                </div>

                {heroLoading ? (
                  <div className="space-y-4 py-8">
                    <div className="h-6 bg-[#FAFAFA] animate-pulse rounded w-1/3"></div>
                    <div className="h-20 bg-[#FAFAFA] animate-pulse rounded"></div>
                    <div className="h-10 bg-[#FAFAFA] animate-pulse rounded w-3/4"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    
                    {/* Floating Widget 1: Open Incidents */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] hover:shadow-md transition duration-300 group">
                      <div className="flex justify-between items-center text-[#6B7280]">
                        <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Open Incidents</span>
                        <AlertTriangle size={12} className="text-[#EF4444]" />
                      </div>
                      <div className="mt-1 text-xl font-bold font-mono text-[#111827]">{heroIncidents}</div>
                      <span className="text-[8px] font-mono text-[#6B7280] block mt-1">Live active ticket load</span>
                    </div>

                    {/* Floating Widget 2: SLA Health */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] hover:shadow-md transition duration-300">
                      <div className="flex justify-between items-center text-[#6B7280]">
                        <span className="text-[9px] font-mono uppercase font-bold tracking-wider">SLA compliance</span>
                        <Activity size={12} className="text-[#10B981]" />
                      </div>
                      <div className="mt-1 text-xl font-bold font-mono text-[#10B981]">{heroSla}%</div>
                      <span className="text-[8px] font-mono text-[#6B7280] block mt-1">Target contract level</span>
                    </div>

                    {/* Floating Widget 3: CSAT */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] hover:shadow-md transition duration-300">
                      <div className="flex justify-between items-center text-[#6B7280]">
                        <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Satisfaction</span>
                        <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                      </div>
                      <div className="mt-1 text-xl font-bold font-mono text-[#111827]">{heroSatisfy} / 5.0</div>
                      <span className="text-[8px] font-mono text-[#10B981] block mt-1">98% positive reviews</span>
                    </div>

                    {/* Floating Widget 4: AI Predictions */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] hover:shadow-md transition duration-300">
                      <span className="text-[9px] font-mono uppercase font-bold text-[#6B7280] tracking-wider block">AI Insights</span>
                      <div className="mt-1 text-md font-bold font-mono text-[#2563EB]">Auto-Routed</div>
                      <span className="text-[8px] font-mono text-[#6B7280] block mt-1">Confidence score: 99%</span>
                    </div>

                    {/* Floating Widget 5: Ticket Trends */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] hover:shadow-md transition duration-300 col-span-2">
                      <span className="text-[9px] font-mono uppercase font-bold text-[#6B7280] tracking-wider block">Ticket Intake trend</span>
                      <div className="h-10 w-full mt-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ticketVolumeData.slice(-4)} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                            <defs>
                              <linearGradient id="widgetChartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="resolved" stroke="#2563EB" strokeWidth={2} fill="url(#widgetChartGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                )}

                {/* Status Console Printout */}
                <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded space-y-1">
                  <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-1 mb-1 font-mono text-[8px] text-[#6B7280] uppercase tracking-widest">
                    <span>Active telemetry logs</span>
                    <span>{heroRefreshTime}</span>
                  </div>
                  <div className="font-mono text-[9px] text-[#6B7280] space-y-0.5 select-none">
                    <p><span className="text-[#2563EB] font-bold">&gt;</span> Automated Classification pipeline online.</p>
                    <p><span className="text-[#2563EB] font-bold">&gt;</span> Row Level Security active across tables.</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 2: TRUST & SOCIAL PROOF ── */}
      <section className="py-14 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-8">
          <div className="text-center">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#6B7280]">Powering service excellence for modern operations</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { num: '99.95%', title: 'Platform Availability' },
              { num: '500K+', title: 'Requests Processed' },
              { num: '50K+', title: 'Tickets Managed' },
              { num: '98.7%', title: 'SLA Compliance' },
              { num: '95%', title: 'Customer CSAT' },
              { num: '100+', title: 'Enterprise Teams' }
            ].map((stat, idx) => (
              <div key={idx} className="p-4 bg-white border border-[#E5E7EB] rounded text-center hover:shadow-sm transition duration-300">
                <span className="text-xl font-bold font-mono text-[#111827] block">{stat.num}</span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#6B7280] block mt-1">{stat.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: WHY ASSIST360 ── */}
      <section id="why-assist" className="py-24 bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Platform Merits
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Built For Modern Service Organizations</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Consolidate tickets, workloads, asset databases, approvals, and compliance records inside a single platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Enterprise Service Management', desc: 'Consolidate ITSM, HR, facilities, customer operations, and compliance records inside a single platform.' },
              { title: 'AI Service Operations', desc: 'Predict SLA risk anomalies, automate ticket categorization, and suggest diagnostic actions instantly.' },
              { title: 'Advanced Workflow Automation', desc: 'Build flexible state transitions, automatic approvals, escalations routing, and custom notifications.' },
              { title: 'Executive Analytics', desc: 'Generate live reports, performance burn-downs, and cost analytics widgets without caching delays.' },
              { title: 'Enterprise Governance', desc: 'Enforce audit trails, field validation permissions, automated ticket closure checks, and compliance rules.' },
              { title: 'Security & Compliance', desc: 'Protect corporate assets with fine-grained Row Level Security (RLS) policies, Okta SSO, and TLS encryption.' },
              { title: 'Scalable Architecture', desc: 'Process hundreds of database operations concurrently without performance degradation or indexing leaks.' },
              { title: 'Multi-Tenant SaaS', desc: 'Share infrastructure resources safely and securely across global departments with robust data partition systems.' }
            ].map((card, idx) => (
              <Card key={idx} className="bg-white border-[#E5E7EB] hover:border-[#6B7280] hover:shadow-md transition duration-300 rounded p-6 space-y-3">
                <span className="text-xs font-bold text-[#111827] font-mono uppercase block">{card.title}</span>
                <p className="text-xs text-[#6B7280] leading-relaxed font-sans">{card.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: AI PLATFORM SHOWCASE ── */}
      <section id="ai-showcase" className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FFFFFF] rounded">
              Machine Intelligence
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">AI That Works Across Every Service Operation</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Dynamic operational assistants that diagnose system alerts, route workloads, prevent breaches, and recommend fixes automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Toggles list */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-2">
              <div className="space-y-2">
                {[
                  { id: 'classify', title: 'AI Incident Classification' },
                  { id: 'route', title: 'AI Ticket Routing' },
                  { id: 'priority', title: 'AI Priority Detection' },
                  { id: 'knowledge', title: 'AI Knowledge Suggestions' },
                  { id: 'rootcause', title: 'AI Root Cause Analysis' },
                  { id: 'resolution', title: 'AI Resolution Recommendations' },
                  { id: 'escalation', title: 'AI Escalation Prediction' },
                  { id: 'slarisk', title: 'AI SLA Risk Prediction' },
                  { id: 'capacity', title: 'AI Capacity Planning' }
                ].map((cap) => (
                  <button
                    key={cap.id}
                    onClick={() => setActiveAiCapability(cap.id)}
                    className={`w-full text-left p-3.5 font-mono text-xs uppercase tracking-wider font-bold rounded border transition ${
                      activeAiCapability === cap.id
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#6B7280] hover:text-[#111111]'
                    }`}
                  >
                    {cap.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnostic simulator view */}
            <div className="lg:col-span-8">
              <Card className="bg-white border-[#E5E7EB] h-full flex flex-col justify-between p-6 space-y-6 shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827]">
                      {AI_CAPABILITIES_METADATA[activeAiCapability].title}
                    </span>
                    <Badge className="bg-[#FAFAFA] text-[#10B981] border border-[#E5E7EB] text-[9px] uppercase font-bold font-mono">
                      {AI_CAPABILITIES_METADATA[activeAiCapability].status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                      <span className="text-[9px] text-[#6B7280] block uppercase tracking-wider">Analysis Latency</span>
                      <span className="text-[#111827] font-bold block mt-1">{AI_CAPABILITIES_METADATA[activeAiCapability].latency}</span>
                    </div>
                    <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                      <span className="text-[9px] text-[#6B7280] block uppercase tracking-wider">Prediction Confidence</span>
                      <span className="text-[#10B981] font-bold block mt-1">{AI_CAPABILITIES_METADATA[activeAiCapability].confidence}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded font-mono text-xs">
                    <span className="text-[9px] text-[#6B7280] block uppercase tracking-wider mb-2">Live AI Diagnostic Log</span>
                    <p className="text-[#111827] break-words leading-relaxed select-none">
                      <span className="text-[#2563EB] font-bold">&gt;</span> {AI_CAPABILITIES_METADATA[activeAiCapability].log}
                    </p>
                  </div>
                </div>

                {/* Mockup chart visualization */}
                <div className="h-44 border border-[#E5E7EB] bg-[#FAFAFA] rounded p-4 flex flex-col justify-between">
                  <span className="text-[8px] font-mono text-[#6B7280] uppercase tracking-wider block">AI confidence intervals & workload limits</span>
                  <div className="h-32 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={slaComplianceData} margin={{ top: 5, right: 5, left: -40, bottom: 5 }}>
                        <defs>
                          <linearGradient id="aiChartLightGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                        <YAxis stroke="#6B7280" fontSize={8} domain={[97, 100]} className="font-mono" />
                        <Area type="monotone" dataKey="compliance" stroke="#2563EB" strokeWidth={2} fill="url(#aiChartLightGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 5: ENTERPRISE ITSM SUITE ── */}
      <section id="itsm-suite" className="py-24 bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Core Suite
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Enterprise ITSM Suite</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Select an IT Service Management capability below to audit database routing models, schemas, and metrics.
            </p>
          </div>

          {/* Grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(ITSM_SUITE_METADATA).map(([item, meta]) => {
              const IconComponent = meta.icon;
              return (
                <button
                  key={item}
                  onClick={() => setSelectedSuiteItem(item)}
                  className="p-5 bg-white border border-[#E5E7EB] rounded text-left hover:border-[#6B7280] hover:shadow-sm transition duration-300 flex flex-col justify-between h-40 space-y-4"
                >
                  <div className="w-8 h-8 rounded bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center text-[#2563EB]">
                    <IconComponent size={16} />
                  </div>
                  <div className="font-mono text-xs uppercase tracking-wider font-bold text-[#111827]">
                    {item}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dialog detail expansion */}
          <Dialog open={!!selectedSuiteItem} onOpenChange={() => setSelectedSuiteItem(null)}>
            <DialogContent className="bg-white border border-[#E5E7EB] rounded max-w-lg p-6 text-[#111827] font-mono shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-2">
                  ITSM Module: {selectedSuiteItem}
                </DialogTitle>
                <div className="text-xs text-[#6B7280] leading-relaxed pt-3 space-y-4 font-sans">
                  <p className="text-sm text-[#111827]">
                    {selectedSuiteItem && ITSM_SUITE_METADATA[selectedSuiteItem].description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 font-mono">
                    <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                      <span className="text-[9px] text-[#6B7280] block uppercase tracking-wider">DB Catalog Model</span>
                      <span className="text-[#111827] font-bold block mt-1 text-[11px]">
                        {selectedSuiteItem && ITSM_SUITE_METADATA[selectedSuiteItem].dbSchema}
                      </span>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                      <span className="text-[9px] text-[#6B7280] block uppercase tracking-wider">Relational Tables</span>
                      <span className="text-[#111827] font-bold block mt-1 text-[11px]">
                        {selectedSuiteItem && ITSM_SUITE_METADATA[selectedSuiteItem].tableCount} tables active
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded font-mono">
                    <span className="text-[9px] text-[#6B7280] block uppercase tracking-wider mb-1">Audit KPI Metrics Evaluated</span>
                    <span className="text-[#10B981] font-bold block text-[11px]">
                      {selectedSuiteItem && ITSM_SUITE_METADATA[selectedSuiteItem].keyMetrics}
                    </span>
                  </div>
                </div>
              </DialogHeader>
              <DialogFooter className="pt-2">
                <Button onClick={() => setSelectedSuiteItem(null)} className="w-full bg-[#111827] text-white hover:bg-[#6B7280] font-bold uppercase tracking-wider text-[10px]">
                  Close Diagnostics
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* ── SECTION 6: ENTERPRISE DASHBOARD EXPERIENCE ── */}
      <section id="dashboard-exp" className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-white rounded">
              Command Deck
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Enterprise Dashboard Experience</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Interact with our role-based control dashboards to monitor incident backlogs, queue performance, SLA risks, and executive CSAT analytics.
            </p>
          </div>

          <Tabs value={selectedDashboardTab} onValueChange={setSelectedDashboardTab} className="space-y-6">
            <div className="flex justify-center">
              <TabsList className="bg-[#FFFFFF] p-1 border border-[#E5E7EB] flex-wrap gap-1 rounded justify-start md:justify-center h-auto shadow-sm">
                <TabsTrigger value="exec" className="text-[10px] font-bold uppercase tracking-widest font-mono rounded px-3 py-1.5 data-[state=active]:bg-[#111117] data-[state=active]:text-white text-[#6B7280]">Executive Cockpit</TabsTrigger>
                <TabsTrigger value="ops" className="text-[10px] font-bold uppercase tracking-widest font-mono rounded px-3 py-1.5 data-[state=active]:bg-[#111117] data-[state=active]:text-white text-[#6B7280]">Operations Center</TabsTrigger>
                <TabsTrigger value="desk" className="text-[10px] font-bold uppercase tracking-widest font-mono rounded px-3 py-1.5 data-[state=active]:bg-[#111117] data-[state=active]:text-white text-[#6B7280]">Service Desk</TabsTrigger>
                <TabsTrigger value="manager" className="text-[10px] font-bold uppercase tracking-widest font-mono rounded px-3 py-1.5 data-[state=active]:bg-[#111117] data-[state=active]:text-white text-[#6B7280]">Manager View</TabsTrigger>
                <TabsTrigger value="customer" className="text-[10px] font-bold uppercase tracking-widest font-mono rounded px-3 py-1.5 data-[state=active]:bg-[#111117] data-[state=active]:text-white text-[#6B7280]">Customer Portal</TabsTrigger>
                <TabsTrigger value="analytics" className="text-[10px] font-bold uppercase tracking-widest font-mono rounded px-3 py-1.5 data-[state=active]:bg-[#111117] data-[state=active]:text-white text-[#6B7280]">BI Analytics</TabsTrigger>
              </TabsList>
            </div>

            {/* Dashboard Mock Panel */}
            <Card className="bg-white border-[#E5E7EB] rounded-lg p-6 shadow-md space-y-6">
              
              <TabsContent value="exec" className="space-y-6 mt-0 font-mono">
                <div className="flex flex-col lg:flex-row justify-between gap-4 border-b border-[#E5E7EB] pb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280]">Workspace: Corporate Executive Cockpit</span>
                    <h3 className="text-sm font-bold text-[#111827] uppercase mt-1">Gartner Standard Operations Summary</h3>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[9px] uppercase text-[#6B7280]">SLA Compliance</span>
                      <span className="font-bold text-[#10B981] block mt-0.5">99.1% Met</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-[#6B7280]">CSAT Portfolio</span>
                      <span className="font-bold text-[#111827] block mt-0.5">4.91 / 5.00</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Metric 1 */}
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs">
                    <span className="text-[9px] text-[#6B7280] uppercase block">Operational Cost Savings</span>
                    <span className="text-xl font-bold text-[#111827] block mt-1">35% Deflected</span>
                    <span className="text-[8px] text-[#10B981] block mt-1">Saving estimated $120k / mo</span>
                  </div>
                  {/* Metric 2 */}
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs">
                    <span className="text-[9px] text-[#6B7280] uppercase block">Mean Time to Resolution</span>
                    <span className="text-xl font-bold text-[#111827] block mt-1">12 minutes</span>
                    <span className="text-[8px] text-[#10B981] block mt-1">40% improvement vs last month</span>
                  </div>
                  {/* Metric 3 */}
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs">
                    <span className="text-[9px] text-[#6B7280] uppercase block">Average Ticket Lifetime</span>
                    <span className="text-xl font-bold text-[#111827] block mt-1">1.2 Hours</span>
                    <span className="text-[8px] text-[#6B7280] block mt-1">Fully audited and closed</span>
                  </div>
                </div>

                {/* Recharts Chart for Exec Tab */}
                <div className="h-56 border border-[#E5E7EB] bg-[#FAFAFA] rounded p-4">
                  <span className="text-[9px] text-[#6B7280] uppercase tracking-wider block mb-2">CSAT Rating Portfolio Trend</span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={csatTrendData} margin={{ top: 5, right: 5, left: -40, bottom: 5 }}>
                        <defs>
                          <linearGradient id="csatLightGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                        <YAxis stroke="#6B7280" fontSize={8} domain={[4.7, 5.0]} className="font-mono" />
                        <Area type="monotone" dataKey="satisfaction" stroke="#10B981" fill="url(#csatLightGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ops" className="space-y-6 mt-0 font-mono">
                <div className="flex flex-col lg:flex-row justify-between gap-4 border-b border-[#E5E7EB] pb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280]">Workspace: Operations Control Deck</span>
                    <h3 className="text-sm font-bold text-[#111827] uppercase mt-1">Service Availability & Infrastructure Health</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CMDB status */}
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs space-y-3">
                    <span className="text-[9px] text-[#6B7280] uppercase block border-b border-[#E5E7EB] pb-1.5">CMDB CI Topology Health</span>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Database Servers:</span>
                        <span className="font-bold text-[#10B981]">Healthy (99.98%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>API Load Balancers:</span>
                        <span className="font-bold text-[#10B981]">Healthy (100.0%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kubernetes Clusters:</span>
                        <span className="font-bold text-[#F59E0B]">Near limit (92.4%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Incident alerts */}
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs space-y-3">
                    <span className="text-[9px] text-[#6B7280] uppercase block border-b border-[#E5E7EB] pb-1.5">Active Critical Incidents Ledger</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[#EF4444]">
                        <span>P1-984: DB latency spike</span>
                        <span className="border border-[#EF4444] px-1 rounded text-[8px] uppercase">Breaching 4m</span>
                      </div>
                      <div className="flex justify-between items-center text-[#F59E0B]">
                        <span>P2-104: HR login failure</span>
                        <span className="border border-[#F59E0B] px-1 rounded text-[8px] uppercase">Warning state</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="desk" className="space-y-6 mt-0 font-mono">
                <div className="flex flex-col lg:flex-row justify-between gap-4 border-b border-[#E5E7EB] pb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280]">Workspace: Service Desk Agent Console</span>
                    <h3 className="text-sm font-bold text-[#111827] uppercase mt-1">Personal queue load & resolution speed</h3>
                  </div>
                </div>

                <div className="border border-[#E5E7EB] rounded overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#FAFAFA] font-mono text-[9px]">
                      <TableRow className="border-b border-[#E5E7EB] hover:bg-transparent">
                        <TableHead className="text-[#6B7280]">Ticket Reference</TableHead>
                        <TableHead className="text-[#6B7280]">Requester</TableHead>
                        <TableHead className="text-[#6B7280]">Priority</TableHead>
                        <TableHead className="text-[#6B7280]">AI Classification</TableHead>
                        <TableHead className="text-[#6B7280] text-right">Time to Breach</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      <TableRow className="border-b border-[#E5E7EB] hover:bg-[#FAFAFA]">
                        <TableCell className="font-bold text-[#111827]">SST-IT-1092</TableCell>
                        <TableCell>Emma Carter</TableCell>
                        <TableCell><Badge className="bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 text-[8px] uppercase">P1 Critical</Badge></TableCell>
                        <TableCell>Database Outage</TableCell>
                        <TableCell className="text-right text-[#EF4444] font-bold">12 minutes</TableCell>
                      </TableRow>
                      <TableRow className="border-b border-[#E5E7EB] hover:bg-[#FAFAFA]">
                        <TableCell className="font-bold text-[#111827]">SST-HR-2041</TableCell>
                        <TableCell>David Foster</TableCell>
                        <TableCell><Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 text-[8px] uppercase">P2 High</Badge></TableCell>
                        <TableCell>Access Provisioning</TableCell>
                        <TableCell className="text-right text-[#111827]">1.4 hours</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="manager" className="space-y-6 mt-0 font-mono">
                <div className="flex flex-col lg:flex-row justify-between gap-4 border-b border-[#E5E7EB] pb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280]">Workspace: Operations Delivery Manager</span>
                    <h3 className="text-sm font-bold text-[#111827] uppercase mt-1">Resource utilization & timesheet approvals</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recharts chart on Workload */}
                  <div className="h-56 border border-[#E5E7EB] bg-[#FAFAFA] rounded p-4">
                    <span className="text-[8px] font-mono text-[#6B7280] uppercase tracking-wider block mb-2">Department workload distributions</span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={departmentPerformanceData} margin={{ top: 5, right: 5, left: -40, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="name" stroke="#6B7280" fontSize={7} className="font-mono" />
                          <YAxis stroke="#6B7280" fontSize={8} className="font-mono" />
                          <Bar dataKey="volume" name="Tickets Filed" fill="#2563EB" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* List of approvals */}
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs space-y-3">
                    <span className="text-[9px] text-[#6B7280] uppercase block border-b border-[#E5E7EB] pb-1.5">Approvals Queue</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-white rounded border border-[#E5E7EB]">
                        <div>
                          <span className="font-bold text-[#111827] block">Log: Timesheet (Sarah Jenkins)</span>
                          <span className="text-[9px] text-[#6B7280]">FICO module (Total actual: 12.5h)</span>
                        </div>
                        <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 text-[8px] uppercase">Awaiting</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded border border-[#E5E7EB]">
                        <div>
                          <span className="font-bold text-[#111827] block">Override: Soft delete Order #204</span>
                          <span className="text-[9px] text-[#6B7280]">Requested by Database operations</span>
                        </div>
                        <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 text-[8px] uppercase">Awaiting</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="customer" className="space-y-6 mt-0 font-mono">
                <div className="flex flex-col lg:flex-row justify-between gap-4 border-b border-[#E5E7EB] pb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280]">Workspace: Customer Self-Service Catalog</span>
                    <h3 className="text-sm font-bold text-[#111827] uppercase mt-1">Submit Incident requests or audit licenses</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs space-y-2 hover:border-[#6B7280] hover:shadow-sm transition duration-300">
                    <span className="font-bold text-[#111827] block">IT Request Catalog</span>
                    <p className="text-[10px] text-[#6B7280]">Request hardware provisioning, new VM creation, or local environment licenses.</p>
                  </div>
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs space-y-2 hover:border-[#6B7280] hover:shadow-sm transition duration-300">
                    <span className="font-bold text-[#111827] block">HR Operations Desk</span>
                    <p className="text-[10px] text-[#6B7280]">File payroll queries, update profile credentials, or submit benefit documentation requests.</p>
                  </div>
                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-xs space-y-2 hover:border-[#6B7280] hover:shadow-sm transition duration-300">
                    <span className="font-bold text-[#111827] block">Customer support hub</span>
                    <p className="text-[10px] text-[#6B7280]">Raise technical incidents, monitor SLA timelines, and track resolution steps.</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6 mt-0 font-mono">
                <div className="flex flex-col lg:flex-row justify-between gap-4 border-b border-[#E5E7EB] pb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B7280]">Workspace: Business Intelligence Engine</span>
                    <h3 className="text-sm font-bold text-[#111827] uppercase mt-1">Ticket Influx and Resolution Capacity Trends</h3>
                  </div>
                </div>

                <div className="h-56 border border-[#E5E7EB] bg-[#FAFAFA] rounded p-4">
                  <span className="text-[8px] font-mono text-[#6B7280] uppercase tracking-wider block mb-2">Monthly Influx vs Closure Trends</span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ticketVolumeData} margin={{ top: 5, right: 5, left: -40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                        <YAxis stroke="#6B7280" fontSize={8} className="font-mono" />
                        <Legend wrapperStyle={{ fontSize: 8, fontFamily: 'monospace' }} />
                        <Bar dataKey="incidents" name="Incidents Raised" fill="#EF4444" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="requests" name="Service Requests" fill="#2563EB" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

            </Card>
          </Tabs>
        </div>
      </section>

      {/* ── SECTION 7: WORKFLOW AUTOMATION ── */}
      <section id="workflow-automation" className="py-24 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Process Orchestrator
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Automate Every Process</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Evaluate incident lifecycle transitions with our interactive workflow simulation. Click steps or toggle autoplay.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Interactive Stepper Control */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex gap-2">
                <Button 
                  onClick={() => setWorkflowStep((prev) => Math.max(0, prev - 1))}
                  disabled={workflowStep === 0}
                  className="bg-white hover:bg-[#FAFAFA] border border-[#E5E7EB] text-[#111827] text-[10px] font-mono uppercase font-bold px-3 py-1.5 rounded"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setWorkflowStep((prev) => (prev + 1) % 8)}
                  className="bg-[#111117] hover:bg-[#6B7280] text-white text-[10px] font-mono uppercase font-bold px-3 py-1.5 rounded"
                >
                  Forward
                </Button>
                <Button 
                  onClick={() => setWorkflowAutoplay(!workflowAutoplay)}
                  variant="outline"
                  className={`text-[10px] font-mono uppercase font-bold px-3 py-1.5 rounded border ${
                    workflowAutoplay ? 'border-[#10B981] text-[#10B981]' : 'border-[#E5E7EB] text-[#6B7280]'
                  }`}
                >
                  {workflowAutoplay ? 'Autoplay ON' : 'Autoplay'}
                </Button>
              </div>

              {/* Status context description */}
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded font-mono text-xs space-y-2">
                <span className="text-[9px] text-[#6B7280] block uppercase tracking-wider">Step Details</span>
                <h4 className="text-[#111827] font-bold uppercase">
                  {(() => {
                    if (workflowStep === 0) return '01. Issue Created';
                    if (workflowStep === 1) return '02. AI Classification';
                    if (workflowStep === 2) return '03. Automated Assignment';
                    if (workflowStep === 3) return '04. Approval Pending';
                    if (workflowStep === 4) return '05. Deep Investigation';
                    if (workflowStep === 5) return '06. Resolution Applied';
                    if (workflowStep === 6) return '07. CSAT Evaluation';
                    return '08. Executive Reporting';
                  })()}
                </h4>
                <p className="text-[#6B7280] leading-relaxed">
                  {(() => {
                    if (workflowStep === 0) return 'Incident is reported through the client portal, triggering initial parsing routines.';
                    if (workflowStep === 1) return 'Our automated classification models evaluate risk categorization and assign priority thresholds.';
                    if (workflowStep === 2) return 'The ticket is automatically routed to engineers matching specialization credentials.';
                    if (workflowStep === 3) return 'Logged estimates or resource allocations require operations manager review.';
                    if (workflowStep === 4) return 'The assigned consultant identifies structural root causes and compiles solution scripts.';
                    if (workflowStep === 5) return 'Remediation procedures are executed and change orders log successfully.';
                    if (workflowStep === 6) return 'Feedback queries request user satisfaction ratings, updating historical statistics.';
                    return 'Aggregated performance metrics bind directly to executive reporting command consoles.';
                  })()}
                </p>
              </div>
            </div>

            {/* Visual Timeline Nodes */}
            <div className="lg:col-span-8 p-6 bg-[#FAFAFA] border border-[#E5E7EB] rounded relative">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                {[
                  'Issue Created',
                  'AI Classification',
                  'Assignment',
                  'Approval',
                  'Investigation',
                  'Resolution',
                  'Feedback',
                  'Analytics'
                ].map((node, index) => (
                  <div key={index} className="flex flex-row md:flex-col items-center gap-3 md:gap-2 w-full md:w-auto">
                    <div className={`w-8 h-8 rounded-full border-2 font-mono font-bold text-xs flex items-center justify-center transition duration-300 ${
                      workflowStep === index
                        ? 'bg-[#111117] border-[#111117] text-white scale-110 shadow-md'
                        : workflowStep > index
                        ? 'bg-[#10B981]/10 border-[#10B981] text-[#10B981]'
                        : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                    }`}>
                      {index + 1}
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                      workflowStep === index ? 'text-[#111827]' : 'text-[#6B7280]'
                    }`}>
                      {node}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 8: ENTERPRISE ANALYTICS ── */}
      <section id="analytics-section" className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-white rounded">
              BI Intelligence
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Data Driven Service Excellence</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Evaluate real-time operational analytics including SLA targets, change metrics, and device inventories.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left selector */}
            <div className="lg:col-span-3 space-y-2">
              {[
                { id: 'health', title: 'Service Health' },
                { id: 'compliance', title: 'SLA Compliance' },
                { id: 'assets', title: 'Asset Inventory' },
                { id: 'change', title: 'Change Success' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedAnalyticsTab(tab.id)}
                  className={`w-full text-left p-3.5 font-mono text-xs uppercase tracking-wider font-bold rounded border transition ${
                    selectedAnalyticsTab === tab.id
                      ? 'bg-[#111117] text-white border-[#111117]'
                      : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>

            {/* Right chart view */}
            <div className="lg:col-span-9">
              <Card className="bg-white border-[#E5E7EB] rounded p-6 shadow-sm space-y-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      if (selectedAnalyticsTab === 'health') {
                        return (
                          <AreaChart data={slaComplianceData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <defs>
                              <linearGradient id="anHealthLightGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={9} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} domain={[97, 100]} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Area type="monotone" dataKey="compliance" name="Overall Service Health %" stroke="#10B981" fill="url(#anHealthLightGrad)" strokeWidth={2} />
                          </AreaChart>
                        );
                      }
                      if (selectedAnalyticsTab === 'compliance') {
                        return (
                          <BarChart data={departmentPerformanceData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={9} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} domain={[95, 100]} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Bar dataKey="compliance" name="Department SLA Compliance %" fill="#2563EB" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        );
                      }
                      if (selectedAnalyticsTab === 'assets') {
                        return (
                          <BarChart data={assetHealthData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={9} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9 }} />
                            <Bar dataKey="healthy" name="Healthy Items" fill="#10B981" stackId="assets" />
                            <Bar dataKey="risk" name="At Risk Items" fill="#F59E0B" stackId="assets" />
                            <Bar dataKey="fail" name="Failure Incidents" fill="#EF4444" stackId="assets" />
                          </BarChart>
                        );
                      }
                      if (selectedAnalyticsTab === 'change') {
                        return (
                          <LineChart data={changeSuccessData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={9} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} domain={[90, 100]} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Line type="monotone" dataKey="success" name="Deploy Success rate %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                          </LineChart>
                        );
                      }
                      return null;
                    })()}
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 9: ENTERPRISE SECURITY ── */}
      <section className="py-24 bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Information Security
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Built For Enterprise Security</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Maintain regulatory posture standards with robust security protocols, access structures, and encryption schemes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Identity Providers', desc: 'Secure SSO operations integrating natively with Okta, Azure Active Directory, SAML 2.0, and forced password resets.' },
              { icon: Lock, title: 'Access Control Policies', desc: 'Row-level security (RLS) filters database schemas, restricting user records dynamically.' },
              { icon: Terminal, title: 'Comprehensive Audit Logs', desc: 'Log every transaction override, password resetting trigger, effort logging modification in permanent ledgers.' },
              { icon: Database, title: 'Standard Encryption', desc: 'Enforce transport security (SSL/TLS) and storage block encryption (AES-256) on cloud infrastructure.' }
            ].map((sec, idx) => {
              const IconComp = sec.icon;
              return (
                <Card key={idx} className="bg-white border-[#E5E7EB] p-6 space-y-4 hover:border-[#6B7280] hover:shadow-md transition duration-300">
                  <div className="w-8 h-8 rounded bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center text-[#2563EB]">
                    <IconComp size={16} />
                  </div>
                  <span className="text-xs font-bold text-[#111827] font-mono uppercase block">{sec.title}</span>
                  <p className="text-xs text-[#6B7280] leading-relaxed">{sec.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 10: SCALABILITY & ARCHITECTURE ── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-white rounded">
              Infrastructure
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Built To Scale</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Ultra-high availability and low latency pipelines processing thousands of queries daily.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Multi-Tenant SaaS', desc: 'Isolated logical partitions prevent data pollution across environments.' },
              { title: 'Cloud Native Setup', desc: 'Containers auto-scale compute units depending on queue requirements.' },
              { title: 'Global Availability', desc: 'CDN edge endpoints minimize load latencies across all international nodes.' },
              { title: 'Event-Driven Routing', desc: 'Message queues distribute operations asynchronously to avoid bottleneck risks.' }
            ].map((arch, idx) => (
              <Card key={idx} className="bg-white border-[#E5E7EB] p-6 space-y-3 hover:border-[#6B7280] hover:shadow-md transition duration-300">
                <span className="text-xs font-bold text-[#111827] font-mono uppercase block">{arch.title}</span>
                <p className="text-xs text-[#6B7280] leading-relaxed">{arch.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 11: TESTIMONIAL SECTION ── */}
      <section className="py-24 bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Testimonials
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Customer Success</h2>
            <div className="flex justify-center items-center gap-1 text-[#F59E0B] pt-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#F59E0B" className="stroke-none" />)}
              <span className="text-xs font-mono text-[#111827] ml-2 font-bold">4.9/5 Customer Rating</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { quote: '"Assist360 completely transformed how our teams manage service delivery."', author: 'Sophia Richardson', role: 'VP Operations' },
              { quote: '"The analytics and visibility are beyond anything we\'ve used before."', author: 'Daniel Foster', role: 'Chief Information Officer' },
              { quote: '"Assist360 became the operational backbone of our service organization."', author: 'Emma Carter', role: 'Director of Service Delivery' },
              { quote: '"One platform replaced six disconnected systems."', author: 'Michael Thompson', role: 'Head of Enterprise Support' }
            ].map((test, idx) => (
              <Card key={idx} className="bg-white border-[#E5E7EB] p-6 flex flex-col justify-between hover:border-[#6B7280] hover:shadow-md transition duration-300">
                <p className="text-xs text-[#6B7280] italic leading-relaxed">{test.quote}</p>
                <div className="pt-6 font-mono text-xs border-t border-[#E5E7EB] mt-4">
                  <span className="font-bold text-[#111827] block">{test.author}</span>
                  <span className="text-[9px] text-[#6B7280] block mt-0.5">{test.role}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 15: COMPARISON SECTION ── */}
      <section id="compare" className="py-24 bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Feature Auditing
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Platform Comparison</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Audit the feature capabilities of ASSIST360 compared to traditional, siloed ticketing tools.
            </p>
          </div>

          {/* Interactive filter search */}
          <div className="max-w-md mx-auto relative mb-6 font-mono text-xs">
            <input 
              type="text" 
              placeholder="Filter comparison table..." 
              value={compareFilter}
              onChange={(e) => setCompareFilter(e.target.value)}
              className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded p-2.5 pl-9 text-[#111827] focus:outline-none focus:border-[#111827]"
            />
            <Search size={14} className="absolute left-3 top-3.5 text-[#6B7280]" />
          </div>

          <div className="border border-[#E5E7EB] rounded overflow-hidden max-w-4xl mx-auto shadow-sm bg-white">
            <Table>
              <TableHeader className="bg-[#FAFAFA] font-mono text-[9px]">
                <TableRow className="border-b border-[#E5E7EB] hover:bg-transparent">
                  <TableHead className="py-3 px-6 text-[#6B7280]">Feature Matrix</TableHead>
                  <TableHead className="py-3 px-6 text-center text-[#6B7280]">Traditional Helpdesk</TableHead>
                  <TableHead className="py-3 px-6 text-center text-[#111827] bg-[#FAFAFA]">ASSIST360 Platform</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-mono">
                {filteredComparisonRows.length > 0 ? (
                  filteredComparisonRows.map((row, index) => (
                    <TableRow key={index} className="border-b border-[#E5E7EB] hover:bg-[#FAFAFA] transition duration-150">
                      <TableCell className="py-3.5 px-6 font-bold text-[#111827]">{row.feature}</TableCell>
                      <TableCell className="py-3.5 px-6 text-center text-[#6B7280]">{row.traditional}</TableCell>
                      <TableCell className="py-3.5 px-6 text-center font-bold text-[#10B981] bg-[#FAFAFA]/40">{row.assist}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-[#6B7280]">No features match filter criteria.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ── SECTION 16: ENTERPRISE CONTROL TOWER ── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-white rounded">
              Command Deck
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">Enterprise Control Tower</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Interact with the active operational war room console to audit severity levels, resource queues, and trigger automated AI recommendations.
            </p>
          </div>

          <div className="border border-[#E5E7EB] rounded bg-white p-6 shadow-sm relative max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] block"></span>
                <span className="font-bold text-[#111827] uppercase tracking-wider">Active Command Center Cockpit</span>
              </div>
              <Badge className="bg-[#FAFAFA] text-[#10B981] border border-[#E5E7EB] text-[9px] font-bold font-mono rounded uppercase">
                Real-time Data Binding
              </Badge>
            </div>

            {/* Dashboard Mockup Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              <Card className="p-4 bg-[#FAFAFA] border-[#E5E7EB] space-y-3">
                <span className="text-[9px] font-bold text-[#6B7280] uppercase">Active Alerts Level</span>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Critical alerts pending:</span>
                    <span className="font-bold text-[#EF4444]">{controlTowerCriticalAlerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Warning state metrics:</span>
                    <span className="font-bold text-[#F59E0B]">4</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-[#FAFAFA] border-[#E5E7EB] space-y-3">
                <span className="text-[9px] font-bold text-[#6B7280] uppercase">SLA Breaches Risk Index</span>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>SST-MM-1024:</span>
                    <span className="text-[#EF4444] font-bold">12m to breach</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SST-FI-1032:</span>
                    <span className="text-[#F59E0B] font-bold">34m warning</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-[#FAFAFA] border-[#E5E7EB] space-y-3">
                <span className="text-[9px] font-bold text-[#6B7280] uppercase">AI Action Center</span>
                <div className="space-y-2">
                  <p className="text-[9px] text-[#6B7280]">Process pending critical alerts using autonomous classification agent:</p>
                  <Button 
                    onClick={triggerControlTowerAiAction}
                    className="w-full h-8 text-[9px] font-mono uppercase font-bold bg-[#111827] hover:bg-[#6B7280] text-white rounded"
                  >
                    Execute AI Auto-Fix
                  </Button>
                </div>
              </Card>
            </div>

            {/* Live audit trails console */}
            <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded font-mono text-xs">
              <span className="text-[9px] text-[#6B7280] block uppercase tracking-wider mb-2">Operations Log Trails stream</span>
              <div className="space-y-1 text-[#6B7280] select-none text-[10px]">
                {controlTowerLog.map((log, index) => (
                  <p key={index}><span className="text-[#2563EB] font-bold">&gt;</span> {log}</p>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E5E7EB] pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-center text-xs">
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                <span className="text-[9px] text-[#6B7280] uppercase block">Global SLA Metric</span>
                <span className="text-md font-bold text-[#10B981] mt-1 block">98.7% Met</span>
              </div>
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                <span className="text-[9px] text-[#6B7280] uppercase block">Asset Health Index</span>
                <span className="text-md font-bold text-[#111827] mt-1 block">99.98%</span>
              </div>
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                <span className="text-[9px] text-[#6B7280] uppercase block">Pending Approvals</span>
                <span className="text-md font-bold text-[#111827] mt-1 block">8</span>
              </div>
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                <span className="text-[9px] text-[#6B7280] uppercase block">Autopilot Status</span>
                <span className="text-md font-bold text-[#10B981] mt-1 block">Online</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 17: FINAL CALL TO ACTION ── */}
      <section className="py-24 md:py-28 relative bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <Badge variant="outline" className="text-[9px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] py-1 px-3 uppercase rounded">
            Enterprise Consolidation
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#111827] uppercase font-mono">
            Run Every Service Operation From One Intelligent Platform
          </h2>
          <p className="text-sm text-[#6B7280] font-medium leading-relaxed max-w-xl mx-auto font-sans">
            Enterprise-grade service management powered by automation, intelligence, analytics, and operational excellence.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button 
              onClick={() => {
                setDemoType('Start Enterprise Demo');
                setDemoModalOpen(true);
              }}
              className="h-11 px-6 bg-[#111827] hover:bg-[#6B7280] text-white font-mono text-xs font-bold uppercase tracking-wider rounded"
            >
              Start Enterprise Demo
            </Button>
            
            <Button 
              onClick={() => {
                setDemoType('Request Executive Briefing');
                setDemoModalOpen(true);
              }}
              variant="outline"
              className="h-11 px-6 border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#FAFAFA] hover:border-[#6B7280] font-mono text-xs font-bold uppercase tracking-wider rounded"
            >
              Talk To Sales
            </Button>

            <Button 
              onClick={() => {
                setDemoType('Schedule Executive Consultation');
                setDemoModalOpen(true);
              }}
              variant="ghost"
              className="h-11 px-6 text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFA] font-mono text-xs font-bold uppercase tracking-wider rounded"
            >
              Schedule Executive Consultation
            </Button>
          </div>
        </div>
      </section>

      {/* ── SECTION 18: FOOTER ── */}
      <footer className="bg-white text-[#6B7280] py-16 text-xs border-t border-[#E5E7EB] font-mono">
        <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4">
            <span className="font-extrabold text-[#111827] tracking-wider uppercase text-[10px] block">Platform</span>
            <ul className="space-y-2">
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Incident Management</a></li>
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Request Management</a></li>
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Problem Management</a></li>
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Change Management</a></li>
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Asset Management</a></li>
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Knowledge Management</a></li>
              <li><a href="#workflow-automation" className="hover:text-[#111827] transition">Workflow Automation</a></li>
              <li><a href="#analytics-section" className="hover:text-[#111827] transition">Analytics</a></li>
              <li><a href="#ai-showcase" className="hover:text-[#111827] transition">AI Operations</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-[#111827] tracking-wider uppercase text-[10px] block">Company</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#111827] transition">About</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Careers</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Partners</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Contact</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-[#111827] tracking-wider uppercase text-[10px] block">Resources</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#111827] transition">Documentation</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">API</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Support</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Security</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-[#111827] tracking-wider uppercase text-[10px] block">Legal</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#111827] transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Compliance</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Trust Center</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-8 border-t border-[#E5E7EB] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px]">
          <span>Copyright © Support Studio Technologies. All Rights Reserved.</span>
          <span>Powered by Assist360.</span>
        </div>
      </footer>

    </div>
  );
}
