# The record

One file per field: `state/projects/{field-slug}.md`, dated. Markdown rather than JSON —
the audience is the operator on a Saturday morning, not a script.

```markdown
# Proof projects: <field>
*Run YYYY-MM-DD. Searched: <what was checked to claim these are open>.*

## <Project title, stated as the action>
**The line it earns:** "<sentence with a blank number>"

| | |
|---|---|
| **Time box** | weekend · fortnight · semester |
| **Compute** | laptop · one card · <actual GPU-hours, GB, $> |
| **Control** | <what separates a result from a coincidence> |
| **Trap** | <the specific silent-failure mechanism> |
| **Reads it** | <named person or team, and why they care> |
| **Teaches** | <the skill claimable afterwards> |
| **Crossing** | <which entry in config/assets.md makes this cheap here> |

<Two or three paragraphs: what the gap is, why it is still open, and what you actually do.>

**Done when:** <a checkable condition, not "when it works">
**If it fails:** <what the negative result says, and why that is still publishable>
```

## Rules for the record

**Two to four projects, never more.** A long list is a list nobody starts. If a run produces
six candidates, publish the three that best satisfy the form factor and note the others in
one line each.

**Order by evidence-per-week**, not by scientific importance. The weekend project goes
first, always, because the operator's real constraint is finishing something.

**`Done when:` must be checkable by someone else.** "When the rank correlation lands within
0.02 of the published 0.943" is checkable. "When the analysis is complete" is not.

**`If it fails:` is required.** A project whose failure produces nothing publishable has no
control arm, or is not falsifiable, and should not have been written down. Filling this in
is the last check on the form factor.

**Say what was searched.** "Open" is a claim and needs its evidence — the searches run, the
date range checked, whether a maintainer was asked. It is also what makes the file
re-runnable later: the next run starts from what this one already ruled out.

## Re-running

Expected. Fields move, gaps close, and a project that was open in August may be published by
November. Keep old files rather than overwriting — a closed gap is evidence about how fast
the field moves, which is itself worth knowing when choosing where to spend a decade.
