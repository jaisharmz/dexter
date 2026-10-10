# Agent processes

Written 2026-10-09 for a skill that lets one agent start, talk to, and end headful subagents:
real Claude Code sessions in the desktop app that the operator can see. The ideas come from
operating systems. The skill is `skills/spawn/SKILL.md`, and its process table is
`kernel/proc.mjs`.

## In one minute

- A headful subagent is a process: a session with its own row in the app's sidebar under intel,
  its own transcript, and its own lifetime. An Agent-tool subagent is a thread. It runs inside
  its parent's process and dies with it, as every subagent did when Claude restarted on Oct 9.
- The app already has the system calls: start a session, message it, read its transcript, stop
  it, archive it, and delete it. What it lacks is a process table that says who started which
  session, for what, and whether anyone has read its result. `kernel/proc.mjs` keeps that table.
- The best spawn available today is a routine run: `run_scheduled_task` puts a new session in
  the sidebar within a second and returns its id. It worked end to end on Oct 9.
- Its cost is the permission mode. Made from a Code session, a routine starts in default mode,
  so every Bash call waits for the operator, and so does a SendMessage between it and an
  auto-mode parent.
  The fix is a few standing routines the operator sets to auto once, used as process slots.
- `start_session` replaces the routine path once the app turns it on: a child nested under its
  parent, stopped without a card, with its turns reported back to the parent.

## What was tried first

Every routine run is a new session in the sidebar, and the scheduled-tasks tools can start one.

- `run_scheduled_task` on an existing routine opened a new session within a second. It ran in
  default mode and stopped on its first Bash prompt.
- A one-time routine whose permission mode the operator had set to auto by hand, with the app
  quit, opened its session on time and ran Bash, a file write, and a Chrome tab without a
  prompt. `delete_scheduled_task` then removed the routine, and the app archived its session in
  the same second.

Two other paths worked, and neither added a sidebar row on its own:

- A Terminal window running `claude --chrome` did the work and answered SendMessage, but a
  Terminal window is not a row in the app.
- A `spawn_task` chip needs the operator's click for each child, and it waits until they see it.

The bar: headful means another window in the Claude app, not a terminal.

## The operating-system ideas, mapped

| OS idea | Here | Mechanism |
| --- | --- | --- |
| process | a session in the desktop app, one sidebar row | one of the spawn paths below |
| thread | an Agent-tool subagent | shares the parent's process and dies with it |
| pid | the session id, `local_...` | returned by `run_scheduled_task` and `start_session`, with the CLI id from `claude agents --json` kept beside it |
| process name | the session title, which SendMessage takes as an address | unique among live children: `proc add` refuses a duplicate |
| ppid | the parent's name and session id | written by `proc add`, and recorded by the app itself for `start_session` |
| fork and exec | spawn with a brief | there is no fork: a child starts with none of the parent's context, so the brief is the program image and must stand alone |
| IPC | messages between sessions | SendMessage both ways when both sessions share a permission mode, `send_message` by session id into a child in a stricter mode, and the mailbox (`kernel/sessions.mjs`) for anything that must outlive a session |
| wait and SIGCHLD | the parent learns that a child is done | `proc wait`, which asks `claude agents --json` for busy or idle, or `notify_when_idle` from a main session when both share a mode |
| exit status | the child's result | its last message or a mailbox body, recorded with `proc exit` |
| signals | message conventions | `STATUS?` is SIGINFO, `WRAP UP` is SIGTERM, `stop_session` is SIGINT, `archive_session` is SIGKILL |
| zombie | a finished child nobody has reaped | it keeps its sidebar row, and maybe a warm process, and counts against the limits until archived |
| reaping | the parent collects and ends it | read the result, `proc exit`, `archive_session`, `proc set --state archived` |
| orphan and init | a child whose parent ended | `proc set --parent init`, and its queue item goes back to the board, which is init here |
| process table | `var/run/proc.json` | written through `kernel/store.mjs` (a mkdir mutex and a rename), with a change log |
| ps and /proc | what is running and what it did | `proc ps` joins the table with `claude agents --json`, and `list_events` and `get_session` read one child |
| scheduler | what runs next | the layered queue: `pqueue next --as <name>` takes an item and claims it |
| swap | the app evicts idle sessions | it keeps at most six Claude processes warm, so an idle child can lose its process and still be a session |
| nice | a child's priority and cost | `set_session_model` and `set_session_effort` |
| resource limits | caps, memory, and Chrome | three live children per parent and four overall, 25% of memory and 2 GB of disk free, and one Chrome clicker at a time through `proc lease` |
| uid and permissions | what a child may do | its permission mode, since a message carries no permission and a child never does what its parent's session would block |
| cron | timed runs | routines on a schedule, which intel already uses |

