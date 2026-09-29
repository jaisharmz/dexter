# Calling convention

Two sigils. `/` **does** something. `+` **adds a lens** to what you're already asking.
That's the whole language — if you have to look anything else up, it failed.

```
/papers world models              invoke a skill
+deslop write me a summary        apply a guideline to this message
+deslop +abstraction  <task>      stack as many lenses as you want
??                                show everything available
```

## `/` — skills

`/<skill> <args>`. Native OpenClaw slash commands, so Discord autocompletes them and
the argument hints show inline. `/papers`, `/loops`, `/dispatch`, `/guidelines`,
`/industry-research`, `/outbound-sourcing`, `/proof-project`, `/role-sourcing`,
`/role-outreach`.

Anything in `intel/skills/` with a `SKILL.md` shows up here automatically, on the next
message. Nothing to register.

## `+` — guidelines and perspectives

`+<name>` anywhere in a message loads that fragment from `kernel/guidelines/` and
applies it to this request only. Options, never obligations — this is the "bring them
up as reminders" mechanism.

Current lenses: `+autonomy` `+throughput` `+abstraction` `+system-design` `+deslop`
`+ordering` `+core` `+small`.
(`+core` → `core-idea`: find the one five-minute idea that unlocks the most, and lead with it.)
(`+small` → `start-small`: 1-2 items checked by eye, then 4-5, then scale.)
(`+abstraction` → `software-abstraction`, `+deslop` → `deslopification`; the short
form is the one to use.)

`+autonomy` and `+throughput` are `triggers: [always]` — in force whether or not you
type them. The others are opt-in.

## `??` — the index

Prints skills and lenses side by side with one-line summaries. Also posted daily to
`#skills`, and pinned in `#dexter`.

## Adding to either

Drop a `SKILL.md` in `intel/skills/<name>/` and it's a `/command`. Drop a markdown
file with frontmatter in `kernel/guidelines/` and it's a `+lens`. Both hot-reload —
no registration step, and both directions work: made in Discord, it's in the folder;
made in the folder, it's in Discord.
