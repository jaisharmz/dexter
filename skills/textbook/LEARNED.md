# Learned — textbook

Corrections this skill has earned in use. Read before running it; these override
`SKILL.md`. Protocol: `kernel/skill-learning.md`.

- **2026-10-20** — Sampler figures (reverse SDE vs ODE, Langevin): 400 particles cannot resolve step-count effects, since W1 of 400 exact draws ranges 0.04 to 0.18 across seeds. Use 2000+ particles, show the exact-draws median as a readout, and drive every step count with one Brownian path (step counts that divide the finest grid), so readouts move smoothly with N. Unadjusted Langevin on a quartic well explodes from the tails of an N(0, 1) start (h = 0.05, step 6): start chains at 0 or a mode.
