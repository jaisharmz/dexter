---
name: start-small
summary: Make something work at the smallest scale that can show it, check it by eye, then grow in steps.
triggers: [experiments, scaling, synthetic-data, post-training, sweeps, generation]
---

Stated by Jai on 2026-09-28 (`home/prompts/`):

> be very mindful about making sure something works at the small scale before going to larger
> scale.

## The ladder

- **Generation.** Make 1-2 items first and check them by eye. If they look right, make 4-5.
  Only after that, generate at scale. Dozens of synthetic documents built on an unchecked
  generator are dozens of copies of its bugs.
- **Post-training.** Train on one document type and measure that type **and** 3-4 others, so
  you see both the gain and the damage. Then train on 2-3 types and measure those and the
  rest. Only then scale.
- **Sweeps and paid runs.** Pilot on the smallest set that can answer the question, then scale
  only if it moved. State the cost before running.

## What a step needs before the next one

- A result you have **looked at**, not just a number: open the documents, read the outputs.
- A control at the same scale, since a small run is noisy: an unchanged prompt moves about
  ±3 per 100 between runs.
- A one-line decision recorded: scale up, fix, or stop.

The counterweight: small does not mean one-off. Build the small version the way the large
one will run, so scaling is a parameter change, not a rewrite.
