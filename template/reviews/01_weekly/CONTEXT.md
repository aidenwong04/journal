# 01_weekly - hold the week against what was committed

One job: read the seven days that should exist, and report the gap between the commitment and the record.

Runs Sunday morning, unattended, via `claude -p`, at 08:00.
The target week is Sunday through Saturday, closing the night before the run. See `../../CONTEXT.md` for why.

**Never run before 04:00 Sunday.** A journal day runs 04:00 to 04:00, so Saturday's entry can still be written until then. An earlier run reads an unsealed week and reports a skipped day that was about to be filled.

## Inputs

- Working (this run): `../../entries/YYYY/MM/YYYY-MM-DD.md` for each of the 7 dates, Sunday through Saturday, of the target week. Some will not exist. That is the point.
- Working (this run): `../../entries/YYYY/MM/*.transcript.md` for those dates, only when the cleaned entry's meaning is unclear.
- Reference (every run): `../../projects/*/project.md` - all of them, including projects with zero activity.
- Reference (every run): `../../_system/review-rubric.md`
- Reference (every run): `../../_system/templates/review.md`
- Reference (every run): `../../_system/entry-schema.md` - only if a frontmatter field is ambiguous.

Do NOT load: previous weekly reviews, `02_monthly/`, `03_quarterly/`, `_system/worked-example/`, any entry outside the seven target dates, any `_inbox/` file.
The one exception: if `../../projects/<slug>/_inbox/` is non-empty, note the filenames and their dates without reading their contents, and report the stall.

## Process

0. Run `../../_system/scripts/check-entries.sh`. Any violation it reports is a finding for this review, not something to fix silently: a mistyped slug means a day was dropped from the counts, and you say so. Never edit an entry to make it validate.
1. Compute the seven dates: the Saturday just past and the six days before it. Attempt to read each. Record which files do not exist.
2. For each project in `projects/`, compare `cadence_days_per_week` against the number of the week's existing entries whose `projects[]` contains that slug. List the specific missing dates.
3. Sum `minutes` per project. Flag any project whose days met cadence but whose minutes are token.
4. Collect `blockers[].id` across the week. Count distinct dates per id. Apply rubric rule 3 to each: live blocker, accepted condition, or unsupported claim.
5. Collect `shipped[]`. If empty, say so plainly.
6. Read the prose bodies for claims the frontmatter does not support, and quote them with dates.
7. Apply any `type: correction` entries dated in this week. A correction whose `corrects:` date falls **inside** this week just changes the counts, and you say what was corrected. A correction whose `corrects:` date falls **outside** this week cannot change a review that is already written, so instead: add a `## corrections to earlier periods` section stating the original claim and the correction, and list the corrected date in `corrections_upstream:` in the frontmatter. The monthly picks it up from there. Never reach back and edit an earlier review; a human may, you may not.
8. Write the review to `output/YYYY-Www.md` using the template. Obey the rubric, including its prohibitions.
9. Re-read the rubric's Prohibited list and check the draft against it line by line. Revise once. Softeners and uncited claims are the two that slip through. Then run `../../_system/scripts/lint-review.sh output/YYYY-Www.md` and fix every error it reports. A review that fails the linter is not written.
10. If a change to a `project.md` is warranted, write a proposal to `../../projects/<slug>/_inbox/`. Never edit `project.md`.

## Outputs

- `reviews/01_weekly/output/YYYY-Www.md`
- zero or more `projects/<slug>/_inbox/YYYY-MM-DD-<change>.md`

## Human check

Read the review. For every hard claim, check one cited date against the actual entry file: the review is only worth anything if its evidence survives spot-checking.
Then empty `_inbox/`: accept each proposal by hand-editing `project.md`, or delete it.
The next stage reads whatever is in `output/`, so edit this review in place if it got a fact wrong. Reviews are editable; entries are not.
