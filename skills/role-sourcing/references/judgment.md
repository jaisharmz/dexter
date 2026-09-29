# The judgment layer

Everything in this file is a call a script cannot make. This skill ships almost no code,
and that is the design: qualification is entirely a reading problem, and a reading problem
given to a rule produces confident wrong answers rather than errors. The checks that can
stop an email live in `role-outreach`, where the failures are exact and unrecoverable.

Four judgments carry qualification. They are listed in the order they bite, and each is
followed by what the mechanical version gets wrong, because that is the only honest way to
explain why it is not a script.

One judgment that used to live here — *who owns this role* — now belongs to
`role-outreach`, since the answer depends on the channel.

---

## 1. Is this opening real?

The single highest-leverage judgment, and the one with no deterministic version at all.

A posting URL that returns HTTP 200 proves a page exists. It does not prove a team
decided to hire, that a budget exists, or that anyone reads what arrives. Job boards are
full of listings that are real HTML and fictional jobs.

**A rule cannot do this.** "Posted within 30 days" passes every monthly repost and fails
the eight-week-old listing at a twelve-person company that is genuinely still open. The
freshness of the page is not the freshness of the job.

**Read for whether a decision was made.** A real opening usually describes work that only
exists because something happened recently — a model shipped, a customer landed, a team
split. Signals worth weighing:

| reads real | reads like a ghost |
| --- | --- |
| names a specific team, project, or model | "various teams", "multiple levels" |
| names the manager, or says who you report to | no human named anywhere |
| describes a problem you can date to something the company shipped | generic responsibilities that would fit any ML role at any company |
| the ATS job id sits near other recently-created ids | the id is far below the company's current range |
| a 30-person company with 4 open roles | a 30-person company with 40 open roles |
| the text has been edited since first posting | byte-identical across five city listings |

**Absence of a posting is not absence of a job**, and this is where the edge is. At a
company under fifty people the decision to hire precedes the listing by weeks. A specific
note to the person who would own the role, sent in that window, competes against nobody.
Signals: a new repo or a sharp change in commit volume in an area, a paper with a new
first author, a funding round in the last quarter, a founder posting about scope they
cannot cover. Mark these `pre-posting` and write to them — do not discard them for
failing a posting check.

**When you cannot tell, say so.** `hiring: unsure` with a note is a better
record than a guess. The operator can decide; a fabricated confidence cannot be undone.

---

## 2. Who actually owns this role?

**Moved.** This is now *Finding the owner* in `role-outreach/SKILL.md`, because the right person
depends on which channel is used, and the channel is not chosen here. A qualified target
needs no owner and no address — finding one early invites writing early, which is the
failure this split exists to prevent.

---

## 3. Does the operator actually fit this, and which artifact says so?

The judgment that decides reply rate, and the one most often skipped under time pressure.

**The mechanical version — "pick the artifact whose area tag matches the company's area
tag" — is worse than useless**, because it always returns something. Every company in a bio
list would match the operator's one bio artifact. That produces an email that says "I did
bio, you do bio", which is the generic note that loses at exactly this step.

**Ask the harder question instead:** what is this team's hardest current problem, and does
one of these artifacts speak to *that*? Then write the sentence that connects them. If you
cannot write that sentence, you do not have a fit.

Worked examples, best to worst:

- **A lab that trains its own model, and a library the operator works on has a reproduction
  recipe for it.** The sentence writes itself and names their model back to them. This is
  what a fit looks like.
- **A robotics company whose policies are diffusion or flow-matching models**, and an
  operator with diffusion papers but no embodied stack. The sentence is "your policy class
  is the thing I already work on, the embodied stack is what I want to learn". Honest,
  specific, and it pre-empts the obvious objection.
- **A therapeutics company with a five-person ML team and no public output.** There is no
  sentence. The operator's bio artifact matches the area tag and says nothing about their
  problem. **Do not write.** This is a correct outcome, not a failed one.

