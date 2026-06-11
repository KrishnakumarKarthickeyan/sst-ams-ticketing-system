'use client';

import React, { useState } from 'react';
import { Clock, Check, AlertCircle, Sparkles } from 'lucide-react';

export default function AdminSlaPage() {
  const [policies, setPolicies] = useState([
    { priority: 'Critical', responseTime: 1, resolutionTime: 4, warnThreshold: 75, escalationRole: 'Manager' },
    { priority: 'High', responseTime: 2, resolutionTime: 8, warnThreshold: 80, escalationRole: 'Manager' },
    { priority: 'Medium', responseTime: 8, resolutionTime: 48, warnThreshold: 80, escalationRole: 'Manager' },
    { priority: 'Low', responseTime: 24, resolutionTime: 120, warnThreshold: 90, escalationRole: 'Manager' }
  ]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [tempResTime, setTempResTime] = useState(0);
  const [success, setSuccess] = useState(false);

  const handleEdit = (priority: string, currentRes: number) => {
    setEditingRow(priority);
    setTempResTime(currentRes);
  };

  const handleSave = (priority: string) => {
    setPolicies(policies.map(p => {
      if (p.priority === priority) {
        return { ...p, resolutionTime: tempResTime };
      }
      return p;
    }));
    setEditingRow(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">SLA Priority Matrix</h1>
        <p className="text-zinc-500 mt-1">Configure threshold targets, automated alert warnings, and escalation rules for high-priority incidents.</p>
      </div>

      {success && (
        <div className="bg-zinc-50 border border-zinc-900 rounded p-3 text-zinc-900 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Check size={14} />
          SLA Targets updated successfully
        </div>
      )}

      {/* SLA Policy Table */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
              <th className="p-4">Priority Severity</th>
              <th className="p-4">Response Deadline</th>
              <th className="p-4">Resolution Deadline</th>
              <th className="p-4">Warning Threshold</th>
              <th className="p-4">Escalation Target</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {policies.map((p) => {
              const isEditing = editingRow === p.priority;
              return (
                <tr key={p.priority} className="hover:bg-zinc-50/50">
                  <td className="p-4 font-bold text-zinc-900">{p.priority}</td>
                  <td className="p-4 text-zinc-650 font-semibold">{p.responseTime} Hour{p.responseTime > 1 && 's'}</td>
                  <td className="p-4 text-zinc-650 font-semibold">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={tempResTime}
                          onChange={(e) => setTempResTime(Number(e.target.value))}
                          className="w-16 bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-xs text-zinc-950 font-mono"
                        />
                        <span>Hours</span>
                      </div>
                    ) : (
                      <span>{p.resolutionTime} Hours</span>
                    )}
                  </td>
                  <td className="p-4 text-zinc-400 font-mono">{p.warnThreshold}%</td>
                  <td className="p-4 text-zinc-600 font-semibold">{p.escalationRole}</td>
                  <td className="p-4 text-right">
                    {isEditing ? (
                      <button
                        onClick={() => handleSave(p.priority)}
                        className="px-2 py-1 bg-zinc-950 text-white rounded font-bold hover:bg-zinc-800 text-[10px] uppercase tracking-wider"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(p.priority, p.resolutionTime)}
                        className="px-2 py-1 border border-zinc-200 hover:border-zinc-900 rounded font-semibold text-[10px] uppercase tracking-wider transition"
                      >
                        Adjust Target
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info panel */}
      <div className="p-5 border border-zinc-200 rounded-lg bg-zinc-50 flex items-start gap-3">
        <AlertCircle size={16} className="text-zinc-500 shrink-0 mt-0.5" />
        <div className="space-y-1.5 leading-relaxed">
          <h4 className="font-bold text-zinc-900">Automatic Breach Warnings</h4>
          <p className="text-zinc-500">
            Assist360 SLA monitoring triggers warnings inside manager dashboards at warning threshold ratios. If a P1 Critical ticket remains open past 3 hours (75% threshold), the system issues active warnings.
          </p>
        </div>
      </div>
    </div>
  );
}
