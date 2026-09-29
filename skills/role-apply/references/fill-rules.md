# Fill rules

Per-field discipline. The theme: an application form is a **restatement** of the resume
under a different schema. It never revises it, and it never contains a fact that exists
nowhere else.

---

## The order, and why

**Resume upload first.** Almost every modern portal parses the PDF and prefills the form
from it. Typing first and uploading second means the parser overwrites correct values
with its own guesses, silently, and the form looks finished while being wrong.

**Then read every prefilled field before touching anything else.** Treat the parse as an
adversary that is right most of the time. Known, repeatable failures:

- A **dual degree** collapses into one degree, and most forms have room for exactly one.
  When there is one slot, use the primary degree and put the second in an "additional
  major" or free-text field if one exists.
- The **second major disappears** entirely.
- **Date ranges** parse backwards or lose the month on the "to Present" rows.
- **A job title that names a degree** sometimes parses as that degree. Education level
  must say the degree actually held.
- Multi-line bullets with a bullet glyph occasionally carry the character into the field.
- **A "to Present" row can be stale.** Before restating a current role from the résumé,
  compare the PDF's modified date with the operator's LinkedIn experience page. If
  LinkedIn says the role has ended, enter the newer fact and flag the stale résumé in the
  handoff.

---

## Fields that are traps

**The uploaded filename.** Whoever opens the application sees it. Upload the
résumé as a plain `Firstname_Lastname_Resume.pdf`, with no version or variant suffix
(`_v3`, `_final`, `_new`), because the filename is not the place for bookkeeping. If
variants must sit side by side, give each its own folder, and never rename the operator's
files.

**Name casing.** A résumé that prints the name in capitals as its header gets copied
literally into First/Last Name by resume parsers, so the form ends up shouting. Overwrite
with proper case from `profile.yaml`, then read the field back — some portals re-run the
parse a moment after upload and clobber the correction. The résumé's typography is not the
operator's name.

**Expected graduation.** Must equal `education.graduation_date` in `profile.yaml`, which
is also the month and year every résumé variant prints: variants differ in emphasis, never
in facts. A form disagreeing with its own attachment is the cheapest avoidable error in
this whole process.

**GPA.** A résumé may print a major or technical GPA, which is not the same as cumulative
GPA. When a form asks for "GPA" unqualified it means cumulative. If `profile.yaml` still
says `ASK` for cumulative, ask — do not enter the major GPA under a cumulative label.

**Work authorization and sponsorship.** Two separate questions, often worded as near
opposites ("are you authorized to work in the US?" and "will you now or in the future
require sponsorship?"). Answer both from `profile.yaml`, never infer one from the other,
and never infer either from the school or the name. A wrong answer here is disqualifying
in both directions and cannot be walked back after submit.

**Self-identification — gender, race, veteran, disability.** Copied verbatim from
`profile.yaml`, never inferred, never left to a default. If the profile says decline to
self-identify, select exactly that option rather than skipping the question. The
disability form (US federal CC-305) is a separate legal document inside the application
and often includes a name-and-date signature line — that line is the operator's.

**Salary expectation.** Not a lookup. Ask every time; the right number depends on the
role and the season and a stale one on record is worse than a blank.

**"How did you hear about us?"** Factual, usually required, usually a dropdown. Ask.

**Start date.** A specific date, not "flexible", when the field demands one. Ask if the
profile says `ASK`.

---

## Things never to do

- **Never press submit**, or the final "next" on the last page of a multi-page form, or
  any e-signature or certification control. Fill, screenshot, hand over.
- **Never type a password, create an account, or solve a captcha.** Stop and hand over.
- **Never accept terms, certify accuracy, or consent to a background check** on the
  operator's behalf. These are the operator asserting something about themselves.
- **Never enter a value that is not in `profile.yaml` or given this session.** If it has
  to be asked, ask — and then write it back into `profile.yaml`, or the next application
  asks again.
- **Never paste the same free-text answer into two roles at the same firm.** One reader
  sees both.
- **Never fill an optional free-text box with filler.** An empty optional box costs
  nothing; a paragraph of nothing costs credibility.

---

## The stale-listbox trap

React dropdowns on these portals **linger in the DOM for several seconds after a selection**,
and a closed-but-not-yet-removed list is still matchable. So a helper that selects by text —

    [...document.querySelectorAll('li,[role=option]')].find(e => e.innerText.trim() === 'No')

— can match the **previous question's** list and silently answer the wrong question. Every
Yes/No question on a form is a collision waiting to happen, because they all contain "No".

Two defences, use both:

1. **Scope the search to the list that belongs to the field you just clicked**, not the whole
   document. Or select by screen position within the visible open list rather than by text.
2. **Verify by reading the page back**, field label next to field value, after every few
   fields — never trust the return value of the picker alone. A picker that says `OK No`
   proves only that it clicked something called "No".

The same lingering list also swallows the next click, so roughly half of all clicks need
repeating. One dropdown per batch, and re-screenshot between them.

## Mechanics

- `read_page` before acting, and again after any step that re-renders. Target by `ref_N`,
  not coordinates — portals re-render on every field change and coordinates go stale
  without any visible sign.
- `form_input` for typed values and selects; `computer` clicks for radios, checkboxes and
  custom dropdown widgets that ignore programmatic value-setting.
- **Custom dropdowns** (React comboboxes, Workday's especially) need click → type →
  click the option. Setting the value directly leaves the visible text right and the
  underlying form state empty, which passes a screenshot review and fails on submit.
- `file_upload` for the resume. Confirm the filename appears on the page afterwards —
  an upload that silently failed looks identical to one that worked.
- After each page of a multi-page form, re-read the page and confirm the previous page's
  values survived. Workday in particular drops values on back-navigation.
- Screenshot the completed form before handing over, scrolled so the submit button and
  the unchecked legal boxes are visible.
