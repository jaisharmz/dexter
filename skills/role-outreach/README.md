# role-outreach

Takes a qualified company from `role-sourcing` and gets the operator in front of someone
who can act. Drafts land in Gmail. It never sends.

    role-sourcing  ->  state/targets/{slug}.json  ->  role-outreach  ->  Gmail drafts

## Why this is separate from role-sourcing

The two halves fail differently, and a shared config would have blunted both.

**Qualification fails by being credulous.** Forty companies that all "look relevant" is
worse than eight that survived a real question, and the cost lands weeks later as wasted
effort. It is recoverable.

**Outreach fails by being careless.** One email to the wrong person and the company is
spent — a founder at a forty-person startup remembers, and there is no second first
impression. That is not recoverable, which is why every check that can stop a draft lives
here: prior contact, the per-company cap, and each template's required fields.

## The five channels

Cold email is the weakest of the five and the easiest to reach for, because it is the one
that scales. Check the operator's record before following that instinct: if processes
reach the final round and then stall on team matching or a filled cohort, the funnel loses
at the end, and only the channels that arrive with a person attached change the end.

| channel | reference |
| --- | --- |
| **VC talent partner** | `references/vc-talent.md` — highest yield, badly underused |
| **Referral** | `references/channels.md` §2 |
| **Work-first** | `references/channels.md` §3 |
| **Direct email** | `references/channels.md` §4 |
| **The application form** | `references/channels.md` §5 — always, never instead |

`vc-talent.md` first. Talent partners are the only people in this process whose job is to
place the operator, and a fund fellowship is a warm relationship with that fund's talent
team rather than a cold one.

## Layout

    SKILL.md                      the operating document
    references/channels.md        the five channels and how to choose
    references/vc-talent.md       the VC path, in depth
    references/schema.md          the outreach record
    config/templates/<area>/      direct-email templates, per area
    config/templates/vc/          talent-partner note
    config/templates/referral/    the ask that works

Shared config — `thesis.yaml` and `persona.md` — lives in `role-sourcing/config/`, and this
skill reads it from there.

