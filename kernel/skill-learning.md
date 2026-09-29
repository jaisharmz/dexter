# Skill learning

A skill is a document, and a document can be wrong. Every run is evidence about whether
it is: what the operator edited afterwards, what they said while it was running, which
step failed the same way it failed last time. That evidence is worthless unless it lands somewhere
the next run reads.

So: **a skill that gets corrected updates itself.** Not at the end of the week, not when
someone remembers — in the run where the correction happened.

    run  →  something is learned  →  skills/<name>/LEARNED.md  →  next run reads it first

## Where a lesson goes

**`skills/<name>/LEARNED.md` is the default.** Dated bullets, one lesson each, created on
the first lesson and not before. Every `SKILL.md` ends with a `## Learning` block telling
the run to read it first and treat it as overriding the file it sits next to.

**`SKILL.md` itself is for promoted lessons only** — see below. The sidecar exists because
`SKILL.md` is written by hand, argued over, and in some cases shipped to other people
(`papers/` has a LICENSE and an installer). A correction from a single run should not
silently rewrite that. It should sit beside it, dated, visible, until it earns its way in.

## What counts as a lesson

Record it when it would change what the next run does:

- **The operator corrects or rewrites the output.** Record *what they changed it to*, not
  that they were unhappy. "Rewrote the opener to lead with the number" is a lesson; "output was too long"
  is a mood.
- **They state a preference mid-run.** "Never DM founders." "Always show the ranking before
  the writeup." These are rules, and they arrive as asides.
- **A step fails the same way twice.** A rate limit, a moved selector, a site that blocks
  the fetch, a script that needs a flag nobody documented.
- **A default turns out wrong for how they actually use it** — the budget is always raised,
  the wrong resume is picked every time, the quick mode is never the one they want.
- **The run found a route the skill does not mention** and it worked.

## What does not count

- **Facts about one company, paper, or person.** Those belong in the skill's own `state/`.
  `LEARNED.md` is about the skill, never about a target.
- **Restatements of what `SKILL.md` already says.** If the run needed reminding, the file is
  unclear — fix the file, don't annotate it.
- **Run logs.** "Ran, produced 8 targets" goes in `memory/YYYY-MM-DD.md`.
- **One ambiguous data point.** They edited something once and said nothing about why. Wait
  for the second time, or ask. Guessed preferences are the way this system rots.
- **Anything about the operator rather than about the skill.** That is `USER.md`.

## Writing one

    bash kernel/skill-learn.sh record <skill> "<lesson>"

which appends, creating the file if this is the first:

    - **2026-09-14** — Lead the email with the number, not the greeting. The operator
      rewrote all four drafts the same way. *(source: run on a four-company batch)*

Imperative, one line of what to do differently, then where it came from. The source matters
later, when the rule looks arbitrary and someone has to decide whether it still holds.

## Promotion into SKILL.md

A lesson graduates when it is **confirmed twice, or stated by the operator as a rule**. Then edit
`SKILL.md` — in the section where the rule actually belongs, in the skill's own voice, not
as an appended note — and mark the sidecar entry `promoted YYYY-MM-DD` instead of deleting
it. The history is what explains the odd-looking rule a year from now.

## Contradiction and staleness

`LEARNED.md` overrides `SKILL.md` for the run. If they disagree and the lesson is right,
that is a promotion, so do it. If the lesson is the stale one — the site changed back, the
preference was reversed — strike it: `retired YYYY-MM-DD — why`. Never leave two live lines
that contradict, same rule as `USER.md`.

**Roughly twenty active bullets is the ceiling.** Past that the sidecar has stopped being a
list of corrections and become a second copy of the skill. Promote what holds, retire what
does not.

## Say that you did it

One line at the end of the run: `Learned: <lesson> → skills/<name>/LEARNED.md`. Do not ask
permission first and do not record silently. Recording is cheap and reversible; a silent
rewrite of how a skill behaves is neither.

## Skills that ship elsewhere

`papers/` is a submodule with its own public repo, and any skill published on its own works
the same way. The sidecar still works — but `kernel/skill-learn.sh` does not exist in a
standalone install, so such a skill's footer says to append the bullet by hand, and a lesson
that is only about how *the operator* uses the skill should stay out of the published repo.

## New skills

Every `SKILL.md` needs the `## Learning` footer. After writing one:

    bash kernel/skill-learn.sh sync          # adds the footer wherever it is missing
    bash kernel/skill-learn.sh sync --check  # lists what is missing, writes nothing
