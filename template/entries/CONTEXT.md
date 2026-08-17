# entries - the record library

One job: hold one immutable file per day, forever.

Nothing in this folder is ever edited by a stage.
No review, no rollup, no script writes here.
Only the capture UI and you write here.

Today's file is editable all day; it seals at 04:00 the next morning, and everything before it is sealed already. A journal day runs 04:00 to 04:00, so a session at 01:30 belongs to the day before. The rule lives in `../CONTEXT.md` under "A day"; the UI implements it per `../_system/ui-contract.md`.

## Shape

- `entries/YYYY/MM/YYYY-MM-DD.md` - the entry
- `entries/YYYY/MM/YYYY-MM-DD.transcript.md` - verbatim voice transcript, when `source: voice`

Field semantics: `../_system/entry-schema.md`
Blank stamp: `../_system/templates/entry.md`
Voice rules: `../_system/voice-cleanup.md` - owned and implemented by the capture UI, not by any stage in this workspace.
UI rules: `../_system/ui-contract.md` - what the UI may read and write, and its acceptance tests.

## Corrections

A past entry is wrong? It stays wrong.
Write a new file, dated the day you noticed, with `type: correction` and `corrects: <original date>`.
Say what was wrong and what is true. Restate only the frontmatter fields being corrected.

The point is not tidiness. It is that the review can see both what you believed at the time and what turned out to be true, and can say something about the gap.

## Adherence

There is no streak file, no counter, no index.
A date with no file is a skipped day, and that is the whole mechanism.
Do not backfill a missed day with a file dated to that day; that is falsifying the record.
Write today's entry and mention the gap in the prose.

## Human check

Before saving: does the filename match `date:` in frontmatter?
Are blocker ids the same ones you used last time for the same wall?
Is every `shipped[]` item something another person could confirm?
