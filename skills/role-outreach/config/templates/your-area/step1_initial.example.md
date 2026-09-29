---
subject: "{{ hiring.title }} at {{ company }} | [school or team], [your area in a few words]"
requires: [contact.first_name, company, hiring.title, thesis.claim, thesis.bridge,
           thesis.url, thesis.url_label]
notes: |
  An example to copy, not a template to draft from. Copy it to
  config/templates/<area>/step1_initial.md, one folder per area you work in, named to match
  the `area` on role-sourcing's targets (for example robotics). The copy is yours and stays
  out of git.

  Write every [square-bracketed] phrase once, by hand, in your own voice: who you are, what
  you work on, your links. config/persona.md has them. Never draft from a copy that still
  has a square bracket in it.

  The double-brace placeholders are filled per contact, by the agent. contact.first_name
  comes from this person's entry in the outreach record. company, hiring.* and thesis.*
  come from the target record. `requires` lists every one of them, and if any is missing
  for this target, this template does not fit it.

  Each part does a job. The bolded question up front can be answered in one line.
  thesis.claim and thesis.bridge are the reason this person, at this company, is getting
  this email, and thesis.url is where the reader can check the claim. Without them there
  is no email, and `requires` makes that a stop rather than a judgment call. The closing
  bolded line turns a wrong-person reply into a pointer instead of silence.
---
<p>Hello {{ contact.first_name }}!</p>

<p><strong>Are you the right person to talk to about the {{ hiring.title }} role at {{ company }}?</strong></p>

<p>My name is [first name], and I am [one line: where you study or work, and when you can
start]. I work on [your area, in your own words], [where that work happens: a lab, a team,
a project].</p>

<p>The reason I am writing to you specifically: {{ thesis.claim }}
(<a href="{{ thesis.url }}">{{ thesis.url_label }}</a>). {{ thesis.bridge }}</p>

<p>A bit of what else I have worked on:</p>

<p>
<strong>- [Organisation]:</strong> [one line on what you built there, with a number]<br>
<strong>- [Organisation]:</strong> [one line on what you built there, with a number]<br>
</p>

<p>I applied through your careers page as well. <strong>If you are not the right person,
would you mind pointing me to whoever owns this role?</strong></p>

<p>Sincerely,<br>
- [full name]<br>
<a href="[your Google Scholar, GitHub or portfolio URL]">[Google Scholar, GitHub or portfolio]</a><br>
<a href="[your LinkedIn URL]">LinkedIn</a><br>
</p>
