// What an agent may do without anyone looking. Every rule here is a line already written
// somewhere in this workspace (CLAUDE.md, AGENTS.md, kernel/public/README.md), made into
// a check that runs before the tool does, because a rule an agent has to remember is a
// rule it will one day forget.
//
// Four outcomes, from mildest to strongest:
//   allow  nothing to note
//   flag   allowed, and marked in the ledger so the audit shows it: sends, pushes, deletes,
//          submits, schedules. These are the acts worth reading back.
//   ask    the operator approves this one act. A session nobody is attending cannot be
//          asked, so there ask becomes deny (hook.mjs). In auto mode Claude Code hands an
//          ask to its classifier, not to a person; a rule marked `person` (a send, a
//          publish) is then denied too, since only the operator may approve those.
//   deny   never right for an agent, whoever asks.
//
// The bar for deny is high on purpose: a wrong deny stalls real work, and the ledger
// catches the rest. Add a rule when the audit shows a mistake that happened, not one
// that might.

import { homedir } from "node:os";
import { resolve } from "node:path";
import { BROWSER, typedPages } from "./browser.mjs";

const RANK = { allow: 0, flag: 1, ask: 2, deny: 3 };
export const LOOP_FLAG = 4;
export const LOOP_DENY = 8;

// ---- reading a shell command -----------------------------------------------------

// What the shell will run, without the text it only carries: heredoc bodies (a Python
// script, a commit message) and quoted strings with spaces in them (a queue item's title,
// a -m message). Replaying a week of real sessions showed rules firing on exactly that
// text, such as a queue item that mentions `sync.sh push`.
const withoutHeredocs = (command) => command.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, "<<HEREDOC");

// Quotes pair left to right, as the shell reads them. Until Oct 10 one regex did this, and it
// could pair a closing quote with the next opening one, so `grep "x" f; rm -rf ~; grep "y" f`
// lost its middle command and passed. An unclosed quote keeps the rest of the line visible.
const withoutText = (command) => {
  let out = "";
  for (let i = 0; i < command.length;) {
    const c = command[i];
    if (c === "\\") { out += command.slice(i, i + 2); i += 2; continue; }
    if (c !== "'" && c !== '"') { out += c; i += 1; continue; }
    let end = i + 1;
    while (end < command.length && command[end] !== c) end += c === '"' && command[end] === "\\" ? 2 : 1;
    if (end >= command.length) { out += command.slice(i); break; }
    const quoted = command.slice(i, end + 1);
    out += /\s/.test(quoted.slice(1, -1)) ? "TEXT" : quoted;
    i = end + 1;
  }
  return out;
};

const executable = (command) => withoutText(withoutHeredocs(command));

// The pieces of a command between ; && || | and newlines, so a pattern never matches
// across two commands.
const segments = (command) => executable(command).split(/;|&&|\|\||\||\n/).map((part) => part.trim()).filter(Boolean);

