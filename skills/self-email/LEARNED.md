# Learned — self-email

Corrections this skill has earned in use. Read before running it; these override
`SKILL.md`. Protocol: `kernel/skill-learning.md`.
- **2026-09-30** — Gmail enforces Trusted Types, so assigning innerHTML throws. Keep the email as a string: gzip and base64 the rendered HTML (65 KB becomes 7 KB, so the tool call stays small), decode it in the page with DecompressionStream('gzip'), and hand the string straight to the synthetic paste's DataTransfer (2026-09-30).
- **2026-09-30** — A compose window opened by the #inbox?compose=new URL can come up minimized when the tab is not in front, and typing then goes nowhere. Click the New Message bar to expand it, then fill To and Subject, and read both back by script before Send (2026-09-30).
- **2026-09-30** — Opening the email to confirm it arrived marks it read, and an inbox sorted with Unread first then hides it below the fold. After checking, press Mark as unread so it waits where the operator looks first (2026-09-30).
- **2026-09-30** — deslop.py reads the title from a '# ' line, so the rendered --text version always reports 'no title'. Prefix it with '# <title>' in a scratch copy before running the gate. An essay-review email uses the renderer's 'blocks' sections (label, note, text) so the operator can reply to each draft by its label.
