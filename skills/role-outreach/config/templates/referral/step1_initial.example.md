---
subject: "{{ contact.shared_context }}: quick question about {{ company }}"
requires: [contact.first_name, contact.shared_context, contact.shared_context_line,
           company, hiring.title, hiring.url, thesis.claim, thesis.bridge]
notes: |
  An example to copy. Copy it to config/templates/referral/step1_initial.md (the copy
  stays out of git) and write the [square-bracketed] phrases once, by hand, in your own
  voice. Never draft from a copy that still has a square bracket in it.

  The double-brace placeholders are filled per contact, by the agent. contact.* comes
  from this person's entry in the outreach record. company, hiring.* and thesis.* come
  from the target record. `requires` lists every one of them, and if any is missing, this
  template does not fit.

  contact.shared_context must be something the person actually remembers: a lab, a course
  they took from the operator, a team they overlapped on. A shared institution alone is
  not warmth. An alum of the operator's school who has never met them is a cold contact
  with a better opening line, and gets the area template instead.

  The ask is deliberately two-part. The first half is answerable even if the second half
  is a no, which is what keeps the relationship intact when the answer is no.
  thesis.claim and thesis.bridge give them a reason to forward the name. A company whose
  thesis came back none does not fit this template.
---
<p>Hey {{ contact.first_name }}!</p>

<p>{{ contact.shared_context_line }}</p>

<p>I am applying for {{ hiring.title }} at {{ company }}
(<a href="{{ hiring.url }}">posting</a>) for [when you would start].</p>

<p><strong>Two things: is that team any good to work on, and would you be willing to drop
my name in?</strong> No pressure at all on the second one. The first is genuinely the more
useful of the two.</p>

<p>{{ thesis.claim }}, which is why that team caught my eye. {{ thesis.bridge }}</p>

<p>Thanks either way!</p>

<p>- [first name]</p>