const unquote = (word) => word.replace(/^(["'])(.*)\1$/, "$2");
const expand = (path) => unquote(path).replace(/^~(?=\/|$)/, homedir()).replace(/^\$HOME(?=\/|$)/, homedir());

// Each segment with the directory it runs in: the cwd, moved by every `cd X` before it,
// or its own `git -C X`.
const located = (command, cwd) => {
  let dir = cwd;
  return segments(command).map((segment) => {
    const cd = /^\(?\s*cd\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/.exec(segment);
    if (cd) dir = resolve(dir, expand(cd[1]));
    const flag = /\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/.exec(segment);
    return { segment, places: [flag ? resolve(dir, expand(flag[1])) : dir] };
  });
};

const inside = (path, dir) => Boolean(dir) && (path === dir || path.startsWith(dir + "/"));

const isGit = (segment, verb) => new RegExp(`^(\\S+=\\S+\\s+)*git(\\s+-C\\s+\\S+|\\s+-c\\s+\\S+)*\\s+${verb}\\b`).test(segment);

// ---- the rules -------------------------------------------------------------------
// Each takes the call and the context and returns null or { decision, why }.

const bashRules = [
  {
    id: "git-add-force",
    test: ({ segment, places }, ctx) => isGit(segment, "add") && /\s(-[a-zA-Z]*f[a-zA-Z]*|--force)(\s|$)/.test(segment) &&
      places.some((place) => inside(place, ctx.root)) &&
      { decision: "deny", why: "git add -f forces a gitignored file past the privacy rules in .gitignore. Those rules are the boundary that keeps personal data out of every push; change .gitignore with the operator instead." },
  },
  {
    // Ask rather than deny: an amended commit sometimes has to go up with a lease.
    id: "force-push",
    test: ({ segment }) => isGit(segment, "push") && /\s(--force(-with-lease)?(=\S+)?|-[a-zA-Z]*f[a-zA-Z]*|\+\S+)(\s|$)/.test(segment) &&
      { decision: "ask", why: "A force push rewrites the remote's history, and nothing on the remote keeps what it replaced." },
  },
  {
    // Flag, not ask: reverting a file is routine. But several sessions share one checkout, so the
    // uncommitted edits a checkout -- or reset --hard throws away may be another session's.
    // The audit showed one on Oct 6 (two config files) and a filter-branch of the public build on Oct 10.
    id: "git-discard",
    test: ({ segment }) => ((isGit(segment, "checkout") && /\s(--(\s|$)|\.(\s|$))/.test(segment)) ||
      (isGit(segment, "restore") && (!/\s(--staged|-S)(\s|$)/.test(segment) || /\s(--worktree|-W)(\s|$)/.test(segment))) ||
      (isGit(segment, "reset") && /\s--hard(\s|$)/.test(segment)) ||
      (isGit(segment, "clean") && /\s-[a-zA-Z]*f/.test(segment)) ||
      (isGit(segment, "stash") && /\s(drop|clear)(\s|$)/.test(segment)) ||
      (isGit(segment, "branch") && /\s-[a-zA-Z]*D/.test(segment)) ||
      isGit(segment, "filter-branch") || isGit(segment, "filter-repo")) &&
      { decision: "flag", why: "Throws away work git cannot bring back (uncommitted edits, which in a shared checkout may be another session's) or rewrites history." },
  },
  {
    id: "publish-public",
    test: ({ segment, places }, ctx) => ((isGit(segment, "push") && places.some((place) => inside(place, ctx.publicClone))) ||
      /\bsync\.sh\s+push\b/.test(segment)) &&
      { decision: "ask", person: true, why: "A push to the public build is publishing. The operator approves each push (kernel/public/README.md)." },
  },
  {
    id: "delete-tree",
    test: ({ segment }, ctx) => {
      const match = /^(sudo\s+)?rm\s+(.*)$/.exec(segment);
      if (!match) return null;
      const words = match[2].split(/\s+/);
      if (!words.some((word) => /^(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)$/.test(word))) return null;
      const targets = words.filter((word) => !word.startsWith("-")).map((word) => resolve(ctx.cwd, expand(word)));
      const raw = words.filter((word) => !word.startsWith("-")).map(unquote);
      const vital = (target) => target === "/" || target === homedir() || inside(ctx.root, target) ||
        inside(target, resolve(ctx.root, "home")) && target.split("/").length <= resolve(ctx.root, "home").split("/").length + 1 ||
        /\/\.git$/.test(target);
      if (raw.some((word) => word === "*" || word === "/*") || targets.some(vital)) {
        return { decision: "deny", why: "This rm -r would remove the home directory, the workspace, its private home/ repository or a .git folder. None of that comes back. Use trash on the specific files instead." };
      }
      return { decision: "flag", why: "Recursive rm. The workspace prefers trash, which can be undone." };
    },
  },
  {
    id: "gateway-control",
    test: ({ segment }, ctx) => /\bopenclaw\s+gateway\s+(restart|stop|install|uninstall)\b/.test(segment) && (ctx.surface === "discord"
      ? { decision: "deny", why: "This run lives inside the gateway; restarting it from here kills the run halfway. Ask the operator to restart it." }
      : { decision: "ask", why: "A gateway restart drops every run in flight. Check `openclaw sessions --active 20` first." }),
  },
  {
    id: "repo-admin",
    test: ({ segment }) => /\bgh\s+repo\s+(delete|archive|rename)\b|\bgh\s+repo\s+edit\b.*--visibility/.test(segment) &&
      { decision: "ask", why: "Deleting, archiving, renaming or changing the visibility of a repository is hard to undo." },
  },
  {
    id: "push",
    test: ({ segment }) => isGit(segment, "push") && { decision: "flag", why: "git push" },
  },
  {
    id: "github-write",
    test: ({ segment }) => /\bgh\s+(pr\s+(create|merge|comment|review|close)|issue\s+(create|comment|close|edit)|release\s+(create|upload)|gist\s+create)\b|\bgh\s+api\b.*(-X|--method)\s*(POST|PATCH|PUT|DELETE)/.test(segment) &&
      { decision: "flag", why: "Writes to GitHub where other people can see it." },
  },
  {
    id: "schedule",
    test: ({ segment }) => /\bcrontab\s+(?!-l\b)\S|\blaunchctl\s+(load|unload|bootstrap|bootout|enable|disable)\b|\bopenclaw\s+cron\s+(add|rm|remove|edit|enable|disable)\b|\bschtasks\b/.test(segment) &&
      { decision: "flag", why: "Changes what runs on a schedule." },
  },
];

// The audit's own switch: the hook registration in Claude Code's user settings and the
// code under kernel/audit/. An agent that could edit either could turn its own guard off.
const auditFiles = (ctx) => [resolve(homedir(), ".claude/settings.json"), resolve(homedir(), ".claude/settings.local.json"), resolve(ctx.root, "kernel/audit")];
const TAMPER = { decision: "ask", why: "This changes the audit itself (its hook registration in ~/.claude/settings.json or kernel/audit/). The operator approves changes to the guard." };

// The heredocs in a command, each with the text before it on its line, which says what reads
// it: `python3 - <<'EOF'` feeds a script, `bash -s <<'EOF'` feeds more shell.
const heredocs = (command) => [...command.matchAll(/([^\n]*?)<<-?\s*(['"]?)(\w+)\2[^\n]*\n([\s\S]*?)\n\s*\3\s*(?=\n|$)/g)]
  .map((match) => ({ reader: match[1], body: match[4] }));

const tamper = (call, ctx) => {
  const path = call.input?.file_path || call.input?.notebook_path;
  if (path && /^(Write|Edit|MultiEdit|NotebookEdit)$/.test(call.tool)) {
    const full = resolve(ctx.cwd, expand(path));
    return auditFiles(ctx).some((guarded) => inside(full, guarded)) ? TAMPER : null;
  }
  if (call.tool !== "Bash") return null;
  const command = call.input?.command || "";
  if (/disableAllHooks/.test(command)) return TAMPER;
  // A write whose target is a guarded path: a redirect into it, or an editing command naming
  // it, anywhere but a heredoc a script reads. Quoted text stays in, since `bash -c "..."`
  // runs it. Reading the settings or redirecting a report elsewhere is fine.
  const guarded = String.raw`[^\s;&|]*(\.claude/settings(\.local)?\.json|kernel/audit/)`;
  const into = new RegExp(String.raw`>>?\s*["']?${guarded}|\b(sed\s+-[a-zA-Z]*i|perl\s+-[a-zA-Z]*i|tee|mv|cp|rm|trash|ln)\b[^;&|]*${guarded}`);
  const shell = [withoutHeredocs(command), ...heredocs(command).filter(({ reader }) => /(^|[\s(|])(ba|z|da)?sh(\s|$)/.test(reader)).map(({ body }) => body)];
  if (shell.some((text) => into.test(text))) return TAMPER;
  // A script that names a guarded file as a path, a quoted word with no space in it, and
  // writes a file. A doc whose sentences mention one is prose: on Oct 5 two people-refresh
  // edits were held because a profile said the audit lives in `kernel/audit/`.
  const named = /["'][^"'\s]*(\.claude\/settings(\.local)?\.json|kernel\/audit\/)[^"'\s]*["']/.test(command);
  const writes = /writeFile|appendFile|json\.dump\(|\.write\(|\.write_text\(|\.write_bytes\(|open\([^)]*["'][wa]\+?b?["']/.test(command);
  return named && writes ? TAMPER : null;
};

const COMMIT_WORD = /\b(submit|send|post|publish|place|purchase|pay|order|apply|confirm|delete|sign|accept|book|follow)/i;
// The same verbs as whole words in a script's strings, so a selector like
// `input[placeholder=...]` is not a "place".
const COMMIT_TOKEN = /\b(submit|send|post|publish|place|purchase|pay|order|apply|confirm|delete|sign|accept|book|follow)(s|es|ed|ing|ment)?\b/i;

// A page script that clicks or submits, where a string or regex in it names a commit:
// `[...buttons].find((b) => /Submit Application/i.test(b.innerText)).click()`. From Oct 5 to
// Oct 9, scripts like that submitted applications and booked a call unflagged, because only
// action summaries were read.
const committingScript = (text) => {
  // Submitting a form commits whatever it is; a click commits when the script names a commit.
  const submits = /\.submit\(\s*\)|\.requestSubmit\(|dispatchEvent\(\s*new\s+\w*Event\(\s*["']submit["']/.exec(text);
  if (submits) return submits[0];
  if (!/\.click\(\s*\)|dispatchEvent\(\s*new\s+\w*Event\(\s*["']click["']/.test(text)) return null;
  const literals = text.match(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1|\/(?:\\.|[^/\\\n])+\/[gimsuy]*/g) || [];
  return literals.find((literal) => COMMIT_TOKEN.test(literal)) || null;
};

// The Claude in Chrome actions that change a page or read it from the screen.
const TOUCH = /^(left_click|right_click|double_click|triple_click|left_click_drag|type|key|screenshot)$/;

const recipients = (input) => ["to", "cc", "bcc"].flatMap((field) => [].concat(input?.[field] || []))
  .flatMap((value) => String(value).split(/[,;]/)).map((address) => (/<([^>]+)>/.exec(address)?.[1] || address).trim().toLowerCase()).filter(Boolean);

const toolRules = [
  {
    id: "send-message",
    test: (call, ctx) => {
      if (!/^mcp__/.test(call.tool) || /^mcp__(openclaw|ccd_)/.test(call.tool)) return null;
      if (!/__(send_message|send_email|send_mail|reply|reply_all|forward)$/.test(call.tool)) return null;
      const to = recipients(call.input);
      const draft = call.input?.draftId || call.input?.draft_id;
      if (to.length && to.every((address) => ctx.self.has(address))) {
        // Gmail sends a draft as it is addressed and ignores to, cc and bcc, so on a draft send
        // the recipients written alongside are the agent's word. The report should say so.
        return { decision: "flag", why: draft
          ? `Sends draft ${draft}. Gmail ignores to, cc and bcc on a draft send, so these recipients are the agent's word, not the draft's: ${to.join(", ")}.`
          : `Sent to the operator or a standing recipient (${to.join(", ")}).` };
      }
      return { decision: "ask", person: true, why: `Sends a message${to.length ? ` to ${to.join(", ")}` : ""}. Nothing leaves the machine without the operator approving that specific send.` };
    },
  },
  {
    id: "connector-delete",
    test: (call) => /^mcp__/.test(call.tool) && /(delete|trash|remove|purge)/i.test(call.tool.split("__").pop()) &&
      { decision: "flag", why: "Deletes through a connector." },
  },
  {
    id: "calendar-or-share",
    test: (call) => /__(create_event|update_event|respond_to_event|share_file|create_comment)$/.test(call.tool) &&
      { decision: "flag", why: "Reaches other people through a calendar invite, a share or a comment." },
  },
  {
    id: "browser-commit",
    test: (call) => {
      const actions = call.input?.actions || [];
      if (/__javascript_tool$/.test(call.tool)) {
        const hit = committingScript(call.input?.text || "");
        return hit ? { decision: "flag", why: `Browser script clicks ${hit}` } : null;
      }
      if (!/__(computer|form_input|browser_batch)$/.test(call.tool)) return null;
      const summaries = [call.input?.action_summary, ...actions.map((action) => action?.input?.action_summary)].filter(Boolean);
      const hit = summaries.find((summary) => COMMIT_WORD.test(summary));
      if (hit) return { decision: "flag", why: `Browser: ${hit}` };
      const script = actions.map((action) => /javascript_tool$/.test(action?.name || "") && committingScript(action?.input?.text || "")).find(Boolean);
      return script ? { decision: "flag", why: `Browser script clicks ${script}` } : null;
    },
  },
  {
    // Clicks, keystrokes and screenshots in the operator's own Chrome happen under the Chrome lease
    // (AGENTS.md), so two sessions never type into one form at once. ctx.chrome comes from
    // chrome.mjs: the live lease, and the names this session goes by. The built-in browser pane is
    // each session's own, and needs no lease.
    id: "chrome-lease",
    test: (call, ctx) => {
      if (!ctx.chrome || !/^mcp__claude-in-chrome__(computer|form_input|browser_batch|file_upload|upload_image)$/.test(call.tool)) return null;
      const acts = (name, input = {}) => /form_input|file_upload|upload_image/.test(name) || (/computer/.test(name) && TOUCH.test(input.action || ""));
      const touches = call.tool.endsWith("browser_batch") ? (call.input?.actions || []).some((action) => acts(action?.name || "", action?.input)) : acts(call.tool, call.input);
      if (!touches) return null;
      const { lease, names } = ctx.chrome;
      if (!lease) return { decision: "flag", why: "Clicks, types or takes a screenshot in Claude in Chrome while nobody holds the Chrome lease. Take it first: node kernel/proc.mjs lease acquire chrome --holder <your name> --purpose <the form> --ttl 10m." };
      if (names.includes(lease.holder)) return null;
      return { decision: "flag", why: `Clicks, types or takes a screenshot in Claude in Chrome while ${lease.holder} holds the Chrome lease (${lease.purpose ?? "no purpose given"}), and this session goes by ${names.length ? names.join(" or ") : "no holder name the audit knows"}.` };
    },
  },
  {
    id: "schedule-file",
    test: (call) => /^(Write|Edit)$/.test(call.tool) && /Library\/LaunchAgents\/|\/etc\/(cron|systemd)|\.claude\/scheduled-tasks\//.test(call.input?.file_path || "") &&
      { decision: "flag", why: "Changes what runs on a schedule." },
  },
  {
    // A routine or a cron made through a tool, not crontab: 13 of them in the audit's first week.
    id: "schedule-tool",
    test: (call) => (/^mcp__scheduled-tasks__(create|update|delete)_scheduled_task$/.test(call.tool) || /^Cron(Create|Delete)$/.test(call.tool)) &&
      { decision: "flag", why: "Changes what runs on a schedule." },
  },
  {
    // A parent raising its children to auto mode is the spawn skill working, and still the
    // one act that widens what another session may do without asking.
    id: "session-control",
    test: (call) => /__(set_session_permission_mode|stop_session)$/.test(call.tool) &&
      { decision: "flag", why: /permission_mode$/.test(call.tool) ? `Sets another session's permission mode to ${call.input?.mode || "an unknown mode"}.` : "Stops another session's run." },
  },
  {
    // In a chat or messaging app a keystroke and Return post as the operator, so typing there is a
    // send. Oct 10, 8:41 PM: a read-only Slack sweep's click missed the search box, and its typed
    // "from:me" and Return posted in a channel. call.browser is the session's tabs and their
    // addresses, which the hook keeps (browser.mjs). Typing anywhere the session did not navigate
    // to is flagged, since that is how the keystrokes landed somewhere unintended.
    id: "chat-typing",
    test: (call) => {
      if (!BROWSER.test(call.tool)) return null;
      const hits = typedPages(call);
      const said = (hit) => hit.what[0].toUpperCase() + hit.what.slice(1);
      const chat = hits.find((hit) => hit.app);
      if (chat) {
        return { decision: "ask", person: true, why: `${said(chat)} in ${chat.app}${chat.url ? ` (${chat.url})` : ""}. In a chat or messaging app a keystroke and Return post as the operator, so typing there is a send. Read it through a connector, an export or a search URL loaded with navigate, which needs no typing.` };
      }
      // Where the session navigated is known only from the hook's state; without it, judge chats alone.
      const stray = call.browser && hits.find((hit) => !hit.opened);
      return stray ? { decision: "flag", why: `${said(stray)} on ${stray.url ?? "a tab whose address the audit has not seen"}, a page this session did not navigate to.` } : null;
    },
  },
];

// ---- deciding --------------------------------------------------------------------

// call: { tool, input }   ctx: { cwd, root, publicClone, self: Set, surface, repeat, chrome? }
// Returns { decision, rules: [{ id, decision, why }] }, the strongest decision first.
export const decide = (call, ctx) => {
  const hits = [];
  const add = (id, result) => { if (result) hits.push({ id, ...result }); };

  add("audit-tamper", tamper(call, ctx));
  if (call.tool === "Bash") {
    for (const piece of located(call.input?.command || "", ctx.cwd)) {
      for (const rule of bashRules) add(rule.id, rule.test(piece, ctx));
    }
  } else {
    for (const rule of toolRules) add(rule.id, rule.test(call, ctx));
  }
  if (ctx.repeat >= LOOP_DENY) {
    add("loop", { decision: "deny", why: `The same ${call.tool} call, with the same input, ${ctx.repeat} times in a row. Stop and change approach, or say what is stuck.` });
  } else if (ctx.repeat >= LOOP_FLAG) {
    add("loop", { decision: "flag", why: `The same ${call.tool} call ${ctx.repeat} times in a row.` });
  }

  // One rule can fire once per segment; keep the first of each.
  const rules = hits.filter((hit, index) => hits.findIndex((other) => other.id === hit.id) === index)
    .sort((a, b) => RANK[b.decision] - RANK[a.decision]);
  return { decision: rules[0]?.decision || "allow", rules };
};
