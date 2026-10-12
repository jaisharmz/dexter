---
name: kindle
description: Read a book the operator owns in Kindle for Mac without taking over the screen, to find passages, get the print page number for a citation, or read a chapter as text. Every key goes to the Kindle process directly and every read goes through the accessibility tree, so the operator keeps working in other apps while it runs. Use when the user says "it's on my Kindle", "find the page for this quote", "pull chapter N from the book", "what page is that on", or needs a course book that exists only in Kindle for an essay, a fact check or a citation.
argument-hint: <book title prefix> [search "<phrase>" | page "<phrase>" | read chapter <N>]
user-invocable: true
---

# Kindle

Kindle for Mac draws its pages in a view that screenshots and OCR read badly. Two things it
does expose are enough for a reader: the accessibility tree holds the exact text of the
spread on screen, and the in-book search lists every hit with its **print page number**
whenever the edition carries them. Keys posted to the Kindle process by pid turn pages and
open the search without bringing the app forward, and the toolbar's buttons can be pressed
through accessibility.

One driver does it all: `scripts/kindle.sh`. Its Swift helpers compile on first use into
`~/Library/Caches/kindle-skill`.

## Before the first run

- `scripts/kindle.sh doctor` checks the app, the window and the permissions.
- The app is "Amazon Kindle" and its process is `Kindle`. It has to be running (`open -a
  "Amazon Kindle"`), and the book has to be downloaded to this Mac, which the library shows
  with a check mark.
- The app running the shell needs Accessibility permission, for reading the tree and posting
  keys. `shot` also needs Screen Recording. If either is missing, the operator grants it in
  System Settings > Privacy & Security. Never script that change yourself.
- `open` works from the library view, and `library` closes the open book first. It presses the
  book in the bar of recent books along the bottom, then its tile in the grid, which does not
  always open it. A book in neither place gets opened by hand once.

## Find a passage and its page

```
scripts/kindle.sh search "comparative advantage"
scripts/kindle.sh page "Comparative advantage isn"
```

`search` prints `Page N<TAB>snippet` for each hit, grouped under `## <chapter>` lines. The
first heading also shows the total hit count. Books without print pages say `Location N`
instead, and a location is not a page: cite those by chapter, or tell the operator.

- **Only the hits on screen come back**, about a dozen. A common word gives a partial list,
  so search for a distinctive phrase.
- **The page is where the hit starts.** A quote that runs across a page break needs a second
  search for its last words. If the two pages differ, cite the range (`180-81`).
- **Searching for the opening words of the quote** finds its page directly. Stop the phrase
  before any apostrophe: the book's are curly, and a straight one in the query matches
  nothing. `Comparative advantage isn` finds "isn't".

## Read a chapter

```
scripts/kindle.sh goto "<a phrase near the chapter's start>"
scripts/kindle.sh read 25 --until "<the next chapter's title>" > chapter.txt
```

`goto` jumps to the first hit and closes the search panel. `read` prints the text of each
spread, turns the page, and stops at the `--until` text, which it cuts off, or after the
maximum number of spreads. A full-size window shows three to four print pages per spread. The text has no
page numbers, so get those from `page` for anything that will be cited.

`text` prints only the spread on screen, and nothing while the search panel is open. `where`
reads the progress bar ("Page 153 , 43%", the left page of the spread). `next` and `prev`
turn pages, `library` closes the book, and `shot out.png` captures the Kindle window even
when other windows cover it.

## Rules

- **Never take the screen.** No `activate`, no clicks at screen coordinates, no keys sent
  to the frontmost app. Everything here goes to the Kindle pid or through the
  accessibility tree. If a step seems to need the real mouse, stop and ask the operator.
- **The book is the operator's own copy, for their own work.** Quote short passages with
  page numbers. Keep extracted chapters in scratch space rather than in a repository, and
  don't paste long stretches of a book into anything shared or published.
- **Verify before citing.** Each quote in a deliverable goes through `page` once, and the
  page goes next to it.

## Quirks the driver handles

- **The toolbar is in the tree only while it shows.** It holds In-book Search, Close Book,
  Table of Contents and the progress bar. Pressing the page view through accessibility shows
  or hides it, and `where` and `library` do that and put it back.
- **After a jump, Find goes disabled.** A results bar ("Result 1 of N", Back, Forward,
  Close) stays at the bottom until it closes, and `goto` closes it. Its button is called
  "Close", and the toolbar also has "Close Book", so the driver matches that name exactly.
- **Return sometimes misses the search field**, and the panel keeps the last query's hits.
  `search` checks that the snippets contain the query and retries after an escape.
- **Don't post mouse clicks.** One click at the bottom edge opened a "Recent places"
  popover that swallowed every key until an escape closed it. If keys stop working, run
  `kindle.sh escape` and try again.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record kindle "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
