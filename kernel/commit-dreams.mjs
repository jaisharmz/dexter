#!/usr/bin/env node
// Commits what the nightly consolidation wrote. OpenClaw's memory-core runs the consolidation as a
// cron job of its own at 3 AM ("Memory Dreaming Promotion"), which writes DREAMS.md,
// memory/dreaming/{light,deep,rem}/<day>.md and memory/.dreams/session-corpus/ and commits none of
// it, so two weeks of it once sat uncommitted. memory-core manages that job and would
// put back any change to it, so the commit is a job of its own: kernel/jobs/commit-dreams.sh at
// 4 AM, which ./setup schedules.
//
//   node kernel/commit-dreams.mjs              commit those paths and nothing else, then push
//   node kernel/commit-dreams.mjs --dry-run    print the files and the message, and change nothing
//   node kernel/commit-dreams.mjs --no-push    commit without pushing
//
// The commit names only those paths, so whatever another session has staged or left dirty stays as
// it was. The message says what the night found, read from the night's own notes. A push the
// remote refuses leaves the commit for the next push and exits 1, so the job shows the error.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PATHS = ["DREAMS.md", "memory/dreaming", "memory/.dreams"];
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOTES = /^memory\/dreaming\/(?:light|deep|rem)\/(\d{4}-\d{2}-\d{2})\.md$/;

const git = (root, args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const read = (root, file) => (existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : "");

// Sessions share this checkout's index, so a held index.lock means wait and try again.
const retrying = (fn, pause, tries = 10) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return fn();
    } catch (err) {
      if (attempt >= tries || !/index\.lock/.test(String(err.stderr ?? err.message))) throw err;
      pause(2000);
    }
  }
};

// The consolidation's own changes: edits, deletions and new files under PATHS, and nothing else.
export const changed = (root) => {
  const entries = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...PATHS]).split("\0").filter(Boolean);
  const files = [];
  for (let i = 0; i < entries.length; i++) {
    files.push(entries[i].slice(3));
    if (/[RC]/.test(entries[i].slice(0, 2))) i++; // a rename's old path is the next field
  }
  return files;
};

// A merge or rebase in progress, or a detached HEAD, belongs to whoever started it.
const midOperation = (root) => {
  const gitDir = (name) => resolve(root, git(root, ["rev-parse", "--git-path", name]).trim());
  if (["MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD"].some((name) => existsSync(gitDir(name)))) return "a merge or rebase is in progress";
  try {
    git(root, ["symbolic-ref", "-q", "HEAD"]);
  } catch {
    return "HEAD is detached";
  }
  return null;
};

const day = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const some = (n, word) => (n ? `${n} ${word}${n === 1 ? "" : "s"}` : `no ${word}s`);

// What the night found, from its notes: candidates light sleep staged, how many deep sleep ranked
// and promoted into MEMORY.md, and any lasting truths REM sleep named.
export const message = (root, files) => {
  const nights = [...new Set(files.map((file) => file.match(NOTES)?.[1]).filter(Boolean))].sort();
  if (!nights.length) {
    const corpus = files.filter((file) => file.startsWith("memory/.dreams/session-corpus/")).length;
    return `The nightly consolidation added ${some(corpus, "session-corpus file")}${files.includes("DREAMS.md") ? " and a dream diary entry" : ""}`;
  }
  let staged = 0, ranked = 0, promoted = 0, truths = 0;
  for (const night of nights) {
    staged += (read(root, `memory/dreaming/light/${night}.md`).match(/^- Candidate:/gm) ?? []).length;
    const deep = read(root, `memory/dreaming/deep/${night}.md`);
    ranked += Number(deep.match(/Ranked (\d+) candidate/)?.[1] ?? 0);
    promoted += Number(deep.match(/Promoted (\d+) candidate/)?.[1] ?? 0);
    const lasting = read(root, `memory/dreaming/rem/${night}.md`).split(/^### Possible Lasting Truths\s*$/m)[1]?.split(/^#{1,3} /m)[0] ?? "";
    truths += (lasting.match(/^- (?!No strong)/gm) ?? []).length;
  }
  const when = nights.length === 1 ? `consolidation of ${day(nights[0])}` : `consolidations of ${day(nights[0])} to ${day(nights.at(-1))}`;
  return `The nightly ${when} staged ${some(staged, "candidate")}, ranked ${ranked || "none"} and promoted ${promoted || "none"} into MEMORY.md`
    + (truths ? `, and named ${some(truths, "possible lasting truth")}` : "");
};

// A night still being written waits a minute at a time, up to maxWaits, for its files to go still.
const busy = (root, files, quietMs, now) => files.some((file) => {
  try {
    return now() - statSync(join(root, file)).mtimeMs < quietMs;
  } catch {
    return false;
  }
});

export const commitDreams = (root = ROOT, { dryRun = false, push = true, quietMs = 120_000, waitMs = 60_000, maxWaits = 15, now = Date.now, pause = sleep } = {}) => {
  let files = changed(root);
  for (let waits = 0; files.length && waits < maxWaits && busy(root, files, quietMs, now); waits++) {
    pause(waitMs);
    files = changed(root);
  }
  if (!files.length) return { files, committed: false };
  const text = message(root, files);
  const skipped = midOperation(root);
  if (dryRun || skipped) return { files, message: text, committed: false, ...(skipped && { skipped }) };
  retrying(() => git(root, ["add", "--", ...files]), pause);
  retrying(() => git(root, ["commit", "--quiet", "-m", text, "--", ...files]), pause);
  const commit = git(root, ["rev-parse", "--short", "HEAD"]).trim();
  if (!push) return { files, message: text, committed: true, commit };
  try {
    git(root, ["push", "--quiet"]);
    return { files, message: text, committed: true, commit, pushed: true };
  } catch (err) {
    return { files, message: text, committed: true, commit, pushed: false, error: String(err.stderr || err.message).trim() };
  }
};

const invoked = () => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (invoked()) {
  const args = process.argv.slice(2);
  const result = commitDreams(ROOT, { dryRun: args.includes("--dry-run"), push: !args.includes("--no-push") });
  if (!result.files.length) console.log("commit-dreams: nothing to commit");
  else if (result.skipped) console.log(`commit-dreams: left ${result.files.length} file(s) for tomorrow, because ${result.skipped}`);
  else if (!result.committed) console.log(`commit-dreams: would commit ${result.files.length} file(s) as "${result.message}"\n  ${result.files.join("\n  ")}`);
  else console.log(`commit-dreams: ${result.commit} ${result.message}`);
  if (result.pushed === false) {
    console.error(`commit-dreams: the push was refused, so ${result.commit} waits for the next push: ${result.error}`);
    process.exitCode = 1;
  }
}
