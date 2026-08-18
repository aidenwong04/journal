// Read / write / list entries. The only place in the app that writes into
// entries/, per ui-contract.md's single write privilege.

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { entryPathParts, isSealed, journalDate, type IsoDate } from "./journal-date";
import { blankFrontmatter, parseEntry, serializeEntry, type Entry } from "./frontmatter";
import { validateEntry, type Violation, type ValidateContext } from "./validate";

function entriesRoot(workspace: string): string {
  return path.join(workspace, "entries");
}

function entryFilePath(workspace: string, date: IsoDate): string {
  const { year, month } = entryPathParts(date);
  return path.join(entriesRoot(workspace), year, month, `${date}.md`);
}

function transcriptFilePath(workspace: string, date: IsoDate): string {
  const { year, month } = entryPathParts(date);
  return path.join(entriesRoot(workspace), year, month, `${date}.transcript.md`);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Atomic write: temp file in the same directory, then rename. */
async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, filePath);
}

export async function readEntry(workspace: string, date: IsoDate): Promise<Entry | null> {
  const p = entryFilePath(workspace, date);
  try {
    const raw = await fs.readFile(p, "utf8");
    return parseEntry(raw);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function entryExists(workspace: string, date: IsoDate): Promise<boolean> {
  return pathExists(entryFilePath(workspace, date));
}

async function knownProjectSlugs(workspace: string): Promise<Set<string>> {
  const projectsDir = path.join(workspace, "projects");
  try {
    const dirents = await fs.readdir(projectsDir, { withFileTypes: true });
    const slugs = new Set<string>();
    for (const d of dirents) {
      if (d.isDirectory() && (await pathExists(path.join(projectsDir, d.name, "project.md")))) {
        slugs.add(d.name);
      }
    }
    return slugs;
  } catch {
    return new Set();
  }
}

/**
 * Validate an entry against the schema and, for `corrects`, against the
 * actual filesystem. correctsTargetExists is async in reality, so this
 * helper resolves it before delegating to the synchronous validator.
 */
export async function validateEntryOnDisk(workspace: string, entry: Entry): Promise<Violation[]> {
  const isVoice = entry.frontmatter.source === "voice";
  const correctsExists =
    entry.frontmatter.type === "correction" && entry.frontmatter.corrects
      ? await entryExists(workspace, entry.frontmatter.corrects)
      : false;

  const ctx: ValidateContext = {
    stem: entry.frontmatter.date,
    knownProjectSlugs: await knownProjectSlugs(workspace),
    transcriptExists: isVoice ? await pathExists(transcriptFilePath(workspace, entry.frontmatter.date)) : false,
    correctsTargetExists: () => correctsExists,
  };
  return validateEntry(entry, ctx);
}

export interface SaveResult {
  ok: boolean;
  violations: Violation[];
}

/**
 * Write today's entry. Refuses to write a sealed date at this layer, so a
 * renderer bug can never corrupt a sealed file (ui-contract.md: "Sealed
 * entries are never modified... for any reason").
 */
export async function saveTodayEntry(workspace: string, entry: Entry, now: Date = new Date()): Promise<SaveResult> {
  const today = journalDate(now);
  if (entry.frontmatter.date !== today) {
    throw new Error(`refusing to save: entry date ${entry.frontmatter.date} is not today (${today})`);
  }
  if (isSealed(entry.frontmatter.date, now)) {
    throw new Error(`refusing to save: ${entry.frontmatter.date} is sealed`);
  }

  const violations = await validateEntryOnDisk(workspace, entry);
  await writeFileAtomic(entryFilePath(workspace, entry.frontmatter.date), serializeEntry(entry));
  return { ok: violations.length === 0, violations };
}

/**
 * Write a correction. Creates a NEW file dated today with `corrects` set;
 * never touches the original. The caller is responsible for setting
 * frontmatter.date to today and frontmatter.corrects to the original date.
 */
export async function saveCorrection(workspace: string, entry: Entry, now: Date = new Date()): Promise<SaveResult> {
  const today = journalDate(now);
  if (entry.frontmatter.date !== today) {
    throw new Error(`refusing to save correction: date ${entry.frontmatter.date} is not today (${today})`);
  }
  if (entry.frontmatter.type !== "correction" || !entry.frontmatter.corrects) {
    throw new Error("saveCorrection requires type: correction and a corrects: date");
  }
  const violations = await validateEntryOnDisk(workspace, entry);
  await writeFileAtomic(entryFilePath(workspace, entry.frontmatter.date), serializeEntry(entry));
  return { ok: violations.length === 0, violations };
}

/** Both files or neither: write the verbatim transcript, then the cleaned entry. */
export async function saveVoiceCapture(
  workspace: string,
  date: IsoDate,
  transcriptRaw: string,
  entry: Entry
): Promise<SaveResult> {
  if (isSealed(date)) {
    throw new Error(`refusing to save voice capture: ${date} is sealed`);
  }
  const transcriptPath = transcriptFilePath(workspace, date);
  const transcriptContent = `---\ndate: ${date}\nsource: voice\n---\n\n${transcriptRaw.trimEnd()}\n`;

  // Transcript first. If the entry write below fails, a bare transcript
  // with no cleaned entry is a known, visible bug state (voice-cleanup.md
  // calls this out explicitly) rather than a silently corrupted record.
  await writeFileAtomic(transcriptPath, transcriptContent);
  const violations = await validateEntryOnDisk(workspace, entry);
  await writeFileAtomic(entryFilePath(workspace, date), serializeEntry(entry));
  return { ok: violations.length === 0, violations };
}

export function newBlankEntry(now: Date = new Date()): Entry {
  const date = journalDate(now);
  return { frontmatter: blankFrontmatter(date), body: "" };
}

export function newCorrectionEntry(originalDate: IsoDate, now: Date = new Date()): Entry {
  const today = journalDate(now);
  const fm = blankFrontmatter(today);
  fm.type = "correction";
  fm.corrects = originalDate;
  return { frontmatter: fm, body: "" };
}

/** List every dated entry file under entries/, sorted ascending. Transcripts excluded. */
export async function listEntryDates(workspace: string): Promise<IsoDate[]> {
  const root = entriesRoot(workspace);
  const dates: IsoDate[] = [];
  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})\.md$/;

  async function walkYear(yearDir: string) {
    const months = await fs.readdir(yearDir, { withFileTypes: true }).catch(() => []);
    for (const m of months) {
      if (!m.isDirectory()) continue;
      const monthDir = path.join(yearDir, m.name);
      const files = await fs.readdir(monthDir).catch(() => []);
      for (const f of files) {
        const match = DATE_RE.exec(f);
        if (match) dates.push(match[0].replace(/\.md$/, ""));
      }
    }
  }

  const years = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const y of years) {
    if (y.isDirectory()) await walkYear(path.join(root, y.name));
  }
  return dates.sort();
}

/**
 * Scan roughly the last N weeks of entries for blocker ids, most recent
 * first, deduplicated. ui-contract.md calls this "the single most
 * important thing the UI does for the quality of the reviews."
 */
export async function recentBlockerIds(workspace: string, weeks = 4): Promise<string[]> {
  const dates = (await listEntryDates(workspace)).sort().reverse();
  const cutoffCount = weeks * 7;
  const recent = dates.slice(0, cutoffCount);

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const date of recent) {
    const entry = await readEntry(workspace, date);
    if (!entry) continue;
    for (const b of entry.frontmatter.blockers) {
      if (b.id && !seen.has(b.id)) {
        seen.add(b.id);
        ordered.push(b.id);
      }
    }
  }
  return ordered;
}
