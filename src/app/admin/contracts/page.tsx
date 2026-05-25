'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { FileCode, Activity, CheckCircle, ShieldCheck } from 'lucide-react';

export default function AdminContractsPage() {
  const { contracts } = useTickets();

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">AMS Support Agreements</h1>
        <p className="text-zinc-500 mt-1">Audit customer allocation pool, track monthly burned hours, and verify agreement compliance dates.</p>
      </div>

      {/* Contract List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contracts.map((c) => {
          const burnPct = (c.usedHours / c.totalHours) * 100;
          return (
            <div key={c.id} className="bg-white border border-zinc-200 rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-zinc-950 transition">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-zinc-400 font-mono uppercase tracking-wider">{c.contractType}</span>
                  <span className="px-2 py-0.5 bg-zinc-900 text-white rounded text-[9px] font-mono font-bold">ACTIVE</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mt-2">{c.organizationName}</h3>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">Validity: {c.startDate} to {c.endDate}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-zinc-500">Burned: {c.usedHours} hrs</span>
                  <span className="text-zinc-950">Limit: {c.totalHours} hrs</span>
                </div>
                <div className="w-full h-3 bg-zinc-100 border border-zinc-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-zinc-950"
                    style={{ width: `${burnPct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[9px] text-zinc-400 font-bold uppercase mt-1">
                  <span>{burnPct.toFixed(1)}% burned</span>
                  <span>Budget/Mo: {c.monthlyBudgetHours} hrs</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-150 flex items-center justify-between text-[9px] font-bold text-zinc-400 font-mono uppercase">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-zinc-500" />
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