**Refusing is cheap and the alternative is not.** At a forty-person company the founder
remembers a generic email, and there is no second first impression. Recording
`thesis: none` with a reason is the right answer often enough that a run producing no
thesis for a third of its companies is working correctly.

---

## 4. Is a decade here well spent?

`config/thesis.yaml` scores **areas** on leverage and ten-year value. Companies inside an
area do not inherit those scores, and treating them as if they do is the mistake this
section exists to prevent.

The operator has said plainly that past work is proof they can do hard things, not a
description of where they want to stay. So the question is not "does this match the
resume" — it is **"would a decade here be a decade well spent, and does the existing work
open the door?"** Those are separate and both need answering per company.

- A bio×AI company doing contract ML services for pharma sits in the highest ten-year
  area and is itself a low ten-year bet. The area score does not save it.
- A generative-media company applying diffusion to a narrow product sits in a
  medium ten-year area and may still be a fine seat, if the team owns the model.
- **The rule of thumb that works: does this company own a model, or does it use one?**
  Owning one means the hard problems stay in-house for a decade. Using one means the
  interesting work moves upstream to whoever built it.

Where leverage and ten-year value point in different directions, follow ten-year for
*which* companies and leverage for *how* you write to them. That is the whole strategy in
one line, and it is why the two scores are kept apart in config rather than averaged.

---

## The brief

Generate it at runtime from `config/thesis.yaml`, `config/persona.md`, and the company
record. Never hardcode a company name or an artifact into a script — if you are typing
either into code, it belongs in config.

> You are researching **{company}** ({domain}) to decide whether it belongs on the
> operator's target list. Do not look for email addresses.
>
> **The operator.** {persona identity block}. Graduating {meta.graduating}. Their stated
> position: past work is proof of capability, not a description of where they want to
> stay. Do not rule a company out because the resume does not already match it.
>
> **This area.** {area.label} — leverage {area.leverage}, ten-year {area.ten_year},
> role in the plan: {area.role}. Artifacts available to lead with:
> {artifacts, rendered from persona.md with their "use when" lines}.
>
> **Budget: {n} tool calls.** Track them. If you run out, say so and set
> `budget_exhausted: true`. A thin answer labelled thin is useful; a thin answer that
> looks complete is worse than nothing.
>
> **Decide four things.** Whether an opening is real (or `pre-posting`); whether a decade
> here would be well spent; whether the existing work opens the door now; and which single
> artifact speaks to their hardest current problem, with the one sentence connecting them.
> Any may come back negative. `thesis: none` and `hiring: unsure` are real answers and are
> preferred to a guess.
>
> **Do not resolve email addresses.** Qualification does not need them and outreach will
> find them once a channel is chosen. The Sent-folder search for this domain, run before
> this brief, found: {prior contact}. Record it on the target, since it decides whether the
> company is still cleanly approachable.
>
> **LinkedIn: search-result snippets only.** Read names and titles off the SERP. Do not
> fetch, crawl, or automate linkedin.com.
>
> **When a careers page returns suspiciously little, check the raw HTML before concluding
> it has nothing.** Most ATS pages render their listings from a JSON payload that WebFetch
> drops silently, so "no open roles" and "the roles are in a script tag" look identical.
> `curl` and grep for the payload before writing a company off. Greenhouse, Lever and
> Ashby all do this.
>
> **Write** `state/targets/{slug}.json` against the schema, then stop. **If there is
> nothing here**, write the file anyway, shaped like the schema's empty result, with a
> `reason` naming what you looked at. Never pad.

---

## What is deterministic here, and what moved

Almost nothing in qualification is mechanical, which is why this skill is mostly prose.

| here, mechanical | |
| --- | --- |
| does a URL resolve | a fetch either returns or it does not. Whether the *job* is real is §1. |
| has the operator's mailbox already written to this domain | one Sent-folder search, and it decides whether the company is still cleanly approachable |

Every check that can stop an email lives in `role-outreach`, because that is where the
failures are exact and unrecoverable: the collision check by domain and by name, the
per-company cap, and each template's required fields. The split is not by difficulty. It
is by whether a wrong answer can be taken back.
