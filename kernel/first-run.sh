#!/bin/sh
# Claude Code runs this at every session start and before every prompt (.claude/settings.json),
# and whatever it prints reaches the agent ahead of the operator's message. The first-run steps
# in BOOTSTRAP.md were being read and then skipped when the first message asked for something
# else, such as a slash command, so while that file exists every turn opens with a reminder.
# Once the first run is done it prints nothing, except a once-a-session note at session start
# while the folder is still not the operator's own repository.
#   sh kernel/first-run.sh session    at session start
#   sh kernel/first-run.sh prompt     before each prompt
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" 2>/dev/null || exit 0
when=${1:-prompt}

# Not yet the operator's own repository: no git at all, origin still the public dexter, or no
# upstream remote, which is what a GitHub fork (always public) or a zip download leaves.
own=yes
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then own=no
elif git remote get-url origin 2>/dev/null | grep -Eq 'github\.com[:/]jaisharmz/dexter(\.git)?/?$'; then own=no
elif ! git remote get-url upstream >/dev/null 2>&1; then own=no
fi

if [ -f BOOTSTRAP.md ]; then
  cat <<'MSG'
FIRST RUN NOT DONE: BOOTSTRAP.md exists. Before you act on this message, whatever it asks,
including a slash command or a skill, read BOOTSTRAP.md and do its steps in order, then come
back to the request. If the operator says the request is urgent, do it first, then say in one
line that the first run is still pending and finish it right after. Steps 5 (./setup local)
and 6 (the operator's own private repository) are the ones that must not be skipped.
MSG
  [ "$own" = no ] && echo "This folder is not the operator's own private repository yet (BOOTSTRAP.md step 6)."
elif [ "$when" = session ] && [ "$own" = no ]; then
  echo "Note: this folder is not the operator's own private repository yet. Offer once, in one line, to fix it as BOOTSTRAP.md step 6 described (./setup doctor prints the commands)."
fi
exit 0
