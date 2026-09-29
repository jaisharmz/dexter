# Surfacing reasoning

Jai wants to see Dexter think, the way a chat model shows its work. The risk is
noise: reasoning that clutters every channel makes the answers harder to find, which
is the opposite of the goal.

## The rule that keeps them apart

**Answers are plain messages. Reasoning is always an embed.** Never both, never mixed.
One glance separates them, with no reading required. A reasoning embed uses a muted
slate bar (`#4B5563`) and an author line reading `reasoning`, so it recedes visually
while staying available.

Corollary: **no conclusion may live only in reasoning.** If it matters, it goes in the
answer. Reasoning is for showing the path, never for hiding the result.

## Where it goes

**Short tasks — nothing.** A one-line answer with three lines of reasoning attached is
worse than the answer alone. If the work took one step, just answer.

**Long tasks in a channel — a thread.** Open a thread on the message that triggered
the work, titled `reasoning`, and post steps there as they happen. Threads are
collapsed by default, sit next to the thing they explain, and cost nothing to ignore.
This is the default for anything multi-step.

**Unattended work — `#thinking`.** Cron jobs, heartbeat drains, and autonomy windows
have no triggering message to thread from, so their reasoning goes to `#thinking` as
the firehose. Each entry names the job and links back to whatever channel the result
landed in.

## What belongs in it

Decisions and their alternatives, dead ends and why they were abandoned, assumptions
being made, and the moment a plan changes. Not a narration of every tool call — that
is what `#log` is for. The test: would this help Jai catch a wrong turn early? If not,
leave it out.

## Two layers, because the live one is ephemeral

**Live (automatic).** `channels.discord.streaming.mode: "progress"` keeps one editable
draft under your message showing the pre-tool preamble and a running list of tool
lines (`🛠️ Bash: …`, `🔎 Web Search: …`). It appears ~1.5s after real work starts and
updates continuously. **Discord deletes this draft when the final answer lands** — it
is for watching, not for keeping. Nothing is configured per-run; it just happens.

**Retained (your job, Dexter).** Because the draft evaporates, any run that will take
more than about two minutes or more than three tool calls must also leave a permanent
trail in `#thinking` (`000000000000000000`).

### How to write the trail

Post a **first line when you start**: what you were asked, the approach you chose, and
the alternative you rejected. Then post as you go — but **batch**, roughly one update
per meaningful phase or every ~5 tool calls, never one per call. A trail nobody can
skim is as useless as no trail, and per-call posting burns tokens for noise.

Each update is one or two lines: what you just established, and what it changed about
the plan. Post immediately when a plan changes, an assumption breaks, or you hit
something surprising — those are the moments Jai would want to interrupt, and a trail
that arrives after the decision is worthless.

Close with a last line naming where the result landed.

Reference the channel the work came from, so `#thinking` reads as a log of runs rather
than a wall of disconnected lines.

### What it is not

Not a narration of every tool call — `#log` holds run mechanics. Not the answer: the
conclusion always goes in the channel Jai asked in. The test is the same as before:
would this let him catch a wrong turn before it costs an hour? On one research run,
the useful trail was "29 companies found, 7 rejected and why" — decisions and their
reasons, not a list of fetches.
