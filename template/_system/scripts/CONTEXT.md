# _system/scripts - the two mechanical checks

One job: catch the two failures a model cannot be trusted to catch in itself.

Both are plain bash, no dependencies, macOS and Linux. Both exit 0 clean and 1 dirty, so the Sunday run can fail loudly instead of writing a bad review quietly.

## check-entries.sh

`./_system/scripts/check-entries.sh [file ...]` - defaults to every entry under `entries/`.

Validates against `../entry-schema.md`: filename matches `date:`, type and source are legal values, a `voice` entry has its transcript beside it, energy is 1-5, every slug in `projects[]` resolves to a real `projects/<slug>/project.md`, `minutes` keys are a subset of `projects[]` with whole-number values, every blocker has a kebab-case `id`, and shipped items name a declared project and say what.

**Why it fails loud:** a mistyped slug does not error anywhere else in the system. It silently removes that day from adherence counting, which is the one number everything else rests on. The review would then be confidently wrong, in voice, with a date attached.

Runs as step 0 of the weekly. Violations are reported *in* the review as findings, not swallowed.

## lint-review.sh

`./_system/scripts/lint-review.sh <review.md> [...]`

Checks a produced review against the Prohibited list in `../review-rubric.md`.

**Errors** (fail the run): softeners on missed days, the reassurance reflex, therapy-speak, praise for attendance, "but who's counting", relatability filler, exclamation marks, emoji, empty `inputs_read`, missing frontmatter keys, missing required sections.

**Warnings** (print, still pass): more than one bullet in the decision section, vague quantities where the rubric wants a number ("forever", "for months"), and fewer than five date or count tokens in the whole review.

Quoted entry text belongs in a blockquote (`>`) or a code fence. Both are exempt from phrase checks, which is the only way to quote your own softener back at you without the linter rejecting the review for it.

**Why it exists:** a model grading its own tone is the weakest link here. Softeners and praise-for-attendance are what the friend voice produces unprompted, and they are exactly what makes the review worthless. This is the one part of the rubric that is enforced rather than requested.

## Wiring the Sunday run

Schedule at 08:00 Sunday. Never before 04:00: the journal day runs 04:00 to 04:00, so Saturday's entry is not sealed until then and an early run would score it as skipped.

```bash
cd /path/to/your/journal
./_system/scripts/check-entries.sh || echo "schema violations above: the review must report these as findings"
claude -p "Run the weekly review. Read reviews/01_weekly/CONTEXT.md and follow it exactly."
./_system/scripts/lint-review.sh reviews/01_weekly/output/$(date -v-1d +%Y-W%V).md
```

`check-entries` is advisory to the run and does not block it: a malformed entry is itself something the review should say out loud. `lint-review` runs after and is not advisory. A review that fails it does not count as written.

## Maintaining the phrase list

When a review slips something past the linter, add the phrase to `lint-review.sh` rather than to the rubric prose. The rubric states the principle; this script holds the specific strings. That split is deliberate: the strings will drift with the slang, the principle will not.