## Which spawn path to use

Ranked by what is verified, with what each one costs the operator.

| Rank | Path | Verified | Sidebar row | Id back | Cost to the operator |
| --- | --- | --- | --- | --- | --- |
| 1 | routine run: `run_scheduled_task` on a slot | Oct 1, and end to end Oct 9 | yes, within a second | yes | nothing per spawn once each slot is set to auto, but a routine made from Code asks him for every Bash call |
| 2 | `start_session` | not available: a feature gate keeps it off (Oct 1 and Oct 9) | yes, nested under the parent | yes | nothing |
| 3 | Terminal window: `pqueue launch` or the board's Start | Oct 1 (#94) | no, a Terminal window | yes, chosen up front | nothing, but it is not headful in his sense |
| 4 | `spawn_task` chip | Oct 1 and Oct 9 | after his click | no | one click per child, and the chip waits until he sees it |
| 5 | deep link `claude://code/new` | Oct 1 | after Return | no | one Return, and his window jumps to the new session |
| 6 | a window on the PC: `handoff.sh visible` | Oct 1 (#110) | on the PC | yes | nothing once the PC is set up |

The skill tries them in this order: `start_session` the moment ToolSearch finds it, then a free
routine slot, then a one-off routine after saying in one line that it will ask for permissions.
It falls back to a Terminal window or a chip only with the operator's choice, because neither
is what he asked for.

### What each session tool asks of the operator

Read from the tools' own descriptions on Oct 9, and checked where the live test used them.

| Tool | Undone by | Asks the operator |
| --- | --- | --- |
| `list_sessions`, `get_session`, `list_events` | nothing to undo | never |
| `send_message`, SendMessage | nothing to undo | never, but SendMessage into a session in another permission mode is held for him |
| `stop_session` | the session stays open | not for a child this session started, otherwise the app asks or the auto-mode check decides |
| `archive_session` | `unarchive_session` | a card, which the auto-mode check may approve itself, as it did on Oct 9 |
| `delete_session` | nothing: permanent | a card listing every session, in every mode |
| `detach_session` | nothing | never, and only for a child from `start_session` |
| `set_session_permission_mode` | a lower mode | a card for any step up, in every mode |
| `set_session_model`, `set_session_effort` | another call | not for a child at or below this session's level, otherwise the app asks |
| the routine tools | `delete_scheduled_task` | no card on Oct 1 or Oct 9, and the audit flags each call |

### Setting up routine slots

A slot is a routine with no schedule, made once and reused. Spawning into it is two calls:
`update_scheduled_task` sets the brief as its prompt and the child's name as its title, then
`run_scheduled_task` starts the run and returns the session id.

- The operator sets each slot's permission mode to auto once. The scheduled-tasks tools cannot,
  and the auto-mode classifier blocks an agent editing the app's task store. Editing
  `permissionMode` in the store by hand, with the app quit, works. One made in the app's own
  Routines pane may take the mode chosen there, which is untested.
- Each routine runs one turn at a time, so three slots give three children starting at once. A
  slot frees when its child's turn ends, while the child itself lives until it is archived.
  The process table, not the slot, enforces the cap.
- Scheduled runs start at medium effort, because the app passes them no effort setting.

## The life of one child, by example

A parent named `main` hands queue item #12 to a child named `sourcing-yc`.

1. `node kernel/proc.mjs limits --parent main` says yes, or exits 3 at a cap or 4 when memory
   or disk is short.
2. `node kernel/proc.mjs add --name sourcing-yc --parent main --via routine --task proc-slot-1 --item 12`
   reserves the slot before anything starts.
3. `update_scheduled_task` on `proc-slot-1` with the brief and the title `sourcing-yc`, then
   `run_scheduled_task`, which returns `local_ab12...`. `proc set sourcing-yc --pid local_ab12... --state running`.
4. The child runs `/name --item 12`, does the work, sends one line back by SendMessage, and
   leaves anything longer in the mailbox.
5. The parent runs `proc wait sourcing-yc` in the background and gets one notice when the child
   is idle. It reads the result and runs `proc exit sourcing-yc --result "<one line>"`.
6. `archive_session`, then `proc set sourcing-yc --state archived`. The slot is free for the next
   child, and `unarchive_session` brings this one back if needed.

## Live test, Oct 9

One child, end to end, started from a subagent, so its messages went out under the parent
session's name. App 2.31226.1, CLI 2.1.295.

- `create_scheduled_task` made an ad hoc routine with no schedule. No permission mode was stored
  for it.
- In default mode a Bash call raises a card for the operator, and a SendMessage between modes is
  held for them. So the brief was cut before the run to a child that uses no gated tool and
  answers in plain text, and the parent registered it in the process table.
- `run_scheduled_task` returned the child's session id at once. The app opened it in default
  mode at medium effort, and its first turn ended 9 seconds later.
- The child had SendMessage and the session-management tools, but no `ListAgents`, so it could
  not read its own messaging name. The brief has to tell it.
- `send_message` from the parent, by session id, returned "delivered; its turn has started on it"
  with no hold, though the child was in default mode and the parent in auto. It answered
  "pong: 1" and "exiting" to `PING 1` and `WRAP UP`, read back with `list_events`.
- `proc ps` showed the child idle with its process id, from `claude agents --json`.
- `stop_session` on the idle child returned "nothing to stop". `archive_session` archived it with
  no card in auto mode, and its process left `claude agents --json`.
- `list_task_runs` showed one run, which had succeeded and was archived. `delete_scheduled_task`
  removed the routine.
- The routine's completion notice never reached the parent's conversation, and no routine run
  has produced one, so `proc wait` is the wait to use.

Not tested, each for a reason:

- A child's SendMessage to its parent. From a default-mode child into an auto parent it would be
  held for the operator. Between two sessions in auto mode, SendMessage has worked both ways.
- `notify_when_idle`, which only a main session may set, and `set_session_title` on a routine run.
- `delete_session`, which needs the operator's own word, and sidebar groups for a family of children.

## How it fits the workspace

- The queue: a child takes one item and closes it when the work is done.
- `/name`: in a routine run `ListAgents` is missing, so a child registers under its title, and
  other sessions reach it live with `send_message` and its session id, or by mail.
- `docs/sessions.md`: a session in another permission mode holds SendMessage, while
  `send_message` by session id reaches a child in a stricter mode at once.
- The audit: creating, changing, or running a routine is flagged as a schedule change, deleting
  one as a connector delete, and the session tools are exempt from the send-message rule. Nothing
  here is held or denied.
- Chrome: keystrokes go to whichever tab has focus, so a child that clicks or types takes
  `proc lease acquire chrome` first and releases it after each form.

## Choices for the operator

- Routine slots in auto mode, set once by hand, or a permission card for every child. Three
  slots is a good start.
- Whether a slot child should run above the medium effort routines get, which costs more per child.
- Delete stays on the operator's word alone, and archive is the default end.
