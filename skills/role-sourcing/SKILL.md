---
name: role-sourcing
description: Find and qualify companies worth applying to for new-grad or internship roles, and decide per company whether a decade there is well spent and what the operator would lead with. Use when the user says "find me companies", "who should I be applying to", "run role sourcing", or asks whether a company is worth pursuing. Produces a ranked target list and nothing else - reaching out is role-outreach. Discovery is agentic and uses WebSearch/WebFetch.
argument-hint: <company | --area <area key from config/thesis.yaml>>
user-invocable: true
---

# Role sourcing

Finds companies worth applying to and decides, per company, whether they are worth a
decade and what the operator would lead with. **It produces a target list and stops.**
It never resolves an address and never writes an email — that is `role-outreach`.

The split exists because the two halves fail differently. Qualification fails by being
credulous: forty companies that all "look relevant" is worse than eight that survived a
real question, and the cost of the bad thirty-two lands later, as wasted weeks. Outreach
fails by being careless: one email to the wrong person and the company is spent. Keeping
them apart lets each be strict about its own failure without inheriting the other's.

    role-sourcing  →  state/targets/{slug}.json  →  role-outreach

## What a qualified target is

Four things decided and written down with reasons. None of them is a lookup.

| judgment | the question | may come back |
| --- | --- | --- |
| **hiring** | a real opening, or credible intent before one is posted? | `real` · `pre-posting` · `unsure` · `no` |
| **ten-year** | would a decade here be a decade well spent? | `strong` · `fine` · `weak` |
| **leverage** | does the existing work open this door now? | `high` · `medium` · `low` |
| **thesis** | what is their hardest problem, and which artifact speaks to it? | a sentence, or `none` |

`references/judgment.md` is the operating document for all four. Read it before sourcing.
For each judgment it says what the mechanical version gets wrong — because a reading
problem handed to a rule returns a confident wrong answer rather than an error.

**A target that fails `thesis` is still a useful record.** Write it with `thesis: none`
and the reason. It stops the company being rediscovered next month and reconsidered from
scratch.

## The rule that shapes everything

The operator has said plainly: **past work is proof they can do hard things, not a
description of where they want to stay.** They are pivoting on purpose.

So rank by **ten-year first**, and use leverage to decide *how* to approach — never
*whether*. A company must not be dropped because the résumé does not already match it.
That inverts the usual sourcing instinct, and it is the point of this skill.

`config/thesis.yaml` scores areas on both axes. **Companies do not inherit their area's
scores.** A bio×AI contract-ML-services shop sits in the highest ten-year area and is
itself a weak ten-year bet. The heuristic carrying most of the weight: **does this company
own a model, or use one?** Owning one keeps the hard problems in-house for a decade; using
one means the interesting work lives upstream, at whoever built it.

## Start here: the investigation loop

Run it on an area key from `config/thesis.yaml` with a tool budget, or on one company and
its domain.

An investigation loop, not a channel sequence, because every channel fails on some
population. Careers pages fail at companies that hire through networks. ATS listings fail
before the posting exists. Team pages fail where none is published. Papers fail at
companies that do not write them.

Each step asks: **what gets me closer to a company I can make a real decision about?**

| what you have | what it is a lead to |
| --- | --- |
| an area | the funds that invest in it, and their portfolio pages |
| a portfolio page | ten companies, most of them wrong, cheaply |
| a company | its careers page, its ATS payload, its GitHub org |
| an ATS listing | its job id — neighbouring ids date a posting better than the page does |
| a paper you rate | its authors' employers, which is how the best targets are actually found |
| **an author you rate** | **their coauthors, and the companies those coauthors work at** |
| a company with no posting | commit volume, a new repo, a recent round: intent precedes the listing |
| a company that looks wrong | its competitors, which may not be |
| a fund whose portfolio fits | its talent partner, who places candidates into all of it |
| the operator's Sent folder | **the domains already written to, which is the first thing to check** |

The coauthor edge is the same move `outbound-sourcing` uses to turn one grounded
person into a team, pointed at a different question. There it finds more people to
write to at a company already chosen; here it finds *companies* — a coauthor's
employer is somewhere that demonstrably hires people doing work you already rated,
which is a stronger signal than a portfolio page or a job board. Walk it outward
from any author whose paper made you want to work on the problem.

