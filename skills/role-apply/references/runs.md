# Runs

A run is a batch of applications made in one sitting or overnight, from queues built ahead of
time. The slow part of applying is rarely the form: it is deciding where to apply, checking
that the operator has not already applied there, and keeping count. Batching does those once,
up front, and leaves the agent only the forms.

## Submitting on the operator's behalf

By default this skill stops at Submit. An operator can authorize a run to submit for them
("apply to fifty more tonight"). Then these rules hold. Each one was learned from a run that
broke it.

1. **Gate immediately before every Submit,** not only when planning. A live process blocks the
   whole company: any application in the last six months that has not ended in a rejection, or
   any recruiter thread, interview, assessment or scheduling email. Check all three records:
   `state/applications.jsonl`, the operator's inboxes (confirmation and rejection mail), and
   their confirmation screenshots. `scripts/gate.py` reads the first and `state/responses.jsonl`;
   the inbox sweep keeps `responses.jsonl` fresh. A rejection does not block a different role
   unless the company sets a cooldown.
2. **One role per company,** the best fit, unless the operator says otherwise. Look up the
   company's cap and cooldown first: the careers FAQ, the posting text, and on Ashby the
   application-limit notice (see `ats.md`). At a company that counts applications, a third
   role is a liability.
3. **Tick consent boxes, not agreements.** Privacy and data-processing consent, accuracy
   certifications, AI-policy and confidentiality acknowledgments, export-control statements and
   optional "contact me about future roles" boxes are ticked, then the form is submitted. An
   agreement that waives a right, such as an arbitration agreement or a non-compete, goes to the
   operator, even when they accepted the same agreement on an earlier form at that company.
4. **Hand over instead of working around** a sign-in, an account creation, a captcha, a
   "verification code to confirm you're a human", or a required question the form says exists
   to stop bots (such as "what is the twelfth word of the job description"). Leave the filled tab open, tell the operator,
   and continue in a new tab. Never read such a code from the operator's inbox and type it. Also
   hand over anything only the operator can answer: a salary figure, a phonetic spelling of their
   name, a ranking of desks.
5. **Essays wait for review.** Draft each required essay and send it to the operator, by
   self-email if they are away. Nothing essay-based is submitted until they approve it. Write the
   drafts as a bank: one base answer per question type with a one-to-two-sentence company slot,
   so most of the text carries across companies.
6. **Never bend an answer to fit a form.** A required class-year select whose options stop
   before the operator's year has no truthful answer: skip the role and log why. The same goes
   for a degree, a start date or a location the form will not accept.
7. **Hard rules gate; research ranks.** A read of a company's people or its seniority language
   can run in parallel and rank follow-ups, but it never delays or blocks a submission. The gate
   and the company's cap always run first.
8. **Verify what went through.** Some portals send no confirmation email, and one portal's
   "security code" mail can look like an unfinished submission. Confirm each one from the
   confirmation page's screenshot, then log it.

## The run directory

`state/run-<date>/`, private like everything in `state/`:

| file | what it holds |
| --- | --- |
| `README.md` | the operator's instruction verbatim, where the run stands, how to resume, the run's own rules, and what was skipped and why |
| `queue_<name>.json` | one list per source: `company`, `role`, `apply_url`, `ats`, `area`, `location`, `eligibility`, `required_fields`, `policy`, `notes`, `essay_required`, `needs_account` |
| `order.json` | `{"order": [queue names, best first], "internship_queues": [...], "internship_companies": [...]}` |
| `skips.json` | `{"<normalized company>": "<why>"}`, written by `--skip` and by the gate |
| `log.jsonl` | what this run submitted, appended by `log_application.py --run` |

`order.json` is where a track rule lives. One the operator might set: full-time roles
everywhere, and internships only at the few firms worth waiting a year for. Then the internship
queues are listed under `internship_queues`, and only the firms in `internship_companies` are
taken from them.

## Building the queues

Queues come from lists, not from searching one company at a time. `role-sourcing` and its
`LEARNED.md` name the sources that work without a browser: the SimplifyJobs new-grad
`listings.json`, curated lists found through GitHub code search, VC portfolio boards (Consider
and Getro), conference sponsor lists, the rolling watch's hits, and fund student directories.
Before an entry goes into a queue, read the posting's body for a years floor and its employment
type, and the form's required fields for essays, accounts and class-year options. Those caught
at apply time cost a form each.

## The loop

    python3 skills/role-apply/scripts/next_in_queue.py <run> 5

prints the next five clear entries, one per company, each already through the gate. Apply to
each through this skill, then:

    python3 skills/role-apply/scripts/log_application.py "<Company>" "<Role>" <url> <ats> \
        <résumé variant> <confirmation screenshot> "<notes>" --run <run> --area <area>

and update the tracker (`role-tracker`). `next_in_queue.py <run> --skip "<Company>" "<why>"`
records a skip, and `--held` lists the entries waiting on an essay or an account.

## Resuming

Runs outlive their sessions: the browser quits, the context fills, the machine sleeps. The run
directory is enough for a fresh session to continue. Write "where it stands" into its
`README.md` at each milestone, and the next session reads it, runs `next_in_queue.py`, and
carries on.

## Ending

Report to the operator, usually as three short self-emails: what went in, what waits on them
(essays, codes, agreements, accounts), and the next step in each live process. Update the
tracker, and write the final count into the run's `README.md`.
