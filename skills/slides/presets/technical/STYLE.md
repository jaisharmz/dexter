# Technical preset

For teaching and review decks in math, CS and engineering: definitions, theorems, worked
examples, practice problems with solutions. 10 x 5.625 in, white. `deck.js` builds it,
`render.py` typesets the math, and the tokens at the bottom of this file set the look.

## The look

| What | Value |
|---|---|
| Title | Outfit 28 pt: the topic ("Inverses") |
| Subtitle | Outfit 22 pt italic, same text box: what is on the slide ("Definition + Examples", "Practice: Solve a Congruence") |
| Source caption | 14 pt grey at the top right of every content slide: the lecture, note or chapter the claims come from |
| Body | Outfit 16-18 pt in grey #EFEFEF boxes, one box per idea group |
| Bold | Century Gothic Bold for the term being defined ("**Inverse:**") |
| Math in text | Inline in Outfit; symbols Outfit lacks (⇒ ∧ ∨ ∀ ∃ ≡ ≤ ∈) switch to STIX Two Math automatically |
| Displayed math | LaTeX (Times + Computer Modern) rendered to PNG at a known size, 12 pt × the block's scale |
| Answers | Accent blue #0000FF (`\ans{}` in LaTeX, `[[...]]` in slide text); reasons in grey (`\why{}`) |
| Callout | White box, dark red #980000 border, bold "Watch out:" label: the classic mistake for this idea |
| Banner | Solid #0000FF, white 16 pt: the one idea of a section divider or the takeaway of a solution |
| Divider | Centered topic 40 pt, presenter and source 22 pt grey, the section's one idea in the banner |

## Slide patterns in deck.js

- **Divider** per topic, then concept slides (`box`, `table`, `callout`), then **practice /
  solution** pairs. A practice slide shows the question alone, with room to work. Its solution
  slide repeats the question in a grey box when both fit, then the solution, then an optional
  banner with the move to remember.
- Tables use `[[blue]]` for the cells that answer the question.
- `~~strike~~` shows a wrong step in red, for "find the error" slides.

## Rendering math

`tex/snippets.tex` holds every problem, solution and displayed equation as a block:

    %%% id=inv_s w=9.0 s=1.4
    \begin{align*} ... \end{align*}

`w` is the width on the slide in inches and `s` the scale, so the type lands at 12 × s pt (1.4 →
16.8 pt). `python3 render.py` needs pdflatex and pdftoppm (poppler). It writes `img/<id>.png` and
`img/manifest.json`, and `deck.js` places each image at its natural size. A block wider than its
minipage is cut off without an error, so render.py warns on every `Overfull \hbox`: treat each one as
a bug. A question block (id ending `_q`) also gets a grey copy for its solution slide.

## Getting the content right

A script that checks every computation is not enough for teaching slides. Most errors in a
review deck are a theorem missing a hypothesis (distinct, coprime, connected, non-zero, at
most), a proof argued in the wrong direction, or a lemma credited with more than it proves.
After the build, give two or three reviewer agents the course notes and have them check each
statement's hypotheses and each proof's direction against the source the caption names. Use the
course's own wording and notation, and keep open homework out of the practice problems.

## Tokens

```json
{
  "fonts": { "body": "Outfit", "bold": "Century Gothic", "code": "Courier New", "math": "STIX Two Math" },
  "sizes": { "title": 28, "subtitle": 22, "body": 18, "banner": 16, "caption": 14, "code": 14, "minimum": 12 },
  "colors": { "text": "000000", "muted": "595959", "accent": "0000FF", "bad": "980000", "good": "38761D",
              "box": "EFEFEF", "imageBorder": "B7B7B7", "background": "FFFFFF" },
  "banner": { "fill": "0000FF", "text": "FFFFFF" },
  "layout": { "titleX": 0.43, "titleY": 0.3, "margin": 0.5, "bannerY": 4.74, "bannerW": 8.7, "bannerH": 0.56 },
  "bullets": ["25CF", "25CB", "2605"]
}
```
