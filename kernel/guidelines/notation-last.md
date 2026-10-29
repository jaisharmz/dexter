---
name: notation-last
summary: Teach an idea in plain words, a concrete example and symbols the reader already owns, then name it with the field's term and notation. Met first, notation reads as a wall; met last, it labels something the reader already understands.
triggers: [teaching, learning, explaining, lessons, textbooks, prep packs]
---

The operator, 2026-10-28:

> advanced terminology/notation is the thing that is scary to new learners. if a concept can be
> taught without it, and then you retrospectively assign the notations this often helps make it
> more simple / from first principles / understandable

A term or a symbol carries no idea of its own. It is a label, and a label is only useful once the
reader holds the thing it labels. So the order inside any explanation is:

1. **The thing, in plain words**, on a concrete example with real numbers. "Two answers, and people
   picked the first 70 times out of 100. Give each answer a score so that the gap between the
   scores predicts that 70%."
2. **Symbols only where they save words**, introduced the moment they are needed and named in
   words first: "call the first answer's score a and the second's b".
3. **Then the field's name and notation, in one line, as a reward**: "this is the Bradley-Terry
   model; papers write P(y_1 > y_2) = sigma(r(y_1) - r(y_2))". Map each standard symbol to the
   reader's words once, so a paper read afterwards looks familiar.

What this rules out:
- Opening a section with a definition in notation ("Let pi_theta be a policy over A given S").
- A syllabus or a heading that names units by jargon alone. Write what the unit does in plain words,
  with the field's name in parentheses at most: "score each answer from pairs people compared
  (reward models)".
- Greek letters, subscripts or acronyms that appear before the idea they stand for.

When an idea cannot be stated without its notation (a proof about a specific operator, a paper whose
contribution is the notation), say so and introduce the notation slowly, one symbol at a time, each
with a picture or a number beside it.
