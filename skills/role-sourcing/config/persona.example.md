# Artifact inventory

The `fit` gate requires that every draft names one entry from this file and says what
it has to do with the role. An artifact is something that exists at a URL or has a
number attached. "Interested in diffusion models" is not an artifact. "Wrote the
evaluation harness for an open-source training library, cited in its README" is.

Keys are what `{{ artifact }}` resolves against.

Copy this file to `config/persona.md` and replace every `[bracketed]` placeholder. The copy
is the operator's own and never ships. Every key listed under `artifacts` in
`config/thesis.yaml` needs an entry here, filed under the area that uses it.

---

## Identity

    name:    [Full name]
    email:   you@example.com
    school:  [University, degree or degrees]
    grad:    [Month YYYY]
    links:
      scholar:  [Google Scholar URL, if any]
      github:   https://github.com/[you]
      linkedin: https://www.linkedin.com/in/[you]/
      youtube:  [a channel or playlist, if any]

---

## What they are looking for, in their own words

Given [date], verbatim from something the operator wrote themselves, such as their own cold
email. These are the spaces they want to work in and the exact blurbs. **Do not paraphrase
them** — they go into emails as written:

    [Space one]: [the blurb, exactly as the operator wrote it]
    [Space two]: [the blurb, exactly as the operator wrote it]
    [Space three]: [the blurb, exactly as the operator wrote it]

**Order them by the company being written to** — whichever space that company works in goes
first. With no reason to prefer one, the default order is [the operator's default order].

The long-run goal, also in their words: **"[the goal, verbatim]"**. [One line on what it
changes. A goal of founding a company later, for instance, makes the VC talent channel
matter more than the job board, because the operator is also building a relationship with a
fund they may raise from.]

---

## strongest-field

### `main_project`
[What it is and what it does, with the URL. If it is built on someone else's library, name
whose library it is and say exactly which part is the operator's.]
**Use when:** [the kind of company this is the strongest opening line for, and why.]

### `first_paper`
[Title (year), and where it can be read.]
**Use when:** the role is research-shaped, or the team publishes.

### `research_group`
[Lab or group, advisor, dates, and what was built or found there, with a number.]
**Use when:** [the kind of team this work speaks to.]

---

## destination-field

### `domain_project`
[The work that clears this field's bar, with the data it was done on and a number.]
**Use when:** [the kind of company in this field it speaks to.]

---

## fallback-field

### `industry_internship`
[Company, title, dates, and the result, with a number.]
**Use when:** [the kind of role it speaks to.]

---

## stretch-field

### `stretch_project`
[The closest thing the operator has to work in this field, stated honestly.]
**Use when:** nothing stronger fits. [Say plainly if it is weak, and which artifact to prefer.]

---

## Credentials that travel across all areas

- [A fellowship, award or selective programme, with its acceptance rate if known]
- [A competition result or ranking]
- [Teaching, mentoring or leadership]

Use at most one of these per email, and only when it is load-bearing. A list of honors
in a cold note to a founder reads as a résumé paste.
