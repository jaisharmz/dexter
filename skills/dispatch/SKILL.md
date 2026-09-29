---
name: dispatch
description: Route a message sent to #dexter into the channel where it belongs, and file queue items for work that should be deferred. Use for every inbound message in #dexter that is not itself about Dexter's own operation, and when the user says "route this", "file this", "put this somewhere sensible", or asks where something went.
user-invocable: true
argument-hint: "[<the message to route>]"
---

# Dispatch

`#dexter` is the one channel Jai has to think about. He writes there; you decide where
the work belongs. He should never have to pick a channel, and never hand-file a queue
entry.

## How to route

1. Read `kernel/routing-table.json`. The `hints` weight the decision — they do not
   decide it. A message about emailing a VC is `outreach`, not `people`, because the
   *action* is outreach; route on what needs doing, not on nouns present.
2. Pick one channel. If two genuinely fit, pick the one where the **work** happens,
   not where the subject lives.
3. Do the work in that channel, and leave **one line** in `#dexter` pointing at it.
   The pointer is what makes routing legible — without it he has to hunt.
4. If nothing fits, keep it in `#dexter` and say so. A wrong confident route is worse
   than staying put.

## When it becomes a queue item

Anything that is a **big feature, multi-session, or blocked** goes into the queue
rather than starting immediately. You write the entry — `node kernel/queue.mjs add
"<title>" --priority N --depends ...` — and confirm in one line what you filed and
what it waits on. He never writes to `#queue` himself.

The test for deferring: would starting this now leave something half-built if
interrupted? Then queue it and say what it's behind.

## Correcting a bad route

If Jai moves something or says it went to the wrong place, **edit
`kernel/routing-table.json`** and commit. That is the whole point of the table being a
file. Do not merely apologize and re-route by hand — the same message will misroute
again next week.

## Logging

Every routing decision goes to `#log`: the message, the channel chosen, and the
signal that decided it. Without the trace, a misroute is indistinguishable from bad
work downstream.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — Jai rewrites the output, states a preference in
passing, a step fails the same way twice, a default turns out to be wrong for how he
actually works — record it and say so in one line:

    bash kernel/skill-learn.sh record dispatch "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
