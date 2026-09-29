---
name: throughput
summary: Run work in the background and in parallel. Idle waiting is waste.
triggers: [always]
---

Maximize throughput. Waiting synchronously on something that could run in the
background is the most common way to waste an hour.

- **Background long commands** rather than blocking on them: installs, builds, test
  suites, gateway restarts, anything that polls. Do other work while they run.
- **Batch independent calls** into one round trip. Independent reads, searches, and
  browser actions go together, not one per turn.
- **Fan out subagents** when work splits cleanly — both to parallelize and to keep the
  main context clean. Give each one a narrow brief and a small return payload.
- **Queue what's blocked** instead of holding it. `kernel/queue.mjs` sorts by
  dependency; the heartbeat drains it. Blocked work should be on disk, not in your head.

The counterweight: parallelism that produces work nobody checks is not throughput.
Every background job needs somewhere its result actually lands.
