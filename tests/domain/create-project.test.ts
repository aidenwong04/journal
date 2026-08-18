import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createProject, listProjects } from "../../electron/projects";
import { blankFrontmatter, serializeEntry, type Entry } from "../../electron/frontmatter";

const CHECK_ENTRIES = path.resolve(__dirname, "../../template/_system/scripts/check-entries.sh");

async function tmpWorkspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), "journal-newproject-"));
}

describe("createProject", () => {
  it("writes a project.md that listProjects then recognizes", async () => {
    const dir = await tmpWorkspace();
    await createProject(dir, { slug: "icm-journal", whatFor: "Get the loop running.", cadenceDaysPerWeek: 4, cadenceNote: "weekday evenings" });

    const projects = await listProjects(dir);
    expect(projects).toEqual([{ slug: "icm-journal", status: "active", cadenceDaysPerWeek: 4 }]);

    await fs.access(path.join(dir, "projects", "icm-journal", "_inbox"));
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("rejects a non-kebab-case slug and writes nothing", async () => {
    const dir = await tmpWorkspace();
    await expect(
      createProject(dir, { slug: "Icm_Journal", whatFor: "x", cadenceDaysPerWeek: 3, cadenceNote: "" })
    ).rejects.toThrow(/kebab-case/);
    expect(await listProjects(dir)).toEqual([]);
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("refuses to overwrite an existing project", async () => {
    const dir = await tmpWorkspace();
    await createProject(dir, { slug: "icm-journal", whatFor: "first", cadenceDaysPerWeek: 4, cadenceNote: "" });
    await expect(
      createProject(dir, { slug: "icm-journal", whatFor: "second", cadenceDaysPerWeek: 2, cadenceNote: "" })
    ).rejects.toThrow(/already exists/);

    const content = await fs.readFile(path.join(dir, "projects", "icm-journal", "project.md"), "utf8");
    expect(content).toContain("first");
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("produces a project a real entry can reference, and that entry still passes check-entries.sh", async () => {
    const dir = await tmpWorkspace();
    await createProject(dir, { slug: "icm-journal", whatFor: "test", cadenceDaysPerWeek: 4, cadenceNote: "" });

    await fs.mkdir(path.join(dir, "_system", "scripts"), { recursive: true });
    await fs.copyFile(CHECK_ENTRIES, path.join(dir, "_system", "scripts", "check-entries.sh"));
    await fs.chmod(path.join(dir, "_system", "scripts", "check-entries.sh"), 0o755);

    const entry: Entry = {
      frontmatter: { ...blankFrontmatter("2026-08-17"), projects: ["icm-journal"], minutes: { "icm-journal": 30 } },
      body: "worked on it",
    };
    await fs.mkdir(path.join(dir, "entries", "2026", "08"), { recursive: true });
    const entryPath = path.join(dir, "entries", "2026", "08", "2026-08-17.md");
    await fs.writeFile(entryPath, serializeEntry(entry));

    const output = execFileSync("bash", [path.join(dir, "_system", "scripts", "check-entries.sh"), entryPath], {
      cwd: dir,
      encoding: "utf8",
    });
    expect(output).toMatch(/1 file\(s\) clean/);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
