/**
 * Centralized Branding Configuration
 * Source of truth for brand metadata, titles, taglines, and logo paths.
 */

export const BRAND_CONFIG = {
  name: 'SST SAP Support Desk',
  shortName: 'SAP Desk',
  tagline: 'Enterprise-grade SAP AMS SLA Management & Support Portal',
  
  logo: {
    // Primary brand logo (PNG generated via sips)
    src: '/logo.png',
    alt: 'SST SAP Support Desk Logo',
    // Fallback/icon version
    iconSrc: '/favicon-32x32.png',
  },
  
  theme: {
    color: '#09090b', // zinc-950
    backgroundColor: '#ffffff',
  },
  
  meta: {
    title: 'SAP Service Desk & Support Portal',
    description: 'Enterprise SAP SaaS ticketing, incident management, and Transport Request tracking system.',
  }
};
