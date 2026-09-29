---
name: role-outreach
description: Reach a qualified company about a new-grad or internship role - choose the channel, find the right person, and leave drafts in Gmail. Covers direct email to the role owner, VC talent partners, referrals through the operator's own network, the application form itself, and work-first approaches. Use when the user says "reach out to X", "apply to X", "who do I email at X", "find me a warm intro", or "run outreach". Takes qualified targets from role-sourcing. It never sends.
argument-hint: <company | --target state/targets/<slug>.json | --channel vc|email|referral|apply>
user-invocable: true
---

# Role outreach

Takes a qualified company from `role-sourcing` and gets the operator in front of someone
who can act. **It never sends.** Drafts land in Gmail and are read and sent by hand.

    role-sourcing  →  state/targets/{slug}.json  →  role-outreach  →  Gmail drafts

Sourcing decided *whether* and *why*. This decides *how* — and the how is not one thing.
Five channels, with very different yields, and the mistake that costs the most is
defaulting to cold email because it is the one that scales.

## Which account the draft is written from

**The one account the operator chose for the job search. Always.** Choose it once and
write it down, in `USER.md` for instance, so no run has to guess. A school or work address
often does better than a personal one, because its domain tells the reader who is writing
before the first line does.

Two consequences worth stating, because both are easy to get wrong:

- **Check which Gmail account Chrome is signed into before composing**, not after. Chrome may
  default to the personal profile, and an address is not fixable once a draft is sent.
- Anything else that sends from the same mailbox (a club or company campaign, an earlier
  search) shares its history with this skill, which is why the collision check below
  exists. That history is there to check against, not to mine: a campaign's research and
  contact lists belong to whoever ran it. Writing from a more respectable address does not
  make a second approach to the same person any better.

## The rule that outranks everything

**Never write to a person the operator's mailbox has already cold-emailed.** If a club, an
employer or an earlier campaign has sent mail in the operator's name, that history reaches
the same companies this skill targets. The same name arriving twice from the same human,
first asking for one thing and then asking for a job, is worse than not writing at all.

**Check the domain before the research, not the address after it.** Keep the domains that
earlier outreach reached, and the Sent-folder search that rebuilds the list, in
`state/prior-contact.md`, and read it before researching anyone at a company. Research
will happily rank someone already written to as the best contact in a sector. And an
address-level check misses the same person at a second address: a founder written to at
the company domain can resurface under a personal domain, and a search for the address
alone clears them. **Check the person, not the string.**

And before choosing a channel, list every real tie the operator has, ranked by strength, in
`state/warm-paths.md`: an advisor, a former manager, a fund programme, anyone who has seen
the work. Read it first. It is short, and it is where the channel choice starts.

The check is by hand: search the sending mailbox's Sent folder for the domain and the
person's name, and write the result on the outreach record. Someone who sends at volume
can automate it against their outbound database, as long as it fails closed: if a source
cannot be read, nobody clears, because a check that silently passes is worse than none.
Either way it runs before channel selection, not after, because a collision can rule out
a channel entirely.

## The first question is never "what do I write"

It is **"is there a warm path here that I am not seeing?"**

The operator's own record is usually the argument. Processes that reach the final round
and then stall on team matching or a filled cohort describe a funnel that loses at the
end, and the only channels that change the end are the ones that arrive with a person
attached. A cold email is the weakest of the five and the easiest to reach for.

## The five channels

Full treatment in `references/channels.md`. Selection is a judgment, not a lookup — the
right channel depends on company size, whether a warm path exists, and what the operator
can show rather than claim.

| channel | when it is the right one | yield |
| --- | --- | --- |
| **VC talent partner** | the company is fund-backed and the operator has a real tie to the fund | highest, and badly underused |
| **Referral** | anyone from the operator's lab, cohort, teaching or past teams is inside | highest when it exists |
| **Work-first** | the company has a public repo, benchmark or paper the operator can engage with | slow, but converts best cold |
| **Direct email** | under ~300 people, a named owner, and a real thesis to open with | moderate |
| **The application form** | always, in addition — never instead | low alone |

**`references/vc-talent.md` first.** Talent partners are the only people in this process
whose job is to place the operator, and any real tie to a fund (a programme it runs, a
portfolio company the operator worked at, a partner who knows the work) makes its talent
team a warm contact, not a cold one. Where one exists it is the single most underused
asset on the whole list.

## Sequencing, and why the order matters

1. **Collision check** the whole target's people before anything else.
2. **Look for a warm path** — fund tie, then network tie. Do not skip to email because
   this step is slower.
3. **Submit the application** the same day the email goes out, never before and never
   instead. The email is what gets the form read.
4. **One channel at a time per company.** A talent-partner intro and a cold email arriving
   the same week makes the operator look uncoordinated to two people who talk to each other.
5. **Cap: 2 people per company, 1 under fifty headcount.** Counting, not judgment — this
   is the number that drifts upward under enthusiasm.

## Finding the owner

Only once the channel is chosen, because the right person differs by channel. The most
senior title is usually the most wrong: a VP of Engineering at 600 people forwards you to
a recruiter, and the same title at 40 people decides.

| headcount | direct-email target | why |
| --- | --- | --- |
| under 50 | a founder, or the first ML hire | no recruiter, and the founder reads their own mail |
| 50–300 | the lead of the team the posting names | they asked for the headcount |
| over 300 | the hiring manager, and only with a referral | otherwise the form is the channel and the email is noise |

**Never** `careers@`, `jobs@`, a recruiter with no team attached, or a talent partner *at
the company* for a research role. Role accounts slip into research lists easily, so filter
them out before drafting, not at review.

Finding the owner is an investigation: the posting names a team → the team's papers and
repos name people → one has a title matching the level → the address comes from a paper,
the person's own page, or the domain convention. **The person who would review the
operator's code is a better target than the person who signs the offer.**

## Templates

`config/templates/<area>/step1_initial.md`, one folder per area, named to match the `area`
on role-sourcing's targets, in the operator's own voice: short, bolded question up front,
no em dashes, no "I came across your work". The kit ships examples as
`step1_initial.example.md` in `your-area/`, `vc/` and `referral/`. Copy each to
`step1_initial.md` beside it (renaming `your-area/` after a real area), write every
square-bracketed phrase once, by hand, and never draft from a copy that still has one. The
copies stay out of git.

The agent fills each `{{ placeholder }}` itself, per contact. `company`, `hiring.*` and
`thesis.*` come from the target record. `contact.*` is this person's entry in the outreach
record's `contacts`, and `fund.*` is its `channel.fund`, both in `references/schema.md`.
`area.*` is the target's area in `config/thesis.yaml`. The square-bracketed phrases are the
operator's own, written once in the copy from `config/persona.md`.

A template's `requires:` lists every placeholder it uses. If any of them is missing for
this target, that template does not fit it: choose another channel, or do not write.
`thesis.claim` and `thesis.bridge` are the ones that matter: requiring them is the one
place where a skipped judgment becomes a stop rather than a bland email.

VC and referral notes use different templates and a different register — see
`references/channels.md`. Asking a talent partner for a job is a category error; you tell
them what you are looking for and let them match it.

## What this skill does not do

- It does not decide whether a company is worth pursuing. That is `role-sourcing`.
- It does not fill in application forms. That is `role-apply`, which fills the form in
  the browser and stops at the submit button; the operator presses it, the same day the
  email goes out.
- It does not track what happens after the draft.
- It does not send.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record role-outreach "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
