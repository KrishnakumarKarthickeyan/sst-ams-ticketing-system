'use client';

import React, { startTransition, useEffect } from 'react';
import { AlertCircle, RotateCcw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { logError } from '@/lib/observability/log-error';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminTicketDetailErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    logError(error, { source: 'route-error', digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-100 bg-surface shadow-xl shadow-red-50/50 rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500"></div>
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 animate-bounce" />
          </div>
          <CardTitle className="text-xl font-extrabold text-ink tracking-tight">
            Database Connection Error
          </CardTitle>
          <CardDescription className="text-sm text-ink-secondary mt-1 max-w-xs mx-auto">
            A temporary network timeout or database scale-down occurred.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="bg-surface-muted border-y border-line py-4 px-6 text-center space-y-2">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Error Details</p>
          <p className="text-sm text-critical bg-red-50/50 border border-red-100/60 p-3 rounded-lg overflow-x-auto text-left whitespace-pre-wrap leading-relaxed max-h-32">
            {error.message || 'An unexpected error occurred while fetching data from Supabase.'}
          </p>
          {error.digest && (
            <p className="text-[11px] text-ink-muted">Digest: {error.digest}</p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-6 pb-8 px-6">
          <Button
            onClick={() => {
              startTransition(() => {
                reset();
              });
            }}
            className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-card transition active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </Button>
          
          <div className="flex gap-2 w-full mt-1">
            <Button
              asChild
              variant="outline"
              className="flex-1 h-10 text-xs font-medium border-line text-zinc-650 rounded-xl hover:bg-surface-muted hover:text-ink"
            >
              <Link href="/admin/dashboard">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Dashboard
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              className="flex-1 h-10 text-xs font-medium border-line text-zinc-650 rounded-xl hover:bg-surface-muted hover:text-ink"
            >
              <Link href="/admin/dashboard">
                <Home className="w-3.5 h-3.5 mr-1.5" /> Home
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
