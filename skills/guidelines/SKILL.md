---
name: guidelines
description: List, show, and apply the operator's engineering guidelines and perspectives — the plug-and-play prompt fragments in kernel/guidelines/. Use when the user runs /guidelines, asks which guidelines exist, asks to apply one to a piece of work, wants a guideline added or edited, or when starting work where a guideline plausibly applies (writing prose, designing a system, deciding whether to build or reuse).
user-invocable: true
argument-hint: "[list | show <name> | apply <name> to <target> | add <name>]"
---

# Guidelines

Guidelines are prompt fragments the operator can pull into any request. They live in
`kernel/guidelines/` as markdown with frontmatter (`name`, `summary`, `triggers`).
They are an option, never an obligation — they bring them up when they want them, and
you apply them silently when their `triggers` obviously match.

## list

Read every `kernel/guidelines/*.md`, print `name` and `summary` as a table. That's it.
Don't dump bodies; the point of the index is that it stays scannable.

## show <name>

Print the full body of `kernel/guidelines/<name>.md`.

## apply <name> to <target>

Load the guideline, then work the target against it — a document, a design, a diff.
Report concretely: what violates it, where, and the fix. Not a general appreciation of
the guideline.

For `deslopification` specifically, prefer the executable version:
`python3 skills/papers/scripts/deslop.py <page.md>` catches title shapes and density
budgets that a read-through misses. It takes a markdown page, reading its first heading
as the title and skipping code, tables and frontmatter, or a papers run's folder. Run
it, then fix what it flags.

## add <name>

Create `kernel/guidelines/<name>.md` with the frontmatter above. Write it in the operator's
register: concrete, worked examples over abstractions, no throat-clearing. Then commit
it. If they described the guideline in their own words, preserve their phrasing in the body
rather than paraphrasing it into something blander.

## Applying without being asked

`triggers: [always]` guidelines are in force at all times — currently `autonomy` and
`throughput`. Others activate when their trigger matches the work at hand. Applying a
guideline is not a thing to announce; just do the work correctly.

If two guidelines conflict on a specific decision, say so and pick one, with the
reason. Don't silently average them.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record guidelines "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
