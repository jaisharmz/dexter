#!/usr/bin/env node
// The process table for headful subagents: Claude Code sessions that one session starts for
// another, each its own row in the operator's sidebar. An operating system keeps one table of its
// processes, with each one's id, parent, state and the resources it holds. The desktop app keeps
// the sessions themselves but not who started which one, for what, or whether anyone has read its
// result, so this file keeps that in var/run/proc.json, gitignored like the rest of var/run because
// it is this machine's runtime state.
//
// The session tools act on a process (start it, message it, stop, archive or delete it). This
// file only records what they did and refuses a spawn the limits forbid, so `ps` can answer what
// is running, for whom, and what it holds. Design: docs/agent-processes.md. Use: skills/spawn.
//
// Writes go through kernel/store.mjs (a mkdir mutex and a rename), as the queue's do.

import { existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Runs from kernel/ once installed, and from its staging folder before that.
const here = dirname(fileURLToPath(import.meta.url));
const repo = [join(here, ".."), join(here, "..", "..")].find((dir) => existsSync(join(dir, "kernel", "store.mjs")));
if (!repo) throw new Error(`proc.mjs: no kernel/store.mjs above ${here}`);
const { appendLine, readJson, sharedRoot, transact } = await import(pathToFileURL(join(repo, "kernel", "store.mjs")).href);

export const ROOT = sharedRoot(repo);
const EMPTY = { processes: [], leases: {} };
const tablePath = (root) => join(root, "var", "run", "proc.json");
const logPath = (root) => join(root, "var", "run", "proc.log.jsonl");

// How a child was started, best first (docs/agent-processes.md ranks them).
export const VIAS = ["start_session", "routine", "chip", "link", "terminal", "peer"];

// A process is live until it is archived or deleted. "done" is a zombie: it has finished and its
// result is in, but its session still holds a sidebar row and maybe a warm process until reaped.
export const STATES = ["starting", "running", "idle", "stopped", "done", "archived", "deleted", "failed"];
export const LIVE = new Set(["starting", "running", "idle", "stopped", "done"]);
const STAT = { starting: "-", running: "R", idle: "S", stopped: "T", done: "Z", archived: "X", deleted: "X", failed: "X" };

// The desktop app keeps at most six Claude processes warm and evicts idle sessions to make room,
// the operator's own among them, so children stay well under that. Memory and disk follow the
// overnight run's memcheck (2026-10-09): below either, a new session can push Chrome over.
export const LIMITS = {
  perParent: Number(process.env.PROC_MAX_CHILDREN ?? 3),
  live: Number(process.env.PROC_MAX_LIVE ?? 4),
  freeMemoryPct: 25,
  freeDiskMB: 2000,
};

export const load = (root = ROOT) => readJson(tablePath(root), EMPTY);

const log = (root, action, fields) => appendLine(logPath(root), { action, ...fields });

// ---- the machine ----

const quiet = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 8000, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
};

// Free memory and disk. Known only on macOS, the one place it has been measured; elsewhere the
// memory and disk limits are skipped and say so.
export const machine = () => {
  if (process.platform !== "darwin") return { known: false };
  const free = /free percentage:\s*(\d+)%/.exec(quiet("memory_pressure", []))?.[1];
  const disk = quiet("df", ["-m", "/"]).trim().split("\n")[1]?.split(/\s+/)[3];
  if (free === undefined || disk === undefined) return { known: false };
  return { known: true, freeMemoryPct: Number(free), freeDiskMB: Number(disk) };
};

// The live Claude Code processes on this machine, from the CLI's own list: name, CLI session id,
// busy or idle. null when the CLI cannot be asked, so ps says "unknown" instead of "gone".
export const running = () => {
  for (const bin of ["claude", join(process.env.HOME ?? "", ".local/bin/claude"), "/opt/homebrew/bin/claude", "/usr/local/bin/claude"]) {
    const out = quiet(bin, ["agents", "--json"]);
    if (out) {
      try {
        return JSON.parse(out);
      } catch {
        return null;
      }
    }
  }
  return null;
};

