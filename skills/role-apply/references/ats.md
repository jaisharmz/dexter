# Portals

Identify the portal from the URL before starting — it decides how much can go wrong.

| portal | tell | difficulty |
| --- | --- | --- |
| Greenhouse | `boards.greenhouse.io`, `job-boards.greenhouse.io`, or an embedded `#grnhse_app` iframe | easy |
| Lever | `jobs.lever.co` | easy |
| Ashby | `jobs.ashbyhq.com` | easy |
| SmartRecruiters | `careers.smartrecruiters.com`, `jobs.smartrecruiters.com` | moderate |
| Workday | `*.myworkdayjobs.com` | **hard — read this section** |
| Custom / in-house | trading firms often build their own | unpredictable |

---

## Reading a board without a browser

**Ashby and Greenhouse careers pages are JS-rendered and return nothing to a fetcher. Their
JSON APIs return real titles, locations and the full description text:**

    https://api.ashbyhq.com/posting-api/job-board/<slug>
    https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true
    https://api.lever.co/v0/postings/<slug>?mode=json

**Workday too, and it carries a field the page does not.** POST to
`https://<tenant>.<pod>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs` with
`{"appliedFacets": {...}, "limit": 20, "offset": 0, "searchText": ""}`; the facet ids come
straight out of the query string of any filtered careers URL. GET the same base plus a
posting's `externalPath` for the detail record, which carries **`startDate`**.

`skills/role-sourcing/scripts/workday_feed.py` wraps both calls.

**`startDate` is the eligibility field, and it is invisible on the rendered page.** NVIDIA's
NCG reqs state no graduation window anywhere in the body — only a year in the title — so the
start date is the only unambiguous gate: *Backend Compiler Engineer — New College Grad 2026*
has `startDate = 2026-07-13`, which settles it for a candidate graduating the following
spring without arguing about the title. Check it before reading a title year as a
rejection, and before reading a live req as an open cycle: NVIDIA leaves reqs up months
past their own stated application window.

These feeds are how to read requisitions in bulk, and they are the only way to grep
eligibility text at scale — which matters, because the rule that predicts whether a new
grad is eligible is *"a digit followed by + years"* in the body, not anything in the title.

**Slugs are not guessable and a wrong one silently returns a different company.** Observed:

| you would guess | it is actually | what the wrong slug returns |
| --- | --- | --- |
| `applied-intuition` | **`applied`** | nothing |
| `genesis-ai` | **`genesis`** | nothing |
| `mistral` | **`mistral.ai`** | nothing |
| `runway` | **`runway-ml`** | a **business-planning software** company, not RunwayML |
| `odyssey` | **`odysseyml`** | a different company |
| `turing` | — | **Turing.com**, a US staffing firm, *not* Turing Inc. Japan |
| `skildai` | **`skildai-careers`** | nothing |
| `decart-ai` | — | 302s to the Ashby root; the board is unpublished |

Some companies have **no ATS at all** and the careers page is the whole story: Field AI (a
$405M company whose page names five hiring divisions and lists nothing), Hillbot (`/careers`
returns HTTP 200 with a 404 body — a Nuxt soft-404), Overworld (one Tally form), Jacobi (three
DocSend links), Groq (a Gem resume form only). **A missing board is information, not a dead
end** — at those companies the only route is a person.

**And a company's own page can disagree with its own board.** Skild's careers page renders
"Current Openings • 00" while their Greenhouse board carries 62 reqs. Generalist's page lists
23 roles while the public Ashby API returns 10, including one req that is not publicly
applicable. Read both before deciding what is open.

---

## Greenhouse

Single page, plain HTML, resume parse is mild. The EEO block sits at the bottom as a
separate fieldset with its own selects — fill it from `profile.yaml` rather than letting
it default. Custom questions the company added live between the resume block and EEO and
are frequently required without being marked.

