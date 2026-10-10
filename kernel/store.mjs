// JSON files that more than one process writes: the queue (var/queue/items.json) and the session
// registry (var/sessions/registry.json). Every write is lock, read, change, write whole, unlock, so
// a drag on the board and a `pqueue done` from a session at the same moment both land.
//
// The discipline is an operating system's: a TSET mutex made of mkdir, and a commit that is a
// rename, so a reader sees the old file or the new one and never half of either.
// kernel/queue.mjs, which dexter ships, writes the same queue file without this lock.

import { appendFileSync, closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";

// A checkout made with `git worktree add` (a spawn_task chip starts its session in one) has its own
// copy of every tracked file, the queue included. The live queue and the session registry are the
// main checkout's, so a worktree resolves to that. A plain checkout, or a copy with no git, is its own.
export const sharedRoot = (root) => {
  try {
    if (statSync(join(root, ".git")).isDirectory()) return root;
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return dirname(common.trim());
  } catch {
    return root;
  }
};

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
};

const readHolder = (dir) => {
  try {
    return JSON.parse(readFileSync(join(dir, "holder"), "utf8"));
  } catch {
    return null;
  }
};

// A lock whose holder died, or that has been held for a minute, is stale: writes take
// milliseconds. A lock dir with no holder file yet is one being taken right now, unless it is old.
const reapStale = (dir) => {
  const holder = readHolder(dir);
  try {
    const age = Date.now() - statSync(dir).mtimeMs;
    const stale = holder ? !alive(holder.pid) || age > 60000 : age > 2000;
    if (stale) rmSync(dir, { recursive: true, force: true });
  } catch {}
};

// TSET: mkdir either creates the directory or fails, atomically. Release removes the lock only if
// it is still ours, so a holder that was reaped as stale cannot free the next holder's lock.
export const lock = (path, timeoutMs = 10000) => {
  const dir = `${path}.lock`;
  const token = randomBytes(6).toString("hex");
  mkdirSync(dirname(path), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      mkdirSync(dir);
      writeFileSync(join(dir, "holder"), JSON.stringify({ pid: process.pid, token, at: new Date().toISOString() }));
      return () => {
        if (readHolder(dir)?.token === token) rmSync(dir, { recursive: true, force: true });
      };
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
    reapStale(dir);
    if (Date.now() > deadline) throw new Error(`${path} is locked (${dir}); is another writer stuck?`);
    sleep(15 + Math.random() * 20);
  }
};

// A missing file is an empty store. A file that does not parse is a loud error, never an empty
// store: treating it as empty would overwrite the queue with nothing on the next write.
export const readJson = (path, empty) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return structuredClone(empty);
    throw new Error(`${path} could not be read: ${err.message}`);
  }
};

export const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  const fd = openSync(temp, "w");
  try {
    writeSync(fd, JSON.stringify(value, null, 2) + "\n");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temp, path);
};

// The one way to change a shared file: fn receives the current contents and mutates them in place.
export const transact = (path, empty, fn) => {
  const release = lock(path);
  try {
    const value = readJson(path, empty);
    const result = fn(value);
    writeJson(path, value);
    return result;
  } finally {
    release();
  }
};

// Append-only logs. One short line per write, which POSIX appends without interleaving.
export const appendLine = (path, entry) => {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
};
