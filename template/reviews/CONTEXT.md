# reviews - the rollup pipeline

Three stages, each reading only the tier below it.
That single rule is what keeps token cost flat as the archive grows.

The stage table (reads, writes, human check) lives once in `../CONTEXT.md`. It is not repeated here.

## The tier rule

Monthly does not read entries. Quarterly does not read weeklies.
If a rollup wants a detail its tier does not carry, that is a finding about the tier below, and it says so in the review rather than reaching down.

## Period boundaries

Weeks run Sunday through Saturday (see `../CONTEXT.md`).
A week belongs to the month containing its **Saturday**, and to the quarter containing that month.
So a month is the 4 or 5 weeks whose Saturdays fall inside it, and no week is ever counted twice or dropped.

## What every stage may and may not touch

May write: its own `output/` folder, and `projects/<slug>/_inbox/`.
May never write: `entries/` anything, or `projects/<slug>/project.md`.

Stance for all three: `../_system/review-rubric.md`.
Output shape for all three: `../_system/templates/review.md`.

## Status

A period is reviewed when its file exists in that stage's `output/`.

Each stage folder holds exactly two things: `CONTEXT.md` (the contract, stable) and `output/` (the reviews, accumulating). Nothing else goes in a stage folder. Scanning `reviews/*/output/` answers "what has been reviewed" with no pattern-matching and no exceptions.

## Corrections travelling upward

Nothing ever reaches back down a tier. Corrections travel up instead.

When a stage reads a correction that applies to a period **earlier** than the one it is reviewing, it does two things: writes a `## corrections to earlier periods` section into its own review, and lists the affected dates in `corrections_upstream:` in its frontmatter.

The tier above checks `corrections_upstream` across its inputs before it trends anything, and restates any correction it finds. That is the only way a late correction reaches a review that was already written.

A human may also edit any review file by hand at any time. Reviews are not immutable; only entries are.
