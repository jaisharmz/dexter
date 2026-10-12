// node --test kernel/queue-ids.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as ids from "./queue-ids.mjs";

test("a name comes from the title's key words, and a clash takes the next suffix", () => {
  const taken = new Set();
  const first = ids.deriveName("[AI] Prep packs for every interview booked Oct 13 to Oct 23", taken);
  assert.equal(first, "prep-packs-every");
  taken.add(first);
  assert.equal(ids.deriveName("[Pat] Prep packs: every one of them", taken), "prep-packs-every-2");
  assert.equal(ids.deriveName("[AI] Loops"), "loops-item", "one key word still makes two");
  assert.equal(ids.deriveName("[AI] a"), "queue-item");
  assert.equal(ids.deriveName("Résumé for 2026"), "resume-item", "accents fold away and numbers drop out");
  const owners = ids.ownerWords({ items: [{ title: "[Pat] sign the form" }, { title: "[AI] tidy up" }] });
  assert.deepEqual([...owners], ["pat", "pats"]);
  assert.equal(ids.deriveName("[AI] Read Pat's notes on the design", new Set(), owners), "read-notes-design", "an owner's name says whose, not what");
  for (const name of [first, "prep-packs-every-2", "loops-item", "queue-item"]) assert.match(name, ids.NAME);
});

test("a name is two to four lowercase words, never a number", () => {
  assert.equal(ids.checkName("  Interview-Prep "), "interview-prep");
  for (const bad of ["interview", "12-14", "two words", "a-b-c-d-e-f", "-lead", "x_y"]) assert.throws(() => ids.checkName(bad), /two to four lowercase words/, bad);
});

test("an item resolves by number, uuid or name, and an old number through the renumber that retired it", () => {
  const db = {
    items: [
      { id: 1, uuid: "3b241101-e2bb-4255-8caf-4136c566a962", name: "interview-prep", state: "open" },
      { id: 2, uuid: "6f1c0a52-14f3-4b8f-9d56-2a35d5b8e0a1", name: "practice-kit", state: "open" },
      { id: null, uuid: "9d5e2c1b-0a7f-4e3d-8c2b-1f0e9d8c7b6a", name: "agent-signin", state: "done" },
    ],
    renumbers: [{ epoch: 1, at: new Date().toISOString(), by: "test", from: { 147: "9d5e2c1b-0a7f-4e3d-8c2b-1f0e9d8c7b6a", 361: "6f1c0a52-14f3-4b8f-9d56-2a35d5b8e0a1", 2: "3b241101-e2bb-4255-8caf-4136c566a962" } }],
  };
  assert.equal(ids.resolve(db, "1").item.name, "interview-prep");
  assert.equal(ids.resolve(db, "#2").item.name, "practice-kit", "a number in use now wins over an old one");
  assert.equal(ids.resolve(db, "6F1C0A52-14F3-4B8F-9D56-2A35D5B8E0A1").by, "uuid");
  assert.equal(ids.resolve(db, "agent-signin").by, "name");
  const old = ids.resolve(db, "361");
  assert.deepEqual([old.by, old.item.name], ["old number", "practice-kit"]);
  assert.match(ids.resolutionNote(db, "361", old), /#361 is a number from before the renumber of \d{4}-\d{2}-\d{2}: it means #2 practice-kit/);
  assert.match(ids.resolutionNote(db, "2", ids.resolve(db, "2")), /#2 is #2 practice-kit now; before the renumber of .*, #2 meant #1 interview-prep/);
  assert.equal(ids.resolve(db, "147").item.name, "agent-signin", "a done item keeps its old number as an alias");
  assert.equal(ids.label(ids.resolve(db, "147").item), "agent-signin", "and shows by name, having no number");
  assert.equal(ids.resolve(db, "999"), null);
  assert.equal(ids.resolve(db, "no-such-item"), null);
  db.renumbers[0].at = "2026-01-01T00:00:00.000Z";
  assert.equal(ids.resolutionNote(db, "2", ids.resolve(db, "2")), null, "after a week a reused number no longer carries the note");
});

test("a #N inside quotation marks is someone's words, not a reference", () => {
  const swap = (text) => ids.replaceMentions(text, (whole, n) => `#${n * 10}`);
  assert.equal(swap("Dense numbering ('if there is a #380 then there must be at least 380 things'), after #4"), "Dense numbering ('if there is a #380 then there must be at least 380 things'), after #40");
  assert.equal(swap(`Pat's reply to #16: "keep #2 as it is" and #3`), `Pat's reply to #160: "keep #2 as it is" and #30`);
  assert.equal(swap("waits on #5, #6"), "waits on #50, #60");
});

test("depends_on can hold uuids or, from before uuids, numbers", () => {
  const db = { items: [{ id: 4, uuid: "3b241101-e2bb-4255-8caf-4136c566a962", name: "corpus-fill" }] };
  assert.equal(ids.depItem(db, 4).name, "corpus-fill");
  assert.equal(ids.depItem(db, "3b241101-e2bb-4255-8caf-4136c566a962").name, "corpus-fill");
  assert.equal(ids.depItem(db, 5), undefined);
  const legacy = { items: [{ id: 1 }, { id: 2, uuid: "kept" }] };
  assert.equal(ids.ensureUuids(legacy), 1);
  assert.match(legacy.items[0].uuid, ids.UUID);
  assert.equal(legacy.items[1].uuid, "kept", "an existing uuid never changes");
});