// ---- limits ----

// May `parent` start one more child? A zombie counts against both caps, so a parent that never
// reaps its children runs out of slots, as a Unix process table fills with unreaped zombies.
export const check = (table, parent, box = machine()) => {
  const live = table.processes.filter((p) => LIVE.has(p.state));
  const mine = live.filter((p) => p.parent === parent);
  const refuse = (code, why) => ({ ok: false, code, why });
  if (mine.length >= LIMITS.perParent) return refuse(3, `${parent} already has ${mine.length} live children (cap ${LIMITS.perParent}); reap one first`);
  if (live.length >= LIMITS.live) return refuse(3, `${live.length} children are live across all sessions (cap ${LIMITS.live}); reap one first`);
  if (box.known && box.freeMemoryPct < LIMITS.freeMemoryPct) return refuse(4, `only ${box.freeMemoryPct}% of memory is free (needs ${LIMITS.freeMemoryPct}%)`);
  if (box.known && box.freeDiskMB < LIMITS.freeDiskMB) return refuse(4, `only ${box.freeDiskMB} MB of disk is free (needs ${LIMITS.freeDiskMB}); swap grows into free disk`);
  return { ok: true, live: live.length, mine: mine.length, box };
};

// ---- the table ----

// A name, a session id (or 8+ characters of one), or a CLI session id. A live row wins over an
// ended one with the same name, then the newest.
const find = (table, ref) => {
  const value = String(ref ?? "");
  const rows = table.processes.filter(
    (p) => p.name === value || p.pid === value || p.cli === value || (value.length >= 8 && [p.pid, p.cli].some((id) => id?.includes(value))),
  );
  if (!rows.length) throw new Error(`no process matches "${value}"`);
  return rows.sort((a, b) => Number(LIVE.has(b.state)) - Number(LIVE.has(a.state)) || b.started.localeCompare(a.started))[0];
};

// Reserve a slot before spawning, the way the board claims an item before its worker starts. The
// spawn then fills in the session id with `set`. Names must be unique among live processes,
// because other sessions address a session by name.
export const add = ({ name, parent, via, pid, task, item, brief, purpose }, root = ROOT, box = machine()) => {
  if (!name || !parent || !via) throw new Error("add needs a name, a parent and a via");
  if (!VIAS.includes(via)) throw new Error(`via is one of ${VIAS.join(", ")}, not "${via}"`);
  const row = transact(tablePath(root), EMPTY, (table) => {
    if (table.processes.some((p) => LIVE.has(p.state) && p.name === name)) throw new Error(`a live process is already named "${name}"; pick another name`);
    const verdict = check(table, parent, box);
    if (!verdict.ok) throw Object.assign(new Error(verdict.why), { exitCode: verdict.code });
    const now = new Date().toISOString();
    const entry = { name, pid: pid ?? null, cli: null, parent, via, task: task ?? null, item: item ? Number(item) : null, brief: brief ?? null, purpose: purpose ?? null, state: "starting", started: now, updated: now, ended: null, exit: null };
    table.processes.push(entry);
    return entry;
  });
  log(root, "add", { name, parent, via, pid: row.pid });
  return row;
};

const FIELDS = ["pid", "cli", "state", "parent", "task", "item", "purpose"];

export const set = (ref, fields, root = ROOT) => {
  if (fields.state !== undefined && !STATES.includes(fields.state)) throw new Error(`state is one of ${STATES.join(", ")}`);
  const row = transact(tablePath(root), EMPTY, (table) => {
    const entry = find(table, ref);
    for (const key of FIELDS) if (fields[key] !== undefined) entry[key] = key === "item" ? Number(fields[key]) : fields[key];
    const now = new Date().toISOString();
    if (fields.state) entry.ended = LIVE.has(fields.state) ? null : (entry.ended ?? now);
    entry.updated = now;
    return entry;
  });
  log(root, "set", { name: row.name, ...Object.fromEntries(FIELDS.filter((k) => fields[k] !== undefined).map((k) => [k, fields[k]])) });
  return row;
};

