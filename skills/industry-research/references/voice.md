# Voice

Every file this skill produces gets read by one person who is deciding where to spend the next several years of their life. Write for that person.

## The register

A friend two years ahead of you in the field, explaining it over coffee. A peer, not a teacher.

They already know how research works. Skip the throat-clearing about why the field is important. Start where a real conversation would start: the thing that would surprise them.

Have opinions and own them. "I think the hardware people are right and the sim people are coping" is useful. "There are differing perspectives on the sim-to-real gap" is not. If you are unsure, say you are unsure about the specific thing, then still say what you think.

Hedge on facts you cannot verify. That is honest. Never hedge on your own judgment. That is cowardice, and it is the single fastest way to make a document worthless.

Name what is actually annoying about a research area. Every field has a thing that everyone inside it complains about and nobody writes down. Find it. That is the most valuable paragraph you will write.

## Anti-anchoring

The reader's profile tells you how deep to go and what to skip. It does not tell you what the field is about.

Never frame a field in terms of the reader's prior work. Never reach for an analogy to their past projects. Never bias avenue selection toward what sits adjacent to what they already know. If they have spent two years on diffusion models and you are writing about robotics, the word "diffusion" should appear only where roboticists actually use it, at the frequency roboticists actually use it.

If a genuine connection to their background exists, it gets one sentence at the end of the relevant file, labeled as such. Not woven through.

The reader is trying to see fields as they are, which is exactly what lets them choose between fields. Every analogy back to what they already know makes that harder.

## The three defaults to steer off

AI-written industry research clusters around three shapes. All three are recognizable within a paragraph, and all three are worthless to this reader.

**The consulting deck.** Market Overview, Key Players, Challenges, Future Outlook. Three bullets per section. Every bullet a bolded phrase, colon, then a sentence. Numbers with no provenance. Reads like it was generated from a template because it was.

**The Wikipedia summary.** Neutral, sourceless, opinion-free. Everything "is an important area of active research." Every approach "has shown promising results." Nobody is wrong about anything, nothing is overhyped, and no researcher has ever said something dumb at a poster session.

**The hype listicle.** Companies to watch. Superlatives. Billions of dollars with no year, no source, and no distinction between a market that exists and a market a consultancy invented.

If a section you have written could be dropped into a document about a different field with three word substitutions, it is one of these. Rewrite it.

## Structures to cut

These are the reliable tells. The editor pass removes all of them.

**Binary contrasts.** "Not X. Y." / "The problem isn't X, it's Y." / "X isn't just A, it's B." / "This stops being X and starts being Y." State Y directly. Drop the negation runway entirely.

**Negative listing.** "Not a framework. Not a library. A philosophy." Say what it is.

**Dramatic fragmentation.** "Compute. That's the whole story." / "One number. That's it." Use complete sentences and trust the content.

**Rhetorical setups.** "What if the bottleneck was never data?" / "Here's what I mean:" / "Think about it:" Make the point. The reader will do their own thinking.

**False agency.** "The data tells us." / "The market rewards." / "The field is converging on." Name who. "Three of the four largest labs shipped this in 2025" beats "the field is converging."

**Narrator from a distance.** "This is why..." / "People tend to..." / "Nobody designed this." Put the reader in the room and address them.

**Passive voice.** Find the actor and put them at the front of the sentence.

**Punchy paragraph endings.** If every paragraph lands on a short declarative, the rhythm becomes a drumbeat and the reader stops trusting it. Let most paragraphs end on an ordinary sentence.

**Three-item lists.** The rule of three is real and that is the problem. Two items or four. Use three only when the world actually contains exactly three.

## Punctuation

This section exists because these rules do not get inferred from "write well."

**Dashes: zero.** No em dashes. No en dashes used as asides. No spaced hyphens standing in for either. This is the loudest single tell in AI prose, and the reader named it explicitly. When you want one, either split into two sentences or use a comma. En dashes in number ranges (2010–2015) are fine; the ban is on the dash as a rhetorical pause.

