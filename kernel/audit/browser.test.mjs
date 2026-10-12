// node --test kernel/audit/browser.test.mjs
// The chat-typing rule: which page a browser action lands on, and typing in a chat app as a send.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chatApp, load, note, tabContext, typedPages, typingOf } from "./browser.mjs";
import { decide } from "./policy.mjs";

const root = "/work/intel";
const ctx = { cwd: root, root, publicClone: "/work/dexter", self: new Set(["me@example.com"]), surface: "desktop", repeat: 1 };
const chrome = (name) => `mcp__claude-in-chrome__${name}`;
const context = (executed, tabs) => [{ type: "text", text: "done" }, {
  type: "text",
  text: `\n\nTab Context:\n- Executed on tabId: ${executed}\n- Available tabs:\n${tabs.map(([id, title, url]) => `  • tabId ${id}: "${title}" ("${url}")`).join("\n")}`,
}];

// The batch that posted in Slack on Oct 10 at 8:41 PM, as the ledger recorded it.
const SLACK_TAB = 1182627989;
const slackBatch = {
  actions: [
    { name: "computer", input: { action: "left_click", coordinate: [700, 40], tabId: SLACK_TAB, action_summary: "Opens the Slack search box" } },
    { name: "computer", input: { action: "type", text: "from:me", tabId: SLACK_TAB, action_summary: "Types a search for messages from the signed-in user" } },
    { name: "computer", input: { action: "key", text: "Return", tabId: SLACK_TAB, action_summary: "Runs the Slack search" } },
  ],
};

const afterSlackNavigate = () => {
  const dir = mkdtempSync(join(tmpdir(), "browser-state-"));
  // The sweep's navigate named no tab; the result said which one it ran on.
  note(dir, "s1", chrome("navigate"), { url: "https://app.slack.com/client" }, context(SLACK_TAB, [[SLACK_TAB, "Slack", "https://app.slack.com/client/T0/C0"]]));
  return dir;
};

test("chat and messaging apps are told apart from ordinary pages by host and path", () => {
  for (const [url, app] of [
    ["https://app.slack.com/client/T0/C0", "Slack"], ["https://acme-team.slack.com/archives/C0", "Slack"],
    ["https://discord.com/channels/1/2", "Discord"], ["https://web.whatsapp.com/", "WhatsApp"],
    ["https://teams.microsoft.com/v2/", "Teams"], ["https://www.linkedin.com/messaging/thread/2-x/", "LinkedIn messaging"],
    ["https://mail.google.com/mail/u/0/#inbox?compose=new", "Gmail"], ["https://mail.google.com/chat/u/0/#chat/home", "Gmail"],
    ["https://mail.google.com/mail/u/1/?view=cm&fs=1&tf=1&to=a@example.com&su=Hello", "Gmail"],
    ["https://outlook.office.com/mail/deeplink/compose", "Outlook"], ["https://x.com/messages/123", "X"],
    ["app.slack.com/client", "Slack"],
  ]) assert.equal(chatApp(url), app, url);
  for (const url of ["https://www.linkedin.com/jobs/view/1/", "https://mail.google.com/mail/u/0/#inbox", "https://x.com/home",
    "https://docs.google.com/forms/d/e/1/viewform", "https://job-boards.greenhouse.io/acme/jobs/1", "https://notslack.com/", "chrome://newtab/", "data:,x"]) {
    assert.equal(chatApp(url), null, url);
  }
});

test("typing means a type, a Return, a paste, a filled field or a script that types", () => {
  assert.match(typingOf("computer", { action: "type", text: "from:me" }), /^types "from:me"$/);
  assert.match(typingOf("computer", { action: "key", text: "Return" }), /^presses Return$/);
  assert.match(typingOf("computer", { action: "key", text: "cmd+Return" }), /^presses/);
  assert.match(typingOf("computer", { action: "key", text: "cmd+v" }), /^pastes/);
  assert.match(typingOf("form_input", { ref: "ref_3", value: "hello" }), /^fills a field with "hello"$/);
  assert.match(typingOf("javascript_tool", { text: "document.execCommand('insertText', false, 'hi')" }), /types/);
  assert.match(typingOf("javascript_tool", { text: "box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))" }), /types/);
  assert.match(typingOf("javascript_tool", { text: "input.value = 'x'" }), /types/);
  // Oct 6: a script rewrote a Gmail draft's paragraphs inside its editor.
  assert.match(typingOf("javascript_tool", { text: "const ed = document.querySelector('div[contenteditable=\"true\"][role=\"textbox\"]'); ed.querySelectorAll('p')[1].textContent = 'I hope you have been well';" }), /types/);
  for (const [name, input] of [["computer", { action: "key", text: "Escape" }], ["computer", { action: "key", text: "Tab" }],
    ["computer", { action: "left_click", coordinate: [1, 2] }], ["computer", { action: "screenshot" }],
    ["javascript_tool", { text: "[...document.querySelectorAll('.msg')].map((m) => m.innerText).join('\\n')" }],
    ["javascript_tool", { text: "el.value === 'x' && el.innerText == 'y'" }], ["get_page_text", {}],
    // Oct 5: a read-only Discord sweep wrote what it found into its own element for get_page_text.
    ["javascript_tool", { text: "document.getElementById('__dumpart').textContent = rows.join('\\n'); rows.length" }]]) {
    assert.equal(typingOf(name, input), null, JSON.stringify(input));
  }
});

