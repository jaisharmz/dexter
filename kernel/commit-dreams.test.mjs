// node --test kernel/commit-dreams.test.mjs
// Each test makes its own repo with a bare remote in a temp dir, writes a night of consolidation
// output beside another session's unfinished work, and checks what the commit took and left.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { commitDreams, message } from "./commit-dreams.mjs";

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const put = (root, file, text) => {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
};
const still = { now: () => Date.now() + 3_600_000, pause: () => {} };

const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), "commit-dreams-"));
  git(dir, "init", "--quiet", "--bare", "remote.git");
  const work = join(dir, "work");
  git(dir, "clone", "--quiet", join(dir, "remote.git"), "work");
  git(work, "config", "user.email", "test@example.com");
  git(work, "config", "user.name", "Test");
  put(work, "DREAMS.md", "# Dream Diary\n");
  put(work, "memory/2026-10-10.md", "# Oct 10\n");
  put(work, "notes.md", "notes\n");
  git(work, "add", ".");
  git(work, "commit", "--quiet", "-m", "start");
  git(work, "push", "--quiet", "-u", "origin", "HEAD");
  return { dir, work };
};

const night = (work, date, { candidates = 2, ranked = 3, promoted = 1, truths = ["The operator answers fastest in the morning."] } = {}) => {
  put(work, `memory/dreaming/light/${date}.md`, `# Light Sleep\n\n${Array.from({ length: candidates }, (_, i) => `- Candidate: fragment ${i}\n  - status: staged\n`).join("")}`);
  put(work, `memory/dreaming/deep/${date}.md`, `# Deep Sleep\n\n- Ranked ${ranked} candidate(s) for durable promotion.\n- Promoted ${promoted} candidate(s) into MEMORY.md.\n`);
  const lasting = truths.length ? truths.map((t) => `- ${t}\n`).join("") : "- No strong candidate truths surfaced.\n";
  put(work, `memory/dreaming/rem/${date}.md`, `# REM Sleep\n\n### Reflections\n- No strong patterns surfaced.\n\n### Possible Lasting Truths\n${lasting}`);
  put(work, `memory/.dreams/session-corpus/${date}.txt`, "corpus\n");
  appendFileSync(join(work, "DREAMS.md"), `\n*${date}*\n\nA dream.\n`);
};

test("it commits the night's own paths with what the night found, pushes, and leaves another session's work as it was", () => {
  const { dir, work } = repo();
  night(work, "2026-10-11");
  appendFileSync(join(work, "memory/2026-10-10.md"), "- another session's line\n");
  appendFileSync(join(work, "notes.md"), "staged by another session\n");
  git(work, "add", "notes.md");
  put(work, "scratch.txt", "untracked\n");

  const result = commitDreams(work, still);
  assert.equal(result.committed, true);
  assert.equal(result.pushed, true);
  assert.equal(git(work, "log", "-1", "--format=%s"), "The nightly consolidation of Oct 11 staged 2 candidates, ranked 3 and promoted 1 into MEMORY.md, and named 1 possible lasting truth");
  assert.deepEqual(git(work, "show", "--name-only", "--format=", "HEAD").split("\n").sort(), [
    "DREAMS.md",
    "memory/.dreams/session-corpus/2026-10-11.txt",
    "memory/dreaming/deep/2026-10-11.md",
    "memory/dreaming/light/2026-10-11.md",
    "memory/dreaming/rem/2026-10-11.md",
  ]);
  assert.equal(git(work, "diff", "--cached", "--name-only"), "notes.md", "what another session staged is still staged");
  assert.equal(git(work, "diff", "--name-only"), "memory/2026-10-10.md", "its dirty file is still dirty and unstaged");
  assert.match(git(work, "status", "--porcelain"), /^\?\? scratch\.txt$/m);
  assert.equal(git(join(dir, "remote.git"), "log", "-1", "--format=%h"), result.commit, "the remote has it");

  const again = commitDreams(work, still);
  assert.deepEqual(again, { files: [], committed: false }, "a second run finds nothing");
  rmSync(dir, { recursive: true, force: true });
});

test("several nights add up, and a quiet night says so", () => {
  const { dir, work } = repo();
  night(work, "2026-09-30", { candidates: 1, ranked: 0, promoted: 0, truths: [] });
  night(work, "2026-10-02", { candidates: 4, ranked: 2, promoted: 0, truths: [] });
  const files = commitDreams(work, { ...still, dryRun: true }).files;
  assert.equal(message(work, files), "The nightly consolidations of Sep 30 to Oct 2 staged 5 candidates, ranked 2 and promoted none into MEMORY.md");
  rmSync(dir, { recursive: true, force: true });
});

test("a dry run changes nothing, and a night with only corpus files still gets a message", () => {
  const { dir, work } = repo();
  put(work, "memory/.dreams/session-corpus/2026-10-11.txt", "corpus\n");
  appendFileSync(join(work, "DREAMS.md"), "\nA dream.\n");
  const head = git(work, "rev-parse", "HEAD");
  const result = commitDreams(work, { ...still, dryRun: true });
  assert.equal(result.committed, false);
  assert.equal(result.message, "The nightly consolidation added 1 session-corpus file and a dream diary entry");
  assert.equal(git(work, "rev-parse", "HEAD"), head);
  assert.equal(git(work, "diff", "--cached", "--name-only"), "", "a dry run stages nothing");
  rmSync(dir, { recursive: true, force: true });
});

test("a held index.lock is waited out, and files still being written are waited on", () => {
  const { dir, work } = repo();
  night(work, "2026-10-11");
  const lock = join(work, ".git/index.lock");
  writeFileSync(lock, "");
  const pauses = [];
  const result = commitDreams(work, {
    now: Date.now,
    quietMs: 3_600_000,
    maxWaits: 2,
    pause: (ms) => {
      pauses.push(ms);
      if (ms === 2000) rmSync(lock, { force: true });
    },
  });
  assert.equal(result.committed, true);
  assert.deepEqual(pauses, [60_000, 60_000, 2000], "two waits for the files to go still, then one for the lock");
  rmSync(dir, { recursive: true, force: true });
});

test("a refused push keeps the commit and reports it, and a rebase in progress is left alone", () => {
  const { dir, work } = repo();
  const other = join(dir, "other");
  git(dir, "clone", "--quiet", join(dir, "remote.git"), "other");
  git(other, "-c", "user.email=o@example.com", "-c", "user.name=O", "commit", "--quiet", "--allow-empty", "-m", "the remote moved on");
  git(other, "push", "--quiet", "origin", "HEAD");
  night(work, "2026-10-11");
  const result = commitDreams(work, still);
  assert.equal(result.committed, true);
  assert.equal(result.pushed, false);
  assert.match(result.error, /rejected|fetch first|non-fast-forward|failed to push/);
  assert.equal(git(work, "rev-parse", "--short", "HEAD"), result.commit);

  night(work, "2026-10-12");
  mkdirSync(join(work, ".git/rebase-merge"));
  const paused = commitDreams(work, still);
  assert.equal(paused.committed, false);
  assert.equal(paused.skipped, "a merge or rebase is in progress");
  assert.equal(git(work, "rev-parse", "--short", "HEAD"), result.commit, "nothing new was committed");
  rmSync(dir, { recursive: true, force: true });
});
