---
name: role-campaign
description: Reach many named people at one company at once about a full-time role - researchers on the teams the operator fits, managers who hire, and recruiters - plus everyone the operator wrote to there before, re-asked in their own thread. For startups it also maps the investors and turns a fund tie into an introduction. Ends with Gmail drafts that carry their files and have passed every gate, ordered best first, and a send block on the calendar. Use when the operator says "mass email <company>", "reach out to everyone at X", "get me on the radar of <company>'s research teams", "do the same for <company>", or runs /role-campaign. It never sends.
argument-hint: <company> [--slices robotics,llm,genai,hiring] [--count 100] [--startups a,b,c]
user-invocable: true
---

# Role campaign

One company, many people, one evening of work for the operator: the agent finds the people and
writes the notes, the operator presses Send in a block the agent put on the calendar.

    gates → prior contacts → warm paths → research fan-out → assemble → drafts with files
          → mail gate + reach gate → fresh reader → order → send block + review page

`role-outreach` handles one person or one company carefully, and its rules still hold here except
where this file says otherwise. This skill is the batch: dozens of notes to one company, or a short
list of startups, in one run. It never sends.

## Why it exists

At a large company the application form is read by a filter, and the teams the operator most wants
to join hire through people who already know a name. A note to the researcher whose work the
operator can speak to, the manager who has the headcount, and the recruiter who matches new grads
to teams, all in the same week, puts a name in front of three kinds of people who talk to each
other. This skill makes that cheap enough to do for every company on the list.

## The order of a run

### 1. Gates, before any research

- **Live process blocks the company.** `skills/role-apply/scripts/gate.py "<company>"`. A live
  interview, assessment or recruiter thread means draft nothing there (`no-referral-asks-mid-pipeline`).
  A rejection does not block outreach; an application in flight does not either.
- **A warm path in progress blocks cold mail.** A gate result of `blocked` with a warm-path hold
  (a fund partner introducing the operator) means the company waits for that path.
- **Prior contact, by domain and by name.** Search the sending mailbox's Sent folder for
  `to:<domain>` and `cc:<domain>`, then each person by name before drafting. Run
  `python3 -m scripts.collision` from `skills/role-outreach` on every address; it fails closed.

### 2. Prior contacts are re-asked, not dropped

`role-outreach` says never write twice to someone a campaign already wrote to. The operator lifted
that here on purpose: people he wrote to before (for a club, for research, for an internship) get
a note **in their old thread** with the new ask. Reply with `create_draft` and `replyToMessageId`
set to the thread's last message, so the reader sees the history. Rules:

- Say plainly that the earlier note was about something else, in one clause, and that this one is
  for himself: "I wrote to you in June about a research project with my club. I am writing for
  myself this time."
