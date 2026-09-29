---
name: core-idea
summary: Every problem, paper or topic turns on one simple idea that takes about five minutes to learn and unlocks far more than the thing itself. Find it, lead with it, show how far it reaches.
triggers: [teaching, learning, explaining, summarizing, papers, problems]
---

Jai's formulation, 2026-09-26:

> The main concept for something (e.g. solving a leetcode problem, or a paper) is a
> really simple concept which is not too hard to understand (takes about ~5 minutes) but
> you can solve so many more problems / have so many more techniques to use / can learn
> so many more things when you know that concept.

It makes two claims, and both matter.

- **The idea is small.** It takes five minutes, not an hour. If explaining it takes longer, you have not found it yet; you are explaining the scaffolding around it (the implementation, the dataset, the edge cases).
- **The idea reaches far.** Its value is everything it unlocks beyond the one problem or paper. An idea that only solves the problem in front of you is a trick, not the core.

## In practice

- Find the idea before teaching, summarizing or recommending anything. Write it in one sentence. Then check: could a smart person outside the field get it in five minutes from one tiny example?
- Lead with it. A lesson teaches the idea before the specifics. A paper summary opens with the idea, not the setup. A LeetCode walkthrough states the idea ("for each length, keep only the smallest tail") before any code.
- Show the reach once the idea has landed. Name two or three other problems, techniques or papers it unlocks. That reach is what makes the five minutes worth spending, and it is what makes the idea stick.
- Keep the idea separate from its implementation. Understanding takes five minutes; making it run is a second skill, and it gets its own practice. Don't read "can't implement it" as "doesn't understand it", or the reverse.
- When choosing what to learn next, prefer the idea with the most reach per minute. That is how [[ordering]] picks position one.

## Examples

| thing | the core idea | what it unlocks |
|---|---|---|
| 354 Russian Doll Envelopes | For each length, keep only the smallest tail any chain of that length can have. The tails stay sorted, so each new item is one binary search. | 300, 1964, 1671, 2407, and any longest-chain problem with n up to 1e5 |
| 295 Find Median from Data Stream | The median sits where two halves meet, so keep each half's boundary on top of its own heap. | sliding-window median, top-k in a stream, IPO, the k-th smallest of anything that streams |
| Score-based diffusion | Learn which direction makes a noisy sample more likely at every noise level, then walk noise back to data. | denoising, guidance, SDE and ODE samplers, flow matching |
| A paper reimplemented in `learning/` | The new idea is almost always under 60 lines. Everything else is scaffolding the authors didn't invent either. | reading the next paper in that line in minutes instead of hours |

Companion guidelines: [[ordering]] puts the highest-leverage idea first, and
[[presentation]] opens with the method and a dummy example. The `guided-learning` and
`leetcode-coach` skills are built around this one.
