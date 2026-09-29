# The target record

One file per company: `state/targets/{slug}.json`. This is the handoff to `role-outreach`,
so every judgment carries the reason that produced it.

The reasons are not decoration. The operator reads them before approving anything sent
under their own name, and a judgment whose derivation cannot be read is one they cannot
check. They are also what stops a company being rediscovered next month and reconsidered
from scratch.

```json
{
  "company": "Example Labs",
  "domain": "example.com",
  "area": "strongest-field",
  "headcount_band": "seed_to_a",
  "headcount_evidence": "https://... ('a team of 11')",
  "funded_by": ["..."],

  "hiring": {
    "status": "real",
    "reason": "Pretraining role names the company's own model and the team. ATS job id 4471 sits beside 4468 and 4473, both created this month.",
    "url": "https://job-boards.greenhouse.io/...",
    "title": "Member of Technical Staff, Pretraining",
    "team": "pretraining",
    "posted_at": "2026-08-04"
  },

  "ten_year": {
    "verdict": "strong",
    "owns_a_model": true,
    "reason": "Trains its model in house. The hard problems stay here rather than moving upstream to whoever built the model."
  },

  "leverage": {
    "verdict": "high",
    "reason": "The open-source training library the operator's project is built on has a reproduction recipe for this company's model specifically."
  },

  "thesis": {
    "artifact": "main_project",
    "their_hardest_problem": "Scaling pretraining of their own model past the point where sampling dominates cost.",
    "claim": "I built an evaluation tool on top of an open-source training library that has a reproduction recipe for your model",
    "bridge": "Your model is one of the recipes that library ships, so my tool already runs on your architecture's training stack.",
    "url": "https://github.com/...",
    "url_label": "GitHub",
    "confidence": "high"
  },

  "outbound_overlap": {
    "sent_to_domain": false,
    "people_contacted": 0,
    "note": "Nothing in the Sent folder to this domain. Cleanly approachable."
  },

  "budget_exhausted": false,
  "searches_used": 9,
  "reason": null
}
```

## What downstream reads

| field | used by | for |
| --- | --- | --- |
| `headcount_band` | role-outreach | the per-company cap (1 under fifty) and who to write to |
| `funded_by` | role-outreach | whether the VC talent channel is open |
| `hiring.status` | role-outreach | `pre-posting` changes the message, not the decision |
| `company`, `hiring.title` / `.url`, `thesis.claim` / `.bridge` / `.url` / `.url_label` | role-outreach | the email templates' placeholders. A template does not fit a target missing a field it requires |
| `outbound_overlap` | role-outreach | a company with people already contacted needs care |
| `ten_year.verdict` | ranking | this is the sort key, not `leverage` |

## The values that matter

`hiring.status` — `real`, `pre-posting`, `unsure`, or `no`. **`pre-posting` is
first-class**, not degraded: no listing exists yet, and the note goes to whoever would own
the role. Its `reason` must carry the signal that justified it — a new repo, a sharp change
in commit volume, a round closed, a paper with a new first author.

`ten_year.verdict` — `strong`, `fine`, or `weak`. **This is the ranking key.** The operator
is pivoting deliberately, so a `weak` ten-year company does not earn a place on the list by
scoring `high` on leverage. `owns_a_model` carries most of the weight.

`thesis.confidence` — `high`, `medium`, or `none`. **`none` is common and correct.** With
it, nothing routes to the email channel; the company may still be worth an application or a
warm intro, and the record says why.

`their_hardest_problem` — **required even when `confidence` is `none`**, because it is what
proves the judgment was made rather than skipped. If you cannot fill it in, you have not
read enough about the company to decide anything else either.

`outbound_overlap` — check before writing the record, by searching the operator's Sent
folder for the domain. A company where an earlier campaign from the same mailbox has
already emailed a dozen people is not disqualified, but outreach needs to know before it
picks a channel and a person.

## Empty results

A company that does not qualify gets a file, not a silence:

```json
{
  "company": "...", "domain": "...", "area": "...",
  "hiring": {"status": "no", "reason": "..."},
  "thesis": {"confidence": "none", "their_hardest_problem": "..."},
  "reason": "Careers page lists 3 roles, all sales. Greenhouse payload checked in raw HTML, no engineering reqs. No ML team named anywhere on the site."
}
```

`reason` has to name what was looked at. "Nothing found" is not a reason and hides the
difference between a company that is not hiring and a page that did not render.
