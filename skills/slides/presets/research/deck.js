// Research preset: a results or methods deck at 10 x 5.625 in (the Google Slides default), built with pptxgenjs.
//
//   npm install pptxgenjs jszip       once per folder
//   node deck.js out.pptx             every slide
//   SLIDES=3,5 node deck.js out.pptx  only those slides, e.g. to swap two fixed slides into a live deck
//
// The look is STYLE.md next to this file (its json block holds the tokens; STYLE=/path overrides). Every number on
// a chart should come from a data file the analysis wrote, never typed by hand. The demo compares an invented
// system against a baseline on an invented benchmark, so that every pattern appears once.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

// ---------------------------------------------------------------- style
const STYLE = process.env.STYLE || path.join(__dirname, "STYLE.md");
const S = JSON.parse(fs.readFileSync(STYLE, "utf8").match(/```json\s*\n([\s\S]*?)\n```/)[1]);
const F = S.fonts, Z = S.sizes, C = S.colors, L = S.layout;
const OUT = process.argv[2] || "deck.pptx";
const ONLY = process.env.SLIDES ? new Set(process.env.SLIDES.split(",").map(Number)) : null;
const want = (n) => !ONLY || ONLY.has(n);
const tooSmall = [];
const IMG = (f) => path.join(__dirname, "img", f);
const ICON = (f) => path.join(__dirname, "icons", `${f}.png`);

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
// Theme fonts default to Calibri, which then shows up in list numbers and empty runs after import.
pres.theme = { headFontFace: F.body, bodyFontFace: F.body };
const W = 10, CW = W - 2 * L.margin;
const BLUE = C.accent, GREY = C.muted, LIGHT = "BFBFBF", BOX = C.box, GOOD = C.good, BAD = C.bad, PALE = C.pale;

// ---------------------------------------------------------------- text
// Every block is ONE text box carrying its own fill and border. Margin arrays are [left, right, bottom, top] in points.
const text = (s, t, o = {}) => {
  const size = o.fontSize || Z.body;
  if (size < Z.minimum) tooSmall.push(`${size} pt: ${JSON.stringify(t).slice(0, 40)}`);
  return s.addText(t, { fontFace: F.body, fontSize: Z.body, color: C.text, isTextBox: true, margin: 0, valign: "top", ...o });
};
const bold = (t, o = {}) => ({ text: t, options: { fontFace: F.bold, bold: true, ...o } });
const run = (t, o = {}) => ({ text: t, options: o });

// Action title + italic subtitle in one text box. The subtitle names the section and what is on the slide.
function newSlide(title, subtitle) {
  const s = pres.addSlide();
  if (C.background) s.background = { color: C.background }; // empty in a template's tokens: the master shows
  const runs = [{ text: title, options: { fontSize: Z.title, breakLine: !!subtitle } }];
  if (subtitle) runs.push({ text: subtitle, options: { fontSize: Z.subtitle, italic: true, color: GREY } });
  text(s, runs, { x: L.titleX, y: L.titleY, w: W - 2 * L.titleX, h: 0.95 });
  return s;
}
// The takeaway: one sentence in a solid accent bar at the foot.
const banner = (s, t, y = L.bannerY) =>
  text(s, t, { x: (W - L.bannerW) / 2, y, w: L.bannerW, h: L.bannerH, fill: { color: S.banner.fill },
    fontSize: Z.banner, color: S.banner.text, align: "center", valign: "middle", margin: [8, 8, 0, 0] });
// Setup line above the banner: what was run, on what, how many times.
const source = (s, t, y = 4.36) => text(s, t, { x: L.margin, y, w: CW, h: 0.3, fontSize: Z.caption, color: GREY, valign: "bottom" });

