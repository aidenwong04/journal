#!/usr/bin/env bash
# Validate entry files against _system/entry-schema.md.
# Usage:  check-entries.sh [file ...]      (default: every entry under entries/)
# Exit 0 = clean, 1 = at least one violation.
#
# Runs as step 0 of the weekly review. A violation here silently corrupts adherence
# counting, which is the one number the whole system rests on, so it fails loud.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
errors=0

# Normalise the YAML frontmatter of one file into flat key=value lines.
# Handles the shapes entry-schema.md actually permits: scalars, [a, b], {k: v},
# block lists of maps, and block maps. Not a general YAML parser and does not
# pretend to be one.
normalise() {
  awk '
    function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
    function unquote(s) {
      if (s ~ /^".*"$/ || s ~ /^'"'"'.*'"'"'$/) s = substr(s, 2, length(s) - 2)
      return s
    }
    function emit_inline(key, val,   n, parts, i, kv) {
      if (val == "[]" || val == "{}" || val == "" || val == "null" || val == "~") return
      if (val ~ /^\[.*\]$/) {
        val = substr(val, 2, length(val) - 2)
        n = split(val, parts, ",")
        for (i = 1; i <= n; i++) if (trim(parts[i]) != "") print key "[]=" unquote(trim(parts[i]))
        return
      }
      if (val ~ /^\{.*\}$/) {
        val = substr(val, 2, length(val) - 2)
        n = split(val, parts, ",")
        for (i = 1; i <= n; i++) {
          if (trim(parts[i]) == "") continue
          split(parts[i], kv, ":")
          print key "." trim(kv[1]) "=" unquote(trim(kv[2]))
        }
        return
      }
      print key "=" unquote(val)
    }
    BEGIN { seen = 0; infm = 0; cur = ""; idx = 0; islist = 0 }
    /^---[ \t]*$/ {
      if (!seen) { seen = 1; infm = 1; next }
      else if (infm) { infm = 0; exit }
    }
    infm {
      line = $0
      sub(/[ \t]+#.*$/, "", line)          # trailing comment, not a bare #
      if (trim(line) == "") next
      match(line, /^[ ]*/); ind = RLENGTH
      s = substr(line, ind + 1)

      if (ind == 0) {
        if (match(s, /^[A-Za-z_][A-Za-z0-9_-]*:/)) {
          cur = substr(s, 1, RLENGTH - 1)
          val = trim(substr(s, RLENGTH + 1))
          idx = 0; islist = 0
          if (val != "") emit_inline(cur, val)
        }
        next
      }

      if (cur == "") next

      if (s ~ /^-[ \t]/) {                  # new list element
        islist = 1; idx++
        s = trim(substr(s, 2))
        if (match(s, /^[A-Za-z_][A-Za-z0-9_-]*:/)) {
          k = substr(s, 1, RLENGTH - 1)
          v = trim(substr(s, RLENGTH + 1))
          if (v != "" && v != "null" && v != "~") print cur "#" idx "." k "=" unquote(v)
        } else if (trim(s) != "") {
          print cur "[]=" unquote(trim(s))  # plain scalar list item
        }
        next
      }

      if (match(s, /^[A-Za-z_][A-Za-z0-9_-]*:/)) {
        k = substr(s, 1, RLENGTH - 1)
        v = trim(substr(s, RLENGTH + 1))
        if (v == "" || v == "null" || v == "~") next
        if (islist) print cur "#" idx "." k "=" unquote(v)
        else        print cur "." k "=" unquote(v)
      }
    }
  ' "$1"
}

fail() { printf '%s: %s\n' "$1" "$2" >&2; errors=$((errors + 1)); }

check_file() {
  local f="$1" norm base stem date type corrects source energy n
  base="$(basename "$f")"
  stem="${base%.md}"

  # Transcripts are not entries. Skip them even when passed explicitly, so that
  # a glob on the command line behaves the same as the default scan.
  case "$base" in *.transcript.md) return ;; esac

  if ! head -1 "$f" | grep -q '^---[[:space:]]*$'; then
    fail "$f" "no YAML frontmatter (first line must be ---)"
    return
  fi

  norm="$(normalise "$f")"
  get()  { printf '%s\n' "$norm" | grep "^$1=" | head -1 | cut -d= -f2-; }
  keys() { printf '%s\n' "$norm" | grep "^$1" | sed -E "s/^$2//" | cut -d= -f1; }

  date="$(get date)"
  [ -n "$date" ] || fail "$f" "missing required field: date"
  if [ -n "$date" ] && ! printf '%s' "$date" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
    fail "$f" "date is not ISO YYYY-MM-DD: '$date'"
  fi
  if [ -n "$date" ] && [ "$date" != "$stem" ]; then
    fail "$f" "filename does not match date: file says '$stem', frontmatter says '$date'"
  fi

  type="$(get type)"
  case "${type:-entry}" in
    entry) ;;
    correction)
      corrects="$(get corrects)"
      if [ -z "$corrects" ]; then
        fail "$f" "type: correction requires a corrects: date"
      elif ! printf '%s' "$corrects" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
        fail "$f" "corrects is not an ISO date: '$corrects'"
      elif [ ! -f "$(dirname "$f")/../../${corrects%%-*}/$(printf '%s' "$corrects" | cut -d- -f2)/$corrects.md" ] \
        && [ -z "$(find "$ROOT/entries" -name "$corrects.md" -print -quit 2>/dev/null)" ]; then
        fail "$f" "corrects points at '$corrects', which has no entry file"
      fi
      ;;
    *) fail "$f" "type must be entry or correction, got '$type'" ;;
  esac

  source="$(get source)"
  case "${source:-typed}" in
    typed) ;;
    voice)
      [ -f "$(dirname "$f")/$stem.transcript.md" ] || \
        fail "$f" "source: voice but no $stem.transcript.md beside it (the transcript is not optional)"
      ;;
    *) fail "$f" "source must be typed or voice, got '$source'" ;;
  esac

  energy="$(get energy)"
  if [ -z "$energy" ]; then
    fail "$f" "missing required field: energy"
  elif ! printf '%s' "$energy" | grep -Eq '^[1-5]$'; then
    fail "$f" "energy must be a whole number 1-5, got '$energy'"
  fi

  # Every declared project must exist as a folder.
  while IFS= read -r slug; do
    [ -n "$slug" ] || continue
    [ -f "$ROOT/projects/$slug/project.md" ] || \
      fail "$f" "projects[] names '$slug', but projects/$slug/project.md does not exist"
  done <<EOF
