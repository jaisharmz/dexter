# Booking pages

How to read each kind of page without booking anything, and how to book once the operator has
said yes. Pages change, so when a note here stops being true, record the correction in
`LEARNED.md` with its date.

## Before any page: which browser

Booking pages need no sign-in, so any browser works for them, but the browser has to be
visible. A tab the operator cannot see reports `document.visibilityState` as `'hidden'`, and
pages that wait on timers or rendering stall there. Calendly shows nothing at all in a hidden
tab. When the operator's own browser is busy or hidden, use a visible one, such as the app's
built-in browser pane, which has no logins and needs none here.

## Calendly (calendly.com/<profile>/<event>)

**Reading.** The booking page fetches its slots from two JSON endpoints that any visitor's
browser calls. They are unofficial and may change.

    GET https://calendly.com/api/booking/event_types/lookup?event_type_slug=<event>&profile_slug=<profile>
    GET https://calendly.com/api/booking/event_types/<uuid>/calendar/range?timezone=<IANA zone>&range_start=YYYY-MM-DD&range_end=YYYY-MM-DD

The first returns the event type's uuid and length. The second lists open spots per day.
Fetch them from a tab already on calendly.com. A profile that opens at the same time every
day (say 11:30) cannot honour a hold placed earlier that day, so move the hold before
proposing it.

**Booking.** Open the dated slot URL
(`calendly.com/<profile>/<event>/<start ISO>?month=YYYY-MM&date=YYYY-MM-DD`), fill name and
email, and confirm. The confirmation page reads "You are scheduled". The invitee id in its
URL is the one the cancel and reschedule links use.

## Google booking pages (calendar.app.google/...)

**Reading.** The page lists open slots by day. Read them from the page text.

**Booking.** A slot opens a form for name and email. The email prefills with the Google
account the browser is signed into, which may not be the address the operator applies with,
so check it before confirming. Click slots by element reference. A coordinate click in a
column of half-hour slots can land on the neighbour: one run booked 10:30 for a 10:00 hold,
then cancelled and rebooked at once. The confirmation reads "Booking confirmed".

## Ashby (you.ashbyhq.com/meeting/<uuid>/)

Two different pages share this URL shape. Read which one it is before doing anything.

- **A slot picker** lists open times by day. Book it like any self-book page.
- **An availability form** asks for windows. Its first step is a month calendar: greyed days
  are outside the range, and a line under it counts the days still needed. Read both there,
  before anything is submitted. The range is counted from today, so it moves at midnight, and
  forms differ: one allowed ten days and needed two, another allowed three weeks and needed
  five. The count can be one short. A form that read "Select at least 4 days" still asked for
  a fifth after four were picked, so read it again after picking.
- **Filling the form.** The second step has one start and one end picker per day. They are
  native `<select>` elements whose option values are ISO timestamps. Set each with the
  select's native value setter and a `change` event, then read every one back, because a
  quick series of changes can drop one. "Add Note" opens a box for scheduling context, which
  is the place for the operator's first choice. Submit, then read the status back: "Waiting
  for <name> to confirm". Record each window sent as `[OFFERED]`.

In a hidden tab, Ashby takes clicks but no typing. Set a text field's value with the native
setter plus an `input` event, wait about a second, then blur it: the field commits on blur.

## After booking: the invite

- The organizer's invite carries the Meet link, the dial-in and the cancel and reschedule
  links. Copy the Meet link and the dial-in to the Confirmed entry. Leave the cancel links in
  the email, since anyone holding them can cancel.
- Google keeps an invite from a sender the operator has never dealt with off the calendar.
  The email's subject begins "Invitation from an unknown sender", and the event appears only
  after the operator presses Add to calendar in that email. The button also marks the sender
  as known for every later invite, so the click is the operator's, and the Confirmed entry
  stands in until then.
- Responding to the invite (yes, no, maybe) sends a message to the organizer, so the agent
  never does it.
