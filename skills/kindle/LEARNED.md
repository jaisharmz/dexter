# Learned — kindle

Corrections this skill has earned in use. Read before running it; these override
`SKILL.md`. Protocol: `kernel/skill-learning.md`.
- **2026-10-19** — Only one agent may drive Kindle at a time: two sessions running kindle.sh together collide (one's search panel blocks the other's page turns, and Escape cancels the other's search). When fanning out readers, give Kindle to exactly one and tell the rest to cite that agent's notes.
- **2026-11-04** — Kindle's accessibility tree goes empty when the Mac's screen locks (System Events reports 0 windows, CGSSessionScreenIsLocked=Yes), so search and read fail with 'Can't get window 1'. Check ioreg for the lock before retrying; a search that already ran still gives a citable print page and snippet.