// [["phrase"], ["detail", 1]] -> bullet runs. A phrase can be an array of runs (a bold label, a grey [aside]).
const bullets = (items, size = Z.body, after = 6) => items.flatMap(([t, level = 0], i) => {
  const parts = Array.isArray(t) ? t : [run(t)];
  const last = i === items.length - 1;
  return parts.map((p, j) => ({ text: p.text, options: { fontSize: size, ...p.options,
    ...(j === 0 ? { bullet: { code: S.bullets[Math.min(level, S.bullets.length - 1)], indent: 18 }, indentLevel: level, paraSpaceAfter: after } : {}),
    breakLine: j === parts.length - 1 && !last } }));
});
const bulletBox = (s, items, box, size = Z.body, after = 6) =>
  text(s, bullets(items, size, after), { fill: { color: BOX }, margin: [12, 10, 8, 10], valign: "middle", ...box });
const star = (items, size = Z.body, after = 12) =>
  bullets(items, size, after).map((r) => (r.options.bullet ? { ...r, options: { ...r.options, bullet: { code: S.bullets[2], indent: 22 } } } : r));

// ---------------------------------------------------------------- shapes
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// An image as large as the box allows, aspect kept, with a thin border.
function picture(s, file, x, y, maxW, maxH, { center = false, border = true } = {}) {
  const px = pngSize(file), r = Math.min(maxW / px.w, maxH / px.h);
  const w = px.w * r, h = px.h * r, left = center ? x + (maxW - w) / 2 : x;
  s.addImage({ path: file, x: left, y, w, h });
  if (border) s.addShape(pres.shapes.RECTANGLE, { x: left, y, w, h, fill: { type: "none" }, line: { color: C.imageBorder, width: 1 } });
  return { x: left, y, w, h };
}
const hline = (s, x1, x2, y, color, width = 1, dash) =>
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y, w: Math.abs(x2 - x1), h: 0, line: { color, width, ...(dash ? { dashType: dash } : {}) } });
const vline = (s, x, y1, y2, color, width = 1, dash) =>
  s.addShape(pres.shapes.LINE, { x, y: Math.min(y1, y2), w: 0, h: Math.abs(y2 - y1), line: { color, width, ...(dash ? { dashType: dash } : {}) } });
const circle = (s, cx, cy, r, fill, line = fill, lw = 1.5) =>
  s.addShape(pres.shapes.OVAL, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: { color: fill }, line: { color: line, width: lw } });

// ---------------------------------------------------------------- flowcharts
// A flag says who does a step: Agent (a model), Script (deterministic code) or Input. Every step gets one, so nobody
// has to ask where the model is.
function flag(s, kind, x, y) {
  const [label, fill, line] = S.flags[kind];
  text(s, [bold(label)], { x, y, w: 0.78, h: 0.24, fontSize: 11, color: line, align: "center", valign: "middle",
    shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.3, fill: { color: fill }, line: { color: line, width: 0.75 } });
}
// A node: one filled text box with a thin border, its flag just above the top-left corner.
function node(s, kind, label, x, y, w, h, size = 15, fill = BOX) {
  if (kind) flag(s, kind, x, y - 0.29);
  text(s, label, { x, y, w, h, fontSize: size, align: "center", valign: "middle", fill: { color: fill },
    line: { color: "666666", width: 0.75 }, margin: [4, 4, 2, 2] });
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, r: x + w, b: y + h };
}
// A grey arrow from (x1, y1) to (x2, y2), with an optional small grey label above its middle ("k = 5").
function arrow(s, x1, y1, x2, y2, label) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1, line: { color: C.arrow, width: 1.5, endArrowType: "triangle" } });
  if (label) text(s, label, { x: (x1 + x2) / 2 - 0.6, y: Math.min(y1, y2) - 0.27, w: 1.2, h: 0.22, fontSize: 11, color: GREY, align: "center" });
}
// A row of equal nodes with equal gaps and arrows between them: steps = [[kind, label], ...].
function pipeline(s, steps, { x = L.margin, y = 1.85, w = CW, h = 0.95, gap = 0.27, size = 15, fills = [] } = {}) {
  const nw = (w - gap * (steps.length - 1)) / steps.length;
  const nodes = steps.map(([kind, label], i) => node(s, kind, label, x + i * (nw + gap), y, nw, h, size, fills[i] || BOX));
  nodes.slice(0, -1).forEach((n, i) => arrow(s, n.r + 0.03, n.cy, nodes[i + 1].x - 0.03, n.cy));
  return nodes;
}

