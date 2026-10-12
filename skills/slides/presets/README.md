# Presets

Three finished looks for when the operator has no measured profile yet, or asks for one of
these kinds of deck. Each folder is self-contained: copy it next to the deck's images, replace
the demo slides, build, check.

| Preset | For | Builder | Canvas |
|---|---|---|---|
| `consulting/` | a case presentation, a strategy recommendation, a client readout | `deck.py` (python-pptx) | 13.333 x 7.5 in |
| `research/` | results, ablations, the protocol for the next experiment, a team update | `deck.js` (pptxgenjs) | 10 x 5.625 in |
| `technical/` | teaching and review decks with definitions, worked math and practice problems | `deck.js` + `render.py` (LaTeX) | 10 x 5.625 in |

Each `STYLE.md` describes the look, the slide patterns its builder offers and how to write for
it. A measured `config/style.md` still wins. A preset is where someone starts before their own
style has been measured.

## Building on a given template

When the deck has to sit in a company, client or course template, the template's masters,
fonts and colors win and the preset supplies the slide patterns and the writing.

1. Get the template as a file: a .potx or .pptx, or from Google Slides with File > Download >
   Microsoft PowerPoint. Read it first:

       uv run --no-project --with python-pptx python ../scripts/template.py company.potx

   It prints the slide size, the theme fonts and colors, every layout, and the boxes the
   master art covers (logo, footer bar, page number). Content must keep clear of those boxes.
2. **Consulting** builds on the template itself:

       TEMPLATE=company.potx uv run --no-project --with python-pptx --with pillow python deck.py out.pptx

   Slides go on the template's emptiest layout, so its logo and footer stay. The theme's body
   font, text color and first accent replace the preset's, and every slide is scaled uniformly
   from 13.333 x 7.5 to the template's size, top-aligned, so a 4:3 template keeps its footer
   band clear.
3. **Research and technical** take the template's tokens:

       uv run --no-project --with python-pptx python ../scripts/template.py company.potx --style template-style.md
       STYLE=template-style.md node deck.js out.pptx

   The tokens leave the slide background empty. Import the result into a copy of the template
   deck in Google Slides (File > Import slides, untick Keep original theme), and the
   template's master draws behind every slide. These builders lay out a 10 x 5.625 in page; for
   a template of another size, use the consulting builder.
4. Remake the icons in the template's accent (`icon.py --color <accent1>`), and check every
   slide against the master art in the contact sheet.

If the template's own layouts carry a style the presets lack (a numbered agenda, a quote
layout), measure two or three of its finished decks with `../scripts/measure_decks.py` and fold
what holds into the style file.

## Fonts and styles

The decks look hand-made because of a few fixed choices. Keep them.

- **One family for everything:** Outfit (Google Fonts, free). Google Slides has it built in. For
  local rendering and the fit checks, install the **static** weights (Regular, Medium,
  SemiBold, Bold) from fonts.google.com. The variable Outfit file renders at its thinnest weight
  in most tools.
- **Bold is a different face only in the research and technical presets:** Century Gothic Bold for
  lead-in labels. It ships with Google Slides and Office; LibreOffice substitutes a serif, so a
  local render shows bold labels in the wrong face and Slides shows them right.
- **Math:** symbols Outfit lacks (⇒ ∧ ∨ ∀ ∃ ≡ ≤ ∈) go in STIX Two Math, which survives Google's
  pptx import. Noto Sans Math does not: the importer renames it to Noto Sans, which lacks them.
  Displayed math is LaTeX rendered to an image (`technical/render.py`).
- **Code:** bold Courier New.
- **Sizes are large.** Body 18 pt on a 10 in slide, 20-24 pt on a 13.333 in slide, nothing
  under 11-15 pt. Small text is the first thing that reads as machine-made.
- **One accent color**, plus red for the problem and green for what holds. Grey for asides,
  sources and setup. No gradients, shadows, clip art or stock photos.
- **Every block is one text box that carries its own fill and border.** The title and subtitle
  share one box. Never a rectangle with a separate text box laid on top: it imports badly and
  edits badly.

## Icons

Icons earn a place where a slide lists three to five **parallel** things a viewer should tell
apart at a glance: pillars of a recommendation, the steps of a process, the capabilities of a
product, section dividers. Leave them off evidence slides (charts, tables, quotes), where they
compete with the proof, and never use one as decoration.

Rules that keep them looking professional:

- **One family.** Lucide (lucide.dev, ISC license): outline icons on one 24 px grid with round
  caps, so any set of them matches. Never mix families, emoji or filled and outline icons.
- **One color and one size per slide**, the accent color, or white on an accent disc. A pale
  disc behind each icon (`--circle`) makes a row read as a set.
- **The literal concept.** Rocket = launch, search = audit or research, settings = process or
  automation, shield-check = risk, chart-line = growth, users = customers, database = data,
  target = goal. If no icon says the idea plainly, use none.

Make them with `../scripts/icon.py`, which fetches the SVG, recolors it to the palette and writes
a PNG sharp at slide size:

    uv run --no-project --with resvg-py python ../scripts/icon.py rocket search settings --color 223AE6 --out icons
    uv run --no-project --with resvg-py python ../scripts/icon.py rocket --circle E6E9FC --out icons

`--animate` also writes a short Manim clip of the icon drawing itself, for an opening slide or a
section divider in a deck presented from Google Slides. Insert the clip as a Drive video
(Insert > Video > Google Drive). A video embedded in the .pptx imports as a still image. Animate
at most one thing per slide, and never on a slide with evidence to read.

## Flowcharts

A flowchart shows a process, a pipeline or a decision, left to right, in one screen.

- **Nodes are equal boxes at equal gaps,** computed from the slide width (`pipeline` in
  research, `flow` in consulting), never placed by eye. At most five or six in a row; a longer
  process wraps onto a second row or splits across two slides.
- **Each node is one filled text box with a thin border.** Its label is a short noun phrase,
  centered.
- **Arrows are grey and thin, with a small triangle head.** In `consulting/deck.py` they are
  connectors glued to the boxes, so they follow a box someone drags in Google Slides. A label on
  an arrow is two or three grey words ("today", "k = 5").
- **Color carries meaning:** the step the argument is about in the accent, a
  failure or a guard in pale red, a proposed path as white boxes with a grey border.
- **When some steps are a model and some are code,** flag each step Agent, Script or Input
  (`flag` in research), so nobody has to ask where the model is.
- **One branch at most per slide.** A fan-out (one input to several arms) is fine. Two crossing
  branches mean the slide holds two charts.
- Put the takeaway in a banner under the chart. The chart shows the process; the banner says
  what to notice about it.

For curves, geometry or anything mathematical, render a figure with Manim or matplotlib in the
preset's palette instead of drawing it with shapes.

## Checking

Build, then look at every slide before handing anything over:

    soffice --headless --convert-to pdf deck.pptx
    uv run --no-project --with pymupdf --with pillow python ../scripts/measure_decks.py sheets deck.pdf --out sheets

Read the contact sheet for overflow, wrapped titles, crowded or empty slides and misaligned
blocks, fix the builder and rebuild. Then import into Google Slides and check there too
(`../references/google-slides.md`): Slides sets Outfit about 10% wider than local metrics, so a
line that just fits locally can wrap there. Fix problems in the builder: a hand fix in
Slides is lost at the next rebuild.
