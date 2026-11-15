// node --test kernel/reachgate/gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { judge, normalize } from "./gate.mjs";

const NOW = new Date("2026-10-20T20:00:00-07:00");
const ids = (items) => items.map((item) => item.id);
const paper = { title: "A Paper About Tilting", authors: ["Hopper, Grace", "Lovelace, Ada"] };
const deps = { now: NOW, arxiv: () => paper, collision: (to) => ({ usable: true, colliding: [], clear: [to] }), pipeline: (name) => `clear: ${name}`, inflight: [], ledger: [] };

const raw = (to, body) => Buffer.from([
  `To: ${to}`, "Subject: Prospective PhD student, Fall 2027 | Ada", "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "",
  `<div>Hello Prof. Hopper!</div><div><br></div><div>${body}</div><div><br></div><div>Sincerely,<br>- Ada</div>`,
].join("\r\n")).toString("base64url");

const card = (change = {}) => ({
  act: "email", kind: "academic", person: "Grace Hopper", org: "Example University", to: "grace@example.com", ask: "join her group as a PhD student",
  address_source: "https://example.edu/hopper",
  policy: { url: "https://example.edu/hopper", read: "2026-10-20", quote: "Prospective students are welcome to email me.", says: "invites" },
  claims: [{ text: "your tilting paper", arxiv: "2601.00001", title: "A Paper About Tilting" }],
  prior_contact: { checked: "2026-10-20", gmail: "no thread" },
  review: { by: "fresh subagent", date: "2026-10-20", verdict: "pass" },
  ...change,
});
const note = raw("grace@example.com", "Would it be possible to join your group? Your tilting paper is why I am writing.");

test("an invited email with every check done passes", () => {
  const result = judge(card(), { ...deps, raw: note });
  assert.deepEqual(result.fail, []);
  assert.deepEqual(result.pending, []);
});

test("a page that says not to email closes the email channel and names the alternative", () => {
  const result = judge(card({ policy: { url: "u", read: "2026-10-20", quote: "Please do not email me.", says: "no-email", alternative: "fill out the lab form" } }), { ...deps, raw: note });
  assert.deepEqual(ids(result.fail), ["policy-closed"]);
  assert.match(result.fail[0].why, /fill out the lab form/);
});

test("the same page lets the form through", () => {
  const form = card({ act: "form", to: "https://forms.example.com/lab", policy: { url: "u", read: "2026-10-20", quote: "Please do not email me; use the form.", says: "no-email" } });
  assert.deepEqual(judge(form, deps).fail, []);
});

test("no recorded page, a stale page and an unknown verdict all fail", () => {
  assert.deepEqual(ids(judge(card({ policy: {} }), { ...deps, raw: note }).fail), ["policy"]);
  assert.deepEqual(ids(judge(card({ policy: { ...card().policy, read: "2026-08-01" } }), { ...deps, raw: note }).fail), ["policy-stale"]);
});

test("a page that asks for a transcript needs one attached", () => {
  const result = judge(card({ asks_for: ["CV", "transcript"], attachments: ["Ada_Resume.pdf"] }), { ...deps, raw: note });
  assert.deepEqual(ids(result.fail), ["materials"]);
  assert.match(result.fail[0].why, /transcript/);
});

test("a paper with the wrong title or without the person as author fails", () => {
  const wrongTitle = judge(card({ claims: [{ text: "x", arxiv: "2601.00001", title: "Another Title" }] }), { ...deps, raw: note });
  assert.deepEqual(ids(wrongTitle.fail), ["claim-title"]);
  const notTheirs = judge(card(), { ...deps, raw: note, arxiv: () => ({ title: paper.title, authors: ["Turing, Alan"] }) });
  assert.deepEqual(ids(notTheirs.fail), ["claim-author"]);
});

test("an accented title matches arXiv's LaTeX spelling of it", () => {
  assert.equal(normalize("Discrete Adjoint Schrödinger Bridge Sampler"), normalize("Discrete Adjoint Schr\\\"odinger Bridge Sampler"));
});

test("an unreadable arXiv page waits instead of passing", () => {
  const result = judge(card(), { ...deps, raw: note, arxiv: () => { throw new Error("timeout"); } });
  assert.deepEqual(ids(result.pending), ["claim-arxiv"]);
});

test("an address the club already wrote to fails unless the card says why", () => {
  const hit = { ...deps, raw: note, collision: (to) => ({ usable: true, colliding: [to], clear: [] }) };
  assert.deepEqual(ids(judge(card(), hit).fail), ["collision"]);
  assert.deepEqual(judge(card({ prior_contact: { checked: "2026-10-20", gmail: "club note Sep 1", acknowledged: "this is a PhD ask, not the club's pitch" } }), hit).fail, []);
});

