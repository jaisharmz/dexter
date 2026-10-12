#!/usr/bin/env node
// Deferred work queue with dependency ordering and four tiers.
//
// Items are never "forgotten" — work that isn't ready is blocked, not dropped.
// Each item sits in a tier, now, next, soon or later, and lower tiers wait until the
// higher ones have nothing ready: "only go to the lower priority stuff once you finish
// higher priority". An item that blocks another is pulled up to that item's tier,
// because that work cannot start until it is done. Inside a tier, a hand-set rank comes
// first, then ready before blocked, then priority, then age. `next` returns the first
// ready item, so the heartbeat can drain the queue without being told what's ready.
//
// The same store is read by kernel/pqueue.mjs where a checkout has it, which adds time
// frames above the tiers; an item without a frame orders the same way in both. Items are named as
// kernel/queue-ids.mjs says: a number that renumbering keeps dense, and a uuid and a name that never
// change. depends_on holds uuids, and any command takes a number, a name or a uuid.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as ids from "./queue-ids.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = process.env.QUEUE_STORE || join(ROOT, "var/queue/items.json");
const TIERS = ["now", "next", "soon", "later"];

// Each item as it was read, so save can stamp `updated` on the ones this run changed, which lets
// a merge of two machines' copies keep the newer change to an item.
let loaded = new Map();

const load = () => {
  let db;
  try {
    db = JSON.parse(readFileSync(STORE, "utf8"));
  } catch {
    db = { seq: 0, items: [] };
  }
  loaded = new Map(db.items.map((item) => [item.uuid ?? item.id, JSON.stringify(item)]));
  return db;
};

// An item from before uuids gets one now, as on any write through kernel/pqueue.mjs.
const save = (db) => {
  const now = new Date().toISOString();
  ids.ensureUuids(db);
  for (const item of db.items) if (loaded.get(item.uuid) !== JSON.stringify(item)) item.updated = now;
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(db, null, 2) + "\n");
};

// An item filed without a tier is placed by its priority.
const ownTier = (item) => item.tier ?? (item.priority >= 8 ? 1 : item.priority >= 6 ? 2 : 3);

const parseTier = (value) => {
  const tier = TIERS.includes(value) ? TIERS.indexOf(value) : Number(value);
  if (value === undefined || value === "" || !Number.isInteger(tier) || tier < 0 || tier >= TIERS.length) {
    throw new Error(`tier must be 0-3 or ${TIERS.join("/")}`);
  }
  return tier;
};

/**
 * Kahn's algorithm. Returns items in a valid build order, or throws naming the
 * cycle — a dependency cycle is a planning bug and should be loud, not silent.
 */