// ---------------------------------------------------------------- charts
// Forest plot: one row per system, dot = mean, bar = interval, a vertical reference line for the baseline.
// rows: { name, note, mean, lo, hi, ours }. Numbers to the right of the axis repeat the dot and the interval.
function forest(s, rows, { lo, hi, ref, refLabel, axisLabel, top = 1.78, rowH = 0.6, X0 = 3.45, X1 = 6.6 }) {
  const x = (v) => X0 + (v - lo) / (hi - lo) * (X1 - X0), bottom = top + rows.length * rowH;
  const step = (hi - lo) / 4;
  for (let v = lo; v <= hi + 1e-9; v += step) {
    vline(s, x(v), top - 0.08, bottom - 0.12, LIGHT, 1);
    text(s, String(+v.toFixed(1)), { x: x(v) - 0.3, y: bottom - 0.05, w: 0.6, h: 0.25, fontSize: 14, color: GREY, align: "center" });
  }
  text(s, axisLabel, { x: X0, y: bottom + 0.18, w: X1 - X0, h: 0.25, fontSize: 14, color: GREY, align: "center" });
  vline(s, x(ref), top - 0.18, bottom - 0.12, "595959", 2.25);
  text(s, refLabel, { x: x(ref) - 0.8, y: top - 0.48, w: 1.6, h: 0.28, fontSize: 14, color: "595959", align: "center", bold: true, fontFace: F.bold });
  [["Mean", 6.85, 0.8], ["95% interval", 7.75, 1.75]].forEach(([h, cx, w]) =>
    text(s, h, { x: cx, y: top - 0.48, w, h: 0.28, fontSize: 14, color: GREY, align: "center" }));
  rows.forEach((r, i) => {
    const y = top + i * rowH + rowH / 2 - 0.12, col = r.ours ? BLUE : C.text;
    text(s, [run(r.name, { color: col, breakLine: !!r.note }), ...(r.note ? [run(r.note, { fontSize: 14, color: GREY })] : [])],
      { x: L.margin, y: y - 0.22, w: 2.9, h: 0.55, fontSize: 17 });
    hline(s, x(r.lo), x(r.hi), y, col, 3);
    vline(s, x(r.lo), y - 0.08, y + 0.08, col, 2); vline(s, x(r.hi), y - 0.08, y + 0.08, col, 2);
    circle(s, x(r.mean), y, 0.085, col);
    text(s, String(r.mean), { x: 6.85, y: y - 0.16, w: 0.8, h: 0.32, fontSize: 18, align: "center", valign: "middle" });
    text(s, `${r.lo} to ${r.hi}`, { x: 7.75, y: y - 0.16, w: 1.75, h: 0.32, fontSize: 16, align: "center", valign: "middle" });
  });
}
// A native table with one highlighted column (the measure the argument rests on). Cell margins are in INCHES here.
function table(s, head, rows, { x = L.margin, y = 1.42, colW, hi = -1, size = 16, oursCol = 0 } = {}) {
  const hdr = head.map((h, i) => ({ text: h, options: { bold: true, fontFace: F.bold, fontSize: 14, color: i === hi ? C.text : GREY,
    fill: { color: i === hi ? PALE : "FFFFFF" }, align: i ? "center" : "left" } }));
  const body = rows.map((r) => r.cells.map((c, i) => ({ text: String(c), options: { align: i ? "center" : "left",
    color: i === oursCol && r.ours ? BLUE : C.text, ...(i === hi ? { bold: true, fontFace: F.bold, fill: { color: PALE } } : {}) } })));
  s.addTable([hdr, ...body], { x, y, w: colW.reduce((a, b) => a + b, 0), colW, fontFace: F.body, fontSize: size, color: C.text, rowH: 0.42,
    valign: "middle", border: { type: "solid", pt: 1, color: "7F7F7F" }, margin: [0.04, 0.1, 0.04, 0.1] });
}
// Big-number tiles: [big, what it counts, source].
function tiles(s, items, { y = 1.45, h = 2.95 } = {}) {
  const gap = 0.2, w = (CW - gap * (items.length - 1)) / items.length;
  items.forEach(([big, what, src], i) => text(s, [run(big, { fontSize: 36, color: BLUE, breakLine: true }), run(what, { fontSize: 16, breakLine: true }),
    run(src, { fontSize: 14, color: GREY })], { x: L.margin + i * (w + gap), y, w, h, fill: { color: BOX }, margin: [14, 12, 12, 14], valign: "top", paraSpaceAfter: 8 }));
}
// Icons over parallel columns: one family, one color, one size (see ../README.md, Icons).
function iconRow(s, names, { y = 1.4, size = 0.55 } = {}) {
  const gap = 0.2, w = (CW - gap * (names.length - 1)) / names.length;
  names.forEach((n, i) => { if (fs.existsSync(ICON(n))) s.addImage({ path: ICON(n), x: L.margin + i * (w + gap) + (w - size) / 2, y, w: size, h: size }); });
}