- Someone who answered gets a note that shows it was read ("Thank you again for explaining why the
  club setup would not work for your group"). Never repeat an ask they already declined.
- Check they still work there first. A June address at a university or a personal domain is fine
  to reply to; a person who left gets no note.
- A referral thread that went quiet gets the operator's short bump, not a new pitch.

### 3. Warm paths go to the operator, not into drafts

Friends inside (a roommate a team approached, a friend who referred him), fund ties (the asks
queue in `role-outreach`), and the operator's own professors. List each as one line for the
operator to act on: who, which team, one sentence. The agent does not write to a friend.

### 4. Research fan-out

One background subagent per slice, each given `references/research-brief.md`, a target count, the
exclusion list from steps 1 and 2, and its own output path. Slices:

| company size | slices |
| --- | --- |
| 10,000+ | by research area (for a large AI hardware company: robotics and world models; language models, post-training and safety; generative models and science; the people who hire plus alumni), 25 to 30 each |
| 1,000 to 10,000 | one or two slices, 20 to 25 each |
| startups | 10 to 12 companies per subagent, at most 2 people per company and 1 under 50 people, plus the investors (step 8) |

The brief asks for three audiences: **researchers** (most of the list; the person who would review
the operator's code), **managers** who lead a team and hire, and **recruiters** (university,
new-grad and technical recruiters for the teams; never careers@). Every fact the note states is
verified from a primary source, every paper opened on arXiv with the author position recorded, and
every address either printed somewhere or built from a pattern with two printed examples
(`email_confidence`). At a large company the 2-per-company cap from `role-outreach` does not apply,
but no more than 3 people from one small team.

### 5. Assemble

Each campaign folder (`temp/outreach/<campaign>/`, never committed) holds `operator.md` (who the operator
is, for the research brief), `profile.json` (name, graduation, approved bullets with short keys, the order
of bullets per lead, attachments and signature links) and `attach/` (the files the drafts carry). Copy
the last campaign's three as the start of a new one. `scripts/assemble.py <campaign_dir> <out_dir>
<records.json>...` turns each record into `draft.txt`, `draft.html`
(the operator's layout: `<div>` paragraphs with `<div><br></div>` between, `- item` bullets, bold
ask and bold closing question), `email.md`, `create.json` and the reach card. The bullets are the
operator's approved wording, ordered by the record's `lead` and `second`. Templates:

- **Researcher:** bold "Would it be possible to join your team full time after I graduate in
  <month year>?", then "I have been reading your papers on ___" (first or last author; "your paper"
  when they led one of the papers named) or "about your team's work on ___" (middle author or
  manager), the bullets, "join your team full time to work on ___", the attachment line and "Are
  you free for a 15 minute chat to discuss joining your team?" The PhD-style "I really believe that
  ___" line is off (`belief_line: false` in profile.json): fresh readers failed it on nearly every
  industry note.
- **Manager:** the same, closing on roles on their team.
- **Recruiter:** bold "be considered for full-time roles at <company>", "I saw that you recruit for
  ___", "be matched with teams working on ___", closing on roles that might be a fit.
- **Prior contact:** step 2, written by hand per thread, then gated like the rest.

Subjects: "Full-time roles, <team> at <company> | <Name>" and, for recruiters, "New grad roles at
<company>, <month year> | <Name>".

### 6. Drafts that carry their files

`create_draft` takes an attachment as a file reference instead of base64 (not on a reply, where the
app refuses file references, so a follow-up that carries files goes as a new thread):
`{"content": "sha256:<64 hex>:<absolute path>", "filename": "<name>.pdf", "mimeType": "application/pdf"}`.
The file must sit inside the workspace (copy it into `temp/outreach/<campaign>/attach/`). This
replaced uploading each file in Gmail's compose window, which took about two minutes a draft. Then:

1. `get_draft` RAW. The result is too large to show and is saved to a file; decode it, check every
   attachment's SHA-256 against the source, and save the raw beside the card as `draft.raw`.
2. `node kernel/mailgate/gate.mjs check --raw draft.raw`.
3. A fresh reader (a subagent that did not write the notes) reviews each batch of about 20 against
   the reach gate's six questions and writes `review` into each card. A `fix` is fixed and read again.
4. `node kernel/reachgate/gate.mjs check reach.json --raw draft.raw`.

Links in connector drafts carry google.com/url redirects; they land on the right page and are not
a reason to hold a send.

### 7. Order, calendar, review page

- Order best first so that stopping at any point leaves the best set (the `ordering` lens):
  prior contacts who replied, warm ties, then by team strength, fit and seniority.
- Put one `[SUGGESTED]` send block per batch on the agent's Suggested calendar through
  `calendar-holds`, in the operator's next open pocket, before any week when cold mail lands badly
  (a holiday week). The description names the Drafts search, the count and the review page.
- Publish a review page: the order, each person's one-line why, the address confidence, and every
  warm path the operator acts on himself.

### 8. Startups: people, then investors

- People as in step 4, capped per company.
- **Investors.** From the company's announcements, Crunchbase public pages, and a paid investor
  database (through the operator's own sign-in when allowed): lead investors by round and named board
  partners. A fund the operator has a real tie to goes on the asks queue for the operator to
  message. A fund with no tie gets the operator's own VC intro template
  (`role-outreach/config/templates/vc-intro/`): one specific introduction to one portfolio
  company, never a job ask. One channel at a time per company: a VC introduction and a cold note to
  the founder do not go out the same week.

## What it does not do

- It does not send, and it does not type in any mail compose window or chat app.
- It does not fill application forms; `role-apply` does, and the form goes in the same day as the
  note when a matching role is open.
- It does not message friends or fund contacts the operator knows personally; those are his.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and treat it as
overriding anything above.** When a run teaches something durable, record it and say so in one
line:

    bash kernel/skill-learn.sh record role-campaign "<what to do differently>"