// The child's exit status, recorded when the parent has read its result: wait() collecting it.
// The row stays a zombie ("done") until the session is archived.
export const exit = (ref, { status = "ok", result, mail }, root = ROOT) => {
  if (!["ok", "failed"].includes(status)) throw new Error('status is "ok" or "failed"');
  const row = transact(tablePath(root), EMPTY, (table) => {
    const entry = find(table, ref);
    const now = new Date().toISOString();
    entry.exit = { status, result: result ?? null, mail: mail ?? null, at: now };
    if (LIVE.has(entry.state)) entry.state = "done";
    entry.updated = now;
    return entry;
  });
  log(root, "exit", { name: row.name, status, mail });
  return row;
};

// ---- wait ----

// Block until a child has finished its turn: waitpid. A routine's completion notice never reaches
// the parent's conversation, and notify_when_idle needs both sessions in the same permission mode,
// so this asks the CLI instead, which reports each session busy or idle in about 0.2 seconds. A
// short turn can start and end between two polls, so idle counts once the child has been seen busy
// or `graceMs` has passed. Run it in the background to get one notice when it returns.
export const waitFor = async (ref, { timeoutMs = 30 * 60000, everyMs = 5000, graceMs = 15000 } = {}, root = ROOT, ask = running) => {
  const row = find(load(root), ref);
  if (!LIVE.has(row.state)) return { name: row.name, outcome: "no process", pid: null };
  const started = Date.now();
  let seenBusy = false;
  for (;;) {
    const agents = ask();
    const live = agents?.find((a) => (row.cli && a.sessionId === row.cli) || a.name === row.name);
    if (live?.status === "busy") seenBusy = true;
    const settled = seenBusy || Date.now() - started >= graceMs;
    if (agents && settled && live?.status !== "busy") return { name: row.name, outcome: live ? "idle" : "no process", pid: live?.pid ?? null };
    if (Date.now() - started >= timeoutMs) return { name: row.name, outcome: "timeout", pid: live?.pid ?? null };
    await new Promise((done) => setTimeout(done, everyMs));
  }
};

// ---- leases ----

const DURATION = { s: 1000, m: 60000, h: 3600000 };
const parseTtl = (text) => {
  const match = /^(\d+)([smh])$/.exec(String(text ?? ""));
  if (!match) throw new Error(`a ttl looks like 90s, 10m or 1h, not "${text}"`);
  return Number(match[1]) * DURATION[match[2]];
};

// A lease is a lock with an expiry: one holder at a time, and a holder that dies stops blocking
// when its time runs out. Chrome is the case that needs it, because keystrokes go to whichever
// tab has focus (docs/headful-workers.md). Acquire succeeds when the resource is free, expired,
// or already held by the same holder, which renews it.
export const acquire = (resource, { holder, purpose, ttl = "10m" }, root = ROOT) => {
  if (!resource || !holder) throw new Error("a lease needs a resource and a holder");
  const ms = parseTtl(ttl);
  const lease = transact(tablePath(root), EMPTY, (table) => {
    table.leases ??= {};
    const now = Date.now();
    const held = table.leases[resource];
    if (held && held.holder !== holder && Date.parse(held.expires) > now) {
      const left = Math.ceil((Date.parse(held.expires) - now) / 60000);
      throw Object.assign(new Error(`${resource} is held by ${held.holder} (${held.purpose ?? "no purpose given"}) for ${left} more minute(s)`), { exitCode: 3 });
    }
    table.leases[resource] = { holder, purpose: purpose ?? null, since: held?.holder === holder ? held.since : new Date(now).toISOString(), expires: new Date(now + ms).toISOString() };
    return table.leases[resource];
  });
  log(root, "lease", { resource, holder, expires: lease.expires });
  return lease;
};

