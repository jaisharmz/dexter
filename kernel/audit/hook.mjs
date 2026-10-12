#!/usr/bin/env node
// The one Claude Code hook behind the audit. Registered for every hook event in the user's
// ~/.claude/settings.json (audit.mjs install), because that is the only settings file
// every surface reads: the desktop app, a terminal, scheduled tasks, headless handoffs, and
// Dexter on Discord, which OpenClaw starts with `--setting-sources user`.
//
// Each event becomes one line in today's ledger. Before a tool runs, policy.mjs decides
// whether it may, and a deny or ask goes back to Claude Code as the hook's answer.
//
// A broken audit must never stop the agent: any failure here exits 0 with no answer,
// and is written to var/log/audit/errors.log for the next audit to report.

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { append, DIR, redact, ROOT, scrub, STATE } from "./ledger.mjs";
import { chromeContext, noteHolders } from "./chrome.mjs";
import { decide } from "./policy.mjs";

const readStdin = () => {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
};

const localConfig = () => {
  try { return JSON.parse(readFileSync(join(ROOT, "etc/audit.local.json"), "utf8")); } catch { return {}; }
};

// Where this agent is running, from what the launcher put in the environment.
const surfaceOf = (env) => {
  if (env.OPENCLAW_SERVICE_KIND || env.OPENCLAW_GATEWAY_PORT) return "discord";
  const entry = env.CLAUDE_CODE_ENTRYPOINT || "";
  if (entry === "claude-desktop") return "desktop";
  if (entry === "cli") return "terminal";
  if (entry.startsWith("sdk")) return "headless";
  return entry || "unknown";
};

// Nobody can answer a permission prompt on Discord, in a headless run or in a scheduled
// desktop run.
const unattended = (surface, env) => surface === "discord" || surface === "headless" || env.CLAUDE_CODE_SESSION_ATTENDED === "0";

// Modes in which a permission prompt is answered by Claude Code itself rather than a person.
const MODEL_APPROVED = new Set(["auto", "bypassPermissions", "dontAsk"]);

// How many times in a row this agent has made this exact call, this one included.
const repeatCount = (key, call) => {
  const hash = createHash("sha1").update(call.tool + "\0" + JSON.stringify(call.input ?? null)).digest("hex");
  const path = join(STATE, `${key.replace(/[^\w.-]/g, "_")}.json`);
  let last = {};
  try { last = JSON.parse(readFileSync(path, "utf8")); } catch {}
  const count = last.hash === hash ? last.count + 1 : 1;
  mkdirSync(STATE, { recursive: true });
  writeFileSync(path, JSON.stringify({ hash, count }));
  return count;
};

const answer = (decision, reason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: reason },
  }));
};

const logError = (error) => {
  try {
    mkdirSync(DIR, { recursive: true });
    appendFileSync(join(DIR, "errors.log"), `${new Date().toISOString()} ${error?.stack || error}\n`);
  } catch {}
};

// Mail another session left for this one while it was busy ("mail for a session in the middle of
// a turn" in kernel/sessions.mjs), handed over as context after a tool call or with a prompt. Only
// the main thread takes it, because a subagent's tool call carries its parent's session id. With
// nothing waiting, this costs one stat.
const handOverMail = async (input, record) => {
  const root = process.env.AUDIT_MAIL_ROOT || ROOT;
  const id = String(input.session_id || "");
  if (input.agent_id || !/^[\w-]+$/.test(id) || !existsSync(join(root, "var/sessions/live", id))) return;
  try {
    const { collectLive, renderLive } = await import("../sessions.mjs");
    const mail = collectLive(id, root);
    if (!mail.length) return;
    record.mail = mail.map(({ envelope }) => envelope.id);
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: renderLive(mail) } }));
  } catch (error) {
    logError(error);
  }
};

// The address of each browser tab, for the chat-typing rule (browser.mjs): what a Claude in Chrome
// or browser-pane call navigated, and the tabs its result lists. Kept even when the call failed,
// since a batch that stopped halfway may have navigated first.
const noteBrowser = async (input) => {
  if (!/^mcp__(claude-in-chrome|Claude_Browser)__/.test(input.tool_name || "") || !input.session_id) return;
  try {
    const { note } = await import("./browser.mjs");
    note(STATE, input.session_id, input.tool_name, input.tool_input, input.tool_response);
  } catch (error) {
    logError(error);
  }
};

