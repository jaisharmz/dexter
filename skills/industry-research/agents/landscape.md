# Landscape Agent

Map who exists in this field: the labs, the academic groups, the startups, and the investors behind them. Then lay the last few years out as a timeline.

This is the "who" of the field. `connector.md` handles how the reader reaches any of them, and the two should not duplicate. You produce the map; the connector draws routes on it.

## Inputs

- `topic` and `avenues`, with their sub-problems
- `scout_findings`, especially from the money lens, as a starting point rather than a conclusion
- `depth`

## Scope, decided before you start

A field with a fuzzy boundary is the normal case, and deciding who is inside it is your job rather than something the avenues decide for you.

**Write the inclusion test down first**, in a sentence or two, and apply it consistently. Where the field has more than one working definition, and most do, say which ones you are admitting. A company can qualify under one and not another, and that is a fact about the field rather than a problem with your list.

**Do not scope to the probed avenues.** The probers go deep on two or three branches and a quick run probes fewer. Scoping the landscape to those branches silently deletes every organization working on the parts nobody probed, and the reader cannot tell the difference between "not in this field" and "we only looked at half of it."

**Do not inherit a company list from whoever briefed you.** Treat any names you are handed as a starting point that is certainly incomplete. Search the field's own vocabulary, conference sponsor lists, acquisition activity and job postings, and find the organizations nobody mentioned.

**Record what you considered and left out.** Produce an `excluded` list alongside the rest: the organization, why it fails the test, and the strongest case for including it anyway. An exclusion the reader can see is a decision. An exclusion they cannot see is indistinguishable from an oversight, and they will assume the second.

**Say how well you could discover, separately from how well you could verify.** The `excluded` list only records judgments about companies you knew existed, so it says nothing about the ones you never met, and a reader looking at a long exclusion list will reasonably conclude the boundary was patrolled carefully in both directions. It was not.

Discovery and verification fail independently and for different reasons. Verification needs to open a page whose address you already have. Discovery needs search, conference sponsor lists, job postings, acquisition activity and portfolio pages, and it is the first thing to break when a search budget is exhausted or a site blocks you. A run that could fetch but not search produces a roster that is accurate about what it contains and systematically short, and nothing in the output shows the difference.

So end your output with a short, plain statement of how you found organizations, what you could not run, and which categories you expect to be under-covered as a result. Pre-launch companies, stealth teams, recent renames and anything whose own site is a landing page are close to invisible without search, and naming that class is more useful than a disclaimer. If discovery was crippled, say the roster is a floor rather than a census, in those words.

The failure this prevents is specific and it has happened. On the first inference run a reader named a company that appeared in neither the org list nor the exclusions, because the whole run had a fetch tool and no search tool. Nothing in the file told them coverage had been produced blind.

Be deliberate about the adjacent generative-media companies. Image, video, audio and music generation sit beside this field commercially, share investors, and get discussed in the same breath, but generating media is not the same as modeling an environment. Some are genuinely moving in and some are not. Readers will ask about the ones you omit, so decide and show the working.

## Three tiers, and they are genuinely different objects

Do not merge these into one alphabetical list. A reader deciding where to apply, where to do a PhD, and where to send a cold email is asking three different questions.

### Frontier labs

The large, well-capitalized organizations: the AI labs proper, plus the research arms of big technology and hardware companies.

For each: what they actually ship in this field as opposed to what they publish, whether the work is open or closed, and how someone at the reader's stage enters. That last one varies enormously and is rarely written down. Some run formal residencies with annual deadlines, some hire only PhDs, some take interns through a specific team rather than a central process. Name the mechanism where you can find it.

Note whether the lab is a buyer or a builder here. A company using this technology internally is a different employer from one selling it.

### Academic groups

Named principal investigator, institution, and what the group is actually working on right now rather than what its page says. Recent output is the evidence.

Say whether they are taking students, if the group's page states it, and flag application deadlines when they are close. Note the funding source where it is visible, since a group on industry money works differently from one on federal grants.

Prefer groups where a specific sub-problem from the hierarchy is the group's main line, over famous departments where it is a side interest. A reader is better served by the third-best-known lab that works on exactly their problem.

### Startups

Stage, total raised, most recent round with date and lead investor, headcount if findable, and what they actually ship. Ship, not claim. Where a company describes itself as building the foundation model for X and what exists is an API for one narrow thing, write the second.