The iframe version (`#grnhse_app` embedded in the company's own site) sometimes needs the
direct `boards.greenhouse.io` URL instead — if fields will not take input, open the
posting's canonical URL in a new tab.

Greenhouse's React-select dropdowns on `job-boards.greenhouse.io` list their options in
the listbox their input's `aria-controls` names (`react-select-<id>-listbox`). Read that
one, because a page-wide `[role=option]` query also returns the phone widget's hidden list
of about 240 countries. In a tab that is not in front, JS `focus()` plus typing sends
nothing. What works every time: `find` the combobox by its label to get a ref, `scroll_to`
that ref, `left_click` it (which opens the menu and fronts the tab), type the option text,
confirm which option in the listbox has the focused class, press Return, and read
`.select__single-value` back. The Location (City) field can sit on "Loading..." for 5 to
10 seconds before it offers suggestions, so give it that long.

More from real runs on `job-boards.greenhouse.io`:

- **Never press Return inside a dropdown.** With no option highlighted it submits the form,
  and the failed attempt leaves "is required" errors that stay after valid picks. Open each
  dropdown with a click and choose the option by clicking it, scoped to the open listbox,
  because closed lists such as the phone-country list stay in the page. After a stray
  submit, reload and refill.
- **Never set a react-select's value by script** (native setter plus an input event). The
  async School and Discipline lists then sit on "Loading" until the page is reloaded. Pick
  each option by dispatching mousedown, mouseup and click on the option element.
- **Fill the education block before the first Submit.** School, Degree, Discipline and the
  end month and year can sit after the location fields, where a quick label scan misses
  them, so read the board API's education setting or search for their refs. A Submit before
  the block is filled leaves "is required" errors that may clear on the next Submit or may
  need a reload and a full refill.
- **"Cannot read properties of undefined (reading uploadFile)"** under Resume/CV means the
  attachment failed even though the input holds the file. Load
  `job-boards.greenhouse.io/embed/job_app?for=<board>&token=<id>` fresh and attach the
  résumé before typing anything.
- **Click Submit by its ref from `find`,** not by computed coordinates. When the window
  changes size, the screenshot frame and the page's `innerWidth` stop matching and a
  computed click lands on nothing.
- **A message that a verification code was sent to confirm you are a human** is a bot
  check. Leave the filled tab open and hand it to the operator (`runs.md`).
- **A company's own careers page can embed the form with hidden native radios.** Set them by
  clicking the input's label through script, and check the résumé again after upload,
  because the form can re-render and drop the file.

## Lever

Single page, simplest of the lot. "Additional Information" is a free-text box, usually
optional — leave it blank unless there is a specific fact with nowhere else to go. The
links section (LinkedIn / GitHub / portfolio) is separate fields, not one box.

## Ashby

Single page, React. Every field is a controlled component: use `form_input` where it
works, and fall back to click-then-type for the combobox-style selects. Resume parse is
aggressive and prefills a lot — re-read everything after upload.

Attach the résumé through the Resume field's own file input, not the "Autofill from
resume" box: the parser then never runs, so it cannot overwrite what was entered (a name
header in capitals, for one). To compare sibling postings' questions without leaving a
filled form, POST the `ApiJobPosting` query to `/api/non-user-graphql` from the
`jobs.ashbyhq.com` tab. Same-titled variants can carry different screening questions,
such as a Master's-or-PhD yes/no that the plain posting does not ask.

More from real runs on Ashby:

- **Type email, phone and URL fields with real keystrokes.** The native value setter
  registers for the name field but not for these, and Submit then fails with "Missing entry
  for required field". Wait about five seconds after the résumé upload, then use a ref
  `triple_click` followed by `type` (no cmd+a in between), and read each value back.
- **Yes/No buttons and radio groups can desync.** A click shows the option pressed while the
  form still reports the field missing. Answer with real clicks by ref and read
  `aria-pressed` back. If it desyncs, click a different option first, then the right one.
- **The first URL field after the résumé** (usually LinkedIn) can lose its value in form
  state after the parse while the input still shows it. Retype it (ref `triple_click`,
  `type`, Tab) and submit again.
- **Blur the focused input before scrolling Submit into view.** When the tab comes to the
  front, Chrome scrolls back to the focused field and a coordinate computed a moment earlier
  lands on nothing. If neither a JS click nor a ref click on Submit does anything, click the
  button's rect center times (screenshot width / `innerWidth`) right after a screenshot.
