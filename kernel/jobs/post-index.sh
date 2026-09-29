#!/bin/sh
# Builds the ?? index from what is actually on disk, so it cannot drift from reality.
set -e

# Paths are derived from this script's own location, not baked in. Dexter now runs
# on two machines with different home directories; a literal /Users/you made
# every one of these jobs a silent no-op on the PC.
_job_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_job_dir%/kernel/jobs}

# Cron gets a login-shell PATH where a stale node shadows the current one, and
# `openclaw` refuses to start on it. See kernel/jobs/nodejs-path.sh.
. "$INTEL_ROOT/kernel/jobs/nodejs-path.sh"

cd "$INTEL_ROOT"

SKILLS=$(for d in skills/*/; do
  f="$d/SKILL.md"
  [ -f "$f" ] || continue
  n=$(grep -m1 '^name:' "$f" | sed 's/^name: *//')
  s=$(grep -m1 '^description:' "$f" | sed 's/^description: *//' | cut -c1-72)
  printf '  /%-20s %s…\n' "$n" "$s"
done)

LENSES=$(for f in kernel/guidelines/*.md; do
  n=$(grep -m1 '^name:' "$f" | sed 's/^name: *//')
  s=$(grep -m1 '^summary:' "$f" | sed 's/^summary: *//' | cut -c1-72)
  # if/elif rather than case: a ')' in a case pattern closes the enclosing $( )
  if [ "$n" = "software-abstraction" ]; then short="+abstraction"
  elif [ "$n" = "deslopification" ]; then short="+deslop"
  else short="+$n"
  fi
  printf '  %-21s %s\n' "$short" "$s"
done)

openclaw message send --channel discord --target "${1:-000000000000000000}" --pin -m "**\`??\` — everything you can call**

\`/\` does a thing · \`+\` adds a lens · stack as many \`+\` as you like

**Skills** — \`/papers world models\`
\`\`\`
$SKILLS
\`\`\`
**Lenses** — \`+deslop write me a summary\`
\`\`\`
$LENSES
\`\`\`
\`+autonomy\` and \`+throughput\` are always on. Drop a SKILL.md in \`intel/skills/\` or a fragment in \`kernel/guidelines/\` and it appears here — no registration."
