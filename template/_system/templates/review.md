---
period: YYYY-Www          # or YYYY-MM, YYYY-Qn
generated: YYYY-MM-DD
tier: weekly              # weekly | monthly | quarterly
inputs_read: []           # exact paths, so the review is auditable
proposals_written: []     # exact paths under projects/*/_inbox/
corrections_upstream: []  # dates corrected here that belong to an already-reviewed period
---

# Period

Voice: `../review-rubric.md`. In voice throughout, including the decision.
Section order is fixed. Headings are the friend's wording; the canonical job of each is in the comment.

## what the files say
<!-- canonical: the record. Days committed vs entry files present, per project. Missing dates listed individually. Minutes. Nothing else. -->

## what you actually made
<!-- canonical: shipped. Only verifiable shipped[] items. If empty across the period, one sentence, then move on. -->

## what you said was in the way
<!-- canonical: blockers under test. Each id, days it appeared, what was attempted, and the verdict: real blocker, thing you've decided to live with, or not a blocker. -->

## where your story breaks
<!-- canonical: contradictions. Prose against frontmatter, intentions without minutes. Quote the entry, cite the date. -->

## corrections to earlier periods
<!-- OPTIONAL. Include only when a correction landed for a period that was already reviewed. State the original claim and the correction. Also list the dates in corrections_upstream: above, or the tier above will never see it. Omit this heading entirely when the list is empty. -->

## what you're doing next
<!-- canonical: the decision. One recommendation. The reason. What it costs. The best case against it, and why it stands anyway. -->

## stuff i left in your inbox
<!-- canonical: proposals written. Path per line, or "none". -->
