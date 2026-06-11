import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminTicketDetailLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Breadcrumbs Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 bg-zinc-200" />
        <span className="text-zinc-200">/</span>
        <Skeleton className="h-4 w-32 bg-zinc-200" />
      </div>

      {/* Header Card Skeleton */}
      <Card className="border-zinc-200/80 bg-white overflow-hidden shadow-sm">
        <div className="h-1 bg-zinc-200"></div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div className="space-y-3 flex-1 w-full">
              {/* Badges */}
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 bg-zinc-200 rounded-full" />
                <Skeleton className="h-5 w-24 bg-zinc-200 rounded-full" />
                <Skeleton className="h-5 w-16 bg-zinc-200 rounded-full" />
              </div>
              {/* Title */}
              <Skeleton className="h-8 w-3/4 bg-zinc-200 rounded" />
              {/* Metadata */}
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32 bg-zinc-150" />
                <Skeleton className="h-4 w-24 bg-zinc-150" />
                <Skeleton className="h-4 w-28 bg-zinc-150" />
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-9 w-20 bg-zinc-200 rounded-lg" />
              <Skeleton className="h-9 w-32 bg-zinc-200 rounded-lg" />
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="pt-4 border-t border-zinc-100 flex justify-between items-center relative">
            <div className="absolute top-8 left-[30px] right-[30px] h-[2px] bg-zinc-100 -z-10"></div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-10 h-10 bg-zinc-200 rounded-full" />
                <Skeleton className="h-3 w-14 bg-zinc-150 rounded" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Grid: Main Info vs Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description */}
          <Card className="bg-white border-zinc-200/80 shadow-sm">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-36 bg-zinc-250 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-zinc-200 rounded" />
                <Skeleton className="h-4 w-full bg-zinc-200 rounded" />
                <Skeleton className="h-4 w-5/6 bg-zinc-200 rounded" />
              </div>
            </CardContent>
          </Card>

          {/* Timeline / Comments section */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 bg-zinc-200 rounded" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="bg-white border-zinc-200/80 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <Skeleton className="w-8 h-8 bg-zinc-200 rounded-full" />
                      <div>
                        <Skeleton className="h-4.5 w-24 bg-zinc-200 rounded" />
                        <Skeleton className="h-3 w-16 bg-zinc-150 rounded mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-20 bg-zinc-150 rounded" />
                  </div>
                  <div className="space-y-2 pl-10">
                    <Skeleton className="h-4 w-full bg-zinc-200" />
                    <Skeleton className="h-4 w-4/5 bg-zinc-200" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-white border-zinc-200/80 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-24 bg-zinc-200 rounded" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <Skeleton className="h-3.5 w-20 bg-zinc-150" />
                    <Skeleton className="h-4 w-28 bg-zinc-200" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
