---
name: memory-gate
summary: Check the machine before heavy work or a new tab; keep a tab that waits on the operator while memory allows.
triggers: [chrome, tabs, models, downloads, installs, renders, containers, fan-out]
---

Stated by the operator, after a local model run crashed almost every app on the machine:

> before running something that might be memory intensive ... first understand how much memory
> there is ... on the flip side ... if we can afford to use this memory, then we should be okay
> with leaving the tab open, especially if it's like a booking form or something where you might
> need my input.

The same reading answers both halves: `node kernel/memgate/gate.mjs check`. It prints a band
(roomy, tight, full), what is short, and the biggest apps. `kernel/memgate/README.md` has the
numbers and where they come from.

## Before you start

- **Heavy work means:** a local model run or fine-tune, a model or dataset download, a
  model-runtime install, a container, a virtual display or video render, a large in-memory data
  load, a fan-out of sessions, and every new browser tab.
- **Check with the job's real need**, not the default: `check --need <GB> --disk <GB>`. For a
  model, the weights times 1.2 plus 1 GB. For a download, its size plus what it unpacks to.
- **If it does not fit,** do one of three things. Free memory you own (your done tabs, your
  background jobs). Run it on the PC with `/handoff`. Or leave it for the operator and say what
  is short. Disk counts as much as memory, because swap grows into it.
- **Re-check before each step of a long run,** not only at the start. Five background jobs that
  each fit alone do not fit together.
- The audit hook holds a heavy command that does not fit and denies a tab that does not fit. Say
  what was held; don't route around it.

## Tabs, by band

- **A tab that waits on the operator** (a booking form, an application at Submit, a sign-in, a
  code, a slot to pick, a page to look at) stays open in roomy and tight. Name it in the report,
  with what he needs to do there. In full, save its state first (the address, the answers in the
  run README, a small screenshot), then close it.
- **A done tab** stays open only in roomy, and only while this run may come back to it. In tight
  or full, close it as soon as its page is done.
- Close one before opening one when tight. Never close the operator's tabs or another session's.
