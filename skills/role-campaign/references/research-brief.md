# Brief: find people at one company for the operator's full-time outreach

Copy this file into the campaign folder as BRIEF.md, put the operator's section (who they are, what
they have done, each item's short key) in the campaign's `operator.md`, and give each research subagent
its slice, a target count, the exclusion list and an output path.

You are one of several researchers working in parallel. Each owns one company, or one slice of a large
company. Your job is to find named people the operator could email this week about joining their team full time
after they graduate, verify everything an email would say about them, and return structured
JSON. You do not write, draft or send email, and you do not open Gmail or any chat app.

## The goal

The operator is looking for a full-time position and wants to be known to the strongest research teams at
the company. Three audiences, in this mix:

- **researchers** (most of the list): research scientists and engineers whose recent papers they could name,
  on teams doing work close to theirs. The person who would review their code beats the person who signs the offer.
- **managers**: people who lead a team or a research group (manager, senior manager, director, research
  lead) and hire for it. Not the CEO or a famous VP who will never read cold mail.
- **recruiters**: university recruiters, new-grad recruiters, and technical recruiters for research, AI or
  robotics teams. Never careers@ or jobs@.

## Who the operator is

Read the campaign's `operator.md`: their school and when they finish, their interests, and each piece of
demonstrated work with its short key (the keys the `lead`, `second` and `attach` fields use). Claim only
what is there.

## Hard exclusions

- Anyone in the "already contacted" list in your task. Return them only in `prior_contacts_seen` if you
  happen to find their current role (one line each), never in the main list.
- Anyone whose own page says not to email them about jobs or students (record it and skip).
- Interns, PhD students who are only visiting, people who have left the company (check the date of their
  latest affiliation; a 2023 paper with the company is not proof they are still there).
- More than 3 people on one small team. Spread across teams.

## What to verify for each person (from primary sources, today)

1. **Current role at the company**: title and team, with the URL you read it from (their homepage, the
   company's research or team page, a 2026 paper affiliation, a talk page). LinkedIn public pages often
   refuse fetchers; a search-result snippet is acceptable as a second source only.
2. **Email address** and its source. Best: printed on their homepage, in a paper PDF's author block, or in
   a GitHub profile. Set `email_confidence` to `printed` (you saw the address printed, give the URL) or
   `convention` (built from the company's pattern; then give two other printed addresses at that company
   that show the pattern, and the pattern itself). Never guess silently. A company can use more than one
   pattern (one large chipmaker's researchers use both first-initial+last and first+last-initial), so a
   researcher there needs a printed address.
3. **Their own page's policy**: an exact quote of anything about contacting them, hiring, interns or
   students, and classify `policy_says`: `invites`, `silent`, `no-email`, `form-only`. Most industry
   pages are `silent`; that is fine.
4. **Two recent papers or projects** (prefer the last 18 months; say today's date in your notes) the email could
   name. For a paper: arXiv ID, the exact title on the arXiv abs page, the author list, and the person's
   position (first, last, middle). Fetch https://arxiv.org/abs/<id> for each. No paper you have not opened.
   If the person is a middle author, say so; the email will then name the team's work, not "your paper".
   For managers and recruiters, give the team's product or research area with a source instead.
5. **Fit**: one line on which of their items connects and how.

## What to write for each person (plain words, American spelling, Oxford comma, no em dashes, no hype
words such as "exciting" or "cutting-edge", no "not X but Y")

- `team`: the team name as the company writes it (e.g. "GEAR lab", "Nemotron post-training").
- `reading_topics`: completes "I have been reading your papers on ___" (for a researcher who is first or
  last author), or "I have been reading about your team's work on ___" (manager, or middle author). Give
  `reading_frame`: `papers` or `team`.
- `work_with_on`: completes "I was wondering if it would be possible to join your team full time to work
  on ___." A concrete area tied to their work and his, in a few words.
- `belief` (researchers only, optional): completes "I really believe that ___ is where the next major
  advancements in ___ will be." A general area belief, never a claim about one paper.
- `lead` and `second`: which of their items go first (mi, dia, pan, robot, bio, ibm, stoica).
- `attach`: `mi` (MI preprint) and/or `robot` (RL course report). The resume always goes.
- `be_ready`: one or two lines they should know before a call.
- `scores`: `fit` 1-5, `team` 1-5 (how strong or "elite" the team is), `reply_odds` 1-5, `seniority`
  1-5 (5 = can hire him).

## Output

Write a JSON array to the path given in your task, one object per person, with keys:
`name, first_name, slug, audience (researcher|manager|recruiter), company, team, title, location,
role_source_url, email, email_confidence, email_source, email_pattern_evidence, policy_url, policy_quote,
policy_says, papers:[{arxiv,title,authors,position,date,short_name,what_it_does}], reading_topics,
reading_frame, work_with_on, belief, lead, second, attach:[], be_ready, fit_note, scores:{fit,team,
reply_odds,seniority}, warm_tie`.
`warm_tie` is any real tie to the operator you can see (an alum of their school, a lab they worked in, a course the person taught) or "".

Also write `prior_contacts_seen` (array of one-line strings) into a second file beside it if you saw any.

Quality over count, but the count matters: aim for the number in your task. Every email and paper must be
real and checked. Use WebSearch and WebFetch, and the alphaXiv tools (load them with ToolSearch, query
"alphaxiv researcher papers": find_researchers, resolve_researchers, get_researcher_papers,
discover_papers). Do not open Chrome. If a page refuses your fetcher (403), try another source and record
what you could not read.

When done, reply with a short summary only: count by audience, the five strongest names with one line
each, and anything uncertain. The JSON file is the deliverable.
