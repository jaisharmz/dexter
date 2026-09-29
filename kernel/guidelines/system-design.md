---
name: system-design
summary: Complexity, not correctness, kills long-lived systems. Modularity, layering, and saying no are the defense.
triggers: [building, designing, architecture]
---

Derived from Chapter 1 of Saltzer & Kaashoek, *Principles of Computer System Design*.

## The thesis

**Complexity, not correctness, is what kills long-lived systems**, and a small set of
named principles is the only reliable defense.

- **Say no.** Adding a requirement increases complexity out of proportion to the
  requirement.
- **Modularity: divide so a bug lives in one place.** Almost every bug of consequence
  lives at an interface, not inside a component.
- **The interface is the whole promise.** What you expose is what you're stuck with.
- **Layering constrains who may talk to whom.** That constraint is the design.
- **Names and indirection postpone binding** — the address-of-an-address move.
- **Iterate.** You will not get it right the first time; design so being wrong is cheap.
- **Keep it simple**, and treat the listed signs of complexity as measurable, not
  aesthetic.

## In this project

**Structure enforces, discipline fails.** Make the invariant a property of the layout.
Personal data stays out of the public repo because it lives in a different repository,
not because anyone remembers. That rule has already caught a real leak.

**Fail loud on planning bugs.** A dependency cycle throws and names the cycle. Silent
degradation is worse than a crash.

**Stale documentation is a liability.** When the build diverges from the design,
reconcile it or queue the reconciliation. Don't leave a document that quietly lies.
