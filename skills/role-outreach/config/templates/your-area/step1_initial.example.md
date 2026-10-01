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

  Each part does a job. The bolded question up front can be answered in one line. The
  greeting line says where the contact came from when someone shared it, because that is
  the first thing the reader wonders. thesis.claim and thesis.bridge are the reason this
  person, at this company, is getting this email, and thesis.url is where the reader can
  check the claim. Without them there is no email, and `requires` makes that a stop rather
  than a judgment call.

  The work list is four to six bullets, each a bolded title and a few words. Very brief:
  the attachments carry the detail. The closing bolded line is the second question, and the
  line after it turns a wrong-person reply into a pointer instead of silence.

  Attach the résumé first, then work samples ordered by relevance to this company, then a
  one-page links sheet last. Links go at the end of the email, one per line.
---
<p>Hello {{ contact.first_name }}!</p>

<p><strong>Would it be possible to [the ask in one line, such as a short chat about the {{ hiring.title }} role]?</strong></p>

<p>I hope this email finds you well. [Where the contact came from, if someone shared it:
"<Name> at <organization> shared your contact with me."] My name is [first name], and I am
[one line: where you study or work, and when you can start]. The reason I am writing to you
specifically: {{ thesis.claim }} (<a href="{{ thesis.url }}">{{ thesis.url_label }}</a>).
{{ thesis.bridge }}</p>

<p>I have had the chance to work on:</p>

<p>
<strong>- [Title]:</strong> [a few words, with a number if there is one]<br>
<strong>- [Title]:</strong> [a few words]<br>
<strong>- [Title]:</strong> [a few words]<br>
<strong>- [Title]:</strong> [a few words]<br>
</p>

<p>I was wondering if it would be possible to [the ask, specific to them]. I have attached my
résumé and some of my recent work, and I applied through your careers page as well.
<strong>Are you free for a 15 minute chat to discuss [the topic]?</strong> If you are not the
right person, would you mind pointing me to whoever owns this role?</p>

<p>Sincerely,<br>
- [full name]<br>
<a href="[your Google Scholar or portfolio URL]">Google Scholar profile</a><br>
<a href="[your LinkedIn URL]">LinkedIn profile</a><br>
<a href="[your GitHub URL]">GitHub profile</a><br>
</p>
