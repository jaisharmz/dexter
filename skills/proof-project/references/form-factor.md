# Form factor

The spec a project must satisfy before it is worth starting. Seven fields. A project missing
any of them is not finished being designed, and the missing one is almost always the control
or the trap.

---

## 1. The line it earns

A single sentence, written **before** any work starts, with the number left blank:

> *"Of the five providers selling Llama-3.1-8B on OpenRouter, ___ fail an equality test
> against the precision they advertise."*

> *"The standard Perturb-seq benchmarks cannot distinguish model quality on ___ of 1,832
> genes."*

Three properties make it work. It is **checkable** — someone could disagree and be shown
wrong. It is **wanted** — a specific person in the field would read it. And it is
**absent** — nobody has published it, which you have verified rather than assumed.

If the sentence needs a subordinate clause to explain why it matters, the project is aimed
at the wrong thing. If you cannot write it at all, stop: that is the check that kills the
most bad projects, and it is free.

## 2. Time box

**Weekend** — two to three days. One measurement, one dataset, one plot. This is the one to
do first, always, because an unfinished fortnight project proves less than a finished
weekend one.

**Fortnight** — ten to fifteen working days. A reproduction with a control arm, or a
benchmark across several models.

**Semester** — only when the field is the destination and the artifact is a tool others will
use. Rare, and never the first thing.

Estimate honestly. The common failure is a fortnight project described as a weekend, which
then eats a month and is abandoned at 80%. **Halve what you think, then check whether the
halved version still earns its line.** Often it does, and that is the project.

## 3. Compute floor

**Laptop**, **one card**, or **cluster**. State which, and state the actual numbers —
GPU-hours, download size, API spend.

If the answer is cluster, cut the project. Not because the compute is unavailable but
because a cluster project competes with labs that have more of it, and the whole strategy
here is to do work they are not doing rather than work they are doing better.

The best proof projects run on a laptop, and there are more of them than people expect,
because measurement is cheap and training is not.

## 4. The control

**What makes success distinguishable from coincidence.**

This is the field most often skipped and the one that separates a result from a story. A
steering vector that changes behaviour is not a finding until a norm-matched random vector
does not. An interpretability score is not a finding until an untrained twin scores lower. A
speedup is not a finding until the baseline was tuned by someone who wanted it to win.

State the control arm explicitly in the plan. If you cannot name one, the project produces
an anecdote.

## 5. The trap

**The specific thing that silently produces plausible wrong answers.**

Every real project has one, and it is worth finding before starting rather than after. Not
"it might be buggy" — a named, concrete mechanism:

- normalisation order, where two valid orders give different answers and the field does both
- gene or token ordering, which produces plausible wrong numbers without erroring
- serialisation, where a reordered JSON key silently drops a cache hit rate to zero
- a metric computed on a filtered subset in one paper and the full set in another

The test is whether the failure is *loud* or *silent*. Loud failures are free. Silent ones
cost a week and, worse, can be published. Budget explicit time for the trap and write a test
that would catch it.

## 6. Who reads it

**A named person or team, and why they would care.**

"The community" is not an audience. "The maintainer of the library you measured, who merged
its last release themselves" is. This field is what turns a project into an email — the project
and the outreach are the same motion, and knowing the reader while designing the project
usually improves the project.

If a maintainer or author is reachable, **ask before spending the compute.** A question that
takes them two minutes can save 150 GPU-hours, and it opens the relationship earlier and
better than a finished artifact does.

## 7. What it teaches

The skill you could not previously claim. Be specific: not "learned about inference" but
"how to make a defensible claim about a system you cannot open, where the difficulty is
constructing the null rather than computing the statistic".

This is what you say in an interview when asked why you did it, and a vague answer here
means the project was chosen for its topic rather than its content.

---

## The artifact

Three things, always:

- **A repo** that runs from a clean checkout with one command. The README's first line is
  the line it earns, with the number filled in.
- **A write-up** of two to four pages. What was measured, the control, what did not work,
  and what is not claimed. The "not claimed" section is what makes a careful reader trust
  the rest.
- **The number**, stated where someone can disagree with it.

**Publishing a negative result is a full outcome.** "This does not reproduce, here is
exactly what I ran" is more useful to a field than another paper claiming it does — and it
signals more, because it shows the operator will report an inconvenient answer.

## Anti-patterns

| shape | why it fails |
| --- | --- |
| "Reproduce paper X" with no question attached | ends in "it worked", which teaches nothing and earns no line |
| Train a model to beat a lab's model | competing where they are strongest, with 1/1000 the compute |
| A demo | success and failure look identical, so it is not evidence |
| A survey or literature review | no number, and it reads as work avoidance |
| Needs data behind an application | the application is the project, and it takes months |
| Needs a collaborator who has not agreed | not a project until they have |
| A tool with no result attached | tools are judged by adoption, which takes a year |

The last one is worth care. A good tool built alongside a result is excellent. A tool built
*instead of* a result has no way to be judged in the window that matters.
