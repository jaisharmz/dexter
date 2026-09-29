# The Grubhub UI, as far as it is actually known

**This file is thin on purpose.** It was written before the first real order, so it says
what to look for rather than pretending to know where every button sits. Padding it with
plausible selectors would be worse than leaving it short — a confident wrong instruction
costs more than an absent one, and the operator would not know which they were reading.

Fill it in from real runs. `LEARNED.md` in this folder is where a finding lands first;
anything confirmed twice graduates into here. See `kernel/skill-learning.md`.

## What is known to matter

**The store page is not the menu.** Items live behind category sections that lazy-load as
you scroll, so `read_page` immediately after `navigate` sees a fraction of the menu and a
"not on the menu" conclusion drawn from it is wrong. Scroll the full page before deciding
an item does not exist.

**Required options open a modal.** Adding an item rarely adds it — it opens a dialog with
forced choices and an "Add to cart" of its own. An item that seems to have been added and
is not in the cart is almost always a modal still sitting open behind the next action.

**Fees are several separate lines, not one.** Delivery fee, service fee, and the
thresholds that move them. They are only all visible at checkout, which
is why the total is read back there and not from the cart drawer.

**Reorder tiles skip the modal.** A one-click reorder can go from tile to placed order in
fewer steps than expected. Treat any element labelled "Reorder" as live and never click it
to *inspect* a past order — open the store instead.

**Address is a per-order setting, not just an account setting.** It is changeable at
checkout, and it silently keeps whatever was used last. Read it back at the end, in full.
Not "the saved one".

## Answered by the first live session

**The app is React end to end.** `get_page_text` returns "No text content found" — the
accessibility tree is the only way in. `read_page` with `filter: interactive` gives a
workable header in about forty lines.

**Session state is in the nav.** A signed-in tree carries `Hi, <name>` and a `Sign out`
button, alongside `Past orders`, `Saved`, `Addresses` and `Payments` links. Reading the
tree is the whole login check; there is no need to open an account page to find out.

**The header holds the two things that decide an order** — the delivery address and the
Delivery/Pickup toggle — both as buttons, both changeable before searching. Set them
before looking at restaurants, since availability depends on both.

## What is not known yet

- whether the search results page exposes fees before opening the store
- how scheduled orders present, and whether the ETA line changes shape
- what Grubhub+ changes about the fee lines (the account has it, so list fees are the wrong quote)
- whether campus dining shows up as a separate storefront, and how it is paid for
- the exact shape of the logged-out state, and how early it is detectable

Each of these is a question a single real run answers. Write the answer here.
