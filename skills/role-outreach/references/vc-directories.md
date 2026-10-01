# Fund student directories

**A fund's student directory is the warmest company list a new grad can get.** Every company on
it asked the fund to meet students, says whether it hires new grads or interns this year, and
names the person who reads the email. The talent lead who sends it is inviting direct email
with a résumé, so the email channel is warm by construction. A portfolio job board, by
contrast, lists every opening at every level and names no one.

## Where the copy lives

`scripts/vc_directory.py <fund>` saves a directory into `home/reference/vc-directories/`, the
private repository, and a `.md` beside it holds the fit call, the status and the next step for
each company. A directory page can be public while the email that pointed to it asks that the
contacts not be shared broadly, so the contact addresses live in `home/` only: never in a
commit, an artifact, a post or a shared sheet. Files in the skill name companies, never
addresses. Update the `.md`'s Status column when an application or draft goes out.

`vc_directory.py --show` prints the saved copy without fetching. A refresh prints every added or
removed company and every change to a contact, hiring plan, class year, visa line or stage, so
run it before a new round of outreach and act on what it prints.

## The record

One JSON object per company, as Greylock publishes it:

| field | what it holds | trap |
| --- | --- | --- |
| `name`, `slug`, `website`, `stage`, `description` | the company | `website` sometimes has no scheme |
| `skills` | comma-joined tags: AI/ML, Research, Robotics, Infrastructure, Full-stack, Forward Deployed Engineering, ... | self-reported, and generous |
| `hiringPlans` | comma-joined choices, e.g. "Actively hiring full-time new graduates to start ASAP", "Planning to hire interns for summer 2027", "Not hiring in 2026/2027, but interested to meet students for future opportunities" | "start ASAP" is the form's default wording, not a gate; read `hiring2027` too |
| `classYears` | which class years they want | some companies wrote "Full-time (no internships)" or a role here instead |
| `hiring2026`, `hiring2027` | head counts | free text: "25", "3-4", "5-10 new grads and interns", "We finished hiring for 2026" |
| `locations`, `visa`, `culture` | where, sponsorship, days in office | `culture` is where in-person rules hide |
| `totalEmployees`, `engEmployees`, `funding`, `techStack`, `interviewProcess`, `demo` | context for the email and the interview | often empty |
| `contactEmail` | the person to write to | free text, sometimes two addresses joined by "OR" or "and"; `contacts()` in the script extracts them |
| `founders` | names and LinkedIn URLs | for the people check, not for email |

## How to use it

1. **Read the `.md` in `home/` first.** It holds the fit call, what has already happened and the
   next step for each company. Refresh the JSON if it is more than a week old.
2. **Screen on two fields.** `hiringPlans` must mention the operator's track (new grads, or
   interns), and `skills` or `description` must touch one of the operator's areas
   (`role-sourcing/config/thesis.yaml`). The talent lead's own picks go first.
3. **Run the gates before any email.** `applications.jsonl` and `responses.jsonl` in role-apply:
   a live process means replying on that thread, not a second approach. Then
   `python -m scripts.collision` on every address, and the domain check in `prior-contact.md`.
4. **One email per company, to the listed contact,** from the address the operator applies from,
   with the résumé attached. The first line says where the name came from: the fund's directory
   and the person who shared it. That is accurate. "<Name> referred me" is not, because sharing a
   directory introduces no one. Most of these companies are under fifty people, so the cap in `SKILL.md`
   is one person.
5. **Pair it with the form.** Where the company has an open posting that fits, apply the same
   day and say so in the email. Where it has none, the email is the application.
6. **Drafts only.** The operator reads and sends every one. Telling the talent lead which
   companies the operator wrote to is the operator's call, and it goes in `state/asks-queue.md`,
   not in a draft.

## When another directory arrives

Ask each fund's university or talent lead for this year's student directory, not only the job
board.
A new Next.js page with the same shape is one more entry in
`SOURCES` in the script. Anything else is saved by hand as JSON in `home/reference/vc-directories/`
with the same top-level keys (`title`, `url`, `fetched_at`, `shared_by`, `shared_on`, `terms`,
`companies`).