- **Success text varies by company** ("successfully submitted", "Thanks for applying", "has
  been received"). Detect the Success heading in `document.body.innerText` and read the
  sentence after it.
- **"There was a problem with the network connection"** did not create an application, so
  reload and refill once. After a second failure at the same organization Ashby can switch to
  "Application submission is unavailable at this time", which is a rate limit. Move to
  another company and retry hours later, never in a loop.
- **Read the application-limit notice before choosing roles.** It appears only on the
  application page, so grepping postings misses it. POST
  `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting` asking for
  `jobPosting.applicationLimitCalloutHtml`. Notices seen in September 2026: OpenAI 5
  applications per 180 days, Cohere 5 per 90, Mistral 3 per 90, Harmonic 3 roles per 90,
  Mercor and Deepgram 2 per 60, Supabase 3 per 60, and Sierra one across its new-grad roles.
  Limits can differ between groups of roles, so query the posting itself.
- **A cap can exist with no notice.** A company can refuse a second role at Submit ("you
  have applied for a position in this domain within the last 90 days"), and no application
  is created. Treat it as the company's policy, record it, and move on.
- **Read `employmentType` before queueing.** A plain "Software Engineer" title can be a
  contract posting.

## SmartRecruiters

Often wants an account or offers "apply with LinkedIn". Take neither — account creation
and OAuth consent are both the operator's. Use the plain form path. Multi-step with a
progress bar; values do survive back-navigation.

## Workday

The one that loses work. Read before starting.

- **Almost always requires an account** to apply. If one does not already exist in the
  operator's Chrome session, **stop and hand over** — do not create it. This is the
  single most common blocking point, and it arrives before any field can be filled.
- **Multi-page**, typically: My Information → My Experience → Application Questions →
  Voluntary Disclosures → Self Identify → Review. The **Review page is not submit** —
  fill it, stop there, and hand over with Submit visible.
- **Dropdowns are custom widgets.** Click to open, type to filter, click the option.
  Setting a value programmatically leaves the display text correct and the form state
  empty; it passes review and fails validation on submit.
- **Back-navigation drops values.** Re-read each page after moving between them.
- **The resume parse populates the entire Experience section** as editable rows and gets
  a dual degree and the "to Present" date ranges wrong. Budget real time for correcting
  it; do not skim.
- **Country/phone-code selectors** reset to the portal's default. Set United States and
  `+1` explicitly.
- Sessions time out. On a long application, do not leave it idle mid-fill.

### Greenhouse inside someone else's page (the iframe trap)

Some companies embed the Greenhouse form as a **cross-origin iframe** on their own careers
page. `read_page` and `find` see nothing inside it — they return only the host page's
chrome — and `file_upload` has no `ref` to target, so the resume cannot be attached. Do not
fall back to blind coordinate clicking.

**Promote the iframe to a top-level page instead:**

    javascript_tool: const f=[...document.querySelectorAll('iframe')]
      .find(x=>x.src&&x.src.includes('greenhouse')); window.location.href=f.src; 'navigating'

The whole form then becomes readable and `file_upload` works normally. Wait for the host
page to finish loading first — the iframe is injected late, and running this too early
throws `Cannot read properties of undefined`.

Do **not** try to rebuild the URL by hand. The src carries a signed, single-use
`validityToken` alongside `for` and `token`; a URL assembled from the parts you can read
redirects to `job_board?error=true`. Navigating to the live `f.src` works because it is
the exact string the page was served.

Note also that the public board (`job-boards.greenhouse.io/<company>`) may 302 back to
the company's own site, so it is not a way around this.

### In-house portals built from custom widgets

Trading firms and other in-house builders reuse a few widget patterns, and each of these
cost time on a real form:

- **The form can be hidden until you start.** Some portals keep the form `display:none`
  until "Start Application" is clicked, and values written before that reveal are
  discarded. Click first, fill second.
- **The résumé input can be `display:none`.** `file_upload` needs a ref, and `read_page`
  will not give one for a hidden input. Unhide it first, then upload:

      javascript_tool: const f=document.querySelector('input[type=file]');
        f.style.cssText='position:fixed;top:0;left:0;width:200px;height:40px;opacity:1;z-index:99999';

- **Custom React selects need a real click to open and a JS dispatch to choose.**
  Coordinate clicks on options are unreliable: the list re-renders and animates, so a
  coordinate measured one call earlier lands on the neighbouring option. Open with a real
  click, then dispatch on the exact label, searching only the list that just opened (the
  stale-listbox trap in `fill-rules.md` is why):

      const el=[...list.querySelectorAll('li,[role=option]')]
        .find(e=>e.innerText.trim()==='<exact label>');
      ['pointerdown','mousedown','pointerup','mouseup','click']
        .forEach(t=>el.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window})));

  Never `scrollIntoView` then click by coordinate. Typing filters the searchable lists
  (school, discipline, country) but not the fixed ones (GPA bands, months, Yes/No); for
  those, dispatch on the exact label.
