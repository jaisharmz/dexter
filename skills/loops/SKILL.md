---
name: loops
description: Run adversarial and judge loops over work that is about to be delivered or has just been declared done. Use when a task looks finished and should be checked, when a plan is risky enough to want a devil's advocate first, when the user says "check this", "are you sure", "poke holes in this", or runs /loops. Spawns subagents so the main context stays clean.
user-invocable: true
argument-hint: "[judge <plan> | adversarial <artifact> | done <artifact>]"
---

# Loops

Two patterns for catching what a single pass misses. Both run in **subagents** — the
point is to spend a fresh context on scrutiny while the main one stays clean.

## judge — before acting

One agent reviews the plan before another executes it. Use when the work is expensive,
hard to reverse, or outward-facing.

Give the judge the plan and the constraints, and ask for three things: the strongest
argument the plan is wrong, the assumption most likely to be false, and the cheapest
test that would settle it. Then decide. **The judge advises; it does not hold a veto** —
otherwise every plan dies of caution.

A judge that returns "looks good" has told you nothing. If it can't find the weakest
point, the brief was too vague — say what would make the plan fail, and ask again.

## adversarial — after producing

Two agents push against each other over a finished artifact. One argues it is ready,
one argues it is not; both cite specifics. Run it when something is about to be
delivered, and automatically when a task *looks* done — "looks done" is exactly when
attention drops.

The output is a list of concrete defects with locations, not a verdict. Rank them by
whether they would actually bite, and fix in that order.

## done — the automatic check

`loops done <artifact>` is the cheap version to run before declaring completion:
spawn one subagent whose only brief is *find what is broken or missing here*, with no
context on how hard the work was. Sunk cost is invisible to it, which is the point.

## Rules

**Bound the loop.** Two rounds, then decide. Adversarial loops will happily run
forever; a third round almost never changes the outcome and always costs context.

**Give each subagent a narrow brief and a small return payload.** Findings with
locations, not a transcript. Context spent on scrutiny is only worth it if what comes
back is dense.

**Disagreement is the product.** If the loop consistently agrees with the first pass,
it is theatre — the brief is leading the witness. Ask for the case *against*
explicitly, not for "a review."

**Report what the loop found, including when it found nothing.** Silently passing a
check the user asked for is worse than not running it.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record loops "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
