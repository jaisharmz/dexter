---
name: grubhub
description: Order food on Grubhub by answering a few multiple-choice questions, and stop at the Place Order button. Use when the user says "order food", "I'm hungry", "get me dinner", "order from <restaurant>", "grubhub", or runs /grubhub. Searches what is actually open and deliverable right now, presents real restaurants and real menu items as pickable options, builds the cart, reads back the true total with fees, and hands the last tap over.
argument-hint: "[<craving | restaurant | 'the usual'>] [--pickup] [--budget N] [--for N people]"
user-invocable: true
---

# Grubhub

Ends with a filled cart on screen and nothing left to do but press **Place Order** —
which the operator presses, never this skill.

    craving  →  what is actually open now  →  pick restaurant  →  pick items  →  cart  →  operator places it

The operator is signed in on both the Mac and the PC, so this runs on whichever machine
is in front of them. Nothing here is machine-specific.

## The two rules that outrank everything

**1. Never place the order.** Not "confirm", not "continue to payment", not a one-click
reorder tile. Build the cart, open checkout, read the total back, stop. A placed Grubhub
order is charged immediately and cancelling it after the restaurant accepts is a support
conversation with partial or no refund — it is closer to a sent email than a saved draft.

Everything *before* that button is fair game and needs no permission: searching, opening
a store, adding items, setting quantities, choosing required options, applying a promo
that is already in the account, picking the saved address. The pause is at the end, once.

**2. Never type a credential or a card.** Not the account password, not a card number, not
a CVV, not a gift-card code, and never a captcha. If the session is logged out or asks to
re-authenticate, stop and say so — the operator logs in, then this continues. A Grubhub
session that needs a password is a session this skill cannot have.

## Which browser

**Claude in Chrome** (`mcp__claude-in-chrome__*`), never the in-app browser. The whole
order depends on state the in-app browser does not have: the logged-in account, the saved
addresses, the card on file, Grubhub+, any campus dining balance, and the order history
that makes "the usual" mean anything. The in-app browser would land on a logged-out
storefront and could not log in, because logging in is rule 2.

`kernel/browser-accounts.md` covers what these tools can and cannot do with the Google
accounts — switching between them with `/u/N`, and the sign-in that is never ours to do.

Load the tools in one call before starting:

    ToolSearch "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,
    mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__computer,
    mcp__claude-in-chrome__find,mcp__claude-in-chrome__form_input"

Read the page with `read_page` and act on `ref_N`. Grubhub re-renders constantly — a
menu list reflows when a filter chip loads, and coordinates captured a second earlier
land on the wrong dish. Screenshot to *show* the operator something, not to aim.

## Search first, ask second

**Never ask a question the store page can answer.** "Italian or Thai?" at 9pm on a Monday
is a worse question than the same one after checking, because half those kitchens are
closed and the operator is choosing between things they cannot have.

So the order is always: resolve where and when → search → *then* ask, with real options.

1. **The account holds the addresses; `config/preferences.yaml` says which one is the
   default and what the dropoff note is.** Do not keep a second copy of a street address
   in a config file that can drift out of date — read the saved ones from the account and
   match by label. Confirm only when more than one fits and the request does not say
   which. A wrong address is the one mistake here with no recovery: the food arrives,
   somewhere else, and it is paid for.
2. **Search Grubhub for what is open and deliverable to that address now.** If the
   operator named a craving or a restaurant, search that. If they named nothing, search
   their saved favourites and recent orders first — a repeat is the most likely answer.
3. **Read fees before presenting.** Delivery fee, service fee and the small-order fee are
   the numbers that make a $14 burrito cost $27, and they differ per store.

## The questions

`AskUserQuestion`, and **it takes up to four questions in one call** — use that. Asking
size, spice and drink in three round trips is three times the interruption for one
decision the operator made instantly.

**Restaurant** — single select, 3–4 options, each carrying what is needed to choose
without opening a tab: **name — ETA — delivery fee — rating — the one line that
distinguishes it.** Two burrito places at the same ETA are not a choice until you say
which is the one with the good al pastor.

**Items** — `multiSelect: true`, always. Ordering one thing is the exception; a main and
a side and a drink is the normal case, and a single-select picker quietly turns one order
into three passes. Each option carries **item — price — the line that distinguishes it
from its neighbour on the same menu.**

**Required options, batched.** Most items have at least one forced choice — size, protein,
rice, spice, a mandatory side. Collect every required choice across every selected item
and ask them together, up to four at a time. Never invent one: a medium where they wanted
a large is a small annoyance, mild where they wanted hot ruins the meal.

**What not to ask.** Anything `preferences.yaml` already answers — tip, default address,
utensils, the allergy list, the things they never want. A skill that asks about cilantro
every single time is worse than one that asked in September and wrote it down.

## Three tiers of "no", and they behave differently

Collapsing these is what makes a food skill feel stupid — it either nags about something
settled or silently enforces a diet the operator is in the middle of changing.

| tier | behaviour |
| --- | --- |
| `allergies` | **Gate.** Checked before an item enters the cart. An item whose description does not rule the allergen out is asked about or dropped, never added hopefully. "Probably fine" is not a standard here. |
| `never` | **Filter, silently.** Absolute but not medical. Do not surface it and do not ask — the answer will not change, and asking every time is the nag. |
| `avoid` + `unless` | **Prefer against, with named exceptions.** The exception is the point: a blanket avoid on an ingredient hides the one form of it they actually want. |

**`trending: true` inverts the avoid.** It marks something the operator is deliberately
eating more of, and it means: offer it, name the dish, let them choose. Filtering it out
would be the skill quietly enforcing last year's diet against someone who has changed
their mind — the worst version of a preferences file, because it is invisible and the
operator would never know what they were not shown.

When a tier decides something, say so in one line at handover rather than silently: "no
never-list items included" is useful; discovering it by noticing the absence is not.

## Handing it over

Open checkout and read back, as plain lines:

- every item with its chosen options and quantity
- subtotal, then **each fee named separately**, then tax, then tip, then the total
- the delivery address, in full
- the ETA

Then stop, with the checkout page on screen. The fee breakdown is the point of reading it
back — the subtotal is the number the operator already agreed to in their head, and the
total is the one that surprises them.

If anything was substituted, unavailable, or chosen on their behalf, say which and why in
one line before the total, not after.

## Over Discord

`AskUserQuestion` does not exist there. Degrade to **numbered bullet lists** — bullets, not
tables, per `AGENTS.md` — and accept a reply like `2` or `1,3,4`. Keep each option to one
line, since the choice is being made on a phone. Everything else is unchanged, including
stopping at Place Order.

## Running it on the PC

Nothing here is Mac-specific and no path is hardcoded. The operator is signed in to
Grubhub on both machines, which is the part that matters: account state is per-browser,
so each machine needs its own logged-in Chrome with the Claude extension signed in.

**This skill cannot be handed off.** `/handoff` runs headless, and a headless run cannot
ask a multiple-choice question — it would pick for the operator, silently, and then stop
at a checkout page nobody is looking at. Run it interactively on whichever machine is in
front of you.

## Files

    config/preferences.yaml       address, allergies, dislikes, tip, favourites  (gitignored)
    config/preferences.example.yaml   the shape of it, safe to commit
    references/grubhub-ui.md      the site's quirks: required-option modals, fee lines, reorder

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — Jai rewrites the output, states a preference in
passing, a step fails the same way twice, a default turns out to be wrong for how he
actually works — record it and say so in one line:

    bash kernel/skill-learn.sh record grubhub "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
