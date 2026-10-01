---
name: self-email
description: Write and send a report email from the operator to themselves, built to be skimmed on a phone - a one-minute summary, then tables ordered by what to do first. Use when the operator says "email me", "send me an email with", "from me to me", "put it in my inbox", or asks for a list, queue or next steps as an email at the end of a run. Sends only to the operator's own address and only when they asked for that email.
argument-hint: "[what the email reports, e.g. 'queue from tonight's applications']"
user-invocable: true
---

# Self-email

A report the operator reads in their own inbox, usually on a phone, usually first thing
in the morning. It has one job: tell them in a minute what happened and what is theirs
to do, then give the detail in tables they can act from.

    work finished  →  spec.json  →  scripts/render.py  →  Gmail compose (paste)  →  send to self

## The two rules that outrank everything

**1. Only to the operator, and only when they asked.** The recipient is the operator's
own address and nobody else: no CC, no BCC, no reply on an existing thread. Nothing
leaves the machine without approval of that specific act, and the operator asking for
this email in the conversation is that approval, for this email only. A report they did
not ask for goes to chat instead.

The address is the operator's own, sent from the same account it is addressed to. Check
which Gmail account the browser is signed into before composing.

**2. The first screen is the whole email.** Most mornings the operator reads the subject
and the summary and stops. Both have to carry the result on their own.

## What goes in it

Follow `kernel/guidelines/ordering.md` and `presentation.md`: every prefix of the email
is the best email of that length.

- **Subject.** What it is and the count that matters, with the date when it recurs:
  "11 applications waiting for you, Sep 30". No em dashes, no emoji, no "Update:".
- **In one minute.** Two to four sentences. Lead with the number and the single thing
  to do first. Sentences, not bullets, in the operator's prose voice
  (`kernel/guidelines/deslopification.md`, and run `skills/papers/scripts/deslop.py` on
  the text version).
- **Tables.** One per list, each with a one-line intro saying what the rows are and how
  they are ordered. Rows are in the order the operator should act on them, never
  alphabetical. Columns are the ones a decision needs: usually name (linked), what it
  is, and one categorical column. Four or five columns at most, so it reads at phone
  width.
- **Categories, not sentences, in the reason column.** A fixed short vocabulary that
  sorts and scans ("Company-specific essay", "Legal consent", "Account required"),
  rendered as chips. The detail behind a category goes in a paragraph under the table
  or in the linked file, never in the cell.
- **Footer.** One line saying where the full record lives (the log file, the Doc, the
  folder).

Design comes from the artifact guidance, adapted to email: summary before detail, one
accent colour used only for headings and links, a blue-leaning neutral palette, chips
for state, tabular figures, no cards, no emoji, nothing centred. Gmail strips `<style>`
blocks from pasted HTML, so every rule is inline. `scripts/render.py` does all of this
from a JSON spec; its docstring shows the shape.

## Sending it

**With the Gmail connector** (Google's own, in the session's tool list as `send_message`,
`search_threads` and so on), send it directly. First confirm the connector is signed into
the operator's account: `search_threads` for `in:sent newer_than:30d` and read the sender.
Then `send_message` with `to` set to the operator's own address and nothing else,
`subject`, `htmlBody` set to the rendered HTML and `body` set to the `--text` version.
Confirm with `search_threads` that it landed in the inbox, unread. That is the whole send:
no compose window, no paste.

**Without the connector,** through Claude in Chrome, in the operator's signed-in Gmail.

1. Write the spec to `temp/emails/<YYYY-MM-DD>-<slug>.json`, render it to `.html`
   beside it, and render `--text` for the deslop gate.
2. Open `https://mail.google.com/mail/u/<n>/#inbox?compose=new` (or click Compose).
3. **To:** click the field and type the address followed by a comma. The comma turns it
   into a chip exactly as typed; Tab or Return can accept an autocomplete suggestion
   for a different contact.
4. **Subject:** focus it by JS, `document.querySelector('input[name=subjectbox]')`,
   then type. Once a chip lands the To row grows, so a coordinate click meant for the
   subject types into To instead.
5. **Body:** focus `div[aria-label="Message Body"]` and dispatch a synthetic paste: a
   `ClipboardEvent('paste')` whose `DataTransfer` carries the HTML as `text/html` and
   the text version as `text/plain`. Gmail keeps inline styles, tables and links.
6. Screenshot the compose window and check the table rendered. Then press Send.
7. Confirm it arrived: search `in:inbox subject:"<subject>"` and open it once.

## What this skill does not do

- It does not email anyone else, reply on a thread, or schedule a send.
- It does not decide what the report says. The run that did the work decides that.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record self-email "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
