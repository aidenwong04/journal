# 02_monthly - find the pattern the weeks could not see

**Status: provisional.** This contract was written before any weekly review existed, so it is a guess about what a month's worth of weeklies will actually support. The first real run is expected to rewrite it. Rewriting it is the contract working, not failing.

One job: read the month's weekly reviews and report what is trending, not what happened.

## Inputs

- Working (this run): `../01_weekly/output/YYYY-Www.md` for every week whose **Saturday** falls inside the target month. That is 4 or 5 files. See `../CONTEXT.md` for the boundary rule.
- Reference (every run): `../../projects/*/project.md`
- Reference (every run): `../../_system/review-rubric.md`
- Reference (every run): `../../_system/templates/review.md`

Do NOT load: `../../entries/` at all. Not one file, not to check a quote.
If a weekly review is missing a fact you need, that is a finding about the weekly stage, and it goes in the review as one. This is what keeps cost flat.

Also do NOT load: `03_quarterly/`, other months, `_system/worked-example/`.

## Process

1. Read the weeklies. Note any week with no review file: an unreviewed week is a gap in the record and gets named.
2. Per project, trend adherence across the weeks: is the miss rate rising, flat, or falling? State the numbers.
3. Blockers: any id that survived multiple weeks is now a structural fact, not a blocker. Say which weeks it appeared in and what, if anything, was attempted.
4. Shipped: list the month's verifiable outputs. A month with fewer than one per project gets a sentence saying so.
5. Check each project's stated cadence against the month's reality and ask whether the commitment or the behaviour is the fiction. Pick one.
6. Note any `_inbox/` proposal that the weeklies wrote and that is still sitting unaccepted. An ignored proposal is a decision made by avoidance, and it gets reported that way.
7. Check `corrections_upstream:` in each weekly's frontmatter. Any correction listed there landed after the week it concerns was already reviewed, so it has never been accounted for. Restate it and adjust the trend before drawing any conclusion from the affected week.
8. Write to `output/YYYY-MM.md` using the template. One decision for the month.
9. Re-read the rubric's Prohibited list and check the draft against it line by line. Revise once.

## Outputs

- `reviews/02_monthly/output/YYYY-MM.md`
- zero or more `projects/<slug>/_inbox/YYYY-MM-DD-<change>.md`

## Human check

Confirm the trend claims against the weekly files you already read.
Then act on the month's single decision or write down why you are not.

First run only: reread this contract against what the month actually needed. If a step was useless or a needed input was missing, fix the contract now and delete the provisional marker at the top.
