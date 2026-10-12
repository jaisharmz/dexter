// Which page a browser action lands on. The audit sees a tool call, not the screen, so a typed
// search and a typed message look alike to it. On Oct 10 at 8:41 PM a read-only Slack sweep's
// click missed the search box, and the "from:me" it typed, with Return, posted in a channel as
// the operator. So the hook keeps, per session, the address of each browser tab: from the
// session's own navigate calls, and from the "Tab Context" block that ends every Claude in
// Chrome and browser-pane result. The chat-typing rule in policy.mjs reads it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const BROWSER = /^mcp__(claude-in-chrome|Claude_Browser)__/;

// Chat and messaging web apps, where a keystroke and Return post as the operator. A host that
// matches with a path that does not (LinkedIn outside /messaging, Gmail outside a compose) is
// an ordinary page.
const CHATS = [
  [/(^|\.)slack\.com$/, () => "Slack"],
  [/(^|\.)(discord\.com|discordapp\.com)$/, () => "Discord"],
  [/^(web\.)?whatsapp\.com$/, () => "WhatsApp"],
  [/^web\.telegram\.org$/, () => "Telegram"],
  [/^(www\.)?messenger\.com$/, () => "Messenger"],
  [/^messages\.google\.com$/, () => "Google Messages"],
  [/^chat\.google\.com$/, () => "Google Chat"],
  [/^teams\.(microsoft|live)\.com$/, () => "Teams"],
  [/^(www\.)?linkedin\.com$/, (url) => /^\/messaging(\/|$)/.test(url.pathname) && "LinkedIn messaging"],
  [/^(www\.)?facebook\.com$/, (url) => /^\/messages(\/|$)/.test(url.pathname) && "Messenger"],
  [/^(www\.)?(x|twitter)\.com$/, (url) => /^\/(messages|compose|i\/chat)(\/|$)/.test(url.pathname) && "X"],
  // A compose is ?compose= in the inbox, or the full-page window, ?view=cm.
  [/^mail\.google\.com$/, (url) => (/^\/chat(\/|$)/.test(url.pathname) || /[?&#]compose=|[?&]view=cm(&|$)/.test(url.search + url.hash)) && "Gmail"],
  [/^outlook\.(office|office365|live)\.com$/, (url) => /compose/i.test(url.pathname + url.search + url.hash) && "Outlook"],
];

// When the audit has not seen a tab's address, the action's own summary may still name the app.
const CHAT_WORDS = /\b(slack|discord|whatsapp|telegram|messenger)\b/i;

const parse = (address) => {
  try {
    return new URL(/^[a-z][\w+.-]*:/i.test(address) ? address : `https://${address}`);
  } catch {
    return null;
  }
};

export const chatApp = (address) => {
  const url = parse(String(address ?? ""));
  if (!url) return null;
  for (const [host, path] of CHATS) {
    if (host.test(url.hostname)) return path(url) || null;
  }
  return null;
};

// Scheme and host, so two pages of one site are one place. data: and chrome: pages have none.
export const originOf = (address) => {
  const url = parse(String(address ?? ""));
  return url ? `${url.protocol}//${url.host}` : null;
};

// ---- what a call types --------------------------------------------------------------

const short = (text) => {
  const line = String(text ?? "").replace(/\s+/g, " ").trim();
  return line.length > 40 ? `${line.slice(0, 40)}…` : line;
};

// A script that types or presses keys rather than reads: insertText or a paste, a synthetic key,
// input or clipboard event, or an assignment to a field's value. Setting an element's text types
// only when the script also names an editable field, as the Oct 6 scripts that rewrote a Gmail
// draft's paragraphs did. Otherwise it is reading: read-only sweeps write what they found into a
// scratch element of their own for get_page_text.
const TYPING_SCRIPT = /execCommand\(\s*["'`](insertText|insertHTML|paste)|new\s+(Keyboard|Input|Clipboard)Event\(|\.value\s*=(?!=)/;
const SETS_TEXT = /\.(textContent|innerText|innerHTML)\s*=(?!=)/;
const EDITABLE = /contenteditable|role=\\?["']?textbox|<?textarea|aria-label=\\?["']?(Message|Reply)/i;
const typesInScript = (text) => TYPING_SCRIPT.test(text) || (SETS_TEXT.test(text) && EDITABLE.test(text));

// What one action types, in words, or null when it types nothing.
export const typingOf = (name, input = {}) => {
  if (/form_input$/.test(name)) return `fills a field with "${short(input.value)}"`;
  if (/javascript_tool$/.test(name)) return typesInScript(String(input.text ?? "")) ? "runs a script that types" : null;
  if (!/computer$/.test(name)) return null;
  if (input.action === "type") return `types "${short(input.text)}"`;
  if (input.action !== "key") return null;
  const keys = String(input.text ?? "").split(/\s+/).filter(Boolean);
  if (keys.some((key) => /^(return|enter|kp_enter)$/i.test(key.split("+").pop()))) return `presses ${keys.join(" ")}`;
  if (keys.some((key) => /^(cmd|command|ctrl|control|meta|super)\+v$/i.test(key))) return `pastes (${keys.join(" ")})`;
  return null;
};

const actionsOf = (call) => {
  const name = call.tool.split("__").pop();
  if (name === "browser_batch") return (call.input?.actions || []).map((action) => ({ name: action?.name || "", input: action?.input || {} }));
  return [{ name, input: call.input || {} }];
};

const navigation = (name, input) => /(^|__)navigate$/.test(name) && typeof input.url === "string" ? input.url : null;

// Each typing action in a call, with the page it lands on: { what, tab, url, app, opened }.
// app names the chat app, if the page is one; opened says whether this session navigated that
// tab to that site. A batch's own navigate actions move its tabs before the actions after them.
export const typedPages = (call) => {
  const browser = call.browser || {};
  const tabs = new Map();
  const tab = (id) => {
    const key = String(id);
    if (!tabs.has(key)) {
      const saved = browser.tabs?.[key] || {};
      tabs.set(key, { url: saved.url ?? null, opened: new Set(saved.opened || []) });
    }
    return tabs.get(key);
  };
  let last = browser.last ?? null;
  const hits = [];
  for (const { name, input } of actionsOf(call)) {
    const id = input.tabId ?? last;
    if (input.tabId != null) last = input.tabId;
    const url = navigation(name, input);
    if (url != null) {
      if (id == null) continue;
      const moved = tab(id);
      if (/^(back|forward)$/.test(url)) {
        moved.url = null;
      } else {
        moved.url = parse(url)?.href ?? url;
        moved.opened.add(originOf(moved.url));
      }
      continue;
    }
    const what = typingOf(name, input);
    if (!what) continue;
    const page = id == null ? { url: null, opened: new Set() } : tab(id);
    const hinted = !page.url && CHAT_WORDS.exec(String(input.action_summary ?? ""));
    const app = page.url ? chatApp(page.url) : hinted ? hinted[1][0].toUpperCase() + hinted[1].slice(1).toLowerCase() : null;
    hits.push({ what, tab: id, url: page.url, app, opened: Boolean(page.url) && page.opened.has(originOf(page.url)) });
  }
  return hits;
};

// ---- what the session has seen ------------------------------------------------------

// Every string in a tool's result, however Claude Code shaped it.
const strings = (value, out = []) => {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => strings(item, out));
  return out;
};

// The tabs a result lists, and the one it ran on. The block reads:
//   Tab Context:
//   - Executed on tabId: 1182627989
//   - Available tabs:
//     • tabId 1182627989: "Slack" ("https://app.slack.com/client")
export const tabContext = (response) => {
  const text = strings(response).join("\n");
  const executed = /Executed on tabId:\s*([\w-]+)/.exec(text)?.[1] ?? null;
  const tabs = {};
  for (const match of text.matchAll(/^\s*•\s*tabId\s+([\w-]+):.*\("([^"\n]*)"\)\s*$/gm)) tabs[match[1]] = match[2];
  // The browser pane's tab list gives each tab's origin and no title.
  for (const match of text.matchAll(/"tabId"\s*:\s*"?([\w-]+)"?\s*,\s*"(?:url|origin)"\s*:\s*"([^"]*)"/g)) tabs[match[1]] ??= match[2];
  return { executed, tabs };
};

const MAX_TABS = 60;
const fileFor = (dir, session) => join(dir, `browser-${String(session).replace(/[^\w.-]/g, "_")}.json`);

export const load = (dir, session) => {
  try {
    return JSON.parse(readFileSync(fileFor(dir, session), "utf8"));
  } catch {
    return { last: null, tabs: {} };
  }
};

// After a browser call ran: the tabs it navigated, then the addresses its result shows. A site a
// tab reached through this session's own navigate call, redirects included, counts as opened.
export const note = (dir, session, tool, input, response, now = new Date()) => {
  if (!BROWSER.test(tool || "") || !session) return null;
  const state = load(dir, session);
  state.tabs ||= {};
  const touch = (id) => (state.tabs[String(id)] ||= { url: null, opened: [] });
  const navigated = new Set();
  let last = state.last ?? null;
  for (const { name, input: action } of actionsOf({ tool, input })) {
    const id = action.tabId ?? last;
    if (action.tabId != null) last = action.tabId;
    const url = navigation(name, action);
    if (url == null || id == null || /^(back|forward)$/.test(url)) continue;
    const entry = touch(id);
    entry.url = parse(url)?.href ?? url;
    entry.opened = [...new Set([...entry.opened, originOf(entry.url)])];
    navigated.add(String(id));
  }
  const seen = tabContext(response);
  for (const [id, url] of Object.entries(seen.tabs)) {
    const entry = touch(id);
    entry.url = url;
    if (navigated.has(id)) entry.opened = [...new Set([...entry.opened, originOf(url)])];
    entry.at = now.toISOString();
  }
  for (const id of navigated) touch(id).at = now.toISOString();
  state.last = seen.executed ?? last;
  const ids = Object.keys(state.tabs).sort((a, b) => String(state.tabs[b].at ?? "").localeCompare(String(state.tabs[a].at ?? "")));
  for (const id of ids.slice(MAX_TABS)) delete state.tabs[id];
  mkdirSync(dir, { recursive: true });
  writeFileSync(fileFor(dir, session), JSON.stringify(state));
  return state;
};
