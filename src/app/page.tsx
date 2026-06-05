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

const ITSM_SUITE_METADATA: Record<string, { icon: React.ComponentType<any>; description: string }> = {
  'Incident Management': { icon: ShieldCheck, description: 'Streamline tracking, routing, and resolution of unplanned disruptions.' },
  'Service Requests': { icon: ClipboardList, description: 'Automate request catalog items, hardware provisioning, and access permissions.' },
  'Workflow Automation': { icon: Workflow, description: 'Orchestrate linear and branching processes with conditional triggers.' },
  'Analytics': { icon: BarChart3, description: 'Visualize live performance metrics and identify bottlenecks across teams.' },
  'AI Intelligence': { icon: Sparkles, description: 'Classify tickets, route requests, and predict escalation risks autonomously.' },
  'Knowledge Management': { icon: BookOpen, description: 'Establish a single source of truth database for resolutions and manuals.' },
  'Asset Management': { icon: Server, description: 'Track hardware, licensing lifecycles, and VM pools seamlessly.' },
  'Security': { icon: Lock, description: 'Enforce RLS, SAML Single Sign-On, audit trail logs, and RBAC policies.' },
  'Customer Success': { icon: Users, description: 'Audit customer CSAT trends, NPS indices, and health index trackers.' },
  'Executive Reporting': { icon: TrendingUp, description: 'Consolidate operational health indicators and critical risk indexes for decision makers.' }
};

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoType, setDemoType] = useState('Standard Demo');

  // Interactive UI State
  const [heroRefreshTime, setHeroRefreshTime] = useState('12:00:00 PM');
  const [heroIncidents, setHeroIncidents] = useState(14);
  const [heroSla, setHeroSla] = useState(98.7);
  const [heroCSAT, setHeroCSAT] = useState(4.9);
  const [heroLoading, setHeroLoading] = useState(false);

  // Active Analytics Tab (1 to 10)
  const [activeAnalyticsCategory, setActiveAnalyticsCategory] = useState('volume');

  // Active AI Tab Capability selector
  const [activeAiCapability, setActiveAiCapability] = useState('classify');
  
  // Section 5: Enterprise ITSM Suite Schema dialog selector
  const [selectedSuiteItem, setSelectedSuiteItem] = useState<string | null>(null);

  // Workflow Automation State
  const [workflowStep, setWorkflowStep] = useState(0);
  const [workflowAutoplay, setWorkflowAutoplay] = useState(false);

  // Comparison Matrix Filter
  const [compareFilter, setCompareFilter] = useState('');

  // Control Tower Cockpit Simulator state
  const [controlTowerCriticalAlerts, setControlTowerCriticalAlerts] = useState(2);
  const [controlTowerLog, setControlTowerLog] = useState<string[]>([
    'System initialization successful.',
    'AI Ticket routing engine: Listening for input.',
    'Incident P1-902 assigned to Security Operations.'
  ]);

  useEffect(() => {
    setMounted(true);
    setHeroRefreshTime(new Date().toLocaleTimeString());
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Workflow Autoplay
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (workflowAutoplay) {
      interval = setInterval(() => {
        setWorkflowStep((prev) => (prev + 1) % 7);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [workflowAutoplay]);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    toast.success(`Briefing request for "${demoType}" submitted successfully.`);
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
      setHeroCSAT(parseFloat((4.8 + Math.random() * 0.19).toFixed(1)));
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

  // --- 10 CRITICAL DISTINCT DATASETS FOR UNIQUE VISUALIZATIONS ---

  // 1. Ticket Volume Trends (Incidents, Requests, Problems, Changes)
  const ticketVolumeData = [
    { name: 'Jan', Incidents: 450, Requests: 1400, Problems: 24, Changes: 80 },
    { name: 'Feb', Incidents: 410, Requests: 1550, Problems: 18, Changes: 95 },
    { name: 'Mar', Incidents: 530, Requests: 1800, Problems: 35, Changes: 110 },
    { name: 'Apr', Incidents: 390, Requests: 1650, Problems: 15, Changes: 85 },
    { name: 'May', Incidents: 320, Requests: 1900, Problems: 12, Changes: 130 },
    { name: 'Jun', Incidents: 290, Requests: 2100, Problems: 9, Changes: 145 }
  ];

  // 2. SLA Governance (SLA Compliance, Response SLA, Resolution SLA, Breach Trends)
  const slaGovernanceData = [
    { name: 'Jan', compliance: 98.2, responseSla: 99.1, resolutionSla: 98.4, breaches: 12 },
    { name: 'Feb', compliance: 98.5, responseSla: 99.4, resolutionSla: 98.6, breaches: 8 },
    { name: 'Mar', compliance: 98.9, responseSla: 99.5, resolutionSla: 98.9, breaches: 5 },
    { name: 'Apr', compliance: 98.4, responseSla: 99.0, resolutionSla: 98.5, breaches: 11 },
    { name: 'May', compliance: 98.7, responseSla: 99.3, resolutionSla: 98.8, breaches: 7 },
    { name: 'Jun', compliance: 99.1, responseSla: 99.7, resolutionSla: 99.2, breaches: 3 }
  ];

  // 3. Customer Experience (CSAT Trend, NPS Trend, Customer Health, Risk Scores)
  const customerExperienceData = [
    { name: 'Jan', CSAT: 4.82, NPS: 72, HealthScore: 92, RiskScore: 8 },
    { name: 'Feb', CSAT: 4.85, NPS: 74, HealthScore: 94, RiskScore: 6 },
    { name: 'Mar', CSAT: 4.89, NPS: 78, HealthScore: 95, RiskScore: 5 },
    { name: 'Apr', CSAT: 4.87, NPS: 76, HealthScore: 93, RiskScore: 7 },
    { name: 'May', CSAT: 4.91, NPS: 81, HealthScore: 96, RiskScore: 4 },
    { name: 'Jun', CSAT: 4.93, NPS: 84, HealthScore: 98, RiskScore: 2 }
  ];

  // 4. Service Performance (Resolution Time, Response Time, Escalation Rate, Backlog Trends)
  const servicePerformanceData = [
    { name: 'Jan', resolutionTime: 42, responseTime: 8, escalationRate: 14, backlog: 210 },
    { name: 'Feb', resolutionTime: 38, responseTime: 6, escalationRate: 11, backlog: 180 },
    { name: 'Mar', resolutionTime: 35, responseTime: 5, escalationRate: 8, backlog: 140 },
    { name: 'Apr', resolutionTime: 39, responseTime: 7, escalationRate: 12, backlog: 165 },
    { name: 'May', resolutionTime: 30, responseTime: 4, escalationRate: 6, backlog: 120 },
    { name: 'Jun', resolutionTime: 24, responseTime: 3, escalationRate: 4, backlog: 95 }
  ];

  // 5. Team Productivity (Utilization, Capacity, Productivity, Workload Distribution)
  const teamProductivityData = [
    { name: 'Tier 1 Support', value: 35, fill: '#2563EB' },
    { name: 'Tier 2 Systems', value: 25, fill: '#3B82F6' },
    { name: 'Tier 3 Operations', value: 20, fill: '#10B981' },
    { name: 'DB Engineers', value: 12, fill: '#F59E0B' },
    { name: 'DevOps Desk', value: 8, fill: '#EF4444' }
  ];

  // 6. Asset Intelligence (Asset Health, Warranty Expiry, Lifecycle Tracking, Utilization)
  const assetIntelligenceData = [
    { name: 'Core Server Pools', Healthy: 420, LifecycleExited: 12, ActiveLoad: 78 },
    { name: 'Virtual Instances', Healthy: 1850, LifecycleExited: 4, ActiveLoad: 62 },
    { name: 'Network Clusters', Healthy: 130, LifecycleExited: 0, ActiveLoad: 45 },
    { name: 'Storage Vaults', Healthy: 90, LifecycleExited: 2, ActiveLoad: 88 }
  ];

  // 7. Change Management (Success Rate, Failed Changes, Pending Changes, Risk Analysis)
  const changeManagementData = [
    { name: 'Jan', successRate: 94.5, failed: 4, pending: 42 },
    { name: 'Feb', successRate: 95.1, failed: 3, pending: 35 },
    { name: 'Mar', successRate: 96.8, failed: 2, pending: 48 },
    { name: 'Apr', successRate: 95.4, failed: 3, pending: 52 },
    { name: 'May', successRate: 97.2, failed: 1, pending: 38 },
    { name: 'Jun', successRate: 98.4, failed: 1, pending: 29 }
  ];

  // 8. Executive Intelligence (Operational Health, Critical Incidents, Department Performance, Service Health)
  const executiveIntelligenceData = [
    { name: 'Finance', Score: 96, IncidentCount: 4 },
    { name: 'Engineering', Score: 98, IncidentCount: 1 },
    { name: 'HR Operations', Score: 94, IncidentCount: 3 },
    { name: 'Logistics', Score: 91, IncidentCount: 6 },
    { name: 'Customer Success', Score: 99, IncidentCount: 0 }
  ];

  // 9. AI Operations (AI Classification, AI Routing Accuracy, AI Predictions, AI Automation)
  const aiOperationsData = [
    { name: 'Auto-Routing', Accuracy: 98.4, Rate: 92 },
    { name: 'Priority Detect', Accuracy: 99.1, Rate: 98 },
    { name: 'Log Classification', Accuracy: 97.8, Rate: 89 },
    { name: 'Root Cause Sync', Accuracy: 94.2, Rate: 76 }
  ];

  // 10. Security Operations (Security Incidents, Compliance Status, Audit Findings, Risk Monitoring)
  const securityOperationsData = [
    { name: 'Jan', incidents: 3, riskScore: 12 },
    { name: 'Feb', incidents: 1, riskScore: 8 },
    { name: 'Mar', incidents: 0, riskScore: 5 },
    { name: 'Apr', incidents: 2, riskScore: 10 },
    { name: 'May', incidents: 0, riskScore: 4 },
    { name: 'Jun', incidents: 0, riskScore: 2 }
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
    suggest: {
      title: 'AI Actionable Resolution Suggestions',
      latency: '85ms',
      confidence: '96.5%',
      status: 'Ready',
      log: 'Remediation script compiled. Fix command: [cluster.db_pool.recycle()]. SLA savings estimated at 38m.'
    },
    knowledge: {
      title: 'AI Knowledge Suggestion Systems',
      latency: '42ms',
      confidence: '95.8%',
      status: 'Active',
      log: 'Searching database. 3 relevant articles extracted. KB-902 (Kernel patch procedure) suggested to engineer.'
    },
    capacity: {
      title: 'AI Live Capacity Planning',
      latency: '150ms',
      confidence: '95.1%',
      status: 'Active',
      log: 'Team capacity balance recalculated. Suggesting transfer of 4 cases from Functional FICO to MM certified benched.'
    },
    risk: {
      title: 'AI Proactive Escalation Prediction',
      latency: '18ms',
      confidence: '93.7%',
      status: 'Monitoring',
      log: 'Telemetry check. Risk score: [High Risk of SLA breach]. ETA remaining: 14m. Warning triggered.'
    },
    escalation: {
      title: 'AI SLA Risk Forecasting Telemetry',
      latency: '24ms',
      confidence: '97.2%',
      status: 'Active',
      log: 'Historical modeling complete. Predicted resolution time: 38m. Contractual SLA limit: 30m. Breach Risk: 84%.'
    },
    insights: {
      title: 'AI Executive Insights Generator',
      latency: '310ms',
      confidence: '96.8%',
      status: 'Active',
      log: 'Analyzing weekly portfolio health. Summary compiled: [SLA compliance stable at 99.1%]. Zero queue blocker identified.'
    }
  };

  const COMPARISON_ROWS = [
    { feature: 'AI Automation', traditional: 'Basic macros and text templates', assist: 'Autonomous Incident classification, routing, and P1 prediction' },
    { feature: 'Workflow Automation', traditional: 'Static linear approval lists', assist: 'Flexible multi-tenant states orchestration and conditional triggers' },
    { feature: 'Executive Analytics', traditional: 'Cached CSV logs reports', assist: 'Always-live cockpits with data binding directly to operational pipelines' },
    { feature: 'Service Governance', traditional: 'Ad-hoc log monitoring', assist: 'Strict row-level security (RLS) and real-time ledger audits' },
    { feature: 'Asset Management', traditional: 'Offline spreadsheets', assist: 'Integrated database of systems, licenses, and VM structures' },
    { feature: 'SLA Management', traditional: 'Static compliance numbers', assist: 'Dynamic SLA risk modeling and escalation war room triggers' },
    { feature: 'Scalability', traditional: 'Single database bottlenecks', assist: 'Cloud-native multi-tenant architecture processing 50k+ daily actions' },
    { feature: 'Security', traditional: 'Basic login permissions', assist: 'Row Level Security, Okta integration, FIPS 140-2 compliance' },
    { feature: 'Customer Success Analytics', traditional: 'Unlinked survey metrics', assist: 'Real-time CSAT & Escalation indexes, sentiment telemetry trackers' }
  ];

  const filteredComparisonRows = COMPARISON_ROWS.filter(row =>
    row.feature.toLowerCase().includes(compareFilter.toLowerCase()) ||
    row.traditional.toLowerCase().includes(compareFilter.toLowerCase()) ||
    row.assist.toLowerCase().includes(compareFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-[#111827] selection:bg-[#111827] selection:text-white flex flex-col antialiased scroll-smooth">
      
      {/* ── HEADER NAVIGATION ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3">
              <BrandedLogo width={26} height={26} />
              <span className="font-bold text-sm tracking-wider text-[#111827] font-mono">ASSIST360</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-8 text-[11px] uppercase tracking-widest font-mono font-bold text-[#6B7280]">
              <a href="#overview" className="hover:text-[#111827] transition">Overview</a>
              <a href="#capabilities" className="hover:text-[#111827] transition">Capabilities</a>
              <a href="#analytics-section" className="hover:text-[#111827] transition">Intelligence</a>
              <a href="#ai-ops" className="hover:text-[#111827] transition">AI Platform</a>
              <a href="#workflow-automation" className="hover:text-[#111827] transition">Workflow</a>
              <a href="#compare" className="hover:text-[#111827] transition">Comparison</a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="h-9 text-[11px] font-medium uppercase tracking-widest font-mono text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFA]">
              <Link href="/login">Sign In</Link>
            </Button>
            
            <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setDemoType('Standard Platform Demo')}
                  className="h-9 text-[11px] font-semibold uppercase tracking-widest font-mono bg-[#2563EB] hover:bg-blue-700 text-white rounded px-4 shadow-sm transition active:scale-[0.98]"
                >
                  Book Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-[#E5E7EB] rounded max-w-md p-6 text-[#111827] shadow-lg">
                <DialogHeader>
                  <DialogTitle className="text-md font-bold uppercase tracking-wider text-[#111827]">Request platform briefing</DialogTitle>
                  <DialogDescription className="text-xs text-[#6B7280] font-mono mt-1">
                    Book an architecture review and live demo for the ASSIST360 platform.
                  </DialogDescription>
                </DialogHeader>
                {demoSubmitted ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 rounded bg-[#FAFAFA] border border-[#E5E7EB] text-[#10B981] flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Briefing Confirmed</h3>
                    <p className="text-xs text-[#6B7280] font-mono">Our Enterprise Solutions desk will contact you shortly.</p>
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
                    <DialogFooter className="pt-2">
                      <Button type="submit" className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-[10px] py-2.5 rounded font-mono">
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

      {/* ── SECTION 1: HERO EXPERIENCE ── */}
      <section className="min-h-screen pt-32 pb-20 md:pt-40 md:pb-28 relative flex items-center bg-[#FFFFFF] border-b border-[#E5E7EB] overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>
        
        <div className="max-w-7xl mx-auto px-6 md:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* HERO LEFT */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] py-1 px-3 uppercase rounded">
                Enterprise Command Center
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#111827] leading-[1.1] font-sans">
                The Enterprise Service Management Platform Built For Modern Organizations
              </h1>
              
              <p className="text-sm md:text-base text-[#6B7280] font-medium leading-relaxed max-w-xl">
                Manage incidents, requests, workflows, approvals, assets, analytics, AI operations, service delivery, and enterprise governance through one intelligent platform.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button 
                  onClick={() => {
                    setDemoType('Standard Platform Demo');
                    setDemoModalOpen(true);
                  }}
                  className="h-11 px-6 bg-[#2563EB] hover:bg-blue-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded shadow-sm"
                >
                  Book Demo
                </Button>

                <Button 
                  onClick={() => {
                    setDemoType('Explore Platform');
                    setDemoModalOpen(true);
                  }}
                  variant="outline"
                  className="h-11 px-6 border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#FAFAFA] hover:border-[#6B7280] font-mono text-xs font-bold uppercase tracking-wider rounded"
                >
                  Explore Platform
                </Button>
              </div>

              {/* Trust Badges Checkbox indicators */}
              <div className="pt-6 border-t border-[#E5E7EB] grid grid-cols-2 gap-y-3 gap-x-6 text-[11px] font-semibold font-mono text-[#6B7280] uppercase">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#2563EB]" /> AI Powered
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Enterprise Ready
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#2563EB]" /> Real-Time Analytics
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Secure By Design
                </span>
              </div>
            </div>

            {/* HERO RIGHT: MASSIVE PRODUCT VISUALIZATION */}
            <div className="lg:col-span-6 relative flex items-center justify-center min-h-[440px]">
              
              {/* Showcase Frame */}
              <div className="relative w-full max-w-lg p-6 bg-white border border-[#E5E7EB] rounded-lg shadow-xl space-y-4">
                
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6B7280]">Service Control Desk</span>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono">
                    
                    {/* Incident Dashboard */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] transition duration-300">
                      <span className="text-[8px] font-bold text-[#6B7280] uppercase tracking-wider block">Incidents Open</span>
                      <div className="mt-1 text-lg font-bold text-[#EF4444]">{heroIncidents}</div>
                      <span className="text-[7px] text-[#6B7280] block mt-0.5">Critical response queue</span>
                    </div>

                    {/* SLA Analytics */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] transition duration-300">
                      <span className="text-[8px] font-bold text-[#6B7280] uppercase tracking-wider block">SLA Compliance</span>
                      <div className="mt-1 text-lg font-bold text-[#10B981]">{heroSla}%</div>
                      <span className="text-[7px] text-[#6B7280] block mt-0.5">Target SLA limits</span>
                    </div>

                    {/* AI Insights */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] transition duration-300">
                      <span className="text-[8px] font-bold text-[#6B7280] uppercase tracking-wider block">AI Suggestions</span>
                      <div className="mt-1 text-lg font-bold text-[#2563EB]">Active</div>
                      <span className="text-[7px] text-[#6B7280] block mt-0.5">Classifying logs</span>
                    </div>

                    {/* Service Health */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] transition duration-300">
                      <span className="text-[8px] font-bold text-[#6B7280] uppercase tracking-wider block">Service Health</span>
                      <div className="mt-1 text-md font-bold text-[#10B981]">Optimal</div>
                      <span className="text-[7px] text-[#6B7280] block mt-0.5">All servers online</span>
                    </div>

                    {/* Executive Reporting */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] transition duration-300">
                      <span className="text-[8px] font-bold text-[#6B7280] uppercase tracking-wider block">Portfolio CSAT</span>
                      <div className="mt-1 text-md font-bold text-[#111827]">{heroCSAT} / 5.0</div>
                      <span className="text-[7px] text-[#6B7280] block mt-0.5">From customer logs</span>
                    </div>

                    {/* Productivity Metrics */}
                    <div className="p-3.5 bg-white border border-[#E5E7EB] rounded hover:border-[#111827] transition duration-300">
                      <span className="text-[8px] font-bold text-[#6B7280] uppercase tracking-wider block">Productivity</span>
                      <div className="mt-1 text-md font-bold text-[#111827]">92.4%</div>
                      <span className="text-[7px] text-[#10B981] block mt-0.5">Optimal allocation</span>
                    </div>

                  </div>
                )}

                {/* Status Console Printout */}
                <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded space-y-1">
                  <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-1 mb-1 font-mono text-[8px] text-[#6B7280] uppercase tracking-widest">
                    <span>Live operations telemetry logs</span>
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

      {/* ── SECTION 2: TRUST INDICATORS ── */}
      <section className="py-14 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-8">
          <div className="text-center">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#6B7280]">Proven scale across global service portfolios</span>
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

      {/* ── SECTION 3: PRODUCT OVERVIEW ── */}
      <section id="overview" className="py-24 bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Platform Architecture
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Modern Service Delivery</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Consolidate operations, incident records, infrastructure dependencies, and customer health indexes inside a single secure database.
            </p>
          </div>

          <div className="border border-[#E5E7EB] rounded-lg bg-[#FAFAFA] p-6 shadow-sm font-mono text-xs">
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
              <span className="font-bold text-[#111827] uppercase">Interactive Database Catalog</span>
            </div>
            <p className="font-sans text-[#6B7280] leading-relaxed mb-4 max-w-2xl">
              Each module of Assist360 routes data elements directly to partitioned Postgres schemas under strict Row Level Security (RLS) policy definitions.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded">
                <span className="text-[8px] text-[#6B7280] uppercase block">Tenant Spans</span>
                <span className="text-white bg-[#111827] px-1 rounded text-[9px] font-bold block mt-1 w-fit">Decoupled schemas</span>
              </div>
              <div className="p-3 bg-white border border-[#E5E7EB] rounded">
                <span className="text-[8px] text-[#6B7280] uppercase block">Security audits</span>
                <span className="text-white bg-[#111827] px-1 rounded text-[9px] font-bold block mt-1 w-fit">SOC2 & ISO 27001</span>
              </div>
              <div className="p-3 bg-white border border-[#E5E7EB] rounded">
                <span className="text-[8px] text-[#6B7280] uppercase block">API Availability</span>
                <span className="text-white bg-[#10B981] px-1 rounded text-[9px] font-bold block mt-1 w-fit">99.99% normal</span>
              </div>
              <div className="p-3 bg-white border border-[#E5E7EB] rounded">
                <span className="text-[8px] text-[#6B7280] uppercase block">Incident routing</span>
                <span className="text-white bg-[#2563EB] px-1 rounded text-[9px] font-bold block mt-1 w-fit">Autonomous</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: ENTERPRISE CAPABILITIES ── */}
      <section id="capabilities" className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-white rounded">
              Core Capabilities
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Enterprise Service Management</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Explore the critical service operations modules built to run enterprise operations.
            </p>
          </div>

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
        </div>
      </section>

      {/* ── SECTION 5: INTERACTIVE ANALYTICS (10 UNIQUE CHARTS) ── */}
      <section id="analytics-section" className="py-24 bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Intelligence Cockpit
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Data Driven Service Excellence</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Audit the 10 critical operational data streams. Each metric loads distinct data points from our service ledger databases.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Category selector */}
            <div className="lg:col-span-3 space-y-2 font-mono">
              {[
                { id: 'volume', title: '01. Ticket Volume' },
                { id: 'sla', title: '02. SLA Governance' },
                { id: 'customer', title: '03. Customer Experience' },
                { id: 'performance', title: '04. Service Performance' },
                { id: 'productivity', title: '05. Team Productivity' },
                { id: 'asset', title: '06. Asset Intelligence' },
                { id: 'change', title: '07. Change Management' },
                { id: 'exec', title: '08. Executive Intelligence' },
                { id: 'ai', title: '09. AI Operations' },
                { id: 'security', title: '10. Security Operations' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveAnalyticsCategory(tab.id)}
                  className={`w-full text-left p-3 font-mono text-[10px] uppercase tracking-wider font-bold rounded border transition ${
                    activeAnalyticsCategory === tab.id
                      ? 'bg-[#111117] text-white border-[#111117]'
                      : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>

            {/* Right Interactive Chart View */}
            <div className="lg:col-span-9">
              <Card className="bg-white border-[#E5E7EB] rounded-lg p-6 shadow-sm space-y-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      // 1. Ticket Volume Trends (Incidents, Requests, Problems, Changes) -> custom BarChart
                      if (activeAnalyticsCategory === 'volume') {
                        return (
                          <BarChart data={ticketVolumeData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Bar dataKey="Incidents" name="Incidents" fill="#EF4444" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="Requests" name="Service Requests" fill="#2563EB" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="Changes" name="Change Tasks" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        );
                      }
                      // 2. SLA Governance (SLA Compliance, Response SLA, Resolution SLA, Breach Trends) -> custom AreaChart
                      if (activeAnalyticsCategory === 'sla') {
                        return (
                          <AreaChart data={slaGovernanceData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <defs>
                              <linearGradient id="slaGradColLight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} domain={[90, 100]} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Area type="monotone" dataKey="compliance" name="Overall SLA Compliance %" stroke="#10B981" fill="url(#slaGradColLight)" strokeWidth={2} />
                            <Area type="monotone" dataKey="responseSla" name="Response SLA %" stroke="#2563EB" fill="none" strokeWidth={1} strokeDasharray="4 4" />
                          </AreaChart>
                        );
                      }
                      // 3. Customer Experience (CSAT Trend, NPS Trend, Customer Health, Risk Scores) -> custom LineChart
                      if (activeAnalyticsCategory === 'customer') {
                        return (
                          <LineChart data={customerExperienceData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Line type="monotone" dataKey="NPS" name="NPS Index Score" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="HealthScore" name="Health Score %" stroke="#10B981" strokeWidth={2} />
                          </LineChart>
                        );
                      }
                      // 4. Service Performance (Resolution Time, Response Time, Escalation Rate, Backlog Trends) -> custom BarChart
                      if (activeAnalyticsCategory === 'performance') {
                        return (
                          <BarChart data={servicePerformanceData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Bar dataKey="resolutionTime" name="Resolution SLA (m)" fill="#2563EB" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="escalationRate" name="Escalation Rate %" fill="#EF4444" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        );
                      }
                      // 5. Team Productivity (Utilization, Capacity, Productivity, Workload Distribution) -> custom DonutChart
                      if (activeAnalyticsCategory === 'productivity') {
                        return (
                          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                            <Pie
                              data={teamProductivityData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {teamProductivityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                          </PieChart>
                        );
                      }
                      // 6. Asset Intelligence (Asset Health, Warranty Expiry, Lifecycle Tracking, Utilization) -> custom BarChart
                      if (activeAnalyticsCategory === 'asset') {
                        return (
                          <BarChart data={assetIntelligenceData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Bar dataKey="Healthy" name="Healthy Items" fill="#10B981" stackId="asset" />
                            <Bar dataKey="ActiveLoad" name="Avg Utilization %" fill="#2563EB" stackId="asset" />
                          </BarChart>
                        );
                      }
                      // 7. Change Management (Success Rate, Failed Changes, Pending Changes, Risk Analysis) -> custom LineChart
                      if (activeAnalyticsCategory === 'change') {
                        return (
                          <LineChart data={changeManagementData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Line type="monotone" dataKey="successRate" name="Deploy Success Rate %" stroke="#10B981" strokeWidth={2} />
                            <Line type="monotone" dataKey="failed" name="Failed Changes Count" stroke="#EF4444" strokeWidth={1} />
                          </LineChart>
                        );
                      }
                      // 8. Executive Intelligence (Operational Health, Critical Incidents, Department Performance, Service Health) -> custom AreaChart
                      if (activeAnalyticsCategory === 'exec') {
                        return (
                          <AreaChart data={executiveIntelligenceData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <defs>
                              <linearGradient id="anExecLightGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Area type="monotone" dataKey="Score" name="Department Health Score" stroke="#2563EB" fill="url(#anExecLightGrad)" strokeWidth={2} />
                          </AreaChart>
                        );
                      }
                      // 9. AI Operations (AI Classification, AI Routing Accuracy, AI Predictions, AI Automation) -> custom Horizontal BarChart
                      if (activeAnalyticsCategory === 'ai') {
                        return (
                          <BarChart data={aiOperationsData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" stroke="#6B7280" fontSize={9} className="font-mono" />
                            <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Bar dataKey="Accuracy" name="AI Match Accuracy %" fill="#10B981" radius={[0, 2, 2, 0]} />
                            <Bar dataKey="Rate" name="Deflection Rate %" fill="#3B82F6" radius={[0, 2, 2, 0]} />
                          </BarChart>
                        );
                      }
                      // 10. Security Operations (Security Incidents, Compliance Status, Audit Findings, Risk Monitoring) -> custom LineChart
                      if (activeAnalyticsCategory === 'security') {
                        return (
                          <LineChart data={securityOperationsData} margin={{ top: 10, right: 10, left: -40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={8} className="font-mono" />
                            <YAxis stroke="#6B7280" fontSize={9} className="font-mono" />
                            <ChartTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827', fontSize: 10, fontFamily: 'monospace' }} />
                            <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Line type="monotone" dataKey="incidents" name="Security Alerts" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="riskScore" name="Risk Exposure Level" stroke="#F59E0B" strokeWidth={2} />
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

      {/* ── SECTION 6: AI PLATFORM ── */}
      <section id="ai-ops" className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-white rounded">
              Machine Intelligence
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Autonomous AI Operations Platform</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Evaluate real-time diagnostic outputs of Assist360 AI systems. Click triggers below to preview logs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* AI Capabilities Toggles */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-2">
              <div className="space-y-2 font-mono">
                {[
                  { id: 'classify', title: 'AI Incident Classification' },
                  { id: 'route', title: 'AI Routing' },
                  { id: 'priority', title: 'AI Prioritization' },
                  { id: 'suggest', title: 'AI Resolution Suggestions' },
                  { id: 'knowledge', title: 'AI Knowledge Discovery' },
                  { id: 'capacity', title: 'AI Capacity Forecasting' },
                  { id: 'risk', title: 'AI Risk Detection' },
                  { id: 'escalation', title: 'AI Escalation Prediction' },
                  { id: 'insights', title: 'AI Executive Insights' }
                ].map((cap) => (
                  <button
                    key={cap.id}
                    onClick={() => setActiveAiCapability(cap.id)}
                    className={`w-full text-left p-3 font-mono text-[10px] uppercase tracking-wider font-bold rounded border transition ${
                      activeAiCapability === cap.id
                        ? 'bg-[#111117] text-white border-[#111117]'
                        : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#6B7280] hover:text-[#111827]'
                    }`}
                  >
                    {cap.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnostic console */}
            <div className="lg:col-span-8">
              <Card className="bg-white border-[#E5E7EB] h-full flex flex-col justify-between p-6 space-y-6 shadow-sm font-mono text-xs">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
                    <span className="text-xs font-bold text-[#111827] uppercase">
                      {AI_CAPABILITIES_METADATA[activeAiCapability].title}
                    </span>
                    <Badge className="bg-[#FAFAFA] text-[#10B981] border border-[#E5E7EB] text-[9px] uppercase font-bold">
                      {AI_CAPABILITIES_METADATA[activeAiCapability].status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                      <span className="text-[9px] text-[#6B7280] uppercase block">Analysis Latency</span>
                      <span className="text-[#111827] font-bold block mt-1">
                        {AI_CAPABILITIES_METADATA[activeAiCapability].latency}
                      </span>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                      <span className="text-[9px] text-[#6B7280] uppercase block">Model Confidence</span>
                      <span className="text-[#10B981] font-bold block mt-1">
                        {AI_CAPABILITIES_METADATA[activeAiCapability].confidence}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                    <span className="text-[9px] text-[#6B7280] block uppercase mb-2">Diagnostic Output stream</span>
                    <p className="text-[#111827] leading-relaxed select-none">
                      <span className="text-[#2563EB] font-bold">&gt;</span> {AI_CAPABILITIES_METADATA[activeAiCapability].log}
                    </p>
                  </div>
                </div>

              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 7: WORKFLOW AUTOMATION ── */}
      <section id="workflow-automation" className="py-24 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Process Orchestrator
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Workflow Automation Platform</h2>
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
                  onClick={() => setWorkflowStep((prev) => (prev + 1) % 7)}
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
                    if (workflowStep === 2) return '03. Assignment';
                    if (workflowStep === 3) return '04. Approval';
                    if (workflowStep === 4) return '05. Resolution';
                    if (workflowStep === 5) return '06. Feedback';
                    return '07. Analytics';
                  })()}
                </h4>
                <p className="text-[#6B7280] leading-relaxed font-sans">
                  {(() => {
                    if (workflowStep === 0) return 'Incident is reported through the client portal, triggering initial parsing routines.';
                    if (workflowStep === 1) return 'Our automated classification models evaluate risk categorization and assign priority thresholds.';
                    if (workflowStep === 2) return 'The ticket is automatically routed to engineers matching specialization credentials.';
                    if (workflowStep === 3) return 'Logged estimates or resource allocations require operations manager review.';
                    if (workflowStep === 4) return 'Remediation procedures are executed and change orders log successfully.';
                    if (workflowStep === 5) return 'Feedback queries request user satisfaction ratings, updating historical statistics.';
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

      {/* ── SECTION 8: ENTERPRISE SECURITY ── */}
      <section className="py-24 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Information Security
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Built For Enterprise Security</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Maintain regulatory posture standards with robust security protocols, access structures, and encryption schemes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'SSO Integration', desc: 'Secure enterprise logins using federated directory configurations (SAML 2.0).' },
              { title: 'Multi-Factor Auth', desc: 'Mandatory security prompts (MFA) enforce credential verification.' },
              { title: 'Role-Based Access', desc: 'Fine-grained permissions (RBAC) restrict catalog and module visibility.' },
              { title: 'Audit Logs Ledger', desc: 'Log every ledger modification and access unlock request in real-time postgres audit trails.' },
              { title: 'AES-256 Encryption', desc: 'Enforces encryption at rest and in transit (SSL/TLS) for database schemas.' },
              { title: 'SOC2 Compliance', desc: 'System conforms to Service Organization Control 2 reporting standards.' },
              { title: 'Activity Monitoring', desc: 'Log every transaction override, password resetting trigger, and effort logging modification.' },
              { title: 'Data Governance', desc: 'Enforce audit trails, field validation permissions, and automated ticket closure checks.' }
            ].map((sec, idx) => (
              <Card key={idx} className="bg-white border-[#E5E7EB] p-6 space-y-3 hover:border-[#6B7280] hover:shadow-md transition duration-300">
                <span className="text-xs font-bold text-[#111827] font-mono uppercase block">{sec.title}</span>
                <p className="text-xs text-[#6B7280] leading-relaxed">{sec.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 9: CUSTOMER STORIES ── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-white rounded">
              Customer Success
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Enterprise Customer Stories</h2>
            <div className="flex justify-center items-center gap-1 text-[#F59E0B] pt-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#F59E0B" className="stroke-none" />)}
              <span className="text-xs font-mono text-[#111827] ml-2 font-bold">4.9/5 Customer Rating</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { quote: '"Assist360 completely transformed how our teams manage service delivery."', author: 'Emma Richardson', role: 'VP Operations' },
              { quote: '"The analytics and visibility are beyond anything we\'ve used before."', author: 'Daniel Foster', role: 'Chief Information Officer' },
              { quote: '"The platform became the operational backbone of our service organization."', author: 'Sophia Bennett', role: 'Director of Service Delivery' },
              { quote: '"One platform replaced six disconnected systems."', author: 'Michael Carter', role: 'Head of Enterprise Support' }
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

      {/* ── SECTION 10: G2 RECOGNITION ── */}
      <section className="py-14 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center lg:text-left">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#6B7280]">Gartner and G2 Ecosystem recognition</span>
            <h3 className="text-xl font-bold text-[#111827] uppercase font-mono">Market Leadership Badges</h3>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            {[
              'G2 High Performer',
              'Customer Choice Award',
              'Top Rated ITSM Platform',
              'Enterprise Leader',
              '98% Retention',
              '4.9/5 Customer Rating'
            ].map((badge, idx) => (
              <Badge key={idx} variant="outline" className="text-[9px] font-mono font-bold border-[#E5E7EB] bg-[#FAFAFA] text-[#111827] px-3.5 py-1.5 uppercase rounded">
                {badge}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 11: PRODUCT COMPARISON ── */}
      <section id="compare" className="py-24 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] rounded">
              Feature Auditing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Product Comparison</h2>
            <p className="text-xs text-[#6B7280] font-medium leading-relaxed font-sans">
              Compare the product capabilities of Assist360 against traditional ticketing helpdesks.
            </p>
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
                {filteredComparisonRows.map((row, index) => (
                  <TableRow key={index} className="border-b border-[#E5E7EB] hover:bg-[#FAFAFA] transition duration-150">
                    <TableCell className="py-3.5 px-6 font-bold text-[#111827]">{row.feature}</TableCell>
                    <TableCell className="py-3.5 px-6 text-center text-[#6B7280]">{row.traditional}</TableCell>
                    <TableCell className="py-3.5 px-6 text-center font-bold text-[#10B981] bg-[#FAFAFA]/40">{row.assist}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ── SECTION 12: EXECUTIVE ANALYTICS COCKPIT ── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-white rounded">
              Command Deck
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] uppercase font-mono">Executive Intelligence Cockpit</h2>
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

      {/* ── SECTION 13: FINAL CALL TO ACTION ── */}
      <section className="py-24 md:py-28 relative bg-[#FFFFFF] border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <Badge variant="outline" className="text-[9px] font-bold border-[#E5E7EB] font-mono tracking-widest text-[#6B7280] bg-[#FAFAFA] py-1 px-3 uppercase rounded">
            Enterprise Consolidation
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#111827] uppercase font-mono leading-tight">
            Run Every Service Operation From One Intelligent Platform
          </h2>
          <p className="text-sm text-[#6B7280] font-medium leading-relaxed max-w-xl mx-auto font-sans">
            Enterprise-grade service management powered by automation, intelligence, analytics, and operational excellence.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button 
              onClick={() => {
                setDemoType('Standard Platform Demo');
                setDemoModalOpen(true);
              }}
              className="h-11 px-6 bg-[#2563EB] hover:bg-blue-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded"
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
          </div>
        </div>
      </section>

      {/* ── SECTION 14: FOOTER ── */}
      <footer className="bg-white text-[#6B7280] py-16 text-xs border-t border-[#E5E7EB] font-mono">
        <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4">
            <span className="font-extrabold text-[#111827] tracking-wider uppercase text-[10px] block">Platform</span>
            <ul className="space-y-2">
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Incident Management</a></li>
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Request Management</a></li>
              <li><a href="#itsm-suite" className="hover:text-[#111827] transition">Asset Management</a></li>
              <li><a href="#analytics-section" className="hover:text-[#111827] transition">Analytics</a></li>
              <li><a href="#ai-ops" className="hover:text-[#111827] transition">AI Operations</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-[#111827] tracking-wider uppercase text-[10px] block">Company</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#111827] transition">About</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Careers</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Contact</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-[#111827] tracking-wider uppercase text-[10px] block">Resources</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#111827] transition">Documentation</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Security</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Support</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="font-extrabold text-[#111827] tracking-wider uppercase text-[10px] block">Legal</span>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#111827] transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#111827] transition">Terms of Service</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-8 border-t border-[#E5E7EB] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px]">
          <span>Copyright © Support Studio Technologies. All Rights Reserved.</span>
          <span>Powered by Assist360.</span>
        </div>
      </footer>

      {/* ITSM Suite Details Dialog */}
      <Dialog open={selectedSuiteItem !== null} onOpenChange={(open) => !open && setSelectedSuiteItem(null)}>
        <DialogContent className="bg-white border border-[#E5E7EB] rounded max-w-md p-6 text-[#111827] shadow-lg">
          {selectedSuiteItem && ITSM_SUITE_METADATA[selectedSuiteItem] && (
            <>
              <DialogHeader className="space-y-3">
                <div className="w-10 h-10 rounded bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center text-[#2563EB]">
                  {React.createElement(ITSM_SUITE_METADATA[selectedSuiteItem].icon, { size: 20 })}
                </div>
                <DialogTitle className="text-md font-bold uppercase tracking-wider text-[#111827]">
                  {selectedSuiteItem}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6B7280] font-sans">
                  {ITSM_SUITE_METADATA[selectedSuiteItem].description}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 pt-4 border-t border-[#E5E7EB] font-mono text-[10px] space-y-2 text-[#6B7280]">
                <div className="flex justify-between">
                  <span>DEPLOYMENT STATUS:</span>
                  <span className="font-bold text-[#10B981]">ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span>RLS PROTECTION:</span>
                  <span className="font-bold text-[#111827]">ENABLED</span>
                </div>
                <div className="flex justify-between">
                  <span>TELEMETRY FEED:</span>
                  <span className="font-bold text-[#2563EB]">LIVE BINDING</span>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button 
                  onClick={() => setSelectedSuiteItem(null)}
                  className="w-full bg-[#111827] hover:bg-[#6B7280] text-white font-bold uppercase tracking-wider text-[10px] py-2.5 rounded font-mono"
                >
                  Close Catalog View
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
