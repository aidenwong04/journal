// Read-only listing and parsing of reviews/*/output/. The app never
// writes here (ui-contract.md: "Write to reviews/ at all" is on the list
// of things the UI must never do; reviews are produced by the scheduled
// run and edited by a human).

import { promises as fs } from "node:fs";
import path from "node:path";

export type ReviewTier = "weekly" | "monthly" | "quarterly";

export interface ReviewSection {
  heading: string;
  body: string;
}

export interface ReviewSummary {
  tier: ReviewTier;
  period: string;
  file: string;
  generated: string | null;
}

export interface Review extends ReviewSummary {
  sections: ReviewSection[];
  raw: string;
}

const TIER_DIRS: Record<ReviewTier, string> = {
  weekly: "01_weekly",
  monthly: "02_monthly",
  quarterly: "03_quarterly",
};

function outputDir(workspace: string, tier: ReviewTier): string {
  return path.join(workspace, "reviews", TIER_DIRS[tier], "output");
}

function extractSimpleFrontmatter(raw: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  const out: Record<string, string> = {};
  if (!match) return out;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

/**
 * Split the body into ## sections, matching the fixed order in
 * _system/templates/review.md. Each rollup tier renders its own shape
 * from these sections (findings / trend / verdict) rather than one
 * generic list template.
 */
function splitSections(body: string): ReviewSection[] {
  const parts = body.split(/\r?\n(?=## )/);
  const sections: ReviewSection[] = [];
  for (const part of parts) {
    const m = /^##\s*(.+?)\r?\n([\s\S]*)$/.exec(part.trim());
    if (m) sections.push({ heading: m[1].trim(), body: m[2].trim() });
  }
  return sections;
}

export async function listReviews(workspace: string, tier: ReviewTier): Promise<ReviewSummary[]> {
  const dir = outputDir(workspace, tier);
  const files = await fs.readdir(dir).catch(() => []);
  const out: ReviewSummary[] = [];
  for (const file of files.filter((f) => f.endsWith(".md")).sort().reverse()) {
    const raw = await fs.readFile(path.join(dir, file), "utf8");
    const fm = extractSimpleFrontmatter(raw);
    out.push({
      tier,
      period: fm.period ?? file.replace(/\.md$/, ""),
      file,
      generated: fm.generated ?? null,
    });
  }
  return out;
}

export async function listAllReviews(workspace: string): Promise<ReviewSummary[]> {
  const tiers: ReviewTier[] = ["weekly", "monthly", "quarterly"];
  const all: ReviewSummary[] = [];
  for (const tier of tiers) {
    all.push(...(await listReviews(workspace, tier)));
  }
  return all;
}

export async function readReview(workspace: string, tier: ReviewTier, file: string): Promise<Review | null> {
  const p = path.join(outputDir(workspace, tier), file);
  try {
    const raw = await fs.readFile(p, "utf8");
    const fm = extractSimpleFrontmatter(raw);
    const body = raw.replace(/^---[\s\S]*?---\r?\n?/, "");
    return {
      tier,
      period: fm.period ?? file.replace(/\.md$/, ""),
      file,
      generated: fm.generated ?? null,
      sections: splitSections(body),
      raw,
    };
  } catch {
    return null;
  }
}
