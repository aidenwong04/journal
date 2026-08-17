# UI contract

**Owner: the capture UI.** This is the spec the UI is built against, written before the UI exists so that it has something to be wrong about.

The UI is not part of this workspace. It is a separate application whose data directory happens to be `journal/`. It holds exactly one write privilege and three read privileges, and everything else on disk is off limits to it.

The voice path has its own spec in `voice-cleanup.md`. This file covers everything else.

## The day boundary

A journal day starts at 04:00 local time. The journal date is the calendar date of **(now minus 4 hours)**. The rule and its reasoning live in `../CONTEXT.md` under "A day"; this file only implements it.

```
Sat 2026-08-15 23:40  ->  2026-08-15
Sun 2026-08-16 01:30  ->  2026-08-15     (still Saturday)
Sun 2026-08-16 04:00  ->  2026-08-16
```

The UI computes this itself and never uses the OS calendar date directly. Every date it writes, every "today" it displays, and every decision about what is editable follows from this one function. Write that function once.

## Write privilege: entries only

```
entries/YYYY/MM/YYYY-MM-DD.md              the entry
entries/YYYY/MM/YYYY-MM-DD.transcript.md   verbatim, when source: voice
```

`YYYY/MM/` come from the journal date, not the wall clock. Create the directories on demand.

Frontmatter is the interface between the UI and every review that will ever read the entry. Its fields are defined in `entry-schema.md` and that file is authoritative; the UI conforms to it rather than the other way around.

**Editable today, sealed after.** The current journal day's file may be created, appended to, and rewritten freely, all evening, as many sessions as you like. At the next 04:00 boundary it seals.

Sealing requires no flag, no lock, no state: a file is sealed if its date is not the current journal date. The UI computes that on the fly and renders sealed entries read-only.

**Sealed entries are never modified.** Not to fix a typo, not to correct a project, not to adjust minutes. The UI's affordance for a wrong past entry is "write a correction", which creates a **new** file dated today with `type: correction` and `corrects: <the original date>`. The original stays exactly as written. That is what lets a review say something about the gap between what you believed on Tuesday and what turned out to be true on Friday.

**Both or neither** for voice: the transcript is written first and the cleaned entry second, and a cleaned entry with no transcript beside it is a bug that fails `check-entries.sh` for the whole week.

## Read privileges: three, each with a job

**1. `projects/*/project.md` - the project picker.**
Frontmatter `slug` is the value the UI writes into `projects[]` and as the keys of `minutes`.
Offer only slugs that exist. Never free text. A typo here does not error anywhere: it silently removes that day from adherence counting, and the review then reports a skipped day with total confidence.

**2. Recent entries - blocker id autocomplete.**
Scan `blockers[].id` across roughly the last four weeks of entries and offer them as suggestions, most recent first.

This is the single most important thing the UI does for the quality of the reviews. `blockers[].id` is the recurrence key: a recurring blocker is detected by counting distinct dates carrying the same id, not by matching prose. If the UI makes you retype it, you will write `cold-start`, then `cold_start`, then `slow-start`, and the recurrence becomes invisible to every tier at once. Autocomplete is what keeps that field honest.

When in doubt the UI should bias toward reusing an existing id. The review is equipped to argue that two blockers were actually different; it cannot recover a pattern that was never recorded as one.

**3. `reviews/*/output/` and `projects/*/_inbox/` - read-only rendering.**

## The inbox screen

The highest-value screen in the app, and the one that makes the human gate survivable.

Render each file in `projects/<slug>/_inbox/` as a card: the proposal, its evidence, and its stated case against. Two actions:

- **Accept** - apply the quoted replacement to `projects/<slug>/project.md`, then delete the proposal file.
- **Reject** - delete the proposal file.

The proposal template quotes the exact lines to replace precisely so this can be mechanical. A human still has to click, and that is the gate, but the gate should not require opening a text editor.

**The UI never applies a proposal on its own**, on a timer, in bulk, or as a default action. No review may change what you committed to. A system that can rewrite its own targets has no targets.

An untouched proposal is not a bug. A proposal sitting in the inbox for weeks is a signal, and the reviews are already instructed to report it as one, so the UI should show its age rather than nagging.

## Validation on save

Either shell out to `../scripts/check-entries.sh <file>` on save, or reimplement its assertions natively.

Catching a bad slug while the entry is still on screen beats catching it on Sunday morning, when the only remedy left is a correction file.

The UI must never "fix" a violation by editing the entry silently. Surface it and let the writer resolve it.

## What the UI must never do

- Write anywhere outside `entries/`, except applying an accepted proposal to `project.md` on an explicit click.
- Write to `reviews/` at all. Reviews are produced by the scheduled run and edited by a human, never by the capture app.
- Modify a sealed entry, for any reason, including a typo.
- Keep an authoritative index or database. A cache is fine if it is rebuilt from disk and disposable. The instant the cache and the filesystem disagree, the filesystem is right and the cache is garbage.
- Store its own config inside `journal/`. That folder holds content and method only; UI preferences belong in the platform's application-support directory.

## Acceptance tests

The UI is not finished until all of these pass:

1. A session at 01:30 writes to the previous calendar date's file.
2. An entry written at 23:00 and appended to at 23:50 produces one file, not two.
3. At 04:00 the previously editable entry becomes read-only in the interface, with no restart and no stored flag.
4. Attempting to edit a sealed entry offers a correction and creates a new dated file with `corrects:` set, leaving the original byte-identical.
5. The project picker cannot produce a slug that has no `projects/<slug>/project.md`.
6. A blocker id used last week is offered as a suggestion this week.
7. A voice capture produces both files or neither, never one.
8. `check-entries.sh` passes on every entry the UI has ever written.
9. Deleting the UI's cache and relaunching changes nothing about what is displayed.
10. Accepting a proposal edits `project.md` and removes the inbox file; nothing else on disk changes.
