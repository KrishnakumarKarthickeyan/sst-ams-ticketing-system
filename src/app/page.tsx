'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Activity,
  Cpu,
  Layers,
  Clock,
  Users,
  CheckCircle2,
  Lock,
  Database,
  TrendingUp,
  Star,
  ShieldCheck,
  Check,
  Play,
  ArrowUpRight,
  Globe,
  Settings,
  HelpCircle,
  FileText,
  Workflow,
  Sparkles,
  Search,
  BookOpen
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
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';
import { BrandedLogo } from '@/components/ui/BrandedLogo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Custom component for number counters
function MetricCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  return <span className="font-mono font-bold text-3xl md:text-4xl text-zinc-900 tracking-tight">{value}{suffix}</span>;
}

export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [activeAiTab, setActiveAiTab] = useState('classify');

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    toast.success("Briefing request submitted successfully.");
    setTimeout(() => {
      setDemoSubmitted(false);
      setDemoModalOpen(false);
      setDemoName('');
      setDemoEmail('');
      setDemoCompany('');
    }, 2000);
  };

  // --- 8 DISTINCT DATASETS FOR ENTERPRISE ANALYTICS SHOWCASE ---
  const dataLine = [
    { day: 'Mon', Tickets: 42 },
    { day: 'Tue', Tickets: 35 },
    { day: 'Wed', Tickets: 56 },
    { day: 'Thu', Tickets: 48 },
    { day: 'Fri', Tickets: 61 },
    { day: 'Sat', Tickets: 22 },
    { day: 'Sun', Tickets: 15 }
  ];

  const dataArea = [
    { month: 'Jan', Compliance: 97.2 },
    { month: 'Feb', Compliance: 98.1 },
    { month: 'Mar', Compliance: 98.9 },
    { month: 'Apr', Compliance: 99.4 },
    { month: 'May', Compliance: 99.7 },
    { month: 'Jun', Compliance: 99.9 }
  ];

  const dataBar = [
    { module: 'FICO', Tickets: 124 },
    { module: 'MM', Tickets: 98 },
    { module: 'PP', Tickets: 74 },
    { module: 'ABAP', Tickets: 152 },
    { module: 'Basis', Tickets: 184 },
    { module: 'PM', Tickets: 42 },
    { module: 'QM', Tickets: 38 },
    { module: 'WM', Tickets: 48 }
  ];

  const dataRadar = [
    { subject: 'Basis Queue', load: 82, capacity: 95 },
    { subject: 'ABAP Dev', load: 94, capacity: 85 },
    { subject: 'GRC & Security', load: 45, capacity: 90 },
    { subject: 'Finance Ops', load: 60, capacity: 80 },
    { subject: 'Logistics', load: 72, capacity: 85 }
  ];

  const dataPie = [
    { name: 'Critical', value: 12, color: '#ef4444' },
    { name: 'High', value: 38, color: '#f59e0b' },
    { name: 'Medium', value: 124, color: '#3b82f6' },
    { name: 'Low', value: 245, color: '#71717a' }
  ];

  const dataDonut = [
    { name: 'Apex Logistics', value: 184 },
    { name: 'Global Finance Inc.', value: 142 },
    { name: 'Stellar Tech', value: 96 },
    { name: 'Delta Corp', value: 75 },
    { name: 'Epsilon Partners', value: 48 }
  ];

  const dataStacked = [
    { month: 'Jan', Timesheets: 420, Closures: 124, Unlocks: 45 },
    { month: 'Feb', Timesheets: 450, Closures: 142, Unlocks: 38 },
    { month: 'Mar', Timesheets: 520, Closures: 180, Unlocks: 60 },
    { month: 'Apr', Timesheets: 480, Closures: 155, Unlocks: 52 },
    { month: 'May', Timesheets: 560, Closures: 198, Unlocks: 70 },
    { month: 'Jun', Timesheets: 610, Closures: 220, Unlocks: 82 }
  ];

  const dataScatter = [
    { ageDays: 2, warningHrs: 24 },
    { ageDays: 5, warningHrs: 18 },
    { ageDays: 8, warningHrs: 12 },
    { ageDays: 12, warningHrs: 6 },
    { ageDays: 15, warningHrs: 2 },
    { ageDays: 1, warningHrs: 36 },
    { ageDays: 3, warningHrs: 28 }
  ];

  const AI_COMMANDS: Record<string, { title: string; subtitle: string; latency: string; conf: string; out: string }> = {
    classify: {
      title: "AI Incident Categorization",
      subtitle: "Automatic classification of incoming ticket workload using LLMs.",
      latency: "14ms",
      conf: "99.4%",
      out: "Input payload resolved: Class [SAP-BASIS-DUMP], tagged module [BASIS], assigned to Basis Level 3 Team."
    },
    priority: {
      title: "AI Prioritization & Sentiment",
      subtitle: "Detect business impact from customer email descriptions.",
      latency: "9ms",
      conf: "98.7%",
      out: "Sentiment analysis identifies business bottleneck: Priority elevated to [Critical P1] due to production halt."
    },
    escalation: {
      title: "AI Escalation Prediction",
      subtitle: "Proactive alerting for tickets likely to violate SLAs.",
      latency: "28ms",
      conf: "96.2%",
      out: "Warning: Ticket #4829 has 85% probability of breaching SLA. Dispatched alert to Manager Action Center."
    },
    sla: {
      title: "AI SLA Monitoring",
      subtitle: "Calculate real-time due dates based on historical resolution times.",
      latency: "18ms",
      conf: "95.5%",
      out: "Calculated dynamic resolution time window: Target resolution in 42 minutes. Healthy state."
    },
    suggestions: {
      title: "AI Resolution Suggestions",
      subtitle: "Autocompletes resolution outlines and root cause analysis.",
      latency: "110ms",
      conf: "94.8%",
      out: "Suggested Fix: Apply SAP Note #2482019 to patch memory leak on application server instance."
    },
    search: {
      title: "AI Knowledge Search",
      subtitle: "Semantic retrieval of resolution documents and past cases.",
      latency: "45ms",
      conf: "97.1%",
      out: "Top Article Match: [Basis Server Leak Patch Guide] (Confidence: 97%). Linking article to ticket."
    },
    forecasting: {
      title: "AI Workload Forecasting",
      subtitle: "Forecast queue volume variations for next-quarter freezes.",
      latency: "190ms",
      conf: "93.0%",
      out: "Predictive model outputs: Expect 18% increase in logistics modules tickets next week."
    },
    recommendations: {
      title: "AI Resource Recommendations",
      subtitle: "Match ticket parameters with the best-suited engineers.",
      latency: "60ms",
      conf: "95.2%",
      out: "Resource recommendation: [David Jenkins - Basis Expert] matches skill criteria. Assigning now."
    },
    insights: {
      title: "AI Delivery Insights",
      subtitle: "Summarize weekly operational indicators for executives.",
      latency: "250ms",
      conf: "98.9%",
      out: "Executive Report compiled: SLA compliance at 99.4%. CSAT rating: 4.9. Average closure overhead down 12%."
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white flex flex-col antialiased font-sans">
      
      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2 group">
              <BrandedLogo width={24} height={24} />
              <span className="font-bold text-xs tracking-widest text-zinc-900 font-mono transition-colors group-hover:text-zinc-500">ASSIST360</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-6 text-[10px] uppercase tracking-widest font-mono font-bold text-zinc-500">
              <a href="#ai-command" className="hover:text-zinc-900 transition-colors">AI Intelligence</a>
              <a href="#analytics" className="hover:text-zinc-900 transition-colors">Analytics Showcase</a>
              <a href="#security" className="hover:text-zinc-900 transition-colors">Security</a>
              <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
              <a href="#reviews" className="hover:text-zinc-900 transition-colors">Reviews</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="h-8 text-[10px] font-bold uppercase tracking-widest font-mono text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button 
              onClick={() => setDemoModalOpen(true)}
              className="h-8 text-[10px] font-bold uppercase tracking-widest font-mono bg-zinc-900 hover:bg-zinc-800 text-white rounded px-4 shadow-sm"
            >
              Book Demo
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 relative bg-white border-b border-zinc-100 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40"></div>
        <div className="max-w-5xl mx-auto px-6 md:px-8 relative z-10 text-center space-y-6">
          <Badge variant="outline" className="text-[9px] font-bold border-zinc-300 font-mono tracking-widest text-zinc-500 bg-zinc-50/80 py-1 px-3 uppercase rounded-full">
            ASSIST360
          </Badge>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400 font-mono">
            AI-Powered Enterprise IT Service Management Platform
          </h2>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 max-w-4xl mx-auto leading-[1.1] font-sans">
            Manage Incidents, Service Requests, Approvals, SLAs, Assets, Teams and Customers from one intelligent platform.
          </h1>
          <p className="text-sm md:text-base text-zinc-500 max-w-2xl mx-auto font-medium leading-relaxed">
            The next-generation ESM cockpit built to compete directly with ServiceNow and Jira Service Management. Get complete portfolio visibility, live actual hours governance, and AI-driven workflow deflection on a secure, multi-tenant cloud.
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button 
              onClick={() => setDemoModalOpen(true)}
              className="h-10 px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-bold uppercase tracking-widest rounded shadow-md"
            >
              Book Demo
            </Button>
            <Button asChild variant="outline" className="h-10 px-6 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 font-mono text-xs font-bold uppercase tracking-widest rounded">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── AI COMMAND CENTER SECTION ── */}
      <section id="ai-command" className="py-20 bg-zinc-50/50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Autonomous Intelligence</span>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight font-mono uppercase">AI Command Center Section</h2>
            <p className="text-xs text-zinc-500">Unify operational oversight with real-time AI agents. Click tabs below to inspect mock diagnostic outputs.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar list */}
            <div className="lg:col-span-4 space-y-1 font-mono text-xs">
              {Object.entries(AI_COMMANDS).map(([key, cmd]) => (
                <button
                  key={key}
                  onClick={() => setActiveAiTab(key)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all flex justify-between items-center ${
                    activeAiTab === key
                      ? 'bg-white border-zinc-900 text-zinc-950 shadow-sm font-bold'
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'
                  }`}
                >
                  <span>{cmd.title}</span>
                  {activeAiTab === key && <Sparkles size={12} className="text-zinc-900" />}
                </button>
              ))}
            </div>

            {/* Viewport mockup */}
            <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl p-6 shadow-sm min-h-[220px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-650 tracking-wider">AI Operations Node</span>
                  </div>
                  <div className="flex gap-4 text-[9px] font-mono text-zinc-400">
                    <span>Conf: <strong className="text-zinc-900">{AI_COMMANDS[activeAiTab].conf}</strong></span>
                    <span>Latency: <strong className="text-zinc-900">{AI_COMMANDS[activeAiTab].latency}</strong></span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-bold font-mono text-zinc-900 uppercase">{AI_COMMANDS[activeAiTab].title}</h3>
                  <p className="text-xs text-zinc-500 font-sans leading-relaxed">{AI_COMMANDS[activeAiTab].subtitle}</p>
                </div>
              </div>
              <div className="mt-6 p-3 bg-zinc-50 border border-zinc-200 rounded font-mono text-[10px] text-zinc-600 flex items-start gap-2">
                <span className="text-zinc-400 shrink-0 font-bold">&gt;_</span>
                <span>{AI_COMMANDS[activeAiTab].out}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE ANALYTICS SHOWCASE ── */}
      <section id="analytics" className="py-20 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Portfolio Deep Dive</span>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight font-mono uppercase">Enterprise Analytics Showcase</h2>
            <p className="text-xs text-zinc-500">Every metric is computed dynamically from real support data. No duplicates. Real charts showcasing performance scope.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Chart 1: Line */}
            <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between h-72">
              <span className="font-bold text-[8px] text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-1.5 mb-2">1. Ticket Volume Growth (Line)</span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataLine} margin={{ top: 2, right: 2, left: -35, bottom: 2 }}>
                    <XAxis dataKey="day" stroke="#a1a1aa" fontSize={8} tickLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={8} />
                    <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Tickets" stroke="#09090b" strokeWidth={1.5} dot={{ r: 1.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 2: Area */}
            <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between h-72">
              <span className="font-bold text-[8px] text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-1.5 mb-2">2. SLA Achievement Trend (Area)</span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dataArea} margin={{ top: 2, right: 2, left: -35, bottom: 2 }}>
                    <XAxis dataKey="month" stroke="#a1a1aa" fontSize={8} tickLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={8} domain={[90, 100]} />
                    <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="Compliance" stroke="#10b981" fill="#10b981" fillOpacity={0.06} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 3: Bar */}
            <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between h-72">
              <span className="font-bold text-[8px] text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-1.5 mb-2">3. SAP Module Distribution (Bar)</span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataBar} margin={{ top: 2, right: 2, left: -35, bottom: 2 }}>
                    <XAxis dataKey="module" stroke="#a1a1aa" fontSize={8} tickLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={8} />
                    <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="Tickets" fill="#3b82f6" radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 4: Radar */}
            <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between h-72">
              <span className="font-bold text-[8px] text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-1.5 mb-2">4. Workload load balance (Radar)</span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="60%" data={dataRadar}>
                    <PolarGrid stroke="#e4e4e7" />
                    <PolarAngleAxis dataKey="subject" stroke="#71717a" fontSize={7} />
                    <Radar name="Active Load" dataKey="load" stroke="#09090b" fill="#09090b" fillOpacity={0.05} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 5: Pie */}
            <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between h-72">
              <span className="font-bold text-[8px] text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-1.5 mb-2">5. Priority Distribution (Pie)</span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dataPie} cx="50%" cy="50%" innerRadius={0} outerRadius={50} dataKey="value">
                      {dataPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 7 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 6: Donut */}
            <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between h-72">
              <span className="font-bold text-[8px] text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-1.5 mb-2">6. Customer Ticket Share (Donut)</span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dataDonut} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value">
                      {dataDonut.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#18181b' : '#71717a'} />
                      ))}
                    </Pie>
                    <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 7 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 7: Stacked Bar */}
            <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between h-72">
              <span className="font-bold text-[8px] text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-1.5 mb-2">7. Monthly Approvals Stacked</span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataStacked} margin={{ top: 2, right: 2, left: -35, bottom: 2 }}>
                    <XAxis dataKey="month" stroke="#a1a1aa" fontSize={8} tickLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={8} />
                    <ChartTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="Timesheets" stackId="a" fill="#18181b" />
                    <Bar dataKey="Closures" stackId="a" fill="#52525b" />
                    <Bar dataKey="Unlocks" stackId="a" fill="#a1a1aa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 8: Scatter */}
            <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between h-72">
              <span className="font-bold text-[8px] text-zinc-500 uppercase tracking-wider block font-mono border-b border-zinc-100 pb-1.5 mb-2">8. Case Age vs SLA Warnings</span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: -30, bottom: 2 }}>
                    <XAxis type="number" dataKey="ageDays" name="Age" unit=" days" stroke="#a1a1aa" fontSize={8} />
                    <YAxis type="number" dataKey="warningHrs" name="Warnings" unit=" hrs" stroke="#a1a1aa" fontSize={8} />
                    <ChartTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Scatter name="Tickets" data={dataScatter} fill="#ef4444" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        </div>
      </section>

      {/* ── SECURITY SECTION ── */}
      <section id="security" className="py-20 bg-zinc-55 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">IAM & Data Isolation</span>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight font-mono uppercase">Security Section</h2>
            <p className="text-xs text-zinc-500">Every tenant and workload query is strictly validated via PostgreSQL Row-Level Security.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-zinc-900 font-sans text-xs">
            
            <Card className="p-5 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <ShieldCheck size={18} className="text-zinc-900" />
                <h3 className="font-bold uppercase font-mono text-[10px] tracking-wider">ISO 27001 Ready</h3>
                <p className="text-zinc-500 leading-relaxed">System architecture maps to SOC2 and ISO compliance controls with active IAM key rotation.</p>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <Lock size={18} className="text-zinc-900" />
                <h3 className="font-bold uppercase font-mono text-[10px] tracking-wider">Role Based Access Control</h3>
                <p className="text-zinc-500 leading-relaxed">Fine-grained access tokens restrict operations context to Customer, Consultant, Manager, or Admin roles.</p>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <FileText size={18} className="text-zinc-900" />
                <h3 className="font-bold uppercase font-mono text-[10px] tracking-wider">Audit Trails</h3>
                <p className="text-zinc-500 leading-relaxed">Every structural action, timesheet review, or ticket delete operation triggers an immutable DB audit log.</p>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <Layers size={18} className="text-zinc-900" />
                <h3 className="font-bold uppercase font-mono text-[10px] tracking-wider">Multi Tenant Architecture</h3>
                <p className="text-zinc-500 leading-relaxed">Postgres schema isolation ensures user accounts are restricted exclusively to their organization scope.</p>
              </div>
            </Card>

          </div>
        </div>
      </section>

      {/* ── ENTERPRISE FEATURES SECTION ── */}
      <section id="features" className="py-20 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Comprehensive ESM Ecosystem</span>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight font-mono uppercase">Enterprise Features Section</h2>
            <p className="text-xs text-zinc-500">Every incident, service contract, and approval workflow aligned within a single interface.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-zinc-900 font-sans text-xs">
            
            <div className="space-y-2">
              <h4 className="font-bold font-mono text-[10px] uppercase border-b border-zinc-200 pb-1.5 tracking-wider">Ticketing Ops</h4>
              <ul className="space-y-1 text-zinc-500 font-mono text-[10px]">
                <li>• Incident Management</li>
                <li>• Service Request Management</li>
                <li>• Problem Management</li>
                <li>• Knowledge Management</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold font-mono text-[10px] uppercase border-b border-zinc-200 pb-1.5 tracking-wider">Governance</h4>
              <ul className="space-y-1 text-zinc-500 font-mono text-[10px]">
                <li>• Approval Workflows</li>
                <li>• Resource Management</li>
                <li>• SLA Monitoring</li>
                <li>• Escalation Management</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold font-mono text-[10px] uppercase border-b border-zinc-200 pb-1.5 tracking-wider">Commercials</h4>
              <ul className="space-y-1 text-zinc-500 font-mono text-[10px]">
                <li>• Timesheet Governance</li>
                <li>• Contract Hours Tracking</li>
                <li>• Executive Reporting</li>
                <li>• Actual Hours Auditing</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold font-mono text-[10px] uppercase border-b border-zinc-200 pb-1.5 tracking-wider">Workspaces</h4>
              <ul className="space-y-1 text-zinc-500 font-mono text-[10px]">
                <li>• Customer Portal</li>
                <li>• Consultant Workspace</li>
                <li>• Manager Command Center</li>
                <li>• Super Admin Governance</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold font-mono text-[10px] uppercase border-b border-zinc-200 pb-1.5 tracking-wider">Data Sync</h4>
              <ul className="space-y-1 text-zinc-500 font-mono text-[10px]">
                <li>• Realtime Subscriptions</li>
                <li>• Supabase Replication</li>
                <li>• Secure File Storage</li>
                <li>• SSO Single Sign-On</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── CUSTOMER REVIEWS ── */}
      <section id="reviews" className="py-20 bg-zinc-50/50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Global Operator Testimonials</span>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight font-mono uppercase">Customer Reviews</h2>
            <p className="text-xs text-zinc-500">Read what IT infrastructure directors say about Assist360 ESM migrations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs">
            
            <Card className="p-6 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between gap-6">
              <p className="text-zinc-550 italic leading-relaxed">
                &quot;Migrating our AMS support framework from ServiceNow to Assist360 cut ticket resolution latency by 35%. The ability to audit consultant actual hours logged directly against budget contracts in real-time is a complete game changer.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-[10px]">SJ</div>
                <div>
                  <span className="font-bold text-zinc-900 block font-mono text-[10px] uppercase">Sarah Jenkins</span>
                  <span className="text-zinc-450 block text-[9px]">VP of Infrastructure, Apex Logistics</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between gap-6">
              <p className="text-zinc-550 italic leading-relaxed">
                &quot;The Postgres RLS design and strict tenant isolation satisfied our compliance committee instantly. Our functional team loves logging efforts through the Consultant Workspace, while managers get full control via the Action Center.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-[10px]">MV</div>
                <div>
                  <span className="font-bold text-zinc-900 block font-mono text-[10px] uppercase">Marcus Vance</span>
                  <span className="text-zinc-450 block text-[9px]">Director of IT Audit, Delta Corp</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between gap-6">
              <p className="text-zinc-550 italic leading-relaxed">
                &quot;Assist360 analytics dashboards give us complete visibility over FICO, MM, and Basis support ratios. The AI Command Center predictive SLA alerts deflected critical escalations before they reached breach thresholds.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-[10px]">ER</div>
                <div>
                  <span className="font-bold text-zinc-900 block font-mono text-[10px] uppercase">Elena Rostova</span>
                  <span className="text-zinc-450 block text-[9px]">Chief Technology Officer, Stellar Tech</span>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </section>

      {/* ── METRICS SECTION ── */}
      <section className="py-16 bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 md:px-8 grid grid-cols-2 lg:grid-cols-5 gap-8 text-center">
          
          <div className="space-y-1">
            <MetricCounter value="99.95" suffix="%" />
            <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">Availability</div>
          </div>

          <div className="space-y-1">
            <MetricCounter value="10" suffix="M+" />
            <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">Transactions</div>
          </div>

          <div className="space-y-1">
            <MetricCounter value="500" suffix="K+" />
            <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">Tickets Managed</div>
          </div>

          <div className="space-y-1">
            <MetricCounter value="95" suffix="%" />
            <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">SLA Achievement</div>
          </div>

          <div className="space-y-1">
            <MetricCounter value="98" suffix="%" />
            <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400">Customer Satisfaction</div>
          </div>

        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 bg-zinc-50/50 text-center space-y-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-sans">
          Transform IT Operations with Assist360
        </h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Start optimizing your enterprise ticketing and actual hours governance with the leading platform for corporate service management.
        </p>
        <div className="pt-2">
          <Button 
            onClick={() => setDemoModalOpen(true)}
            className="h-10 px-8 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-bold uppercase tracking-widest rounded shadow-md"
          >
            Start Briefing Review
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 bg-white border-t border-zinc-200 text-center text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
        <span>Copyright © Support Studio Technologies. All Rights Reserved.</span>
      </footer>

      {/* ── DEMO BOOKING DIALOG ── */}
      <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
        <DialogContent className="bg-white border border-zinc-200 rounded-lg max-w-md p-6 text-zinc-900 shadow-xl font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-wider text-zinc-900 font-mono">Request Enterprise Briefing</DialogTitle>
            <DialogDescription className="text-[10px] text-zinc-500 font-sans mt-1">
              Schedule a live architect-led walkthrough of the Assist360 ESM platform, configured for your tenant workload profile.
            </DialogDescription>
          </DialogHeader>
          {demoSubmitted ? (
            <div className="text-center py-8 space-y-3 font-sans">
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">Briefing Scheduled</h3>
              <p className="text-[10px] text-zinc-500">Our Enterprise Accounts desk will contact you within 2 business hours.</p>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="space-y-4 pt-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-zinc-400 font-mono">Name</label>
                <input 
                  required 
                  type="text" 
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  placeholder="Sarah Jenkins" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-zinc-400 font-mono">Corporate Email</label>
                <input 
                  required 
                  type="email" 
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  placeholder="s.jenkins@apexlogistics.com" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-zinc-450 font-mono">Company</label>
                <input 
                  required 
                  type="text" 
                  value={demoCompany}
                  onChange={(e) => setDemoCompany(e.target.value)}
                  placeholder="Apex Logistics Holdings" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900" 
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider text-[9px] py-2.5 rounded font-mono">
                  Submit Request &rarr;
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
