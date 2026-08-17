import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { blankFrontmatter, parseEntry, serializeEntry, type Entry } from "../../electron/frontmatter";

const REAL_SCRIPT = path.resolve(__dirname, "../../template/_system/scripts/check-entries.sh");

// check-entries.sh resolves ROOT relative to its OWN path
// ($(dirname script)/../..), not the caller's cwd, so a round-trip test
// against an arbitrary tmp workspace has to put a copy of the script at
// the same relative location inside that workspace.
async function installScript(workspaceDir: string): Promise<string> {
  const dest = path.join(workspaceDir, "_system", "scripts", "check-entries.sh");
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(REAL_SCRIPT, dest);
  await fs.chmod(dest, 0o755);
  return dest;
}

/**
 * The hard requirement on serializeEntry: whatever it writes must parse
 * cleanly under the awk normaliser in check-entries.sh, which is
 * explicitly not a general YAML parser. This test writes real fixture
 * workspaces and runs the real bash script against them, rather than
 * trusting the `yaml` library's output on faith.
 */
describe("serializeEntry / check-entries.sh round trip", () => {
  it("a fully populated entry passes the real validator", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "journal-fm-"));
    await fs.mkdir(path.join(dir, "projects", "icm-journal"), { recursive: true });
    await fs.writeFile(path.join(dir, "projects", "icm-journal", "project.md"), "---\nslug: icm-journal\n---\n");
    await fs.mkdir(path.join(dir, "entries", "2026", "08"), { recursive: true });

    const entry: Entry = {
      frontmatter: {
        ...blankFrontmatter("2026-08-17"),
        projects: ["icm-journal"],
        minutes: { "icm-journal": 45 },
        energy: 4,
        blockers: [{ id: "cold-start", project: "icm-journal", note: "took a while to open the laptop" }],
        shipped: [{ project: "icm-journal", what: "wrote the design spec, committed" }],
        mood_note: "a bit flat, but showed up",
      },
      body: "Wrote today's entry. It went fine, nothing dramatic.",
    };

    const filePath = path.join(dir, "entries", "2026", "08", "2026-08-17.md");
    await fs.writeFile(filePath, serializeEntry(entry));

    const script = await installScript(dir);
    const output = execFileSync("bash", [script, filePath], { cwd: dir, encoding: "utf8" });
    expect(output).toMatch(/1 file\(s\) clean/);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("a minimal blank entry (no projects, no blockers) also passes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "journal-fm-"));
    await fs.mkdir(path.join(dir, "entries", "2026", "08"), { recursive: true });

    const entry: Entry = { frontmatter: blankFrontmatter("2026-08-17"), body: "" };
    const filePath = path.join(dir, "entries", "2026", "08", "2026-08-17.md");
    await fs.writeFile(filePath, serializeEntry(entry));

    const script = await installScript(dir);
    const output = execFileSync("bash", [script, filePath], { cwd: dir, encoding: "utf8" });
    expect(output).toMatch(/1 file\(s\) clean/);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("a correction round-trips date, corrects, and body unchanged", () => {
    const raw = serializeEntry({
      frontmatter: { ...blankFrontmatter("2026-08-17"), type: "correction", corrects: "2026-08-10" },
      body: "Minutes on Tuesday were wrong. Actual figure was 20, not 90.",
    });
    const parsed = parseEntry(raw);
    expect(parsed.frontmatter.type).toBe("correction");
    expect(parsed.frontmatter.corrects).toBe("2026-08-10");
    expect(parsed.body.trim()).toBe("Minutes on Tuesday were wrong. Actual figure was 20, not 90.");
  });

  it("parse(serialize(entry)) is the identity on frontmatter fields", () => {
    const original: Entry = {
      frontmatter: {
        ...blankFrontmatter("2026-08-17"),
        projects: ["a", "b"],
        minutes: { a: 10, b: 20 },
        blockers: [{ id: "x-y", project: "a", note: "n" }],
        shipped: [{ project: "b", what: "w" }],
      },
      body: "body text",
    };
    const parsed = parseEntry(serializeEntry(original));
    expect(parsed.frontmatter).toEqual(original.frontmatter);
    expect(parsed.body.trim()).toBe(original.body.trim());
  });
});
