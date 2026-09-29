# The outreach record

One file per company: `state/outreach/{slug}.json`. It reads the target from
`role-sourcing` and records what was actually done, which channel, to whom, and why.

The "why" is the point. A company approached through the wrong channel and gone quiet is
not the same as a company that is not interested, and only the record can tell them apart
three months later.

```json
{
  "company": "Example Labs",
  "target": "state/targets/example-labs.json",

  "channel": {
    "chosen": "email",
    "reason": "No fund tie: not in a portfolio the operator has a relationship with. No network path found: nobody from the operator's lab, cohort or past teams on the team page. Work-first was the alternative and email won on timing, since the posting is live now.",
    "considered": {
      "vc": "no tie to their investors",
      "referral": "checked the lab, the cohort and past teams: nobody inside",
      "work_first": "viable, the operator's library already trains their released model, but slower than the posting allows",
      "apply": "submitting same day"
    }
  },

  "contacts": [
    {
      "name": "...",
      "first_name": "...",
      "title": "...",
      "email": "...",
      "email_basis": "observed",
      "evidence_url": "https://...",
      "evidence_quote": "... names them on the pretraining team ...",
      "why_this_person": "First author on the company's model report and the only named person on that team.",
      "collision_checked": true,
      "collision_result": "clear",
      "drafted": true
    }
  ],

  "application": {
    "submitted": false,
    "url": "https://job-boards.greenhouse.io/...",
    "submit_on": "same day as the email"
  },

  "sequence": {
    "sent_at": null,
    "escalate_after": "2026-09-05",
    "next_channel_if_quiet": "work_first"
  }
}
```

## What is checked before a draft

The agent checks each of these itself, before anything is drafted.

| field | check | rule |
| --- | --- | --- |
| `contacts[].collision_result` | collision | the sending mailbox's Sent folder, searched for the domain and the person's name. If it cannot be searched, nobody clears. Runs **before** channel selection |
| `contacts[]` length | cap | 2 per company; 1 when the target's `headcount_band` is `seed_to_a` |
| `contacts[].email_basis` | review | `inferred_from_pattern` is flagged, never silently drafted |
| `channel.chosen` | template | selects the template directory |
| the template's `requires:` | fit | every field it lists exists for this target, `thesis.claim` and `.bridge` included. One missing means that template does not fit |

## The values that matter

`channel.chosen` — `vc`, `referral`, `work_first`, `email`, or `apply_only`.
**`considered` is required**, with one line per channel that was ruled out. That block is
what stops the default drift to cold email: writing out why the warm paths failed usually
reveals that one of them was not actually checked.

`channel.fund` — only when `chosen` is `vc`. It holds the fund's `name`, the operator's
`relationship` to it and its `targets`. `relationship` is one true sentence about the tie,
taken from `state/warm-paths.md` and left empty when there is none. The `vc` template
requires it, and without one the note is a `vc-intro` (see `vc-talent.md`). `targets`
names the qualified companies in its portfolio: the targets whose `funded_by` lists this
fund.

`contacts[].first_name` — the name the greeting uses. For a referral, each contact also
carries `shared_context`, what this person actually remembers about the operator in a few
words that can lead a subject line (a lab, a course, a team), and `shared_context_line`,
the same thing said as the note's opening sentence. A shared school alone is not shared
context.

`email_basis` — `observed` or `inferred_from_pattern`. An inferred address is a worse trade
here than in a bulk campaign; the cost of a bounce at a company you want to work for is
higher than the cost of dropping the contact. Prefer `observed`, and drop rather than guess.

`sequence.escalate_after` — a real date, at least two weeks out. **One channel at a time
per company.** A talent-partner intro and a cold email landing in the same week makes the
operator look uncoordinated to two people who talk to each other. Wait for a channel to
actually fail before escalating.

`application.submit_on` — the form goes in the same day the email goes out, never before
and never long after. The email is what causes the application to be read.

## What the operator sees

Before anything is drafted, the agent lists one row per contact: company, channel, why
that channel, who, why that person, the thesis sentence, and the collision result. The
operator approves on that, not on the finished email — the email is downstream of every
judgment in the row, so the row is what is worth checking.
