// Native port of _system/scripts/check-entries.sh's assertions.
// ui-contract.md, "Validation on save": "Either shell out to
// check-entries.sh on save, or reimplement its assertions natively."
// This is the native path, which avoids a bash dependency on Windows.
//
// Every assertion here has a matching line in check-entries.sh; keep them
// in lockstep, and see tests/domain/validate.test.ts for the test that
// runs the real bash script over the same fixtures as a cross-check.

import type { Entry } from "./frontmatter.js";

export interface Violation {
  field: string;
  message: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ValidateContext {
  /** Filename stem, e.g. "2026-08-10" for 2026-08-10.md. */
  stem: string;
  /** Slugs with a real projects/<slug>/project.md. */
  knownProjectSlugs: Set<string>;
  /** Whether entries/.../<stem>.transcript.md exists beside this file. */
  transcriptExists: boolean;
  /** Whether entries/.../<corrects>.md exists, when type is correction. */
  correctsTargetExists: (correctsDate: string) => boolean;
}

export function validateEntry(entry: Entry, ctx: ValidateContext): Violation[] {
  const v: Violation[] = [];
  const fm = entry.frontmatter;

  // date
  if (!fm.date) {
    v.push({ field: "date", message: "missing required field: date" });
  } else if (!ISO_DATE_RE.test(fm.date)) {
    v.push({ field: "date", message: `date is not ISO YYYY-MM-DD: '${fm.date}'` });
  } else if (fm.date !== ctx.stem) {
    v.push({
      field: "date",
      message: `filename does not match date: file says '${ctx.stem}', frontmatter says '${fm.date}'`,
    });
  }

  // type / corrects
  if (fm.type === "correction") {
    if (!fm.corrects) {
      v.push({ field: "corrects", message: "type: correction requires a corrects: date" });
    } else if (!ISO_DATE_RE.test(fm.corrects)) {
      v.push({ field: "corrects", message: `corrects is not an ISO date: '${fm.corrects}'` });
    } else if (!ctx.correctsTargetExists(fm.corrects)) {
      v.push({
        field: "corrects",
        message: `corrects points at '${fm.corrects}', which has no entry file`,
      });
    }
  } else if (fm.type !== "entry") {
    v.push({ field: "type", message: `type must be entry or correction, got '${fm.type}'` });
  }

  // source
  if (fm.source === "voice") {
    if (!ctx.transcriptExists) {
      v.push({
        field: "source",
        message: `source: voice but no ${ctx.stem}.transcript.md beside it (the transcript is not optional)`,
      });
    }
  } else if (fm.source !== "typed") {
    v.push({ field: "source", message: `source must be typed or voice, got '${fm.source}'` });
  }

  // energy
  if (fm.energy === undefined || Number.isNaN(fm.energy)) {
    v.push({ field: "energy", message: "missing required field: energy" });
  } else if (!Number.isInteger(fm.energy) || fm.energy < 1 || fm.energy > 5) {
    v.push({ field: "energy", message: `energy must be a whole number 1-5, got '${fm.energy}'` });
  }

  // projects[] must each resolve to a real project
  for (const slug of fm.projects) {
    if (!ctx.knownProjectSlugs.has(slug)) {
      v.push({
        field: "projects",
        message: `projects[] names '${slug}', but projects/${slug}/project.md does not exist`,
      });
    }
  }

  // minutes keys subset of projects[], whole-number values
  for (const [k, val] of Object.entries(fm.minutes)) {
    if (!fm.projects.includes(k)) {
      v.push({
        field: "minutes",
        message: `minutes has '${k}', which is not in projects[] (a typo here silently drops the day)`,
      });
    }
    if (!Number.isInteger(val) || val < 0) {
      v.push({ field: "minutes", message: `minutes.${k} is not a whole number: '${val}'` });
    }
  }

  // blockers: id required + kebab-case, project (if set) must be declared
  fm.blockers.forEach((b, i) => {
    if (!b.id) {
      v.push({
        field: `blockers[${i}]`,
        message: "blockers[" + i + "] has no id (the id is the recurrence key; without it the blocker is invisible to the review)",
      });
    } else if (!KEBAB_RE.test(b.id)) {
      v.push({ field: `blockers[${i}]`, message: `blocker id '${b.id}' is not kebab-case` });
    }
    if (b.project && !fm.projects.includes(b.project)) {
      v.push({
        field: `blockers[${i}]`,
        message: `blockers[${i}].project is '${b.project}', which is not in projects[]`,
      });
    }
  });

  // shipped: must name a declared project and say what
  fm.shipped.forEach((s, i) => {
    if (!s.project) {
      v.push({ field: `shipped[${i}]`, message: `shipped[${i}] has no project` });
    } else if (!fm.projects.includes(s.project)) {
      v.push({
        field: `shipped[${i}]`,
        message: `shipped[${i}].project is '${s.project}', which is not in projects[]`,
      });
    }
    if (!s.what) {
      v.push({ field: `shipped[${i}]`, message: `shipped[${i}] has no what` });
    }
  });

  return v;
}
