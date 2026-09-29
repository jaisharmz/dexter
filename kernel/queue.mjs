#!/usr/bin/env node
// Deferred work queue with dependency ordering.
//
// Items are never "forgotten" — work that isn't ready is blocked, not dropped.
// `next` returns the highest-priority item whose dependencies are all done,
// so the heartbeat can drain the queue without needing to be told what's ready.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = join(ROOT, "var/queue/items.json");

const load = () => {
  try {
    return JSON.parse(readFileSync(STORE, "utf8"));
  } catch {
    return { seq: 0, items: [] };
  }
};

const save = (db) => {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(db, null, 2) + "\n");
};

/**
 * Kahn's algorithm. Returns items in a valid build order, or throws naming the
 * cycle — a dependency cycle is a planning bug and should be loud, not silent.
 */
const toposort = (items) => {
  const byId = new Map(items.map((i) => [i.id, i]));
  const indegree = new Map(items.map((i) => [i.id, 0]));

  // A dependency outside `items` is a completed one — already satisfied, not an error.
  // Typos are caught at add() time, which validates against every item including done.
  for (const item of items) {
    for (const dep of item.depends_on) {
      if (!byId.has(dep)) continue;
      indegree.set(item.id, indegree.get(item.id) + 1);
    }
  }

  // Highest priority first, ties broken by id so ordering is deterministic.
  const rank = (a, b) => b.priority - a.priority || a.id - b.id;
  const ready = items.filter((i) => indegree.get(i.id) === 0).sort(rank);
  const ordered = [];

  while (ready.length) {
    const item = ready.shift();
    ordered.push(item);
    for (const other of items) {
      if (!other.depends_on.includes(item.id)) continue;
      indegree.set(other.id, indegree.get(other.id) - 1);
      if (indegree.get(other.id) === 0) {
        ready.push(other);
        ready.sort(rank);
      }
    }
  }

  if (ordered.length !== items.length) {
    const cycle = items.filter((i) => !ordered.includes(i)).map((i) => i.id);
    throw new Error(`dependency cycle among items: ${cycle.join(", ")}`);
  }
  return ordered;
};

const eligible = (db) => {
  const done = new Set(db.items.filter((i) => i.state === "done").map((i) => i.id));
  const open = db.items.filter((i) => i.state !== "done");
  return toposort(open).filter((i) => i.depends_on.every((d) => done.has(d)));
};

const commands = {
  add(db, args) {
    const flag = (name, fallback) => {
      const at = args.indexOf(`--${name}`);
      return at === -1 ? fallback : args[at + 1];
    };
    const title = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")).join(" ");
    if (!title) throw new Error("usage: queue add <title> [--depends 1,2] [--priority N] [--channel name]");

    const item = {
      id: ++db.seq,
      title,
      state: "open",
      priority: Number(flag("priority", 5)),
      channel: flag("channel", "dexter"),
      depends_on: (flag("depends", "") || "").split(",").filter(Boolean).map(Number),
      created: new Date().toISOString(),
    };
    const known = new Set(db.items.map((i) => i.id));
    for (const dep of item.depends_on) {
      if (!known.has(dep)) throw new Error(`no item #${dep} to depend on`);
    }
    db.items.push(item);
    toposort(db.items.filter((i) => i.state !== "done")); // fail fast on cycles
    save(db);
    console.log(`#${item.id} queued: ${item.title}`);
  },

  list(db) {
    const done = new Set(db.items.filter((i) => i.state === "done").map((i) => i.id));
    const ready = new Set(eligible(db).map((i) => i.id));
    if (!db.items.length) return console.log("queue is empty");

    for (const item of db.items) {
      const mark = done.has(item.id) ? "done   " : ready.has(item.id) ? "READY  " : "blocked";
      const blockers = item.depends_on.filter((d) => !done.has(d));
      const why = blockers.length ? `  ← waiting on ${blockers.map((b) => `#${b}`).join(", ")}` : "";
      console.log(`  ${mark} #${item.id} [p${item.priority}] ${item.title}${why}`);
    }
  },

  next(db) {
    const [item] = eligible(db);
    if (!item) return console.log("nothing eligible");
    console.log(JSON.stringify(item, null, 2));
  },

  done(db, [id]) {
    const item = db.items.find((i) => i.id === Number(id));
    if (!item) throw new Error(`no item #${id}`);
    item.state = "done";
    item.completed = new Date().toISOString();
    save(db);
    console.log(`#${item.id} done: ${item.title}`);
  },
};

const [cmd, ...args] = process.argv.slice(2);
const run = commands[cmd];
if (!run) {
  console.error(`usage: queue <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
try {
  run(load(), args);
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}
