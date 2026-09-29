#!/usr/bin/env bash
# skill-learn — keep skills correctable. See kernel/skill-learning.md for the protocol.
#
#   skill-learn record <skill> "<lesson>"   append a dated lesson to skills/<skill>/LEARNED.md
#   skill-learn show <skill>                print that skill's lessons
#   skill-learn list                        every skill, with how many active lessons it has
#   skill-learn sync [--check]              add the `## Learning` footer to any SKILL.md missing it

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS="$ROOT/skills"
MARKER='<!-- skill-learning -->'
TODAY="$(date +%F)"

die() { printf '%s\n' "$*" >&2; exit 1; }

skill_dir() {
  local d="$SKILLS/$1"
  [ -f "$d/SKILL.md" ] || die "no skill '$1' (expected $d/SKILL.md). Have: $(ls "$SKILLS" | tr '\n' ' ')"
  printf '%s' "$d"
}

footer() {
  local name="$1"
  cat <<EOF

## Learning

<!-- skill-learning -->
\`LEARNED.md\` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record $name "<what to do differently>"

\`kernel/skill-learning.md\` is the protocol: what counts, what belongs in \`state/\` or
\`USER.md\` instead, and when a lesson graduates from the sidecar into this file.
EOF
}

cmd_record() {
  [ $# -ge 2 ] || die 'usage: skill-learn record <skill> "<lesson>"'
  local name="$1"; shift
  local dir; dir="$(skill_dir "$name")"
  local f="$dir/LEARNED.md"

  if [ ! -f "$f" ]; then
    cat > "$f" <<EOF
# Learned — $name

Corrections this skill has earned in use. Read before running it; these override
\`SKILL.md\`. Protocol: \`kernel/skill-learning.md\`.

EOF
  fi
  printf -- '- **%s** — %s\n' "$TODAY" "$*" >> "$f"
  printf 'recorded → %s\n' "${f#$ROOT/}"
}

cmd_show() {
  [ $# -ge 1 ] || die 'usage: skill-learn show <skill>'
  local f; f="$(skill_dir "$1")/LEARNED.md"
  [ -f "$f" ] || { printf '%s has learned nothing yet.\n' "$1"; return 0; }
  cat "$f"
}

cmd_list() {
  local d name f n
  for d in "$SKILLS"/*/; do
    [ -f "${d%/}/SKILL.md" ] || continue
    name="$(basename "$d")"; f="${d%/}/LEARNED.md"; n=0
    if [ -f "$f" ]; then
      n="$(grep -c '^- \*\*[0-9]' "$f" || true)"
      n="$(( n - $(grep -c 'retired [0-9]' "$f" || true) ))"
    fi
    local hook=""
    grep -qF "$MARKER" "${d%/}/SKILL.md" || hook="   (no footer — run: sync)"
    printf '%-20s %3s lesson(s)%s\n' "$name" "$n" "$hook"
  done
}

cmd_sync() {
  local check=0; [ "${1:-}" = "--check" ] && check=1
  local d s missing=0
  for d in "$SKILLS"/*/; do
    s="${d%/}/SKILL.md"
    [ -f "$s" ] || continue
    grep -qF "$MARKER" "$s" && continue
    missing=$((missing + 1))
    if [ "$check" = 1 ]; then
      printf 'missing footer: %s\n' "${s#$ROOT/}"
    else
      footer "$(basename "$d")" >> "$s"
      printf 'footer added: %s\n' "${s#$ROOT/}"
    fi
  done
  [ "$missing" = 0 ] && printf 'every skill carries the learning footer.\n'
  return 0
}

case "${1:-}" in
  record) shift; cmd_record "$@" ;;
  show)   shift; cmd_show "$@" ;;
  list)   shift; cmd_list "$@" ;;
  sync)   shift; cmd_sync "$@" ;;
  *) sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
esac