$(printf '%s\n' "$norm" | grep '^projects\[\]=' | cut -d= -f2-)
EOF

  # minutes keys must be a subset of projects[], values positive integers.
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    k="${line%%=*}"; k="${k#minutes.}"
    v="${line#*=}"
    printf '%s\n' "$norm" | grep -qx "projects\[\]=$k" || \
      fail "$f" "minutes has '$k', which is not in projects[] (a typo here silently drops the day)"
    printf '%s' "$v" | grep -Eq '^[0-9]+$' || \
      fail "$f" "minutes.$k is not a whole number: '$v'"
  done <<EOF
$(printf '%s\n' "$norm" | grep '^minutes\.')
EOF

  # Blocker ids: required, kebab-case, and any project they name must be declared.
  n="$(printf '%s\n' "$norm" | grep -c '^blockers#[0-9]*\.' || true)"
  if [ "$n" -gt 0 ]; then
    for i in $(printf '%s\n' "$norm" | grep -o '^blockers#[0-9]*' | sort -u | cut -d'#' -f2); do
      id="$(printf '%s\n' "$norm" | grep "^blockers#$i\.id=" | cut -d= -f2-)"
      if [ -z "$id" ]; then
        fail "$f" "blockers[$i] has no id (the id is the recurrence key; without it the blocker is invisible to the review)"
      elif ! printf '%s' "$id" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$'; then
        fail "$f" "blocker id '$id' is not kebab-case"
      fi
      bp="$(printf '%s\n' "$norm" | grep "^blockers#$i\.project=" | cut -d= -f2-)"
      if [ -n "$bp" ]; then
        printf '%s\n' "$norm" | grep -qx "projects\[\]=$bp" || \
          fail "$f" "blockers[$i].project is '$bp', which is not in projects[]"
      fi
    done
  fi

  # Shipped items must name a declared project and say what.
  for i in $(printf '%s\n' "$norm" | grep -o '^shipped#[0-9]*' | sort -u | cut -d'#' -f2); do
    sp="$(printf '%s\n' "$norm" | grep "^shipped#$i\.project=" | cut -d= -f2-)"
    sw="$(printf '%s\n' "$norm" | grep "^shipped#$i\.what=" | cut -d= -f2-)"
    if [ -n "$sp" ]; then
      printf '%s\n' "$norm" | grep -qx "projects\[\]=$sp" || \
        fail "$f" "shipped[$i].project is '$sp', which is not in projects[]"
    else
      fail "$f" "shipped[$i] has no project"
    fi
    [ -n "$sw" ] || fail "$f" "shipped[$i] has no what"
  done
}

if [ "$#" -gt 0 ]; then
  files=("$@")
else
  if [ ! -d "$ROOT/entries" ]; then
    echo "no entries/ directory at $ROOT" >&2
    exit 0
  fi
  # shellcheck disable=SC2207
  files=($(find "$ROOT/entries" -name '*.md' ! -name '*.transcript.md' ! -name 'CONTEXT.md' | sort))
fi

if [ "${#files[@]}" -eq 0 ]; then
  echo "check-entries: no entry files yet, nothing to validate"
  exit 0
fi

for f in "${files[@]}"; do
  check_file "$f"
done

if [ "$errors" -gt 0 ]; then
  printf '\ncheck-entries: %d violation(s) across %d file(s)\n' "$errors" "${#files[@]}" >&2
  exit 1
fi

printf 'check-entries: %d file(s) clean\n' "${#files[@]}"
