// THE 04:00 function. Written once, imported everywhere that needs to know
// "what day is it" for journal purposes.
//
// CONTEXT.md, "A day": a journal day runs 04:00 to 04:00 local time, not
// midnight to midnight. The journal date is the calendar date of
// (now minus 4 hours). Writing at 01:30 on Sunday belongs to Saturday,
// because that is the day actually being lived.

const DAY_BOUNDARY_HOUR = 4;

/** YYYY-MM-DD, always. This is the only date shape entries and this module use. */
export type IsoDate = string;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date's local calendar fields as YYYY-MM-DD. Never touches UTC. */
function formatLocalDate(d: Date): IsoDate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * The journal date for a given instant: the calendar date of (now - 4h),
 * in local time. This is the one function every "what file does this
 * write to" and "is this sealed" decision is built on.
 */
export function journalDate(now: Date = new Date()): IsoDate {
  const shifted = new Date(now.getTime() - DAY_BOUNDARY_HOUR * 60 * 60 * 1000);
  return formatLocalDate(shifted);
}

/**
 * A date is sealed if it is not the current journal date. No flag, no
 * lock, no stored state: this is computed fresh every time, per
 * ui-contract.md's "Sealing requires no flag, no lock, no state."
 */
export function isSealed(date: IsoDate, now: Date = new Date()): boolean {
  return date !== journalDate(now);
}

/** The YYYY/MM path segments an entry for this journal date lives under. */
export function entryPathParts(date: IsoDate): { year: string; month: string } {
  const [year, month] = date.split("-");
  return { year, month };
}

/**
 * ISO 8601 week number (1-53) of a date, per the standard: weeks start
 * Monday, week 1 is the week containing the year's first Thursday.
 * Used only to LABEL a journal week; it does not define the week's span.
 */
function isoWeekNumber(d: Date): { isoYear: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Shift to the Thursday of this ISO week.
  const dayNum = date.getUTCDay() || 7; // Mon=1 .. Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const isoYearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - isoYearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear: date.getUTCFullYear(), week };
}

/**
 * A journal week runs Sunday through Saturday (CONTEXT.md, "A week"),
 * labelled by the ISO week number of the Saturday that CLOSES it. This is
 * deliberately not "the ISO week containing this date": a Sunday belongs
 * to the week ending the following Saturday, six days later, not the week
 * its own ISO Monday-start would put it in.
 *
 * Returns the label (e.g. "2026-W32") and the Sunday/Saturday bounds.
 */
export function weekOf(date: IsoDate): { label: string; start: IsoDate; end: IsoDate } {
  const [y, m, d] = date.split("-").map(Number);
  const local = new Date(y, m - 1, d);
  const dow = local.getDay(); // 0 = Sunday .. 6 = Saturday

  const sunday = new Date(local);
  sunday.setDate(local.getDate() - dow);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const { isoYear, week } = isoWeekNumber(saturday);
  return {
    label: `${isoYear}-W${pad2(week)}`,
    start: formatLocalDate(sunday),
    end: formatLocalDate(saturday),
  };
}

/** Whether `date` matches the current journal date, i.e. is today's editable file. */
export function isToday(date: IsoDate, now: Date = new Date()): boolean {
  return date === journalDate(now);
}