// Only the holder releases, so a holder whose lease expired and was taken cannot free the next one's.
export const release = (resource, { holder }, root = ROOT) => {
  const freed = transact(tablePath(root), EMPTY, (table) => {
    const held = table.leases?.[resource];
    if (!held) return false;
    if (held.holder !== holder) throw new Error(`${resource} is held by ${held.holder}, not ${holder}`);
    delete table.leases[resource];
    return true;
  });
  if (freed) log(root, "release", { resource, holder });
  return freed;
};

// ---- ps ----

const age = (iso) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};

// Rows joined with what the CLI says is running. A desktop session whose process the app evicted
// while it was idle is still a session: a message wakes it. So "no process" is reported, not "gone".
export const ps = ({ all = false, parent } = {}, root = ROOT, agents = running()) => {
  const table = load(root);
  const week = Date.now() - 7 * 86400000;
  const rows = table.processes
    .filter((p) => (all ? Date.parse(p.updated) >= week : LIVE.has(p.state)))
    .filter((p) => !parent || p.parent === parent)
    .map((p) => {
      const live = agents?.find((a) => (p.cli && a.sessionId === p.cli) || a.name === p.name);
      const where = agents === null ? "unknown" : live ? `${live.status} (pid ${live.pid})` : LIVE.has(p.state) ? "no process" : "-";
      return { ...p, stat: live?.status === "busy" ? "R" : STAT[p.state], process: where };
    });
  const leases = Object.entries(table.leases ?? {}).filter(([, l]) => Date.parse(l.expires) > Date.now());
  return { rows, leases };
};

// ---- the command line ----

const USAGE = `usage: node kernel/proc.mjs <command>
  ps [--all] [--parent <name>]               what is running, for whom, holding what
  limits [--parent <name>]                   may <name> start a child now? exit 3 at a cap, 4 short of memory or disk
  add --name <n> --parent <name> --via <${VIAS.join("|")}> [--pid <session id>] [--task <routine id>] [--item <queue id>] [--brief <path>] [--purpose <text>]
  set <name|id> [--pid <id>] [--cli <id>] [--state <${STATES.join("|")}>] [--parent <name>] [--task <id>] [--item <id>]
  exit <name|id> [--status ok|failed] [--result "<one line>"] [--mail <message id>]
  wait <name|id> [--timeout 30m]             returns when the child is idle; exit 2 on timeout
  lease acquire <resource> --holder <name> [--purpose <text>] [--ttl 10m]
  lease release <resource> --holder <name>     lease status
Any command takes --root <dir> to use <dir>/var/run instead of this repo's.`;

const flag = (args, name) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
};

const SWITCHES = ["--all"];
const positional = (args) => args.filter((arg, at) => !arg.startsWith("--") && !(args[at - 1]?.startsWith("--") && !SWITCHES.includes(args[at - 1])));

const needed = (value) => {
  if (!value) throw new Error(USAGE);
  return value;
};

const pad = (text, width) => String(text ?? "-").slice(0, width).padEnd(width);

