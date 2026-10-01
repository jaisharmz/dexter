---
name: role-apply
description: Fill out a company's job application forms end to end in the browser and stop at the submit button. Use when the user names a company and says "apply", "apply to X", "fill out the application", or hands over a job posting URL. Presents a multi-select of that company's open roles first, picks the right resume, fills every field, and hands the final submit back to the operator.
argument-hint: <company> [--url <posting>] [--resume <variant>]
user-invocable: true
---

# Role apply

Takes a company name and ends with a filled-in application form sitting on screen with
nothing left to do but press submit — which **the operator presses, never this skill.**

    role-sourcing  →  role-outreach  →  role-apply  →  operator presses submit

`role-outreach` already says the form is *always, in addition, never instead*, and that
the email is what causes the form to be read. This skill is the execution of that one
channel. It does not decide whether the company is worth applying to — that judgment was
`role-sourcing`'s, and if it was never made, say so and offer to run it rather than
quietly applying to something unqualified.

## The two rules that outrank everything

**1. Never press submit.** Not "confirm and submit", not "next" on the last page, not an
e-signature checkbox that finalizes. Fill every field, attach every file, scroll to the
bottom, take a screenshot, and hand it over with a list of what was entered. The operator
reviews and presses it. This is not caution theatre — a submitted application cannot be
edited or withdrawn at most firms, and a wrong graduation term or the wrong resume file
is spent for a full cycle.

Everything *before* submit is fair game and should be done without asking. Filling a text
field, picking a dropdown, uploading the resume, checking a non-legal box, advancing to
page 2 of 4 — do all of it. The pause is at the end, once.

**2. Never invent an answer.** Every value comes from `config/profile.yaml` or from the
operator. If a form asks something the profile does not answer, **ask, then write the
answer back into `config/profile.yaml`** so the question is never asked twice. A skill
that asks about work authorization on every application is a worse skill than one that
asked once in September. Guessing an address, a GPA, a start date, or a visa status is
the failure mode that silently poisons an application — nobody catches it, and it is
wrong on record.

The two rules interact: because nothing is invented, the operator's review at the submit
gate is a *review*, not a re-entry.

## Always start with the multi-select

The operator names a company. This skill does **not** pick the role.

1. Open the company's careers page and find every currently open role that plausibly
   fits — new grad, intern, and early-career engineering, research, quant and trading.
   Include the ambiguous ones; excluding a role is the operator's call.
2. Present them as a **multi-select** (`AskUserQuestion` with `multiSelect: true`), never
   a single-choice list and never a recommendation. The operator routinely applies to
   three roles at one firm, and a single-choice picker quietly makes that a three-session
   job.
3. Each option carries what is needed to choose between them without opening tabs:
   **title — location — team/desk — internship or full-time — the one line that
   distinguishes it from its neighbour.** "Quantitative Trader" and "Quantitative
   Researcher" at the same firm are different applications; say how.

Cap the list at what fits, and if there are more than a handful of near-duplicates
(same role posted in six cities), collapse them to one option and resolve the location
after selection.

**What to look for depends on the sector.**

**At trading firms** — QR (quantitative research), QT (quantitative trading) and SWE, on
whichever track the operator targets there (internship or full-time). Search the board for
all three before presenting: a firm that buries its quant intern under "Trading" while its
SWE intern sits under "Technology" will otherwise lose half the list. **Undergraduate quant
roles are frequently mislabelled or hidden** — check every level filter, not just
"Internship", and read the eligibility text rather than trusting the title, because firms
routinely mark a role "PhD" in the title and accept BS candidates in the body, or the
reverse.

**Everywhere else** — the role type (full-time new grad or internship) and the sectors the
operator names in `role-sourcing/config/persona.md`, in its exact wording. If the persona
does not say, ask once and record the answer under `logistics` in `config/profile.yaml`.

**Do not filter on the job title. Search the eligibility line.** Across a large sweep of
requisitions in several sectors, one rule beat every other heuristic:

