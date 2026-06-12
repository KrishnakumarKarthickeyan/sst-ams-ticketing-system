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
    <div className="space-y-6 text-xs text-ink">
      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">SLA Priority Matrix</h1>
        <p className="type-meta mt-1 text-ink-secondary">Configure threshold targets, automated alert warnings, and escalation rules for high-priority incidents.</p>
      </div>

      {success && (
        <div className="bg-surface-muted border border-zinc-900 rounded p-3 text-ink font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Check size={14} />
          SLA Targets updated successfully
        </div>
      )}

      {/* SLA Policy Table */}
      <div className="bg-surface border border-line rounded overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-muted border-b border-line uppercase font-bold text-[11px] tracking-wider text-ink-secondary">
              <th className="p-4">Priority Severity</th>
              <th className="p-4">Response Deadline</th>
              <th className="p-4">Resolution Deadline</th>
              <th className="p-4">Warning Threshold</th>
              <th className="p-4">Escalation Target</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {policies.map((p) => {
              const isEditing = editingRow === p.priority;
              return (
                <tr key={p.priority} className="hover:bg-surface-muted/60">
                  <td className="p-4 font-bold text-ink">{p.priority}</td>
                  <td className="p-4 text-ink-secondary font-semibold">{p.responseTime} Hour{p.responseTime > 1 && 's'}</td>
                  <td className="p-4 text-ink-secondary font-semibold">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={tempResTime}
                          onChange={(e) => setTempResTime(Number(e.target.value))}
                          className="w-16 bg-surface border border-line-strong rounded px-1.5 py-0.5 text-xs text-ink"
                        />
                        <span>Hours</span>
                      </div>
                    ) : (
                      <span>{p.resolutionTime} Hours</span>
                    )}
                  </td>
                  <td className="p-4 text-ink-muted">{p.warnThreshold}%</td>
                  <td className="p-4 text-ink-secondary font-semibold">{p.escalationRole}</td>
                  <td className="p-4 text-right">
                    {isEditing ? (
                      <button
                        onClick={() => handleSave(p.priority)}
                        className="px-2 py-1 bg-ink text-white rounded font-bold hover:bg-zinc-800 text-[11px] uppercase tracking-wider"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(p.priority, p.resolutionTime)}
                        className="px-2 py-1 border border-line hover:border-zinc-900 rounded font-semibold text-[11px] uppercase tracking-wider transition"
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
      <div className="p-5 border border-line rounded-lg bg-surface-muted flex items-start gap-3">
        <AlertCircle size={16} className="text-ink-secondary shrink-0 mt-0.5" />
        <div className="space-y-1.5 leading-relaxed">
          <h4 className="font-bold text-ink">Automatic Breach Warnings</h4>
          <p className="text-ink-secondary">
            Assist360 SLA monitoring triggers warnings inside manager dashboards at warning threshold ratios. If a P1 Critical ticket remains open past 3 hours (75% threshold), the system issues active warnings.
          </p>
        </div>
      </div>
    </div>
  );
}
