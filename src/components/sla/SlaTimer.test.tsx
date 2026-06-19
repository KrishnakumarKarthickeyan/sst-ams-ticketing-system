// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SlaTimer } from './SlaTimer';
import type { Ticket } from '../../types/ticket';

const targets = { critical: 8, high: 16, medium: 32, low: 64 };
const at = (iso: string) => vi.setSystemTime(new Date(iso));

function ticket(over: Partial<Ticket>): Ticket {
  return { priority: 'Critical', status: 'In Progress', leadAssignedAt: null, ...over } as Ticket;
}

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('SlaTimer', () => {
  it('shows Not Started when no lead is assigned', () => {
    vi.useFakeTimers(); at('2026-06-18T14:00:00+05:30'); // Thu, in window
    render(<SlaTimer ticket={ticket({ leadAssignedAt: null })} clientTargets={targets} size="full" />);
    expect(screen.getByText(/not started/i)).toBeInTheDocument();
  });

  it('shows a running countdown ("left") when assigned and inside business hours', () => {
    vi.useFakeTimers(); at('2026-06-18T14:00:00+05:30'); // Thu 14:00 IST, clock open
    render(<SlaTimer ticket={ticket({ leadAssignedAt: '2026-06-18T10:30:00+05:30' })} clientTargets={targets} size="full" />);
    expect(screen.getByText(/left/i)).toBeInTheDocument();
    expect(screen.queryByText(/paused/i)).toBeNull();
  });

  it('shows Paused on the weekend (clock not ticking)', () => {
    vi.useFakeTimers(); at('2026-06-20T12:00:00+05:30'); // Saturday
    render(<SlaTimer ticket={ticket({ leadAssignedAt: '2026-06-18T18:00:00+05:30' })} clientTargets={targets} size="full" />);
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
  });

  it('shows Breached once the business deadline has passed', () => {
    vi.useFakeTimers(); at('2026-06-22T12:00:00+05:30'); // Mon — well past an 8h budget from Thu 18:00
    render(<SlaTimer ticket={ticket({ leadAssignedAt: '2026-06-18T18:00:00+05:30' })} clientTargets={targets} size="full" />);
    expect(screen.getByText(/breached/i)).toBeInTheDocument();
  });
});
