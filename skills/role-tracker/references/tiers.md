# Tiers

A tier says how much the operator wants an offer from this seat, so one sort of the Applications tab
shows where prep, follow-ups and warm paths should go. It is a judgment about the seat, made when the
application is logged and revised when something real changes: a call shows the team, the role turns out
to be engineering, a funding round, layoffs.

## The seven tiers

| tier | meaning | rough share |
| --- | --- | --- |
| S+ | A dream seat, taken over every other offer, a PhD admit included. Only seats the operator has named. | a handful |
| S | Taken at once over any other company: methods or research in the operator's core area, a strong people bar, and work that can carry the operator's name. | under 10% |
| A | A strong yes, worth heavy prep and a warm path: a high-growth company in one of the operator's sectors, in a role at the center of what it does. | 15 to 20% |
| B | Clearly better than the floor, with one of the three tests below weaker. | 25 to 30% |
| C | About as good as the floor. Worth taking only for something specific: a city, pay, or a new field. | about 25% |
| D | Below the floor, applied to for reach. Taken only if the floor disappears. | 10 to 15% |
| F | Would not be taken. Decline if they reply. | rare |

The floor is the operator's best option that is already certain, named under `floor` in
`state/tiers.json`. Comparing against it keeps C, D and F honest.

## Three tests

Score each 0, 1 or 2 and add them: 6 is S, 5 is A, 4 is B, 3 is C, 2 is D, and 0 or 1 is F.

1. **The work.** 2 for methods or research in one of the operator's areas, 1 for engineering in those
   areas or methods outside them, 0 for neither.
2. **The people.** 2 when the people bar holds: most of the informative profiles on the company's LinkedIn
   People tab are ones the operator wants to have, the founders have a strong research or company
   record, and the backing is top-tier. 1 when mixed, 0 when weak or unknown.
3. **The path.** 2 when it leads where the operator is going: their name on results, a field expert in
   the room, a network they want, 1 for partly, 0
   for a detour.

A track the operator keeps for credibility rather than as a destination is tiered by the signal an offer
sends, not by the three tests: its one or two strongest names can still be S, and the rest fall fast.
Name such tracks under `credibility_tracks` in `state/tiers.json`. Prep time
follows the tier. Applying costs minutes, so breadth is cheap. Weeks of interview prep go to S and A
seats, and a credibility track gets only the prep its live rounds need.

S+ only ever comes from the operator's own list (`s_plus` in `state/tiers.json`). A city the operator
ranks low moves a seat down one step at most. The tests score the seat, not the odds of an offer, so a
long shot can be S.

## Where a tier lives

- At apply time, `role-apply` writes `"tier"` and a one-line `"tier_why"` into the application record.
- `state/tiers.json` is the curated map, and it wins over the records. `companies` maps a company to
  `{"tier", "why"}`, `roles` holds `{"company", "role_has", "tier", "why"}` for a seat that differs from
  its company's tier, and `anchors` keeps a few calibrated examples per tier.
- A row in `state/overrides.json` can pin `tier` like any other field.

`rows --explain` prints each row's tier and where it came from: role, company, record or override.
