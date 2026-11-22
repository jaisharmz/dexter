#!/usr/bin/env node
// Read Slack through the desktop app's accessibility tree. It never types, never sends a key, and never
// brings Slack forward. The only things it presses are a sidebar row and a workspace icon.
//   node slack.mjs where                      the conversation on screen and the workspace
//   node slack.mjs workspaces                 every workspace with its unread badge
//   node slack.mjs sidebar                    this workspace's sections, conversations, unread state and ids
//   node slack.mjs read [--json] [--older N]  the loaded messages in the open conversation; --older scrolls up N times first
//   node slack.mjs open <name|id> [--force]   show that conversation (marks it read for the operator, as a click would)
//   node slack.mjs workspace <name> [--force] switch workspace
// Each move prints the view it left; put them back with `open "<that name>"`. There is no back command on
// purpose: Slack's history button walks their own history and can land on an unread channel (Nov 22).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(homedir(), "Library/Caches/slack-skill");
const bin = join(cache, "ax");
const source = join(here, "ax.swift");
if (!existsSync(bin) || statSync(source).mtimeMs > statSync(bin).mtimeMs) {
  mkdirSync(cache, { recursive: true });
  execFileSync("swiftc", ["-O", source, "-o", bin], { stdio: "inherit" });
}
const ax = (...args) => execFileSync(bin, args, { encoding: "utf8", maxBuffer: 64 << 20 });

