# 03_quarterly - decide what to kill

**Status: provisional.** Written before any monthly review existed, so it is a guess twice over. The first real run is expected to rewrite it, and that is the contract working.

One job: read the quarter's three monthly reviews and force a keep-or-kill call on each project.

## Inputs

- Working (this run): `../02_monthly/output/YYYY-MM.md` for the 3 months of the quarter.
- Reference (every run): `../../projects/*/project.md`
- Reference (every run): `../../_system/review-rubric.md`
- Reference (every run): `../../_system/templates/review.md`

Do NOT load: `../../entries/`, `../01_weekly/`, other quarters, `_system/worked-example/`.
Three files in, one file out. If the monthlies cannot support a call, say which monthly failed to carry the fact.

## Process

1. Read the three monthlies.
2. Per project, state the quarter in numbers: weeks at cadence, weeks missed, verifiable shipped items, blockers that outlived the quarter.
3. Compare against `## What done looks like` in each `project.md`. Is the project measurably closer than it was three months ago? If the record cannot answer that, the project's definition of done is broken and that is the finding.
4. For each project, make a call: continue as committed, continue at a reduced cadence with a stated trade, or stop. Every project gets a call. Silence is not an option.
5. For any project called reduce or stop, write the proposal to its `_inbox/`. The call is yours to accept; the review only argues for it.
6. Check `corrections_upstream:` in each monthly's frontmatter and restate anything that never reached the review it concerned.
7. Write to `output/YYYY-Qn.md` using the template. The decision section holds the single most consequential call of the three.
8. Re-read the rubric's Prohibited list and check the draft against it line by line. Revise once.

## Outputs

- `reviews/03_quarterly/output/YYYY-Qn.md`
- zero or more `projects/<slug>/_inbox/YYYY-MM-DD-<change>.md`

## Human check

Sit with the kill calls before accepting any of them.
Then either edit each `project.md` by hand or delete the proposal, and write an entry saying which you did and why. That entry is the input to next quarter.

First run only: reread this contract against what the quarter actually needed, fix it, and delete the provisional marker at the top.
