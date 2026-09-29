# Chrome, Google accounts, and what the browser tools can actually do

Applies to **Claude in Chrome** (`mcp__claude-in-chrome__*`) on either machine. Skills
that drive a browser point here rather than restating it: `role-apply`, `grubhub`, and
anything touching Drive.

## The one thing that is not possible

**Typing a password is out, and stays out even when asked directly.** Google account
password, 2FA code, recovery code, captcha, "create account" — none of these, on any
machine, under any framing. That is not a configuration that can be changed from inside a
session, so asking again does not unlock it.

So **"log in to my other Google account" is the one instruction here that cannot be
followed.** Signing in is the operator's, once per browser.

## The good news: signing in is almost never what is needed

Chrome holds several Google accounts signed in at once, and **switching between them is
navigation, not authentication.** Every Google property indexes them by position in the
URL:

    https://drive.google.com/drive/u/0/my-drive     first signed-in account
    https://drive.google.com/drive/u/2/my-drive     third
    https://mail.google.com/mail/u/1/
    https://docs.google.com/document/u/2/d/<id>/edit

`/u/N` is an index into the signed-in list, **not a stable account id** — it shifts if an
account is added or removed. Confirm which account a page is actually showing before
writing anything to it, by reading the avatar or the account line on the page. Writing a
client document into the wrong Drive is not recoverable by deleting it; it was already
visible, and it may have already synced.

## So the capability is: everything except the sign-in

Once the accounts are signed in, the browser tools do the whole job — open Drive, read a
doc, create one, edit, upload, move files between folders, work across several accounts in
one session by switching `/u/N`. No API key, no OAuth consent screen, no connector. It is
the operator's own logged-in Chrome, driven.

## Per machine, because sessions are per browser

The Mac's Chrome and the PC's Chrome have separate cookie jars. An account signed in on
one is not signed in on the other, and nothing in this workspace can copy a session across
— that would be moving credentials, which is the same prohibition wearing a different hat.

**Both machines need the sign-ins done once, by hand, in that machine's Chrome.** After
that both behave identically and no skill needs to know which machine it is on.

## When a session has gone stale mid-task

Stop and say so. Do not click through a re-authentication prompt, do not retry, and do not
start a parallel flow that avoids it. A skill that hits a login wall has hit the end of
what it can do, and the useful response is one sentence naming which account needs
re-authenticating — not a workaround that half-completes the task under the wrong
identity.