const commands = {
  ps(args, root) {
    const { rows, leases } = ps({ all: args.includes("--all"), parent: flag(args, "parent") }, root);
    if (!rows.length) console.log(args.includes("--all") ? "no processes this week" : "no live processes");
    else {
      console.log(`${pad("NAME", 22)} ${pad("STAT", 4)} ${pad("STATE", 9)} ${pad("VIA", 13)} ${pad("PARENT", 18)} ${pad("AGE", 5)} ${pad("ITEM", 5)} ${pad("PROCESS", 18)} PID`);
      for (const p of rows) {
        console.log(`${pad(p.name, 22)} ${pad(p.stat, 4)} ${pad(p.state, 9)} ${pad(p.via, 13)} ${pad(p.parent, 18)} ${pad(age(p.started), 5)} ${pad(p.item ? `#${p.item}` : "-", 5)} ${pad(p.process, 18)} ${p.pid ?? "-"}`);
        if (p.exit?.result) console.log(`${" ".repeat(23)}exit ${p.exit.status}: ${p.exit.result}`);
      }
    }
    for (const [resource, l] of leases) console.log(`lease: ${resource} held by ${l.holder} until ${l.expires}${l.purpose ? ` (${l.purpose})` : ""}`);
  },

  limits(args, root) {
    const parent = flag(args, "parent") ?? "anyone";
    const verdict = check(load(root), parent);
    const box = verdict.box ?? machine();
    const memory = box.known ? `memory ${box.freeMemoryPct}% free, disk ${box.freeDiskMB} MB free` : "memory and disk unknown on this platform";
    if (!verdict.ok) {
      console.log(`no: ${verdict.why}`);
      process.exitCode = verdict.code;
      return;
    }
    console.log(`yes: ${verdict.live} of ${LIMITS.live} live, ${verdict.mine} of ${LIMITS.perParent} for ${parent}; ${memory}`);
  },

  add(args, root) {
    const row = add(
      { name: flag(args, "name"), parent: flag(args, "parent"), via: flag(args, "via"), pid: flag(args, "pid"), task: flag(args, "task"), item: flag(args, "item"), brief: flag(args, "brief"), purpose: flag(args, "purpose") },
      root,
    );
    console.log(`reserved "${row.name}" for ${row.parent} (${row.via}); after the spawn: node kernel/proc.mjs set "${row.name}" --pid <session id> --state running`);
  },

  set(args, root) {
    const fields = Object.fromEntries(FIELDS.map((key) => [key, flag(args, key)]));
    const row = set(needed(positional(args).join(" ")), fields, root);
    console.log(`${row.name}: ${row.state}${row.pid ? `, ${row.pid}` : ""}`);
  },

  exit(args, root) {
    const row = exit(needed(positional(args).join(" ")), { status: flag(args, "status") ?? "ok", result: flag(args, "result"), mail: flag(args, "mail") }, root);
    console.log(`${row.name} exited ${row.exit.status}; reap it by archiving the session, then: node kernel/proc.mjs set "${row.name}" --state archived`);
  },

  async wait(args, root) {
    const timeoutMs = parseTtl(flag(args, "timeout") ?? "30m");
    const done = await waitFor(needed(positional(args).join(" ")), { timeoutMs }, root);
    if (done.outcome === "timeout") {
      console.log(`${done.name} is still working after ${flag(args, "timeout") ?? "30m"}`);
      process.exitCode = 2;
      return;
    }
    console.log(done.outcome === "idle" ? `${done.name} is idle (pid ${done.pid}): read its result` : `${done.name} has no process: it finished and the app evicted it, or it was archived`);
  },

  lease(args, root) {
    const [verb, resource] = positional(args);
    if (verb === "acquire") {
      const lease = acquire(needed(resource), { holder: flag(args, "holder"), purpose: flag(args, "purpose"), ttl: flag(args, "ttl") ?? "10m" }, root);
      return console.log(`${resource} is held by ${lease.holder} until ${lease.expires}`);
    }
    if (verb === "release") return console.log(release(needed(resource), { holder: flag(args, "holder") }, root) ? `${resource} released` : `${resource} was not held`);
    if (verb === "status") {
      const leases = Object.entries(load(root).leases ?? {}).filter(([, l]) => Date.parse(l.expires) > Date.now());
      if (!leases.length) return console.log("no leases held");
      for (const [name, l] of leases) console.log(`${name}: ${l.holder} until ${l.expires}${l.purpose ? ` (${l.purpose})` : ""}`);
      return;
    }
    throw new Error(USAGE);
  },
};

// Run as a command, and not when the tests import this file.
const invoked = () => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (invoked()) {
  const [command, ...args] = process.argv.slice(2);
  const run = commands[command];
  if (!run) {
    console.error(USAGE);
    process.exitCode = 1;
  } else {
    try {
      await run(args, resolve(args.includes("--root") ? flag(args, "root") : ROOT));
    } catch (err) {
      console.error(`error: ${err.message}`);
      process.exitCode = err.exitCode ?? 1;
    }
  }
}
