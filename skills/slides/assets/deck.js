// Starter deck for the slides skill. Copy it next to the images for one deck, replace the demo
// slides at the bottom, and run it:
//
//   npm install pptxgenjs            (once per folder, if require fails)
//   node deck.js out.pptx            every slide
//   SLIDES=1,3 node deck.js out.pptx only those slides, e.g. to move them into another deck
//   STYLE=/path/to/style.md node deck.js out.pptx   use another style profile
//
// The style comes from the operator's profile (config/style.md in the skill): the first ```json
// block in it holds fonts, sizes, colors and geometry. Every block on a slide is ONE text box that
// carries its own fill and border, and the title and subtitle share one text box, so the slides
// edit and paste like hand-made ones.
const fs = require("fs");
const os = require("os");
const path = require("path");
const pptxgen = require("pptxgenjs");

// ---------------------------------------------------------------- style
const DEFAULT_STYLE = {
  fonts: { body: "Arial", bold: "Arial", code: "Courier New" },
  sizes: { title: 28, subtitle: 20, body: 18, banner: 16, caption: 14, code: 12, minimum: 10 },
  colors: { text: "000000", muted: "595959", accent: "1155CC", code: "38761D", codeHighlight: "1155CC",
    box: "EFEFEF", imageBorder: "B7B7B7", arrow: "595959", background: "FFFFFF" },
  banner: { fill: "1155CC", text: "FFFFFF" },
  layout: { titleX: 0.43, titleY: 0.3, margin: 0.5, bannerY: 4.74, bannerW: 8.7, bannerH: 0.56 },
  bullets: ["25CF", "25CB", "2605"],
  flags: { agent: ["Agent", "FCE5CD", "B45F06"], script: ["Script", "D9EAD3", "38761D"], input: ["Input", "EFEFEF", "595959"] },
};

