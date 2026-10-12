# Research preset

For results, methods and progress decks: an eval against baselines, an ablation, a protocol for
the next experiment, a lab or team update. 10 x 5.625 in, white, one blue accent. `deck.js`
builds it and reads the tokens at the bottom of this file.

## The look

| What | Value |
|---|---|
| Title | Outfit 28 pt, black, top left. An **action title**: the finding as a short claim ("On accuracy, the systems are level") |
| Subtitle | Outfit 20 pt italic grey, in the same text box as the title. Names the section and what is on the slide ("Where we stand · 3 runs each") |
| Body | Outfit 18 pt (15-17 in dense boxes), black, or grey #595959 for asides |
| Bold | Century Gothic Bold, same size as the body, for lead-in labels and the measure the slide is about |
| Banner | Solid #0000FF bar across the foot, one white sentence at 16 pt: the takeaway. On most slides |
| Setup line | 14 pt grey just above the banner: what was run, on what, how many times |
| Boxes | Grey #EFEFEF fill, no border, for a group of bullets |
| Ours | Blue #0000FF text for our systems in charts and tables; pale blue #CFE2F3 for the column or node the argument rests on |
| Good / bad | Green #38761D and dark red #980000, for Say / Don't say boxes and verdicts |
| Lists | ● then ○; ★ for next steps, each with `[owner · when]` in grey |
| Title slide | Centered, title 52 pt, subtitle 28 pt grey, author and date 20 pt grey |

## Slide patterns in deck.js

- **Executive summary** (`bulletBox` + `banner`): four or five lines, each a finding with its
  number, and a banner with the one claim to remember. Always slide 2.
- **Forest plot** (`forest`): one row per system, dot = mean, bar = 95% interval, a dark line for
  the baseline. Use it for any comparison that one run could flip. The numbers sit to the right
  so nobody reads values off the axis.
- **Highlighted table** (`table`): the column the argument rests on in pale blue and bold. A side
  box explains how that column was made.
- **Tiles** (`tiles`): three big numbers, each with what it counts and its source.
- **Say / Don't say**: two bordered boxes in green and red, each "don't" with its reason in grey
  brackets. For a meeting where what gets claimed matters.
- **Protocol flowchart** (`pipeline`, `node`, `arrow`, `flag`): steps left to right, each flagged
  Agent, Script or Input. A check that guards a step hangs below it in pale red.
- **Branching flowchart**: one input fanning out to several arms (ours in pale blue), then a
  judge, then a scorer. See demo slide 8.
- **Experiments, smallest first**: three columns with a blue header (when · cost), a grey box
  (what), and a "Decides:" line saying what the result settles. Optional `iconRow` above.
- **Next Steps**: ★ items, each `[owner · when]` in grey.

## Writing

- The title states the finding; the evidence is on the slide; the banner says what to do with it.
- Every number says what it counts in the same line: "142 of 200 questions", not "71%" alone.
- A result that one run could flip gets runs averaged and an interval, or it does not go on a slide.
- Setup, parameters and the skeptic's questions go in the speaker notes, which open with a
  cumulative time stamp ("[0:45]").
- Never let an action title claim a result nobody measured.

## Tokens

```json
{
  "fonts": { "body": "Outfit", "bold": "Century Gothic", "code": "Courier New" },
  "sizes": { "title": 28, "subtitle": 20, "body": 18, "banner": 16, "caption": 14, "code": 14, "minimum": 11 },
  "colors": { "text": "000000", "muted": "595959", "accent": "0000FF", "code": "38761D", "codeHighlight": "0000FF",
              "box": "EFEFEF", "pale": "CFE2F3", "good": "38761D", "bad": "980000",
              "imageBorder": "999999", "arrow": "595959", "background": "FFFFFF" },
  "banner": { "fill": "0000FF", "text": "FFFFFF" },
  "layout": { "titleX": 0.43, "titleY": 0.3, "margin": 0.5, "bannerY": 4.74, "bannerW": 8.7, "bannerH": 0.56 },
  "bullets": ["25CF", "25CB", "2605"],
  "flags": { "agent": ["Agent", "FCE5CD", "B45F06"], "script": ["Script", "D9EAD3", "38761D"], "input": ["Input", "EFEFEF", "595959"] }
}
```
