# Slide style profile (example)

Copy to `style.md` in this folder and fill it in from the operator's own decks
(`scripts/measure_decks.py`, see SKILL.md). `style.md` is this skill's memory of one person:
read before every deck, updated in the same run whenever they correct a slide. It is not
shipped with the skill.

Two parts. The prose says how the operator builds slides and what they have corrected. The
`json` block holds the numbers `assets/deck.js` builds with; keep the two in agreement.

## Source decks

- Where their decks live, which were measured, and which were skipped because a company,
  course or client template made them look the way they do.

## Rules they have stated

Corrections in their words, newest first, each with the date. These outrank the numbers
below and anything generic in SKILL.md.

- YYYY-MM-DD: "…" → what to do differently.

## Measured

| What | Value | Seen in |
|---|---|---|
| Title | font, size, position | n of m decks |
| Subtitle | same box as the title? size, italic, offset | |
| Body | font, size, colors | |
| Bold | which font, where it is used | |
| Code and examples | font, colors | |
| Takeaway device | banner? color, size, position, text size | |
| Boxes and diagrams | fills, borders, arrow color | |
| Lists | bullet glyphs by level, numbered lists | |
| Images | borders, captions, image-only slides | |
| Title slide | layout, sizes, author line | |

## How they write

Ten real bullets and five real titles, copied verbatim from their decks. New text should read
like these.

- "…"

## Tokens

```json
{
  "fonts": { "body": "Arial", "bold": "Arial", "code": "Courier New" },
  "sizes": { "title": 28, "subtitle": 20, "body": 18, "banner": 16, "caption": 14, "code": 12, "minimum": 10 },
  "colors": { "text": "000000", "muted": "595959", "accent": "1155CC", "code": "38761D", "codeHighlight": "1155CC",
              "box": "EFEFEF", "imageBorder": "B7B7B7", "arrow": "595959", "background": "FFFFFF" },
  "banner": { "fill": "1155CC", "text": "FFFFFF" },
  "layout": { "titleX": 0.43, "titleY": 0.3, "margin": 0.5, "bannerY": 4.74, "bannerW": 8.7, "bannerH": 0.56 },
  "bullets": ["25CF", "25CB", "2605"],
  "flags": { "agent": ["Agent", "FCE5CD", "B45F06"], "script": ["Script", "D9EAD3", "38761D"], "input": ["Input", "EFEFEF", "595959"] }
}
```

`bullets` are Unicode code points for levels 0, 1 and a highlight (● ○ ★ above). `flags` are
label, fill and border for the tags that say who does each step of a flowchart.
