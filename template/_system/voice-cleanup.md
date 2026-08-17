# Voice cleanup

**Owner: the capture UI.** No review stage performs cleanup, and no review stage may alter an entry after capture. This file is the spec the UI implements; it exists before the UI does so that the UI has something to be built against.

Applies when `source: voice`.
Two files are produced and both are kept forever:

- `entries/YYYY/MM/YYYY-MM-DD.transcript.md` - verbatim, exactly as the recogniser returned it, no frontmatter beyond `date` and `source: voice`.
- `entries/YYYY/MM/YYYY-MM-DD.md` - the cleaned entry, full frontmatter per `entry-schema.md`.

The transcript is written first and is never touched again.
If cleanup goes wrong, the transcript is the ground truth to redo it from.

## Cleanup is lossless in substance

Allowed:
- Remove filler and disfluencies: "um", "uh", false starts, repeated words, "you know", trailing "right?".
- Fix recogniser errors in obvious proper nouns and technical terms.
- Insert sentence boundaries, paragraph breaks, and punctuation.
- Reorder a clause only where the speaker audibly self-corrected mid-sentence, keeping the corrected version.

Forbidden:
- Summarising, condensing, or "tightening" a passage.
- Dropping a tangent because it seems unrelated. Tangents are frequently the entry.
- Merging two separate complaints into one.
- Improving the reasoning, resolving a contradiction, or making the speaker sound more decided than they were.
- Adding anything not said, including transitions that imply a logical link the speaker did not make.

A hedge is content. A contradiction is content. Repetition of the same worry three times in one recording is content, and the review is entitled to notice it - so keep at least the fact of the repetition even when collapsing the exact words.

## Acceptance test

The UI is not finished until it passes this, and it is the test to run against any model or library doing the cleanup:

1. Every substantive claim in the transcript appears in the cleaned entry. Walk the transcript claim by claim and find each one.
2. Every hedge, contradiction, and repeated worry survives in some form. Collapsing three repetitions into one is allowed only if the entry still records that it was said more than once.
3. The cleaned entry is not dramatically shorter than the transcript. Substantial shrinkage means summarisation happened. Redo it.
4. Both files exist and both are on disk before the entry is considered captured. A cleaned entry with no transcript beside it is a bug, not a preference.

Run this test on real recordings, not on a sample paragraph. Cleanup fails on rambling, which is exactly the material that matters.
