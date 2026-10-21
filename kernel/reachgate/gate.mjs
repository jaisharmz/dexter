#!/usr/bin/env node
// The reach gate: whether it is right to reach this person, this way, now, checked before any
// email, message, form or application goes out under the operator's name. The mail gate checks
// that a draft's text matches what it carries. This one checks the act itself: that the
// person's own page allows it, that nothing about the operator's history with them or their
// company makes it wrong, that every fact the note states about them is true, and that a reader
// who did not write it says it makes sense. It exists because the professor list held pages
// saying "please do not email me", the club had already written to people the research ranked
// first, and a cold note to a company mid-interview reads as going around the recruiter.
//
//   node kernel/reachgate/gate.mjs check <card.json>             judge one act
//   node kernel/reachgate/gate.mjs check <card.json> --offline   skip the arXiv reads (they wait)
//   node kernel/reachgate/gate.mjs ledger [name]                 acts that passed, newest first
//
// A card is one JSON file per act, kept beside the draft in temp/outreach/<slug>/reach.json,
// since it names a real person. The fields are in README.md. Exit 1 when anything blocks. A
// pass is written to var/log/reachgate.jsonl, which is how the next card at the same person
// or place finds this one.
//
// Three outcomes per finding, as in the mail gate:
//   fail     the act contradicts the person's page, the records or the facts. Blocks.
//   pending  a check could not run (no network for arXiv). Blocks until it runs.
//   warn     worth a look, never blocks.

import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fromMime, inspect, ownText, verdict } from "../mailgate/gate.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER = join(ROOT, "var", "log", "reachgate.jsonl");
const DAY = 24 * 60 * 60 * 1000;

// What a person's page can say about being contacted. The first four close email outright.
const CLOSED = new Set(["no-email", "after-admission", "form-only", "portal-only"]);
const OPEN = new Set(["invites", "silent", "collaborations"]);
const ACTS = new Set(["email", "message", "form", "application"]);

// What a page asks an applicant to send, and the file names that carry it.
const MATERIALS = {
  cv: /resume|cv\b|curriculum/i,
  resume: /resume|cv\b|curriculum/i,
  transcript: /transcript/i,
  statement: /statement|sop|purpose/i,
  writing: /paper|preprint|sample|writing|report/i,
};

// Accents go before punctuation, so "Schrödinger" and arXiv's "Schr\"odinger" both read schrodinger.
export const normalize = (text = "") => String(text).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/\\["'`^~=.]\{?([a-z])\}?/g, "$1").replace(/[^a-z0-9]+/g, " ").trim();
const entities = (text) => text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const surname = (name = "") => normalize(name).split(" ").filter(Boolean).pop() || "";
const age = (date, now) => (now - new Date(`${date}T12:00:00`)) / DAY;

// ---- outside reads, injectable so the tests run without them ---------------------

// The arXiv abstract page carries the title and one citation_author tag per author. The export
// API timed out from this machine on Oct 20, 2026, and the abstract page did not.
export const arxivLookup = (id) => {
  const html = execFileSync("curl", ["-s", "-m", "25", `https://arxiv.org/abs/${id}`], { encoding: "utf8" });
  const title = /<meta name="citation_title" content="([^"]*)"/.exec(html)?.[1];
  if (!title) return null;
  const authors = [...html.matchAll(/<meta name="citation_author" content="([^"]*)"/g)].map((match) => entities(match[1]));
  return { title: entities(title), authors };
};

// role-outreach's collision check, through the database's real path: the sandbox cannot open it
// through the ~/.claude/skills symlink, and the check then fails closed on every address.
export const collisionLookup = (email) => {
  const output = execFileSync("/usr/bin/python3", ["-m", "scripts.collision", "--email", email, "--json"], {
    cwd: join(ROOT, "skills", "role-outreach"),
    env: { ...process.env, OUTBOUND_ROOT: join(ROOT, "skills", "outbound-sourcing") },
    encoding: "utf8",
  });
  return JSON.parse(output);
};