const main = async () => {
  const text = readStdin();
  if (!text.trim()) return;
  const input = JSON.parse(text);
  const env = process.env;
  const surface = surfaceOf(env);
  const event = input.hook_event_name;
  const record = {
    ts: new Date().toISOString(),
    event,
    session: input.session_id,
    surface,
    cwd: input.cwd,
    ...(input.agent_id ? { agent: input.agent_id, agentType: input.agent_type } : {}),
  };

  switch (event) {
    case "SessionStart":
      Object.assign(record, { source: input.source, model: input.model, transcript: input.transcript_path, mode: input.permission_mode });
      break;
    case "UserPromptSubmit":
      record.prompt = scrub(input.prompt || "", 600);
      await handOverMail(input, record);
      break;
    case "PreToolUse": {
      const call = { tool: input.tool_name, input: input.tool_input };
      // A browser call carries what the session's earlier calls showed of its tabs (browser.mjs).
      if (/^mcp__(claude-in-chrome|Claude_Browser)__/.test(call.tool)) call.browser = (await import("./browser.mjs")).load(STATE, input.session_id);
      const config = localConfig();
      const publicClone = config.publicClone ? resolve(ROOT, config.publicClone)
        : existsSync(join(ROOT, "kernel/public/sync.sh")) ? resolve(ROOT, "../dexter") : null;
      const self = new Set([env.CLAUDE_CODE_USER_EMAIL, ...(config.self || []), ...(config.standingRecipients || [])].filter(Boolean).map((address) => address.toLowerCase()));
      const repeat = repeatCount(`${input.session_id}-${input.agent_id || "main"}`, call);
      // Who holds Claude in Chrome: noted as a session takes the lease, read when it touches Chrome.
      const holders = join(STATE, "lease-holders.json");
      if (call.tool === "Bash") noteHolders(call.input?.command, input.session_id, holders);
      const chrome = /^mcp__claude-in-chrome__/.test(call.tool) ? chromeContext({ sessionId: input.session_id, root: env.AUDIT_LEASE_ROOT || ROOT, holders }) : undefined;
      const verdict = decide(call, { cwd: input.cwd || process.cwd(), root: ROOT, publicClone, self, surface, repeat, chrome });
      let decision = verdict.decision;
      let why = verdict.rules.filter((rule) => rule.decision === decision).map((rule) => rule.why).join(" ");
      if (decision === "ask" && unattended(surface, env)) {
        decision = "deny";
        why += " No one is attending this session to approve it, so it is blocked here: leave it for the operator, or file it to the queue as an item for them.";
      } else if (decision === "ask" && MODEL_APPROVED.has(input.permission_mode) && verdict.rules.some((rule) => rule.decision === "ask" && rule.person)) {
        decision = "deny";
        why += ` In ${input.permission_mode} mode a model, not the operator, would answer this prompt, so it is blocked: the operator runs it, or approves it from a session in default mode.`;
      }
      Object.assign(record, {
        tool: call.tool, id: input.tool_use_id, mode: input.permission_mode, input: redact(call.input),
        decision, ...(verdict.rules.length ? { rules: verdict.rules.map((rule) => rule.id), why: scrub(why, 600) } : {}),
        ...(repeat > 1 ? { repeat } : {}),
      });
      append(record);
      if (decision === "deny" || decision === "ask") answer(decision, `[audit: ${verdict.rules[0].id}] ${why}`);
      return;
    }
    case "PostToolUse":
      Object.assign(record, { tool: input.tool_name, id: input.tool_use_id, ok: true, bytes: JSON.stringify(input.tool_response ?? "").length });
      await noteBrowser(input);
      await handOverMail(input, record);
      break;
    case "PostToolUseFailure":
      Object.assign(record, { tool: input.tool_name, id: input.tool_use_id, ok: false, error: scrub(input.error || "", 300), interrupted: input.is_interrupt || undefined });
      await noteBrowser(input);
      await handOverMail(input, record);
      break;
    case "PermissionDenied":
      Object.assign(record, { tool: input.tool_name, id: input.tool_use_id, input: redact(input.tool_input), reason: scrub(input.reason || input.message || "", 300) });
      break;
    case "SubagentStart":
    case "SubagentStop":
      record.agentType = input.agent_type;
      break;
    case "StopFailure":
      record.error = scrub(input.error || input.message || "", 300);
      break;
    case "SessionEnd":
      record.reason = input.reason;
      break;
    default:
      break;
  }
  append(record);
};

try {
  await main();
} catch (error) {
  logError(error);
}
process.exit(0);
