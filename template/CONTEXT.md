# Journal - the definitions

Three nouns hold this system up.
Everything else is routing.

## An entry

One day, one file, at `entries/YYYY/MM/YYYY-MM-DD.md`.
The filename is the date; the date is the primary key; the absence of the file is a fact.

An entry is written once and never edited by any stage.
It carries YAML frontmatter (fields defined in `_system/entry-schema.md`) and a free-prose body.
Frontmatter is what the review counts.
Prose is what the review quotes.

If an entry was captured by voice, the verbatim transcript lives beside it as `YYYY-MM-DD.transcript.md`.
Both files are kept forever.
The cleaned entry may fix disfluencies; it may never summarize.
See `_system/voice-cleanup.md`.

If a past entry was wrong, it is not edited.
A new file is written for the day the correction was made, with `type: correction` and `corrects: <original date>`.
The record is append-only, so the history of what you believed is preserved alongside what turned out to be true.

## A day

A journal day starts at **04:00 local time**, not midnight.

Writing at 01:30 on Sunday belongs to Saturday, because that is the day you were actually living. Midnight rollover would file a late Saturday session under Sunday and score Saturday as skipped, which is the opposite of what happened.

The rule, stated once so nothing has to guess: **the journal date is the calendar date of (now minus 4 hours).**

Two consequences that reach beyond the UI:

- **Today's file is editable; yesterday's is not.** You may add to the current journal day's entry all evening. At the next 04:00 boundary that file seals, and any change after that is a correction file, not an edit. Sealing needs no flag or state anywhere: a file is sealed if its date is not the current journal date.
- **The weekly review must run after 04:00 on Sunday.** Saturday's entry can still be written until then. A run at 03:00 would read an unsealed week and report a skipped day that was about to be filled. Schedule it at 08:00.

Once a year, DST makes 04:00 ambiguous or absent for an hour. Not worth engineering around; the worst case is one entry filed a day off, which a correction fixes.

## A week

**Sunday through Saturday**, labelled by the ISO week number of the Saturday that closes it: `2026-W32` is Sun 2026-08-02 through Sat 2026-08-08.

This is deliberate and it is the one place the obvious answer is wrong.
The review runs Sunday morning.
If the week were Monday through Sunday, the most recent *closed* week on a Sunday morning would have ended six days earlier, and every review would be reporting on stale time.
A Sunday-through-Saturday week closes the night before the run, so the review always covers the seven days you just lived.
If you move the schedule off Sunday morning, revisit this definition first.

A week is not an object on disk.
It is a query over `entries/`: the seven date files that should exist for that span.

Adherence falls out of that query.
A project's `project.md` declares a committed cadence (for example, four days a week).
The review counts the date files that exist and name that project, compares against the commitment, and lists the specific missing dates.
A missing file is a skipped day.
There is no separate tracker to fall out of sync, because there is nothing to fall out of sync with.

## A project

A folder at `projects/<slug>/` holding `project.md` and `_inbox/`.
`project.md` is a small knowledge node, not a task list: what the project is for, what "done" would mean, the cadence committed to it, the open questions, and the current state as a human last recorded it.

The review reads `project.md` to know what you said you would do.
The review never writes to it.
Proposed changes land in `projects/<slug>/_inbox/` as dated proposal files.
Accepting a proposal is a human editing `project.md` and deleting or archiving the inbox file.
That is the only way project state changes.

## The pipeline

| Stage | Reads | Writes | Human check |
|---|---|---|---|
| `reviews/01_weekly` | 7 entry files (Sun-Sat) + `projects/*/project.md` | `01_weekly/output/YYYY-Www.md` + `_inbox/` proposals | read the review; accept or bin each proposal |
| `reviews/02_monthly` | 4 weekly reviews | `02_monthly/output/YYYY-MM.md` + proposals | same |
| `reviews/03_quarterly` | 3 monthly reviews | `03_quarterly/output/YYYY-Qn.md` + proposals | same |

Token cost stays flat as the archive grows, because each tier reads a fixed number of files from the tier below.

Status is whatever exists: a review is done when its file is in that stage's `output/`.

Any index over `entries/` would be script-generated and rebuilt from scratch.
None exists today, and none is needed, because the filesystem is already the index.
