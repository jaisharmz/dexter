#!/usr/bin/env node
// Read back what agents did, and keep the hook that records it installed.
//
//   node kernel/audit/audit.mjs tail [-n 40]                the newest events, one line each
//   node kernel/audit/audit.mjs sessions [--since 24h]      one line per session
//   node kernel/audit/audit.mjs show <session> [--since 7d] one session, call by call
//   node kernel/audit/audit.mjs flags [--since 24h]         every flagged, asked, denied or refused act
//   node kernel/audit/audit.mjs report [--since 24h]        the daily audit: what happened, what to look at
//   node kernel/audit/audit.mjs check                       is the audit installed and recording
//   node kernel/audit/audit.mjs install | uninstall         the hook in ~/.claude/settings.json
//   node kernel/audit/audit.mjs installed                   exit 0 if it is (for ./setup doctor)
//
// Times: 90m, 24h, 7d or a date. The ledger: var/log/audit/YYYY-MM-DD.jsonl (ledger.mjs).

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { ageDays, DIR, read, ROOT, sinceArg, STATE } from "./ledger.mjs";

const HOOK = join(ROOT, "kernel/audit/hook.mjs");
const SETTINGS = process.env.AUDIT_SETTINGS || join(homedir(), ".claude/settings.json");
const COMMAND = `node "${HOOK}"`;
// Tool events take a matcher; the rest do not.
const EVENTS = ["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionDenied", "UserPromptSubmit",
  "SessionStart", "SessionEnd", "SubagentStart", "SubagentStop", "Stop", "StopFailure"];
const TOOL_EVENTS = new Set(["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionDenied"]);
const KEEP_DAYS = 90;

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

// ---- formatting ------------------------------------------------------------------

const clock = (ts) => new Date(ts).toLocaleTimeString("en-GB", { hour12: false });
const stamp = (ts) => new Date(ts).toLocaleString("en-CA", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "");
const short = (session) => (session || "?").slice(0, 8);
const oneLine = (text, width = 110) => {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > width ? flat.slice(0, width - 1) + "…" : flat;
};

// The part of a tool input a person would want to see first.
const gist = (input) => {
  if (!input || typeof input !== "object") return oneLine(input);
  const first = input.command ?? input.file_path ?? input.url ?? input.action_summary ?? input.pattern ?? input.query ??
    input.description ?? input.prompt ?? (input.actions && input.actions.map((action) => action?.input?.action_summary || action?.name).join("; "));
  return oneLine(first ?? JSON.stringify(input));
};

const line = (record) => {
  const who = `${record.surface || "?"} ${short(record.session)}${record.agent ? `/${record.agentType || "agent"}` : ""}`;
  const what = {
    PreToolUse: () => `${record.decision === "allow" ? "call" : record.decision.toUpperCase()} ${record.tool}  ${gist(record.input)}${record.why ? `  — ${oneLine(record.why, 90)}` : ""}`,
    PostToolUse: () => null,
    PostToolUseFailure: () => `FAIL ${record.tool}  ${oneLine(record.error, 90)}`,
    PermissionDenied: () => `REFUSED ${record.tool}  ${gist(record.input)}  — ${oneLine(record.reason, 80)}`,
    UserPromptSubmit: () => `prompt  ${oneLine(record.prompt)}`,
    SessionStart: () => `start (${record.source || "?"})  ${record.cwd || ""}`,
    SessionEnd: () => `end (${record.reason || "?"})`,
    SubagentStart: () => `subagent start ${record.agentType || ""}`,
    SubagentStop: () => `subagent stop ${record.agentType || ""}`,
    Stop: () => "turn done",
    StopFailure: () => `TURN FAILED  ${oneLine(record.error, 90)}`,
  }[record.event];
  const text = what ? what() : record.event;
  return text == null ? null : `${clock(record.ts)}  ${who.padEnd(20)} ${text}`;
};

// ---- reading ---------------------------------------------------------------------

const bySession = (records) => {
  const sessions = new Map();
  for (const record of records) {
    const key = record.session || "?";
    if (!sessions.has(key)) sessions.set(key, { session: key, surface: record.surface, cwd: record.cwd, first: record.ts, last: record.ts, prompts: [], calls: 0, fails: 0, flags: 0, asks: 0, denies: 0, refused: 0, agents: new Set(), tools: {}, maxRepeat: 0 });
    const s = sessions.get(key);
    s.last = record.ts;
    s.cwd ||= record.cwd;
    if (record.agent) s.agents.add(record.agent);
    if (record.event === "UserPromptSubmit") s.prompts.push(record.prompt);
    if (record.event === "PreToolUse") {
      s.calls += 1;
      s.tools[record.tool] = (s.tools[record.tool] || 0) + 1;
      if (record.decision === "flag") s.flags += 1;
      if (record.decision === "ask") s.asks += 1;
      if (record.decision === "deny") s.denies += 1;
      s.maxRepeat = Math.max(s.maxRepeat, record.repeat || 1);
    }
    if (record.event === "PostToolUseFailure" && !record.interrupted) s.fails += 1;
    if (record.event === "PermissionDenied") s.refused += 1;
  }
  return [...sessions.values()];
};

