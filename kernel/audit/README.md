# The audit: every agent action, logged and checked

One Claude Code hook sees every action an agent takes: each prompt, each tool call before
it runs and after it returns, each subagent, each session start and end. It writes a line
for each to a daily ledger, and before a tool runs it asks a short policy whether the call
may go ahead. `audit.mjs` reads the ledger back, and a daily job posts what deserves a
look to `#log`.

```
node kernel/audit/audit.mjs tail                  the newest events
node kernel/audit/audit.mjs sessions --since 24h  one line per session, with anything odd
node kernel/audit/audit.mjs show <session>        one session, call by call
node kernel/audit/audit.mjs flags --since 7d      every flagged, held or blocked act
node kernel/audit/audit.mjs report                the daily audit
node kernel/audit/audit.mjs check                 installed, recording, no hook errors
```

## Where it hooks in

The hook is registered in `~/.claude/settings.json`, the user settings, because that is
the one file every surface reads. A project's `.claude/settings.json` would miss Dexter:
OpenClaw starts Claude Code with `--setting-sources user`. Registered there, it covers the
desktop app, a terminal, scheduled tasks, headless handoffs and Discord. Cloud sessions
run on another machine and are not covered.

`./setup` installs it and `./setup doctor` checks it. By hand:
`node kernel/audit/audit.mjs install`, which merges into the hooks already there and
keeps the old file as `settings.json.before-audit`. `uninstall` takes it out and leaves
the ledger.

## The ledger

`var/log/audit/YYYY-MM-DD.jsonl`, one JSON object per event, kept 90 days. `var/log/` is
gitignored, so the ledger never reaches a push, and each machine keeps its own. Inputs
are cut to 400 characters and anything shaped like a secret (a key named like a
password or token, a bearer header, an API key's prefix) is replaced before it is
written. Results are recorded as success or failure and a size, never their content.

A call record carries the session, the surface it ran on (`desktop`, `terminal`,
`headless`, `discord`), the subagent if any, the tool, its input, and the policy's
decision with the rules that fired.

## The policy

`policy.mjs`. Each rule is something this workspace already says, written as a check:

| Decision | Meaning | Rules |
|---|---|---|
| deny | never right for an agent | `git add -f` inside the workspace; `rm -r` of `/`, the home directory, the workspace, `home/` or a `.git`; restarting the gateway from inside Dexter; the same call 8 times in a row; a draft or send whose text contradicts what it carries, such as materials promised with only résumés attached (the mail gate, `kernel/mailgate/`) |
| ask | the operator approves this one act | sending a message to anyone but the operator; typing, a paste or Return in a chat or messaging web app; a force push; a push to the public build; deleting, renaming or exposing a repository; restarting the gateway; changing the audit itself |
| flag | allowed, and marked for the audit | git push, GitHub writes, other `rm -r`, git commands that throw away work (`checkout --`, `reset --hard`, `clean -f`, `filter-branch`), connector deletes, calendar invites and shares, browser clicks and page scripts that submit, send, pay, apply or book, typing in a browser tab the session did not navigate to, schedule changes (crontab, LaunchAgents, routines and crons made through tools), another session's permission mode, a draft sent with recipients Gmail will ignore, the same call 4 times in a row |

A session nobody is attending (Discord, `claude -p`, a scheduled run) cannot answer an
ask, so there an ask becomes a deny that says to leave the act for the operator.

In auto mode Claude Code sends a hook's ask to its own classifier, not to a person. That is
a second check, and enough for a force push or an edit to the audit. A send to someone
else or a push to the public build is different: only the operator may approve it,
whatever the mode. So in auto, bypass and don't-ask modes those two are denied, and the
operator runs the command themselves or approves it from a session in default mode.

Typing in a chat or messaging web app is a send too: Slack, Discord, Teams, WhatsApp,
Telegram, Messenger, Google Chat and Messages, LinkedIn messaging, X messages, and a Gmail or
Outlook compose. On Oct 10 at 8:41 PM a read-only Slack sweep's click missed the search box,
and the `from:me` it typed, with Return, posted in a channel as the operator. A tool call does
not say which page it lands on, so `browser.mjs` keeps each session's tabs and their addresses
(`var/log/audit/state/browser-<session>.json`), from the session's navigate calls and from the
Tab Context block that ends every Claude in Chrome and browser-pane result. A type, a paste, a
Return, a filled field or a script that types on such a page asks, and only the operator may
approve it. Reading needs no typing: a connector, an export, or a search URL loaded with
navigate. Typing on any page the session did not navigate to is flagged. Replayed on the
ledger's 7,018 browser calls, it asks 39 times: the Slack batch, 32 keystrokes of Discord
searches on Oct 5 (all landed in the search box, one missed click from posting) and 6 edits
typed into Gmail drafts on Oct 5 and 6. A script that only sets an element's text, as read-only
sweeps do with a scratch element of their own, is reading unless it names an editable field.
The ledger cuts each input at 400 characters, so the replay misses longer scripts, such as the
Oct 10 drafts pasted into Gmail's full-page compose (role-outreach's LEARNED.md). Those ask too,
which leaves a draft with links to the operator or to the Gmail connector, whose create_draft
rewrites links.

`etc/audit.local.json`, gitignored, names the operator's own addresses (`self`) and
anyone they have standing approval to email (`standingRecipients`). Messages to those are
flagged rather than held.

The rules ran first against a week of real sessions: 17,300 tool calls, of which 504 would
have been flagged, 26 held for approval and none denied. Every one of the 26 was a real
publish, force push, repository change or audit edit. Shell text that is only carried
(heredoc bodies, quoted messages) is ignored, because the first replay showed rules
firing on queue-item titles and commit messages.

Week one (Oct 3 to 10, 40,776 calls) changed four things. Quotes are now paired left to
right as the shell pairs them: the old pattern could join a closing quote to the next
opening one, so `grep "x" f; rm -rf ~; grep "y" f` lost its middle command and passed. Page
scripts are read like clicks, because 46 `javascript_tool` scripts had clicked Submit
Application, Apply or Book buttons unflagged. Git commands that throw away work, routines made
through tools, and permission changes to other sessions are flagged. And a doc whose prose
mentions `kernel/audit/` is no longer an edit to the audit. Replayed on the 26,776 records
the ledger kept whole, every change is a new flag, none an ask or a deny.

A click, keystroke or screenshot in Claude in Chrome is flagged unless the session holds the
Chrome lease (`kernel/proc.mjs`, AGENTS.md), so the audit shows when two sessions typed into the
operator's Chrome at once. The hook knows a session only by Claude Code's session id, and a lease
names its holder, so `chrome.mjs` joins them: the names `var/sessions/registry.json` gives that
id, and each holder name the session took a lease under, which the hook notes as the `lease
acquire` command goes by (`var/log/audit/state/lease-holders.json`). The built-in browser pane is
each session's own and needs no lease.

## When something goes wrong

- **A hook error never stops an agent.** The hook exits 0 whatever happens and writes the
  failure to `var/log/audit/errors.log`, which `check` and the report surface.
- **A wrong deny or ask** comes back to the agent with its rule id, `[audit: <rule>]`.
  Fix the rule in `policy.mjs`, add the case to `audit.test.mjs` (`browser.test.mjs` for
  chat typing), run `node --test kernel/audit/`. Edits here go through the operator, because
  the policy asks before anything changes the audit.
- **Add a rule when the ledger shows a mistake that happened,** not one that might. A deny
  that fires on real work costs more than the flag it replaced.