test("the Oct 10 Slack batch asks, and only the operator may approve it", () => {
  const dir = afterSlackNavigate();
  const verdict = decide({ tool: chrome("browser_batch"), input: slackBatch, browser: load(dir, "s1") }, ctx);
  assert.equal(verdict.decision, "ask");
  const rule = verdict.rules.find((hit) => hit.id === "chat-typing");
  assert.equal(rule.person, true);
  assert.match(rule.why, /^Types "from:me" in Slack \(https:\/\/app\.slack\.com\/client\/T0\/C0\)\./);
  // The same keystrokes without the click, or Return alone, are the same send.
  assert.equal(decide({ tool: chrome("computer"), input: slackBatch.actions[2].input, browser: load(dir, "s1") }, ctx).decision, "ask");
});

test("reading a chat app needs no typing and passes", () => {
  const dir = afterSlackNavigate();
  const read = {
    actions: [
      { name: "navigate", input: { url: "https://app.slack.com/client/T0/search/search-from:me", tabId: SLACK_TAB } },
      { name: "computer", input: { action: "screenshot", tabId: SLACK_TAB } },
      { name: "computer", input: { action: "key", text: "Escape", tabId: SLACK_TAB } },
      { name: "computer", input: { action: "scroll", coordinate: [1, 2], scroll_direction: "down", tabId: SLACK_TAB } },
      { name: "get_page_text", input: { tabId: SLACK_TAB } },
    ],
  };
  assert.equal(decide({ tool: chrome("browser_batch"), input: read, browser: load(dir, "s1") }, ctx).decision, "allow");
  assert.equal(decide({ tool: chrome("javascript_tool"), input: { tabId: SLACK_TAB, text: "document.body.innerText.slice(0, 5000)" }, browser: load(dir, "s1") }, ctx).decision, "allow");
});

test("a batch is read in order: a navigate moves its tab before the actions after it", () => {
  const dir = mkdtempSync(join(tmpdir(), "browser-state-"));
  note(dir, "s2", chrome("navigate"), { url: "https://job-boards.greenhouse.io/acme/jobs/1", tabId: 7 }, context(7, [[7, "Acme", "https://job-boards.greenhouse.io/acme/jobs/1"]]));
  const browser = load(dir, "s2");
  const typeThenGo = { actions: [
    { name: "computer", input: { action: "type", text: "hello", tabId: 7 } },
    { name: "navigate", input: { url: "https://app.slack.com/client", tabId: 7 } },
    { name: "computer", input: { action: "screenshot", tabId: 7 } },
  ] };
  assert.equal(decide({ tool: chrome("browser_batch"), input: typeThenGo, browser }, ctx).decision, "allow");
  const goThenType = { actions: [typeThenGo.actions[1], typeThenGo.actions[0]] };
  assert.equal(decide({ tool: chrome("browser_batch"), input: goThenType, browser }, ctx).decision, "ask");
});