// A session that only started and ended did nothing. The desktop app starts dozens of those
// under the claude-vscode entrypoint (72 in the first week), which doubled the session count.
const worked = (s) => s.prompts.length > 0 || s.calls > 0;

const notable = (record) => (record.event === "PreToolUse" && record.decision !== "allow") || record.event === "PermissionDenied" || record.event === "StopFailure";

const hookErrors = (since) => {
  const path = join(DIR, "errors.log");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter((entry) => /^\d{4}-/.test(entry) && new Date(entry.slice(0, 24)) >= since);
};

// What in a session deserves a person's eyes, beyond its flags.
const concerns = (s) => {
  const out = [];
  if (s.denies) out.push(`${s.denies} blocked`);
  if (s.asks) out.push(`${s.asks} asked for approval`);
  if (s.refused) out.push(`${s.refused} refused by permissions`);
  if (s.maxRepeat >= 4) out.push(`repeated one call ${s.maxRepeat}x`);
  if (s.calls >= 10 && s.fails / s.calls > 0.3) out.push(`${Math.round(100 * s.fails / s.calls)}% of calls failed`);
  if (s.calls > 600) out.push(`${s.calls} calls`);
  return out;
};

// ---- commands --------------------------------------------------------------------

const commands = {
  tail() {
    const n = Number(option("-n", 40));
    const lines = read(sinceArg(option("--since", "2d"))).map(line).filter(Boolean);
    console.log(lines.slice(-n).join("\n") || "(no events yet)");
  },

  sessions() {
    const sessions = bySession(read(sinceArg(option("--since", "24h")))).filter(worked);
    if (!sessions.length) return console.log("(no sessions in that window)");
    for (const s of sessions) {
      const top = Object.entries(s.tools).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tool, n]) => `${tool.replace(/^mcp__[^_]+(_[^_]+)*?__/, "")}×${n}`).join(" ");
      const issues = concerns(s);
      console.log(`${short(s.session)}  ${(s.surface || "?").padEnd(9)} ${stamp(s.first)}–${clock(s.last).slice(0, 5)}  ${String(s.calls).padStart(4)} calls  ${s.flags} flagged${issues.length ? "  ! " + issues.join(", ") : ""}  ${top}`);
      if (s.prompts[0]) console.log(`          ${oneLine(s.prompts[0], 100)}`);
    }
  },

  show() {
    const prefix = args[1];
    if (!prefix || prefix.startsWith("-")) throw new Error("usage: audit.mjs show <session id or prefix> [--since 7d]");
    const records = read(sinceArg(option("--since", "7d"))).filter((record) => (record.session || "").startsWith(prefix));
    if (!records.length) return console.log(`(no session starting ${prefix} in that window)`);
    console.log(records.map(line).filter(Boolean).join("\n"));
  },

  flags() {
    const records = read(sinceArg(option("--since", "24h"))).filter(notable);
    console.log(records.map(line).join("\n") || "(nothing flagged in that window)");
  },

  report() {
    const window = option("--since", "24h");
    const since = sinceArg(window);
    const records = read(since);
    const sessions = bySession(records).filter(worked);
    const calls = records.filter((record) => record.event === "PreToolUse");
    const fails = records.filter((record) => record.event === "PostToolUseFailure" && !record.interrupted);
    const surfaces = {};
    for (const s of sessions) surfaces[s.surface || "?"] = (surfaces[s.surface || "?"] || 0) + 1;
    const out = [];
    out.push(`Audit, last ${window}: ${sessions.length} sessions (${Object.entries(surfaces).map(([name, n]) => `${name} ${n}`).join(", ") || "none"}), ${calls.length} tool calls, ${fails.length} failed.`);

    const blocked = records.filter((record) => record.event === "PreToolUse" && (record.decision === "deny" || record.decision === "ask"));
    const refused = records.filter((record) => record.event === "PermissionDenied");
    const flagged = records.filter((record) => record.event === "PreToolUse" && record.decision === "flag");
    const section = (title, items) => {
      if (!items.length) return;
      out.push("", `${title} (${items.length})`);
      for (const record of items.slice(-15)) out.push("  " + line(record));
      if (items.length > 15) out.push(`  … ${items.length - 15} earlier: audit.mjs flags --since ${window}`);
    };
    section("Blocked or held for approval", blocked);
    section("Refused by permissions", refused);
    section("Flagged: sends, pushes, deletes, submits, schedules", flagged);

    const worry = sessions.map((s) => ({ s, issues: concerns(s) })).filter(({ issues }) => issues.length);
    if (worry.length) {
      out.push("", "Sessions to look at");
      for (const { s, issues } of worry) out.push(`  ${short(s.session)} ${s.surface}: ${issues.join(", ")}  — ${oneLine(s.prompts[0] || s.cwd, 70)}`);
    }
    const errors = hookErrors(since);
    if (errors.length) out.push("", `The audit hook itself failed ${errors.length} times; last: ${oneLine(errors.at(-1), 140)}`);
    const last = records.at(-1);
    if (!last) out.push("", "Nothing was recorded. Run: node kernel/audit/audit.mjs check");
    if (!blocked.length && !refused.length && !flagged.length && !worry.length && !errors.length && last) out.push("Nothing to look at.");
    out.push("", "Any session: node kernel/audit/audit.mjs show <id>");
    console.log(out.join("\n"));
    prune();
  },

  check() {
    const results = [];
    const test = (passed, what, fix) => results.push({ passed, what, fix });
    const settings = readSettings();
    const missing = EVENTS.filter((event) => !(settings.hooks?.[event] || []).some((group) => group.hooks?.some((hook) => hook.command === COMMAND)));
    test(missing.length === 0, "the audit hook is registered for every event in ~/.claude/settings.json",
      `node kernel/audit/audit.mjs install${missing.length < EVENTS.length ? ` (missing: ${missing.join(", ")})` : ""}`);
    test(!settings.disableAllHooks, "hooks are not switched off (disableAllHooks)", "remove disableAllHooks from ~/.claude/settings.json");
    const recent = read(sinceArg("24h"));
    test(recent.length > 0, "events were recorded in the last 24 hours", "start a Claude Code session and run any tool, then check again");
    const errors = hookErrors(sinceArg("24h"));
    test(errors.length === 0, "the hook ran without errors in the last 24 hours", `read ${join(DIR, "errors.log")}`);
    for (const { passed, what, fix } of results) console.log(`  ${passed ? "ok  " : "FIX "}  ${what}${passed ? "" : `  ->  ${fix}`}`);
    process.exitCode = results.some((result) => !result.passed) ? 1 : 0;
  },

  // Quiet, for ./setup doctor: exit 0 when the hook is registered for every event.
  installed() {
    const settings = readSettings();
    process.exitCode = !settings.disableAllHooks && EVENTS.every((event) => (settings.hooks?.[event] || []).some((group) => group.hooks?.some((hook) => hook.command === COMMAND))) ? 0 : 1;
  },

  install() {
    const settings = readSettings();
    settings.hooks ||= {};
    let changed = 0;
    for (const event of EVENTS) {
      const groups = (settings.hooks[event] ||= []);
      // An entry left by another checkout of this workspace points at the wrong path.
      for (const group of groups) {
        const before = group.hooks?.length || 0;
        group.hooks = (group.hooks || []).filter((hook) => hook.command === COMMAND || !/kernel\/audit\/hook\.mjs/.test(hook.command || ""));
        changed += before - group.hooks.length;
      }
      settings.hooks[event] = groups.filter((group) => group.hooks.length);
      if (!settings.hooks[event].some((group) => group.hooks.some((hook) => hook.command === COMMAND))) {
        settings.hooks[event].push({ ...(TOOL_EVENTS.has(event) ? { matcher: "*" } : {}), hooks: [{ type: "command", command: COMMAND, timeout: 10 }] });
        changed += 1;
      }
    }
    if (!changed) return console.log("  ok    the audit hook is already installed");
    writeSettings(settings);
    console.log(`  ok    the audit hook is installed for ${EVENTS.length} events in ${SETTINGS}`);
  },

  uninstall() {
    const settings = readSettings();
    for (const event of Object.keys(settings.hooks || {})) {
      settings.hooks[event] = settings.hooks[event]
        .map((group) => ({ ...group, hooks: (group.hooks || []).filter((hook) => !/kernel\/audit\/hook\.mjs/.test(hook.command || "")) }))
        .filter((group) => group.hooks.length);
      if (!settings.hooks[event].length) delete settings.hooks[event];
    }
    if (settings.hooks && !Object.keys(settings.hooks).length) delete settings.hooks;
    writeSettings(settings);
    console.log("  ok    the audit hook is removed; the ledger is left in place");
  },
};

function readSettings() {
  if (!existsSync(SETTINGS)) return {};
  return JSON.parse(readFileSync(SETTINGS, "utf8"));
}

// A copy of the old file sits next to it, so a bad merge is one cp away from undone.
function writeSettings(settings) {
  mkdirSync(dirname(SETTINGS), { recursive: true });
  if (existsSync(SETTINGS)) copyFileSync(SETTINGS, `${SETTINGS}.before-audit`);
  writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");
}

// The ledger keeps 90 days; the per-session repeat counters only matter while a session runs.
function prune() {
  if (!existsSync(DIR)) return;
  for (const name of readdirSync(DIR)) {
    if (/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name) && ageDays(join(DIR, name)) > KEEP_DAYS) unlinkSync(join(DIR, name));
  }
  if (!existsSync(STATE)) return;
  for (const name of readdirSync(STATE)) if (ageDays(join(STATE, name)) > 2) unlinkSync(join(STATE, name));
}

const run = commands[args[0] || "tail"];
if (!run) {
  console.log("usage: audit.mjs tail | sessions | show <session> | flags | report | check | install | installed | uninstall");
  process.exit(2);
}
try {
  run();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