- **A dropdown can jam open** and cover the fields and Submit beneath it. Escape, Tab,
  outside clicks and the chevron can all fail to close it. What works is selecting a value
  in a *different* combobox, which closes the stuck one.
- **Two-layer selects lie to a DOM read.** A hidden native `<select>` (opacity 0, about 2px
  wide) can sit behind a visible `<a class="select-selected">` and `<ul>`. Setting the
  native value passes `checkValidity()` while the visible control still reads
  "-- Select --", so a verify pass that only reads input values reports success on a form
  the recruiter sees as empty. Click each widget's own `<li>` and confirm both layers agree.
- **Repeatable fields hide behind an Add control.** A links input named like
  `profile[optional_links][]` is an array with one visible box and an **Add Link** button.
  Put one bare URL per box rather than concatenating them into the first with separators,
  and assume any repeatable section (education, competing processes) works the same way.
- **Employer and school typeaheads can wipe on blur** unless a suggestion is picked. Type
  with real keystrokes and pick the suggestion, even when its casing differs from the
  résumé's, over a "Not listed?" fallback.
- **Re-uploading the résumé mid-form can clear parsed fields** such as school, discipline
  and start year. If the file is swapped after those are filled, re-fill and re-verify
  them. Chrome's own autofill may pre-populate the name fields before you touch anything,
  so check them even when the portal's parser behaves. Take click coordinates from a fresh
  screenshot every time, because a resized window silently moves cached coordinates onto
  the wrong field.
- **Parsing can differ between sister firms.** One sets `disable_parsing=true`, so no
  résumé parse runs and the name-casing trap does not apply, while its sibling parses.
  Check the name fields either way.
- **"A single application for our program" is not always a limit.** It can mean one form
  covers several roles through a role dropdown plus an "other roles" multi-select. Read
  the form before applying twice.
- **Have these answered in `profile.yaml` before starting a trading-firm form**, where
  they are often required: SAT and ACT (each usually with an "I don't have X score"
  opt-out), high-school graduation year, a GPA band, the graduation range, both
  sponsorship questions, prior-application history, current offers, further-education
  plans, university email, and a preferred office with alternates.
- **A Cloudflare Turnstile beside Submit** may verify itself without interaction. Never
  attempt one that demands interaction.

### Session-based portals with role bundles

- **Some forms cannot be opened directly.** The bare URL says the link is invalid, so
  start from the job page and click Apply, which injects the requisition.
- **Adding a role can empty the bundle.** A "Find additional jobs" link can silently drop
  the roles already chosen. Load the next posting with the first one's id in the query
  string (`?jobs=<first_id>`) and use the portal's own "add job to your application
  bundle" control.
- **A writing sample is not an essay prompt.** A request for "an expository piece…
  entirely your own work, unedited by anyone else" is not cleanly met by a co-authored
  paper. Flag it and let the operator choose.
- **Longer variants ask about compensation** history and expectations. Leave them
  unfilled, and out of any bundle, until the operator gives the numbers.
- **Picking a university can surface a required "College" field** that was not there
  before. A dual degree can span two colleges, so flag which one was entered.
- **Honors can be a closed vocabulary**: Phi Beta Kappa and the Latin honors, with no free
  text and no "Other". Leave it blank. Never map a different honor onto the nearest
  option or assert one the operator may not hold.
- **No field for employment descriptions** means achievement lines live only on the
  résumé.
