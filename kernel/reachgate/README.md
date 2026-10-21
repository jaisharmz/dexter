# The reach gate

Whether it is right to reach this person, this way, now. It runs before any email, message, form
or application goes out under the operator's name, and it sits on top of the two gates that already
existed: the mail gate (`kernel/mailgate/`), which checks that a draft's text matches what it
carries, and role-apply's gate (`skills/role-apply/scripts/gate.py`), which checks a company's
pipeline and caps. This one adds the questions neither asks: does the person's own page allow this,
has anyone written to them already, is every fact about them true, and does a reader who did not
write it say it makes sense.

It exists because the professor list held pages saying "please do not email me", the club had
already written from the operator's mailbox to people the research ranked first, and a cold note to
a company mid-interview reads as going around the recruiter.

```
node kernel/reachgate/gate.mjs check temp/outreach/<slug>/reach.json [--raw <draft.raw>] [--offline]
node kernel/reachgate/gate.mjs ledger [name]
node --test kernel/reachgate/gate.test.mjs
```

A pass is written to `var/log/reachgate.jsonl` (private, never committed), which is how the next
card at the same person or the same place finds this one.

## The card

One JSON file per act, beside the draft in `temp/outreach/<slug>/reach.json`. It names a real
person, so it stays in `temp/`.

```json
{
  "act": "email",
  "kind": "academic",
  "person": "Grace Hopper",
  "org": "Example University",
  "company": "",
  "to": "grace@example.com",
  "ask": "join her group as a PhD student starting next fall",
  "address_source": "https://example.com/hopper",
  "policy": {
    "url": "https://example.com/hopper",
    "read": "2026-10-20",
    "quote": "Prospective PhD students are welcome to email me with a CV.",
    "says": "invites",
    "alternative": ""
  },
  "asks_for": ["CV"],
  "attachments": ["Resume.pdf"],
  "claims": [{ "text": "your compiler paper", "arxiv": "2601.00001", "title": "The exact title on its arXiv page" }],
  "prior_contact": { "checked": "2026-10-20", "gmail": "no thread" },
  "related": ["Alan Turing (same department; his note is waiting too, and each note names the other)"],
  "review": { "by": "fresh subagent", "date": "2026-10-20", "verdict": "pass", "notes": "" },
  "draft": { "id": "r123", "raw": "draft.raw" }
}
```

- `act` is `email`, `message`, `form` or `application`. For a form, `to` is the form's URL.
- `kind` is `academic`, `industry`, `peer`, `recruiter`, `partner` or `personal`.
- `company` is set for any industry act, with the name role-apply's records use.
- `policy.says` is what the page amounts to: `invites`, `silent`, `collaborations`, `no-email`,
  `after-admission`, `form-only` or `portal-only`. The last four close email and messages. Put what
  the page says to do instead in `alternative`.
- `claims` lists every fact the note states about the person: their papers by arXiv ID with the
  title the note uses, and anything else with a source URL. `author` overrides `person` when the
  claim is about someone else's paper.
- `prior_contact.acknowledged` is where a second note to someone already written to says why it is
  right.

## What it checks

| Check | Outcome |
| --- | --- |
| The person's own page is not recorded (url, date read, quote, what it says) | fail |
| The page was read more than 30 days ago | fail |
| An email or message to someone whose page says not to write, or to write only after admission, only through a form or only through the portal | fail, naming the alternative |
| An academic page that is silent, or invites only collaborations | warn: keep it to the research |
| The address has no page it was read from | fail |
| The page asks for materials (CV, transcript, statement) the message does not carry | fail |
| A claim has no source | fail |
| An arXiv ID does not resolve, has a different title, or does not list the person as an author | fail |
| The arXiv page could not be read, or `--offline` | wait |
| The operator's mail was not searched for the person in the last 7 days | fail |
| The address is in the outbound records (role-outreach's collision check, which fails closed) | fail, unless acknowledged |
| The company is mid-process or capped (role-apply's gate), and this is not the recruiter thread | fail |
| The company was applied to or skipped before | warn |
| The same person passed the gate in the last 60 days | warn |
| Someone else at the same place passed in the last 30 days and the card does not list them in `related` | warn |
| No fresh reader returned pass, the reader was the drafter, or the review is older than 2 days | fail |
| An email card without its RAW draft | fail |
| The RAW draft goes to a different address than the card | fail |
| Anything the mail gate fails on the RAW draft | fail |
| The note never names the person | warn |

## The review: does it make sense

The gate cannot judge sense. It checks that a reader who did not write the note did, and returned
pass. Give a fresh subagent the card, the draft as read back RAW, the person's page and these
questions, and record its answer in `review`:

1. Is it right to contact this person this way now? Their page's instructions, any live process at
   their company, whether the operator already wrote to them or to a colleague, the timing (a
   deadline, an "after admission" line, a leave).
2. Is every fact true? Each paper title, what the note says each paper does, their title and
   affiliation, and every claim about the operator, checked against the sources on the card and
   the operator's own records.
3. Does the ask fit what this person can give? A professor can take a PhD student, a researcher at
   a company usually cannot, and a page that asks for a CV and a transcript gets both.
4. Does it make sense to someone reading it cold? One clear ask, a reason it is this person, nothing
   that reads as a mass email, and no sentence that would embarrass the operator if forwarded.
5. Does it read as the operator wrote it? His outreach template and voice (home/memory:
   `outreach-email-voice`, `prose-voice`) and the deslop guideline.

The answer is `pass`, or `fix` with each reason. A `fix` is fixed and reviewed again.

## Where it runs

Every skill that sends, drafts or submits for the operator runs it before handing the act over:
role-outreach, outbound-sourcing, role-apply, calendar-holds replies, and any one-off draft. It does
not send and does not submit. A pass ends with the operator's click.

The audit hook does not run it yet. Wiring it in (deny a send or a submit whose recipient has no
ledger entry from the last two days) is a change to `kernel/audit/policy.mjs`, which is the
operator's to make.
