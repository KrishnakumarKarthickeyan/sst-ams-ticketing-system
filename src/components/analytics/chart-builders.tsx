'use client';

import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell, LabelList, ReferenceLine,
} from 'recharts';
import { ChartTooltip } from './chart-primitives';
import { CHART_COLORS, SEMANTIC } from '../../lib/chart-theme';

/**
 * Declarative Recharts builders. This is the ONLY analytics module that imports
 * `recharts` for the manager command center — every dashboard chart is composed
 * from <BarH> / <BarV> / <Trend> wrapped in a <ChartCard>, so the page/section
 * files stay recharts-free and colors come exclusively from chart-theme.
 */

const GRID = 'hsl(var(--border))';
const CURSOR = 'hsl(var(--muted))';

export interface ChartSeries {
  key: string;
  name?: string;
  /** defaults to CHART_COLORS by index */
  color?: string;
}

const seriesColor = (s: ChartSeries, i: number) => s.color ?? CHART_COLORS[i % CHART_COLORS.length];

// Truncate a category label to ~16 chars so it never wraps onto a second line;
// the full value still shows in the tooltip.
const truncName = (v: unknown): string => {
  const s = String(v ?? '');
  return s.length > 16 ? s.slice(0, 15) + '…' : s;
};

/**
 * Horizontal bar chart. Single series → one bar per row (optionally colored per
 * row via `colorFor`); multiple series → stacked (or grouped with `stack=false`).
 * Fills its parent height, so the caller controls dynamic height + scroll.
 */
export function BarH<T extends Record<string, unknown>>({
  data,
  categoryKey,
  series,
  unit,
  hideAxis = false,
  domainMax,
  valueLabels = false,
  colorFor,
  stack = true,
  legend = false,
  referenceX,
  categoryWidth = 140,
}: {
  data: T[];
  categoryKey: string;
  series: ChartSeries[];
  unit?: string;
  /** hide the numeric axis (for count bars with value labels) */
  hideAxis?: boolean;
  domainMax?: number;
  valueLabels?: boolean;
  /** per-bar color for a single series */
  colorFor?: (row: T) => string;
  /** stack multiple series (default) vs render them grouped */
  stack?: boolean;
  legend?: boolean;
  /** dashed reference marker on the value axis (e.g. 100% capacity) */
  referenceX?: number;
  categoryWidth?: number;
}) {
  const isMulti = series.length > 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: valueLabels ? 40 : 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          hide={hideAxis}
          tick={{ fontSize: 12 }}
          unit={unit}
          allowDecimals={false}
          domain={domainMax !== undefined ? [0, domainMax] : undefined}
        />
        <YAxis type="category" dataKey={categoryKey} tick={{ fontSize: 11 }} width={categoryWidth} interval={0} tickFormatter={truncName} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: CURSOR }} />
        {legend && <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} itemSorter={null} />}
        {referenceX !== undefined && (
          <ReferenceLine x={referenceX} stroke={SEMANTIC.danger} strokeDasharray="4 4"
            label={{ value: `${referenceX}${unit ?? ''}`, fontSize: 10, fill: SEMANTIC.danger, position: 'top' }} />
        )}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name ?? s.key}
            stackId={isMulti && stack ? 'st' : undefined}
            fill={seriesColor(s, i)}
            barSize={16}
            minPointSize={2}
            radius={!isMulti || !stack || i === series.length - 1 ? [0, 4, 4, 0] : undefined}
          >
            {colorFor && !isMulti && data.map((row, ri) => <Cell key={ri} fill={colorFor(row)} />)}
            {valueLabels && !isMulti && (
              <LabelList dataKey={s.key} position="right" fontSize={11} formatter={unit ? (v) => `${v}${unit}` : undefined} />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Vertical bar chart. Single series → one bar per category (optionally colored
 * per bar via `colorFor`); multiple series → grouped. Fills its parent height.
 */
export function BarV<T extends Record<string, unknown>>({
  data,
  categoryKey,
  series,
  unit,
  domainMax,
  valueLabels = false,
  colorFor,
  legend = false,
  angledLabels = false,
}: {
  data: T[];
  categoryKey: string;
  series: ChartSeries[];
  unit?: string;
  domainMax?: number;
  valueLabels?: boolean;
  colorFor?: (row: T) => string;
  legend?: boolean;
  angledLabels?: boolean;
}) {
  const isMulti = series.length > 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey={categoryKey}
          tick={{ fontSize: 11 }}
          interval={0}
          angle={angledLabels ? -20 : 0}
          textAnchor={angledLabels ? 'end' : 'middle'}
          height={angledLabels ? 56 : 30}
          tickFormatter={truncName}
        />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={unit ? 40 : 34} unit={unit} domain={domainMax !== undefined ? [0, domainMax] : undefined} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: CURSOR }} />
        {legend && <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} itemSorter={null} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name ?? s.key} fill={seriesColor(s, i)} radius={[4, 4, 0, 0]} barSize={isMulti ? 14 : 32}>
            {colorFor && !isMulti && data.map((row, ri) => <Cell key={ri} fill={colorFor(row)} />)}
            {valueLabels && (
              <LabelList dataKey={s.key} position="top" fontSize={10} formatter={unit ? (v) => `${v}${unit}` : undefined} />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Multi-line trend chart. Fills its parent height. */
export function Trend<T extends Record<string, unknown>>({
  data,
  categoryKey,
  series,
  unit,
  legend = false,
}: {
  data: T[];
  categoryKey: string;
  series: ChartSeries[];
  unit?: string;
  legend?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={categoryKey} tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={unit ? 36 : 34} unit={unit} />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        {legend && <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} itemSorter={null} />}
        {series.map((s, i) => {
          const color = seriesColor(s, i);
          return <Line key={s.key} type="linear" dataKey={s.key} name={s.name ?? s.key} stroke={color} strokeWidth={2} dot={{ r: 2, fill: color }} />;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
