---
name: research-loop
summary: Improve a model one error source at a time. Evaluate, cluster the failures, test one idea as a ten-minute ablation, keep it only if it passes a rule written before the result, and explain every result with a mechanism.
triggers: [experiments, post-training, ablations, evaluation, research, synthetic-data, take-homes, work-trials]
---

Jai's method, written by hand before any code on a two-day post-training project and followed
through it.

> Bad way to approach this: Claude finds datasets, Claude sets up training, autoresearch, see some
> graph go up. → more interested in the process.

## The loop

Evaluate the model, keeping every row's trace. Cluster the raw errors. Pick an idea that would remove
the largest current source of error. Design it as an ablation that runs in about ten minutes, then run
it. If the idea works, the updated model goes back to evaluation. If it fails, try another idea, up to
a fixed number of tries, then move to the next largest source of error.

- **Tooling comes before training.** A trace viewer that shows each row's prompt, options, gold, pick
  and every probability, plus per-task errors, comparisons between runs and reliability. Name failure
  clusters with a sparse phrase ("I can figure out from examples"), and make the context copyable into
  a coding agent.
- **Cluster in order:** task type, then whether the task is in or out of the training distribution,
  then error type.
- **Cheapest change first.** Number the models as a ladder, one change per rung: the vanilla model,
  then inference-only changes (how the answer is read out, removing a bias), then the first
  finetune. Inference before training, training before architecture. "Try the simple, intuitive
  solution first."
- **Keep the code and the docs as small as they can be.** "Remove bloat from code / documentation to
  only the most necessary."

## Two ablation tests

- **Type 1, can it be learned at all?** Split the eval rows of one task into a temporary train and a
  temporary test half, train on the first, score the second. No gain means the skill is not worth
  making data for. Type 1 never reaches a final model, and its checkpoint is discarded.
- **Type 2, does this data deliver it?** From the current checkpoint, train with and without the new
  data for the same steps and seed. Keep the data only if it lifts its own target and hurts nothing
  else. With several candidate sets, give each its own arm against one shared control and score every
  arm on every dataset. A gain on one then cannot hide a loss on another.

## Where data comes from

Ask in this order. Can a program generate the task and compute its label from a config? Generate it
procedurally. If not, can an LLM write it realistically? Look for public data first and generate only
if none fits. If neither, look for public data, and most likely drop the idea. Public data must test
the same skill on a different surface, with no overlap with any eval row.

Every set passes a gate before training: labels re-solved by a second method, answer options
reordered, gold answers balanced, and nothing copied from the eval sets. Data from an open model whose
logits are available can be distilled instead of trained on hard labels.

## Decision rules

- **Write the keep or drop rule and the deciding metric before the run**, and commit it before any
  number is read.
- **A gain must clear the noise.** Use a paired bootstrap on the same rows, and an effect size above the
  spread between seeds.
- **Nothing that is tuned is fitted on eval data.** That covers temperatures, thresholds and data
  mixes. Audit for it.
- **Compare against an honest cheap baseline.** A model that outputs uniform probabilities can score
  well on a metric that weights calibration. The bar is the baseline after temperature scaling.

## Explain every result

"Theory / interpretable explanations > quant results." A failed experiment gets a reason as well as a
row in a table. A task stuck at chance even after Type 1 training gets a complexity argument (a
fixed-depth network cannot compose arbitrarily many swaps). A calibration shift gets a derivation (the
loss's optimum under a KL penalty caps confidence). A bias gets a geometric picture: estimate the
unwanted direction, then subtract it. A well-motivated experiment that fails beats a gain nobody can
explain.

## The agent's part

He writes the method and draws the line on the page ("Your task: complete up to / including here").
The agent builds, runs, and reports each result in a commit message that states the finding. Then it
proposes the next step by the loop above, and the design calls stay his.
