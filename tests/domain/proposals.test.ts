import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractProposedChange } from "../../electron/proposal-parse";
import { acceptProposal, listInbox, rejectProposal } from "../../electron/projects";

const WORKED_EXAMPLE_PROPOSAL = path.resolve(
  __dirname,
  "../../template/_system/worked-example/proposal-2026-08-09-cadence-or-scope.md"
);

describe("extractProposedChange", () => {
  it("returns an old/new pair when two fenced blocks are present", () => {
    const raw = [
      "## Proposed change to project.md",
      "",
      "```",
      "cadence_days_per_week: 4",
      "```",
      "becomes",
      "```",
      "cadence_days_per_week: 3",
      "```",
      "",
      "## The case against",
      "none",
    ].join("\n");
    const change = extractProposedChange(raw);
    expect(change).toEqual({ old: "cadence_days_per_week: 4", next: "cadence_days_per_week: 3" });
  });

  it("returns null for the real worked-example proposal, which quotes only an addition, not an old/new pair", async () => {
    const raw = await fs.readFile(WORKED_EXAMPLE_PROPOSAL, "utf8");
    // This is the expected, spec-compliant outcome: ui-contract.md says a
    // proposal that doesn't parse cleanly falls back to a manual edit
    // pane rather than the UI guessing what to replace.
    expect(extractProposedChange(raw)).toBeNull();
  });
});

describe("acceptProposal / rejectProposal", () => {
  async function makeWorkspace() {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "journal-inbox-"));
    await fs.mkdir(path.join(dir, "projects", "icm-journal", "_inbox"), { recursive: true });
    await fs.writeFile(
      path.join(dir, "projects", "icm-journal", "project.md"),
      "---\nslug: icm-journal\n---\n\n## Committed cadence\ncadence_days_per_week: 4\n"
    );
    return dir;
  }

  it("accept replaces the exact quoted text and deletes the proposal file", async () => {
    const dir = await makeWorkspace();
    const proposalFile = "2026-08-09-lower-cadence.md";
    await fs.writeFile(
      path.join(dir, "projects", "icm-journal", "_inbox", proposalFile),
      "---\nproposed: 2026-08-09\nproject: icm-journal\nkind: cadence-change\n---\n\n# Proposal\n"
    );

    await acceptProposal(dir, "icm-journal", proposalFile, {
      old: "cadence_days_per_week: 4",
      next: "cadence_days_per_week: 3",
    });

    const updated = await fs.readFile(path.join(dir, "projects", "icm-journal", "project.md"), "utf8");
    expect(updated).toContain("cadence_days_per_week: 3");
    expect(updated).not.toContain("cadence_days_per_week: 4");

    const remaining = await listInbox(dir, "icm-journal");
    expect(remaining).toHaveLength(0);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("accept throws, and changes nothing, when the quoted old text is not found verbatim", async () => {
    const dir = await makeWorkspace();
    const proposalFile = "2026-08-09-bad-match.md";
    await fs.writeFile(path.join(dir, "projects", "icm-journal", "_inbox", proposalFile), "---\n---\n# Proposal\n");

    const before = await fs.readFile(path.join(dir, "projects", "icm-journal", "project.md"), "utf8");
    await expect(
      acceptProposal(dir, "icm-journal", proposalFile, { old: "text that does not exist", next: "replacement" })
    ).rejects.toThrow(/not found verbatim/);

    const after = await fs.readFile(path.join(dir, "projects", "icm-journal", "project.md"), "utf8");
    expect(after).toBe(before);
    // the proposal file must still be there: a failed accept is not a silent reject
    const remaining = await listInbox(dir, "icm-journal");
    expect(remaining.map((p) => p.file)).toContain(proposalFile);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("reject deletes only the proposal file and changes nothing else on disk", async () => {
    const dir = await makeWorkspace();
    const proposalFile = "2026-08-09-reject-me.md";
    await fs.writeFile(path.join(dir, "projects", "icm-journal", "_inbox", proposalFile), "---\n---\n# Proposal\n");

    const before = await fs.readFile(path.join(dir, "projects", "icm-journal", "project.md"), "utf8");
    await rejectProposal(dir, "icm-journal", proposalFile);
    const after = await fs.readFile(path.join(dir, "projects", "icm-journal", "project.md"), "utf8");

    expect(after).toBe(before);
    expect(await listInbox(dir, "icm-journal")).toHaveLength(0);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
