# Entry schema

The authoritative definition of an entry file.
`_system/templates/entry.md` is the blank stamp of this schema.
When the template and this file disagree, this file wins and the template gets fixed the same day.

## Location and naming

- Entry: `entries/YYYY/MM/YYYY-MM-DD.md`
- Voice transcript: `entries/YYYY/MM/YYYY-MM-DD.transcript.md`
- Correction: a normal entry file, dated the day the correction was written, with `type: correction`.

One file per date. If a date file does not exist, that day was skipped. That is the entire adherence mechanism.

`date` is the **journal date**, which runs 04:00 to 04:00 local time, not the wall-clock date at the moment of writing. See `../CONTEXT.md` under "A day".

## Frontmatter

```yaml
date: 2026-08-10        # required, ISO, must equal the filename
type: entry             # entry | correction
corrects: null          # correction only: ISO date of the entry being amended
source: typed           # typed | voice
projects: [slug, ...]   # slugs matching projects/<slug>/, [] for a day with no project work
minutes:                # per-project minutes; keys must appear in projects[]
  slug: 45
energy: 4               # 1-5, subjective, whole numbers only
blockers:               # [] when nothing blocked
  - id: cold-start      # kebab-case, REUSE the same id across days for the same blocker
    project: slug       # or null if it is not project-specific
    note: one line, concrete
shipped:                # [] when nothing shipped
  - project: slug
    what: one line, past tense, verifiable by someone else
mood_note:              # optional single line, free text
```

## Field notes that matter downstream

**`blockers[].id` is the recurrence key.**
The weekly review detects a recurring blocker by counting distinct dates carrying the same id, not by matching prose.
Reusing an id is what makes recurrence visible; inventing a new id for the same wall each day hides it.
If you are unsure whether it is the same blocker, reuse the id and let the review argue with you about it.

**`minutes` is the only time source.**
Adherence counts days, effort counts minutes. They are different failures and the review reports them separately.
A day with `minutes: {x: 5}` counts as a day worked on `x`; the review is expected to call out whether five minutes was participation or theatre.

**`shipped[].what` must be checkable.**
"Worked on the parser" is not shipped. "Parser handles nested frontmatter, committed" is.
The review treats an empty `shipped` across a week as a finding, not as neutral.

**`type: correction`** entries are read by the review as part of the week they were written in, and they override the frontmatter of the entry named in `corrects` for counting purposes.
The original file stays exactly as it was written.

## Body

Free prose. No mandated headings.
The review quotes the body; it does not parse it.
Anything the review must count belongs in frontmatter.
