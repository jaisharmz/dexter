#!/usr/bin/env node
// The mail gate: what a draft says it carries, checked against what it carries, before it
// reaches anyone. The leak gate in kernel/public/sync.sh keeps a private line out of dexter;
// this keeps a false line out of an inbox. It exists because several notes went out saying
// "We have attached some materials on what we have worked on" with two résumés attached and
// nothing else, and the same template sat in more drafts.
//
//   node kernel/mailgate/gate.mjs check --json <file>   a create_draft, update_draft or send input
//   node kernel/mailgate/gate.mjs check --raw <file>    a draft read back RAW (base64url or .eml)
//   add --sending to judge it as a send, which also blocks attachments still to be added
//
// Exit 1 when anything blocks. The audit hook runs the same checks on every draft and send
// call (kernel/audit/policy.mjs, rule mail-gate), so an agent cannot skip it.
//
// Three outcomes per finding:
//   fail     the text says something the message contradicts. Blocks drafts and sends.
//   pending  the text claims an attachment and none is attached yet. Fine while a draft waits
//            for the operator to attach files, and a block on any send.
//   warn     worth a look, never blocks.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ---- reading a message ------------------------------------------------------------

const list = (value) => [].concat(value || []).flatMap((item) => String(item).split(/[,;]/)).map((item) => item.trim()).filter(Boolean);

// The shape of a Gmail connector call: create_draft, update_draft, send_message, reply.
// update_draft merges: a recipient field it omits keeps the draft's value, so with merge the
// field stays unknown (undefined) and the checks that need it are skipped. Attachments do not
// merge, since an update that omits them removes them.
export const fromToolInput = (input = {}, { merge = false } = {}) => ({
  to: merge && input.to === undefined ? undefined : list(input.to),
  cc: merge && input.cc === undefined ? undefined : list(input.cc),
  bcc: merge && input.bcc === undefined ? undefined : list(input.bcc),
  subject: input.subject,
  text: input.body || "",
  html: input.htmlBody || input.html_body || "",
  attachments: (input.attachments || []).map((file) => ({ filename: file.filename || "", mimeType: file.mimeType || file.mime_type || "", inline: Boolean(file.inline) })),
});

const decodeWords = (value = "") => value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g, (_, charset, encoding, data) => {
  const bytes = /b/i.test(encoding) ? Buffer.from(data, "base64") : Buffer.from(data.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (__, hex) => String.fromCharCode(parseInt(hex, 16))), "latin1");
  return bytes.toString(/utf-?8/i.test(charset) ? "utf8" : "latin1");
});

const headerBlock = (block) => {
  const headers = {};
  for (const line of block.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const match = /^([^:]+):\s*(.*)$/.exec(line);
    if (match) headers[match[1].toLowerCase()] = match[2];
  }
  return headers;
};

const param = (header = "", name) => {
  const extended = new RegExp(`${name}\\*=(?:[^']*'[^']*')?("?)([^";]+)\\1`, "i").exec(header);
  if (extended) return decodeURIComponent(extended[2]);
  const plain = new RegExp(`${name}=("?)([^";]+)\\1`, "i").exec(header);
  return plain ? decodeWords(plain[2]) : "";
};

const decodeBody = (body, encoding = "") => {
  if (/base64/i.test(encoding)) return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
  if (/quoted-printable/i.test(encoding)) {
    const bytes = body.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return Buffer.from(bytes, "latin1").toString("utf8");
  }
  return body;
};

const leaves = (source) => {
  const split = /\r?\n\r?\n/.exec(source);
  const headers = headerBlock(split ? source.slice(0, split.index) : source);
  const body = split ? source.slice(split.index + split[0].length) : "";
  const type = headers["content-type"] || "text/plain";
  if (/^multipart\//i.test(type)) {
    const boundary = param(type, "boundary");
    if (!boundary) return [];
    return body.split(`--${boundary}`).slice(1).filter((part) => !part.startsWith("--")).flatMap((part) => leaves(part.replace(/^\r?\n/, "")));
  }
  return [{ headers, type, body }];
};