**Fund people are targets here, unlike in outbound.** `outbound-sourcing` reads a
portfolio to find engineers and never writes to the fund. This skill and
`role-outreach` do write to talent partners, because placing candidates into
portfolio companies is the job they hold — one relationship covers every company
the fund backs. Same entry point, opposite conclusion about who receives mail.

**Stopping:** a tool budget, or several consecutive steps yielding neither a company nor a
lead. Both are needed — budget alone lets one interesting company absorb the run.

## Mining what already exists first

Start from what the operator already has: the companies earlier runs qualified, in
`state/targets/` (the `thesis: none` records included), and any list the operator gathered
for themselves. Re-sourcing one of those is wasted work. Research done for a club's or an
employer's campaign is not such a list, even when its mail went out from the operator's
mailbox: it belongs to that campaign.

That mail still matters. Anything already sent to a company is a constraint on outreach
rather than on sourcing, but it decides which companies are still cleanly approachable, so
record it on the target. **Search the Sent folder for the domain before researching a
company, not after.** Checked late, research will happily put an already-contacted person
at the top of its ranking.

## A second screen after ownership: corpus, RL loop, verifier

The ownership test — does the company own a model or wrap someone else's — is binary and has
been useful. **NEA's June 2026 Neolab essay proposes a strictly better version**, so use it as
the second screen:

1. **Corpus** — a domain-biased pre-training set nobody else can assemble. *"If the base is
   already fluent in protein structures, tabular data, or German legal code, every subsequent
   RL run is cheaper, faster, and more stable."*
2. **RL loop** — *"Whoever owns the environment owns the data flywheel."*
3. **Verifier** — a trustworthy reward signal. *"The most underestimated asset in this stack
   because it looks like infrastructure when it is actually the source of truth."*

A company owning all three is defensible in a way one owning only a model is not, **and that
difference is invisible to the ownership test.** It also tells the operator where they fit:
place each artifact in `config/persona.md` on one of the three layers.

The essay categorises 86 labs itself, which makes a dense starting list of companies. It is a
VC's curated list, not a neutral census, so treat its taxonomy as a lens and its entries as
leads to verify.

## The LinkedIn read, on every company

The operator does this read by hand, in their own browser, signed in to LinkedIn. The agent
does not open linkedin.com. Its part is to say what to look for, hand over the company's
page (found through a search result, not a guessed slug), and write down what the operator
reports. It takes one page load: **followers, and are these the people the operator wants
to work next to?** `references/linkedin-read.md` has the method, what each number means and
the slug traps — one of which, `physicalintelligence`, is a *different company* whose page
looks entirely legitimate.

**It is a hit rate, not a tally.** The operator reads the first 10–15 profiles and makes a
yes-or-no call on each. Record *"N of M"* and name only the hits. A miss is a stranger
judged on a glance at a profile, so it counts toward M and never goes into the record by
name: a bare *"Engineering @ X"* headline often means someone did not write a headline, not
that they are weak. Above ~70% is strong; below ~40% is a flag.

The supporting number that matters most is **engineering as a share of associated members**:
it separates a research company from a company with a research team, and when business
development outnumbers engineering, say so. School counts are demoted deliberately: they
measure a pipeline, not a bar, and are useful only for whether the alumni network is a live
referral surface.

And ask about mutual connections every time. That is where the free findings are: someone
the operator knows at one of the company's investors, showing up as a mutual connection on
its people, turns a cap-table inference into a live relationship. Results go in
`state/linkedin-scorecard.md`.

## Reading order

1. `references/judgment.md` — the four judgments and the brief. Before anything else.
2. `config/thesis.yaml` — areas scored on leverage and ten-year value, with target companies.
3. `config/persona.md` — the artifact inventory the `thesis` judgment draws from.
4. `references/schema.md` — the target record to write.
5. `references/linkedin-read.md` — the people read, and the slug traps.

Both config files are the operator's own and never ship. If either is missing, copy
`config/thesis.example.yaml` to `config/thesis.yaml` and `config/persona.example.md` to
`config/persona.md`, then fill them in with the operator before sourcing anything: every
judgment reads them.

## What this skill does not do

- **It does not resolve email addresses.** Qualification does not need them, and finding
  them early invites writing early.
- **It does not decide who owns a role.** The right person depends on which channel is
  used, and the channel is chosen in `role-outreach`.
- It does not write, draft, or send anything.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record role-sourcing "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