// ================================================================= demo slides (replace these)
if (want(1)) {
  const s = pres.addSlide(); if (C.background) s.background = { color: C.background };
  text(s, "Retrieval Agent vs Baseline", { x: 0.5, y: 1.55, w: 9, h: 0.9, fontSize: 52, align: "center", valign: "middle" });
  text(s, "Eval results and next experiments", { x: 0.5, y: 2.5, w: 9, h: 0.55, fontSize: 28, color: GREY, align: "center" });
  text(s, "Author · Date", { x: 0.5, y: 3.15, w: 9, h: 0.45, fontSize: 20, color: GREY, align: "center" });
  s.addNotes("[0:10] Timed notes: the cumulative time, then what to say. Three parts: where we stand, why the test misleads, what to run next.");
}

if (want(2)) {
  const s = newSlide("Tie on accuracy; win on cost", "Executive summary");
  bulletBox(s, [
    [[run("Benchmark, 200 questions: "), run("agent ≈ baseline", { bold: true, fontFace: F.bold }), run(" (3 runs averaged)", { color: GREY })]],
    [[run("Single-run gaps of ±4 points are noise: same config, 2 runs → 4-point swing")]],
    [[run("Cost per question: 0.4¢ vs 2.1¢ → 5× cheaper at equal accuracy")]],
    [[run("Next: held-out set → harder questions → production pilot")]],
  ], { x: 0.5, y: 1.4, w: 9.0, h: 3.05 }, 18, 9);
  banner(s, "Claim parity on accuracy. Lead with cost.");
  s.addNotes("[0:45] The one-slide version. Every number here has a slide behind it.");
}

if (want(3)) {
  const s = newSlide("On accuracy, the systems are level", "Where we stand · 3 runs each, intervals from resampling questions");
  forest(s, [
    { name: "Retrieval agent", note: "ours, 3 runs", mean: 71.2, lo: 66.0, hi: 76.1, ours: true },
    { name: "Agent, no reranker", note: "ablation", mean: 68.4, lo: 63.1, hi: 73.5, ours: true },
    { name: "Long-context model", note: "1 run", mean: 72.0, lo: 66.9, hi: 77.0 },
  ], { lo: 60, hi: 80, ref: 70.5, refLabel: "Baseline 70.5", axisLabel: "accuracy, % of 200 questions" });
  source(s, "Same 200 questions and scorer for every system · 95% intervals from 2,000 bootstrap resamples");
  banner(s, "Every interval crosses the baseline: no system is ahead.");
}

