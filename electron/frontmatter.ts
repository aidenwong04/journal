// Parse and serialize entry frontmatter per _system/entry-schema.md.
//
// The hard requirement: anything this module writes must parse cleanly
// under the awk normaliser in _system/scripts/check-entries.sh, which is
// explicitly "not a general YAML parser" and only understands scalars,
// inline [a, b] / {k: v}, block lists of maps, and block maps. Serialize()
// is pinned to those shapes; see tests/domain/frontmatter.test.ts for the
// round-trip-through-the-real-script test.

import { parseDocument, Document, YAMLMap } from "yaml";

export type EntryType = "entry" | "correction";
export type EntrySource = "typed" | "voice";

export interface Blocker {
  id: string;
  project: string | null;
  note: string;
}

export interface Shipped {
  project: string;
  what: string;
}

export interface EntryFrontmatter {
  date: string;
  type: EntryType;
  corrects: string | null;
  source: EntrySource;
  projects: string[];
  minutes: Record<string, number>;
  energy: number;
  blockers: Blocker[];
  shipped: Shipped[];
  mood_note: string | null;
}

export interface Entry {
  frontmatter: EntryFrontmatter;
  body: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function blankFrontmatter(date: string): EntryFrontmatter {
  return {
    date,
    type: "entry",
    corrects: null,
    source: "typed",
    projects: [],
    minutes: {},
    energy: 3,
    blockers: [],
    shipped: [],
    mood_note: null,
  };
}

export function parseEntry(raw: string): Entry {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    throw new Error("no YAML frontmatter (file must start with ---)");
  }
  const [, yamlText, body] = match;
  const doc = parseDocument(yamlText);
  const data = (doc.toJSON() ?? {}) as Record<string, unknown>;

  const fm: EntryFrontmatter = {
    date: String(data.date ?? ""),
    type: (data.type as EntryType) ?? "entry",
    corrects: data.corrects != null ? String(data.corrects) : null,
    source: (data.source as EntrySource) ?? "typed",
    projects: Array.isArray(data.projects) ? data.projects.map(String) : [],
    minutes: normaliseMinutes(data.minutes),
    energy: Number(data.energy ?? 0),
    blockers: normaliseBlockers(data.blockers),
    shipped: normaliseShipped(data.shipped),
    mood_note: data.mood_note != null && data.mood_note !== "" ? String(data.mood_note) : null,
  };

  return { frontmatter: fm, body: body.replace(/^\r?\n/, "") };
}

function normaliseMinutes(v: unknown): Record<string, number> {
  if (v == null || typeof v !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = Number(val);
  }
  return out;
}

function normaliseBlockers(v: unknown): Blocker[] {
  if (!Array.isArray(v)) return [];
  return v.map((b) => {
    const o = (b ?? {}) as Record<string, unknown>;
    return {
      id: String(o.id ?? ""),
      project: o.project != null ? String(o.project) : null,
      note: String(o.note ?? ""),
    };
  });
}

function normaliseShipped(v: unknown): Shipped[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    return { project: String(o.project ?? ""), what: String(o.what ?? "") };
  });
}

/**
 * Serialize an entry back to disk. Field order is fixed to match
 * _system/templates/entry.md so a human diffing files sees a stable shape.
 */
export function serializeEntry(entry: Entry): string {
  const fm = entry.frontmatter;
  const doc = new Document();
  const map = new YAMLMap();

  map.set("date", fm.date);
  map.set("type", fm.type);
  map.set("corrects", fm.corrects);
  map.set("source", fm.source);
  map.set("projects", fm.projects);
  map.set("minutes", fm.minutes);
  map.set("energy", fm.energy);
  map.set(
    "blockers",
    fm.blockers.map((b) => ({ id: b.id, project: b.project, note: b.note }))
  );
  map.set(
    "shipped",
    fm.shipped.map((s) => ({ project: s.project, what: s.what }))
  );
  map.set("mood_note", fm.mood_note);

  doc.contents = map;
  const yamlText = doc.toString({ lineWidth: 0 }).trimEnd();

  const body = entry.body.replace(/\s+$/, "");
  return `---\n${yamlText}\n---\n\n${body}\n`;
}
