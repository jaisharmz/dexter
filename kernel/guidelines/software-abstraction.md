---
name: software-abstraction
summary: Does this abstraction shrink what a reader holds in their head? If not, don't add it.
triggers: [building, designing, code]
---

## The one test

> **Does this reduce what a reader must hold in their head to understand the call site?**

If it only reduces keystrokes, or satisfies a symmetry you find pleasing, don't add it.
An abstraction that doesn't shrink the reader's working set has added a layer and
subtracted nothing.

- **One caller is not an abstraction, it's a detour.** Extract on the second *real*
  caller, never the speculative one.
- **Never hide what the caller needs to know.** If a call hits the network, costs
  money, or can block, the abstraction must not conceal it.
- **Prefer deleting to abstracting.** The cheapest abstraction is the requirement you
  talked someone out of.

## Beyond code

The same test governs the system itself. Build the thing that builds the thing — judge
a decision by whether it makes the *next* one cheaper.

**Look for an existing skill before writing one.** OpenClaw ships a `clawhub` skill
that searches a registry and installs from it. Search before building; a maintained
skill beats a private script, and someone has probably hit this already.

**Delete the layer when it stops earning its place.** A worked example: the design
called for a bridge syncing skills into Discord. Making the workspace `intel/` itself
turned skills into priority-1 discovery, and the bridge was deleted instead of written.