- **The submit control may not say Submit.** One portal labels it "Finish". Whatever
  finalizes is the operator's, along with the final legal acknowledgment checkbox.

### Follow-up data-completion forms (Avature and similar)

A short first application (name, email, phone, CV, "How did you hear about us?") can be
followed by an emailed data-completion form, for example on Avature
(`<org>.avature.net/DataCompletionRequest?uid=…`).

- **The form follows up an application already on file**; it does not start a new one.
  Skip the role multi-select, leave the contact details the firm prefilled unless `profile.yaml` names a
  different address for applications, and attach the same résumé variant as the original.
- **It has no account and can expire**: one lapsed 120 minutes after load. Fill it in one
  sitting, from one payload (see *Mechanics that hold across portals* below).
- **Rows repeat.** School and Degree are select2 searches: click the widget, type, press
  Enter, or in a hidden tab use the select2 note below. With no combined-degree option, a
  dual degree takes two rows. Experience rows use `type=date` inputs; fill them by id with
  ISO dates, and never touch the ids ending in `-sample`, which are hidden templates.
- **Expect questions a profile rarely answers**: ML areas, project sizes (lines of code,
  data size, your share), most significant accomplishment, publications read, a languages
  table (years of use and lifetime lines of code), preferred coding harness, non-compete,
  managerial status, relocation. Ask once and write the answers into `profile.yaml`.
- **A required privacy-policy checkbox** follows the CV upload. Leave it for the operator.

### Hard account walls

Some large companies' careers sites redirect "Apply" to their own identity login, with
sign-in, account creation or Google/GitHub OAuth as the only paths: no guest apply and no
email-only route. The operator must sign in before any filling is possible.

## Trading firms and in-house portals

Market makers commonly build their own, and they are unpredictable in specific ways:

- **A timed online assessment** (HackerRank, CodeSignal, an in-house market-making game)
  may be triggered *by* the submit, or offered immediately after. The operator takes it.
  Never start one.
- **Desk or strategy preference rankings** — a strategic answer, not a lookup. Ask.
- **Multiple roles at one firm** are sometimes one application with a preference ranking
  rather than separate submissions. Check before applying three times; some firms count
  applications against the candidate.
- **Reapplication windows** — several firms block a re-application within 6 or 12 months
  of the last one. `state/applications.jsonl` is what prevents walking into this.

## Mechanics that hold across portals

These held on real runs and apply beyond any one firm.

- **Hidden tabs throttle timers.** Tabs the browser tools open are often hidden
  (`document.visibilityState` is `'hidden'`), which throttles page timers: select2 AJAX
  searches stall at "Searching…" and JS calls that await `setTimeout` hit the 45 s CDP
  timeout. Wait with `computer` `wait` between synchronous JS calls, and set a select2
  widget through its own ajax config (`jQuery(s).data('select2').options.options.ajax`):
  call it, append the returned Option, and trigger `change`.
- **Keep the tab group intact.** Never close the other tabs in the Claude-in-Chrome group
  while a filled form sits in one of them. Closing down to one tab can drop the group and
  strand the form out of reach, so close scratch tabs only after the handoff.
- **Keep each long form as one payload.** Hold every field, row and essay as one JSON
  payload in the scratchpad and fill it in a single JS call. A browser restart wipes
  unsaved editors, and with the payload a refill and re-verify takes minutes. Server-saved
  steps survive a restart, so press a portal's own Save wherever it is not a submit.
- **Some file inputs appear only on click.** A portal can create no file input until an
  upload button ("My computer") is clicked, and that click opens a native picker the tools
  cannot drive. Override `HTMLInputElement.prototype.click` to capture the input instead,
  remove its `aria-hidden`, get its ref from `read_page` (filter interactive; `find` misses
  it), then `file_upload`. Untick any "fill out your application with your résumé" option
  first so the parse does not overwrite a curated profile, and restore the original
  `click` afterwards.
- **Material-style dropdowns can misfire on a ref.** A `find` ref for an option or a
  checkbox can point at a neighbouring list or entry. Scroll the target into view, compute
  its screen point from `getBoundingClientRect()` times (screenshot width / `innerWidth`),
  click by coordinate, and read the value back after every dropdown. In a hidden tab a
  stepper's Next may not navigate, so go to the step's URL directly. "Save" on a step can
  mean save and exit to the dashboard.