function findProfile() {
  const candidates = [
    process.env.STYLE,
    path.join(__dirname, "..", "config", "style.md"),
    path.join(os.homedir(), ".claude", "skills", "slides", "config", "style.md"),
    path.join(__dirname, "..", "config", "style.example.md"),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

function loadStyle() {
  const profile = findProfile();
  if (!profile) return { style: DEFAULT_STYLE, source: "built-in defaults" };
  const block = fs.readFileSync(profile, "utf8").match(/```json\s*\n([\s\S]*?)\n```/);
  if (!block) return { style: DEFAULT_STYLE, source: `${profile} (no json block, using defaults)` };
  const tokens = JSON.parse(block[1]);
  const merged = { ...DEFAULT_STYLE };
  for (const [key, value] of Object.entries(tokens)) {
    merged[key] = value && typeof value === "object" && !Array.isArray(value) ? { ...DEFAULT_STYLE[key], ...value } : value;
  }
  return { style: merged, source: profile };
}

const { style: S, source } = loadStyle();
const F = S.fonts, Z = S.sizes, C = S.colors, L = S.layout;
const OUT = process.argv[2] || "deck.pptx";
const ONLY = process.env.SLIDES ? new Set(process.env.SLIDES.split(",").map(Number)) : null;
const want = (n) => !ONLY || ONLY.has(n);
const tooSmall = [];

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in, the Google Slides default
const W = 10, CW = W - 2 * L.margin;

// ---------------------------------------------------------------- helpers
// Every text box: margin 0 unless given. pptxgenjs margin arrays are [left, right, bottom, top] in
// points, not CSS order.
const text = (s, t, o = {}) => {
  const size = o.fontSize || Z.body;
  if (size < Z.minimum) tooSmall.push(`${size} pt: ${JSON.stringify(t).slice(0, 40)}`);
  return s.addText(t, { fontFace: F.body, fontSize: Z.body, color: C.text, isTextBox: true, margin: 0, valign: "top", ...o });
};
// A bold run in the operator's bold face (often a different family from the body).
const bold = (t, o = {}) => ({ text: t, options: { fontFace: F.bold, bold: true, ...o } });

// Title and subtitle as two runs of one text box.
function newSlide(title, subtitle) {
  const s = pres.addSlide();
  s.background = { color: C.background };
  if (title) {
    const runs = [{ text: title, options: { fontSize: Z.title, breakLine: !!subtitle } }];
    if (subtitle) runs.push({ text: subtitle, options: { fontSize: Z.subtitle, italic: true } });
    text(s, runs, { x: L.titleX, y: L.titleY, w: W - 2 * L.titleX, h: subtitle ? 0.95 : 0.55 });
  }
  return s;
}

// The takeaway: one sentence in one filled text box.
const banner = (s, t, y = L.bannerY) =>
  text(s, t, { x: (W - L.bannerW) / 2, y, w: L.bannerW, h: L.bannerH, fill: { color: S.banner.fill },
    fontSize: Z.banner, color: S.banner.text, align: "center", valign: "middle", margin: [8, 8, 0, 0] });

// [["phrase"], ["detail", 1]] -> bullet runs; level picks the glyph from the profile.
const bullets = (items, size = Z.body) => items.map(([t, level = 0], i) => ({
  text: t, options: { fontSize: size, bullet: { code: S.bullets[Math.min(level, S.bullets.length - 1)], indent: 18 },
    indentLevel: level, breakLine: i < items.length - 1, paraSpaceAfter: 4 },
}));

// A box of bullets is the text box itself with a fill, never a rectangle under a text box.
const bulletBox = (s, items, box) =>
  text(s, bullets(items), { fill: { color: C.box }, margin: [12, 10, 8, 10], valign: "middle", ...box });

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 1, 4) !== "PNG") throw new Error(`${file}: picture() reads PNG sizes only`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// Fit an image inside a box, keep its aspect ratio, optionally centre it and draw a thin border.
function picture(s, file, x, y, maxW, maxH, { center = false, border = true } = {}) {
  const px = pngSize(file), r = Math.min(maxW / px.w, maxH / px.h);
  const w = px.w * r, h = px.h * r, left = center ? x + (maxW - w) / 2 : x;
  s.addImage({ path: file, x: left, y, w, h });
  if (border) s.addShape(pres.shapes.RECTANGLE, { x: left, y, w, h, fill: { type: "none" }, line: { color: C.imageBorder, width: 0.75 } });
  return { x: left, y, w, h, scale: r };
}

const arrow = (s, x, y, w = 0.3, h = 0.16) =>
  s.addShape(pres.shapes.RIGHT_ARROW, { x, y, w, h, fill: { color: C.arrow }, line: { color: C.arrow, width: 0 } });

// Code as runs: a line is a string (code color) or [[text, color], ...]. Each run carries its own
// face and bold, so a plain-prose run in the same box stays regular.
const codeRuns = (lines) => lines.flatMap((line, i) => {
  const pieces = typeof line === "string" ? [[line, C.code]] : line;
  return pieces.map(([t, color], j) => ({ text: t, options: { color, fontFace: F.code, bold: true,
    breakLine: j === pieces.length - 1 && i < lines.length - 1 } }));
});
const code = (s, lines, box) => text(s, codeRuns(lines), { fontSize: Z.code, ...box });
const caption = (s, t, x, y, w, align = "left") => text(s, t, { x, y, w, h: 0.28, fontSize: Z.caption, color: C.muted, align });

// Who does a step: a small rounded tag above a flowchart node.
function flag(s, kind, x, y) {
  const [label, fill, line] = S.flags[kind];
  text(s, [bold(label)], { x, y, w: 0.78, h: 0.23, fontSize: 11, color: line, align: "center", valign: "middle",
    shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.3, fill: { color: fill }, line: { color: line, width: 0.75 } });
}

// ---------------------------------------------------------------- demo slides (replace these)
if (want(1)) {
  const s = newSlide("Executive Summary", "What This Deck Shows");
  bulletBox(s, [["Short phrase → what changed"], ["One idea per line", 1], ["Label: value, no final period"],
    ["Numbers say what they count"]], { x: L.margin, y: 1.42, w: 6.0, h: 3.1 });
  text(s, [bold("Image here"), { text: "  (use picture())", options: { color: C.muted } }],
    { x: 6.9, y: 2.8, w: 2.6, h: 0.4, fontSize: Z.caption });
  banner(s, "One sentence the room should remember.");
  s.addNotes("Setup, caveats and exact numbers live in the notes, not on the slide.");
}

if (want(2)) {
  const s = newSlide("Methods", "Pipeline With Flags");
  const steps = [["input", "Source file"], ["agent", "Write a template"], ["script", "Fill it from a seed"], ["script", "Check the output"]];
  const PW = 2.0, GAP = (CW - steps.length * PW) / (steps.length - 1), y = 1.8;
  steps.forEach(([kind, label], i) => {
    const x = L.margin + i * (PW + GAP);
    flag(s, kind, x, y - 0.3);
    text(s, label, { x, y, w: PW, h: 1.0, fontSize: 16, align: "center", valign: "middle", fill: { color: C.box },
      line: { color: C.imageBorder, width: 0.75 } });
    if (i < steps.length - 1) arrow(s, x + PW + 0.05, y + 0.42, GAP - 0.1);
  });
  banner(s, "Agent steps run once; script steps run for every item.");
}

if (want(3)) {
  const s = newSlide("Methods", "Config Example");
  caption(s, "Config", L.margin, 1.38, 4.5);
  code(s, [[["count = ", C.code], ["200", C.codeHighlight]], [["seed  = ", C.code], ["7", C.codeHighlight]]],
    { x: L.margin, y: 1.66, w: 4.5, h: 1.0, fill: { color: C.box }, margin: [8, 6, 6, 8], valign: "middle" });
  text(s, "Same seed → same output", { x: 5.4, y: 1.9, w: 4.1, h: 0.5 });
  banner(s, "The config is the only thing a person edits.");
}

if (want(4)) {
  const s = newSlide("Next Steps", null);
  text(s, bullets([["First thing to try", 0], ["Why it matters, in one phrase", 1], ["Second thing", 0]])
    .map((run) => (run.options.indentLevel === 0 ? { ...run, options: { ...run.options, bullet: { code: S.bullets[2] || "2605", indent: 20 } } } : run)),
  { x: 0.8, y: 1.35, w: 8.6, h: 3.2 });
}

pres.writeFile({ fileName: OUT }).then((file) => {
  console.log(`wrote ${file}  (style: ${source})`);
  if (tooSmall.length) console.log(`text under ${Z.minimum} pt:\n  ${tooSmall.join("\n  ")}`);
});
