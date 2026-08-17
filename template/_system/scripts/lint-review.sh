#!/usr/bin/env bash
# Check a produced review against the Prohibited list in _system/review-rubric.md.
# Usage:  lint-review.sh <review.md> [...]
# Exit 0 = clean, 1 = at least one violation.
#
# This exists because a model grading its own tone is the weakest link in the system.
# Softeners and praise-for-attendance are the two failures the friend voice produces
# on its own, unprompted, and they are the two that make the whole review worthless.
#
# ERRORS fail the run. WARNINGS print and pass: they are heuristics, not rules.

set -uo pipefail

errors=0
warnings=0

err()  { printf 'ERROR   %s:%s  %s\n' "$1" "$2" "$3" >&2; errors=$((errors + 1)); }
warn() { printf 'warning %s:%s  %s\n' "$1" "$2" "$3" >&2; warnings=$((warnings + 1)); }

# Body with frontmatter, fenced code, and blockquotes stripped, line numbers kept.
# Quoted entry text belongs in a blockquote; that is what makes it exempt.
body_lines() {
  awk '
    BEGIN { fm = 0; seen = 0; fence = 0 }
    /^---[ \t]*$/ { if (!seen) { seen = 1; fm = 1; print NR ":"; next }
                    else if (fm) { fm = 0; print NR ":"; next } }
    fm { print NR ":"; next }
    /^[ \t]*```/ { fence = !fence; print NR ":"; next }
    fence { print NR ":"; next }
    /^[ \t]*>/ { print NR ":"; next }
    { print NR ":" $0 }
  ' "$1"
}

# Phrase -> why it is banned. Matched case-insensitively on the stripped body.
# Delimiter is % because the patterns themselves contain | for alternation.
scan_phrases() {
  local f="$1" body="$2"
  while IFS='%' read -r pattern reason; do
    [ -n "$pattern" ] || continue
    # $body lines are already "NR:content", so take the number from the line itself
    # rather than from grep -n, which would number the stream a second time.
    printf '%s\n' "$body" | grep -iE "$pattern" | while IFS=: read -r ln rest; do
      printf '%s\t%s\t%s\n' "$ln" "$reason" "$rest"
    done
  done <<'PHRASES'
life happens%softener on a missed day
no worries%softener on a missed day
still (made|making) progress%softener on a missed day
weeks like (that|this) happen%softener on a missed day
(it|thats|that is|that's) (ok|okay|fine)%softener on a missed day
don'?t (be too )?(hard|harsh) on yourself%reassurance reflex
being so hard on yourself%reassurance reflex
be (gentle|kind) (with|to) yourself%reassurance reflex
rest is productive%reassurance reflex
you'?re still valid%reassurance reflex
(holding|hold) space%therapy-speak
honou?r your capacity%therapy-speak
listen to your body%therapy-speak
(proud of you|good job|well done|nice work)%praise for attendance
you showed up%praise for attendance
at least you%praise for attendance
(that|it) counts for something%praise for attendance
give yourself (credit|grace)%praise for attendance
but who'?s counting%banned by name: the review is counting
no because same%relatability where a date belongs
literally me%relatability where a date belongs
PHRASES
}

lint_file() {
  local f="$1" body ln reason rest count

  [ -f "$f" ] || { printf 'ERROR   %s  file not found\n' "$f" >&2; errors=$((errors + 1)); return; }

  body="$(body_lines "$f")"

  # --- Prohibited phrases -------------------------------------------------
  while IFS=$'\t' read -r ln reason rest; do
    [ -n "${ln:-}" ] || continue
    err "$f" "$ln" "$reason: $(printf '%s' "$rest" | sed 's/^[[:space:]]*//' | cut -c1-70)"
  done <<EOF
$(scan_phrases "$f" "$body")
EOF

  # --- Exclamation marks --------------------------------------------------
  while IFS=: read -r ln rest; do
    [ -n "${rest:-}" ] || continue
    err "$f" "$ln" "exclamation mark (quoting an entry? put it in a blockquote)"
  done <<EOF
$(printf '%s\n' "$body" | grep '!')
EOF

  # --- Emoji ---------------------------------------------------------------
  # 4-byte UTF-8 leads (emoji planes) plus the common BMP symbol/dingbat blocks.
  while IFS=: read -r ln rest; do
    [ -n "${rest:-}" ] || continue
    err "$f" "$ln" "emoji"
  done <<EOF
$(printf '%s\n' "$body" | LC_ALL=C grep -E $'\xF0\x9F|\xE2\x9C|\xE2\x9D|\xE2\xAD|\xE2\x9A|\xE2\x9C' || true)
EOF

  # --- Required frontmatter ------------------------------------------------
  for key in period generated tier inputs_read; do
    grep -q "^$key:" "$f" || err "$f" "1" "frontmatter missing '$key:'"
  done
  if grep -q '^inputs_read: *\[\] *$' "$f"; then
    err "$f" "1" "inputs_read is empty: the review is unauditable"
  fi

  # --- Required sections ---------------------------------------------------
  # Matched loosely: the rubric fixes the order and the job, not the exact wording.
  grep -qiE '^## .*(files say|record|what i saw)' "$f"        || err "$f" "1" "missing the record section"
  grep -qiE '^## .*(actually made|shipped|got made)' "$f"     || err "$f" "1" "missing the shipped section"
  grep -qiE '^## .*(in the way|blockers)' "$f"                || err "$f" "1" "missing the blockers section"
  grep -qiE '^## .*(story breaks|contradict|disagree)' "$f"   || err "$f" "1" "missing the contradictions section"
  grep -qiE '^## .*(doing next|decision)' "$f"                || err "$f" "1" "missing the decision section"
  grep -qiE '^## .*(inbox|proposals)' "$f"                    || err "$f" "1" "missing the proposals section"

  # --- One decision, not a menu -------------------------------------------
  count="$(awk '
    /^## /       { insec = ($0 ~ /doing next|[Dd]ecision/) }
    insec && /^[ \t]*[-*][ \t]/ { n++ }
    END { print n + 0 }
  ' "$f")"
  [ "$count" -le 1 ] || warn "$f" "-" "decision section has $count bullets: rubric rule 7 says one decision, not a menu"

  # --- Uncited vagueness ---------------------------------------------------
  while IFS=: read -r ln rest; do
    [ -n "${rest:-}" ] || continue
    warn "$f" "$ln" "vague quantity, rubric wants a number: $(printf '%s' "$rest" | sed 's/^[[:space:]]*//' | cut -c1-60)"
  done <<EOF
$(printf '%s\n' "$body" | grep -iE '\b(forever|ages|a while now|for months|constantly|always|never) \b')
EOF

  # --- Evidence density ----------------------------------------------------
  # Every review should be dense with dates. One with almost none is vibes.
  count="$(grep -coE '[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}-[0-9]{2}|\b[0-9]+ (min|minutes|days?|weeks?)\b' "$f" || true)"
  [ "$count" -ge 5 ] || warn "$f" "-" "only $count date/count tokens in the whole review: rubric rule 5 wants evidence on every claim"
}

if [ "$#" -eq 0 ]; then
  echo "usage: lint-review.sh <review.md> [...]" >&2
  exit 2
fi

for f in "$@"; do
  lint_file "$f"
done

if [ "$errors" -gt 0 ]; then
  printf '\nlint-review: %d error(s), %d warning(s). Review rejected.\n' "$errors" "$warnings" >&2
  exit 1
fi

printf 'lint-review: clean (%d warning(s))\n' "$warnings"
