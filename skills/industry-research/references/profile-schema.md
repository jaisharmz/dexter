# Profile schema

The profile is the one part of this skill that is about a specific person. It lives outside the skill, at `~/.claude/industry-research/profile.md` by default, so that updating the skill never touches it and swapping to a different person is a single file swap.

This document defines the shape. It contains nobody's actual profile.

## What the profile is for, and what it is not for

The profile answers two questions and no others:

1. **How deep should this go?** What can be assumed, what has to be explained, what scale of project is realistic.
2. **Who can this person actually reach?** Which named researchers and companies sit one introduction away.

The profile does **not** decide what a field is about. This is the most likely failure of the whole skill, so it is stated here, in `voice.md`, and in the prober and builder agent prompts.

> **Anti-anchoring.** Never frame a field in terms of the reader's prior work. Never reach for an analogy to their past projects. Never bias avenue selection toward what sits adjacent to what they already know. If a genuine connection exists, it gets one labeled sentence at the end of the relevant file. The reader is comparing fields in order to choose between them, and every analogy back to familiar ground makes that comparison worse.

A person whose background is in one area is very often trying to leave it. Read the profile as a calibration instrument, not a statement of interest.

## Format

Markdown with a YAML frontmatter block for the machine-readable parts, prose below for the rest.

```yaml
---
name: <how to address them in the output, or omit>
level: <one line: what tier of technical depth to write at>
trajectory: <phd | startup | industry-research | industry-eng | undecided>
infra:
  compute: <what they can actually run on>
  comfortable: [<frameworks, tools, workflows they use without thinking>]
  unfamiliar: [<things that would be a real lift>]
reading_log: <path to a file listing papers read, or omit>
voice_samples: [<paths to things this person wrote>]
---
```

Then prose sections:

### `## Deep`

Fields where they should be treated as a peer at the frontier. Explain nothing. Reading lists here start after the canon and consist of work from the last year or two.

Be specific about *what* within the field. "Deep in RL" is less useful than "deep in policy-gradient methods and offline RL, has not touched multi-agent."

### `## Touched`

Fields they know at a working level. They will recognize the vocabulary and can read the papers, but depth still teaches them something. Reading lists here can include one or two foundational works alongside current ones.

### `## Untouched`

Genuine greenfield. Reading lists start from foundations. Projects should assume no prior context.

This section is where unknown-unknowns are richest, and the scout agents should weight toward it when hunting for things the reader did not know to ask about.

### `## Network`

The part that makes `network.md` worth anything. Each entry is a circle plus what it actually gets you, since those differ a lot.

```
- <circle name>: <what this actually gets you: names? intros? a room you're already in?>
```

The distinction that matters: being in a lab gets you its PIs and its collaborators. Being in a fellowship gets you a Slack and a plausible cold-email opener. Working somewhere gets you internal directory access. Write down which kind each one is.

Also record deliberate widening moves the person has named, like "willing to cold-email VCs for portfolio-company intros." Those change the outreach strategy from "who do I know" to "who can be reached."

### `## Constraints`

Anything that bounds what a good recommendation looks like. Time available per week. Whether they need publishable output or just understanding. Geography, if it matters for the people section. Deadlines, like a PhD application cycle or an internship start date.

## Bootstrapping

If no profile exists, `agents/bootstrapper.md` builds one. It reads a directory the user points at, plus whatever they state by hand, and writes the file. The user reviews and corrects it before the first run proceeds.

The bootstrapper should be honest in the profile about depth. Overstating it produces output that skips things the reader needed; understating it produces condescending output. When evidence is ambiguous, note the ambiguity in the profile rather than picking.

## Keeping it current

The profile goes stale. Two defenses:

`reading_log` points at a live file rather than being copied into the profile, so the builder agent always checks the current version before recommending papers.

`run.json` in each output directory records a hash of the profile used. When a re-run shows a different hash, the difference in output is explained.

If the profile is more than a few months old, say so at the start of a run and offer to re-bootstrap.

## Swapping people

Either overwrite `~/.claude/industry-research/profile.md`, or keep several and select one:

```
/industry-research robotics --profile ~/.claude/industry-research/alice.md
```

A profile for someone at a different level should produce visibly different output: different reading depth, different project scale, different outreach paths. If swapping the profile does not change the output, the profile is decorative and something upstream is ignoring it.
