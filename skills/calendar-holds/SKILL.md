---
name: calendar-holds
description: Put times on the operator's calendar without ever writing to their own calendar. Proposals they accept or reject, windows sent to the other side, suggestions they may ignore and confirmed bookings each look different and live on one of two calendars of the agent's own. Use when the operator says "propose times", "schedule these calls", "find time for", "block time for the take-home", "book what I accepted" or "put it on my calendar", and whenever a reply asks for a call, availability or an assessment. Books on Calendly, Google booking pages and Ashby only after the operator says yes.
argument-hint: "[propose | book | suggest | sweep] [what to schedule]"
user-invocable: true
---

# Calendar holds

The agent never writes to the operator's own calendar. It writes to two calendars of its
own, and every entry says, by its calendar and its tag, whose move it is.

| entry | calendar | whose move | what moves it on |
| --- | --- | --- | --- |
| `[PROPOSED] ...` | Suggested, busy, no reminder | the operator's: yes or no | a yes, then the agent books it |
| `[OFFERED] ...` | Suggested, busy, no reminder | the other side's: they pick inside the windows sent | their pick, then it becomes the Confirmed entry |
| `[SUGGESTED] ...` | Suggested, in its own event color, free, with a reminder | nobody's | nothing. It is a reminder the operator may skip |
| plain title | Confirmed, busy, with reminders | nobody's: it is happening | a reschedule or cancellation from the other side |

A title reads `[TAG] Company, what it is, with whom (detail)`: `[PROPOSED] Acme intro call
with the founder`, and once it is booked, `Acme intro call with the founder (30 min)`.

Everything below keeps that table true.

It pays off four ways. One look at the week shows what the agent has done. A yes costs one
word, because each hold says what a yes will do. A later session finishes the work from the
state file without asking anything. And it is the same shape as a Gmail draft: the agent
prepares, and the person whose name is on it commits.

    a reply asks for a call ──► [PROPOSED] ──► yes ──► self-book page ─────────────────────► Confirmed
                                    │            ├──► availability form ─┐
                                    │            └──► email, once sent ──┴─► [OFFERED] ──► they pick ──► Confirmed
                                    └──► no, or the operator deletes it ──► removed
    a take-home arrives ──────► [SUGGESTED] blocks ──► done, skipped or past the deadline ──► removed

## Setup, once

1. The operator makes two calendars in the Google Calendar web UI (Settings, Add calendar,
   Create new calendar). The calendar connector creates events but not calendars. The
   defaults are `[CLAUDE] Suggested` and `[CLAUDE] Confirmed`, each in a calendar color the
   operator picks.
2. Copy `config/calendars.example.json` to `config/calendars.json` and fill in both ids
   (`list_calendars` prints them). Copy `config/preferences.example.yaml` to
   `config/preferences.yaml` and fill in the operator's windows, gaps, calendars and
   booking name. Both copies are gitignored.

Why two calendars and not one: the event API takes only `colorId` 1 to 11, so a state can
have a color outside that set only through a calendar's own color. Unchecking Suggested also
hides everything not yet booked, though that includes `[OFFERED]` windows the other side can
still take.

## Proposing times

Before placing anything:

1. **Read every calendar the operator shows**, not only the primary one. Club, class and
   second-account calendars carry evenings the primary lacks. A plan built from the primary
   alone once put a work block on top of a club event. `read_calendars` and `ignore` in
   `preferences.yaml` say which count.
2. **Look past the calendar.** Search the inbox for interviews, onsites and travel confirmed
   only by email, and put each on Confirmed before planning around it. An in-person final
   round confirmed by email was missing from the calendar, and the first plan offered calls
   on the day of the flight.
3. **Read the booking page before proposing.** A self-book link offers fixed slots, and a
   hold at a time the page never offers is a promise the agent cannot keep. An availability
   form allows a set range of days and a minimum number of them. `references/booking-pages.md`
   says how to read Calendly, Google booking pages and Ashby without booking anything. A
   click into a slot picker can read as a booking to a permission check, so look through the
   page's own data instead.

**When a call fits.** It lies wholly inside one of the operator's windows, and each gap in
`preferences.yaml` holds on both sides against every busy event, classes included, unless
the event is listed under `may_give_way`. Another interview never gives way. Busy means the
operator's calendars, Confirmed, `[OFFERED]` windows and the `[PROPOSED]` holds of
higher-ranked processes. Lower-ranked holds may move. A call whose length or kind is unknown
counts as technical until its booking page says otherwise.

Then place the holds:

- **Most important first.** The highest-ranked process gets the earliest slot that fits. The
  operator's ranking wins when they give one.
- **In both time zones** when the other side is elsewhere. Mind the weeks when one side has
  changed clocks and the other has not, in late October and in March.
