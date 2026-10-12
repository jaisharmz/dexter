// node --test kernel/queue.test.mjs
// Each test writes its own store in a temp dir and points QUEUE_STORE at it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("./queue.mjs", import.meta.url));
const CORE = fileURLToPath(new URL("./pqueue-core.mjs", import.meta.url));

const item = (id, fields = {}) => ({ id, title: `[AI] item ${id}`, state: "open", priority: 5, channel: "dexter", depends_on: [], created: `2026-10-0${1 + (id % 9)}T00:00:00Z`, ...fields });

const store = (items) => {
  const path = join(mkdtempSync(join(tmpdir(), "queue-")), "items.json");
  writeFileSync(path, JSON.stringify({ seq: Math.max(0, ...items.map((i) => i.id)), items }, null, 2));
  return path;
};

const queue = (path, ...args) => {
  const run = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, QUEUE_STORE: path } });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout;
};
const nextId = (path) => {
  const out = queue(path, "next");
  return out.startsWith("{") ? JSON.parse(out).id : null;
};
const listIds = (path) => [...queue(path, "list").matchAll(/#(\d+) \[p/g)].map((m) => Number(m[1]));

test("a higher tier goes first whatever the priority", () => {
  const path = store([item(1, { tier: 3, priority: 9 }), item(2, { tier: 0, priority: 2 })]);
  assert.equal(nextId(path), 2);
  assert.match(queue(path, "list"), /NOW \(tier 0\)\n {2}READY {3}#2[\s\S]*LATER \(tier 3\)\n {2}READY {3}#1/);
});

test("a blocker is raised to the tier of what it blocks, and says why", () => {
  const path = store([item(1, { tier: 0, depends_on: [2] }), item(2, { tier: 3 }), item(3, { tier: 1, priority: 9 })]);
  assert.equal(nextId(path), 2, "the raised blocker is the first ready item in NOW");
  assert.match(queue(path, "list"), /READY {3}#2 \[p5\] \[AI\] item 2 {2}\(raised from later: blocks #1\)/);
  assert.match(queue(path, "list"), /blocked #1 \[p5\] \[AI\] item 1 {2}← waiting on #2/);
});

test("an item filed without a tier is placed by its priority", () => {
  const path = store([item(1, { priority: 5 }), item(2, { priority: 6 }), item(3, { priority: 8 })]);
  assert.deepEqual(listIds(path), [3, 2, 1]);
  assert.match(queue(path, "list"), /NEXT \(tier 1\)\n {2}READY {3}#3[\s\S]*SOON \(tier 2\)\n {2}READY {3}#2[\s\S]*LATER \(tier 3\)\n {2}READY {3}#1/);
});

test("add takes a tier, tier moves an item and drops its rank, and next skips a claimed item", () => {
  const path = store([item(1, { tier: 2, rank: 1 })]);
  assert.match(queue(path, "add", "[AI] new work", "--tier", "now"), /#2 new-work queued in now/);
  queue(path, "tier", "1", "now");
  const saved = JSON.parse(readFileSync(path, "utf8")).items;
  assert.equal(saved.find((i) => i.id === 1).tier, 0);
  assert.equal(saved.find((i) => i.id === 1).rank, undefined);
  assert.ok(saved.every((i) => i.updated), "every item this run changed is stamped");
  assert.equal(nextId(path), 1, "same tier and priority, so the older id goes first");
  const claimed = JSON.parse(readFileSync(path, "utf8"));
  claimed.items.find((i) => i.id === 1).session = { name: "someone" };
  writeFileSync(path, JSON.stringify(claimed));
  assert.equal(nextId(path), 2);
  assert.throws(() => queue(path, "tier", "1", "urgent"), /tier must be/);
});

test("a dependency cycle is reported, not a crash", () => {
  const path = store([item(1, { depends_on: [2] }), item(2, { depends_on: [1] }), item(3)]);
  const out = queue(path, "list");
  assert.match(out, /^!! dependency cycle among items: 1, 2/);
  assert.equal(nextId(path), 3);
});

test("queue.mjs orders an unframed store exactly as the layered queue does", async () => {
  if (!existsSync(CORE)) return; // dexter ships queue.mjs alone
  const q = await import(CORE);
  const items = [];
  for (let id = 1; id <= 40; id++) {
    const fields = { priority: 1 + ((id * 7) % 9) };
    if (id % 3) fields.tier = id % 4;
    if (id % 5 === 0) fields.depends_on = [id - 3];
    if (id % 7 === 0) fields.state = "done";
    if (id % 11 === 0) fields.rank = id % 4;
    if (id === 12) fields.session = { name: "busy" };
    items.push(item(id, fields));
  }
  const path = store(items);
  const db = JSON.parse(readFileSync(path, "utf8"));
  assert.deepEqual(listIds(path), q.view(db).rows.map((r) => r.id));
  assert.equal(nextId(path), q.next(db).id);
});

test("queue.mjs gives each item a uuid and a name, keeps depends_on by uuid, and takes a name anywhere a number goes", () => {
  const path = store([]);
  assert.match(queue(path, "add", "[AI] fill the corpus", "--name", "corpus-fill"), /^#1 corpus-fill queued/);
  assert.match(queue(path, "add", "[AI] build the router", "--name", "router-build", "--depends", "corpus-fill"), /^#2 router-build queued/);
  assert.match(queue(path, "list"), /blocked #2 router-build \[p5\] \[AI\] build the router {2}← waiting on #1 corpus-fill/);
  assert.match(queue(path, "done", "corpus-fill"), /^#1 corpus-fill done/);
  assert.match(queue(path, "list"), /READY {3}#2 router-build/);
  assert.match(queue(path, "add", "[AI] write it up", "--depends", "2"), /^#3 write-item queued/);
  const after = JSON.parse(readFileSync(path, "utf8"));
  assert.match(after.items[0].uuid, /^[0-9a-f-]{36}$/);
  assert.deepEqual(after.items[2].depends_on, [after.items[1].uuid]);
  assert.throws(() => queue(path, "add", "[AI] again", "--name", "router-build"), /taken/);
});