if (want(4)) {
  const s = newSlide("Checked by hand, the ranking holds", "Where we stand · disputed answers settled against the source");
  table(s, ["System", "Auto-scored", "Hand-checked", "Cost / q"], [
    { cells: ["Retrieval agent", 142, 145, "0.4¢"], ours: true },
    { cells: ["Long-context model", 144, 144, "2.1¢"] },
    { cells: ["Baseline", 141, 141, "0.2¢"] },
  ], { colW: [2.4, 1.3, 1.5, 1.1], hi: 2 });
  text(s, [bold("Hand check", { breakLine: true }), run("31 disputed answers", { breakLine: true }), run("3 auto-scorer misses, all ours", { color: GREY })],
    { x: 7.1, y: 1.42, w: 2.4, h: 1.9, fontSize: 15, fill: { color: BOX }, margin: [12, 10, 10, 12], valign: "middle", paraSpaceAfter: 6 });
  banner(s, "Hand-checked: agent 145, long-context 144, baseline 141.");
}

if (want(5)) {
  const s = newSlide("Outside audits find the same noise", "Why the test misleads · three sources");
  tiles(s, [["12%", "of benchmark labels contradict the source document", "Independent audit, 2025"],
    ["±4", "points between two identical runs of one system", "Our runs, same config"],
    ["5×", "cost difference at equal accuracy", "Our billing logs"]]);
  banner(s, "A higher benchmark score does not mean a better product.");
}

if (want(6)) {
  const s = newSlide("What to claim", "Talking points · say and don't say");
  const box = (title, color, items, x) => text(s, [bold(title, { color, fontSize: 20, breakLine: true }), ...bullets(items, 17, 8)],
    { x, y: 1.42, w: 4.35, h: 3.05, fill: { color: "FFFFFF" }, line: { color, width: 2 }, margin: [14, 12, 10, 12], valign: "top" });
  box("Say", GOOD, [["“Level with the strongest baseline”"], ["“5× cheaper per question”"]], 0.5);
  box("Don't say", BAD, [[[run("“We beat it by 2 points” "), run("[inside run-to-run noise]", { color: GREY })]],
    [[run("“State of the art” "), run("[one benchmark, 200 questions]", { color: GREY })]]], 5.15);
  banner(s, "Standard of comparison: accuracy per dollar, on the user's questions.");
}

if (want(7)) {
  const s = newSlide("Score only on questions the tuning never saw", "Experiment 1 · protocol");
  const n = pipeline(s, [["input", "200 dev questions"], ["agent", "Tune the prompt"], ["script", "Run on 200 held-out × 3"],
    ["script", "Score + hand-check"], ["script", "Compare, same questions"]]);
  const leak = node(s, "script", "Leak check: no held-out text in the prompt", 2.39, 3.3, 3.5, 0.5, 14, "F4CCCC");
  arrow(s, n[1].cx, n[1].b, n[1].cx, leak.y - 0.02);
  text(s, [run("Dev → held-out drop expected", { breakLine: true }), run("compare gaps only, not absolutes", { color: GREY })],
    { x: 6.15, y: 3.2, w: 3.4, h: 0.85, fontSize: 15 });
  banner(s, "Tuned on dev → measured on questions it never saw.");
}

