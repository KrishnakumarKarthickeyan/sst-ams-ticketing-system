/**
 * Centralized Branding Configuration
 * Source of truth for brand metadata, titles, taglines, and logo paths.
 */

export const BRAND_CONFIG = {
  name: 'Assist360',
  shortName: 'Assist360',
  tagline: 'Enterprise IT Service Management Platform',
  
  logo: {
    // Primary brand logo (PNG generated via sips)
    src: '/logo.png',
    alt: 'Assist360 Logo',
    // Fallback/icon version
    iconSrc: '/favicon-32x32.png',
  },
  
  theme: {
    color: '#09090b', // zinc-950
    backgroundColor: '#ffffff',
  },
  
  meta: {
    title: 'Assist360',
    description: 'AI-Powered Enterprise IT Service Management Platform',
  }
};
