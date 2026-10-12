// Who holds Claude in Chrome. A session clicks, types or takes a screenshot in the operator's own
// Chrome only under the Chrome lease (kernel/proc.mjs, AGENTS.md), because two sessions typing at
// once fill one form with each other's answers. The hook knows a session only by Claude Code's
// session id, and a lease names its holder, so this joins the two: the names the session registry
// gives that id, and every holder name the session has taken a lease under, which the hook notes
// when it sees the `lease acquire` command go by.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
};

const unquote = (word) => word.replace(/^(["'])(.*)\1$/, "$2");
const ACQUIRE = /\bproc\.mjs\s+lease\s+acquire\s+\S+[^;&|\n]*?--holder\s+("[^"]+"|'[^']+'|[^\s;&|]+)/g;

// The holder names a command takes leases under, noted against the session that runs it.
export const noteHolders = (command, sessionId, path) => {
  const names = [...String(command ?? "").matchAll(ACQUIRE)].map((match) => unquote(match[1]));
  if (!names.length || !sessionId) return [];
  const known = readJson(path, {});
  known[sessionId] = [...new Set([...(known[sessionId] ?? []), ...names])];
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(known, null, 2) + "\n");
  return names;
};

// The live Chrome lease, if any, and the names this session goes by.
export const chromeContext = ({ sessionId, root, holders, now = Date.now() }) => {
  const lease = readJson(join(root, "var/run/proc.json"), {}).leases?.chrome ?? null;
  const live = lease && Date.parse(lease.expires) > now ? lease : null;
  const sessions = Object.values(readJson(join(root, "var/sessions/registry.json"), {}).sessions ?? {});
  const names = new Set([
    ...sessions.filter((s) => s.session_id === sessionId || s.cli_session_id === sessionId).map((s) => s.name),
    ...(readJson(holders, {})[sessionId] ?? []),
  ]);
  return { lease: live, names: [...names].filter(Boolean) };
};
