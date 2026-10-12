// node --test kernel/mailgate/gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromMime, fromToolInput, inspect, ownText } from "./gate.mjs";

const NOW = new Date("2026-10-12T07:30:00Z");
const resumes = [{ filename: "Ada_Lovelace_Resume.pdf", mimeType: "application/pdf" }, { filename: "Alan_Turing_Resume.pdf", mimeType: "application/pdf" }];
const ids = (items) => items.map((item) => item.id);
const note = (line) => `<div>Hello Grace!</div><div><br></div><div>${line} A few things we have done together:<br><b>- Papers:</b> 3+ together</div><div><br></div><div>Best,<br>- Ada and Alan</div>`;

test("a template that promises materials and carries two résumés fails", () => {
  const draft = fromToolInput({ to: ["grace@example.com"], cc: ["alan@example.org"], subject: "Connecting | Fund", htmlBody: note("We have attached some materials on what we have worked on."), attachments: resumes });
  assert.deepEqual(ids(inspect(draft, { now: NOW }).fail), ["attachment-kind"]);
});

test("saying what is attached passes", () => {
  const draft = fromToolInput({ to: ["grace@example.com"], cc: ["alan@example.org"], subject: "Connecting | Fund", htmlBody: note("We have attached our resumes."), attachments: resumes });
  const result = inspect(draft, { now: NOW });
  assert.deepEqual(result.fail, []);
  assert.deepEqual(result.pending, []);
});

test("résumés plus work needs a third file", () => {
  const line = "We have attached our resumes and some of our recent work.";
  const two = inspect(fromToolInput({ to: ["founder@example.net"], subject: "s", htmlBody: note(line), attachments: resumes }), { now: NOW });
  assert.deepEqual(ids(two.fail), ["attachment-kind"]);
  const three = inspect(fromToolInput({ to: ["founder@example.net"], subject: "s", htmlBody: note(line), attachments: [...resumes, { filename: "preprint.pdf" }] }), { now: NOW });
  assert.deepEqual(three.fail, []);
});

test("a claim with nothing attached waits on a draft and blocks a send", () => {
  const result = inspect(fromToolInput({ to: ["ann@example.com"], subject: "s", body: "Hi Ann,\n\nI have attached my resume.\n\nBest,\n- Ada" }), { now: NOW });
  assert.deepEqual(ids(result.pending), ["attachment-missing"]);
  assert.deepEqual(result.fail, []);
});

test("an offer to attach, or a clause about the résumé, is no claim", () => {
  const offer = inspect(fromToolInput({ to: ["ann@example.com"], subject: "s", body: "Hi Ann,\n\nI am happy to attach my transcript if useful.\n\nBest" }), { now: NOW });
  assert.deepEqual([...offer.fail, ...offer.pending], []);
  const clause = inspect(fromToolInput({ to: ["ann@example.com"], subject: "s", body: "Hi Ann,\n\nAttached is my resume, which summarizes my work.\n\nBest", attachments: [{ filename: "Ada_Lovelace_Resume.pdf" }] }), { now: NOW });
  assert.deepEqual(clause.fail, []);
});

test("the quoted thread is not the sender's text", () => {
  const html = `<div>Hello Grace!</div><div>We have attached our resumes.</div><div class="gmail_extra"><blockquote>(I have attached a short summary flyer to this email.)</blockquote></div>`;
  assert.match(ownText({ html }), /our resumes/);
  assert.doesNotMatch(ownText({ html }), /flyer/);
  assert.deepEqual(inspect(fromToolInput({ to: ["ghopper@example.com"], subject: "Re: x", htmlBody: html, attachments: resumes }), { now: NOW }).fail, []);
});

test("a review copy is judged by its cover note, not by the draft it quotes", () => {
  const html = `<div>Hi Ada and Alan,</div><div>Here is the new draft.</div><hr><div style="border-left:3px solid #cccccc;padding-left:12px"><div>We have attached our resumes and some of our recent work.</div></div>`;
  const result = inspect(fromToolInput({ to: ["alan@example.org", "ada@example.org"], subject: "Re: [Draft]", htmlBody: html }), { now: NOW });
  assert.deepEqual([...result.fail, ...result.pending], []);
});

test("a weekday that does not match its date fails", () => {
  const right = inspect(fromToolInput({ to: ["kat@example.net"], subject: "s", body: "Hi Kat,\n\nAnytime between 9:00 am and 10:30 am PST on Wednesday, Oct 14 works for me." }), { now: NOW });
  assert.deepEqual(right.fail, []);
  const wrong = inspect(fromToolInput({ to: ["kat@example.net"], subject: "s", body: "Hi Kat,\n\nDoes Thursday, October 14 work?" }), { now: NOW });
  assert.deepEqual(ids(wrong.fail), ["weekday-date"]);
});

test("cc'd with an empty cc line, a placeholder, and an inline logo each fail", () => {
  const result = inspect(fromToolInput({ to: ["ann@example.com"], subject: "s", body: "Hi Ann,\n\nAlan (cc'd) and I wrote __ papers.", attachments: [{ filename: "image001.png", mimeType: "image/png", inline: true }] }), { now: NOW });
  assert.deepEqual(ids(result.fail).sort(), ["cc-missing", "inline-image", "placeholder"]);
});

test("an update that leaves the recipients alone keeps them, so cc'd is not judged", () => {
  const input = { htmlBody: "<div>Hello Grace!</div><div>Alan (cc'd) and I have kept building together.</div>" };
  assert.deepEqual(ids(inspect(fromToolInput(input), { now: NOW }).fail), ["cc-missing"]);
  assert.deepEqual(inspect(fromToolInput(input, { merge: true }), { now: NOW }).fail, []);
});

test("a greeting that names nobody on the to line is a warning", () => {
  const result = inspect(fromToolInput({ to: ["grace@example.com"], subject: "s", body: "Hello Nathan!\n\nThanks." }), { now: NOW });
  assert.deepEqual(ids(result.warn), ["greeting-name"]);
});

test("a RAW draft parses: recipients, the html part, and attachments by name", () => {
  const boundary = "XYZ";
  const eml = [
    "To: grace@example.com", "Cc: alan@example.org", "Subject: =?UTF-8?B?Q29ubmVjdGluZyBhYm91dCB5b3VyIHdvcms=?=", `Content-Type: multipart/mixed; boundary="${boundary}"`, "",
    `--${boundary}`, "Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: quoted-printable", "",
    "<div>Hello Grace!</div><div>We have attached some materials on what we have wor=", "ked on.</div>",
    `--${boundary}`, "Content-Type: application/pdf; name=\"Ada_Lovelace_Resume.pdf\"", "Content-Disposition: attachment; filename=\"Ada_Lovelace_Resume.pdf\"", "Content-Transfer-Encoding: base64", "", "JVBERi0=",
    `--${boundary}--`, "",
  ].join("\r\n");
  const draft = fromMime(Buffer.from(eml).toString("base64url"));
  assert.equal(draft.subject, "Connecting about your work");
  assert.deepEqual(draft.cc, ["alan@example.org"]);
  assert.deepEqual(draft.attachments.map((file) => file.filename), ["Ada_Lovelace_Resume.pdf"]);
  assert.deepEqual(ids(inspect(draft, { now: NOW }).fail), ["attachment-kind"]);
});