> **Grep the requisition for a digit followed by "+ years".** Every single exclusion of a
> new-grad BS came from a numeric years floor or a seniority verb ("mentoring junior
> engineers") — almost never from the title noun.

And the corollary: **very few reqs mention a class year at all.** The candidate's class
year is *unstated* in the overwhelming majority, which means not excluded. Treat silence
as an open door, not a closed one.

**The one reliable *positive* signal is a suffix or a department, never a noun.** What
actually predicts eligibility, in order:

1. **A dedicated new-grad marker** — `- New Grad` in the title, `SDE I` / `Applied Scientist
   I` (the roman numeral is the gate at Amazon: *Applied Scientist I* accepts a Bachelor's
   while unsuffixed Scientist reqs do not), or a whole department like Applied Intuition's
   **`2027 New Grad`**, which holds 15 reqs.
2. **The absence of a seniority suffix** — Senior / Staff / Principal / Lead. At Nuro, 62 of
   105 reqs carry one, *and* every unsuffixed "Software Engineer" still wants 1–3+ years.
   There is no IC1 rung there at all.
3. **The team and the req template, not the title.** At Waabi the phrase *"Exceptional
   Bachelor's students will also be considered"* travels with a *team*: the Remote US &
   Canada autonomy cluster carries it on both Engineer and Scientist reqs, while the Toronto
   World Models cluster is MS-hard on both. **Filter on the phrase, not the title.**

The title tells you much less than it looks like it does, and what it tells you flips by
sector:

| sector | what the title means |
| --- | --- |
| **biology** | "Engineer" is the open door; "Scientist" says PhD. The original heuristic, and it holds here. |
| **AV / driving sim** | The **plain** "Research Engineer" is open; the *sub-team-titled* one is stricter (Waabi: plain req wants a Bachelor's, "Research Engineer, **World Models**" wants a Master's). |
| **robotics / AV** | **The heuristic largely fails, and sometimes inverts.** "Scientist" is still a reliable PhD signal, but "Research Engineer" usually only relaxes PhD→MS — and at Ambi, Waabi and Nuro the *Engineer* req is the **harder** one. Waabi's *Research Engineer, World Models* is MS-hard with no escape clause while its *Research Scientist, Learnable Planner* accepts "exceptional Bachelor's students"; Nuro's *Senior/Staff ML **Engineer**, Sensor Simulation* wants a PhD while its *Applied AI **Researcher*** says *"We care about demonstrated research judgment, not credentials."* |
| **frontier labs / world models** | The open title is **"Member of Technical Staff"** — flat, credential-free, gated on shown work. Gating is years, not degree. Tesla AI has 362 reqs and **no Scientist title at all**. |

Seven traps, every one of them observed:

1. **A "New Grad" label can be *more* exclusionary.** Applied Intuition's *Research
   Engineer — New Grad (2027)* is *"designed for recent PhD or MS graduates"*, while their
   regular Research Engineer reqs list a degree only under **"Nice to have"**. Read both.
2. **The PhD gate has migrated to internships.** Odyssey's Research Internship demands a PhD
   while its full-time research roles carry no degree gate. An operator applying for
   full-time roles, not internships, has the *advantage* there.
3. **A slash in the title means no degree gate.** Luma's *"Research Scientist - World Model"*
   is PhD-only; *"Research Scientist **/ Engineer** – RL Infrastructure"* has no degree
   requirement at all. World Labs fuses them the same way.
4. **The same sentence can sit in "required" on one req and "a plus" on another at the same
   company.** Helm.ai puts *"Master's or Ph.D… and/or 5+ years"* under **"a plus, but not
   required"** on the MLE req and in **required** on the Research Engineer req. Apply to the
   first one.
5. **A company's own ATS contradicts itself, in both directions.** Applied Intuition has a
   req *titled* "New Grad (December 2027)" whose body says December 2026, and another titled
   "New Grad (December 2026)" whose body accepts Summer 2027. **The body governs** — but when
   the department is called "2027 New Grad" and ten reqs read "December 2026", that is worth
   one email to recruiting rather than self-rejecting.
6. **A posting can be stale rather than closed.** Nuro's only new-grad req says *"graduating
   before July 2026"* — a window that elapsed months ago on a req first published in October
   2025. It is last cycle's posting, not a rejection. Check the publish date before reading a
   date gate as a no, and diary the expected repost. The inverse also holds: NVIDIA leaves
   reqs live months past their own *"applications accepted at least until…"* date, so a live
   req is not evidence its cycle is open.
7. **A PhD marker in the title is not the gate; the body is.** NVIDIA marks some reqs
   *"- PhD New College Grad"*, which makes the unmarked ones look accessible. They are not:
   *Research Scientist, Efficient Deep Learning — New College Grad 2026* carries no marker and
   opens *"Completing or recently completed a Ph.D."* Read the body even when the title has
   already told you something.

So: search **Engineer** *and* **Member of Technical Staff** *and* **Scientist** *and*
**Resident** *and* **Research Assistant**, then discard only what a stated degree or years
floor actually excludes.

**Some postings gate on work authorization.** In robotics, world models and simulation,
defense and aerospace exposure makes **"U.S. Person"** language common — Luminary Cloud
states *"No visa sponsorship available"* outright, and Applied Intuition is a federal
contractor. When a posting mentions US Person status, ITAR, a clearance or federal work,
answer its work-authorization questions accurately from `work_authorization` in
`profile.yaml`.

Adjacent roles (hardware, FPGA, ops, analyst, product) go in the list but at the bottom,
and never crowd out a QR/QT/SWE posting.

**Roles are multi-select. The submit button is the operator's. Those are the two places
this skill hands control back, and both are deliberate.**

## Say up front if only one application is allowed

**Before presenting the multi-select, find out how many applications the firm permits**,
and put the answer in the message alongside the list. Read the posting body and the
firm's FAQ, not just the board. Three patterns, and each one changes what the operator
should pick:

| pattern | what it means |
| --- | --- |
| **one live application at a time** | picking a second role withdraws or blocks the first |
| **one application covers several roles** | the firm routes internally; a second application is redundant and reads as scattershot |
| **a re-apply cooldown** (often 6 or 12 months) | a rejection now costs the next cycle too, so a weak application is expensive |

When any of these holds, **say so in plain language before the operator chooses**, name
which roles are affected, and recommend the single strongest one — then still present the
multi-select and let them decide. Trading firms are where this bites hardest and where
the cost of getting it wrong is a full year.

## Which resume

Keep one résumé per track, each listed under `resumes:` in `config/profile.yaml`: for
example `quant` for trading firms and quant roles and `mle` for everything else, or a
single file if one serves every track. Variants differ in emphasis, never in facts: each
prints the same degree, school, dates and expected graduation.

Use **quant** for trading firms and quant roles: trader, quantitative researcher, quant
developer, quant analyst, systematic/algorithmic anything, and market makers generally.
Use **mle** for everything else — software, ML, research, infrastructure, product, data,
bio.

**Then make the form agree with the file.** Whatever expected graduation the form asks for
must equal `education.graduation_date` in `profile.yaml`, which is also the date every
résumé variant prints. A reader comparing the form with the attached résumé sees either
one story or a discrepancy, and cannot tell which one is the typo. Same discipline for
degree name, school, and dates of employment: the form restates the resume, it does not
revise it.

A firm that is genuinely both (a quant desk inside a tech company, an ML role at a
trading firm) is a judgment call — state which one was chosen and why in the handoff, in
one line, so the operator can overrule it before submitting. `--resume quant|mle`
overrides everything above.

## Which browser

**Claude in Chrome** (`mcp__claude-in-chrome__*`), not the in-app browser. Job portals
are session-bound: Workday accounts, Greenhouse autofill, a half-finished application
from last week, an existing candidate profile at a firm the operator already applied to.
The in-app browser has none of those logins and will produce a duplicate account at a
firm where duplicates are a real problem.

`kernel/browser-accounts.md` covers what these tools can and cannot do with the Google
accounts — switching between them with `/u/N`, and the sign-in that is never ours to do.

Load the tools in one call before starting:

    ToolSearch "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,
    mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__computer,
    mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__file_upload,
    mcp__claude-in-chrome__tabs_create_mcp"

`file_upload` is the one that is easy to forget and the one that matters most.

## Filling, in order

Full per-field discipline in `references/fill-rules.md`; per-portal quirks in
`references/ats.md`. Read `ats.md` when the portal is Workday — it is the one that
loses work.

1. **Read the page first** (`read_page`), do not screenshot-and-guess coordinates.
   Forms are accessibility-tree-friendly and `ref_N` targeting survives re-renders that
   coordinates do not.
2. **Resume first, everything else after.** Most portals parse the PDF and prefill half
   the form. Uploading after typing means the parse overwrites correct values with its
   own bad guesses.
3. **Then correct the parse.** Assume every prefilled field is wrong until read. Resume
   parsers routinely collapse a dual degree into one degree, drop the second major, and
   misread date ranges.
4. **Work through the profile**, field by field, from `config/profile.yaml`.
5. **Free-text questions** ("why this firm", "tell us about a project") come from
   `config/answers.md`, adapted to the specific role — never pasted verbatim across two
   applications at the same firm, because the same reader sees both.
6. **Self-identification and demographics** are answered exactly as `profile.yaml` says
   and never inferred from anything. If the profile says decline, decline. These are
   legally distinct from the rest of the form and there is no reasonable guess.
7. **Anything that binds:** agreeing to terms, certifying accuracy, consenting to a
   background check, e-signing. Leave these for the operator alongside submit, and say
   which ones are waiting. A certification checkbox is the operator asserting something
   about themselves.
8. **Scroll to the bottom, screenshot, stop.**

## The handoff

The last message is not "done". It is a short review sheet:

- Which role, which resume file, and why that one.
- Every non-obvious value entered — grad date, GPA, start date, work authorization,
  anything sourced from an answer given this session.
- Anything left blank and why.
- The checkboxes and signatures deliberately left for them.
- One line: *the submit button is yours.*

Then log it — one line appended to `state/applications.jsonl`:

    {"date":"2026-09-11","company":"acme-trading","role":"Quantitative Trader Intern",
     "url":"...","resume":"quant","status":"awaiting-submit"}

The log exists because the failure it prevents is embarrassing and invisible: applying
twice to the same role at a firm that counts applications, or re-applying to something
rejected six weeks ago. Read it before starting; if the company already appears, say so
before opening a single tab.

**Then suggest the next company.** One or two names, each with a one-line reason and what
is open there right now — not a list of twenty. Applying is a session-shaped activity and
the operator's next question is always "who else"; answering it before it is asked is the
difference between one application a week and five. Draw candidates from
`skills/role-sourcing/state/targets/` when it has unspent entries, and otherwise from the
obvious neighbours of the firm just applied to — a trading application suggests the other
market makers, an ML application suggests the labs. Check `state/applications.jsonl`
first so the suggestion is not somewhere already applied.

## When something blocks

- **Captcha, login wall, SSO, 2FA, a password field** — stop and hand over. Never type a
  credential, never solve a captcha.
- **The portal wants an account created** — hand over. Account creation is the operator's.
- **A required field the profile cannot answer** — ask, fill, and write it back to
  `profile.yaml`. Do not skip it and mention it at the end; a required field left blank
  means the form cannot be submitted and the whole session was wasted.
- **A question with a real strategic answer** (salary expectation, willingness to
  relocate, ranking desks in order of preference) — ask. These change the outcome and
  are not profile lookups.

Otherwise, keep going. The operator's standing preference is to be interrupted for
design decisions, captchas, credentials and legal agreements — and for nothing else.

## Files

    config/profile.yaml    every field a form has ever asked, answered once
    config/answers.md      free-text seeds: why-this-firm, projects, strengths
    references/fill-rules.md  per-field discipline and the traps
    references/ats.md      Greenhouse, Workday, Lever, SmartRecruiters, Ashby
    references/runs.md     batch runs: queues, the gate before every Submit, authorized submitting
    scripts/gate.py        whether the operator may apply to a company today
    scripts/next_in_queue.py   the next clear entries in a run
    scripts/log_application.py record a submission and keep its confirmation screenshot
    state/applications.jsonl  what was applied to, when, with which resume

If `config/profile.yaml` does not exist yet, copy `config/profile.example.yaml` to it and
`config/answers.example.md` to `config/answers.md`. Both stay on the operator's machine,
since `config/` is gitignored apart from the examples. Every `ASK` in them is a question
for the operator the first time a form needs the answer.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record role-apply "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
