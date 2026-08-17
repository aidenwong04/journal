# projects - the knowledge layer

One job: state what you said you would do, so the reviews have something to hold you to.

This is not a task tracker. It is a small set of stable nodes the reviews read.
If a fact changes weekly, it belongs in an entry, not here.

## Shape

```
projects/<slug>/
├─ project.md     the node: purpose, done, cadence, open questions, current state
└─ _inbox/        proposals from reviews, awaiting a human
```

Blank stamp: `../_system/templates/project.md`
`<slug>` must match exactly the strings used in entry frontmatter `projects[]` and `minutes{}`.

## The human gate

No review, no rollup, no automated run may edit `project.md`.
Ever. This is the one place the system is not allowed to close the loop on itself.

A review that wants something changed writes `projects/<slug>/_inbox/YYYY-MM-DD-<slug-of-change>.md`
using `../_system/templates/proposal.md`.
It quotes the exact lines to replace, so accepting is mechanical.

Accepting = you edit `project.md` by hand, then delete the inbox file.
Rejecting = you delete the inbox file.
An inbox file sitting there for weeks is itself a signal, and the reviews are expected to say so.

## Human check

Open `_inbox/` after every review. Empty it before the next one.
When you accept a cadence change, update `cadence_days_per_week` and say in `## Committed cadence` what you gave up. A cadence lowered without a stated trade is a retreat the next review will find.
