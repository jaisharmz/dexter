---
name: handoff
description: Hand the current task to the home PC and keep the laptop free. Runs Claude Code headless in the PC's own copy of intel, survives the laptop closing, and is collected back here by polling. Use when the user says "hand this off", "run this on the PC", "finish this on the other machine", or runs /handoff — and for anything long enough that the laptop sleeping would kill it.
user-invocable: true
argument-hint: "[<brief> | status | wait <id> | log <id> | fetch <id> | kill <id>]"
---

# Handoff

Sends a task to the other node and picks the answer up here. The PC is the always-on
machine — the laptop froze for 206 minutes across two days and took a 3am cron with it
— so anything that must not die when a lid closes belongs over there.

    sh skills/handoff/handoff.sh start "<brief>"   →  run-20260914-134512
    sh skills/handoff/handoff.sh wait  run-...     →  blocks, then prints the answer

The trick is that there is no trick: `kernel/ha/sync.sh` already mirrors the whole
workspace, so the PC opens the same `intel/` at the same paths. A brief that makes
sense here makes sense there. The run is `claude -p` under `setsid`, which is what
lets it outlive the ssh connection that started it.

## The brief is the whole skill

**The peer has the workspace and none of the conversation.** It cannot see what was
just decided, which file was being looked at, or what "the other approach" referred to.
Everything it needs goes in the brief or it does not exist.

A good brief names three things:

| | |
| --- | --- |
| **where** | the paths it should be reading and writing, from the repo root |
| **what done looks like** | a file that exists, a test that passes, a number in a sentence |
| **what not to do** | the parts already settled, so it does not redecide them |

Write it as you would a message to a competent colleague who has read the repo and
none of the chat. If the brief is under a line, it is almost certainly too thin —
handoffs fail by under-specification far more often than by anything technical.

## What the peer can and cannot do

**Can:** read and write the whole workspace, run the skills (`~/.claude/skills` is
symlinked to `intel/skills`), use git, run the outbound-sourcing venv, and take as long
as it needs.

**Cannot:** answer on Discord. The PC is a standby — its gateway is deliberately down,
because a second live gateway means every message answered twice and every scheduled
send repeated. A handoff that needs to *say* something says it in its output
or writes it to a file. It never starts the gateway to talk.

**Cannot:** hold a credential it was never given. Claude Code's auth is machine-bound;
`handoff.sh` checks for it before starting and names the fix rather than leaving an
empty log.

## Uncommitted work does not travel

The peer pulls from the private repo before it begins. Anything still sitting dirty on
this laptop is simply not there, and a handoff that quietly runs against a week-old
tree is a bug you discover three answers later. `start` prints the dirty files and
carries on — **commit and push first**, or put the detail in the brief.

## `home/` does not arrive by git

The peer pulls `intel/` from the private repo before it starts, which covers the
skills, the kernel and the references. **It does not cover `home/`** — the private
half is a separate repo with no remote, and it only moves when `kernel/ha/sync.sh`
runs.

The first real handoff hit this: the brief pointed at a dataset in
`home/data/`, and the peer searched the tree, found nothing under
any near variant of the name, and correctly reported that it did not exist rather than
inventing it. Nothing was wrong with the peer or the brief. The data was four hours
younger than the last sync.

**If the brief touches anything under `home/`, run `sh kernel/ha/sync.sh` first.**

## Coming back

Polling, not pushing. `wait` blocks and prints; `status` lists the last ten runs;
`log` tails one mid-flight; `fetch` copies a log into `var/handoff/`.

The reverse direction would be prettier and is not reliable: it needs an sshd running
on the laptop, which is exactly the machine that might be asleep. A handoff that
silently fails to report is worse than one you have to ask about.

## The run has no gate in front of it

Handoffs run `--permission-mode bypassPermissions`. Nothing prompts, because a prompt
in a headless run is a decline — the first real handoff stopped dead on `ip -4 addr`.

That makes **the brief the only gate**, on the machine that holds the Discord bot token
and is the designated sender for outbound email. So:

- **Never hand off anything that sends.** No mail, no Discord post, no `gateway start`.
  The PC is a standby and a handoff is not the thing that promotes it.
- **Never hand off a destructive sweep** — no `rm -rf` across a tree, no history
  rewrite, no force push. If it cannot be undone from the laptop, it is not a handoff.
- **Name the paths the run may write to.** "Fill the url column in
  `home/data/papers.csv`" is a brief. "Clean up the
  data" is an instruction to an unsupervised agent with a shell.

Read the log when it comes back. `bypassPermissions` means nobody else did.

## Rules

**One brief, one outcome.** A handoff that is really three tasks comes back as three
half-answers with no way to tell which part failed. Send them separately.

**Say the run id back to the user.** It is the only handle they have on a process
running on another machine, and it is gone from context the moment this session ends.

**Do not poll in a tight loop.** `wait` sleeps 15s between checks and gives up after an
hour by default — the run keeps going, and `status` finds it again. Burning the context
window watching a log is the opposite of handing work off.

**Report what came back, including failure.** If the log ends mid-thought, say so and
say where it stopped. A handoff reported as done when it died at step two is the single
worst failure this skill has available to it.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — Jai rewrites the output, states a preference in
passing, a step fails the same way twice, a default turns out to be wrong for how he
actually works — record it and say so in one line:

    bash kernel/skill-learn.sh record handoff "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
