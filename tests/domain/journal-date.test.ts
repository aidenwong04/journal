import { describe, expect, it } from "vitest";
import { isSealed, journalDate, weekOf } from "../../electron/journal-date";

// Boundary cases straight from CONTEXT.md's own worked example and
// ui-contract.md's acceptance tests 1-3.
describe("journalDate", () => {
  it("23:40 Saturday belongs to Saturday", () => {
    expect(journalDate(new Date(2026, 7, 15, 23, 40))).toBe("2026-08-15");
  });

  it("01:30 Sunday still belongs to Saturday", () => {
    expect(journalDate(new Date(2026, 7, 16, 1, 30))).toBe("2026-08-15");
  });

  it("04:00 Sunday rolls over to Sunday", () => {
    expect(journalDate(new Date(2026, 7, 16, 4, 0))).toBe("2026-08-16");
  });

  it("03:59 is still the previous day, one minute before rollover", () => {
    expect(journalDate(new Date(2026, 7, 16, 3, 59))).toBe("2026-08-15");
  });
});

describe("isSealed", () => {
  it("today's date is not sealed", () => {
    const now = new Date(2026, 7, 17, 12, 0);
    expect(isSealed(journalDate(now), now)).toBe(false);
  });

  it("yesterday's date is sealed", () => {
    const now = new Date(2026, 7, 17, 12, 0);
    expect(isSealed("2026-08-16", now)).toBe(true);
  });

  it("a date crosses from unsealed to sealed exactly at the 04:00 boundary, no stored state", () => {
    const before = new Date(2026, 7, 16, 3, 59);
    const after = new Date(2026, 7, 16, 4, 0);
    const date = journalDate(before);
    expect(isSealed(date, before)).toBe(false);
    expect(isSealed(date, after)).toBe(true);
  });
});

describe("weekOf", () => {
  it("labels a week by the ISO week of its closing Saturday, per CONTEXT.md's own example", () => {
    // 2026-W32 is Sun 2026-08-02 through Sat 2026-08-08.
    const w = weekOf("2026-08-05");
    expect(w.start).toBe("2026-08-02");
    expect(w.end).toBe("2026-08-08");
    expect(w.label).toBe("2026-W32");
  });

  it("a Sunday belongs to the week ending the following Saturday, not the ISO week its own Monday-start would give it", () => {
    const w = weekOf("2026-08-02"); // the Sunday itself
    expect(w.label).toBe("2026-W32");
    expect(w.start).toBe("2026-08-02");
    expect(w.end).toBe("2026-08-08");
  });
});