test("an unreadable collision source fails closed", () => {
  const result = judge(card(), { ...deps, raw: note, collision: () => ({ usable: false, colliding: ["grace@example.com"], degraded: ["database unreadable"] }) });
  assert.deepEqual(ids(result.fail), ["collision"]);
});

test("a company mid-interview blocks a cold note but not the recruiter thread", () => {
  const live = { ...deps, raw: note, pipeline: (name) => `blocked: ${name}` };
  assert.deepEqual(ids(judge(card({ kind: "industry", company: "Acme" }), live).fail), ["pipeline"]);
  assert.deepEqual(judge(card({ kind: "recruiter", company: "Acme" }), live).fail, []);
});

test("no fresh review, or a review by the drafter, fails", () => {
  assert.deepEqual(ids(judge(card({ review: {} }), { ...deps, raw: note }).fail), ["review"]);
  assert.deepEqual(ids(judge(card({ review: { by: "self", date: "2026-10-20", verdict: "pass" } }), { ...deps, raw: note }).fail), ["review"]);
});

test("an email card needs its RAW draft, and the draft has to go to the card's address", () => {
  assert.deepEqual(ids(judge(card(), deps).fail), ["draft"]);
  assert.deepEqual(ids(judge(card(), { ...deps, raw: raw("someone@example.org", "Would it be possible to join your group, Prof. Hopper?") }).fail), ["to"]);
});

test("the mail gate's failures come through", () => {
  const promise = raw("grace@example.com", "Prof. Hopper, I have attached my resume and some of my recent work.");
  assert.deepEqual(ids(judge(card(), { ...deps, raw: promise }).fail), ["mail-attachment-missing"]);
});

test("a second note to the same person, or to a colleague, is flagged", () => {
  const ledger = [
    { date: "2026-10-19", act: "email", person: "Grace Hopper", org: "Example University", ask: "join her group", draft: "r1" },
    { date: "2026-10-19", act: "email", person: "Alan Turing", org: "Example University", ask: "join his group", draft: "r2" },
  ];
  const result = judge(card(), { ...deps, raw: note, ledger });
  assert.deepEqual(ids(result.warn).filter((id) => id === "duplicate" || id === "same-place"), ["duplicate", "same-place"]);
  const named = judge(card({ related: ["Alan Turing (co-advises)"] }), { ...deps, raw: note, ledger });
  assert.ok(!ids(named.warn).includes("same-place"));
});

test("a warm introduction to the company closes cold notes to anyone there, until the operator says go", () => {
  const industry = card({ kind: "industry", company: "Example Labs", org: "Example Labs", person: "Pat Example", to: "pat@example.com" });
  const fund = [{ company: "Example Labs", domains: ["example.com"], people: ["Sam Example"], scope: "company", via: "a fund partner", kind: "vc-intro", since: "2026-10-29", status: "active", note: "intro to the CTO" }];
  const held = judge(industry, { ...deps, raw: raw("pat@example.com", "Hello Pat"), inflight: fund });
  assert.ok(ids(held.fail).includes("inflight"));
  assert.match(held.fail.find((item) => item.id === "inflight").why, /a fund partner/);
  const said = judge({ ...industry, inflight_ok: "the operator, Nov 16: send it anyway" }, { ...deps, raw: raw("pat@example.com", "Hello Pat"), inflight: fund });
  assert.ok(!ids(said.fail).includes("inflight"));
  assert.ok(ids(said.warn).includes("inflight"));
});

test("a person-scope path closes only that person, and a closed path closes nothing", () => {
  const referral = [{ company: "Example Co", people: ["Timothy Example"], scope: "person", via: "a friend", kind: "referral", since: "2026-10-05", status: "active" }];
  const other = card({ kind: "industry", company: "Example Co", person: "Lee Example", to: "lee@example.org" });
  assert.ok(!ids(judge(other, { ...deps, raw: raw("lee@example.org", "Hello Lee"), inflight: referral }).fail).includes("inflight"));
  const same = card({ kind: "industry", company: "Example Co", person: "Timothy Example", to: "tim@example.org" });
  assert.ok(ids(judge(same, { ...deps, raw: raw("tim@example.org", "Hello Timothy"), inflight: referral }).fail).includes("inflight"));
  const closed = [{ ...referral[0], status: "closed" }];
  assert.ok(!ids(judge(same, { ...deps, raw: raw("tim@example.org", "Hello Timothy"), inflight: closed }).fail).includes("inflight"));
});
