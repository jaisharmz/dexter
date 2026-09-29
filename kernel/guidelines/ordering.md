---
name: ordering
summary: Order N items so that reading only the first M is approximately the best M you could have read.
triggers: [presenting, lists, recommending, writing]
---

Jai's own formulation, and it governs every ordered thing you hand the operator — papers,
companies, options, findings, queue items:

> Suppose you give me N papers to read about a topic, presented in order. Suppose I
> read M of them, where M ranges from 1 to N. Those M should approximately be the best
> subset of M I could have read. When choosing the second, condition on the first.

**Every prefix must be the best prefix of its length.** This is not the same as sorting
by quality. The second item is chosen given that the first was read — so it earns its
place by what it *adds*, not by its standalone rank. Two excellent items that make the
same point are a bad pair; the second should have been something else.

## What this rules out

- **Sorting by score.** Independent ranking ignores redundancy and produces a top three
  that says one thing three times.
- **Chronological or alphabetical order**, unless the sequence itself carries the
  argument.
- **Saving the best for last.** The reader may stop at any point. There is no last.
- **Comprehensiveness as a defense.** A long list that must be read in full to be
  useful has failed this test regardless of its coverage.

## In practice

Pick position one for maximum standalone value. For each next position, ask what the
reader still doesn't know having read everything above it, and choose what closes the
largest remaining gap. State briefly why each item is where it is when the reason is
not obvious — that reasoning is often more useful than the item.

The same rule applies to prose: the first paragraph should be the best one-paragraph
version, and the first section the best short version. Applies to your own reports
back to the operator, not just to lists you curate.
