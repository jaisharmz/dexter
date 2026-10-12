// node --test kernel/audit/audit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

test("quotes pair left to right, so a command between two quoted words is still read", () => {
  // Until Oct 10 the closing quote of "x" paired with the opening quote of "y" and hid the middle.
  assert.equal(bash(`grep -n "x" f; rm -rf ~; grep -c "y" f`).decision, "deny");
  assert.equal(bash(`echo "a"; git push --force origin main; echo "b"`).decision, "ask");
  assert.equal(bash(`ls 'a'; git add -f home/secret.md; ls 'b'`).decision, "deny");
  assert.equal(bash(`echo "a"; sh kernel/public/sync.sh push; echo "b"`).decision, "ask");
  // Text the shell only carries is still ignored, quotes inside it included.
  assert.equal(bash(`git commit -m "don't git push --force, it's 'rm -rf ~' all over"`).decision, "allow");
  assert.equal(bash(`echo "unclosed; git push --force`).decision, "ask");
  // Oct 3: a sed into the audit's own tests, with two quoted words around nothing but flags.
  assert.equal(bash(`grep -n "example" kernel/public/sync.sh | head -5; sed -i '' -e 's/a@b\\.com/a@example.org/g' kernel/audit/audit.test.mjs; grep -c "example" kernel/audit/audit.test.mjs`).decision, "ask");
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

test("a doc that only mentions the audit's paths is not a change to the audit", () => {
  // Oct 5: people-refresh rewrote two docs in home/people whose prose names both guarded paths.
  const doc = "cd /work/intel/home/people; python3 - <<'EOF'\np=\"tools/refresh.md\"; s=open(p).read()\nnew='An allow rule in `~/.claude/settings.json` covers it, and the hook (`kernel/audit/`) holds sends.'\nopen(p,\"w\").write(s.replace('x', new))\nEOF";
  assert.equal(bash(doc).decision, "allow");
  assert.equal(bash("cat > /tmp/note.md <<'EOF'\nNever cp a policy into kernel/audit/ by hand.\nEOF").decision, "allow");
  // Writing a guarded file still asks, from a script, a one-liner or a heredoc bash runs.
  assert.equal(bash("python3 - <<'EOF'\nimport pathlib\np = pathlib.Path(\"kernel/audit/policy.mjs\")\np.write_text(p.read_text().replace('a', 'b'))\nEOF").decision, "ask");
  assert.equal(bash(`python3 -c "open('/Users/you/.claude/settings.json','w').write('{}')"`).decision, "ask");
  assert.equal(bash("bash -s <<'EOF'\nsed -i '' 's/a/b/' kernel/audit/policy.mjs\nEOF").decision, "ask");
  assert.equal(bash("cat > kernel/audit/policy.mjs <<'EOF'\nexport const decide = () => ({ decision: 'allow', rules: [] });\nEOF").decision, "ask");
});

test("a page script that clicks a commit is flagged", () => {
  // Oct 5 to 9: eighteen Submit Application and Book clicks went through javascript_tool unflagged.
  const js = (text, tool = "mcp__claude-in-chrome__javascript_tool") => decide({ tool, input: { action: "javascript_exec", text } }, ctx());
  assert.equal(js("const b = [...document.querySelectorAll('button')].find((b) => /Submit Application/i.test(b.innerText)); b.click();").decision, "flag");
  assert.equal(js("document.querySelector('#btn-submit').click()").decision, "flag");
  assert.equal(js("Array.from(document.querySelectorAll('button')).find((x) => x.innerText.trim() === 'Book').click()").decision, "flag");
  assert.equal(js("document.querySelector('form').requestSubmit(); 'sent'").decision, "flag");
  assert.equal(js("document.querySelector('button[type=submit]').click()", "mcp__Claude_Browser__javascript_tool").decision, "flag");
  assert.equal(js("document.body.innerText.includes('Submit Application')").decision, "allow");
  assert.equal(js("document.querySelector('[aria-label=\"Next page\"]').click()").decision, "allow");
  const batch = decide({ tool: "mcp__claude-in-chrome__browser_batch", input: { actions: [{ name: "javascript_tool", input: { text: "document.querySelector('#submit').click()" } }] } }, ctx());
  assert.equal(batch.decision, "flag");
});

test("throwing away work in git is flagged", () => {
  // Oct 6: git checkout -- reverted two config files in the shared checkout. Oct 10: filter-branch rewrote the public build.
  for (const command of ["git checkout -- config/sources.json", "git checkout .", "git restore skills/x.md", "git restore --staged --worktree a", "git reset --hard HEAD~1", "git clean -fd", "git stash drop", "git branch -D old", "FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --index-filter x HEAD", "git -C /work/dexter filter-repo --path x"]) {
    assert.deepEqual([bash(command).decision, ids(bash(command))], ["flag", ["git-discard"]], command);
  }
  for (const command of ["git checkout main", "git checkout -b feature", "git restore --staged var/queue/items.json", "git reset HEAD~1", "git stash", "git branch -d merged"]) {
    assert.equal(bash(command).decision, "allow", command);
  }
});

test("a schedule, a routine or another session's permissions changed through a tool is flagged", () => {
  const call = (tool, input = {}) => decide({ tool, input }, ctx());
  assert.equal(call("mcp__scheduled-tasks__create_scheduled_task", { taskId: "x", prompt: "y" }).decision, "flag");
  assert.equal(call("mcp__scheduled-tasks__update_scheduled_task", { taskId: "x" }).decision, "flag");
  assert.equal(call("CronCreate", { cron: "47 7 9 10 *", prompt: "y" }).decision, "flag");
  assert.equal(call("CronDelete", { id: "x" }).decision, "flag");
  assert.equal(call("mcp__scheduled-tasks__list_scheduled_tasks").decision, "allow");
  assert.equal(call("Write", { file_path: join(homedir(), ".claude/scheduled-tasks/x/SKILL.md") }).decision, "flag");
  const mode = call("mcp__ccd_session_mgmt__set_session_permission_mode", { session_id: "local_x", mode: "auto" });
  assert.deepEqual([mode.decision, ids(mode)], ["flag", ["session-control"]]);
  assert.match(mode.rules[0].why, /auto/);
  assert.equal(call("mcp__ccd_session_mgmt__stop_session", { session_id: "local_x" }).decision, "flag");
  assert.equal(call("mcp__ccd_session_mgmt__get_session", { session_id: "self" }).decision, "allow");
});

test("a draft sent with its recipients written alongside says they are unchecked", () => {
  // Gmail ignores to, cc and bcc when draftId is given, and sends the draft as it is addressed.
  const gmail = (input) => decide({ tool: "mcp__abc123__send_message", input }, ctx());
  const declared = gmail({ draftId: "r1", to: ["me@example.com"] });
  assert.equal(declared.decision, "flag");
  assert.match(declared.rules[0].why, /ignores to, cc and bcc/);
  assert.equal(gmail({ draftId: "r1" }).decision, "ask");
  assert.equal(gmail({ draftId: "r1", to: ["someone@example.org"] }).decision, "ask");
});

test("the report counts only sessions that did something", () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-report-"));
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const file = join(dir, `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.jsonl`);
  const ts = now.toISOString();
  const lines = [
    { ts, event: "SessionStart", session: "empty-1", surface: "claude-vscode" },
    { ts, event: "SessionEnd", session: "empty-1", surface: "claude-vscode" },
    { ts, event: "UserPromptSubmit", session: "real-1", surface: "desktop", prompt: "hello" },
    { ts, event: "PreToolUse", session: "real-1", surface: "desktop", tool: "Bash", input: { command: "ls" }, decision: "allow" },
  ];
  writeFileSync(file, lines.map((line) => JSON.stringify(line)).join("\n") + "\n");
  const cli = fileURLToPath(new URL("./audit.mjs", import.meta.url));
  const out = spawnSync("node", [cli, "report", "--since", "1d"], { encoding: "utf8", env: { ...process.env, AUDIT_DIR: dir } }).stdout;
  assert.match(out, /1 sessions \(desktop 1\), 1 tool calls/);
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

test("a Claude in Chrome click, keystroke or screenshot outside the Chrome lease is flagged", () => {
  const lease = (holder) => ({ lease: holder ? { holder, purpose: "Fill the CAIS form", expires: "2999-01-01T00:00:00Z" } : null, names: ["audit-queue"] });
  const chrome = (tool, input, held) => decide({ tool: `mcp__claude-in-chrome__${tool}`, input }, ctx({ chrome: lease(held) }));
  assert.equal(chrome("computer", { action: "left_click" }, "audit-queue").decision, "allow", "the holder may");
  const other = chrome("computer", { action: "type", text: "x" }, "job-leads");
  assert.deepEqual([other.decision, ids(other)], ["flag", ["chrome-lease"]]);
  assert.match(other.rules[0].why, /while job-leads holds the Chrome lease \(Fill the CAIS form\), and this session goes by audit-queue/);
  assert.match(chrome("computer", { action: "screenshot" }, null).rules[0].why, /nobody holds the Chrome lease/);
  assert.equal(chrome("form_input", { ref: "r1", value: "x" }, null).decision, "flag");
  assert.equal(chrome("computer", { action: "scroll" }, null).decision, "allow", "scrolling to read is not a touch");
  assert.equal(chrome("navigate", { url: "https://example.com" }, null).decision, "allow");
  assert.equal(chrome("browser_batch", { actions: [{ name: "navigate", input: {} }, { name: "computer", input: { action: "key", text: "Return" } }] }, "job-leads").decision, "flag");
  assert.equal(decide({ tool: "mcp__Claude_Browser__computer", input: { action: "left_click" } }, ctx({ chrome: lease(null) })).decision, "allow", "the built-in browser pane needs no lease");
});

test("the hook learns a session's holder names from its lease command and reads the live lease", async () => {
  const { chromeContext, noteHolders } = await import("./chrome.mjs");
  const dir = mkdtempSync(join(tmpdir(), "audit-lease-"));
  const holders = join(dir, "holders.json");
  assert.deepEqual(noteHolders(`node kernel/proc.mjs lease acquire chrome --holder "audit-queue" --purpose "the CAIS form" --ttl 10m && echo ok`, "cc-1", holders), ["audit-queue"]);
  assert.deepEqual(noteHolders("node kernel/proc.mjs lease status", "cc-1", holders), []);
  const write = (path, value) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), JSON.stringify(value));
  };
  write("var/run/proc.json", { processes: [], leases: { chrome: { holder: "audit-queue", purpose: "the CAIS form", expires: "2999-01-01T00:00:00Z" } } });
  write("var/sessions/registry.json", { sessions: { "job-leads": { name: "job-leads", session_id: "cc-2" } } });
  assert.deepEqual(chromeContext({ sessionId: "cc-1", root: dir, holders }), { lease: { holder: "audit-queue", purpose: "the CAIS form", expires: "2999-01-01T00:00:00Z" }, names: ["audit-queue"] });
  assert.deepEqual(chromeContext({ sessionId: "cc-2", root: dir, holders }).names, ["job-leads"], "or from the session registry");
  assert.equal(chromeContext({ sessionId: "cc-1", root: dir, holders, now: Date.parse("3000-01-01") }).lease, null, "an expired lease is no lease");
  // Through the hook itself: the lease command, then a click from the holder and one from another session.
  const hook = fileURLToPath(new URL("./hook.mjs", import.meta.url));
  const run = (payload) => spawnSync("node", [hook], { input: JSON.stringify(payload), encoding: "utf8", env: { ...process.env, AUDIT_DIR: join(dir, "audit"), AUDIT_LEASE_ROOT: dir, CLAUDE_CODE_ENTRYPOINT: "cli", OPENCLAW_SERVICE_KIND: "", OPENCLAW_GATEWAY_PORT: "" } });
  const base = { cwd: "/tmp", tool_use_id: "t", hook_event_name: "PreToolUse" };
  run({ ...base, session_id: "cc-3", tool_name: "Bash", tool_input: { command: "node kernel/proc.mjs lease acquire chrome --holder audit-queue --ttl 10m" } });
  run({ ...base, session_id: "cc-3", tool_name: "mcp__claude-in-chrome__computer", tool_input: { action: "left_click" } });
  run({ ...base, session_id: "cc-4", tool_name: "mcp__claude-in-chrome__computer", tool_input: { action: "left_click" } });
  const file = readdirSync(join(dir, "audit")).find((name) => name.endsWith(".jsonl"));
  const clicks = readFileSync(join(dir, "audit", file), "utf8").trim().split("\n").map((line) => JSON.parse(line)).filter((r) => r.tool === "mcp__claude-in-chrome__computer");
  assert.deepEqual(clicks.map((r) => [r.session, r.decision]), [["cc-3", "allow"], ["cc-4", "flag"]]);
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