- **Saving a profile can require a certification.** Some large portals make you tick an
  "I hereby certify…" box and press "Submit profile & continue" just to save profile
  edits, and put a separate privacy-consent box on the review page. Both belong to the
  operator, so stage the edits and hand over with both boxes named in the review sheet.
- **Airtable attachments go through an Uppy dialog** (`airtable.com/app…/form`), not a
  native picker, so the click override catches nothing. Click the drop zone, unhide the
  `input.uppy-Dashboard-input` that lacks `webkitdirectory`, `file_upload` to it, then
  click "Upload 1 file". Short text fields take the native value setter plus an `input`
  event (check `__reactProps.value`); long answers are rich-text editors behind a
  zero-height input. The form can restore an unsent draft from local storage, so reopen
  the URL before refilling. If its Submit ignores a ref click, a coordinate click right
  after a screenshot works.
- **Google Forms uploads go through the Drive picker**, a same-origin iframe
  (`docs.google.com/picker`) whose file input the accessibility tree never shows. Click
  "Add file" by screen coordinates right after a screenshot (a JS or ref click does
  nothing while the tab is hidden), inject a top-level `input[type=file]`, `file_upload`
  the résumé into it, then hand the File to the picker's input with a DataTransfer
  (`inp.files = dt.files`) and fire `change`. Google Forms also autosaves a signed-in
  draft, so a reload restores earlier answers; read `aria-checked` before clicking so a
  click does not untick a restored answer.
- **A paste into Google Docs takes the cursor line's style.** When answers are drafted in
  a Doc, a synthetic `text/html` paste gives unstyled `<p>` blocks the paragraph style of
  the line the cursor sits on, so a paste into an empty heading line turns every paragraph
  into a heading. To insert above a heading, press Home then Return at its start, ArrowUp
  into the new empty line, set it to Normal text (cmd+alt+0), then paste. Docs drops empty
  `<p>` blocks, so add blank lines afterwards (click the line, Home, Return), working
  bottom-up so earlier positions do not shift.
- **Put a focus check between a click and typing.** With the browser behind other windows,
  a click followed at once by `type` can drop every keystroke. A one-line script read of
  `document.activeElement` between them confirms the right field has focus and gives the
  page the moment it needs.
- **Another agent's tab steals keystrokes.** When two agents drive the same browser, typing
  into a tab that is not in front is lost without an error. Take a screenshot of the form
  tab to bring it forward before each typing batch, and check the values by script before
  Submit.
- **Smooth scrolling moves the target.** Coordinates read right after `scrollIntoView` are
  mid-animation. Scroll with `behavior: 'instant'`, wait a second, then read
  `getBoundingClientRect()`, or click by ref.
- **Autofill extensions get in the way.** Simplify's extension, if installed, opens an "Add
  Custom Application" modal after a résumé upload, after Submit and on the next page load,
  and its side panel shrinks the page so ref clicks land off target and keystrokes go
  nowhere. Close the modal, take a screenshot before typing, focus fields with
  `element.focus()`, and read every value back. Turning the extension off for a run is
  simpler.
- **A portal that remembers a past application prefills stale answers,** such as last
  year's track and class year. Correct both to the role being applied for, upload the
  current résumé and transcript as new files, and read every field back. An intake form that
  asks about other interview processes gets peers with concrete stages, and its deadline
  field stays blank unless there is a real offer deadline.
- **Stage uploads inside the workspace.** When the upload tool refuses a file outside the
  folders the session can read, copy it into the workspace and confirm with `cmp` that the
  copy matches the original.
- **To replace a Google Doc's whole body,** click in the body, press cmd+Up, cmd+shift+Down
  and Delete, and take a screenshot to confirm the page is blank before pasting. Cmd+A and
  Edit > Select all can select nothing in a background tab, and the paste then doubles the
  document.
- **Find and replace in Google Docs:** set the Find and Replace fields with `form_input` by
  ref, check the match count on screen, then Replace all. A triple-click plus typing can send
  the text into the document instead. Undo one step at a time with an export check after
  each, since Docs splits typing into word-sized undo steps.
