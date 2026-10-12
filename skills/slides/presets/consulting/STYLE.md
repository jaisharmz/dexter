# Consulting preset

For a case presentation, a strategy recommendation or a client readout: an argument made to a
room that will push back. 13.333 x 7.5 in (16:9 widescreen), white with navy for the title and
recommendation slides. `deck.py` builds it with python-pptx.

## The look

| What | Value |
|---|---|
| Title | Outfit Medium 38 pt, ink #101824: a short topic in the presenter's words ("The Gap", "Rebuttals"), one line |
| Subtitle | Outfit 24 pt italic, grey #4F5B66, in the same text box: the point of the slide as a short phrase |
| Title rule | A thin grey rule under the title with a short thick accent segment at its left |
| Body | Outfit Medium 20-24 pt. Nothing under 15 pt; the source line is the only 15 pt text |
| Bold | Outfit Bold, for labels, verdicts and the column that carries the argument |
| Accent | One blue #223AE6 for labels, banners, bars and "ours". Orange-red #D2451F only for the problem, the critic or "not delivered"; green #15704A for "holds" |
| Banner | Solid accent bar near the foot, one white bold sentence. Only where the slide lands one sentence |
| Tables | Drawn with rules alone: a dark rule under the header, light rules between rows, no fills except a pale row for "ours" |
| Source line | 15 pt grey at the foot: which exhibit or document the evidence is from. Page numbers go in the notes |
| Title and recommendation slides | Navy #0B1433 with a blue strip across the top; concentric rings on the title slide |

## Slide patterns in deck.py

- **Standard of comparison** (`numbered_rows`): 01-04, the criteria the answer will be judged
  on. Put it up front: whoever sets the yardstick frames the debate.
- **The argument** (`label_rows`): one claim in bold, then its independent legs, each with its
  own source. Break one leg and the rest still stand.
- **Rule table** (`rule_table`): claim vs reality, assumptions vs evidence vs "if we're wrong",
  with the verdict column colored.
- **Share bars** (`share_bar`) and **big numbers** (`big_numbers`): how much of the business the
  point touches.
- **Process** (`stages`): a customer decision process or value chain, the stage where the claim
  works in accent, the stage where it breaks in red.
- **Flowchart** (`flow`): boxes and glued connectors, today's path vs the proposed one.
- **Scorecard** (`scorecard`): every rival option scored with dots on the standard of comparison.
- **Objections** (`objection_rows`): their best answer → why the point holds.
- **Pillars** (`pillars`): three to five parallel moves under icons.
- **Recommendation** (`horizons`): short, medium and long term on navy, each with Why, Owner and
  Metric.
- **Works cited**, then hidden **backup** slides (`hide`) with every number and its page.

## How to argue

- Lead with the answer (the title slide's subtitle), then the standard of comparison, then the
  evidence. Argue why as well as what.
- The argument stands on several independent legs, so no single assumption carries it. Name the assumptions, show
  the evidence for each, and say what survives if each is wrong.
- Read the source line of every exhibit before attributing it: a table "compiled by the case
  authors" belongs to the case.
- Answer the other side's best rebuttal on the slide. Never attack the other team or the board.
- Break the recommendation into short, medium and long term, each with an owner and a metric.
- Speaker notes carry the timing ("About 45 seconds"), the page numbers and the full sentences.

## Writing

Titles are short topics ("Rebuttals"), and the subtitle carries the point in a phrase. A
full-sentence headline in the title slot reads as generated. Bullets are phrases with arrows (→)
and no final period. No kicker labels above titles, no page numbers on slides. If a slide looks
thin, add an argument or a piece of evidence.