const [command = "where", ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(name);
const value = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
const positional = rest.filter((word, i) => !word.startsWith("--") && !(i > 0 && ["--older"].includes(rest[i - 1]))).join(" ");

function running() {
  try { execFileSync("pgrep", ["-x", "Slack"]); return true; } catch { return false; }
}
if (!running()) { console.error("Slack is not running. Open it in the background with: open -g -a Slack"); process.exit(1); }

function tree() {
  let roots = JSON.parse(ax("json", "Slack"));
  // Electron builds the web content's tree only after the first request, so an empty read gets one retry.
  if (!find(roots, (n) => n.role === "WebArea").length) {
    execFileSync("sleep", ["2"]);
    roots = JSON.parse(ax("json", "Slack"));
  }
  return roots;
}
function find(nodes, test, out = []) {
  for (const node of nodes) {
    if (test(node)) out.push(node);
    if (node.children) find(node.children, test, out);
  }
  return out;
}
const first = (nodes, test) => find(nodes, test)[0];
const label = (text = "") => text.split(" | ")[0];

function guardFront() {
  if (flag("--force")) return;
  if (ax("front", "Slack").trim() === "front") {
    console.error("Slack is the app the operator is using right now; changing its view would move their screen. Wait, or pass --force if they asked.");
    process.exit(1);
  }
}
function press(node, what) {
  const result = ax("press", "Slack", node.path).trim();
  if (!result.startsWith("pressed")) { console.error(`${what}: ${result}`); process.exit(1); }
  execFileSync("sleep", ["1.5"]);
}

function where(roots) {
  const window = roots[0]?.text ?? "";
  const workspace = find(roots, (n) => n.role === "RadioButton" && n.text?.endsWith("| 1") && n.dom === undefined)
    .find((n) => first(roots, (t) => t.role === "TabGroup" && t.text === "Workspaces")?.children?.includes(n));
  const view = window.replace(/ - Slack$/, "");
  // "! general (Channel) - Acme - 13 new items": the leading ! and the counts are the app badge.
  const name = view.replace(/^! /, "").replace(/ \((?:DM|Channel)\).*$/, "").replace(/ - .*$/, "");
  return { view, name, workspace: workspace ? label(workspace.text).replace(/ \d+$/, "") : undefined };
}

function workspaces(roots) {
  const group = first(roots, (n) => n.role === "TabGroup" && n.text === "Workspaces");
  return (group?.children ?? []).filter((n) => n.role === "RadioButton").map((n) => {
    const [name, selected] = n.text.split(" | ");
    const match = name.match(/^(.*?)(?: (\d+))?$/);
    return { name: match[1], unread: Number(match[2] ?? 0), current: selected === "1", node: n };
  });
}

function sidebar(roots) {
  const outline = first(roots, (n) => n.role === "Outline" && n.text === "Channels and direct messages");
  const sections = [];
  let section = { name: "Top", rows: [] };
  for (const row of outline?.children ?? []) {
    if (row.role !== "Row") continue;
    if (row.dom?.startsWith("sectionHeading-")) {
      section = { name: row.text, rows: [] };
      sections.push(section);
      for (const child of find(row.children ?? [], (n) => n.role === "Row")) section.rows.push(conversation(child));
    } else if (section.name === "Top") {
      section.rows.push(conversation(row));
      if (!sections.includes(section)) sections.unshift(section);
    }
  }
  return sections;
}
function conversation(row) {
  const text = row.text ?? "";
  const name = text.replace(/ \((?:has |away|active|private|notifications|\d+ unread).*$/, "");
  return {
    name,
    id: /^[CDG][A-Z0-9]{6,}$/.test(row.dom ?? "") ? row.dom : undefined,
    unread: /has unread|unread highlight|has \d+ notification/.test(text),
    detail: text.slice(name.length).trim().replace(/^\(|\)$/g, "") || undefined,
    node: row,
  };
}

function messages(roots) {
  const groups = find(roots, (n) => /^message-list_\d+\.\d+$/.test(n.dom ?? ""));
  let sender;
  return groups.map((group) => {
    const ts = Number(group.dom.split("_")[1]);
    const nodes = find(group.children ?? [], () => true);
    const reactions = first(group.children ?? [], (n) => n.text === "Reactions");
    const skip = new Set(reactions ? find([reactions], () => true) : []);
    const timeLink = nodes.find((n) => n.role === "Link" && / at \d/.test(n.text ?? ""));
    if (timeLink) for (const n of find([timeLink], () => true)) skip.add(n);
    const who = nodes.find((n) => n.role === "Button" && n.text && !skip.has(n) && !/reaction|repl(y|ies)|more actions|thread/i.test(n.text));
    if (who) sender = who.text;
    let text = nodes.filter((n) => n.role === "StaticText" && n.text && !skip.has(n)).map((n) => n.text).join(" ").replace(/\s+/g, " ").trim();
    // A message scrolled half out of view keeps only its summary: "Sender: text. 12:01 AM."
    if (!text && group.text) {
      const summary = group.text.match(/^(.+?): (.*)\. [\d:]+ [AP]M\.?$/);
      if (summary) { sender = summary[1]; text = summary[2]; } else text = group.text;
    }
    const replies = nodes.find((n) => /\d+ repl(y|ies)/i.test(n.text ?? ""));
    const reacted = reactions ? find([reactions], (n) => n.role === "CheckBox").map((n) => { const m = label(n.text).match(/^(\d+) reactions?, react with (.+?)(?: emoji)?$/); return m ? `${m[2]} x${m[1]}` : label(n.text); }) : [];
    return {
      at: new Date(ts * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      ts: group.dom.split("_")[1],
      sender,
      text,
      ...(replies ? { thread: label(replies.text) } : {}),
      ...(reacted.length ? { reactions: reacted } : {}),
    };
  });
}

const roots = tree();
switch (command) {
  case "where": {
    const here = where(roots);
    console.log(`${here.view}${here.workspace ? `\nworkspace: ${here.workspace}` : ""}`);
    break;
  }
  case "workspaces":
    for (const w of workspaces(roots)) console.log(`${w.current ? "*" : " "} ${w.name}${w.unread ? `  (${w.unread} unread)` : ""}`);
    break;
  case "sidebar":
    for (const section of sidebar(roots)) {
      console.log(`## ${section.name}`);
      for (const row of section.rows) console.log(`${row.unread ? "•" : " "} ${row.name}${row.detail ? `  (${row.detail})` : ""}${row.id ? `  ${row.id}` : ""}`);
    }
    break;
  case "read": {
    const older = Number(value("--older") ?? 0);
    for (let i = 0; i < older; i++) {
      const top = find(roots, (n) => /^message-list_\d+\.\d+$/.test(n.dom ?? ""))[0];
      if (!top) break;
      try { ax("scroll", "Slack", top.path); } catch {}
      execFileSync("sleep", ["1.2"]);
      roots.splice(0, roots.length, ...tree());
    }
    const list = messages(roots);
    if (flag("--json")) console.log(JSON.stringify({ ...where(roots), messages: list }, null, 2));
    else {
      console.log(`# ${where(roots).view}`);
      for (const m of list) console.log(`[${m.at}] ${m.sender ?? "?"}: ${m.text}${m.thread ? `  [${m.thread}]` : ""}${m.reactions ? `  {${m.reactions.join("; ")}}` : ""}`);
    }
    break;
  }
  case "open": {
    if (!positional) { console.error("usage: open <name|id>"); process.exit(2); }
    guardFront();
    const rows = sidebar(roots).flatMap((s) => s.rows);
    const wanted = positional.toLowerCase();
    const row = rows.find((r) => r.id === positional) ?? rows.find((r) => r.name.toLowerCase() === wanted) ?? rows.find((r) => r.name.toLowerCase().includes(wanted));
    if (!row) { console.error(`no sidebar conversation matches "${positional}"; run sidebar, or switch workspace first`); process.exit(1); }
    const left = where(roots);
    const before = left.view;
    // Slack ignores AXPress on the row itself; the click handler sits on the group just inside it.
    const target = row.node.children?.find((n) => n.role === "Group") ?? row.node;
    press(target, `open ${row.name}`);
    const after = where(tree()).view;
    if (after === before) { console.error(`pressed ${row.name} but the view did not change (still ${before})`); process.exit(1); }
    console.log(`opened ${after}${row.unread ? "\nit was unread, so Slack now shows it as read" : ""}\nleft ${left.name}; restore with: open "${left.name}"`);
    break;
  }
  case "workspace": {
    if (!positional) { console.error("usage: workspace <name>"); process.exit(2); }
    guardFront();
    const all = workspaces(roots);
    const target = all.find((w) => w.name.toLowerCase() === positional.toLowerCase()) ?? all.find((w) => w.name.toLowerCase().includes(positional.toLowerCase()));
    if (!target) { console.error(`no workspace matches "${positional}"`); process.exit(1); }
    const before = where(roots);
    press(target.node, `workspace ${target.name}`);
    const after = where(tree());
    if (after.workspace !== target.name) { console.error(`pressed ${target.name} but the workspace is still ${after.workspace}`); process.exit(1); }
    console.log(`switched to ${target.name}, showing ${after.view}\nleft ${before.workspace}, ${before.name}; restore with: workspace "${before.workspace}" then open "${before.name}"`);
    break;
  }
  default:
    console.error(`unknown command ${command}`);
    process.exit(2);
}
