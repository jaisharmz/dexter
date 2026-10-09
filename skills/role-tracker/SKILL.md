---
name: role-tracker
description: Keep the operator's job-search tracker, a Google Sheet rebuilt from the application records, so that one look shows what is theirs to do and what waits on someone else. Use when the operator says "update the tracker", "rebuild the tracker", "set up a tracker", "where do my applications stand" or "what's on my plate", and after any application, reply or interview change. The records and the queue are the truth; the sheet is a view of them.
argument-hint: "[update | rebuild | summary] [what changed]"
user-invocable: true
---

# Role tracker

One look at the sheet tells the operator which items are theirs to do and which are waiting
on someone else. The sheet holds nothing of its own. `scripts/tracker.py` rebuilds it from the
records and prints what to write, and the Google Sheets connector writes it.

    role-sourcing  →  role-outreach  →  role-apply  →  records  →  role-tracker  →  the sheet

## Sources of truth

- `skills/role-apply/state/applications.jsonl`, one line per application event, which
  role-apply writes when it fills or submits a form.
- `skills/role-apply/state/responses.jsonl`, one line per reply: its `type` (`interview_invite`,
  `assessment`, `offer`, `rejection`, `recruiter_outreach`), the `action` it asks for, and
  optionally `link` (the mail thread), `next_date` and `whose_move`.
- The queue: every item tagged with the operator's own tag (`node kernel/queue.mjs list`, or
  `node kernel/pqueue.mjs list --owner <tag>` where the layered queue runs).
- `state/overrides.json`, for what the records cannot say (below).

When the sheet and a record disagree, fix the record and rebuild the row from it. Anything that
reaches only the sheet is lost at the next rebuild.

## The tabs

| tab | columns | one row is |
| --- | --- | --- |
| Next actions (first) | Order, When, Who, What to do, Company, Link, Status | one thing someone has to do, the operator's first |
| Applications | Order, Company, Tier, Role, Track, Area, Applied, Status, Whose move, Latest update, Next step / date, Link, Email | one application |
| Pipeline | Order, Company, Tier, Role, Stage, Whose move, Next date, When, What to do, Email | one live process: Offer, Interviewing or Assessment, plus referrals and warm paths |
| Outreach | Company, Person, Channel, Status, Next step, Updated | one warm path, referral or recruiter thread, kept by hand |
| Summary | counts by whose move, status, area and track, and a response rate | formulas over Applications |

## Whose move

Values: Your move, Waiting on them, Scheduled, Agent's move, On hold, Closed.

Status alone puts an assessment the operator has finished and is waiting to hear about in
the same bucket as one they have not started. Whose move separates the two, so a filter on
"Your move" is the operator's to-do list.

Applied gives Waiting on them, Held gives Your move, and Rejected or Withdrawn/Closed gives
Closed. For Offer, Interviewing and Assessment the newest reply decides: its `whose_move` if it
has one, Waiting on them when its `action` says to wait, Scheduled when it says to attend, and
Your move otherwise. That default is deliberate. A wrong "Your move" costs a glance, while a
wrong "Waiting on them" hides a task. On hold and Agent's move come only from overrides.

## Order

Column A of Next actions, Applications and Pipeline is Order: 1 to N in the order the tab is
meant to be read, so the operator can filter or sort by something else and still come back to
the order the agent chose. Order holds plain numbers, never formulas, so each one moves with
its row through any sort or filter, and sorting by Order puts the tab back.

- **Next actions**: by When, soonest first. A When that names a day sorts by it, and so does a
  leading word in `order` ("Today", "Now", "Since Sep 15" all mean today). "Before Mon Oct 5"
  means the day before, "This week" its Sunday, "Next week" its Monday and "Within 2 weeks"
  counts from today. A clock time goes ahead of the rest of its day. Undated rows ("Decide",
  "Soon", "Waiting") come after, You before Them before Agent, each run in the queue's own order
  of the item the row cites as "queue #N". Done rows go last.
- **Applications**: Your move first, soonest next date first; then Scheduled, by date; Agent's
  move; Waiting on them, most recent update first; On hold; Closed last. Ties go to status in
  its chip order, then the most recent update.
- **Pipeline**: Offer, Interviewing, Assessment, then the warm paths (Referral and Warm path
  together), each by next date, then by whose move in the Applications order.

A row's most recent update is the newest day among its records, its replies and the days its
Latest update names, leaving out days still to come. The group orders sit under `order` in
`references/defaults.json`. The script owns Order on Applications and Pipeline. Next actions is
kept by hand, so save the tab to a file and run `rows --tab "Next actions" --current <file>`
whenever its rows change.

## How a row is derived

The rules and vocabularies live in `references/defaults.json`. Edit them there, or replace a
top-level key privately under `layout` in `state/overrides.json`.

- Two records are one application when the company matches (ignoring case, punctuation and a
  trailing word such as Inc, Labs or Trading) and the role title or the posting URL matches, so
  a form refilled and logged twice stays one row. The role comes from the first record.
- Status comes from the newest record through `records`, except that a submitted application
  never goes back to Held. Then the newest reply that sets a status wins.
- Each reply joins the application at that company whose role shares the most words with it,
  among those logged by the reply's date, and one that names no role joins all of them. Replies
  that join none become one row per company, when one of them sets a status.
