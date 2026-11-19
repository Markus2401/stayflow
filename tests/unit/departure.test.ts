import { describe, expect, it } from 'vitest';
import { departure } from '../../src/departure';

describe('departure label', () => {
  const today = '2026-11-18';
  it('names today and tomorrow', () => {
    expect(departure('2026-11-18', today)).toEqual({ text: 'Today', tone: 'soon' });
    expect(departure('2026-11-19', today)).toEqual({ text: 'Tomorrow', tone: 'normal' });
  });
  it('flags a departure date that has passed', () => {
    expect(departure('2026-11-17', today)).toEqual({ text: 'Overdue', tone: 'late' });
  });
  it('shows a plain date otherwise, across month and year boundaries', () => {
    expect(departure('2026-11-30', today)?.text).toBe('30 Nov');
    expect(departure('2027-01-02', today)?.text).toBe('2 Jan 2027');
  });
  it('shows nothing when no departure was given', () => {
    expect(departure(null, today)).toBeNull();
  });
});
