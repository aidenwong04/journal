// The full IPC surface between renderer and main, in one place so it can
// be audited in a single file. The renderer never gets raw fs access; this
// is the entire capability set it has.

import type { Entry } from "./frontmatter.js";
import type { Violation } from "./validate.js";
import type { ProjectSummary, Proposal } from "./projects.js";
import type { ReviewSummary, Review, ReviewTier } from "./reviews.js";

export interface JournalStatus {
  workspacePath: string | null;
  today: string;
  isFirstRun: boolean;
}

export interface JournalApi {
  getStatus(): Promise<JournalStatus>;
  chooseWorkspace(): Promise<string | null>;
  setWorkspace(path: string, opts: { createIfEmpty: boolean }): Promise<JournalStatus>;

  getTodayEntry(): Promise<Entry>;
  getEntry(date: string): Promise<Entry | null>;
  isSealed(date: string): Promise<boolean>;
  saveTodayEntry(entry: Entry): Promise<{ ok: boolean; violations: Violation[] }>;
  saveCorrection(entry: Entry): Promise<{ ok: boolean; violations: Violation[] }>;
  newCorrectionEntry(originalDate: string): Promise<Entry>;
  listEntryDates(): Promise<string[]>;
  recentBlockerIds(): Promise<string[]>;
  validateEntry(entry: Entry): Promise<Violation[]>;

  listProjects(): Promise<ProjectSummary[]>;
  readProjectFile(slug: string): Promise<string | null>;
  listInbox(): Promise<Proposal[]>;
  acceptProposal(slug: string, file: string, replacement: { old: string; next: string }): Promise<void>;
  rejectProposal(slug: string, file: string): Promise<void>;

  listReviews(tier: ReviewTier): Promise<ReviewSummary[]>;
  listAllReviews(): Promise<ReviewSummary[]>;
  readReview(tier: ReviewTier, file: string): Promise<Review | null>;
}

export const IPC_CHANNEL = "journal-api" as const;
