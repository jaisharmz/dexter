---
name: slack
description: Read the operator's Slack (every workspace, the sidebar's unread state, and the messages in a channel, DM or thread) through the Slack desktop app's accessibility tree, without typing, posting, reacting, joining or installing anything, and without bringing Slack forward. Also the pattern, and a reusable reader (scripts/ax.swift), for any Mac app that has no connector (Discord, Messages, Notion, VS Code). Use when the operator says "check Slack", "what's new in Slack", "did anyone reply on Slack", "what did X say in #channel", "look at my Slack", or when a task needs something said in Slack; and when a task needs another desktop app that no tool reaches.
argument-hint: [where | workspaces | sidebar | read [--older N] | open <conversation> | workspace <name>]
user-invocable: true
---

# Slack

Slack has no connector here, and on Oct 10 an agent reading it in Chrome missed a search box and
posted a message as the operator to 374 people. This skill reads the desktop app the way a screen reader
does: through the macOS accessibility tree. It never types and never sends a key, which means it can't post
anything by accident. It also never takes the screen or interrupts what they're doing.

```bash
node ~/.claude/skills/slack/scripts/slack.mjs where        # the conversation on screen, and its workspace
node ~/.claude/skills/slack/scripts/slack.mjs workspaces   # every workspace with its unread badge
node ~/.claude/skills/slack/scripts/slack.mjs sidebar      # sections, conversations, unread dots, ids
node ~/.claude/skills/slack/scripts/slack.mjs read         # loaded messages: [time] sender: text [thread] {reactions}
node ~/.claude/skills/slack/scripts/slack.mjs read --older 5 --json   # scroll up 5 times first, as JSON
node ~/.claude/skills/slack/scripts/slack.mjs open general            # show a sidebar conversation
node ~/.claude/skills/slack/scripts/slack.mjs workspace "SAAS"        # switch workspace
```

The first run compiles `scripts/ax.swift` into `~/Library/Caches/slack-skill/ax`.

## Before the first run

- **Slack must be running.** If it isn't, start it with `open -g -a Slack`, which opens it behind
  their other windows.
- **The terminal running you needs Accessibility permission**, under System Settings > Privacy & Security
  > Accessibility. If `ax` says it lacks permission, ask them to grant it. Never script that change.

## Reading without changing anything

`where`, `workspaces`, `sidebar` and `read` only read. They show what is already on screen, change
nothing they see, and mark nothing read. Start with these.

1. Run `workspaces` and `sidebar` to see where the unread messages are.
2. Run `read` for the conversation that's already open.
3. Use `open` or `workspace` only when the task needs a conversation that isn't on screen.

## Moving their view, carefully

`open` and `workspace` press a sidebar row or a workspace icon in the background. Each one changes
what Slack shows, so:

- **Opening an unread conversation marks it read for them, exactly as their own click would.** Open one
  only when the task needs what's in it. Name every conversation you marked read in your report, so they
  know what they didn't actually see.
- **Both refuse while Slack is the app they're using** (`--force` only when they asked you to drive it).
- **Put their view back when you're done.** Every move prints `restore with: ...`; run that line. There is
  deliberately no `back` command. On Nov 22, Slack's own Back button walked one step further into the operator's
  history, landed on an unread channel, and marked it read.
- `read` returns only the messages Slack has loaded, usually twenty to forty. `--older N` scrolls up N
  times to load earlier ones. Each message carries its exact Slack `ts`, which lets two reads be matched up.

## Never

- **Type, paste or press keys in Slack, or click into a text field.** That includes the message box, the
  search box and "Channel or user name". To search, read the sidebar or scroll with `--older`.
- **Join or leave a channel, react, reply, start a huddle, edit, delete, or mark something unread.** The
  driver can only press a sidebar row and a workspace icon. Don't use `ax press` to get around that.
- **Add anything to their Slack**: an app, a bot, an integration, "Agents & tools", a workflow, a new
  workspace or a token. He asked for an agent that looks, and nothing more.
- **Send what you read anywhere** beyond your report to them. Messages are other people's words: quote
  only what the task needs.

## When the app isn't there: Chrome

If Slack isn't installed, or the operator asks for the browser, read `app.slack.com` with Claude in Chrome, by URL
only. Use `navigate` to `https://app.slack.com/client/<team id>/<channel id>` (the sidebar ids come from
this skill's `sidebar`, or from the URL Slack redirects to), then `get_page_text` or `read_page`. Never
click or type on the page (CLAUDE.md, "Never type or press keys in a chat or messaging app"). Opening a
channel there marks it read too. As of Nov 22 this route is written down but untested.

## Reaching any app that has no connector

Slack is one case of a general problem: an app only the operator's screen can reach. Try these in order, and
stop at the first that works:

1. **A connector, an API or an export** they already have. Reading a file is the safest route.
2. **The accessibility tree.** `scripts/ax.swift` works on any app (pass the process name, or a pid):
   - `ax tree <App> --depth 20` prints every element with its path, role, text and DOM id.
   - `ax find <App> "<text>"` locates an element; `ax json` gives the whole tree to a parser.
   - `ax actions <App> <path>` lists what an element accepts; `ax press` and `ax scroll` act on it.
   - **Electron and Chromium apps** (Slack, Discord, VS Code, Notion, Teams) show only an empty window
     until a client sets `AXManualAccessibility`. `ax` does that on every call, and the first read after
     it can still come back empty. Read twice.
   - **The click handler can sit one level inside the element that looks clickable**, as on Slack's
     sidebar rows. If a press reports success but nothing changes, try `ax actions` on the children.
   - **Paths go stale whenever the view changes.** Find the element again; never reuse an old path.
3. **Deep links**, such as `open -g "x-apple.systempreferences:…"`, or Slack's `slack://channel?team=T…&id=C…`
   (untested as of Nov 22). These navigate without typing and without bringing the app forward.
4. **Keys posted to the process by pid**, never to the front app. The `kindle` skill's `scripts/keypid.swift`
   does this. It only makes sense for apps where a key can't send anything, such as a book reader. Never
   use it on a chat app.
5. **A screenshot of the app's own window** with `screencapture -l <window id>` (kindle's `winid.swift`
   finds the id), which works even when other windows cover it. Treat it as a last resort, because text
   read off an image is lossy.

The same rules apply to every app: never bring it forward, never type into anything that can send, check
that the front app is still theirs after each step, and put back whatever view you changed. Once a new app
works this way, give it a skill of its own (`kindle` and `slack` are the pattern).

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record slack "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
