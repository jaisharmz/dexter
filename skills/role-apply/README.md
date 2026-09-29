# role-apply

Fills out job application forms and stops at the submit button.

    /role-apply <company>

Presents a multi-select of the company's open roles, picks the résumé variant that fits
the role, fills every field in Claude in Chrome, and hands back a review sheet with the
submit button untouched.

Two things it will never do: press submit, or invent an answer. Anything the profile
cannot answer gets asked once and written back into `config/profile.yaml`.

Before the first run, copy `config/profile.example.yaml` to `config/profile.yaml` and
`config/answers.example.md` to `config/answers.md`, then fill in what you know. Anything
left as `ASK` is asked the first time a form needs it and written back.

Sits after `role-sourcing` (is this worth applying to?) and `role-outreach` (who do I
email, and when does the form go in?).
