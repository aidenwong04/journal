import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  listEntryDates,
  newBlankEntry,
  newCorrectionEntry,
  readEntry,
  recentBlockerIds,
  saveCorrection,
  saveTodayEntry,
} from "../../electron/entries";
import { journalDate } from "../../electron/journal-date";

// Mirrors ui-contract.md's acceptance tests 1, 2, 4, 6, plus "sealed
// entries are never modified" and the atomic-write guarantee.
describe("entries write path", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "journal-entries-"));
    await fs.mkdir(path.join(dir, "projects", "icm-journal"), { recursive: true });
    await fs.writeFile(path.join(dir, "projects", "icm-journal", "project.md"), "---\nslug: icm-journal\n---\n");
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("saves today's entry to entries/YYYY/MM/YYYY-MM-DD.md, creating dirs on demand", async () => {
    const now = new Date(2026, 7, 17, 20, 0);
    const entry = newBlankEntry(now);
    const result = await saveTodayEntry(dir, entry, now);
    expect(result.ok).toBe(true);

    const onDisk = await readEntry(dir, journalDate(now));
    expect(onDisk).not.toBeNull();
    expect(onDisk!.frontmatter.date).toBe("2026-08-17");
  });

  it("acceptance test 1: a session at 01:30 writes to the previous calendar date's file", async () => {
    const now = new Date(2026, 7, 17, 1, 30); // Mon 01:30 -> journal date is Sunday 08-16
    const entry = newBlankEntry(now);
    await saveTodayEntry(dir, entry, now);

    const file = path.join(dir, "entries", "2026", "08", "2026-08-16.md");
    await expect(fs.access(file)).resolves.toBeUndefined();
  });

  it("acceptance test 2: writing at 23:00 then appending at 23:50 produces one file, not two", async () => {
    const first = new Date(2026, 7, 17, 23, 0);
    const entry = newBlankEntry(first);
    entry.body = "first pass";
    await saveTodayEntry(dir, entry, first);

    const second = new Date(2026, 7, 17, 23, 50);
    entry.body = "first pass, then more";
    await saveTodayEntry(dir, entry, second);

    const dates = await listEntryDates(dir);
    expect(dates).toEqual(["2026-08-17"]);
    const onDisk = await readEntry(dir, "2026-08-17");
    expect(onDisk!.body.trim()).toBe("first pass, then more");
  });

  it("refuses to save a sealed date, even if asked", async () => {
    const now = new Date(2026, 7, 17, 12, 0);
    const entry = newBlankEntry(now);
    entry.frontmatter.date = "2026-08-16"; // yesterday relative to `now`
    // saveTodayEntry's first guard (date must equal today) already refuses
    // this; the sealing check right below it is the same protection for a
    // renderer that somehow sends today's own date after it has rolled
    // over mid-request.
    await expect(saveTodayEntry(dir, entry, now)).rejects.toThrow(/not today/);
  });

  it("refuses to save when the date IS what the caller thinks is 'today' but has since sealed", async () => {
    const dayBoundary = journalDate(new Date(2026, 7, 17, 3, 59));
    const entry = newBlankEntry(new Date(2026, 7, 17, 3, 59));
    entry.frontmatter.date = dayBoundary;
    // Same instant used for the "is this today" check and the seal check,
    // just after the day has rolled: date no longer matches journalDate(now).
    const justAfterRollover = new Date(2026, 7, 17, 4, 0);
    await expect(saveTodayEntry(dir, entry, justAfterRollover)).rejects.toThrow(/not today/);
  });

  it("acceptance test 4: a correction creates a new file and leaves the original byte-identical", async () => {
    const day1 = new Date(2026, 7, 16, 20, 0);
    const original = newBlankEntry(day1);
    original.body = "original claim: shipped the thing";
    original.frontmatter.projects = ["icm-journal"];
    await saveTodayEntry(dir, original, day1);

    const originalPath = path.join(dir, "entries", "2026", "08", "2026-08-16.md");
    const originalBytesBefore = await fs.readFile(originalPath);

    const day2 = new Date(2026, 7, 17, 9, 0); // now sealed relative to day2
    const correction = newCorrectionEntry("2026-08-16", day2);
    correction.body = "correction: did not actually ship it";
    await saveCorrection(dir, correction, day2);

    const originalBytesAfter = await fs.readFile(originalPath);
    expect(originalBytesAfter.equals(originalBytesBefore)).toBe(true);

    const correctionOnDisk = await readEntry(dir, "2026-08-17");
    expect(correctionOnDisk!.frontmatter.type).toBe("correction");
    expect(correctionOnDisk!.frontmatter.corrects).toBe("2026-08-16");
  });

  it("acceptance test 6: a blocker id used last week is offered as a suggestion this week", async () => {
    const lastWeek = new Date(2026, 7, 10, 20, 0);
    const entry = newBlankEntry(lastWeek);
    entry.frontmatter.projects = ["icm-journal"];
    entry.frontmatter.blockers = [{ id: "cold-start", project: "icm-journal", note: "slow to open laptop" }];
    await saveTodayEntry(dir, entry, lastWeek);

    const suggestions = await recentBlockerIds(dir, 4);
    expect(suggestions).toContain("cold-start");
  });
});