if (want(8)) {
  const s = newSlide("Five arms, one scorer", "Experiment 2 · branching protocol");
  const src = node(s, "input", "Question + documents", 0.5, 2.25, 1.55, 1.0, 14);
  const arms = ["Baseline", "Long-context model", "Agent (ours)", "Agent, no reranker", "Agent + long-context"];
  flag(s, "agent", 2.45, 1.15);
  arms.forEach((a, i) => {
    const y = 1.45 + i * 0.52;
    text(s, a, { x: 2.45, y, w: 2.7, h: 0.44, fontSize: 14, align: "center", valign: "middle",
      fill: { color: a.includes("ours") || a.startsWith("Agent") ? PALE : BOX }, line: { color: "666666", width: 0.75 } });
    arrow(s, src.r + 0.03, src.cy, 2.42, y + 0.22);
  });
  arrow(s, 5.18, 2.75, 5.57, 2.75);
  const judge = node(s, "agent", "Judge against the source", 5.6, 2.2, 1.9, 1.1, 14);
  arrow(s, judge.r + 0.03, judge.cy, 7.87, judge.cy);
  node(s, "script", "Score + intervals", 7.9, 2.2, 1.6, 1.1, 14);
  banner(s, "If accuracy is a tie, cost decides. Measure both.");
}

if (want(9)) {
  const s = newSlide("Three experiments, smallest first", "What to run next · now, 2 weeks, 2 months");
  iconRow(s, ["search", "flask-conical", "rocket"], { y: 1.18, size: 0.42 });
  const cols = [["Now · < $1", "Held-out check", ["200 unseen questions", "3 runs · hand-check"], "Is the tuning real?"],
    ["2 weeks · ~ $20", "Harder set", ["multi-document questions", "same five arms"], "Do we win where it's hard?"],
    ["2 months", "Production pilot", ["one team's real queries", "accuracy + cost per query"], "Is it worth shipping?"]];
  cols.forEach(([when, what, items, decides], i) => {
    const x = 0.5 + i * 3.05, w = 2.85;
    text(s, when, { x, y: 1.68, w, h: 0.4, fill: { color: BLUE }, color: "FFFFFF", fontSize: 16, align: "center", valign: "middle" });
    text(s, [bold(what, { fontSize: 17, breakLine: true }), ...bullets(items.map((t) => [t]), 15, 4)],
      { x, y: 2.15, w, h: 1.65, fill: { color: BOX }, margin: [10, 8, 8, 10], valign: "top" });
    text(s, [run("Decides: ", { color: GREY }), run(decides)], { x, y: 3.9, w, h: 0.6, fontSize: 15, valign: "top" });
  });
  banner(s, "Each step is cheap and decides whether the next is worth running.");
}

if (want(10)) {
  const s = newSlide("Next Steps", null);
  text(s, star([[[run("Rerun the table with 3 runs per system "), run("[owner · day]", { color: GREY })]],
    [[run("Held-out check on 200 questions "), run("[owner · day]", { color: GREY })]],
    [[run("Draft the harder question set "), run("[owner · 2 weeks]", { color: GREY })]]], 18, 12),
  { x: 0.7, y: 1.2, w: 8.8, h: 3.3 });
}

// ---------------------------------------------------------------- save
// pptxgenjs writes an <a:pPr> before every run, and a run without a bullet gets <a:buNone/>. Google Slides applies the
// last one, so a bold label followed by plain text imports without its bullet. Keep only the first <a:pPr> per paragraph.
async function save(file) {
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(await pres.write({ outputType: "nodebuffer" }));
  let dropped = 0;
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async("string");
    zip.file(name, xml.replace(/<a:p>[\s\S]*?<\/a:p>/g, (para) => {
      let first = true;
      return para.replace(/<a:pPr\b[^>]*?(?:\/>|>[\s\S]*?<\/a:pPr>)/g, (pPr) => {
        if (first) { first = false; return pPr; }
        dropped += 1; return "";
      });
    }));
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return { file, dropped };
}
save(OUT).then(({ file, dropped }) => {
  console.log(`wrote ${file}  (style: ${STYLE}; dropped ${dropped} stray paragraph properties)`);
  if (tooSmall.length) console.log(`text under ${Z.minimum} pt:\n  ${tooSmall.join("\n  ")}`);
});
