// node --test kernel/proc.test.mjs
// Each test works in its own temp dir, so nothing here touches this repo's var/run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquire, add, check, exit, LIMITS, load, ps, release, set, waitFor } from "./proc.mjs";

const fresh = () => mkdtempSync(join(tmpdir(), "proc-"));
const box = { known: false };
const roomy = { known: true, freeMemoryPct: 60, freeDiskMB: 9000 };

test("a spawn reserves a slot, then records its session id", () => {
  const root = fresh();
  add({ name: "probe", parent: "main", via: "routine", task: "probe-task" }, root, box);
  const row = set("probe", { pid: "local_1234abcd-0000", state: "running" }, root);
  assert.equal(row.state, "running");
  assert.equal(load(root).processes.length, 1);
  assert.equal(set("1234abcd", { state: "idle" }, root).name, "probe", "eight characters of a session id find the row");
});

test("two live processes cannot share a name, because sessions address each other by name", () => {
  const root = fresh();
  add({ name: "probe", parent: "main", via: "routine" }, root, box);
  assert.throws(() => add({ name: "probe", parent: "main", via: "routine" }, root, box), /already named/);
  set("probe", { state: "archived" }, root);
  add({ name: "probe", parent: "main", via: "routine" }, root, box);
});

test("a parent gets at most perParent live children, and a zombie still counts until it is archived", () => {
  const root = fresh();
  for (let i = 0; i < LIMITS.perParent; i++) add({ name: `w${i}`, parent: "main", via: "routine" }, root, box);
  assert.throws(() => add({ name: "one-more", parent: "main", via: "routine" }, root, box), (err) => err.exitCode === 3);
  exit("w0", { status: "ok", result: "pong" }, root);
  assert.equal(load(root).processes.find((p) => p.name === "w0").state, "done");
  assert.throws(() => add({ name: "one-more", parent: "main", via: "routine" }, root, box), /reap one first/);
  set("w0", { state: "archived" }, root);
  add({ name: "one-more", parent: "main", via: "routine" }, root, box);
});

test("memory and disk refuse a spawn with exit 4 when they are short", () => {
  const table = { processes: [], leases: {} };
  assert.equal(check(table, "main", roomy).ok, true);
  assert.equal(check(table, "main", { ...roomy, freeMemoryPct: 10 }).code, 4);
  assert.equal(check(table, "main", { ...roomy, freeDiskMB: 1500 }).code, 4);
  assert.equal(check(table, "main", box).ok, true, "an unknown machine is not refused");
});

test("a lease has one holder, renews for that holder, and frees itself when it expires", () => {
  const root = fresh();
  acquire("chrome", { holder: "a", purpose: "one form", ttl: "10m" }, root);
  assert.throws(() => acquire("chrome", { holder: "b" }, root), (err) => err.exitCode === 3 && /held by a/.test(err.message));
  acquire("chrome", { holder: "a", ttl: "10m" }, root);
  assert.throws(() => release("chrome", { holder: "b" }, root), /held by a/);
  assert.equal(release("chrome", { holder: "a" }, root), true);
  acquire("chrome", { holder: "b", ttl: "1s" }, root);
  const expired = load(root);
  expired.leases.chrome.expires = new Date(Date.now() - 1000).toISOString();
  writeFileSync(join(root, "var", "run", "proc.json"), JSON.stringify(expired));
  assert.equal(acquire("chrome", { holder: "c" }, root).holder, "c", "an expired lease is taken over without its holder releasing it");
});

test("ps joins the table with the CLI's list and says when a live session has no process", () => {
  const root = fresh();
  add({ name: "probe", parent: "main", via: "routine" }, root, box);
  set("probe", { pid: "local_aaaa1111", cli: "cli-1", state: "idle" }, root);
  add({ name: "other", parent: "main", via: "routine" }, root, box);
  const shown = ps({}, root, [{ name: "probe", sessionId: "cli-1", status: "busy", pid: 42 }]);
  assert.equal(shown.rows.find((r) => r.name === "probe").stat, "R");
  assert.equal(shown.rows.find((r) => r.name === "other").process, "no process");
  assert.equal(ps({}, root, null).rows[0].process, "unknown");
});

test("wait returns once the child has been busy and is idle again, and times out while it stays busy", async () => {
  const root = fresh();
  add({ name: "probe", parent: "main", via: "routine" }, root, box);
  set("probe", { cli: "cli-1", state: "running" }, root);
  const states = ["idle", "busy", "busy", "idle"];
  const ask = () => [{ name: "probe", sessionId: "cli-1", status: states.shift() ?? "idle", pid: 7 }];
  const done = await waitFor("probe", { everyMs: 1, graceMs: 60000 }, root, ask);
  assert.equal(done.outcome, "idle");
  assert.equal(states.length, 0, "the first idle, before the child was seen busy, did not count");
  const stuck = await waitFor("probe", { everyMs: 1, timeoutMs: 20 }, root, () => [{ name: "probe", sessionId: "cli-1", status: "busy", pid: 7 }]);
  assert.equal(stuck.outcome, "timeout");
  const gone = await waitFor("probe", { everyMs: 1, graceMs: 0 }, root, () => []);
  assert.equal(gone.outcome, "no process");
});
