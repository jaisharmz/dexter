---
name: handwritten-notes
description: Turn a photo or scan of handwritten notes (a notebook page, a whiteboard, a printed handout someone wrote on) into a faithful transcription plus an organized version filed where it belongs, check each fact against the materials the notes are about, and act on what the notes change. Use when the operator sends a picture of notes, says "here are my notes", "transcribe this", "organize my notes", "what did I write here", or drops a phone photo of a page into a chat; and when a scanned PDF turns out to be handwriting.
argument-hint: "<image or pdf path(s)> [context: course | meeting | project | person]"
user-invocable: true
---

# Handwritten notes

A page of notes is two things at once: a record of what was said, and usually a change to a
plan. The skill keeps both. It writes down exactly what the page says, marks what it cannot
read, checks the page against the sources it refers to, files the result next to the work it
belongs to, and then says what the notes change.

    photo  →  faithful transcription  →  checked against sources  →  organized + filed  →  what changes now

## 1. Keep the original

Copy every image or PDF, unchanged, into the folder the notes belong to (step 4 decides which),
as `handwritten/YYYY-MM-DD_<slug>.<ext>`, dated by when the notes were taken, not when they
were sent. The transcription goes beside it as the same name with `.md`. The original is the
evidence; a transcription can be wrong, the photo cannot.

Handwriting photos carry personal data (names, phone numbers, grades, other people's words).
They go in the operator's private space, never in a public repository or a published page.

## 2. Transcribe faithfully, before organizing anything

Read the image yourself. Machine OCR reads handwriting badly; use it only as a hint for
printed text on the same page.

- **Line by line, in the author's structure.** Keep headings, numbering, indentation, bullets,
  underlines (as bold), arrows (→), and crossed-out text (as ~~strikethrough~~). Keep the
  author's abbreviations and spelling; fix only an unambiguous slip, and never a claim.
- **Mark doubt in place.** `[?word]` for a best guess, `[illegible]` for a word you cannot read,
  `[illegible, ~3 words]` for a run. Never smooth over a hole with a plausible word.
- **Diagrams in words.** Name the nodes and the arrows: "four boxes, A to D, arrows between all
  of them". Copy any labels exactly.
- **Asides as asides.** "(actually maybe no)" stays in, because it is the author changing their
  mind.
- **Dense or faint pages:** cut the page into overlapping tiles at twice the size with
  `python3 scripts/tiles.py <image>` and read each tile. A whole page at phone resolution hides
  small words.
- **Several pages:** one transcription per page, in page order; a PDF becomes images with
  `pdftoppm -r 200 -png`.

## 3. Check it against the sources

Notes are a lossy copy of something else: a lecture, a meeting, a handout, a conversation. Find
the original where it exists and compare.

- **Resolve the ambiguous.** A term, name or number that could be read two ways is settled by
  the source: the syllabus, the slides, the email thread, the person's profile. Say which source
  settled it.
- **Annotate, don't overwrite.** Add the check in brackets after the line: `[confirmed by the
  study guide]`, `[the slides say 1979, not 1981]`, `[not in any source; ask]`. The transcription
  stays what the author wrote.
- **Look for a newer source.** Notes from a meeting or class are often followed by an official
  document (a posted study guide, minutes, a follow-up email) that supersedes them. Check for
  one before acting on the notes alone.

## 4. Organize and file

Below the transcription, write the organized version, grouped by what each line is for, not by
where it sat on the page:

| group | holds | goes to |
|---|---|---|
| Facts and logistics | dates, formats, rules, numbers | the project's README or plan |
| Concepts | definitions, frameworks, arguments | the study or project notes |
| Lists | enumerations worth keeping whole | kept whole, in order |
| Actions | anything someone must do | the queue, one item each, with an owner |
| Open questions | what the page or the sources left unresolved | asked once, in one message |

File by context: a course's notes in that course's folder, a meeting's in the project it is
about, notes about a person in that person's file. When nothing fits, use a dated folder of
loose notes.

## 5. Say what the notes change

The reason someone photographs notes is usually that the notes change what happens next. End
with a short "What changed" section: the plan, scope or deadline the notes alter, and the work
that follows from it. Then do that work, or queue it. A transcription that changes nothing
downstream is a filing job; one that changes the plan is the start of a task.

## 6. Report

In chat: where the files went, every `[?]` and `[illegible]` mark with its line (or "every word
was legible"), what the sources confirmed or contradicted, and what changes. Ask about the
unreadable parts once, together, only if they matter to what happens next.

## Files

    scripts/tiles.py    split a page photo into overlapping 2x tiles for reading small writing

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record handwritten-notes "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