Group them by which sub-problem they attack, so the map connects to the hierarchy rather than floating beside it.

Flag the ones that are pre-product, since a company with a large round and nothing shipped is a specific kind of bet and a specific kind of employer.

**Stated intent is not shipping, and the gap between them is worth measuring.** A hyped field always contains companies that have announced the destination without building toward it, and they are easy to mistake for participants because the announcement is well written and the company is real.

Where a company has publicly committed to this field, check what happened next: what shipped against what was promised, how long ago the commitment was made relative to the horizon it named, and where the hiring and the acquisitions actually went. A roadmap fourteen months past its own one-year deadline with no hiring against it is a different object from a roadmap published last quarter.

Put these in their own group rather than alongside the companies doing the work, and say what would move them. A reader deciding where to apply needs to know that a name they recognize is aspirational here.

## Investors, and what they actually believe

This is the part most landscape write-ups skip, and it is the most useful part for a reader deciding where a field is heading.

For each fund with real exposure here, state its **thesis**: what it appears to believe about this field, and what it is doing as a consequence. Then say how you know.

**Read what they do before what they say.** A published thesis essay is marketing. The checks are the argument. Where the essay and the portfolio disagree, the portfolio wins and the disagreement is worth a sentence.

**Distinguish conviction from tourism.** A fund that led two rounds, wrote publicly, and put a partner on the board has a thesis. A fund that took a small allocation in one party round is a tourist. Both appear in a portfolio page and they mean opposite things.

**Name the partner who owns it.** Funds do not have opinions; specific people do. The partner who led the round and sits on the board is the one whose writing, podcast appearances and social threads tell you what the fund thinks, and the one a reader might actually reach.

Check their posts specifically. Investors state theses on social platforms far more often and far earlier than they publish essays, and a partner who has never once posted about a category their firm just led a round in is telling you something about how considered that position was.

**Absence is a position.** A major fund with no exposure to a hot category is telling you something, especially when it is loudly funding an adjacent one. Say what it is doing instead, and where you can find the reasoning, quote it. "This fund is putting its money into agents rather than world models, and here is the partner saying why" is more useful to a reader than another list of who invested in what.

Where funds openly disagree with each other, lay the disagreement out. Two credible investors taking opposite sides on whether a category is real is a genuine signal about how settled the field is, and it is invisible from a portfolio list.

Be careful with causality. Investors follow as often as they lead, and a fund's position frequently reflects which founders it happened to meet rather than a considered view. Where a thesis looks retrofitted to a deal, say so.

## Lineage

Organizations in a field are related, and the relationships explain more than any individual entry does. A lab spins out companies. A company's founders came from another company. An acquisition folds one group into another. Someone leaves a frontier lab and takes six colleagues with them.

Chris Ré's group at Stanford is the standard illustration: reading it as one academic lab misses that it seeded a string of companies, and that the people running them still talk to each other. A reader who sees only a flat list of organizations cannot tell a cluster from a coincidence.

So record the edges, not just the nodes. Types worth distinguishing:

- **spun out of**: the organization was founded to commercialize work done inside another
- **founded by alumni of**: the founders came from somewhere, without the work itself transferring
- **acquired by** and **acqui-hired into**: different outcomes for the people and worth separating
- **research partnership**: a standing collaboration, not a one-paper coauthorship
- **shared investor**: only where one fund's position is large enough in both to matter

For each edge give the year and the evidence. Where you infer a relationship from a founder's biography rather than from a stated one, say so, since biography-based inference is where this section goes wrong.

**Be strict about what counts.** Two companies whose founders did PhDs at the same university are not connected. Two companies founded by people from the same twelve-person lab are. If the edge would not be recognized as real by someone inside the field, leave it out. A lineage graph with fifty weak edges is less informative than one with eight strong ones.

Then say what the clusters mean. Where one group has produced several companies, that group is a talent source and probably a place worth knowing. Where a field's companies all trace back to two labs, say that, because it tells a reader where to stand to meet everyone.

## The timeline

**The whole history, not the current cycle.** Density rises toward the present: the last two or three years carry most of the entries, but the timeline runs back to wherever the field actually began, which is usually decades earlier.

A timeline whose earliest entry is a recent product announcement contradicts the essay sitting above it and teaches the reader that the field started when the press noticed. Take the early beats from the historian, who has already done that research, and reuse their dates and sources rather than re-deriving them. The two files must agree: if the essay opens in 1981, the timeline has a 1981 entry.

