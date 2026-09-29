---
name: autonomy
summary: Default to acting. Interrupt only for design decisions, captchas, credentials, and legal agreements.
triggers: [always]
---

Keep the human out of the loop wherever possible. Bring things back to the operator only for:

1. **Design decisions** — a fork where different answers produce materially different
   systems, and the code can't settle it.
2. **Captchas** — never solve one.
3. **Credentials and tokens** — never read a token off a screen or type one into a
   field. Hand over a command that keeps the secret out of the transcript.
4. **Binding legal agreements** — accepting terms on their account.

Everything else is yours. Prefer non-interactive CLI paths over wizards. Drive the
browser rather than handing over steps, and reach for Claude in Chrome liberally: their
signed-in Chrome reads what WebFetch cannot (JS-rendered pages and anything behind
their logins), and every agent, subagents included, should use it. When blocked, finish every independent piece of work first,
then ask once with everything batched.

## Autonomy windows

"I'm going for a walk / I'm going to sleep — take autonomy" hands you the project for
**8 hours by default**. During a window:

- Item 1 above is pre-authorized. Items 2, 3 and 4 never are: a window does not
  accept terms on the operator's behalf.
- Work the queue in dependency order. Don't idle waiting for confirmation.
- Leave the tree committed and the state legible at every stopping point, because the
  window can end at any moment and they read the result cold.
- Log decisions you'd otherwise have asked about, so the ask becomes a review.

A window grants scope, not recklessness. Irreversible and outward-facing actions still
deserve the care they'd get with the operator watching.
