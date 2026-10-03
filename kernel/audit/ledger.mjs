// The audit ledger: one JSON line per agent event, a file per day, under var/log/audit/.
// Shared by hook.mjs, which writes it, and audit.mjs, which reads it back.
//
// var/log/ is gitignored, so the ledger never reaches a push. It still holds tool inputs,
// so every string is cut short and anything shaped like a secret is replaced first.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const DIR = process.env.AUDIT_DIR || join(ROOT, "var/log/audit");
export const STATE = join(DIR, "state");

// Local date, so a day's file matches the operator's day rather than UTC's.
export const day = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const fileFor = (date) => join(DIR, `${day(date)}.jsonl`);

// ---- what a record may carry -----------------------------------------------------

const SECRET_KEY = /pass(word|wd)?|secret|token|api_?key|authorization|cookie|credential|otp|ssn/i;
const SECRET_VALUE = [
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/gi,
  /\b[MN][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g, // Discord bot token
];
const LIMIT = 400;

export const scrub = (text, limit = LIMIT) => {
  let out = String(text);
  for (const pattern of SECRET_VALUE) out = out.replace(pattern, "[secret]");
  return out.length > limit ? `${out.slice(0, limit)}…(+${out.length - limit})` : out;
};

// A copy of a tool input that is safe and small enough to keep.
export const redact = (value, depth = 0) => {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return scrub(value);
  if (depth > 3) return "[nested]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value).slice(0, 40)) {
      out[key] = SECRET_KEY.test(key) && item ? "[redacted]" : redact(item, depth + 1);
    }
    return out;
  }
  return String(value);
};

// ---- writing and reading ---------------------------------------------------------

export const append = (record) => {
  mkdirSync(DIR, { recursive: true });
  appendFileSync(fileFor(new Date(record.ts)), JSON.stringify(record) + "\n");
};

const parseLines = (text) => text.split("\n").filter(Boolean).flatMap((line) => {
  try { return [JSON.parse(line)]; } catch { return []; }
});

// Every record at or after `since` (a Date), oldest first.
export const read = (since) => {
  if (!existsSync(DIR)) return [];
  const first = day(since);
  return readdirSync(DIR).filter((name) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name) && name.slice(0, 10) >= first)
    .sort()
    .flatMap((name) => parseLines(readFileSync(join(DIR, name), "utf8")))
    .filter((record) => new Date(record.ts) >= since);
};

// "24h", "7d", "90m" or an ISO date, as a Date.
export const sinceArg = (text = "24h") => {
  const match = /^(\d+)([mhd])$/.exec(text);
  if (match) return new Date(Date.now() - Number(match[1]) * { m: 60e3, h: 3600e3, d: 86400e3 }[match[2]]);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error(`not a time: ${text} (use 90m, 24h, 7d or a date)`);
  return date;
};

export const ageDays = (path) => (Date.now() - statSync(path).mtimeMs) / 86400e3;
