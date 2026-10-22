// The queue in a terminal, for `list --brief` and ./todos: one line per item, cut to the window's
// width, in the piles the operator reads it by. What waits on them comes first, then what is
// underway, what the AI takes next and what is blocked, and each item shows once. kernel/queue.mjs
// and kernel/pqueue.mjs pass their own rows, so what only pqueue knows (time frames, launches on
// the other machine) comes in through the options.

const TIERS = ["now", "next", "soon", "later"];

// The owner in a title's opening brackets: "[AI, needs the operator's OK to push]" is the AI's.
const owner = (title) => /^\s*\[([^\],]*)/.exec(title)?.[1].trim() ?? "";
const untagged = (title) => title.replace(/^\s*\[[^\]]*\]\s*/, "");
const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// Width and colour from the terminal itself; piped output gets plain text at 100 columns.
export const terminal = () => ({
  width: process.stdout.columns || 100,
  color: Boolean(process.stdout.isTTY) && !("NO_COLOR" in process.env),
});

export const brief = (rows, {
  width = 100,
  color = false,
  tag = (row) => TIERS[row.effective],
  working = (row) => Boolean(row.session),
  where = (row) => row.session?.title ?? row.session?.name ?? row.session?.id ?? "a session",
} = {}) => {
  const paint = (code) => (text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
  const [bold, dim] = [paint(1), paint(2)];
  const human = (row) => Boolean(owner(row.title)) && owner(row.title) !== "AI";
  const ref = (blocker) => (typeof blocker === "number" ? `#${blocker}` : String(blocker));
  const piles = [
    { name: "Waiting on you", count: "waiting on you", rows: rows.filter((r) => !working(r) && r.ready && human(r)), tag, text: (r) => untagged(r.title) },
    { name: "Being worked on", count: "being worked on", rows: rows.filter(working), tag: (r) => oneLine(where(r)).slice(0, 24), text: (r) => r.title },
    { name: "Up next for the AI", count: "ready for the AI", rows: rows.filter((r) => !working(r) && r.ready && !human(r)), tag, text: (r) => untagged(r.title) },
    { name: "Blocked", count: "blocked", rows: rows.filter((r) => !working(r) && !r.ready), tag, text: (r) => `after ${r.blockers.map(ref).join(", ")}: ${r.title}`, faint: true },
  ];
  const numberWidth = Math.max(...rows.map((r) => `#${r.id}`.length));
  const cut = (text, room) => (text.length > room ? `${text.slice(0, room - 1).trimEnd()}…` : text);
  const lines = [`${rows.length} open: ${piles.map((p) => `${p.rows.length} ${p.count}`).join(", ")}`];
  for (const pile of piles.filter((p) => p.rows.length)) {
    const tags = pile.rows.map((r) => oneLine(pile.tag(r)));
    const tagWidth = Math.max(...tags.map((t) => t.length));
    lines.push("", bold(`${pile.name} (${pile.rows.length})`));
    pile.rows.forEach((r, at) => {
      const lead = `  ${`#${r.id}`.padEnd(numberWidth)}  ${tags[at].padEnd(tagWidth)}  `;
      const text = cut(oneLine(pile.text(r)), Math.max(width - lead.length, 20));
      lines.push(pile.faint ? dim(lead + text) : dim(lead) + text);
    });
  }
  return lines.join("\n");
};