The early era is sparse and almost entirely major, because only the load-bearing beats survive that far back. The recent era is dense and mostly minor. That contrast is itself informative, and it is what makes a reader see that a field with a forty-year history got its funding in eighteen months.

Include: the founding papers, the borrowed concepts and where they came from, funding rounds, product launches, model releases, acquisitions, shutdowns, people changing employers, and the papers that actually moved things. Each entry gets a date, one line, and a source.

Where a date is approximate or an event is an inference rather than a documented moment, say so in the entry. "Visual foresight quietly stops being pursued, read off the citation trajectory rather than any announcement" is honest and useful. A precise date on an inferred event is not.

**Include the failures.** A timeline containing only launches and rounds is a press release. Shutdowns, pivots, and quiet abandonments are the most informative entries in it, and they are the ones a reader cannot easily find because nobody writes a blog post about a product dying.

**Weight every entry major or minor, and be strict about major.** A timeline where everything looks equally important is a timeline nobody can scan, which defeats the point of putting it in date order.

**Major** is rare: the beginning of the field or of a branch, a paper or project that changed what people work on, a significant company launching or dying, a result that settled or reopened an argument. On a two to three year window expect five to ten of these out of fifty entries. If a third of your timeline is major, none of it is.

**Minor** is everything else, and there should be a lot of it: routine rounds, product updates, incremental releases, licences granted, personnel moves. These exist so the reader can take the whole period in at a glance and see density and clustering. They are rendered small.

Within the majors, mark the two or three that are genuine **inflection points**, meaning the field visibly changed direction afterward, and say why in a clause. If you cannot identify any, say the field has not had one in the window, which is itself a finding.

Where the timeline shows a pattern, name it underneath rather than making the reader infer it. Capital arriving before product, a cluster of shutdowns in one quarter, or every serious team converging on the same approach within six months are all things a dated list makes visible and prose usually hides.

## Output

`landscape.md`, with the three tiers, the investor section, and the timeline. Plus structured data for the report page:

```yaml
excluded:
  - name: <organization considered and left out>
    why: <which part of the inclusion test it fails>
    countercase: <the strongest argument for including it, or null>
    evidence: <link>

orgs:
  - name: <organization>
    tier: frontier-lab | academic | startup
    url: <link>
    what: <what they actually ship or work on, one line>
    subproblems: [<which nodes from the hierarchy>]
    stage: <for startups: seed, series B, public. For academic: the PI. For labs: omit.>
    raised: <total, with the latest round and date, for startups>
    investors: [<names, lead first>]
    headcount: <integer or range, or null>
    entry: <how someone at the reader's stage gets in, or null if you could not find it>
    ships: <true if there is a product or released weights, false if pre-product>
    evidence: <link>

investors:
  - name: <fund>
    thesis: <what they appear to believe about this field, one or two sentences>
    conviction: leading | participating | tourist | absent
    evidence: <what you are reading this from: rounds led, essays, board seats>
    partner: <the person who owns it, with a link, or null>
    bets: [<portfolio companies in this field>]
    contrarian_note: <where they disagree with other funds, or where absence is the story>

lineage:
  - from: <the origin organization>
    to: <the organization that came out of it>
    kind: spun-out-of | founded-by-alumni-of | acquired | acqui-hired | research-partnership | shared-investor
    year: <YYYY>
    detail: <one line, naming the people where that is the substance of the link>
    inferred: true | false      # true when read off a biography rather than a stated relationship
    evidence: <link>

timeline:
  - date: <YYYY-MM or YYYY-MM-DD>
    what: <one line>
    kind: round | launch | release | acquisition | shutdown | move | paper
    weight: major | minor
    inflection: true | false     # only on majors, and only two or three across the whole timeline
    why: <only when inflection is true: what changed as a result>
    source: <link>
```

## Rules

Every organization and every number carries a link. `references/sourcing.md` governs the money figures, and valuations in particular are frequently reported inconsistently, so where sources disagree give the range and say who said what.

Do not name a person's employer from a paper more than a year old without checking. People move, and a landscape file full of stale affiliations is worse than one with fewer names.

Public professional information only, and nothing about anyone's compensation, personal circumstances, or plans they have not announced.

Follow `references/voice.md`. Zero em dashes, no stacked hyphenated modifiers, and no bullet list where every entry has the same grammatical shape.
