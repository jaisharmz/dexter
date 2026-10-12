// node --test kernel/proc.test.mjs
// Each test works in its own temp dir, so nothing here touches this repo's var/run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { acquire, acquireWaiting, add, askCheckin, check, checkinLog, collectCheckins, collectWaiting, exit, LIMITS, load, night, ps, recordCheckin, release, set, waitFor } from "./proc.mjs";
import { inbox, read } from "./sessions.mjs";

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

test("acquire --wait takes the lease when its holder releases, and gives up with exit 3 when the wait runs out", async () => {
  const root = fresh();
  acquire("chrome", { holder: "a", purpose: "one form", ttl: "10m" }, root);
  await assert.rejects(acquireWaiting("chrome", { holder: "b" }, "1s", root, 100), (err) => err.exitCode === 3 && /held by a/.test(err.message));
  setTimeout(() => release("chrome", { holder: "a" }, root), 150);
  const lease = await acquireWaiting("chrome", { holder: "b", purpose: "the next form" }, "5s", root, 50);
  assert.equal(lease.holder, "b");
  await assert.rejects(acquireWaiting("chrome", { holder: "c" }, undefined, root), (err) => err.exitCode === 3, "no --wait fails at once, as before");
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

// ---- check-ins ----

const at = new Date(2026, 9, 10, 20, 30); // 8:30 PM on Oct 10, wherever the tests run
const minutes = (n, from = at) => new Date(from.getTime() + n * 60000);

// Two children main asks, one it does not (finished), and another parent's child.
const family = (root) => {
  for (const [name, state, parent] of [["a", "running", "main"], ["b", "idle", "main"], ["c", "done", "main"], ["d", "running", "other"]]) {
    add({ name, parent, via: "routine" }, root, box);
    set(name, { state }, root);
  }
};

// Mail to main as kernel/sessions.mjs send leaves it, with the time chosen here.
const answer = (root, { id, from, subject, body, at: sent }) => {
  mkdirSync(join(root, "var", "sessions", from, "outbox"), { recursive: true });
  mkdirSync(join(root, "var", "sessions", "main", "inbox"), { recursive: true });
  writeFileSync(join(root, "var", "sessions", from, "outbox", `${id}.md`), body);
  const envelope = { id, from, to: "main", subject, excerpt: body, ref: `var/sessions/${from}/outbox/${id}.md`, sent_at: sent.toISOString() };
  writeFileSync(join(root, "var", "sessions", "main", "inbox", `${id}.json`), JSON.stringify(envelope));
};

test("a check-in mails each running or idle child the question, and the log names who was asked", () => {
  const root = fresh();
  family(root);
  const { id, asked } = askCheckin({ parent: "main", at }, root, []);
  assert.deepEqual(asked, ["a", "b"], "a finished child and another parent's child are not asked");
  const [mail] = inbox("a", {}, root);
  assert.match(mail.subject, new RegExp(`^check-in ${id}: `));
  assert.match(read("a", mail.id, root).body, new RegExp(`--from "a" --to "main" --subject "check-in ${id}"`));
  assert.equal(inbox("c", {}, root).length, 0);
  const log = readFileSync(checkinLog(root, at), "utf8");
  assert.match(log, /^# Overnight check-ins, Oct 10 to 11\n/);
  assert.match(log, /\n## 8:30 PM, check-in asked of: a and b\n/);
  assert.throws(() => askCheckin({ parent: "nobody", at }, root, []), /no running or idle children/);
});

test("collect logs each answer once, under the question asked before it, and names who has not answered", () => {
  const root = fresh();
  family(root);
  const { id } = askCheckin({ parent: "main", at }, root, []);
  answer(root, { id: "m0", from: "b", subject: "Check-in", body: "sent before the question", at: minutes(-10) });
  answer(root, { id: "m1", from: "a", subject: `check-in ${id}`, body: "1. Done: tracker-fix (abc123)\n## Now: night-report\n\n- Blocked: nothing", at: minutes(4) });
  answer(root, { id: "m2", from: "a", subject: "tracker-fix done", body: "a report, not an answer", at: minutes(5) });
  answer(root, { id: "m3", from: "d", subject: "check-in", body: "another parent's child", at: minutes(5) });
  const first = collectCheckins({ parent: "main", now: minutes(10) }, root);
  assert.deepEqual(first.answers.map((a) => a.mail), ["m1"]);
  assert.deepEqual(first.waiting, ["b"]);
  assert.deepEqual(collectCheckins({ parent: "main", now: minutes(11) }, root).answers, [], "an answer is logged once");
  const log = readFileSync(checkinLog(root, at), "utf8");
  assert.match(log, /\n## 8:34 PM, a \(check-in, mail m1\)\n- Done: tracker-fix \(abc123\)\n- Now: night-report\n- Blocked: nothing\n/, "an answer's own headings and list marks become bullets");
  assert.equal(inbox("main", {}, root).some((m) => m.id === "m1"), false, "a logged answer is marked read");
  assert.equal(inbox("main", {}, root).some((m) => m.id === "m2"), true, "other mail is left unread");
});

test("an answer pasted from SendMessage counts, and a later question waits on everyone again", () => {
  const root = fresh();
  family(root);
  askCheckin({ parent: "main", at }, root, []);
  answer(root, { id: "m1", from: "a", subject: "check-in", body: "Done: x", at: minutes(2) });
  recordCheckin({ parent: "main", child: "b", body: "Done: y\nNow: z", at: minutes(3) }, root);
  assert.deepEqual(collectCheckins({ parent: "main", now: minutes(5) }, root).waiting, []);
  assert.match(readFileSync(checkinLog(root, at), "utf8"), /\n## 8:33 PM, b \(check-in, by SendMessage\)\n- Done: y\n- Now: z\n/);
  askCheckin({ parent: "main", at: minutes(45) }, root, []);
  assert.deepEqual(collectCheckins({ parent: "main", now: minutes(46) }, root).waiting, ["a", "b"], "answers to the first question do not answer the second");
});

// dexter ships proc.mjs without kernel/night-report.mjs, so this test runs where the report does.
const NIGHT_REPORT = new URL("./night-report.mjs", import.meta.url);
test("the log reads back through night-report's parser, one entry per question and per answer", { skip: !existsSync(fileURLToPath(NIGHT_REPORT)) && "no kernel/night-report.mjs in this checkout" }, async () => {
  const { checkins } = await import(NIGHT_REPORT.href);
  const root = fresh();
  family(root);
  askCheckin({ parent: "main", at }, root, []);
  answer(root, { id: "m1", from: "a", subject: "check-in", body: "Done: tracker-fix", at: minutes(4) });
  collectCheckins({ parent: "main", now: minutes(5) }, root);
  recordCheckin({ parent: "main", child: "b", body: "Now: night-report", at: minutes(6) }, root);
  assert.deepEqual(checkins(root).map((c) => [c.when, c.agent, c.headline, c.lines]), [
    ["8:30 PM", "check-in asked of", "a and b", []],
    ["8:34 PM", "a", "", ["Done: tracker-fix"]],
    ["8:36 PM", "b", "", ["Now: night-report"]],
  ]);
});

test("a night runs from noon to noon and is named for its morning", () => {
  assert.equal(night(new Date(2026, 9, 10, 20, 30)), "2026-10-11");
  assert.equal(night(new Date(2026, 9, 11, 9, 0)), "2026-10-11");
  assert.equal(night(new Date(2026, 9, 11, 12, 0)), "2026-10-12");
  assert.equal(night(new Date(2026, 9, 31, 22, 0)), "2026-11-01");
  const root = fresh();
  family(root);
  askCheckin({ parent: "main", at: new Date(2026, 9, 31, 22, 0) }, root, []);
  assert.match(readFileSync(checkinLog(root, new Date(2026, 10, 1, 1, 0)), "utf8"), /^# Overnight check-ins, Oct 31 to Nov 1\n/);
});

test("collect --wait logs each answer as it comes, and returns with the missing names when the wait runs out", async () => {
  const root = fresh();
  family(root);
  const now = new Date();
  askCheckin({ parent: "main", at: now }, root, []);
  answer(root, { id: "m1", from: "a", subject: "check-in", body: "Done: x", at: new Date(now.getTime() + 1000) });
  setTimeout(() => answer(root, { id: "m2", from: "b", subject: "check-in", body: "Done: y", at: new Date(now.getTime() + 2000) }), 60);
  const seen = [];
  const done = await collectWaiting({ parent: "main" }, "5s", root, (a) => seen.push(a.child), 20);
  assert.deepEqual(seen, ["a", "b"]);
  assert.deepEqual(done.waiting, []);
  askCheckin({ parent: "main", at: new Date(now.getTime() + 3000) }, root, []);
  const stuck = await collectWaiting({ parent: "main" }, "1s", root, () => {}, 20);
  assert.deepEqual(stuck.waiting, ["a", "b"]);
});
