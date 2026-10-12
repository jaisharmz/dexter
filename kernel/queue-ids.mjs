// Who a queue item is, as opposed to where it sits. Every item has three handles:
//
//   uuid   permanent and hidden, from crypto.randomUUID() at filing time
//   name   permanent too: two to four kebab-case words, such as interview-prep, unique in the store
//   id     the visible number, which `pqueue renumber` keeps dense: open items 1 to N in filing order
//
// The operator asked for the dense numbers on 2026-10-10: "if there is a #380 then there must be at
// least 380 things in the queue". A number therefore changes when the queue is renumbered, so
// anything that has to stay true (depends_on, the merge driver, a reference in an email) uses the
// uuid or the name. A number from before a renumber still resolves through `db.renumbers`, which
// records each renumber's old numbers. Shared by kernel/pqueue-core.mjs, kernel/queue.mjs (which
// dexter ships), kernel/queue-merge.mjs and the board.

import { createHash, randomUUID } from "node:crypto";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Two to four words, and room for a clash suffix such as -2. The first word starts with a letter,
// so a name can never be mistaken for a number.
export const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,4}$/;

const STOP = new Set(
  ("a an and any are as at be been but by can could do does done for from get got had has have he her his how i if in into is it its "
    + "just let me more most my no not now of off on once one or our out over so some than that the their them then there these "
    + "they this those to too up us very was we were what when where which while who why will with without would you your ai").split(" "),
);

export const newUuid = () => randomUUID();

const WEEK = 7 * 24 * 3600 * 1000;

export const untagged = (title) => String(title ?? "").replace(/^\s*\[[^\]]*\]\s*/, "");

export const checkName = (name) => {
  const clean = String(name ?? "").trim().toLowerCase();
  if (!NAME.test(clean)) throw new Error(`a name is two to four lowercase words joined by hyphens, such as interview-prep, not "${name}"`);
  return clean;
};

// The people who own items ("[Pat] ..."), and their possessives, which say whose an item is and
// not what it is, so a name leaves them out.
export const ownerWords = (db) =>
  new Set((db.items ?? []).flatMap((i) => {
    const owner = /^\s*\[([^\],\]]+)/.exec(i.title ?? "")?.[1]?.trim().toLowerCase();
    return owner && owner !== "ai" && !owner.includes(" ") ? [owner, `${owner}s`] : [];
  }));

// A name made from the title's first key words, with -2, -3 ... when another item has it.
export const deriveName = (title, taken = new Set(), drop = new Set()) => {
  const words = untagged(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP.has(word) && !drop.has(word) && !/^\d+$/.test(word));
  const base = (words.length >= 2 ? words.slice(0, 3) : words.length === 1 ? [words[0], "item"] : ["queue", "item"]).join("-");
  return unique(base, taken);
};

export const unique = (base, taken) => {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
};

export const takenNames = (db, except) => new Set((db.items ?? []).filter((i) => i !== except && i.name).map((i) => i.name));

// An item filed before uuids existed gets one made from its filing time and number, the two
// things every machine agrees on, so two machines that fill them in apart give the same item the
// same uuid and a later merge does not see two items. Shaped as a version-8 (custom) UUID.
export const legacyUuid = (item) => {
  const hex = createHash("sha256").update(`intel-queue:${item.created ?? ""}:${item.id}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

export const ensureUuids = (db) => {
  let added = 0;
  for (const item of db.items ?? []) {
    if (item.uuid) continue;
    item.uuid = legacyUuid(item);
    added++;
  }
  return added;
};

// "#12 interview-prep", or just the name once an item has no number (a done item after a renumber).
export const label = (item) => (item.id == null ? item.name ?? `item ${String(item.uuid).slice(0, 8)}` : `#${item.id}${item.name ? ` ${item.name}` : ""}`);

// An item by its number, its uuid or its name. A number nobody holds now may be an old one: the
// newest renumber that had it says which item it meant.
export const resolve = (db, ref) => {
  const text = String(ref ?? "").trim().replace(/^#/, "");
  const items = db.items ?? [];
  if (UUID.test(text)) {
    const item = items.find((i) => i.uuid === text.toLowerCase());
    return item ? { item, by: "uuid" } : null;
  }
  if (/^\d+$/.test(text)) {
    const item = items.find((i) => i.id === Number(text));
    if (item) return { item, by: "number" };
    for (const renumber of [...(db.renumbers ?? [])].reverse()) {
      const uuid = renumber.from?.[text];
      const was = uuid && items.find((i) => i.uuid === uuid);
      if (was) return { item: was, by: "old number", epoch: renumber.epoch, at: renumber.at };
    }
    return null;
  }
  const item = items.find((i) => i.name && i.name === text.toLowerCase());
  return item ? { item, by: "name" } : null;
};

// What an old number meant, when a number in use now was another item's before a renumber.
export const shadowed = (db, number) => {
  for (const renumber of [...(db.renumbers ?? [])].reverse()) {
    const uuid = renumber.from?.[String(number)];
    if (!uuid) continue;
    const was = (db.items ?? []).find((i) => i.uuid === uuid);
    return was && was.id !== Number(number) ? { item: was, epoch: renumber.epoch, at: renumber.at } : null;
  }
  return null;
};

// "#N" in a title, through fn, except inside quotation marks, where a number is someone's words
// and not a reference ('if there is a #380 then there must be at least 380 things'). A quote opens
// after a space or bracket and closes before one, so the apostrophe in "Pat's" opens nothing.
export const replaceMentions = (text, fn) => {
  const quoted = [];
  for (const m of text.matchAll(/(^|[\s(\[:;,])(['"‘“])(.*?)(['"’”])(?=$|[\s.,;:)\]!?])/g)) {
    const start = m.index + m[1].length;
    quoted.push([start, start + m[2].length + m[3].length + m[4].length]);
  }
  return text.replace(/#(\d+)\b/g, (whole, n, at) => (quoted.some(([from, to]) => at >= from && at < to) ? whole : fn(whole, Number(n))));
};

// depends_on holds uuids. A store from before uuids holds numbers, which name items by id.
export const depItem = (db, dep) => (typeof dep === "number" ? (db.items ?? []).find((i) => i.id === dep) : resolve(db, dep)?.item);

// What a reference resolved through, when that is worth saying: an old number or a shadowed one.
export const resolutionNote = (db, ref, found) => {
  if (!found) return null;
  if (found.by === "old number") return `#${String(ref).replace(/^#/, "")} is a number from before the renumber of ${found.at?.slice(0, 10) ?? "an earlier day"}: it means ${label(found.item)}`;
  if (found.by === "number") {
    const was = shadowed(db, found.item.id);
    // Only for a week after the renumber, while old numbers are still about.
    if (was && Date.now() - Date.parse(was.at ?? 0) < WEEK) return `#${found.item.id} is ${label(found.item)} now; before the renumber of ${was.at?.slice(0, 10)}, #${found.item.id} meant ${label(was.item)}`;
  }
  return null;
};
