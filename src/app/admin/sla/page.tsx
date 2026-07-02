'use client';

import React, { useState } from 'react';
import { Check, AlertCircle, GaugeCircle } from 'lucide-react';
import { AdminPageHeader, AdminCommandRibbon, AdminCard, AdminButton, SeverityPill } from '../../../components/admin/ui/admin-kit';

export default function AdminSlaPage() {
  const [policies, setPolicies] = useState([
    { priority: 'Critical', responseTime: 1, resolutionTime: 4, warnThreshold: 75, escalationRole: 'Manager' },
    { priority: 'High', responseTime: 2, resolutionTime: 8, warnThreshold: 80, escalationRole: 'Manager' },
    { priority: 'Medium', responseTime: 8, resolutionTime: 48, warnThreshold: 80, escalationRole: 'Manager' },
    { priority: 'Low', responseTime: 24, resolutionTime: 120, warnThreshold: 90, escalationRole: 'Manager' },
  ]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [tempResTime, setTempResTime] = useState(0);
  const [success, setSuccess] = useState(false);

  const handleEdit = (priority: string, currentRes: number) => { setEditingRow(priority); setTempResTime(currentRes); };
  const handleSave = (priority: string) => {
    setPolicies(policies.map(p => (p.priority === priority ? { ...p, resolutionTime: tempResTime } : p)));
    setEditingRow(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={<><GaugeCircle size={13} strokeWidth={2} /> SLA policy</>}
        title="SLA Priority Matrix"
        subtitle="Configure resolution targets, warning thresholds, and escalation rules per priority."
      />

      <AdminCommandRibbon
        status="ok"
        verdict="Resolution Targets Configured"
        items={policies.map(p => ({
          label: `${p.priority} target`,
          value: `${p.resolutionTime}h`,
          tone: (p.priority === 'Critical' ? 'critical' : p.priority === 'High' ? 'warning' : 'neutral') as 'neutral' | 'success' | 'warning' | 'critical',
        }))}
      />

      {success && (
        <div className="ak-banner" style={{ borderColor: 'var(--ak-success)', background: 'rgba(15,122,79,.06)' }}>
          <div className="flex items-center gap-3">
            <span className="ak-banner-icon" style={{ background: 'rgba(15,122,79,.12)', color: 'var(--ak-success)' }}><Check size={16} /></span>
            <div><span className="ak-banner-title" style={{ color: 'var(--ak-success)' }}>SLA target updated</span></div>
          </div>
        </div>
      )}

      <AdminCard title="Priority Targets" desc="Resolution deadlines and escalation per severity." pad={false}>
        <div className="ak-table-wrap">
          <table className="ak-table">
            <thead>
              <tr>
                <th className="ak-th">Severity</th>
                <th className="ak-th">Response</th>
                <th className="ak-th">Resolution</th>
                <th className="ak-th is-right">Warn @</th>
                <th className="ak-th">Escalates to</th>
                <th className="ak-th is-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => {
                const isEditing = editingRow === p.priority;
                return (
                  <tr key={p.priority}>
                    <td><SeverityPill level={p.priority as 'Critical' | 'High' | 'Medium' | 'Low'} /></td>
                    <td style={{ color: 'var(--ak-ink2)', fontWeight: 560 }}>{p.responseTime} Hour{p.responseTime > 1 && 's'}</td>
                    <td style={{ color: 'var(--ak-ink2)', fontWeight: 560 }}>
                      {isEditing ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <input type="number" value={tempResTime} onChange={(e) => setTempResTime(Number(e.target.value))}
                            className="ak-select" style={{ width: 72, minWidth: 0 }} />
                          <span>Hours</span>
                        </span>
                      ) : <span>{p.resolutionTime} Hours</span>}
                    </td>
                    <td className="ak-num" style={{ textAlign: 'right', color: 'var(--ak-ink3)' }}>{p.warnThreshold}%</td>
                    <td style={{ color: 'var(--ak-ink2)', fontWeight: 560 }}>{p.escalationRole}</td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing
                        ? <AdminButton variant="primary" onClick={() => handleSave(p.priority)}>Save</AdminButton>
                        : <AdminButton variant="ghost" onClick={() => handleEdit(p.priority, p.resolutionTime)}>Adjust</AdminButton>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <div className="ak-alert" style={{ alignItems: 'flex-start' }}>
        <span style={{ display: 'flex', gap: 10 }}>
          <AlertCircle size={16} style={{ color: 'var(--ak-ink3)', flex: 'none', marginTop: 2 }} />
          <span>
            <span className="ak-alert-title">Automatic breach warnings</span>
            <span className="ak-alert-sub">SLA monitoring triggers manager-dashboard warnings at the threshold ratio (e.g. a P1 open past 75% of target).</span>
          </span>
        </span>
      </div>
    </div>
  );
}