- **Out of any stretch the operator asks to keep clear**, moved in priority order.
- **Windows, not slots, for a process that asks for availability** ("send three weeks of
  times"). Each window runs from the first start that fits to the last end that fits, so a
  gap holds wherever they place the call. Propose at least as many days as the form requires.
- **Shared when windows run short.** Two lower-ranked processes may be offered the same slot.
  Say so in both holds and in the report: whichever side picks first gets it, and the other
  is offered again.
- **When nothing fits**, say so in one line, name the rule that blocks it, and propose the
  least-bad time rather than nothing.

Each hold's description, in this order:

    Proposed by Claude, not booked. <Who, at which company, for which role, and how long.>
    <Why this time: what it sits between, and what it was moved from.>
    If you accept: I book this slot, or the nearest one that day that keeps your gaps, at <link>.

The last line matters most. It says exactly what a yes will do, so a yes needs no follow-up
question. For an availability form, it names the windows that will be entered and says they
become `[OFFERED]`. For a reply by email, it says the agent will draft the reply with these
times and show it before it goes.

Then check every hold against the gaps again, write the state file, file a queue item for
the operator's yes that names the state file, and report the plan in priority order:
company, time, and what a yes does.

## Booking what the operator accepted

A yes names holds ("book Example Robotics and Acme") or a batch ("schedule the ones you
proposed for this week"). Record the words in the state file. Nothing else counts as a yes. A
hold the operator moved shows a preferred time, and one they deleted is a no. Report either
in one line and wait for their word before booking. Their words beat `preferences.yaml`: when
following them breaks a gap, do as they said and name the broken gap in one line.

For each accepted hold:

1. **A self-book page** (Calendly, a Google booking page, an Ashby slot picker): book the held
   slot, or the nearest one that day inside the windows that keeps the gaps. Another day needs
   the operator's word, unless the hold named it as the fallback. Book with `booking_name` and
   `booking_email`, or with the address the application used when its records say otherwise,
   since booking pages prefill whichever account the browser is signed into. Answer any custom
   question from the application's records, or stop and ask. Click by element reference, read
   the confirmation back, and if the wrong slot was taken, cancel and rebook at once.
2. **An availability form** (Ashby's "share your availability"): it takes windows rather than a
   slot. When its range or minimum rules out the held options, or asks for more days than the
   operator accepted, add the nearest days that fit and say in one line which were added and
   why. If the form has a note box, use it for the operator's first choice. Each window sent
   becomes an `[OFFERED]` entry, and nothing goes on Confirmed until the other side picks.
3. **An email**: draft the reply in the operator's thread. Sending it is theirs, and the hold
   stays `[PROPOSED]` until it goes. Once it is sent, the times it offers become `[OFFERED]`.

After each booking on a self-book page:

- **Put the call on Confirmed** with the meeting link and dial-in in the description and the
  reminders from `calendars.json`, unless the real invite already shows on the operator's
  calendar. An invite from a sender the operator has never dealt with arrives as "Invitation
  from an unknown sender" and stays off the calendar until the operator presses Add to
  calendar, which also marks the sender as known. That is an account setting, so it is the
  operator's click. The copy on Confirmed covers the gap.
- **Remove what the booking made moot**: the hold, unpicked options, and any held option at
  the same time for another company. A draft that still offers a time that is gone gets a
  subject beginning "DISCARD", because the operator may send drafts in a batch.
- **Never RSVP for the operator.** An RSVP is a message to the organizer.
- **Update the records** (`role-tracker`, when the call belongs to an application) and the
  queue.

## Suggested blocks

For take-homes, online assessments and prep the operator may or may not do:

- Sized to the stated time, before the deadline, inside the `work_blocks` hours. Split work
  that can be paused into sessions when it runs for hours. A timed assessment gets one block
  of its stated length.
- Marked free, in the Suggested event color, with the calendar's default reminder.
- No test link or credential in the description. Assessment links often embed a password or a
  one-time token, so name the email the link came in.
- No acceptance step. Move or delete them freely, and remove each once the work is in or the
  deadline has passed.

## Keeping it true

At the start of every run, before deleting or changing anything:

- **Read the mail and the operator's own calendar, not only the agent's two.** List all three
  from today forward, and search the mail since the last run for every company with an open
  entry: picks, confirmations, reschedules, cancellations and any "Invitation from an unknown
  sender". Compare all of it with the state files. A change found only in mail is still the
  other side's move. Delete no `[OFFERED]` window or Confirmed entry until that search has
  come back empty for its company.
- Any hold that is gone, with no state entry saying the agent removed it, was removed by the
  operator.
- When the other side picks an `[OFFERED]` window, that entry becomes the Confirmed entry and
  the other windows go. When nobody picked and every window has passed, delete them and say
  so.
- A `[PROPOSED]` hold whose time has passed is deleted, and when the company is still waiting,
  a new time is proposed.
- If the other side reschedules or cancels, change Confirmed to match.
- Once the organizer's real invite shows on the operator's calendar (same company, same
  start), delete the copy on Confirmed and log the deletion in the state file. The
  organizer's event is the one that will move if the call moves.

## State

One file per planning round, `state/<calls|blocks>-<YYYY-MM-DD>.json`, with `-2` for a second
round the same day. Each entry carries the event id, the calendar, the start, the tag, the
company and what a yes does. Below the entries: what was booked, offered or deleted and why,
and the operator's words of acceptance. Without the ids, a later session cannot book or
delete the right entry.

## What this skill never does

- Write to the operator's own calendar, create or delete a calendar, or change a calendar
  setting.
- Book, submit availability or draft a reply before the operator's yes.
- Send an email or an RSVP, or press Add to calendar on an unknown-sender invite.
- Put a credential, test link or one-time token in an event.

## How it chains

`role-outreach` and `role-apply` surface the replies that ask for calls, and this skill turns
them into holds. A booked call is a reply in `role-tracker`'s records, which sets its Whose
move to Scheduled. The queue item that waits on the operator's yes names the state file, so
whichever session gets the yes can book from it.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — the operator rewrites the output, states a
preference in passing, a step fails the same way twice, a default turns out to be wrong
for how they actually work — record it and say so in one line:

    bash kernel/skill-learn.sh record calendar-holds "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
