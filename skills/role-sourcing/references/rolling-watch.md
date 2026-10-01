# Rolling new-grad watch

**Some companies never open "the" new-grad cycle.** Each team posts its own req when it gets
headcount, at any point in the year, and the req can fill within weeks. NVIDIA is the model: its
2026 US New College Grad reqs went up one at a time from February to September. Catching these
is a polling problem, not a search problem: read their feeds every day and act on what is new.

## Which companies behave this way

The signs: many teams with independent headcount (NVIDIA, Apple, Amazon, Google, Microsoft,
Meta, Tesla); titles that carry the team and the class year ("..., New College Grad 2027");
a "new college grad" or "university" facet on a Workday board; a company that shows up in the
Simplify new-grad list week after week rather than once in the autumn. Labs and
infrastructure companies that post continuously (Anthropic, OpenAI, xAI, Scale)
belong too, because their new-grad routes surface as single reqs.

The list is `config/rolling-watch.json`, one entry per company with a one-line `why`. Add a
company when a sweep or the Simplify list shows it posting new-grad reqs more than once a year.

## How it reads them

`scripts/rolling_watch.py` reads each company from its own feed:

| source | endpoint | identifier in the config |
| --- | --- | --- |
| workday | `POST https://<tenant>.<pod>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs`, then each req's detail for the description (its `startDate` is the day the posting went live, not the job's start) | `tenant`, `pod`, `site`, optional `facets` (ids copied from the careers URL) and `search` |
| greenhouse | `https://boards-api.greenhouse.io/v1/boards/<board>/jobs?content=true` | `board` |
| lever | `https://api.lever.co/v0/postings/<account>?mode=json` | `account` |
| ashby | `https://api.ashbyhq.com/posting-api/job-board/<org>` | `org` |
| simplify | the SimplifyJobs New-Grad-Positions `listings.json`, for companies with custom career sites (Google, Meta, Apple, Microsoft, Amazon, Tesla) | `match`, a regex on `company_name` |

A req is a hit when all of these hold (defaults in the config, overridable per company):
the title says new grad, early career, entry level, 2027 or similar, or the source is already
a new-grad list; the title is in one of the operator's areas or is plain software engineering; the
location is in the US; the description has no "N+ years" floor of 2 or more; and the
description is not last cycle's req, one that names the class before `class_year` and not
`class_year` itself.

What it has read is remembered in `state/watch/rolling/seen.json` (local, not committed).
Each run prints only new hits and appends them to `state/watch/rolling/new-<date>.jsonl`, which
is committed. `--all` reprints every current hit, `--only <slug>` narrows to one company,
`--dry-run` records nothing, and `--check` reports how many postings each feed returned.

## What to do with a hit

1. **Gate it.** `python3 skills/role-apply/scripts/gate.py "<company>"`. A blocked company has a
   live process (an application in the last six months that has not ended in a rejection, or
   a recruiter, interview, assessment or offer mail) or a hold the operator set. The rule is one
   role per company, so a blocked hit goes to the operator as a line in the report, not into a
   second application.
2. **Apply to one role per company**, the best fit, through `role-apply`: the résumé variant
   for the role, every value from `config/profile.yaml`, and consent and certification boxes
   handled as `role-apply/references/runs.md` says.
3. **Hand over instead of working around** a sign-in or account creation, a captcha or a
   "verification code to confirm you're a human", an arbitration or non-compete term, or a
   required essay (draft it and put it in the report).
4. **Log it** in `role-apply/state/applications.jsonl` and add its row to the tracker
   (`role-tracker`).

## The schedule

The Claude desktop app runs this daily as the scheduled task `rolling-roles-watch` and emails
the operator only when there is a hit. Scheduled tasks run while the app is open, and a missed run
fires at the next launch. NVIDIA's 2027 New College Grad wave should open around February 2027
(`state/watch/nvidia.md`), so expect the watch to be quiet for NVIDIA until then.
