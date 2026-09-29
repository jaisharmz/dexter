---
name: skill-test
description: Test a newly written skill without waiting for a manual session restart, by scheduling a one-shot cron job that runs it in a fresh session and reports a verdict to #building. Use immediately after writing or substantially editing a SKILL.md, when a new skill does not appear to be loaded, or when the user says "test the skill", "does it work yet", or runs /skill-test.
user-invocable: true
argument-hint: "<skill-name> \"<prompt to run>\" [delay, default 30s]"
---

# skill-test

## The problem it solves

OpenClaw snapshots the eligible skill list **when a session starts**. A brand-new
`SKILL.md` is therefore invisible to the session you wrote it in — you can author a
skill and then be unable to call it, which makes iterating on one maddening.

`skills.load.watch` is enabled, which reloads a skill whose `SKILL.md` *changes*
mid-session. That covers editing. It does not reliably cover the **first**
registration, and that is the case that bites.

**A one-shot cron job is a fresh session.** Scheduling one a few seconds out gets a
clean snapshot without touching the gateway or asking the user to restart anything.

## Use

```
sh kernel/jobs/skill-test.sh <skill-name> "<prompt>" [delay]
sh kernel/jobs/skill-test.sh papers "Run /papers on diffusion, --quick. Three entries." 30s
```

It refuses if `skills/<name>/SKILL.md` doesn't exist, runs `skill-learn.sh sync` so a
brand-new skill picks up the learning footer, touches the file to nudge the watcher for
already-open sessions, then schedules a self-deleting one-shot. The verdict lands in
`#building`.

**A verdict is itself a lesson.** If the test finds the skill doing the wrong thing for a
reason that is about how Jai uses it rather than a bug in the instructions, record it
against *that* skill, not this one.

## Reading the verdict

The job is told to report **what failed and the single most useful fix**, not to say
it went fine. A verdict with no specifics means the test prompt was too easy — give it
something the skill could plausibly get wrong and run it again.

## When not to use it

Editing an existing, already-loaded skill: the watcher handles that, and scheduling a
job costs a whole session's context for nothing. Reach for this on first registration,
or when a skill you expect to exist isn't showing up in `openclaw skills list`.

## Iterating

Write → `skill-test` → read the verdict in `#building` → fix → repeat. Two rounds,
then decide; if the third round is still finding basics, the skill's instructions are
unclear rather than its logic being wrong.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — Jai rewrites the output, states a preference in
passing, a step fails the same way twice, a default turns out to be wrong for how he
actually works — record it and say so in one line:

    bash kernel/skill-learn.sh record skill-test "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
