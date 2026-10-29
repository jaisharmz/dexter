# The memory gate

Will this fit? One reading of the machine decides two things: whether a heavy job or a new tab
may start, and whether a finished tab may stay open for the operator. Before it, the rule was
"close every tab when done" and "check memory", which closed booking forms the operator still
had to finish and let a model run start on a machine with 860 MB of disk free.

```
node kernel/memgate/gate.mjs check                       may I open a tab? and the band
node kernel/memgate/gate.mjs check --for model            a named need: tab, session, render, container, model, download
node kernel/memgate/gate.mjs check --need 4G --disk 3G    a measured need
node kernel/memgate/gate.mjs check --json                 the reading itself
node --test kernel/memgate/gate.test.mjs
```

Exit 1 when it does not fit. The output names the band, what is short, the biggest apps, and
what to do with tabs.

## Two numbers, because macOS fails two ways

Memory that runs short goes to swap, and the work crawls. Swap grows into free disk, and when
the disk is full as well, macOS starts killing apps. So a job fits when:

- the memory it needs leaves an eighth of RAM available (2 GB on the 16 GB Mac), and
- the disk it needs (downloads, plus what it will push to swap) leaves 3 GB free.

"Available" is macOS's own figure (`kern.memorystatus_level`, what `memory_pressure` prints as
the free percentage) times RAM. On Linux it is `MemAvailable`.

| Date | Reading | What happened |
| --- | --- | --- |
| Oct 9 | 1.7 GB disk free, swap nearly full | Chrome restarted three times overnight and took every agent's tab group with it |
| Oct 11 | 32% free, Chrome at 4.8 GB | fine for one or two more tabs |
| Oct 28 | 4.7 GB disk free, then 860 MB after a 2.5 GB model download | the model's run pushed swap to 16.6 GB, a page took 17 minutes, and almost every app crashed |

The needs, in GB of memory and disk: tab 0.5 / 0.5, session 1 / 0.5, render 1.5 / 1, container
2 / 2, model 3 / 1, download 0.5 / 3. When a job is measured (weights times 1.2 plus 1 GB for the
runtime is a fair first guess), pass the measured numbers instead.

## Bands

| Band | Means | Tabs that wait on the operator | Done tabs |
| --- | --- | --- | --- |
| roomy | a 4 GB job still fits | keep open, and name each one in the report | keep while this run may come back to them; close when it ends |
| tight | a tab fits, a heavy job does not | keep open | close each one now, and close one before opening one |
| full | not even a tab fits | save the state (address, the answers in the run README, a small screenshot), then close, oldest first | close now |

A tab waits on the operator when it holds something only he can finish: a booking form, an
application stopped at Submit, a sign-in, an emailed code, a slot to pick, a page he should look
at. Never close the operator's own tabs or another session's.

## The hook

The audit hook (`kernel/audit/policy.mjs`, rule `memory`) runs the same check before every heavy
command and every new tab, and reads the machine only then, so ordinary calls pay nothing.

- **Heavy commands:** a Python script, `-c` snippet or stdin script that imports a model runtime
  (torch, mlx, transformers, vllm, llama_cpp and others), `python -m` one of them, `ollama
  run|serve|pull`, `llama-server`, `vllm serve`, `mlx_lm.*`, `hf download`, a pip, uv or conda
  install of a model runtime, `docker run|build|compose up`, `Xvfb`, `manim`. A script is read
  from disk to see what it imports, after the command's own `cd` and `N=...` assignments, so
  `cd $N && .venv/bin/python run.py` counts. Work sent over ssh and commands that only name a
  package (`grep torch`, `pip show torch`) do not count.
- **New tabs:** Claude in Chrome's `tabs_create_mcp`, a session's first `tabs_context_mcp` with
  `createIfEmpty`, the browser pane's `tabs_create` and `preview_start`, and a batch that holds one.

| Call | Fits | Does not fit |
| --- | --- | --- |
| heavy command | flagged, so the audit shows heavy jobs | ask, operator only: denied in auto mode and in unattended sessions |
| new tab | allowed | denied: close your own done tabs, or wait and check again |

A command can state a measured need: `MEMGATE_NEED=0.8G MEMGATE_DISK=200M python3 small.py`. The
ledger records it, so an understated need is visible in the audit.

When a job does not fit: free memory first (your own done tabs, your own background jobs), run
it on the PC with `/handoff`, or leave it for the operator. Quitting the operator's apps and
deleting files to make room are his to do (`home/machine/disk-cleanup.sh`).

`kernel/proc.mjs limits` checks the same gate for a new child session, with the session need.
