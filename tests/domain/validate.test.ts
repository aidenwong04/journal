import { describe, expect, it } from "vitest";
import { blankFrontmatter, type Entry } from "../../electron/frontmatter";
import { validateEntry, type ValidateContext } from "../../electron/validate";

function ctx(overrides: Partial<ValidateContext> = {}): ValidateContext {
  return {
    stem: "2026-08-17",
    knownProjectSlugs: new Set(["icm-journal"]),
    transcriptExists: false,
    correctsTargetExists: () => true,
    ...overrides,
  };
}

function entry(overrides: Partial<Entry["frontmatter"]> = {}, body = ""): Entry {
  return { frontmatter: { ...blankFrontmatter("2026-08-17"), ...overrides }, body };
}

describe("validateEntry", () => {
  it("a clean minimal entry has no violations", () => {
    expect(validateEntry(entry(), ctx())).toEqual([]);
  });

  it("filename mismatch is caught", () => {
    const v = validateEntry(entry({ date: "2026-08-16" }), ctx({ stem: "2026-08-17" }));
    expect(v.some((x) => x.field === "date")).toBe(true);
  });

  it("correction without corrects: fails", () => {
    const v = validateEntry(entry({ type: "correction", corrects: null }), ctx());
    expect(v.some((x) => x.field === "corrects")).toBe(true);
  });

  it("correction pointing at a nonexistent entry fails", () => {
    const v = validateEntry(
      entry({ type: "correction", corrects: "2026-01-01" }),
      ctx({ correctsTargetExists: () => false })
    );
    expect(v.some((x) => /has no entry file/.test(x.message))).toBe(true);
  });

  it("voice source without a transcript fails, per voice-cleanup.md's 'not optional'", () => {
    const v = validateEntry(entry({ source: "voice" }), ctx({ transcriptExists: false }));
    expect(v.some((x) => x.field === "source")).toBe(true);
  });

  it("voice source with a transcript present passes", () => {
    const v = validateEntry(entry({ source: "voice" }), ctx({ transcriptExists: true }));
    expect(v.some((x) => x.field === "source")).toBe(false);
  });

  it.each([0, 6, 2.5, -1])("energy %s outside 1-5 whole numbers fails", (bad) => {
    const v = validateEntry(entry({ energy: bad }), ctx());
    expect(v.some((x) => x.field === "energy")).toBe(true);
  });

  it("a project slug with no real project.md fails, per the 'silently drops the day' warning", () => {
    const v = validateEntry(entry({ projects: ["ghost-project"] }), ctx());
    expect(v.some((x) => /projects\[\] names 'ghost-project'/.test(x.message))).toBe(true);
  });

  it("a minutes key not present in projects[] fails, the classic typo case", () => {
    const v = validateEntry(entry({ projects: ["icm-journal"], minutes: { "icm-jounral": 30 } }), ctx());
    expect(v.some((x) => x.field === "minutes")).toBe(true);
  });

  it("a non-kebab-case blocker id fails", () => {
    const v = validateEntry(
      entry({ blockers: [{ id: "Cold_Start", project: null, note: "n" }] }),
      ctx()
    );
    expect(v.some((x) => /not kebab-case/.test(x.message))).toBe(true);
  });

  it("an empty blocker id fails, since the id is the recurrence key", () => {
    const v = validateEntry(entry({ blockers: [{ id: "", project: null, note: "n" }] }), ctx());
    expect(v.some((x) => /recurrence key/.test(x.message))).toBe(true);
  });

  it("a shipped item with no declared project fails", () => {
    const v = validateEntry(entry({ shipped: [{ project: "", what: "did a thing" }] }), ctx());
    expect(v.some((x) => /has no project/.test(x.message))).toBe(true);
  });

  it("a shipped item with no what fails", () => {
    const v = validateEntry(entry({ projects: ["icm-journal"], shipped: [{ project: "icm-journal", what: "" }] }), ctx());
    expect(v.some((x) => /has no what/.test(x.message))).toBe(true);
  });
});