// A raw RFC 822 message, or Gmail's RAW field (base64url of one).
export const fromMime = (raw) => {
  const source = /^[A-Za-z0-9_-]+=*\s*$/.test(raw.slice(0, 400).replace(/\s/g, "")) && !/^[\w-]+:/m.test(raw.slice(0, 200))
    ? Buffer.from(raw.replace(/\s+/g, ""), "base64url").toString("utf8")
    : raw;
  const top = headerBlock(source.slice(0, (/\r?\n\r?\n/.exec(source) || { index: source.length }).index));
  const draft = { to: list(top.to), cc: list(top.cc), bcc: list(top.bcc), subject: decodeWords(top.subject || ""), text: "", html: "", attachments: [] };
  for (const leaf of leaves(source)) {
    const disposition = leaf.headers["content-disposition"] || "";
    const filename = param(disposition, "filename") || param(leaf.type, "name");
    const textual = /^text\/(plain|html)/i.test(leaf.type);
    if (textual && !filename && !/^attachment/i.test(disposition)) {
      const decoded = decodeBody(leaf.body, leaf.headers["content-transfer-encoding"]);
      if (/^text\/html/i.test(leaf.type) && !draft.html) draft.html = decoded;
      if (/^text\/plain/i.test(leaf.type) && !draft.text) draft.text = decoded;
      continue;
    }
    const inline = /^inline/i.test(disposition) || (Boolean(leaf.headers["content-id"]) && /^image\//i.test(leaf.type) && !/^attachment/i.test(disposition));
    draft.attachments.push({ filename, mimeType: leaf.type.split(";")[0].trim(), inline });
  }
  return draft;
};

// ---- what the sender wrote, without the quoted thread -----------------------------

// Where the sender's own words end: a quoted thread, or a review copy that quotes the draft
// under review in a bordered block, which is how Dexter sends drafts out for review.
const QUOTE_HTML = /<div[^>]*class="?[^">]*gmail_(?:extra|quote)|<blockquote|<div[^>]*id="?(?:appendonsend|divRplyFwdMsg)|<hr[^>]*display:inline-block|<div[^>]*style="[^"]*border-left/i;

const htmlText = (html) => html
  .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
  .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p|li|h\d|tr)>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const QUOTE_LINE = /^(On .+ wrote:|-{2,}\s*Original Message|_{8,}|From:\s.+)$/i;

export const ownText = (draft) => {
  const html = draft.html || "";
  const source = html ? htmlText(QUOTE_HTML.test(html) ? html.slice(0, QUOTE_HTML.exec(html).index) : html) : (draft.text || "");
  const lines = source.split(/\r?\n/);
  const cut = lines.findIndex((line, index) => QUOTE_LINE.test(line.trim()) || (/^On\s/.test(line.trim()) && /wrote:\s*$/.test(lines[index + 1] || "")));
  return (cut === -1 ? lines : lines.slice(0, cut)).filter((line) => !/^\s*>/.test(line)).join("\n").trim();
};

// ---- the checks ---------------------------------------------------------------------

const sentences = (text) => text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z"'(])/).filter(Boolean);
const RESUME_FILE = /r[eé]sum[eé]|curriculum[ _-]?vitae|(^|[^a-z])cv([^a-z]|$)/i;
const RESUME_WORD = /\b(r[eé]sum[eé]s?|CVs?)\b/i;

