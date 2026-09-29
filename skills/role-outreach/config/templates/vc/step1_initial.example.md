---
subject: "{{ fund.name }}: looking at {{ area.label }} roles for [start year]"
requires: [contact.first_name, fund.name, fund.relationship, fund.targets, area.label]
notes: |
  An example to copy. Copy it to config/templates/vc/step1_initial.md (the copy stays out
  of git) and write every [square-bracketed] phrase once, by hand, in your own voice.
  config/persona.md has what they need. Never draft from a copy that still has a square
  bracket in it.

  The double-brace placeholders are filled per contact, by the agent. contact.first_name
  comes from this person's entry in the outreach record and fund.* from its channel.fund.
  area.label is the target's area in config/thesis.yaml. `requires` lists every one of
  them, and if any is missing, this template does not fit.

  This is not a job ask, and the subject line should never read like one. You are telling
  a talent partner what you are looking for so they can match it against openings they
  already know about.

  fund.relationship is required. If the operator has no real tie to this fund (a
  fellowship, a programme, a partner who knows the work), this is a cold note to a
  stranger: ask for one named introduction instead, the vc-intro register described in
  references/vc-talent.md.

  fund.targets is the part most people leave out and the part that gets a reply. Naming
  companies you have already qualified turns an open-ended favour into a five-minute task,
  and it is the defence against being routed to whichever portfolio company is most
  desperate.
---
<p>Hello {{ contact.first_name }}!</p>

<p>{{ fund.relationship }}</p>

<p><strong>I am starting to look at [new grad or internship] roles for [when you can start]
and wanted to ask whether any of the {{ fund.name }} portfolio is hiring into
{{ area.label }}.</strong></p>

<p>Quick context on me: [one sentence: where you study or work, and when you finish].
[Two or three lines of credibility: one or two concrete artifacts, such as a shipped
system or a library other people use, rather than a list of honours.]</p>

<p>What I am looking for:</p>

<p>
<strong>- Area:</strong> {{ area.label }}<br>
<strong>- Shape:</strong> [for example new grad, full-time, research-adjacent engineering]<br>
<strong>- Timing:</strong> [when you would start, and when you are interviewing]<br>
<strong>- Location:</strong> [where you can work, or remote]<br>
</p>

<p>From your portfolio, the ones I have looked at most closely are
{{ fund.targets | join(", ") }}. <strong>Are any of those teams hiring [new grads or interns],
and is there anyone you would suggest I talk to?</strong></p>

<p>Happy to send a resume if useful.</p>

<p>Sincerely,<br>
- [full name]<br>
<a href="[your Google Scholar, GitHub or portfolio URL]">[Google Scholar, GitHub or portfolio]</a><br>
<a href="[your LinkedIn URL]">LinkedIn</a><br>
</p>
