# The mail gate

What a draft says it carries, checked against what it carries, before it reaches anyone. The
leak gate in `kernel/public/sync.sh` keeps a private line out of dexter. This one keeps a false
line out of an inbox.

It exists because several notes went out saying "We have attached some materials on what we
have worked on" with two résumés attached and nothing else, and nobody noticed until after they
were sent.

```
node kernel/mailgate/gate.mjs check --json <tool-input.json>   a create_draft, update_draft or send input
node kernel/mailgate/gate.mjs check --raw <draft.raw>          a draft read back RAW (base64url or .eml)
node kernel/mailgate/gate.mjs check --raw <draft.raw> --sending   judge it as a send
node --test kernel/mailgate/gate.test.mjs
```

## What it checks

It reads only the sender's own words. The quoted thread, and the draft quoted in a review copy,
are left out.

| Check | Outcome |
| --- | --- |
| The text names attached materials (papers, a preprint, work, samples, slides) and every file is a résumé | fail |
| The text needs more files than are attached ("our resumes and some of our work" needs three) | fail |
| The text claims an attachment and nothing is attached | wait on a draft call, fail on a RAW read-back and on a send |
| An inline image rode in from the quoted thread, such as a signature logo | fail |
| A placeholder is left (`__`, `[CONFIRM]`, `TODO`, `TBD`, `{{ }}`) | fail |
| The text says someone is cc'd and the cc line is empty | fail |
| A weekday does not match its date ("Thursday, October 14" in 2026) | fail |
| Files are attached and the text never says so | warn |
| The greeting names nobody on the to line | warn |
| The connector wrapped links in google.com/url redirects | warn |
| An em or en dash | warn |

## Where it runs

The audit hook runs it on every Gmail `create_draft`, `update_draft`, `send_message`, `reply`
and `forward` call that carries a body (`kernel/audit/policy.mjs`, rule `mail-gate`). A failure
denies the call with the reason, so the agent fixes the text or the attachments and calls again.
A draft call that claims files nobody has attached yet is flagged and allowed, because the files
are attached after the draft exists. A send in that state is denied. Sending a saved draft by its id
carries no text, so the gate has nothing to read there. Any agent that hands the operator a draft reads
it back RAW and runs `check --raw` on it first, and that check fails a draft whose text promises files
it does not carry: such a draft is not ready to hand over. Attach the files, or tell the operator
plainly that it waits on them.

Drafts the operator sends straight from Gmail never pass through the hook. Running the gate on a draft
before handing it over is what covers them.
