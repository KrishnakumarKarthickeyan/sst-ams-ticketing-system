import type { Metadata } from "next";
import "./globals.css";
import { TicketProvider } from "../context/TicketContext";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SAP Service Desk & Support Portal",
  description: "Enterprise SAP SaaS ticketing, incident management, and Transport Request tracking system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-[#09090b]">
        <AuthProvider>
          <TicketProvider>
            {children}
            <Toaster position="top-right" richColors />
          </TicketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
