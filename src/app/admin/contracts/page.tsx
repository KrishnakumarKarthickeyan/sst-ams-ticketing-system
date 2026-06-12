'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { FileCode, Activity, CheckCircle, ShieldCheck } from 'lucide-react';

export default function AdminContractsPage() {
  const { contracts } = useTickets();

  return (
    <div className="space-y-6 text-xs text-ink">
      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">AMS Support Agreements</h1>
        <p className="type-meta mt-1 text-ink-secondary">Audit customer allocation pool, track monthly burned hours, and verify agreement compliance dates.</p>
      </div>

      {/* Contract List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contracts.map((c) => {
          const burnPct = (c.usedHours / c.totalHours) * 100;
          return (
            <div key={c.id} className="bg-surface border border-line rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-line-strong transition">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">{c.contractType}</span>
                  <span className="px-2 py-0.5 bg-ink text-white rounded text-[11px] font-bold">ACTIVE</span>
                </div>
                <h3 className="text-sm font-bold text-ink mt-2">{c.organizationName}</h3>
                <p className="text-[11px] text-ink-muted mt-1">Validity: {c.startDate} to {c.endDate}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-ink-secondary">Burned: {c.usedHours} hrs</span>
                  <span className="text-ink">Limit: {c.totalHours} hrs</span>
                </div>
                <div className="w-full h-3 bg-surface-subtle border border-line rounded overflow-hidden">
                  <div
                    className="h-full bg-ink"
                    style={{ width: `${burnPct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[11px] text-ink-muted font-bold uppercase mt-1">
                  <span>{burnPct.toFixed(1)}% burned</span>
                  <span>Budget/Mo: {c.monthlyBudgetHours} hrs</span>
                </div>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between text-[11px] font-bold text-ink-muted uppercase">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-ink-secondary" />
                  AMS Compliance Active
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
