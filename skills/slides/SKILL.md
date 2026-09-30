---
name: slides
description: Make slides that look like the operator made them, as a .pptx that imports cleanly into Google Slides, and check every slide there before handing over. Reads the operator's measured style from config/style.md first, and measures it from their own decks when there is none. Use when the user asks for slides, a deck, "put this on a slide", "make it look like my slides", "add a slide to <deck>", wants slides moved into another deck or Google account, or runs /slides. For .pptx mechanics that have nothing to do with the operator's style, such as reading or editing an existing file, a general pptx skill is enough.
argument-hint: "[<what the slides are about>] | measure <folder of their decks> | import <file.pptx> <deck url>"
user-invocable: true
---

# Slides

The slides should look as if the operator made them. So they are built from a measured
profile of the operator's style and checked in the app they will be presented from.

    style profile  →  outline, one claim per slide  →  build .pptx  →  import into Google Slides  →  check every slide  →  hand over

## The profile is this skill's memory

`config/style.md` describes how this operator builds slides. It covers fonts, sizes, colors
and geometry, how their bullets read, and every correction they have made, and it overrides
anything generic in this file. Read it before the first slide. It is measured from their
decks, never guessed. Its `json` block feeds `assets/deck.js`, so the prose and the numbers
must agree.

- **No profile yet:** measure one first (next section). Generic good taste produces slides
  that look machine-made, and that is the complaint this skill exists to prevent.
- **The operator corrects a slide:** write the correction into `config/style.md` in the same
  run, dated and in their words. A correction about how this skill works, such as how to
  import, check or build, goes to `LEARNED.md` instead.
- `config/style.example.md` shows the shape of a profile. The profile is personal and is not
  shipped with the skill.

## Measuring a style

1. Collect at least ten of the operator's decks as PDFs. In Google Slides, File → Download →
   PDF. Prefer recent decks they built themselves. Leave out decks built on a company, course
   or client template, because those measure the template, and record which ones were left out.
2. Look at every page, not a sample:

       uv run --no-project --with pymupdf --with pillow python scripts/measure_decks.py sheets <pdfs> --out <dir>

   Read all the sheets. Note where images go, what image-only slides look like, how diagrams
   are drawn, and what repeats.
3. Measure:

       uv run --no-project --with pymupdf --with pillow python scripts/measure_decks.py measure <pdfs> --json style.json

   It reports, per deck and overall, the title font, size and position, whether a subtitle
   sits directly under the title, body sizes, text colors, the bold font, bullet glyphs, box
   fills, takeaway banners and image-only slides. Everything is in points and inches on a
   10-inch slide.
4. Write `config/style.md`. What holds across decks becomes a rule. What varies becomes a
   range. A quirk of one deck is dropped. Copy ten real bullets and five real titles verbatim
   into it, because new text is written to match them.

Look for these in particular. Each one caught out a first attempt.

- **The body size.** It is often 18 pt, far larger than a generated deck's 12-14 pt. Small text
  is the first thing a person notices as machine-made.
- **Whether the subtitle shares the title's text box.** A second line at the same x, close
  below, usually means it does.
- **The bold font.** It is often a different family from the body.
- **The takeaway device,** such as a banner at the bottom. Record its color, size, position and
  text size, and whether it appears on every slide.
- **How boxes are made.** A person usually types into a text box and fills it, where a generator
  lays a rectangle under a separate text box.

## Writing the slides

- Put the executive summary first, then the method, results and next steps. Each slide makes
  one claim that a reader gets in five seconds.
- Use the operator's section words for titles ("Methods", "Results"). Make the subtitle a noun
  phrase for what is on the slide ("Template + Config Example"), not a clause ("How a Second
  Claim Appears"). No clever titles.
- Write bullets the way the operator does, which usually means short phrases, not sentences:
  "label: value", arrows and symbols (→, =, ≠, +), asides in brackets, no final period. Use
  sub-bullets for detail. Run every line through `deslopification`.
- Say what a number counts in the same line ("5% of covered amounts read exactly"), not as a
  bare figure.
- Put setup, parameters and caveats in the speaker notes. A results slide keeps one short grey
  setup line. The notes answer what a skeptic would ask.
- Give a slide of examples (generated documents, screenshots, before and after) to the images,
  as large as the slide allows, with at most a short label under each.
- In a pipeline where some steps are a model and some are code, tag every step with who does
  it (Agent, Script, Input), so nobody has to ask where the model is.
- Mask real customer, patient or personal data on any slide that may leave the machine. Show
  the original only masked, and keep the unmasked version local.

## Building the .pptx

Copy `assets/deck.js` next to the deck's images, replace its demo slides, and run
`node deck.js out.pptx`. It reads the profile's tokens and encodes the rules that make slides
feel hand-made:

- The slides are 16:9 at 10 x 5.625 in, Google Slides' default. The background color is set
  on every slide, so the slides paste into any deck, whatever its template.
- Every block is one text box that carries its own fill, border and text (`bulletBox`,
  `banner`, `flag`, `code`), never a rectangle with a text box on top. The title and subtitle
  are two runs of one text box (`newSlide`).
- Fonts come only from the profile. Each code run sets its own face and weight, so a prose run
  in the same box does not turn bold.
- It warns about any text under the profile's minimum size. Treat the warning as a bug.
- `SLIDES=1,3 node deck.js out.pptx` builds only those slides. Use it to move a few slides into
  another deck.

pptxgenjs traps met so far:

- `margin` arrays are [left, right, bottom, top] in points, not CSS order.
- Bullets need `bullet: { code: "25CF" }` plus `indentLevel`. A literal "•" in the text gives a
  double bullet.
- `rectRadius` only works on `ROUNDED_RECTANGLE`.
- Colors take no `#`.
- Set `pres.layout` before adding slides.

## Checking in Google Slides

A local render cannot be trusted. LibreOffice substitutes fonts it lacks (Outfit, Century
Gothic, most Google Fonts), so a slide that fits locally can overflow in Slides. Import into a
working deck and zoom into every slide. `references/google-slides.md` covers:

- uploading to Drive with a patched file picker;
- importing without the source theme;
- replacing slides;
- moving slides between Google accounts without losing images;
- working in decks other people edit;
- the checklist to run on every slide.

Fix problems in the build script and re-import. A hand fix in Slides is lost at the next
rebuild.

## Figures

Draw simple diagrams with the builder's shapes. For curves, geometry or anything
mathematical, render a figure with 3Blue1Brown's manim (`github.com/3b1b/manim`) or
matplotlib, in the profile's palette. Crop images to the part that matters before placing
them.

## Files

    config/style.md             this operator's measured style and corrections (personal, not shipped)
    config/style.example.md     the shape of a profile, with neutral tokens
    scripts/measure_decks.py    contact sheets and measurements from PDF exports of their decks
    assets/deck.js              pptxgenjs starter that reads the profile's tokens
    references/google-slides.md upload, import, replace, move between accounts, check

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record slides "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
