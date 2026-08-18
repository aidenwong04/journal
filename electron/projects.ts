// Project reading (picker) and the inbox: proposals, accept, reject.
//
// ui-contract.md read privilege #1: projects/*/project.md for the picker.
// The inbox screen (privilege #3 plus the one extra write privilege for
// accept) is "the highest-value screen in the app" per that spec.

import { promises as fs } from "node:fs";
import path from "node:path";
import { extractProposedChange } from "./proposal-parse";
import { journalDate } from "./journal-date";

export interface ProjectSummary {
  slug: string;
  status: string;
  cadenceDaysPerWeek: number | null;
}

export interface NewProjectInput {
  slug: string;
  whatFor: string;
  cadenceDaysPerWeek: number;
  cadenceNote: string;
}

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface Proposal {
  /** Filename, e.g. 2026-08-09-cadence-or-scope.md */
  file: string;
  projectSlug: string;
  proposed: string | null;
  from: string | null;
  kind: string | null;
  title: string;
  raw: string;
  /** Days since `proposed`, for surfacing age rather than nagging. */
  ageDays: number | null;
}

function projectsRoot(workspace: string): string {
  return path.join(workspace, "projects");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Every slug with a real project.md. The project picker may offer only these. */
export async function listProjects(workspace: string): Promise<ProjectSummary[]> {
  const root = projectsRoot(workspace);
  const dirents = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const out: ProjectSummary[] = [];
  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    const projectFile = path.join(root, d.name, "project.md");
    if (!(await pathExists(projectFile))) continue;
    const raw = await fs.readFile(projectFile, "utf8");
    const fm = extractSimpleFrontmatter(raw);
    out.push({
      slug: d.name,
      status: fm.status ?? "active",
      cadenceDaysPerWeek: fm.cadence_days_per_week ? Number(fm.cadence_days_per_week) : null,
    });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function readProjectFile(workspace: string, slug: string): Promise<string | null> {
  const p = path.join(projectsRoot(workspace), slug, "project.md");
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

/** Minimal `key: value` frontmatter reader for project.md's small flat schema. */
function extractSimpleFrontmatter(raw: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  const out: Record<string, string> = {};
  if (!match) return out;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].replace(/\s*#.*$/, "").trim();
  }
  return out;
}

export async function listInbox(workspace: string, slug: string): Promise<Proposal[]> {
  const dir = path.join(projectsRoot(workspace), slug, "_inbox");
  const files = await fs.readdir(dir).catch(() => []);
  const out: Proposal[] = [];
  for (const file of files.filter((f) => f.endsWith(".md")).sort()) {
    const raw = await fs.readFile(path.join(dir, file), "utf8");
    out.push(parseProposal(file, slug, raw));
  }
  return out;
}

export async function listAllInbox(workspace: string): Promise<Proposal[]> {
  const projects = await listProjects(workspace);
  const all: Proposal[] = [];
  for (const p of projects) {
    all.push(...(await listInbox(workspace, p.slug)));
  }
  return all;
}

function parseProposal(file: string, slug: string, raw: string): Proposal {
  const fm = extractSimpleFrontmatter(raw);
  const titleMatch = /^#\s*(.+)$/m.exec(raw.replace(/^---[\s\S]*?---/, ""));
  const proposed = fm.proposed ?? null;
  let ageDays: number | null = null;
  if (proposed && /^\d{4}-\d{2}-\d{2}$/.test(proposed)) {
    const then = new Date(proposed + "T00:00:00");
    ageDays = Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
  }
  return {
    file,
    projectSlug: slug,
    proposed,
    from: fm.from ?? null,
    kind: fm.kind ?? null,
    title: titleMatch ? titleMatch[1].trim() : file,
    raw,
    ageDays,
  };
}

export { extractProposedChange };

/**
 * Accept a proposal: replace the exact quoted old text in project.md with
 * the new text, then delete the proposal file. Throws if the old text is
 * not found verbatim, rather than applying a fuzzy or partial match.
 */
export async function acceptProposal(
  workspace: string,
  slug: string,
  file: string,
  replacement: { old: string; next: string }
): Promise<void> {
  const projectPath = path.join(projectsRoot(workspace), slug, "project.md");
  const current = await fs.readFile(projectPath, "utf8");
  if (!current.includes(replacement.old)) {
    throw new Error("the quoted text to replace was not found verbatim in project.md; edit manually instead");
  }
  const updated = current.replace(replacement.old, replacement.next);
  await fs.writeFile(projectPath, updated, "utf8");
  await fs.unlink(path.join(projectsRoot(workspace), slug, "_inbox", file));
}

export async function rejectProposal(workspace: string, slug: string, file: string): Promise<void> {
  await fs.unlink(path.join(projectsRoot(workspace), slug, "_inbox", file));
}

/**
 * Create a new projects/<slug>/ node. Follows the exact section order in
 * template/_system/templates/project.md. The two sections the creation
 * form doesn't collect (what done looks like, open questions) get honest
 * placeholder prose rather than being invented, consistent with
 * projects/CONTEXT.md's "small knowledge node... edited by hand" stance:
 * this only has to produce a schema-valid starting point.
 */
export async function createProject(workspace: string, input: NewProjectInput): Promise<void> {
  const slug = input.slug.trim();
  if (!KEBAB_RE.test(slug)) {
    throw new Error("slug must be kebab-case: lowercase letters, digits, and hyphens only");
  }
  const dir = path.join(projectsRoot(workspace), slug);
  if (await pathExists(path.join(dir, "project.md"))) {
    throw new Error(`projects/${slug}/project.md already exists`);
  }
  if (!Number.isInteger(input.cadenceDaysPerWeek) || input.cadenceDaysPerWeek < 0 || input.cadenceDaysPerWeek > 7) {
    throw new Error("cadence_days_per_week must be a whole number 0-7");
  }

  await fs.mkdir(path.join(dir, "_inbox"), { recursive: true });

  const today = journalDate();
  const whatFor = input.whatFor.trim() || "Not yet written. Edit this by hand.";
  const cadenceNote = input.cadenceNote.trim() || "not yet decided";

  const content = `---
slug: ${slug}
status: active
started: ${today}
cadence_days_per_week: ${input.cadenceDaysPerWeek}
cadence_note: ${cadenceNote}
---

# ${slug}

## What this is for
${whatFor}

## What done looks like
Not yet written. Something a person other than you could confirm has happened; edit this by hand once you know what that is.

## Committed cadence
${input.cadenceDaysPerWeek} days a week. Say what you're giving up to protect it, once you know.

## Open questions
-

## Current state
Last updated by hand on ${today}.
The review never edits this file. Proposals arrive in \`_inbox/\`.
`;

  await fs.writeFile(path.join(dir, "project.md"), content, "utf8");
}
