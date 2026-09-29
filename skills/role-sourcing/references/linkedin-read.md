# Reading a company off LinkedIn

The heuristic is two questions: how many followers does the company have on LinkedIn, and,
more to the point, looking at the people who work there, does the operator rate them
highly? Are their profiles what the operator wants to be?

That is a better question than it first looks, because it is the only one in this whole
process that asks **who the operator would be working next to** rather than what the company
builds. It is also fast — the company's People tab answers it in one page load.

The operator does this read by hand, in their own browser, signed in to LinkedIn: the
People tab returns almost nothing signed out, and the agent does not open linkedin.com.
The agent's part is to find the company's page through a search result, say what to look
for, and write down what the operator reports.

    https://www.linkedin.com/company/<slug>/people/

## The metric is a hit rate, not a tally

**The correction that shaped this method:** the measure is not how many alumni of one school
work there. It is the hit rate of the people: would the operator rate this person highly?
If most of the people working there clear that bar, it is probably a good company.

So the method is: **sample people, judge each one individually, report the fraction.** Counting
how many went to the operator's school is a tally, and a tally is the wrong shape — it
measures a pipeline, not a bar. A company can have twelve alumni of one school and still be
full of people the operator would not want to be.

**How to run it:**

1. The operator opens the People tab and reads **the first 10–15 individual profiles** it
   surfaces, plus a second page if the first looks unrepresentative. Skip recruiters, ops
   and sales unless the question is specifically about the whole company.
2. For each one, they make a **binary call**: clears the bar, or not. Not a score — a call.
   The point of a hit rate is that it forces a verdict per person.
3. Record it as **"N of M"**, and **name only the hits**, the two or three that made the
   call obvious. A miss is a stranger judged on a glance at a profile, so it counts toward
   M and never goes into the record by name. The named hits are what the operator rereads
   later; the ratio is the summary.
4. **Above ~70% is a strong company. Below ~40% is a flag** regardless of what the company
   builds or who funded it.

**What the call is made on** — read the headline and, where it is ambiguous, the profile:

- **Did they build something?** A named model, a paper, a system, a shipped product, an
  open-source project people use. *"Founding Engineer"*, *"built X"*, a first-author paper.
- **Is the path unusual and self-directed** rather than conveyor-belt? A dropout who shipped
  something, a co-founder of an acquired company, a competitive-programming or
  competition result, an unusual combination of fields.
- **Did they get into somewhere hard and then do something there**, rather than just pass
  through? "Ex-Anthropic" on someone who shipped is different from "Ex-Anthropic" on someone
  who interned.
- **Fellowship and programme names** carry real signal at this stage — Neo Scholar, ZFellow,
  RISE, Fulbright, YC, Thiel — especially when they are the same shape as the operator's own
  record.
- **Seniority is not the bar.** A Staff title at a big company is a career fact; a
  22-year-old who wrote the library the company uses is the thing being measured.

**Record a coin flip as one**, and which way the sample as a whole leans. The named hits
are the auditable part, not the number: they are what lets the operator recalibrate the
bar later.

## The supporting numbers, in order of how much they matter

These contextualise the hit rate. None of them replaces it.

**1. Engineering as a share of "associated members."** The most useful *number* on the page,
and the careers page never tells you. It separates a research company from a company with a
research team. **When Business Development outnumbers Engineering, say so** — it does not
disqualify the company, but it changes what working there is.

**2. Followers, and followers per head.** The raw count is a brand signal; the ratio is the
interesting one. A company with 159K followers and fewer than 50 employees is
disproportionately watched — its postings get read by everyone the operator is competing
with, and its name does work on a résumé. A big follower count on a big headcount is just
bigness.

**3. "Where they studied."** ⚠️ **Demoted deliberately.** This was over-weighted in the first
pass and then corrected. It is a *pipeline* fact, useful for exactly one thing: **whether the
alumni network is a live referral surface.** The operator's school in the top five means they
can plausibly reach people there. It says almost nothing about whether those people are any
good.

**4. Mutual connections — the free finding.** LinkedIn prints who the operator shares with
each person, and that occasionally hands over a path nobody researched. One investor contact
appearing as a mutual connection on two employees confirms that route in is live rather than
theoretical. And when a company hides its employee list, LinkedIn may still say that someone
the operator knows works there, which means a person in their network is already inside.
**Ask about this every time and write it down** — it is the cheapest warm path available and
it never appears in company research.

## What the heuristic does not tell you

It measures the people, not the work, and the two come apart. A team of exceptional people
serving someone else's model still fails the ownership test in `judgment.md`. Score this
alongside the ten-year question, never instead of it.

It also skews against very new companies. A twelve-person seed-stage lab has no follower count
and a thin People tab; that is a fact about its age, not its calibre.

## LinkedIn slug traps, verified 2026-09-15

**The obvious slug is frequently a different company, and one of them is a near-perfect
decoy.** Always search by name and take the href from the result, or check the follower count
against the company's real size before trusting a page.

| you would guess | what it actually is |
| --- | --- |
| `physicalintelligence` | **Visia** — *"Physical Intelligence for Heavy Industry"*, New York, 27 people. A completely different company, and the page looks legitimate. |
| `fal-ai` | a two-person company called **FAL AI**. The real fal is **`features-and-labels`** (fal = Features And Labels), 30K followers. |
| `general-intuition` | does not exist. The real one is **`generalintuition`**. |
| `thinkingmachineslab` | a 15-follower squatter. **Four** duplicate Thinking Machines pages exist; the real one is **`thinkingmachinesai`**, 159K followers, tagged *"Ranked on LinkedIn Top Startups"*. |
| `applied-intuition` | a **four-person "Professional Training and Coaching" company in Santa Barbara**, auto-created by LinkedIn. The real one is **`applied-intuition-inc`**, 85K followers, 1,625 members. |
| `1x-tech` | not 1X. Still unresolved. |

**Write down every slug you confirm**, so nobody re-derives it.

The tell is always the follower count. A real frontier-lab page does not have 15 followers.
