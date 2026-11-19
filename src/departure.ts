const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const long = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const DAY = 86_400_000;

export type Departure = { text: string; tone: 'normal' | 'soon' | 'late' };

/** Local calendar date as yyyy-mm-dd (en-CA formats this way), the same shape the API returns. */
export const localToday = () => new Date().toLocaleDateString('en-CA');

/** Both arguments are yyyy-mm-dd calendar dates; no time zone arithmetic is needed. */
export function departure(date: string | null, today: string): Departure | null {
  if (!date) return null;
  const days = (Date.parse(date) - Date.parse(today)) / DAY;
  if (days < 0) return { text: 'Overdue', tone: 'late' };
  if (days === 0) return { text: 'Today', tone: 'soon' };
  if (days === 1) return { text: 'Tomorrow', tone: 'normal' };
  const when = new Date(date);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return { text: (sameYear ? short : long).format(when), tone: 'normal' };
}
