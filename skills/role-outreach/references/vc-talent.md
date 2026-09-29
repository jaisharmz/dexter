# The VC talent channel

The most underused asset the operator has, and the only channel where someone else's job
description includes placing them.

## Why it outranks the others

Every venture fund above a certain size employs talent partners — sometimes "talent",
"platform", or "portfolio services". Their mandate is to fill roles at portfolio companies.
They are measured on placements. When they forward a résumé to a founder, the founder opens
it, because the fund is on the cap table.

That skips the entire funnel, which matters most when the operator's losses come at the
end. Processes that reach the final round and then die on team matching or a filled
cohort are failures of coordination and timing, not of skill. An introduction from the
fund arrives with context attached and does not queue behind two hundred applications.

## Find the tie that already exists

A fund tie is anything that means someone on the fund's side already knows the operator:
a fellowship or other programme the fund runs, a portfolio company the operator worked
at, a partner or scout who has seen the work. A programme is not a line on a résumé but a
network, often with a staffed talent function **whose explicit purpose is placing its
members into portfolio companies**, and whoever holds the tie on the fund's side is not a
contact the operator has to justify writing to. How warm a tie is depends on how direct
and how recent it is, so find out before writing.

Three consequences, and the first two are the ones usually left on the table:

1. **Asking the person who holds the tie for portfolio introductions is the relationship
   working as designed**, not a favour. List the fund's portfolio companies in the
   operator's areas before writing.
2. **Spend the relationship on the question only that person can answer:** how someone
   with this tie gets into a portfolio company for the operator's start date. Do not spend
   it on a question the fund's website already answers.
3. **The people who share the tie are a separate network from the fund.** Others from the
   same programme, or former colleagues from the same portfolio company, are inside other
   portfolio companies now, which is a referral surface that costs nothing to ask about.

**Everything else is cold**, and pretending otherwise wastes the first email. Approach
other funds' talent teams as cold outreach with a good reason, not as alumni.

## Two templates, and when each is right

`config/templates/vc/` and `config/templates/vc-intro/` are not interchangeable.

**`vc-intro`** asks one talent partner for **an introduction to one named portfolio
company**. That is a five-minute favour with an obvious yes/no, and it is the right opener
for a cold or semi-warm contact. It lists the spaces the operator works in, the company's
first, says why they want to know the fund beyond this one introduction, and offers a
short call. It works best written once by the operator, by hand, and then reused close to
verbatim with only the variables changed, because the register is theirs. That is why the
kit ships no example of it: write it at `config/templates/vc-intro/step1_initial.md`, with
front matter shaped like the other templates.

**`vc`** is the longer note for a fund where the relationship is already real: a
fellowship, a programme, a partner who knows the work. It asks an open question about the
whole portfolio and names companies the operator has already qualified. It only works when
`fund.relationship` is genuine; sent cold it reads presumptuous.

Rule of thumb: if you can name the one company you want the intro to, use `vc-intro`. If
you are asking someone to scan a portfolio on your behalf, you had better already know them,
and then use `vc`.

## Which funds map to which areas

Pick funds by whether their portfolio contains the targets, not by brand.

Build the map per area from the qualified targets themselves. Take each target's
investors from a primary source, the company's own funding announcement or the fund's
portfolio page, and count. A fund on three of an area's targets is worth one careful note;
a famous fund on none of them is not. Keep the map in `state/`, since it is the operator's
own.

**Check the portfolio before writing**, from the fund's own portfolio page, and reuse a
list the operator already built for an earlier note rather than re-deriving it. Portfolio
pages come in two shapes worth knowing before you scrape one: some keep the whole roster
as a JSON array inside a `data-` attribute, which a markdown fetch never shows, and some
list names that link to per-company pages carrying the real domain and founders.

**Expect talent-team depth to run opposite to research density.** A talent team is paid
for by portfolio headcount, so the biggest ones sit on growth-stage, conventional
portfolios, while research-dense funds that back twenty-person labs often have none,
because those labs hire through their founders' networks. The talent channel therefore
routes toward the most conventional companies a fund holds, which makes the named target
list below mandatory rather than good practice.

A fund with none of the target companies is not worth an email regardless of reputation.

## The register, and the trap

**You are not asking for a job.** Asking a talent partner for a job is a category error and
it burns the relationship, because it asks them to advocate before they know what for.

You are telling them **what you are looking for** so they can match it against openings
they already know about. The useful message is short and specific on four points:

- **Area** — narrow enough to match against. "AI/ML" cannot be matched; "compilers for ML
  accelerators" or "evaluation for coding agents" can.
- **Role shape** — for example new grad, full-time, research-adjacent engineering.
- **Timing** — when the operator graduates or can start, so the partner knows which
  hiring cycle to match against.
- **Credibility** — two or three lines, not the résumé. One or two concrete artifacts,
  such as a shipped system or a library other people use, carry more than a list of
  honours.

Then the thing most people leave out: **a specific target list from their own portfolio.**
Naming six companies you have already qualified turns an open-ended favour into a
five-minute task, and it is the difference between a reply and a polite nothing.

**The trap:** talent partners serve the fund. They will place the operator where a gap
exists, which is not necessarily where the operator most wants to be — and a new grad who
seems flexible gets routed to whichever portfolio company is most desperate. The named
target list is the defence. Come with it, and their gap-filling instinct works inside a
list you already chose.

## Timing

Talent teams work on a portfolio-wide rhythm and are busiest just after companies set
headcount — early in a quarter, and again after a round closes. A note that arrives when a
portfolio company has just raised is a note that arrives when someone is actively looking.

Autumn is the right window for a May graduate: early enough that new-grad headcount is
unspent, late enough that next year's plans exist.

## What a rule gets wrong

- **Treating every fund as reachable.** The operator's real fund ties are few; the rest
  are cold. Writing to all of them in the same register makes the real ones read as mass
  mail, which is the one way to waste an asset that cannot be rebuilt.
- **Treating a talent partner as a recruiter.** A recruiter fills one role at one company. A
  talent partner has a view across forty companies and a reason to care where the operator
  lands, because a placement that works is a favour to the founder too.
- **Sending the résumé and stopping.** The résumé does not say what is wanted. Without the
  area, the timing and the target list, there is nothing to match against and the message
  is filed.

## Collision check applies here too

Talent partners at funds are people, and some funds appear in earlier outreach. Run the
same collision check before writing, exactly as for any other contact: search the Sent
folder for the fund's domain and the partner's name, and record the result on the outreach
record. A talent partner who received a different pitch from the same mailbox last month
is not a warm path any more.