const toposort = (items, db) => {
  const byId = new Map(items.map((i) => [i.id, i]));
  const indegree = new Map(items.map((i) => [i.id, 0]));
  const deps = new Map(items.map((i) => [i.id, i.depends_on.map((d) => ids.depItem(db, d)?.id)]));

  // A dependency outside `items` is a completed one — already satisfied, not an error.
  // Typos are caught at add() time, which validates against every item including done.
  for (const item of items) {
    for (const dep of deps.get(item.id)) {
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
      if (!deps.get(other.id).includes(item.id)) continue;
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

// Every open item in queue order, with its effective tier, what it waits on and why it was raised.
const view = (db) => {
  const open = db.items.filter((i) => i.state !== "done");
  const dep = (d) => ids.depItem(db, d);
  const tier = new Map(open.map((i) => [i.id, ownTier(i)]));
  // Pull each blocker up to the tier of what it blocks, until nothing moves. Tiers only ever
  // decrease and stop at 0, so this ends even if the dependencies have a cycle.
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of open) {
      for (const d of item.depends_on) {
        const blocker = dep(d)?.id;
        if (tier.has(blocker) && tier.get(item.id) < tier.get(blocker)) {
          tier.set(blocker, tier.get(item.id));
          changed = true;
        }
      }
    }
  }
  const rows = open.map((i) => {
    const blocks = open.filter((other) => other.depends_on.some((d) => dep(d) === i)).map((other) => other.id);
    const effective = tier.get(i.id);
    return {
      ...i,
      effective,
      raised: effective < ownTier(i) ? { from: TIERS[ownTier(i)], because: blocks.filter((b) => tier.get(b) === effective) } : null,
      blockers: i.depends_on.filter((d) => dep(d)?.state !== "done").map((d) => dep(d)?.id ?? d),
      ready: i.depends_on.every((d) => dep(d)?.state === "done"),
    };
  });
  rows.sort((a, b) => a.effective - b.effective || (a.rank ?? Infinity) - (b.rank ?? Infinity) || b.ready - a.ready || b.priority - a.priority || a.id - b.id);
  return rows;
};

// An item by its number, a number from before a renumber, its name or its uuid.
const find = (db, ref) => {
  const found = ids.resolve(db, ref);
  if (!found) throw new Error(`no item ${ref}`);
  const note = ids.resolutionNote(db, ref, found);
  if (note) console.error(note);
  return found.item;
};

const commands = {
  add(db, args) {
    const flag = (name, fallback) => {
      const at = args.indexOf(`--${name}`);
      return at === -1 ? fallback : args[at + 1];
    };
    const title = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")).join(" ");
    if (!title) throw new Error("usage: queue add <title> [--name two-to-four-words] [--tier now|next|soon|later] [--depends 1,some-name] [--priority N] [--channel name]");

    ids.ensureUuids(db);
    const taken = ids.takenNames(db);
    const name = args.includes("--name") ? ids.checkName(flag("name")) : ids.deriveName(title, taken, ids.ownerWords(db));
    if (taken.has(name)) throw new Error(`the name ${name} is taken`);
    const depends_on = (flag("depends", "") || "").split(",").map((d) => d.trim()).filter(Boolean).map((ref) => {
      const found = ids.resolve(db, ref);
      if (!found) throw new Error(`no item ${ref} to depend on`);
      return found.item.uuid;
    });
    const item = {
      id: ++db.seq,
      uuid: ids.newUuid(),
      name,
      title,
      state: "open",
      priority: Number(flag("priority", 5)),
      channel: flag("channel", "dexter"),
      depends_on,
      created: new Date().toISOString(),
    };
    if (args.includes("--tier")) item.tier = parseTier(flag("tier"));
    db.items.push(item);
    toposort(db.items.filter((i) => i.state !== "done"), db); // fail fast on cycles
    save(db);
    console.log(`${ids.label(item)} queued in ${TIERS[ownTier(item)]}: ${item.title}`);
  },

  list(db) {
    try {
      toposort(db.items.filter((i) => i.state !== "done"), db);
    } catch (err) {
      console.log(`!! ${err.message}: none of them can start`);
    }
    const rows = view(db);
    if (!rows.length) return console.log("queue is empty");
    let current = -1;
    for (const item of rows) {
      if (item.effective !== current) {
        current = item.effective;
        console.log(`\n${TIERS[current].toUpperCase()} (tier ${current})`);
      }
      const named = (ref) => (typeof ref === "number" ? ids.label(ids.resolve(db, ref)?.item ?? { id: ref }) : ref);
      const why = item.blockers.length ? `  ← waiting on ${item.blockers.map(named).join(", ")}` : "";
      const raised = item.raised ? `  (raised from ${item.raised.from}: blocks ${item.raised.because.map(named).join(", ")})` : "";
      console.log(`  ${item.ready ? "READY  " : "blocked"} ${ids.label(item)} [p${item.priority}] ${item.title}${why}${raised}`);
    }
  },

  // The first ready item in queue order that no session has taken.
  next(db) {
    const item = view(db).find((i) => i.ready && !i.session);
    if (!item) return console.log("nothing eligible");
    const { effective, raised, blockers, ready, ...stored } = item;
    console.log(JSON.stringify({ ...stored, tier_name: TIERS[effective] }, null, 2));
  },

  // A new tier drops the item's hand-set rank, which belonged to its old tier.
  tier(db, [ref, value]) {
    const item = find(db, ref);
    item.tier = parseTier(value);
    delete item.rank;
    save(db);
    console.log(`${ids.label(item)} moved to ${TIERS[item.tier]}: ${item.title}`);
  },

  done(db, [ref]) {
    const item = find(db, ref);
    item.state = "done";
    item.completed = new Date().toISOString();
    save(db);
    console.log(`${ids.label(item)} done: ${item.title}`);
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
