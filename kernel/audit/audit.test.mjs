// node --test kernel/audit/audit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "./policy.mjs";
import { redact } from "./ledger.mjs";

const root = "/work/intel";
const ctx = (extra = {}) => ({ cwd: root, root, publicClone: "/work/dexter", self: new Set(["me@example.com"]), surface: "desktop", repeat: 1, ...extra });
const bash = (command, extra) => decide({ tool: "Bash", input: { command } }, ctx(extra));
const ids = (verdict) => verdict.rules.map((rule) => rule.id);

test("ordinary work passes untouched", () => {
  for (const command of ["git status", "ls -la", "node kernel/pqueue.mjs list", "git commit -m 'x'", "trash temp/a.txt", "rm temp/a.txt"]) {
    assert.equal(bash(command).decision, "allow", command);
  }
  assert.equal(decide({ tool: "Read", input: { file_path: "/work/intel/CLAUDE.md" } }, ctx()).decision, "allow");
});

test("git add -f in the workspace is denied, elsewhere allowed", () => {
  assert.equal(bash("git add -f home/x").decision, "deny");
  assert.equal(bash("git add --force a.csv").decision, "deny");
  assert.equal(bash("cd /work/intel && git add -fA").decision, "deny");
  assert.equal(bash("git add -A").decision, "allow");
  assert.equal(bash("git add -f x", { cwd: "/other/repo" }).decision, "allow");
});

test("a force push asks", () => {
  assert.equal(bash("git push --force origin main").decision, "ask");
  assert.equal(bash("git push -f").decision, "ask");
  assert.equal(bash("git -C /work/dexter push origin +main", { cwd: "/tmp" }).decision, "ask");
  assert.equal(bash("cd /other/repo && git commit --amend -m x && git push --force-with-lease origin main").decision, "ask");
});

test("text a command only carries never trips a rule", () => {
  assert.equal(bash(`node kernel/queue.mjs add "Operator: run sh kernel/public/sync.sh push, then gh repo edit x --visibility public"`).decision, "allow");
  assert.equal(bash("git commit -q -F - <<'EOF'\nWhy we no longer git push --force\n\nrm -rf / is never right\nEOF").decision, "allow");
  assert.equal(bash("python3 - <<'PY'\nprint('openclaw gateway restart')\nPY\necho done").decision, "allow");
  assert.equal(bash(`rm -rf "$HOME"`).decision, "deny");
});

test("a git command in another repo is judged by that repo", () => {
  assert.equal(bash("cd /other/repo && git add -f build/x").decision, "allow");
  assert.equal(bash("cd /work/intel/skills && git add -f x").decision, "deny");
  assert.equal(bash("git push -q origin main; git -C /work/dexter diff --cached").decision, "flag");
  assert.equal(bash("cd /tmp && cd /work/dexter && git push").decision, "ask");
});

test("a plain push is flagged, and a push to the public build asks", () => {
  assert.deepEqual([bash("git push").decision, ids(bash("git push"))], ["flag", ["push"]]);
  assert.equal(bash("git -C /work/dexter push", { cwd: "/tmp" }).decision, "ask");
  assert.equal(bash("sh kernel/public/sync.sh push").decision, "ask");
  assert.equal(bash("sh kernel/public/sync.sh build").decision, "allow");
});

test("rm -r of something vital is denied, other rm -r is flagged", () => {
  assert.equal(bash("rm -rf /").decision, "deny");
  assert.equal(bash("rm -rf ~").decision, "deny");
  assert.equal(bash("rm -rf $HOME").decision, "deny");
  assert.equal(bash("rm -r home").decision, "deny");
  assert.equal(bash("rm -rf home/people").decision, "deny");
  assert.equal(bash("rm -rf .git").decision, "deny");
  assert.equal(bash("rm -rf *").decision, "deny");
  assert.equal(bash("rm -rf /work").decision, "deny");
  assert.equal(bash("rm -rf temp/build").decision, "flag");
  assert.equal(bash("rm -rf home/people/tools/__pycache__").decision, "flag");
});

test("the gateway: denied from Discord, asked elsewhere", () => {
  assert.equal(bash("openclaw gateway restart", { surface: "discord" }).decision, "deny");
  assert.equal(bash("openclaw gateway restart").decision, "ask");
  assert.equal(bash("openclaw gateway status").decision, "allow");
});

test("sending: to someone else asks, to the operator is flagged, drafts pass", () => {
  const gmail = (tool, input) => decide({ tool: `mcp__abc123__${tool}`, input }, ctx());
  assert.equal(gmail("send_message", { to: ["someone@example.org"] }).decision, "ask");
  assert.equal(gmail("send_message", { to: "Me <ME@example.com>" }).decision, "flag");
  assert.equal(gmail("send_message", { to: "me@example.com", cc: "x@example.net" }).decision, "ask");
  assert.equal(gmail("reply", { thread_id: "1" }).decision, "ask");
  assert.equal(gmail("create_draft", { to: "someone@example.org" }).decision, "allow");
  assert.equal(decide({ tool: "mcp__openclaw__message", input: {} }, ctx()).decision, "allow");
  assert.equal(decide({ tool: "mcp__ccd_session_mgmt__send_message", input: {} }, ctx()).decision, "allow");
});

test("committing clicks and connector deletes are flagged", () => {
  const click = decide({ tool: "mcp__claude-in-chrome__computer", input: { action: "left_click", action_summary: "Submits the application form" } }, ctx());
  assert.equal(click.decision, "flag");
  const batch = decide({ tool: "mcp__Claude_Browser__browser_batch", input: { actions: [{ name: "computer", input: { action_summary: "Opens the menu" } }, { name: "computer", input: { action_summary: "Places the order" } }] } }, ctx());
  assert.equal(batch.decision, "flag");
  assert.equal(decide({ tool: "mcp__claude-in-chrome__computer", input: { action: "screenshot" } }, ctx()).decision, "allow");
  assert.equal(decide({ tool: "mcp__abc__trash_thread", input: {} }, ctx()).decision, "flag");
});