// What a sentence says is attached: the words the verb points at, or null when the sentence
// claims no attachment ("happy to attach my transcript" offers one).
const VERB = /\b(attached|attaching|enclosed|enclosing)\b|\b(?:I|we)\s+(?:attach|enclose)\b/i;
const OFFER = /\b(can|could|will|would|happy|glad|if|want|let|able)\b/i;
const STOP = /\b(which|that|describing|summarizing|summarising|showing|highlighting|listing|detailing|where|for|to|so|in case)\b|[,;:]/i;
const claimObjects = (sentence) => {
  const verb = VERB.exec(sentence);
  if (!verb) return null;
  const before = sentence.slice(0, verb.index);
  if (OFFER.test(before.split(/\s+/).slice(-4).join(" "))) return null;
  // "Our resumes and a paper are attached." names its objects before the verb.
  if (/\b(is|are)\s*$/i.test(before) && before.trim().split(/\s+/).length > 1) return before.replace(/\b(is|are)\s*$/i, "");
  // "Attached are our resumes." and "We have attached our resumes and some of our work."
  const after = sentence.slice(verb.index + verb[0].length).replace(/^\s*(is|are|please find|you will find)\b/i, "");
  const stop = STOP.exec(after);
  return stop ? after.slice(0, stop.index) : after;
};
const RESUMES_PLURAL = /\b(r[eé]sum[eé]s|CVs|both (of our )?r[eé]sum[eé])\b/i;
const OTHER_WORD = /\b(materials?|papers?|preprints?|work|writing samples?|samples?|portfolio|slides|deck|flyer|one-pager|transcripts?|cover letter|report|publications?|thesis|poster|code|notebook|proposal|summary)\b/i;
const PLACEHOLDER = /(_{2,}|\[(?:CONFIRM|TODO|TBD|NAME|COMPANY|ROLE|DATE|LINK)[^\]]*\]|\bTODO\b|\bTBD\b|XXX|\{\{|\}\}|<insert|lorem ipsum)/i;
const CC_CLAIM = /\bcc['’]?(?:e)?d\b|\(cc\b|\bcced\b/i;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAY_DATE = /\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*\.?,?\s+(?:the\s+)?(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})|(\d{1,2})\/(\d{1,2}))\b/gi;
const GREETING = /^(?:hello|hi|hey|dear|good (?:morning|afternoon|evening))\s+([A-Z][\w'’.-]+)/im;

const weekdayMismatches = (text, now) => {
  const found = [];
  for (const match of text.matchAll(WEEKDAY_DATE)) {
    const month = match[2] ? MONTHS.indexOf(match[2].slice(0, 3).toLowerCase()) : Number(match[4]) - 1;
    const day = Number(match[3] || match[5]);
    if (month < 0 || month > 11 || day < 1 || day > 31) continue;
    // The nearest such date that is not more than a month gone.
    let year = now.getUTCFullYear();
    if (Date.UTC(year, month, day) < now.getTime() - 31 * 86400000) year += 1;
    const actual = WEEKDAYS[new Date(Date.UTC(year, month, day)).getUTCDay()];
    const written = WEEKDAYS.find((name) => name.startsWith(match[1].toLowerCase().slice(0, 3)));
    if (written && written !== actual) found.push(`"${match[0].trim()}" names a ${written[0].toUpperCase()}${written.slice(1)}, but that date in ${year} is a ${actual[0].toUpperCase()}${actual.slice(1)}.`);
  }
  return found;
};

// draft: { to, cc, bcc, subject, text, html, attachments: [{ filename, mimeType, inline }] }
export const inspect = (draft, { now = new Date() } = {}) => {
  const fail = [], pending = [], warn = [];
  const own = ownText(draft);
  const files = (draft.attachments || []).filter((file) => !file.inline);
  const named = files.map((file) => file.filename || "an unnamed file").join(", ") || "nothing";

  // What the text says is attached, sentence by sentence.
  const claims = sentences(own).filter((sentence) => claimObjects(sentence) !== null);
  for (const claim of claims) {
    const objects = claimObjects(claim);
    const needResumes = RESUMES_PLURAL.test(objects) ? 2 : RESUME_WORD.test(objects) ? 1 : 0;
    const needOther = OTHER_WORD.test(objects.replace(new RegExp(RESUME_WORD.source, "gi"), "")) ? 1 : 0;
    const quoted = `"${claim.length > 110 ? `${claim.slice(0, 107)}...` : claim}"`;
    if (!files.length) {
      pending.push({ id: "attachment-missing", why: `The text says ${quoted}, and nothing is attached.` });
      continue;
    }
    if (needOther && files.every((file) => RESUME_FILE.test(file.filename))) {
      fail.push({ id: "attachment-kind", why: `The text says ${quoted}, but every attachment is a résumé (${named}). Name what is attached ("We have attached our resumes.") or attach the materials.` });
      continue;
    }
    if (files.length < needResumes + needOther) {
      fail.push({ id: "attachment-count", why: `The text says ${quoted}, which needs at least ${needResumes + needOther} files, and ${files.length} ${files.length === 1 ? "is" : "are"} attached (${named}).` });
      continue;
    }
    if (needResumes && !files.some((file) => RESUME_FILE.test(file.filename))) {
      warn.push({ id: "attachment-resume-name", why: `The text says ${quoted}, and no attachment is named like a résumé (${named}).` });
    }
  }
  if (files.length && !claims.length) warn.push({ id: "attachment-unmentioned", why: `${named} ${files.length === 1 ? "is" : "are"} attached, and the text never says so.` });

  // Inline images copied in from a quoted reply, such as a signature logo (create_draft with replyToMessageId does this).
  const images = (draft.attachments || []).filter((file) => file.inline);
  if (images.length) fail.push({ id: "inline-image", why: `${images.length} inline image${images.length === 1 ? "" : "s"} (${images.map((file) => file.filename || file.mimeType).join(", ")}) rode in from the quoted thread. Strip them with update_draft and the real attachments re-provided.` });

  const placeholder = PLACEHOLDER.exec(own);
  if (placeholder) fail.push({ id: "placeholder", why: `A placeholder is still in the text: "${placeholder[0]}".` });

  if (CC_CLAIM.test(own) && draft.cc !== undefined && !draft.cc.length && !(draft.bcc || []).length) fail.push({ id: "cc-missing", why: "The text says someone is cc'd, and the cc line is empty." });

  for (const why of weekdayMismatches(own, now)) fail.push({ id: "weekday-date", why });

  const greeting = GREETING.exec(own);
  const greeted = greeting?.[1]?.replace(/[!,.:]+$/, "");
  if (greeted && !/^(all|everyone|team|there|both|folks|y'all)$/i.test(greeted) && (draft.to || []).length) {
    const fits = draft.to.some((address) => {
      const local = (/<([^>]+)>/.exec(address)?.[1] || address).split("@")[0].toLowerCase();
      const display = address.toLowerCase();
      const name = greeted.toLowerCase();
      return local.includes(name) || display.includes(name) || local[0] === name[0];
    });
    if (!fits) warn.push({ id: "greeting-name", why: `The greeting names ${greeted}, which matches no recipient (${draft.to.join(", ")}).` });
  }

  const wrapped = ((draft.html || "").match(/https?:\/\/www\.google\.com\/url\?q=/g) || []).length;
  if (wrapped) warn.push({ id: "wrapped-links", why: `${wrapped} link${wrapped === 1 ? " is" : "s are"} wrapped in google.com/url redirects by the connector.` });
  if (/[—–]/.test(own)) warn.push({ id: "dash", why: "The text has an em or en dash." });
  if (draft.subject !== undefined && !String(draft.subject).trim()) fail.push({ id: "subject", why: "The subject is empty." });

  return { fail, pending, warn };
};

// ---- the command line -------------------------------------------------------------

const main = (argv) => {
  const [command, ...rest] = argv;
  const flag = (name) => { const index = rest.indexOf(name); return index === -1 ? null : rest[index + 1]; };
  if (command !== "check" || (!flag("--json") && !flag("--raw"))) {
    console.error("usage: node kernel/mailgate/gate.mjs check (--json <tool-input.json> | --raw <draft.raw|draft.eml>) [--sending]");
    return 2;
  }
  const draft = flag("--json") ? fromToolInput(JSON.parse(readFileSync(flag("--json"), "utf8"))) : fromMime(readFileSync(flag("--raw"), "utf8"));
  const sending = rest.includes("--sending");
  const { fail, pending, warn } = inspect(draft);
  const blocking = [...fail, ...(sending ? pending : [])];
  for (const item of blocking) console.log(`fail  ${item.id}: ${item.why}`);
  for (const item of sending ? [] : pending) console.log(`wait  ${item.id}: ${item.why}`);
  for (const item of warn) console.log(`warn  ${item.id}: ${item.why}`);
  console.log(blocking.length ? `mail gate: ${blocking.length} to fix before this goes out.` : "mail gate: clean.");
  return blocking.length ? 1 : 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
