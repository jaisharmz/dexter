#!/bin/sh
# Puts a usable Node.js first on PATH. Sourced, never run directly.
#
#   . "$INTEL_ROOT/kernel/jobs/nodejs-path.sh"
#
# Not to be confused with kernel/ha/node.sh, which answers "which *machine* am I".
# This one answers "which node binary do I get".
#
# WHY THIS EXISTS. Cron runs jobs as `sh -lc`, which builds PATH from the system
# profile, not from the interactive shell the operator sees. On the Mac that PATH puts
# /usr/local/bin ahead of Homebrew, and /usr/local/bin/node is a root-owned Node
# 22.20.0 left over from Sep 2025. openclaw needs >=22.22.3, refuses to start, and
# exits 1. Every job that calls `openclaw` therefore died -- silently, because
# delivery on these jobs is "none". queue-digest burned 10 consecutive failures
# and got auto-disabled; the skill registry was at 9 and one run from the same.
#
# The obvious fixes are both wrong. Deleting the root-owned binary is a sudo
# change to a shared machine for the sake of one cron job. Hardcoding
# /opt/homebrew/bin re-introduces exactly the Mac-only assumption that made these
# scripts no-ops on the PC. So: look at what is actually installed on THIS
# machine and take the newest one.
#
# Newest rather than "first that satisfies openclaw's range" is deliberate --
# openclaw's supported range moves with its version, and a rule that has to be
# updated in lockstep with someone else's package.json will silently rot.

# Every node on PATH, then the usual install locations, so a machine whose PATH is
# missing the good node entirely can still be rescued. Globs that match nothing
# stay literal and simply fail the -x test below.
_njs_candidates() {
  _njs_ifs=$IFS
  IFS=:
  for _njs_d in $PATH; do
    [ -n "$_njs_d" ] && printf '%s\n' "$_njs_d/node"
  done
  IFS=$_njs_ifs
  for _njs_d in \
    /opt/homebrew/bin \
    /usr/local/bin \
    /usr/bin \
    "$HOME/.local/bin" \
    "$HOME/Library/pnpm" \
    "$HOME"/.nvm/versions/node/*/bin \
    "$HOME"/.volta/tools/image/node/*/bin \
    "$HOME"/.fnm/node-versions/*/installation/bin
  do
    printf '%s\n' "$_njs_d/node"
  done
}

# v26.8.1 -> 026008001, so versions compare correctly as plain integers and 26
# does not sort below 9. A build suffix like v26.8.1-rc.1 splits on the dash too.
_njs_version_key() {
  printf '%s' "${1#v}" | awk -F'[.-]' '{printf "%d%03d%03d", $1, $2, $3}'
}

_njs_best=""
_njs_best_key=0

for _njs_bin in $(_njs_candidates); do
  [ -x "$_njs_bin" ] || continue
  _njs_v=$("$_njs_bin" -v 2>/dev/null) || continue
  case "$_njs_v" in
    v[0-9]*) ;;
    *) continue ;;
  esac
  _njs_key=$(_njs_version_key "$_njs_v")
  case "$_njs_key" in
    ''|*[!0-9]*) continue ;;
  esac
  if [ "$_njs_key" -gt "$_njs_best_key" ]; then
    _njs_best_key=$_njs_key
    _njs_best=$_njs_bin
  fi
done

if [ -n "$_njs_best" ]; then
  PATH=$(dirname -- "$_njs_best"):$PATH
  export PATH
fi

unset _njs_bin _njs_v _njs_key _njs_best _njs_best_key _njs_d _njs_ifs
