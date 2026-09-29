# The public mirror

intel is private. `intel-public` on GitHub is a scrubbed copy of its framework, meant to
be shared. It is never edited by hand: `sync.sh` rebuilds it from intel's committed
files, a leak gate checks the result, and the build lands in a sibling clone,
`~/Documents/intel-public`. An agent keeps it current, and a person approves each push.

## When to update it

The post-commit hook prints one line when a commit touches something the mirror
carries. Then decide whether the change is significant, meaning a reader of the public
repo would notice it or want it:

- **Significant:** a skill or lens added, removed or working differently; a new kernel
  mechanism or script; a change to the design docs; anything the public README claims.
  Drift counts too: ten or more unmirrored commits, or two weeks since the last mirror.
- **Not significant:** one new `LEARNED.md` lesson, a typo, a rewording. These ride
  along with the next significant change.

If it is significant:

```
sh kernel/public/sync.sh status              what changed since the last mirror
sh kernel/public/sync.sh build               export, strip, redact, gate, stage in the clone
git -C ~/Documents/intel-public diff --cached     read every line that would go public
sh kernel/public/sync.sh commit "<finding>"  a local commit, trailer Mirrored-from: intel@<sha>
```

Then ask Jai, in one line: what changed, the diffstat, and that the gate is clean. On
his yes for that push, run `sh kernel/public/sync.sh push`.

## Why the push waits for a person

A public push is a post. It can be forked, cached and scraped within minutes, and
deleting it afterwards does not take it back. So the agent does everything up to the
push and stops there. A day late beats leaked.

## What goes in

`manifest` is an allowlist of git pathspecs over committed files, and the default is
out. A new skill stays private until someone adds it on purpose, and it goes in only
when it runs every week or so, is not school, and its method works without Jai's data.
Carry its `SKILL.md`, `references/`, `scripts/`, `agents/` and `assets/`. Carry its
`LEARNED.md` once each lesson has been read for personal detail. Never carry `state/`
or `config/`, apart from `*.example.*` files.

`LEARNED.md` lessons are where a personal detail most often slips in, because they
record what Jai did and said. Read every new one in the diff.

## Keeping a private detail out of a mirrored file

There are three ways, from coarsest to finest:

1. **A paragraph or bullet.** Put a line reading exactly `<!-- public:omit -->` before
   it and `<!-- /public:omit -->` after it, each alone on its line. The build drops both
   markers and everything between them. In scripts, use `# public:omit` and
   `# /public:omit`. A marker with anything else on its line hides nothing, so the gate
   fails on one.

   In markdown, the public wording can follow the omitted block as an HTML comment that
   only the mirror shows: a line reading exactly `<!-- public:insert`, the replacement
   text, then a line reading exactly `-->`. Use this when a passage has to say something
   different in public, not just less, and it wraps across lines.
2. **A string that must change on the way out,** such as an IP that becomes a
   placeholder: add a line to `home/public/redact.sed`.
3. **A string that must never appear:** add a line to `home/public/denylist`. Matching
   is case-insensitive, and a `w:` prefix makes a line match whole words only.

Both files live in `home/` because they are made of the private strings themselves.
Without them `sync.sh` refuses to build, so a machine missing `home/` cannot publish.

The gate also fails on the shape of private data, whatever the string: email
addresses, IPs, Discord IDs, home directories, phone numbers, keys and tokens, data
files, and a submodule pinned to a commit its public remote does not have. When it
fails, fix the source or add a redaction. Never loosen the gate to get a build through.

## Files only the mirror has

`overlay/` holds the public `README.md` and the `LICENSE`, laid over the export. Edit
them there. The clone is rebuilt from scratch every time, so an edit made in the clone
is lost. When intel's own README changes, `status` says so; carry across whatever a
public reader should see.

## Setup on a new machine

- The clone appears on the first `build`. It is cloned from the remote, or created if
  the remote does not exist yet.
- Commits in the clone use the GitHub noreply address, because public commits publish
  their author's email. `commit` sets it through `gh` when the clone lacks one.
- The hook needs `git config core.hooksPath kernel/hooks` once per clone of intel.
  `kernel/ha/sync.sh` carries `.git/config` to the standby, so the PC gets it too.