test("changing the audit itself asks", () => {
  const settings = join(homedir(), ".claude/settings.json");
  assert.equal(decide({ tool: "Edit", input: { file_path: settings } }, ctx()).decision, "ask");
  assert.equal(decide({ tool: "Write", input: { file_path: "kernel/audit/policy.mjs" } }, ctx()).decision, "ask");
  assert.equal(bash(`sed -i '' 's/a/b/' ~/.claude/settings.json`).decision, "ask");
  assert.equal(bash("node kernel/audit/audit.mjs install").decision, "allow");
  assert.equal(bash("node kernel/audit/audit.mjs report > /tmp/r.txt").decision, "allow");
  assert.equal(bash("cat ~/.claude/settings.json").decision, "allow");
});

test("a call repeated is flagged at 4 and denied at 8", () => {
  assert.equal(bash("ls", { repeat: 3 }).decision, "allow");
  assert.equal(bash("ls", { repeat: 4 }).decision, "flag");
  assert.equal(bash("ls", { repeat: 8 }).decision, "deny");
});

test("secrets are redacted and long strings cut", () => {
  const out = redact({ password: "hunter2", command: "curl -H 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456' x", note: "y".repeat(1000) });
  assert.equal(out.password, "[redacted]");
  assert.ok(!out.command.includes("abcdefghijklmnop"));
  assert.ok(out.note.length < 450);
});

test("the hook writes the ledger and answers a deny", () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-"));
  const hook = fileURLToPath(new URL("./hook.mjs", import.meta.url));
  const run = (payload, env = {}) => spawnSync("node", [hook], {
    input: JSON.stringify(payload), encoding: "utf8",
    env: { ...process.env, AUDIT_DIR: dir, CLAUDE_CODE_ENTRYPOINT: "cli", OPENCLAW_SERVICE_KIND: "", OPENCLAW_GATEWAY_PORT: "", ...env },
  });
  const base = { session_id: "s1", cwd: "/tmp", tool_use_id: "t1" };
  assert.equal(run({ ...base, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } }).stdout, "");
  const denied = run({ ...base, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "rm -rf ~" } });
  assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, "deny");
  // An ask with nobody attending becomes a deny.
  const unattended = run({ ...base, hook_event_name: "PreToolUse", tool_name: "mcp__x__send_message", tool_input: { to: "a@example.org" } }, { CLAUDE_CODE_ENTRYPOINT: "sdk-cli" });
  assert.equal(JSON.parse(unattended.stdout).hookSpecificOutput.permissionDecision, "deny");
  const attended = run({ ...base, hook_event_name: "PreToolUse", tool_name: "mcp__x__send_message", tool_input: { to: "a@example.org" } });
  assert.equal(JSON.parse(attended.stdout).hookSpecificOutput.permissionDecision, "ask");
  // In auto mode a model would answer the prompt, so a send is blocked; a force push still asks.
  const auto = run({ ...base, permission_mode: "auto", hook_event_name: "PreToolUse", tool_name: "mcp__x__send_message", tool_input: { to: "a@example.org" } });
  assert.equal(JSON.parse(auto.stdout).hookSpecificOutput.permissionDecision, "deny");
  const autoPush = run({ ...base, permission_mode: "auto", hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git push -f" } });
  assert.equal(JSON.parse(autoPush.stdout).hookSpecificOutput.permissionDecision, "ask");
  run({ ...base, hook_event_name: "PostToolUseFailure", tool_name: "Bash", error: "exit 1" });
  // Garbage in still exits 0 and logs the error.
  assert.equal(spawnSync("node", [hook], { input: "{not json", env: { ...process.env, AUDIT_DIR: dir } }).status, 0);

  const file = readdirSync(dir).find((name) => name.endsWith(".jsonl"));
  const records = readFileSync(join(dir, file), "utf8").trim().split("\n").map((entry) => JSON.parse(entry));
  assert.deepEqual(records.map((record) => record.decision || record.event), ["allow", "deny", "deny", "ask", "deny", "ask", "PostToolUseFailure"]);
  assert.equal(records[0].surface, "terminal");
  assert.ok(readFileSync(join(dir, "errors.log"), "utf8").includes("JSON"));
});

test("install merges into existing settings and is idempotent", () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-settings-"));
  const settings = join(dir, "settings.json");
  writeFileSync(settings, JSON.stringify({ model: "x", hooks: { Stop: [{ hooks: [{ type: "command", command: "echo mine" }] }] } }));
  const cli = fileURLToPath(new URL("./audit.mjs", import.meta.url));
  const env = { ...process.env, AUDIT_SETTINGS: settings };
  spawnSync("node", [cli, "install"], { env });
  spawnSync("node", [cli, "install"], { env });
  const after = JSON.parse(readFileSync(settings, "utf8"));
  assert.equal(after.model, "x");
  assert.equal(after.hooks.PreToolUse.length, 1);
  assert.equal(after.hooks.PreToolUse[0].matcher, "*");
  assert.equal(after.hooks.Stop.length, 2);
  assert.ok(after.hooks.Stop.some((group) => group.hooks[0].command === "echo mine"));
  spawnSync("node", [cli, "uninstall"], { env });
  const removed = JSON.parse(readFileSync(settings, "utf8"));
  assert.deepEqual(Object.keys(removed.hooks), ["Stop"]);
});
