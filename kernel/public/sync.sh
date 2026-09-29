#!/bin/sh
# Build the public mirror of intel, gate it for leaks, and stage it in a sibling clone.
# The protocol, and what counts as a significant change: kernel/public/README.md.
#
#   sh kernel/public/sync.sh status           what changed on mirrored paths since the last mirror
#   sh kernel/public/sync.sh build            export HEAD into the clone and run the leak gate
#   sh kernel/public/sync.sh commit "<msg>"   build, then commit in the clone (still local)
#   sh kernel/public/sync.sh push             gate every unpushed commit, then push. This is
#                                             publishing: run it only after Jai says yes.
#   sh kernel/public/sync.sh hook             the one-line nudge kernel/hooks/post-commit prints
#   sh kernel/public/sync.sh gate <dir>       only the leak gate, over any directory
#
# Only committed, tracked files cross. The manifest is a list of git pathspecs, so a
# gitignored file (USER.md, home/, any state/, any *.csv) cannot reach the export
# whatever the manifest says. The private strings the gate hunts for, and the
# replacements made on the way out, live in home/public/, which this repo never
# carries. Without them nothing is built.
set -eu

_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=${_dir%/kernel/public}
PUB=${INTEL_PUBLIC:-$(dirname -- "$ROOT")/intel-public}
PRIV=$ROOT/home/public
OVERLAY=kernel/public/overlay
ZERO=000000000000000000

# Pathspecs carry globs that must reach git unexpanded, one per line.
set -f
IFS='
'

die() { printf 'public: %s\n' "$*" >&2; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
trap 'exit 130' INT TERM

specs() {
  sed -e 's/#.*//' -e 's/[[:space:]]*$//' -e 's/^[[:space:]]*//' "$_dir/manifest" |
  while read -r p; do
    case $p in
      '') ;;
      '!'*) printf ':(exclude,glob)%s\n' "${p#!}" ;;
      *) printf ':(glob)%s\n' "$p" ;;
    esac
  done
}
SPECS=$(specs)

need_private() {
  [ -f "$PRIV/denylist" ] && [ -f "$PRIV/redact.sed" ] ||
    die "no home/public/denylist and redact.sed on this machine. Half the gate is missing, so nothing is built."
}

# Files the overlay adds or replaces, as paths in the mirror.
overlay_files() {
  git -C "$ROOT" ls-tree -r --name-only HEAD -- "$OVERLAY" | sed "s#^$OVERLAY/##"
}

# Overlay files that stand in for a file intel also has, such as README.md. When
# intel's copy changes the mirror's does not, so status and the hook watch them.
shadowed() {
  for f in $(overlay_files); do
    if git -C "$ROOT" cat-file -e "HEAD:$f" 2>/dev/null; then printf '%s\n' "$f"; fi
  done
}

# Submodules the manifest names, as "<sha> <path>", pinned where HEAD pins them.
gitlinks() {
  _exported=$(git -C "$ROOT" ls-files -- $SPECS)
  git -C "$ROOT" ls-tree -r HEAD |
    awk -F'\t' '$1 ~ /^160000 commit / { split($1, a, " "); print a[3] " " $2 }' |
    while IFS=' ' read -r sha path; do
      if printf '%s\n' "$_exported" | grep -qxF "$path"; then printf '%s %s\n' "$sha" "$path"; fi
    done
}

# A pinned commit that no branch on the submodule's remote contains would break every
# public clone, so it fails the gate like a leak does.
check_pins() { # "<sha> <path>" lines on stdin
  _ok=0
  while IFS=' ' read -r sha path; do
    git -C "$ROOT/$path" fetch -q origin 2>/dev/null || true
    if [ -z "$(git -C "$ROOT/$path" branch -r --contains "$sha" 2>/dev/null)" ]; then
      printf 'gate: %s is pinned at %s, which no branch on its remote contains\n' "$path" "$sha"
      _ok=1
    fi
  done
  return $_ok
}