test("typing on a page the session navigated to passes, redirects included; anywhere else is flagged", () => {
  const dir = mkdtempSync(join(tmpdir(), "browser-state-"));
  // forms.gle redirects to docs.google.com, which the result shows.
  note(dir, "s3", chrome("navigate"), { url: "https://forms.gle/abc", tabId: 9 }, context(9, [[9, "Form", "https://docs.google.com/forms/d/e/1/viewform"], [11, "Inbox", "https://mail.google.com/mail/u/0/#inbox"]]));
  const browser = load(dir, "s3");
  const type = (tabId, text = "an answer") => decide({ tool: chrome("computer"), input: { action: "type", text, tabId }, browser }, ctx);
  assert.equal(type(9).decision, "allow");
  const other = type(11);
  assert.equal(other.decision, "flag");
  assert.match(other.rules[0].why, /^Types "an answer" on https:\/\/mail\.google\.com\/mail\/u\/0\/#inbox, a page this session did not navigate to\.$/);
  const unknown = type(42);
  assert.equal(unknown.decision, "flag");
  assert.match(unknown.rules[0].why, /a tab whose address the audit has not seen/);
  // An unknown tab whose action says it is in Slack is still a chat.
  assert.equal(decide({ tool: chrome("computer"), input: { action: "type", text: "x", tabId: 42, action_summary: "Types in the Slack search" }, browser }, ctx).decision, "ask");
  // Gmail's compose is a chat; its search box is not.
  note(dir, "s3", chrome("navigate"), { url: "https://mail.google.com/mail/u/0/#inbox", tabId: 11 }, context(11, [[11, "Inbox", "https://mail.google.com/mail/u/0/#inbox"]]));
  assert.equal(decide({ tool: chrome("computer"), input: { action: "type", text: "from:me", tabId: 11 }, browser: load(dir, "s3") }, ctx).decision, "allow");
  note(dir, "s3", chrome("computer"), { action: "left_click", coordinate: [1, 2], tabId: 11 }, context(11, [[11, "Compose", "https://mail.google.com/mail/u/0/#inbox?compose=new"]]));
  assert.equal(decide({ tool: chrome("computer"), input: { action: "type", text: "Hi", tabId: 11 }, browser: load(dir, "s3") }, ctx).decision, "ask");
});

test("the result's tab list is read from text blocks and from the browser pane's tab list", () => {
  assert.deepEqual(tabContext(context(5, [[5, "A \"quoted\" title", "https://a.example/x"], [6, "B", "chrome://newtab/"]])), {
    executed: "5", tabs: { 5: "https://a.example/x", 6: "chrome://newtab/" },
  });
  const pane = { content: [{ type: "text", text: JSON.stringify({ browserOpen: true, tabs: [{ tabId: "tab-1", origin: "https://app.slack.com", isActive: true }] }) }] };
  assert.deepEqual(tabContext(pane).tabs, { "tab-1": "https://app.slack.com" });
  assert.deepEqual(tabContext("no context here"), { executed: null, tabs: {} });
  // A call that names no tab lands on the one the last result ran on.
  const dir = afterSlackNavigate();
  assert.equal(typedPages({ tool: "mcp__Claude_Browser__computer", input: { action: "type", text: "x" }, browser: load(dir, "s1") })[0].app, "Slack");
});

test("through the hook: denied in auto mode and unattended, asked in default mode", () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-hook-"));
  const hook = fileURLToPath(new URL("./hook.mjs", import.meta.url));
  const run = (event, env = {}) => spawnSync("node", [hook], {
    input: JSON.stringify(event),
    encoding: "utf8",
    env: { ...process.env, AUDIT_DIR: dir, CLAUDE_CODE_ENTRYPOINT: "claude-desktop", CLAUDE_CODE_SESSION_ATTENDED: "", ...env },
  });
  const base = { session_id: "hook-s1", cwd: "/tmp" };
  run({ ...base, hook_event_name: "PostToolUse", tool_name: chrome("navigate"), tool_use_id: "t1", tool_input: { url: "https://app.slack.com/client" },
    tool_response: context(SLACK_TAB, [[SLACK_TAB, "Slack", "https://app.slack.com/client/T0/C0"]]) });
  const pre = (mode, env) => JSON.parse(run({ ...base, hook_event_name: "PreToolUse", tool_name: chrome("browser_batch"), tool_use_id: `t-${mode}`, permission_mode: mode, tool_input: slackBatch }, env).stdout || "{}").hookSpecificOutput;
  const auto = pre("auto");
  assert.equal(auto.permissionDecision, "deny");
  assert.match(auto.permissionDecisionReason, /^\[audit: chat-typing\] Types "from:me" in Slack/);
  assert.match(auto.permissionDecisionReason, /In auto mode a model, not the operator/);
  assert.equal(pre("default").permissionDecision, "ask");
  assert.equal(pre("default", { CLAUDE_CODE_ENTRYPOINT: "sdk-ts" }).permissionDecision, "deny");
  // A failed call still records where it navigated.
  run({ ...base, session_id: "hook-s2", hook_event_name: "PostToolUseFailure", tool_name: chrome("browser_batch"), tool_use_id: "t2", error: "timeout",
    tool_input: { actions: [{ name: "navigate", input: { url: "discord.com/channels/1/2", tabId: 3 } }, { name: "computer", input: { action: "screenshot", tabId: 3 } }] } });
  assert.equal(load(join(dir, "state"), "hook-s2").tabs["3"].url, "https://discord.com/channels/1/2");
  const records = readFileSync(join(dir, readdirSync(dir).find((name) => name.endsWith(".jsonl"))), "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(records.filter((record) => record.event === "PreToolUse").map((record) => record.decision), ["deny", "ask", "deny"]);
  assert.ok(records.every((record) => !("browser" in (record.input || {}))), "the ledger keeps the call's input, not the tab state");
});
