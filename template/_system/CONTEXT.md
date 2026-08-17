# _system - the method

One job: hold everything that is true of this system regardless of whose journal it is.

Nothing in here is personal content. Nothing in here is written by a run.
This is the folder you copy to deploy the system for someone else; `entries/`, `projects/`, and `reviews/` are this deployment and do not travel.

## What is here

| File | Authority over |
|---|---|
| `entry-schema.md` | entry frontmatter, naming, corrections. Wins over the template on conflict. |
| `review-rubric.md` | the voice and stance every review takes. A close friend, lowercase and direct: warm about you, merciless about the week. |
| `voice-cleanup.md` | the transcript-plus-entry rule and what cleanup may not do. Owned by the capture UI. |
| `ui-contract.md` | what the capture UI may read and write, the sealing rule, its acceptance tests. |
| `ui-design-spec.md` | the visual system the UI is built against: color, type, space, sizing ratios, motion. Appearance only, never overrides `ui-contract.md`. |
| `templates/entry.md` | blank stamp for a day |
| `templates/project.md` | blank stamp for a project node |
| `templates/review.md` | fixed section order for every review tier |
| `templates/proposal.md` | blank stamp for an `_inbox/` proposal |
| `scripts/` | the two mechanical checks: entry schema, review tone. See `scripts/CONTEXT.md`. |
| `worked-example/` | two fabricated entries and the review they produce. Illustration only. |

## Rules

New work is a copy of a template, never a blank page.
One home per fact: if a rule appears here, contracts point at it rather than restating it.
`worked-example/` is never read by a run and is listed under "Do NOT load" in every stage contract.

## Human check

When you change `entry-schema.md`, open `templates/entry.md` the same day and reconcile it.
Schema drift between these two files is the failure mode that would quietly break every review.
