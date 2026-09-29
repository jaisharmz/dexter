---
name: proof-project
description: Find the one project that would prove the operator can work in a field they have not worked in yet. Produces a small number of concrete, time-boxed, falsifiable projects, each ending in a sentence with a number that did not exist before. Use when the user says "what should I build", "how do I prove myself in X", "project ideas for <field>", or is pivoting into a field and needs a credential. Run it once per field. Discovery is agentic and uses WebSearch/WebFetch.
argument-hint: <field> [--timebox weekend|fortnight|semester] [--n 3]
user-invocable: true
---

# Proof project

Finds the project that turns *"wants to move into this field"* into *"has already done some
of it"*. One field per run. Output is two to four projects, each specified tightly enough
to start on a Saturday.

This is not a research-idea generator. A good research idea and a good proof project are
different objects: research is judged by whether the result matters, a proof project is
judged by whether **finishing it changes how a stranger reads your application.** Those
overlap but they are not the same, and optimising for the first produces projects that take
a year and end in "it's complicated".

## The one thing every project must have

**A sentence with a number in it that did not exist before you started.**

Not "I explored X". Not "I built a tool for Y". Something like *"N of the 5 providers
selling this model fail an equality test against the precision they advertise"* — a claim
that is checkable, that someone in the field wants to know, and that nobody has published.

That sentence is the deliverable. The repo is how you back it up. Write the sentence
**before** you start, with the number left blank, and if you cannot write it, the project is
not ready — that check kills more bad projects than any other in this file.

## Where the gaps are

`references/finding.md` is the method. The short version, which holds across every field
checked so far: **the uncontested work is measurement, and it is the part with the least
money on it.** Six independent field surveys in the operator's own
`intel/industry_landscape` found the same shape — a method exists, it produces numbers, and
nobody can say what those numbers would look like if the method did not work.

That is a search heuristic, not a slogan. In an unfamiliar field, ask **what the control
experiment would be, and whether anyone has run it.** Usually nobody has, because the people
positioned to run it are the people whose scores it would cap.

Six places the gap reliably hides:

| where to look | what you are looking for |
| --- | --- |
| limitations and future-work sections | the authors telling you what they could not do |
| a number everyone cites | tracked to a source that measured it once, years ago |
| a dead repo a live paper depends on | the method works, the measurement is stale, the market moved |
| two communities using one phrase | each assuming the other validated it |
| a closed result from a frontier lab | fully described, no code, reproducible on one card |
| a benchmark's own noise floor | nobody publishes the denominator that caps their own score |

## Form factor

`references/form-factor.md` is the spec every project must satisfy. Seven fields, and a
project missing any of them is not finished being designed:

1. **The line it earns** — the sentence with the blank number.
2. **Time box** — weekend, fortnight, or semester. Honestly, not hopefully.
3. **Compute floor** — laptop, one card, or cluster. If it is cluster, cut it.
4. **The control** — what makes success distinguishable from coincidence.
5. **The trap** — the specific thing that silently produces plausible wrong answers.
6. **Who reads it** — a named person or team who would care, and why.
7. **What it teaches** — the skill you could not previously claim.

**Falsifiability is the gate.** If success and failure produce the same artifact, it is not
a project, it is an activity. A reproduction that fails is a *better* outcome than one that
succeeds, provided the write-up states plainly what was and was not tested.

## Use what only this operator has

`config/assets.md` lists the leverage that makes a project cheap for them and expensive for
everyone else — an existing library, a niche skill, an affiliation, cluster access, prior
data exposure.

**The best proof project sits on an intersection the operator already occupies and almost
nobody else does.** Two ordinary capabilities crossed is rarer than one exceptional one, and
it produces work that is genuinely hard to replicate. Look for the crossing before looking
for the gap: it narrows the search and it is the difference between a good project and one
only this person could have done.

A project that any competent new grad could do is not worthless, but it proves less.

## Running it

    /proof-project <field>
    /proof-project "world models for biology" --timebox weekend --n 3

One field per run, because the gap-finding is field-specific and a run that covers three
fields finds the shallow gap in each. Run it again for the next field.

Write results to `state/projects/{field-slug}.md`. Re-running a field is expected — fields
move, and a gap that was open in August may be closed by November. Record the date.

## What this skill does not do

- It does not pick the field. That is `role-sourcing`.
- It does not write the code.
- It does not propose projects that need a cluster, a wet lab, private data, or a
  collaborator who has not agreed yet. Those are research plans, not proof projects.
- It does not rank by scientific importance. It ranks by **evidence produced per week.**

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — Jai rewrites the output, states a preference in
passing, a step fails the same way twice, a default turns out to be wrong for how he
actually works — record it and say so in one line:

    bash kernel/skill-learn.sh record proof-project "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
