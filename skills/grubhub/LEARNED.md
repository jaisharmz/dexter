# Learned — grubhub

Corrections this skill has earned in use. Read before running it; these override
`SKILL.md`. Protocol: `kernel/skill-learning.md`.

- **2026-09-15** — `get_page_text` returns "No text content found" on Grubhub — the whole app is React. Use `read_page` and act on `ref_N`; never reach for page text first. *(source: first live session, 2026-09-15)*
- **2026-09-15** — The cheap logged-in check is the nav tree, not an account page: a signed-in session shows a `Hi, <name>` node and a `Sign out` button, and the delivery address and Delivery/Pickup toggle sit in the header as buttons. No need to navigate anywhere to test the session. *(source: first live session, 2026-09-15)*
- **2026-09-15** — If the account has Grubhub+ (the nav carries a plus flag icon and a Grubhub+ entry), assume member pricing and check the fee lines against it rather than quoting list fees. *(source: first live session, 2026-09-15)*
- **2026-09-15** — Tip presets stop at $4.00. A $5 floor needs "Custom tip", and the field must be triple-clicked to replace rather than append. Grubhub defaults the tip to about 10% — it is never the configured value, so always set it. *(source: first real order, 2026-09-15)*
- **2026-09-15** — If no card is saved on the account, checkout shows empty Card number / Expires / CVV / Postal fields and the run ends one step earlier than planned: the operator enters the card as well as pressing Place Order. Say so at handover rather than letting them find it. *(source: first real order, 2026-09-15)*
