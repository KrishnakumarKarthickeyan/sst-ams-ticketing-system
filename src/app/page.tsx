import { Inter_Tight } from 'next/font/google';
import { LandingNav } from '../components/landing/nav';
import { Hero } from '../components/landing/hero';
import { AnalyticsBento } from '../components/landing/analytics-bento';
import { ProductShowcase } from '../components/landing/product-showcase';
import { AiSection } from '../components/landing/ai-section';
import { WorkflowBeam } from '../components/landing/workflow-beam';
import { EnterpriseAnalytics } from '../components/landing/enterprise-analytics';
import { FeatureGrid } from '../components/landing/feature-grid';
import { Testimonials } from '../components/landing/testimonials';
import { SecurityRoi } from '../components/landing/security-roi';
import { WaitlistContact } from '../components/landing/waitlist-contact';
import { LandingFooter } from '../components/landing/footer';

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-inter-tight',
});

export default function LandingPage() {
  return (
    <main className={`${interTight.variable} min-h-screen overflow-x-clip bg-white text-zinc-950 antialiased`}>
      <LandingNav />
      <Hero />
      <AnalyticsBento />
      <ProductShowcase />
      <AiSection />
      <WorkflowBeam />
      <EnterpriseAnalytics />
      <FeatureGrid />
      <Testimonials />
      <SecurityRoi />
      <WaitlistContact />
      <LandingFooter />
    </main>
  );
}