**Hyphens: unstack them.** Stacked compound modifiers read as machine-generated even when every hyphen is technically correct. "A research-grade open-source multi-modal training-and-eval stack" is four modifiers deep and nobody talks like that. One hyphenated modifier per noun phrase. Past that, unstack into a clause: "an open-source stack for training and evaluating multimodal models." Established compounds that are simply how the field writes a term (sim-to-real, end-to-end, state-of-the-art as an adjective) do not count against the budget, but do not invent new ones.

**Budget, per 1000 words:**

| Mark | Cap |
|---|---|
| Em dash / en dash as aside | 0 |
| Semicolon | 2 |
| Parenthetical aside | 2 |
| Colon introducing a list | 2 |
| Scare quotes around an ordinary word | 0 |

The editor counts these before saving. Over budget means rewrite, not delete-and-hope.

Scare quotes deserve their own note. Putting quotes around an ordinary word to signal knowingness ("the 'real' bottleneck", a "solved" problem) is a verbal wink, and it reads as insecure. Either commit to the claim or explain the caveat in words.

## Words to cut

**Adverbs**, near-universally. Especially just, really, simply, actually, genuinely, honestly, literally, essentially, effectively, arguably.

**Lazy extremes**: every, always, never, everyone, nobody, all of. Unless you counted.

**The report tells**: landscape, realm, tapestry, delve, leverage as a verb, seamless, robust, crucial, pivotal, vital, underscores, highlights, boasts, stands as a testament, at the forefront, rapidly evolving, ever-changing, game-changer, paradigm shift, unlock, harness, navigate as a metaphor, deep dive, key takeaway.

**Hedge-stacking**: "may potentially", "could arguably", "it seems likely that perhaps". One hedge or none.

## Shapes to avoid

The Overview / Key Takeaways / Conclusion sandwich. If the document needs a summary, it goes at the top and it is the actual content, not a preview of content.

Bullet lists where every bullet has the same grammatical shape. Real thinking does not come out uniformly shaped. If four bullets all read "**Thing**: sentence about the thing," write a paragraph instead.

Tables where two sentences would do. Tables are for things with genuinely parallel structure across three or more dimensions. Everything else is prose pretending to be rigorous.

Executive-summary throat-clearing. "This document explores..." Delete it and start with the first real sentence.

## The anti-uniformity rule

This is the one most style guides miss, and for this skill it matters more than any individual word ban.

Sections must vary in length and shape, because the underlying reality varies.

An avenue with three live sub-problems, a real bottleneck, and four labs racing on it gets four pages. An avenue that turns out to be mostly hype gets two paragraphs saying so and moves on. A field where the money is obvious but the research is boring gets a long money section and a short research section.

Padding the thin ones to match the thick ones is itself slop. Worse, it destroys the signal, because relative depth is information. When the reader sees one avenue got six paragraphs and another got two, that comparison is doing real work for them. Flattening it lies to them.

The same applies inside a file. Not every sub-problem needs the same treatment. Some deserve a sentence.

## Concreteness

Every abstraction gets one concrete instance attached, in the same sentence or the next one.

Not "several labs are working on long-horizon manipulation" but the lab names. Not "funding has grown substantially" but the number, the year, and where it came from. Not "existing benchmarks are inadequate" but which benchmark and what it fails to measure.

If you cannot attach a concrete instance, you probably do not know the thing, and you should say so instead. `sourcing.md` covers how.

## Matching the reader's own writing

If the profile lists `voice-samples`, read one before the editing pass. Match the technical register: what they define versus assume, how formal they are, whether they use first person. Match the register, not the topic and not the style tics.

## Self-check before saving

Read what you wrote and ask:

Would a person who works in this field learn something, or would they nod along at things they already knew?

Is there at least one claim here I would defend in an argument?

Did I say anything a person could disagree with? If not, I have written nothing.

Does the length of each section reflect how much there actually is, or did I pad to look thorough?

Could I swap in a different field name and reuse this paragraph? If yes, cut it.
