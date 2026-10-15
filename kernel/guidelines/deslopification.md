---
name: deslopification
summary: Strip the tells of machine-written prose. Density budgets, not bans.
triggers: [writing, output]
---

Identify the top signs of AI writing and fix them. `skills/papers/scripts/deslop.py`
is the executable version of this guideline — read it before writing anything long.

**Titles.** The giveaway is a noun phrase plus a portentous clause that reframes it:
"World models, after the score stops meaning anything." It sounds like a thesis and
states nothing. Nobody names a document that way for a colleague. Use the plain noun
phrase and put the argument in the opening.

**Density budgets, not bans.** "Rather than" is a fine phrase; seventeen of them in
five thousand words is a tic. The constructions are each defensible and collectively
unmistakable. Measure, don't prohibit.

**Other tells.** Tricolons everywhere. "It's not just X, it's Y." Hedging that commits
to nothing. Section headers that restate the section. Summaries that summarize nothing
new. Enthusiasm markers standing in for substance.

**The test.** Would a competent person write this sentence to another competent person
they respect? If it reads like it's performing thoroughness rather than being
thorough, cut it.

**Compression is a tell too: outline shorthand.** Cutting tells and trimming toward bare
bones is half the job. A draft written from an outline carries the outline's own vocabulary
into the prose, and a reader who never saw the outline trips on it. A reader's line edits on
an essay that had already passed this guideline (2026-10-15) replaced almost nothing but that:

- Coined labels used as defined terms. "The film never names the rule" came from a prep-note
  label, and the reader asked for every "the rule" to go. Name the thing itself (the policy,
  the law, the person). Watch "the arrangement", "the deal", "the measure", "the system".
- Riddle phrasings of a mechanism. "The film shows who pays to raise a worker" became "the
  film shows the hidden costs behind this labor". "To do the raising the city leaves to the
  village" became "to support each other in the village, which the city fails to provide".
- Symmetric epigrams. "The arrangement that raised her cheaply also delivered her to the
  factory floor" and "at two different scales" became a plain statement of the irony and
  what it costs.
- Abstract stakes in writing about people. "The general cost of fast growth" became "the
  exploitation of laborers", "gives up" became "sacrifices", and "quit school" became
  "reject the path her parents hoped for her".
- Hidden causes. An "and" joining a cause to its effect became "so".
- Over-clipped register. "Over three years" became "over the course of three years". Some
  connective phrasing is part of a human voice, so don't strip every soft word.
- Jargon from the research. "Opening card" became "opening scene".
- Counterfactual prescriptions ("one title card would have shown...") became what the work
  does and its effect ("the film never names the policy, which puts the blame on the family").
- A vivid detail whose link to the claim was only asserted was cut.

Re-read the draft as a stranger to the outline before running the checks. Spending words
on naming, stakes, and causes is fine.

**The bolded-lead list.** The strongest structural tell in proposal and report prose:
a list where every item opens with a bolded noun-phrase label, then a verbless
appositive that restates it. "**One dashboard for every data source.** A single
view covering orders, refunds, and inventory, implemented for Shopify, Stripe, and a
CSV upload." The label promises a claim and the sentence never
makes one, because it has no verb. Three of these in a row and the page stops reading
like a person wrote it. Fix by deleting the labels and writing the paragraphs as
prose, or by keeping the labels only where the reader genuinely needs to scan — and
in either case giving every sentence a subject and a verb.

**Verbless fragments.** The bolded-lead list is one instance of a wider habit:
"Stripe webhook listener." "CSV importer with round-trip tests." Fragments read as
notes to self, not as writing. If a line is genuinely a list item, make it a bullet.
If it is a sentence, give it a verb.

**Quantified summary lines.** "In total, roughly twelve hours across the quarter,
testing included." "This comes up roughly four times a quarter rather than
weekly." The number is invented precision that performs diligence and commits
the writer to something they cannot control. Cut the tally; state the commitment.

