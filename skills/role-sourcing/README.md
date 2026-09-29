# role-sourcing

Finds and qualifies companies worth applying to. It produces a ranked target list and
stops — reaching out is `role-outreach`, its sibling skill.

The pair is modelled on `outbound-sourcing`, pointed the other way: that skill emails
companies on behalf of an organisation, these two get one person a job.

    role-sourcing  ->  state/targets/{slug}.json  ->  role-outreach  ->  Gmail drafts

The split is by failure mode. Qualification fails by being credulous, and the cost lands
weeks later as wasted effort. Outreach fails by being careless, and the cost is a company
spent permanently. Neither should inherit the other's tolerances.

Same shape, deliberately: agentic discovery, an evidence contract, checks that fail
closed, the operator's review before anything is drafted, and drafts that land in Gmail
without ever being sent.

## Why a separate skill rather than a campaign

Three things differ enough that sharing a config would have made both worse.

**The evidence contract is bigger.** Outbound proves one claim: this person works here.
A job application proves three: the role is real, this person owns it, and the applicant
fits it. The third has no analogue in outbound and is the one that decides replies.

**The cap is much lower.** Fifteen people at one company is a reasonable outbound campaign.
Two is the ceiling for a job ask, and one at anything under fifty people.

**There is a new way to cause harm.** These skills can share a sender with an outbound
campaign. Writing to someone that campaign already cold-emailed is the specific failure the
pair exists to prevent, and it needs a check that outranks every other rule: before anyone
is written to, `role-outreach` searches the sending mailbox's Sent folder for the domain
and the person's name. Qualification never resolves an address, so the check lives with
the writing.

## What it reuses

Nothing from another skill, and no database. Prior contact is checked by hand: before
researching a company, search the sending mailbox's Sent folder for its domain, and record
on the target what turns up. `role-outreach` repeats the check per person, by domain and
by name, before anyone is written to.

## Layout

    SKILL.md                      the operating document
    references/judgment.md        the four judgments no script can make, read first
    references/schema.md          the record the agentic half writes
    references/linkedin-read.md   the LinkedIn people read, and the slug traps
    scripts/workday_feed.py       a Workday careers board, read through its JSON API
    config/thesis.yaml            areas scored on leverage and ten-year value
    config/persona.md             artifact inventory the fit judgment draws from
    config/*.example.*            what to copy those two from on a first run

Most of this skill is prose rather than code, and that is the design. Four judgments decide
whether a company is worth pursuing -- is the opening real, is a decade here well spent,
does the existing work open the door, and what would you lead with -- and none has a
deterministic version.

## Check it works

    python3 -c "import yaml,pathlib; print(len(yaml.safe_load(pathlib.Path('config/thesis.yaml').read_text())['areas']), 'areas')"

The prior-contact check lives in `role-outreach`, which is where addresses are resolved and
mail is written.