- Track comes from role keywords (Fellowship, then Full-time, then Internship) and defaults to
  Full-time. Area comes from overrides, then the record's own `area`, then keywords in the
  company name, then keywords in the role, and defaults to `other`. The name goes first because
  a word like Robotics or Therapeutics in it says what the employer does.
- The company shows as `names` in the overrides give it, else as a record writes it when that
  looks like a name, else as the slug title-cased.
- Tier (S+, S, A, B, C, D, F) says how much the operator wants the seat, judged by
  `references/tiers.md`: three tests (the work, the people, the path) scored 0 to 2 and summed,
  with S+ only from the operator's own list. It comes from `state/tiers.json` (a role entry, then
  the company), then the newest record's `tier`, and stays blank otherwise. Order does not use it;
  sorting the tab by Tier shows where prep and warm paths should go.

`rows --explain` prints every row with its Order, next date and update day, and where its area and
tier came from, which shows what to override.

## One palette

Every colored value maps to a named color in `palette`, and that color means the same thing
in every tab. Colors are conditional formats, one rule per value per column. Each rule's ranges
sit on one tab, because Sheets keeps conditional formats per tab and rejects a rule whose ranges
span two. The categorical columns (Track, Area, Status, Whose move, Stage, and Who and Status on
Next actions) get dropdowns from the same vocabularies, so the Summary formulas always match.

## Commands

    python3 skills/role-tracker/scripts/tracker.py rows [--tab Applications|Pipeline] [--requests] [--explain]
    python3 skills/role-tracker/scripts/tracker.py rows --tab "Next actions" --current <file> [--requests] [--explain]
    python3 skills/role-tracker/scripts/tracker.py summary [--json | --values | --stamp]
    python3 skills/role-tracker/scripts/tracker.py layout (--current <file> | --fresh) [--tab <name>]

The script never touches the network. To build a tracker from nothing, create an empty
spreadsheet, put its id and title in `state/sheet.json`, then pass each output to the connector:

1. `layout --fresh` to `update_spreadsheet`. It renames the first tab, adds the other four,
   writes the header rows and prints the new tab ids, which go under `tabs` in `state/sheet.json`.
2. `rows --requests` to `update_spreadsheet`: dates go in as dates, links as HYPERLINK
   formulas, and the rows below the data are cleared.
3. `summary --values` to `update_values` at `Summary!A1`. Fill Next actions from the queue, then
   put it in order with `rows --tab "Next actions" --current <file>`.

`--current` for Next actions takes the tab saved from `get_values`, or from `get_spreadsheet`
with grid data, which keeps the Link formulas.

To re-apply the layout, save the `get_spreadsheet` response for `sheets.properties`,
`sheets.conditionalFormats` and `sheets.bandedRanges` to a file, or write that shape by hand
with a rule count in place of each tab's rule list, and pass it to `--current`, one `--tab` at a
time. The layout owns the five tabs' formatting and deletes every rule and banding on them,
hand-made ones included. A wrong count fails safe: too high fails the batch with nothing
changed, and too low leaves old rules below the new ones, which win. `--fresh` is one-shot.

## Keeping it current

After any application, reply or change in a live process, in the same turn:

1. Write the record first: the application through role-apply, the reply in `responses.jsonl`.
2. Rewrite that company's rows on Applications, and on Pipeline when live, from `rows`. When a
   row's place changes, move it with `moveDimension` and rewrite the Order column, one small
   write, only after the moves have returned.
3. Update Next actions. Every queue item tagged for the operator belongs there, dated or not.
   Then move its rows into the order `rows --tab "Next actions" --current` prints and rewrite
   its Order column.
4. Replace `Summary!A2` with what `summary --stamp` prints: the clock's time, never a guess.
5. Run `summary` and compare it with the Summary tab. A difference means a missed row.

## Privacy

The sheet is private: never share it, change its sharing or post its link. Its id and tab ids
live in `state/sheet.json`, and everything about real people (names, threads, notes) in
`state/overrides.json` and `state/tiers.json`. `state/` is gitignored, so neither reaches a commit or a queue title.

## state/overrides.json

Every key is optional. Entries match by company and a substring of the role, and one that
matches nothing prints a warning. The names here are invented.

    {"since": "2026-08-01", "exclude": ["example-scholarship"],
     "aliases": {"Acme Trading Group": "acme-trading"}, "names": {"examplerobotics": "Example Robotics"},
     "areas": {"acme-trading": "quant"},
     "rows": [{"company": "Example Robotics", "role_has": "Perception", "status": "Interviewing",
               "whose_move": "Scheduled", "next_date": "2026-10-06", "email": "<thread link>"}],
     "add": [{"company": "Acme Trading", "role": "Quant Researcher", "status": "Held", "pipeline": "Referral"}],
     "pipeline_add": [{"company": "Example Bio", "role": "No application", "pipeline": "Warm path", "whose_move": "Your move"}]}

Replies before `since` are ignored. `aliases` joins a name in the replies to the one in the
applications. A `pipeline` stage puts a row on Pipeline, where `when` and `todo` fill When and
What to do.

## How it chains

`role-sourcing` decides where to apply and adds no rows. `role-outreach` opens warm paths, kept
on Outreach, and its referrals reach Pipeline through `add`. `role-apply` writes the records the
Applications tab is built from, and its `gate.py` reads the same records to block a company with
a live process, so the tracker and the gate agree on what is live.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record role-tracker "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
