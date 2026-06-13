import type { Metadata } from "next";
import "./globals.css";
import { TicketProvider } from "../context/TicketContext";
import { AuthProvider } from "../context/AuthContext";
import { QueryProvider } from "../lib/queries/query-provider";
import { Toaster } from "sonner";

import { BRAND_CONFIG } from "../config/branding";

export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

export const metadata: Metadata = {
  title: BRAND_CONFIG.meta.title,
  description: BRAND_CONFIG.meta.description,
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-ink">
        <QueryProvider>
          <AuthProvider>
            <TicketProvider>
              {children}
              <Toaster position="top-right" richColors />
            </TicketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
