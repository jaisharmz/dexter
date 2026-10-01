---
name: anonymize
description: Make a file, a folder or a piece of writing safe to publish by removing the personal data while keeping the same principles and way of thinking. Defines what counts as identifying, what must stay, the order of transformations to try, and the two tests that end every run. Use when the operator says "anonymize", "scrub this", "make this public", "strip the personal details", and before anything moves from a private repository, conversation or document into a public one.
argument-hint: "<path | pasted text> [--copy] [--check]"
user-invocable: true
---

# Anonymize

Keep the thinking, drop the personal data. Anonymized material keeps every principle,
judgment and habit of reasoning its owner put into it, and loses only what identifies or
exposes a person.

A run passes two tests, and both have to pass:

1. **The motivated intruder.** Someone determined, with a search engine, public records and
   everything else already public about the author, reads every line. They must not be able
   to identify, contact or locate anyone in it, or learn a private fact about anyone. The
   test comes from the UK Information Commissioner's anonymisation guidance, and it is
   stricter than "no names".
2. **The stranger who wants to think this way.** Someone who has never met the author can
   still run the process, apply the lesson, and make the next judgment call the way the
   author would. If they cannot, the run deleted the material instead of anonymizing it.

## What stays

Everything that makes the material worth publishing stays, and none of it is personal data:
the principles, the reasoning behind each decision, the heuristics, the standards for good
work, the order things are done in, the warnings and the lessons learned from mistakes. A rule
the operator stated after a bad run is still a rule: write it as one ("never submit a form
nobody has reviewed"), with the reason it exists, and leave out the date, the company and
the run that taught it unless the name is what makes the rule usable. When a preference
depends on the operator's circumstances, keep the preference and state the circumstance
as a condition ("when graduation is more than a year out, apply for internships only at the
firms worth waiting for").

## Why removing names is not enough

Combinations identify people. Each detail alone matches thousands; together they match one.
ZIP code, birth date and sex single out about 87 percent of Americans (Sweeney, 2000). A
school, a major, a graduation term and a fellowship together are a name.

A known author has no cover. If a repository is published under its author's account,
"the operator" in it is the author, and every fact about the operator is a fact about them.
In that setting the test is on facts, and replacing a name changes nothing.

Numbers and dates fingerprint. An exact count of emails sent, applications filed or dollars
paid that only one person's records could produce links back as surely as a name, and so
does the exact date of a personal event.

Disguises reverse. Initials, a hashed name, a name with two letters swapped and "a large
fund in Menlo Park" are each one search away from the original.

## What counts as identifying

| category | examples | default treatment |
|---|---|---|
| direct identifiers | names, email addresses, phone numbers, street addresses, handles, signatures, photos, résumés | a role noun ("the operator", "a recruiter"), or remove |
| account and document ids | chat and channel ids, spreadsheet and document ids, mail thread ids, order and confirmation numbers, private repository names | remove; `<sheet-id>` where the shape matters |
| locators | home-directory paths with a username, machine and host names, IP addresses, internal URLs | `~/...` or a placeholder |
| quasi-identifiers | school, major, class year, employer, team, city, a rare title or award, an advisor, a GPA, the exact date of a personal event | generalize to the level the lesson needs |
| relationships | where someone applied, interviewed, was rejected or hired; who they emailed; who referred them; who owes whom | remove |
| private facts | health, money, legal and immigration status, grades, outcomes, plans, anything said in confidence | remove |
| other people's words | quotes from their emails, messages and documents | state the point without attribution, or remove |
| fingerprint numbers | exact counts and amounts that only one person's records produce | round to a magnitude, or drop |
| secrets | keys, tokens, passwords, recovery codes, cookies | remove, and rotate any that ever left the machine |

An organization can stay named for a public fact anyone could check on its own pages: what
its posting says, which fields its form has, how its applicant system behaves. Write the
fact as a fact about the organization, never as something the author did there. Prefer the
generic form ("a trading firm's Greenhouse form") unless the name is what makes the lesson
usable, as in "NVIDIA leaves requisitions open past their own deadline".

## What to do, in order of preference

Try each in turn and stop at the first that keeps the lesson whole.

1. **Generalize.** Replace the specific with its category, at the level the lesson needs:
   "a senior graduating next spring", "a market-making firm", "early in the fall".
2. **Name roles, not people.** "The operator", "a talent partner at a fund", "the hiring
   manager". Where an example needs a name, use an obviously invented one (Example
   Robotics, Acme Trading, `you@example.com`), never a realistic stand-in for a real one.
3. **Move the value into configuration.** The method ships, and the values it needs live in
   an ignored `config/` file with a `*.example.*` template that ships beside it, holding
   placeholders such as `ASK`. The private specifics stay retrievable, just not public.
4. **Fence it,** only in a repository that builds a public copy from a private one: the
   private side keeps the passage, the build drops it, and a public insert can say the
   general version.
5. **Remove it,** when nothing general is left: a pure log entry, a contact list, a record
   of what one person did on one day. Before removing, ask what the entry taught, and keep
   that as a rule if anything.

Never use a disguise that reverses (initials, hashes, swapped letters, a description that
points at one entity). Never keep the key next to the output: the list of what replaced
what belongs in the private repository or the conversation, not beside the copy. Never
anonymize a secret; remove it and rotate it.

## The run

1. **Read all of it first,** before changing a line. Identity hides in examples, in lessons
   (`LEARNED.md` files record what one person did and said), in commit messages, in file
   names, in numbers and in the metadata of attachments.
2. **Mark every finding with its category** from the table above. Quasi-identifiers are
   judged together: three harmless details in one paragraph can be a name.
3. **Transform** each finding by the first treatment that keeps the lesson whole.
4. **Scan:** `python3 skills/anonymize/scripts/scan.py <path>...` (or `-` for stdin). It
   checks the shapes of private data (email addresses, phone numbers, IP addresses,
   long numeric ids, home directories, keys and tokens, document and mail-thread ids, data
   and key files) and every string in the denylist (`--denylist FILE`, default
   `home/public/denylist`). A clean scan is necessary and never sufficient: it cannot see a
   relationship or a quasi-identifier.
5. **Read every line twice,** once as the motivated intruder and once as the stranger who
   wants to think this way. The second reading compares against the original: every
   principle, warning and judgment in it must still be there. Fix what either reading
   finds, then scan again.
6. **Grow the denylist.** Every private string this run removed goes into the denylist, so
   a later edit that brings it back fails the scan.
7. **Report:** what changed, by category; what was removed outright; the scan result; and
   anything still uncertain. The report goes to the operator, not into the output.

## Modes

- `/anonymize <path>` works in place when the file belongs to a tree that ships, such as a
  skill or its references, because the generic text is the better text there anyway. The
  private values move to `config/` or `state/`. Anything else gets a copy.
- `--copy` leaves the original untouched and writes the anonymized version somewhere the
  operator names, or to a temporary folder. Use it for reports, essays, logs and anything
  whose private version must survive.
- `--check` only scans and reads, and changes nothing.
- Pasted text is always handled as `--copy`, and the result comes back in the reply.

## A worked example

Invented, before:

> Jordan applied to Northwind Trading's Quant Researcher internship on Sep 5 from
> jordan@example.com, after Priya Shah, a talent partner at Example Ventures, said Northwind
> hires interns in two batches. The form's school dropdown hung on "Loading" twice and
> needed a reload. Jordan has a 3.6 GPA, graduates in May 2028, and has a phone screen
> on Sep 19.

After:

> Talent partners at a fund often know when its portfolio companies hire, including firms
> that fill an intern class in batches, so ask them when, not only whether. On Greenhouse
> forms an async school dropdown can hang on "Loading": reload the page and pick the school
> before any other field.

The names and the address are gone, along with the relationship between the student and the
firm. The fund became "a fund". The batch hiring survived as a general pattern, and the form
glitch survived because Greenhouse is public software. The GPA, the graduation term and the
screen date are gone because no lesson needed them.

## In a repository that builds a public copy

If a private workspace is the source and a public repository is built from it, rewrite each
file generic in place first, so both sides share one text. Fence only what the private side
needs, keep the values in an ignored `config/` with a shipped example, add every removed
string to the build's denylist, and read the built diff line by line before anything is
pushed. If the public repository names its author, "the operator" in it is that author.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above**. It is where this skill's own corrections live.

When a run teaches something durable (the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work), record it and say so in one line:

    bash kernel/skill-learn.sh record anonymize "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