write_gitmodules() { # <dir>
  : > "$1/.gitmodules"
  for line in $(gitlinks); do
    path=${line#* }
    name=$(git -C "$ROOT" config --blob HEAD:.gitmodules --get-regexp '^submodule\..*\.path$' |
      awk -v p="$path" '$2 == p { sub(/^submodule\./, "", $1); sub(/\.path$/, "", $1); print $1 }')
    url=$(git -C "$ROOT" config --blob HEAD:.gitmodules --get "submodule.$name.url" |
      sed 's#^git@github\.com:#https://github.com/#')
    printf '[submodule "%s"]\n\tpath = %s\n\turl = %s\n' "$name" "$path" "$url" >> "$1/.gitmodules"
  done
  [ -s "$1/.gitmodules" ] || rm -f "$1/.gitmodules"
}

# HEAD's mirrored files, with the overlay laid over them.
export_tree() { # <dir>
  git -C "$ROOT" archive -o "$TMP/export.tar" HEAD -- $SPECS
  tar -xf "$TMP/export.tar" -C "$1"
  git -C "$ROOT" archive -o "$TMP/overlay.tar" "HEAD:$OVERLAY"
  mkdir -p "$TMP/overlay"
  tar -xf "$TMP/overlay.tar" -C "$TMP/overlay"
  cp -R "$TMP/overlay/." "$1/"
}

# Lines between two marker lines never leave: <!-- public:omit --> ... <!-- /public:omit -->,
# or the same with # or // in files where that is a comment. In markdown, the public
# wording can follow as an HTML comment that only the mirror shows: a line reading
# <!-- public:insert, the text, then a line reading -->. Every marker must be alone on
# its line, so prose that mentions one is left alone.
OMIT_AWK='
/^[ \t]*<!--[ \t]*public:insert[ \t]*$/ { if (skip || ins) { bad = "nested block at line " NR; exit } ins = 1; next }
ins && /^[ \t]*-->[ \t]*$/ { ins = 0; next }
ins { print; next }
/^[ \t]*(<!--|#|\/\/)[ \t]*public:omit[ \t]*(-->)?[ \t]*$/ { if (skip) { bad = "nested block at line " NR; exit } skip = 1; next }
/^[ \t]*(<!--|#|\/\/)[ \t]*\/public:omit[ \t]*(-->)?[ \t]*$/ { if (!skip) { bad = "stray close at line " NR; exit } skip = 0; next }
!skip { print }
END { if (bad != "" || skip || ins) { print (bad != "" ? bad : "unterminated block") > "/dev/stderr"; exit 3 } }
'

# Discord snowflakes become zeros. Twice, because two ids one character apart share
# the separator the first pass consumed.
GENERIC_SED="s/(^|[^0-9])[0-9]{17,20}([^0-9]|\$)/\\1$ZERO\\2/g"

scrub() { # <dir>
  find "$1" -type f | while read -r f; do
    grep -Iq . "$f" 2>/dev/null || continue
    if grep -qE 'public:(omit|insert)' "$f"; then
      awk "$OMIT_AWK" "$f" > "$f.omit" || die "unbalanced public:omit in ${f#"$1"/}"
      # A dropped block leaves the blank lines from both sides of it. Keep one.
      cat -s "$f.omit" > "$f.tmp"
      rm -f "$f.omit"
    else
      cp "$f" "$f.tmp"
    fi
    sed -E -e "$GENERIC_SED" -e "$GENERIC_SED" -f "$PRIV/redact.sed" "$f.tmp" > "$f"
    rm -f "$f.tmp"
  done
}

check() { # <label> <pattern> <allowed match, as a pattern over "path:line:match">
  _m=$(grep -rnoIE -e "$2" . | grep -vE -e "$3" || true)
  [ -z "$_m" ] || { printf 'gate: %s\n%s\n' "$1" "$_m" | cut -c1-220; _fail=1; }
}

# Prints every problem before failing, so one run shows the whole list.
gate() ( # <dir>
  _fail=0
  cd "$1"

  _bad=$(find . -type f \( -name '*.csv' -o -name '*.tsv' -o -name '*.db' -o -name '*.sqlite*' \
    -o -name '*.env' -o -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' \
    -o -name 'id_ed25519*' -o -name '*.p12' -o -name '*.pyc' -o -name '.DS_Store' \) -print)
  [ -z "$_bad" ] || { printf 'gate: data or key files\n%s\n' "$_bad"; _fail=1; }

  # Private strings, from home/public/denylist. "w:" lines match whole words only.
  grep -v -e '^[[:space:]]*#' -e '^[[:space:]]*$' "$PRIV/denylist" > "$TMP/deny" || true
  sed -n 's/^w://p' "$TMP/deny" > "$TMP/deny.words"
  grep -v '^w:' "$TMP/deny" > "$TMP/deny.any" || true
  _hits=$( { [ ! -s "$TMP/deny.any" ] || grep -rnIiF -f "$TMP/deny.any" . || true
             [ ! -s "$TMP/deny.words" ] || grep -rnIiwF -f "$TMP/deny.words" . || true; } )
  [ -z "$_hits" ] || { printf 'gate: denylisted strings\n%s\n' "$_hits" | cut -c1-220; _fail=1; }

  # Whole-line markers are gone by now. One that survived had company on its line, so
  # the text it was meant to hide is still here. Only the mechanism's own files name it.
  _near=$(grep -rnIE '(<!--|#|//)[[:space:]]*/?public:(omit|insert)' . | grep -v '^\./kernel/public/' || true)
  [ -z "$_near" ] || { printf 'gate: a public: marker that is not alone on its line\n%s\n' "$_near" | cut -c1-220; _fail=1; }

  # The shapes of private data, whatever the string.
  check 'email address' '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}' \
    ':(noreply@anthropic\.com|git@github\.com|[^:]*@example\.(com|org|net)|you@[^:]*)$'
  check 'IP address' '([0-9]{1,3}\.){3}[0-9]{1,3}' \
    ':(127\.0\.0\.1|0\.0\.0\.0|192\.168\.1\.100|100\.64\.0\.[12])$'
  check 'Discord id' '[0-9]{17,20}' ":$ZERO\$"
  check 'home directory' '(^|[^A-Za-z0-9_}])/(Users|home)/[A-Za-z0-9._-]+' ':.?/(Users|home)/you$'
  check 'phone number' '\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4}' '^$'
  check 'key or token' '(sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[MN][A-Za-z0-9]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,})' '^$'

  exit $_fail
)

remote_url() {
  if [ -n "${INTEL_PUBLIC_REMOTE:-}" ]; then printf '%s\n' "$INTEL_PUBLIC_REMOTE"; return; fi
  git -C "$ROOT" remote get-url origin | sed 's#intel\(\.git\)*$#intel-public.git#'
}

ensure_clone() {
  [ -d "$PUB/.git" ] && return 0
  _url=$(remote_url)
  if git ls-remote "$_url" >/dev/null 2>&1; then
    git clone -q "$_url" "$PUB"
  else
    git init -q -b main "$PUB"
    git -C "$PUB" remote add origin "$_url"
  fi
}

# Public commits publish their author's address. Use GitHub's noreply one.
noreply_author() {
  git -C "$PUB" config user.email 2>/dev/null | grep -q '@users\.noreply\.github\.com$' && return 0
  _nr=$(gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"' 2>/dev/null) ||
    die "set user.email in $PUB to your GitHub noreply address first; public commits carry it"
  git -C "$PUB" config user.email "$_nr"
}

last_mirrored() {
  [ -d "$PUB/.git" ] || return 0
  git -C "$PUB" log --format='%(trailers:key=Mirrored-from,valueonly)' 2>/dev/null |
    sed -n 's/^intel@//p' | head -n 1
}

cmd_status() {
  _last=$(last_mirrored)
  [ -n "$_last" ] || { echo "public: nothing mirrored into $PUB yet; 'build' starts it"; return 0; }
  git -C "$ROOT" cat-file -e "$_last^{commit}" 2>/dev/null ||
    die "the last mirror came from intel@$_last, which this repo does not have"
  _shadow=$(shadowed)
  printf 'public: last mirrored intel@%s, %s\n' "$_last" "$(git -C "$ROOT" log -1 --format=%cr "$_last")"
  _log=$(git -C "$ROOT" log --format='  %h %cs %s' "$_last..HEAD" -- $SPECS $_shadow)
  if [ -z "$_log" ]; then
    echo "  nothing the mirror carries has changed since"
  else
    printf '%s\n' "$_log"
    git -C "$ROOT" diff --stat=100 "$_last" HEAD -- $SPECS $_shadow
  fi
  for f in $_shadow; do
    git -C "$ROOT" diff --quiet "$_last" HEAD -- "$f" ||
      printf '  %s changed in intel. The mirror has its own copy: carry what matters into %s/%s by hand.\n' "$f" "$OVERLAY" "$f"
  done
  _exported=$(git -C "$ROOT" ls-files -- $SPECS)
  for s in $(git -C "$ROOT" diff --name-only --diff-filter=A "$_last" HEAD -- ':(glob)skills/*/SKILL.md'); do
    printf '%s\n' "$_exported" | grep -qxF "$s" ||
      printf '  new skill %s is not in the manifest. Add it if it runs every week, is not school, and works without personal data.\n' "${s%/SKILL.md}"
  done
}

cmd_build() {
  need_private
  STAGE=$TMP/stage
  mkdir -p "$STAGE"
  export_tree "$STAGE"
  scrub "$STAGE"
  write_gitmodules "$STAGE"
  _g=0
  gate "$STAGE" || _g=1
  gitlinks | check_pins || _g=1
  [ "$_g" = 0 ] || die "leak gate failed. $PUB was not touched."

  ensure_clone
  noreply_author
  rsync -a --delete --exclude '/.git' "$STAGE/" "$PUB/"
  git -C "$PUB" add -A
  for line in $(gitlinks); do
    git -C "$PUB" update-index --add --cacheinfo "160000,${line%% *},${line#* }"
  done
  printf 'public: built from intel@%s into %s. Leak gate clean.\n' "$(git -C "$ROOT" rev-parse --short HEAD)" "$PUB"
  git -C "$PUB" status --short | sed -n '1,60p'
  git -C "$PUB" diff --cached --shortstat
}

# A commit publishes its message, author and committer along with its files.
gate_commit_meta() { # <sha>
  mkdir -p "$TMP/meta/$1"
  git -C "$PUB" log -1 --format=%B "$1" > "$TMP/meta/$1/message"
  _m=0
  gate "$TMP/meta/$1" || _m=1
  for a in $(git -C "$PUB" log -1 --format='%ae%n%ce' "$1"); do
    case $a in
      *@users.noreply.github.com) ;;
      *) printf 'gate: the commit would publish the address %s\n' "$a"; _m=1 ;;
    esac
  done
  return $_m
}

cmd_commit() {
  [ -n "${1:-}" ] || die 'usage: sync.sh commit "<the finding, not the file touched>"'
  mkdir -p "$TMP/msg"
  printf '%s\n' "$1" > "$TMP/msg/message"
  need_private
  gate "$TMP/msg" || die "the commit message fails the leak gate"
  cmd_build
  if git -C "$PUB" diff --cached --quiet; then echo "public: nothing to commit"; return 0; fi
  printf '%s\n' "$1" |
    git -C "$PUB" commit -q -F - --trailer "Mirrored-from: intel@$(git -C "$ROOT" rev-parse --short HEAD)"
  git -C "$PUB" log -1 --format='public: committed %h %s'
}

cmd_push() {
  need_private
  [ -d "$PUB/.git" ] || die "no public clone at $PUB; run build first"
  [ -z "$(git -C "$PUB" status --porcelain)" ] || die "the clone has changes that are not committed; run commit first"
  git -C "$PUB" fetch -q origin 2>/dev/null || true
  if git -C "$PUB" rev-parse -q --verify origin/main >/dev/null; then _range=origin/main..HEAD; else _range=HEAD; fi
  _commits=$(git -C "$PUB" rev-list "$_range")
  [ -n "$_commits" ] || { echo "public: nothing to push"; return 0; }
  _g=0
  for c in $_commits; do
    mkdir -p "$TMP/check/$c"
    git -C "$PUB" archive -o "$TMP/check/$c.tar" "$c"
    tar -xf "$TMP/check/$c.tar" -C "$TMP/check/$c"
    if ! gate "$TMP/check/$c" > "$TMP/check/$c.log"; then
      git -C "$PUB" log -1 --format='in %h %s:' "$c"
      cat "$TMP/check/$c.log"
      _g=1
    fi
    git -C "$PUB" ls-tree -r "$c" |
      awk -F'\t' '$1 ~ /^160000 commit / { split($1, a, " "); print a[3] " " $2 }' | check_pins || _g=1
    gate_commit_meta "$c" || _g=1
  done
  [ "$_g" = 0 ] || die "leak gate failed on an unpushed commit. Nothing was pushed."
  git -C "$PUB" push -q -u origin HEAD:main
  printf 'public: pushed %s commit(s) to %s\n' "$(printf '%s\n' "$_commits" | wc -l | tr -d ' ')" "$(git -C "$PUB" remote get-url origin)"
}

cmd_hook() {
  [ -f "$PRIV/denylist" ] || return 0
  _shadow=$(shadowed)
  _n=$(git -C "$ROOT" diff-tree --root --no-commit-id --name-only -r HEAD -- $SPECS $_shadow | wc -l | tr -d ' ')
  _new=$(git -C "$ROOT" diff-tree --root --no-commit-id --name-only -r --diff-filter=A HEAD -- ':(glob)skills/*/SKILL.md' |
    sed -e 's#^skills/##' -e 's#/SKILL.md$##' | tr '\n' ' ')
  [ "$_n" -gt 0 ] || [ -n "$_new" ] || return 0
  _behind=''
  _last=$(last_mirrored)
  if [ -n "$_last" ] && git -C "$ROOT" cat-file -e "$_last^{commit}" 2>/dev/null; then
    _behind=", $(git -C "$ROOT" rev-list --count "$_last..HEAD" -- $SPECS $_shadow) commit(s) unmirrored"
  fi
  [ -z "$_new" ] || _new=", new skill: $_new"
  printf 'public mirror: this commit touches %s file(s) it carries%s%s. Significant? kernel/public/README.md\n' "$_n" "$_behind" "$_new"
}

case ${1:-status} in
  status) cmd_status ;;
  build) cmd_build ;;
  commit) cmd_commit "${2:-}" ;;
  push) cmd_push ;;
  hook) cmd_hook ;;
  gate) need_private; [ -d "${2:-}" ] || die "usage: sync.sh gate <dir>"; gate "$2" && echo "public: gate clean" ;;
  *) sed -n '4,11p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
