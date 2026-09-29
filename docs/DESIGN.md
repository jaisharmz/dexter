# Dexter — Design

As-built, 2026-08-31. Sections marked **built** are running; the rest is queued.
Founding instructions: `home/prompts/2026-08-30-openclaw-setup.md` (verbatim, preserved).

---

## 1. What this is

A personal agent OS. Discord is the shell, `intel/` is the filesystem, OpenClaw is the
kernel. The product is not the skills — it's the substrate that produces skills.

Three lines in the founding document say the same thing and set the whole design: the
pointer-to-a-pointer aside, "expect AI to get better... a future version of you might,"
and "a place designated for my raw prompts and ideas." Judge every decision by whether
it makes the *next* thing cheaper to build.

### Principles

1. **Reuse before build.** Configure what exists; write only what doesn't. Check
   ClawHub before authoring anything new.
2. **Capture beats interpretation.** Raw prompts and documents stored verbatim. A
   better model reads them later.
3. **Defer, don't drop.** Blocked work lives in the queue with its dependencies, not
   in anyone's head.
4. **Structure enforces privacy.** A repo boundary, not a habit.
5. **Spend context like money.** Per-channel sessions, subagents for fan-out.

Full versions live in `kernel/guidelines/`, pullable into any prompt via the
`guidelines` skill.

---

## 2. Stack — built

Almost everything turned out to be configuration. What the plan expected to build and
didn't need to is listed honestly, because that's the principle working.

| Requirement | Mechanism | Status |
|---|---|---|
| Discord as the interface | `channels.discord` + guild allowlist | built |
| Dexter identity | `SOUL.md` / `IDENTITY.md` in workspace root | built (IDENTITY unfilled) |
| Clean context per channel | each Discord channel is an isolated session | free |
| Skills in `intel/` reach Discord | workspace **is** `intel/`, so `skills/` is priority-1 discovery | built |
| Skills hot-reload | `skills.load.watch` | built |
| Polling bot | native interactive components — no second bot | available |
| Scheduled + deferred work | `openclaw cron` + `kernel/queue.mjs` | built |
| Subagent fan-out | native | free |
| Skill registry channel | cron → `#skills` | built |
| Effort router | — | **queued (#5)** |
| Modes | per-channel in `etc/channels.json`; enforcement pending | partial |
| Loops (adversarial, judge) | skills | **queued (#6)** |

**Deleted from this design rather than built:** an `extraDirs` sync bridge for skills,
and a second polling bot. Both were unnecessary once the framework was read properly.

---

## 3. Filesystem — built

```
intel/                     ← public framework repo
├── AGENTS.md              agent operating instructions (+ Conventions pointer)
├── SOUL.md IDENTITY.md    persona; IDENTITY still unfilled by Dexter
├── BOOTSTRAP.md           birth certificate, deleted after first run
├── boot/                  install + bootstrap
├── kernel/                queue.mjs, guidelines/, reasoning.md, jobs/
├── etc/channels.json      channel map: id, group, mode, write direction
├── skills/                CANONICAL. ~/.claude/skills symlinks here
├── var/                   queue state, logs, router traces
├── docs/                  this file
├── side_projects/
└── home/                  ← PRIVATE repo, gitignored by the parent
    ├── prompts/           raw prompts, verbatim, timestamped
    ├── corpus/            documents Jai wrote
    ├── reference/         documents other people wrote — never mixed with corpus
    └── people/            contacts, VC map
```

**Privacy.** `home/` is a separate repository. A global `*.csv` rule is the backstop,
because data files are where contact details end up, whatever folder they sit in.

**Skills.** One tree serves both Claude Code and Dexter. Six skills: `papers`,
`industry-research`, `outbound-sourcing`, `proof-project`, `role-outreach`,
`role-sourcing`, plus `guidelines`. `papers` and `outbound-sourcing` are submodules.

---

## 4. Discord — built

Server `dexter` (`000000000000000000`), 16 channels. Map with IDs, modes, and write
direction in `etc/channels.json`; each channel has its purpose pinned.

**System** — `#dexter` `#skills` `#queue` `#inbox` `#log` `#thinking` (+ `#general`)
**Domains** — `#recruiting` `#outreach` `#sourcing` `#projects` `#experiments`
`#ideas` `#learning` `#people` `#health`

**Write direction.** `#skills`, `#queue`, `#log`, `#thinking` are Dexter-written and
Jai-read: he never files a queue entry by hand. Ask for a feature in any channel and
Dexter writes the queue item. Everywhere else, either side can start.

**Modes** (`auto` / `plan` / `approve`) default per blast radius: `#experiments` and
`#ideas` are `auto`, `#outreach` is `approve`, most else is `plan`. Any message
overrides. Currently declarative — enforcement ships with the router.

**Reasoning** is surfaced per `kernel/reasoning.md`: answers are plain messages,
reasoning is always a muted embed. Long tasks thread their reasoning off the
triggering message; unattended work goes to `#thinking`.

---

## 5. Effort router — queued (#5)

Classify every inbound message on two axes: **effort** (`low` / `context` / `harness` /
`loop`, extensible) and **repeatability** (would a skill pay for itself?).

Two commitments, both against the obvious approach:

1. The routing table is a file in `kernel/` that Jai can read and edit — not a
   prompt-time judgment. Corrections persist.
2. Every decision logs to `#log` with inputs and chosen route. Without a trace,
   misrouting is indistinguishable from bad execution and the router rots invisibly.

Repeatability *proposes* a skill in `#inbox` with a button. It never builds one
unprompted.

Sequenced after context ingestion on purpose: the table should be calibrated on how
Jai actually writes, not on a guess.

---

## 6. Queue and heartbeat — built

`kernel/queue.mjs` — items carry `depends_on`, are topologically sorted (Kahn), and
`next` returns the highest-priority item whose dependencies are all done. Cycles throw
and name the cycle. A native OpenClaw heartbeat runs every 30 min; a daily cron posts
the queue to `#queue`.

This is what makes "queue the health app until the main piece is done" mechanical
rather than remembered.

---

## 7. Build order

Done: **0** bootstrap · **1** skill unification · **2** filesystem + repos ·
**3** queue + heartbeat · **4** channel topology

Remaining, in dependency order:
**5** context ingestion (videos, profile, Gmail/Drive/Discord sweep, corpus) →
**6** effort router → **7** loops + mode enforcement → **8** domain build-outs →
**9** cloud node.

Live state is always `node kernel/queue.mjs list`, not this list.

---

## 8. Open questions

- **Sleep.** Clamshell-on-power is the weakest link. If it proves flaky, the cloud
  node moves up.
- **Learning video.** Not yet watched. It's meant to shape how the system teaches, so
  it may change phases 5–8. Real dependency, not a formality.
- **IDENTITY.md** is deliberately unfilled — Dexter picks its own creature and vibe on
  first run.
- **VC contacts.** The founding document asks whether Jai already has any. Unanswerable
  until ingestion.
- **Mode enforcement.** Modes are declared but not yet enforced; that lands with the
  router.