// role-apply's gate: blocked while an interview, assessment, recruiter or offer mail is under six
// months old, or under a published cap.
export const pipelineLookup = (company) => {
  try {
    return execFileSync("python3", [join(ROOT, "skills", "role-apply", "scripts", "gate.py"), company, "--quiet"], { encoding: "utf8" }).trim();
  } catch (error) {
    return String(error.stdout || "").trim() || "error";
  }
};

export const readLedger = (path = LEDGER) => existsSync(path)
  ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))
  : [];

// ---- the checks -------------------------------------------------------------------

export const judge = (card, { now = new Date(), offline = false, arxiv = arxivLookup, collision = collisionLookup, pipeline = pipelineLookup, ledger = [], raw = null } = {}) => {
  const fail = [], pending = [], warn = [];
  const policy = card.policy || {};

  // Who, how and what, before anything else can be judged.
  for (const field of ["act", "person", "to", "ask"]) {
    if (!card[field]) fail.push({ id: "card", why: `The card has no ${field}.` });
  }
  if (card.act && !ACTS.has(card.act)) fail.push({ id: "card", why: `act is "${card.act}"; it is one of ${[...ACTS].join(", ")}.` });
  if (card.act === "application" && !card.company) fail.push({ id: "card", why: "An application names its company, so role-apply's gate can run." });

  // Their own page, read recently, decides whether this channel is allowed at all.
  if (!policy.url || !policy.quote || !policy.read || !policy.says) {
    fail.push({ id: "policy", why: "Read the person's own page first and record its url, the date read, its words on being contacted (quote), and what they amount to (says)." });
  } else {
    if (!CLOSED.has(policy.says) && !OPEN.has(policy.says)) fail.push({ id: "policy", why: `policy.says is "${policy.says}"; it is one of ${[...CLOSED, ...OPEN].join(", ")}.` });
    if (age(policy.read, now) > 30) fail.push({ id: "policy-stale", why: `The page was read on ${policy.read}. Read it again; recruiting lines change each fall.` });
    const writing = card.act === "email" || card.act === "message";
    if (writing && CLOSED.has(policy.says)) {
      fail.push({ id: "policy-closed", why: `Their page says not to write ("${policy.quote}"). ${policy.alternative ? `Do this instead: ${policy.alternative}.` : "Record what the page says to do instead, in policy.alternative."}` });
    }
    if (writing && card.kind === "academic" && policy.says === "silent") warn.push({ id: "policy-silent", why: "The page neither invites nor forbids this. Keep the note to their research and one question." });
    if (writing && policy.says === "collaborations") warn.push({ id: "policy-collaborations", why: "The page invites collaborations, not students. Ask about the research, not for a place." });
    if (card.act === "form" && !/^https?:\/\//.test(card.to || "")) fail.push({ id: "form", why: "For a form, to is the form's URL, from the person's own page." });
  }

  // The address comes from a page we can point at, not from a guess at the pattern.
  if ((card.act === "email" || card.act === "message") && !card.address_source) {
    fail.push({ id: "address", why: "Record the page that prints this address (address_source). A guessed address reaches nobody or the wrong person." });
  }

  // What their page asks applicants to send has to be in the message.
  const files = (card.attachments || []).join(" ");
  for (const item of card.asks_for || []) {
    const pattern = MATERIALS[normalize(item)] || new RegExp(normalize(item), "i");
    if (!pattern.test(files)) fail.push({ id: "materials", why: `Their page asks for ${item}, and nothing attached carries it.` });
  }

  // Every fact about them has a source, and every paper is theirs with the title the note uses.
  for (const claim of card.claims || []) {
    if (!claim.source && !claim.arxiv) { fail.push({ id: "claim-source", why: `"${claim.text}" has no source.` }); continue; }
    if (!claim.arxiv) continue;
    if (offline) { pending.push({ id: "claim-arxiv", why: `arXiv ${claim.arxiv} was not read (offline).` }); continue; }
    let paper = null;
    try { paper = arxiv(claim.arxiv); } catch { paper = undefined; }
    if (paper === undefined) { pending.push({ id: "claim-arxiv", why: `arXiv ${claim.arxiv} could not be read. Run the gate again online.` }); continue; }
    if (!paper) { fail.push({ id: "claim-arxiv", why: `arXiv ${claim.arxiv} does not resolve.` }); continue; }
    if (claim.title && normalize(claim.title) !== normalize(paper.title)) {
      fail.push({ id: "claim-title", why: `arXiv ${claim.arxiv} is "${paper.title}", not "${claim.title}".` });
    }
    const author = claim.author ?? card.person;
    if (author && !paper.authors.some((name) => normalize(name).split(" ").includes(surname(author)))) {
      fail.push({ id: "claim-author", why: `${author} is not an author of arXiv ${claim.arxiv} ("${paper.title}").` });
    }
  }

  // Prior contact: the club wrote from the operator's own mailbox, so the inbox search and the
  // collision check both run, and the inbox search is the agent's to record.
  const prior = card.prior_contact || {};
  if (!prior.checked || !prior.gmail) {
    fail.push({ id: "prior-contact", why: "Search the operator's mail for this person (name and address) and record what came back in prior_contact.gmail, with the date checked." });
  } else if (age(prior.checked, now) > 7) {
    fail.push({ id: "prior-contact", why: `Mail was searched on ${prior.checked}. Search again.` });
  }
  if (card.act === "email" && card.to) {
    let hit;
    try { hit = collision(card.to); } catch (error) { hit = { usable: false, colliding: [card.to], degraded: [String(error.message || error)] }; }
    if (!hit.usable) fail.push({ id: "collision", why: `The collision check could not read its sources (${(hit.degraded || []).join("; ")}). It fails closed.` });
    else if (hit.colliding.length && !prior.acknowledged) fail.push({ id: "collision", why: `${card.to} is in the outbound records: the club or an earlier run already wrote to this address. Record why a second note is right in prior_contact.acknowledged, or drop it.` });
  }

  // A live process at the company closes every other channel to it.
  if (card.company) {
    const line = pipeline(card.company);
    const status = line.split(":")[0];
    if (status === "blocked" && !(card.kind === "recruiter" && card.act !== "application")) {
      fail.push({ id: "pipeline", why: `${card.company} is mid-process or capped (role-apply gate: ${line}). Write to the recruiter thread only.` });
    } else if (status === "applied-before" || status === "skipped-before") {
      warn.push({ id: "pipeline", why: `role-apply gate: ${line}. Say so in the note if it matters, and read the reason.` });
    } else if (status === "error") {
      pending.push({ id: "pipeline", why: `role-apply's gate did not run for ${card.company}.` });
    }
  }

  // Someone already reached, or someone at the same place reached lately.
  const who = normalize(card.person);
  const same = ledger.filter((entry) => normalize(entry.person) === who && entry.draft !== card.draft?.id && age(entry.date, now) < 60);
  for (const entry of same) warn.push({ id: "duplicate", why: `${card.person} already passed this gate on ${entry.date} (${entry.act}: ${entry.ask}). Is this a second note?` });
  const place = normalize(card.org);
  const near = place ? ledger.filter((entry) => normalize(entry.org) === place && normalize(entry.person) !== who && age(entry.date, now) < 30) : [];
  const named = (card.related || []).join(" ").toLowerCase();
  for (const entry of near) {
    if (!named.includes(surname(entry.person))) warn.push({ id: "same-place", why: `${entry.person} at ${entry.org} passed on ${entry.date}. If they work together, say so in the note, and list them in related.` });
  }

  // A reader who did not write it: does it make sense, is it true, is it right to send.
  const review = card.review || {};
  if (review.verdict !== "pass" || !review.by || !review.date) {
    fail.push({ id: "review", why: "A fresh reader (a subagent given the card, the draft and README's review questions, not the drafter) has to return pass. Record by, date, verdict and notes." });
  } else if (/^(self|me|drafter|author)$/i.test(review.by)) {
    fail.push({ id: "review", why: "The review was done by whoever drafted it. It needs a fresh reader." });
  } else if (age(review.date, now) > 2) {
    fail.push({ id: "review", why: `The review is from ${review.date}. Review the draft as it stands now.` });
  }

  // The draft itself, read back RAW: the mail gate's checks, plus the to line and the name.
  if (raw) {
    const draft = fromMime(raw);
    const mail = verdict(inspect(draft, { now }), { handOver: true });
    for (const item of mail.blocking) fail.push({ id: `mail-${item.id}`, why: item.why });
    for (const item of mail.warn) warn.push({ id: `mail-${item.id}`, why: item.why });
    const to = (draft.to || []).map((address) => address.toLowerCase());
    if (card.to && !to.some((address) => address.includes(card.to.toLowerCase()))) fail.push({ id: "to", why: `The draft goes to ${to.join(", ") || "nobody"}, and the card says ${card.to}.` });
    // A note to someone the operator knows greets them by first name, so any part of the name counts.
    const words = normalize(ownText(draft)).split(" ");
    if (card.person && !normalize(card.person).split(" ").some((part) => words.includes(part))) warn.push({ id: "name", why: `The note never names ${card.person}.` });
  } else if (card.act === "email") {
    fail.push({ id: "draft", why: "Read the draft back RAW and pass it with --raw, so the mail gate's checks run on the copy he will send." });
  }

  return { fail, pending, warn };
};

// ---- the command line -------------------------------------------------------------

const main = (argv) => {
  const [command, ...rest] = argv;
  if (command === "ledger") {
    const name = normalize(rest.join(" "));
    const rows = readLedger().filter((entry) => !name || normalize(entry.person).includes(name)).reverse();
    for (const entry of rows) console.log(`${entry.date}  ${entry.act.padEnd(11)} ${entry.person} (${entry.org || "-"}): ${entry.ask}`);
    return 0;
  }
  const path = rest.find((item) => !item.startsWith("--") && rest[rest.indexOf(item) - 1] !== "--raw");
  if (command !== "check" || !path) {
    console.error("usage: node kernel/reachgate/gate.mjs check <card.json> [--raw <draft.raw>] [--offline] [--no-ledger]\n       node kernel/reachgate/gate.mjs ledger [name]");
    return 2;
  }
  const card = JSON.parse(readFileSync(path, "utf8"));
  const rawIndex = rest.indexOf("--raw");
  const rawPath = rawIndex === -1 ? card.draft?.raw && resolve(dirname(path), card.draft.raw) : rest[rawIndex + 1];
  const raw = rawPath && existsSync(rawPath) ? readFileSync(rawPath, "utf8") : null;
  const { fail, pending, warn } = judge(card, { offline: rest.includes("--offline"), ledger: readLedger(), raw });
  for (const item of fail) console.log(`fail  ${item.id}: ${item.why}`);
  for (const item of pending) console.log(`wait  ${item.id}: ${item.why}`);
  for (const item of warn) console.log(`warn  ${item.id}: ${item.why}`);
  const blocking = fail.length + pending.length;
  if (blocking) {
    console.log(`reach gate: ${blocking} to settle before this goes to ${card.person}.`);
    return 1;
  }
  if (!rest.includes("--no-ledger")) {
    mkdirSync(dirname(LEDGER), { recursive: true });
    const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    appendFileSync(LEDGER, `${JSON.stringify({ date, act: card.act, person: card.person, org: card.org || "", to: card.to, ask: card.ask, draft: card.draft?.id || "" })}\n`);
  }
  console.log(card.act === "form" || card.act === "application"
    ? `reach gate: clear. Fill it to the last step; Submit is the operator's.`
    : `reach gate: clear. The send is the operator's.`);
  return 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