**Unrequested numbers, details and examples.** A count, a measurement or an example the
reader did not ask for reads as padding: "zero real successes in 279 attempts", "and it
passed like the other 240", "(the biggest are 200 and 168)". Keep the numbers the
question asks for and the ones the argument stands on, give an example only when the
answer needs one, and cut every detail that does not change the answer. Bare bones is
the target. Short answers read best as bullets, and a fragment is fine inside a bullet.

**The narrated argument.** Prose that describes its own moves reads as generated: "I
follow the chain from X to Y", "The first link is why...", "The second link is what...".
So does a writer grading their own case in passing: "the argument is a chain, and I find
it convincing." State the claim and let the paragraph carry it. In analytical writing
(a review, an essay, a report) keep the writer out of it: no "I follow", "I find", "I
argue". The operator marked all three as AI on sight.

**The "That" pickup.** A sentence explains something, and the next one opens with "That"
pointing back at it: "That idea is why the plan failed", "That gap is where the fight
comes from". One is harmless, but the habit reads as generated, and the operator flagged it
on sight. Carry the link with a connective instead ("This is why", "As a result", "As
such"), or fold the two sentences into one.

**Contrast by negation.** "It checks numbers, not the sentences around them." "The model is
needed in the tool loop, not for the prose." "It counts as an error, never as a wrong answer." Each
defines a claim by what it is not, and a page of them reads as generated. The operator named the
shape on sight (2026-10-11). State the positive claim and let a second sentence carry the limit if
the reader needs it: "The check only matches numbers."

**Statistics nobody asked for.** Explaining results, a person says what happened in the simplest
terms and gives just enough evidence to justify the claim or the step. A model reaches for intervals,
significance tests and second decimals, even in an abstract. "82% against 86%, a gap inside the 95%
interval" became "nearly matches it (82% against 86%)" (2026-10-13). Keep the full statistics in the
tables and the appendix, and write the prose for a reader who wants the result.

**Ownership metaphors and announced ideas.** "The database owns reported numbers", "the framework
owns the code", "the design rests on one idea", "the key insight is". The operator named each as
AI on sight (2026-10-13). Say what a thing does or name its source plainly: "the database supplies
reported numbers". The same goes for "where X comes from" ("ablations show where the accuracy comes
from", "most of the accuracy comes from two choices"): state the finding, "two choices matter most".

**Slogan summaries of a design.** "The model plans the work and writes the answer, and code fetches the
evidence and checks every number against it." A balanced sentence that restates the whole system in
sweeping terms ("every", "against it") reads as a tagline, and the operator marked it as AI
(2026-10-13). Describe the mechanism once, concretely, where it belongs: "a grounding check matches
the numbers in the answer to SQL results, calculations, and cited passages".

**"Lives in."** "The claim lives in uses per cup", "the logic lives in the parser". The operator
marked it as AI on sight (2026-10-13). Say the plain relation: "the claim depends on uses per cup",
"the parser holds the logic".

**"Comes for free."** "The check is free", "this comes for free", "at no cost". Say what it actually
costs or saves: "it adds no model call".

**Em dashes and the Oxford comma.** No em dashes, in prose or in titles; use a comma, a colon or two
sentences. Lists of three or more take the Oxford comma ("the database, the filings, and the
index").

**Stacked semicolons.** One semicolon in a sentence is a choice. A sentence that chains
three clauses with semicolons is an outline compressed into one line: "the need was
inelastic, so it accepted X; those conditions opened Y; and shoppers saved a little
while Z." Split it into sentences.

**The closing one-liner.** Ending a paragraph on a quotable line that restates it ("The
countries that write the conditions do not follow them.") is emphasis once. When every
paragraph ends that way, the page reads as performed. End most paragraphs on the evidence
or the claim itself.

**Manufactured completeness.** Risk sections with five entries where two are real,
deliverable tables with a Completion Criterion column for every row, a reference list
padded to look like a literature review. The shape of rigor without its substance.
Keep the items that would change someone's decision and delete the rest.

**Check every citation against the source.** Model-written reference lists get authors
and URLs right and quietly paraphrase titles into something more on-topic than the
real one. Resolve the DOI and copy the title verbatim.
