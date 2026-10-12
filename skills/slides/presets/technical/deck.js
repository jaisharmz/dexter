// Technical preset: a teaching or review deck for math and CS at 10 x 5.625 in, built with pptxgenjs.
//
//   npm install pptxgenjs jszip      once per folder
//   python3 render.py                typeset tex/snippets.tex into img/ (problems, solutions, displayed math)
//   node deck.js out.pptx            every slide
//   SLIDES=5,6 node deck.js x.pptx   only those slides
//
// The look is STYLE.md next to this file (its json block holds the tokens; STYLE=/path overrides). Slide text is
// Outfit; anything with real math structure (fractions, aligned steps, sums) is LaTeX rendered to an image at a known
// type size. The caption at the top right of a slide names the source a claim comes from. The demo teaches modular
// inverses so that every pattern appears once.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

// ---------------------------------------------------------------- style
const STYLE = process.env.STYLE || path.join(__dirname, "STYLE.md");
const S = JSON.parse(fs.readFileSync(STYLE, "utf8").match(/```json\s*\n([\s\S]*?)\n```/)[1]);
const F = S.fonts, Z = S.sizes, C = S.colors, L = S.layout;
// Outfit has no logic or set symbols, so those characters go in runs set in STIX Two Math. Google's pptx importer
// rewrites "Noto Sans Math" to "Noto Sans", which lacks them; STIX Two Math survives the import.
const MATH = F.math;
const OUTFIT = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, "outfit_cmap.json"), "utf8")));
const MANIFEST = path.join(__dirname, "img", "manifest.json");
const IMGS = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
const OUT = process.argv[2] || "deck.pptx";
const ONLY = process.env.SLIDES ? new Set(process.env.SLIDES.split(",").map(Number)) : null;
const warnings = [];

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.theme = { headFontFace: F.body, bodyFontFace: F.body };
const W = 10, CW = W - 2 * L.margin;
const TOP = 1.42, BOTTOM = 5.35, BANNER_TOP = L.bannerY - 0.12;

// ---------------------------------------------------------------- rich text
// Markup inside a string: **bold label**, ^{superscript}, _{subscript}, [[accent blue]], ~~strike~~.
// Characters Outfit lacks (⇒ ∧ ∨ ∀ ∃ ≡ ≤ ∈ ...) are split into runs set in the math font.
function segments(s) {
  const out = [];
  let st = {}, cur = "", i = 0;
  const push = () => { if (cur) out.push({ text: cur, ...st }); cur = ""; };
  while (i < s.length) {
    if (s.startsWith("**", i)) { push(); st = { ...st, bold: !st.bold }; i += 2; continue; }
    if (s.startsWith("[[", i)) { push(); st = { ...st, accent: true }; i += 2; continue; }
    if (s.startsWith("]]", i)) { push(); st = { ...st, accent: false }; i += 2; continue; }
    if (s.startsWith("~~", i)) { push(); st = { ...st, strike: !st.strike }; i += 2; continue; }
    if ((s[i] === "^" || s[i] === "_") && s[i + 1] === "{") {
      push();
      const close = s.indexOf("}", i + 2);
      out.push({ text: s.slice(i + 2, close), ...st, [s[i] === "^" ? "sup" : "sub"]: true });
      i = close + 1;
      continue;
    }
    cur += s[i] === "'" ? "’" : s[i]; // curly apostrophes on slides
    i += 1;
  }
  push();
  return out;
}

function runs(s, base = {}) {
  const out = [];
  for (const seg of segments(s)) {
    let buf = "", math = null;
    const flush = () => {
      if (!buf) return;
      const o = { ...base };
      if (seg.bold) { o.fontFace = F.bold; o.bold = true; }
      if (math) o.fontFace = MATH;
      if (seg.sup) o.superscript = true;
      if (seg.sub) o.subscript = true;
      if (seg.accent) o.color = C.accent;
      if (seg.strike) { o.strike = "sngStrike"; o.color = C.bad; }
      out.push({ text: buf, options: o });
      buf = "";
    };
    for (const ch of seg.text) {
      const isMath = ch === " " ? (math ?? false) : !OUTFIT.has(ch.codePointAt(0));
      if (math !== null && isMath !== math) flush();
      math = isMath;
      buf += ch;
    }
    flush();
  }
  return out;
}

// One paragraph. Paragraph options (bullet, indent, spacing, align) go on its first run only; save() drops the
// paragraph properties pptxgenjs repeats before later runs.
const para = (s, pOpts = {}, rOpts = {}) => {
  const r = runs(s, rOpts);
  if (!r.length) r.push({ text: " ", options: { ...rOpts } });
  r[0].options = { ...r[0].options, ...pOpts };
  return r;
};
const join = (paras) => paras.flatMap((p, i) => {
  if (i < paras.length - 1) p[p.length - 1].options = { ...p[p.length - 1].options, breakLine: true };
  return p;
});

// Items: "text" | ["text", level] | { head: "Bold heading" } | { plain: "text", opts }
function bulletParas(items, size = Z.body, space = 6) {
  return items.map((item) => {
    if (item.head) return para(`**${item.head}**`, { paraSpaceAfter: space }, { fontSize: size });
    if (item.plain) return para(item.plain, { paraSpaceAfter: space }, { fontSize: size, ...(item.opts || {}) });
    const [t, level = 0] = Array.isArray(item) ? item : [item, 0];
    return para(t, { bullet: { code: S.bullets[Math.min(level, 1)], indent: 18 }, indentLevel: level, paraSpaceAfter: space },
      { fontSize: level ? size - 2 : size });
  });
}

// ---------------------------------------------------------------- drawing helpers
const text = (s, body, o = {}) => {
  const size = o.fontSize || Z.body;
  if (size < Z.minimum) warnings.push(`${size} pt text`);
  return s.addText(body, { fontFace: F.body, fontSize: Z.body, color: C.text, isTextBox: true, margin: 0, valign: "top", ...o });
};

// The title and the subtitle are two runs of one text box; the source caption sits at the top right.
function newSlide(title, subtitle, src) {
  const s = pres.addSlide();
  if (C.background) s.background = { color: C.background }; // empty in a template's tokens: the master shows
  if (title) {
    const t = [{ text: title, options: { fontSize: Z.title, breakLine: !!subtitle } }];
    if (subtitle) t.push(...runs(subtitle, { fontSize: Z.subtitle, italic: true }));
    text(s, t, { x: L.titleX, y: L.titleY, w: W - 2 * L.titleX, h: subtitle ? 0.95 : 0.55 });
  }
  if (src) text(s, runs(src, { fontSize: Z.caption, color: C.muted }), { x: 5.4, y: 0.38, w: 4.17, h: 0.3, align: "right" });
  return s;
}

const banner = (s, t, y = L.bannerY) =>
  text(s, runs(t, { fontSize: Z.banner, color: S.banner.text }), { x: (W - L.bannerW) / 2, y, w: L.bannerW, h: L.bannerH,
    fill: { color: S.banner.fill }, align: "center", valign: "middle", margin: [8, 8, 0, 0] });

// A box of bullets is one text box carrying its own fill.
const box = (s, items, o) => {
  const { size = Z.body, space = 6, ...pos } = o;
  return text(s, join(bulletParas(items, size, space)), { fill: { color: C.box }, margin: [12, 10, 8, 10], ...pos });
};

// A callout: white box, coloured border, bold coloured label. "Watch out:" for the classic mistake.
const callout = (s, label, t, o) => {
  const { color = C.bad, size = 16, ...pos } = o;
  return text(s, [...runs(`**${label}** `, { fontSize: size, color }), ...runs(t, { fontSize: size })],
    { fill: { color: "FFFFFF" }, line: { color, width: 1.25 }, margin: [10, 10, 6, 6], valign: "middle", ...pos });
};

// A typeset image from img/manifest.json at its natural slide size, shrunk only if it would not fit.
function img(s, id, x, y, { maxW = W - x - 0.4, maxH = BOTTOM - y, center = false } = {}) {
  const m = IMGS[id];
  if (!m) throw new Error(`no rendered image ${id}; run render.py`);
  const r = Math.min(1, maxW / m.w, maxH / m.h);
  if (r < 0.9) warnings.push(`${id} shrunk to ${(r * 100).toFixed(0)}% (${(m.pt * r).toFixed(1)} pt)`);
  const w = m.w * r, h = m.h * r;
  s.addImage({ path: path.join(__dirname, m.file), x: center ? (W - w) / 2 : x, y, w, h });
  return { x, y, w, h, bottom: y + h };
}

// Native table; a cell is "text" (rich) or { t: "text", bold, fill, align, color }. Cell margins are in INCHES.
function table(s, rows, o) {
  const { size = 16, colW, header = true, ...pos } = o;
  const body = rows.map((row, ri) => row.map((cell) => {
    const c = typeof cell === "string" ? { t: cell } : cell;
    const head = header && ri === 0;
    const base = { fontSize: size, color: c.color || C.text };
    const t = head || c.bold ? runs(`**${c.t}**`, base) : runs(c.t, base);
    return { text: t, options: { fill: { color: c.fill || (head ? C.box : "FFFFFF") }, align: c.align || "center", valign: "middle",
      margin: [0.04, 0.06, 0.02, 0.02] } };
  }));
  s.addTable(body, { colW, border: { type: "solid", pt: 0.75, color: C.imageBorder }, fontFace: F.body, ...pos });
}

// ---------------------------------------------------------------- slide patterns
let count = 0;
const want = () => { count += 1; return !ONLY || ONLY.has(count); };
const skip = () => ({ addText() {}, addImage() {}, addTable() {}, addNotes() {}, addShape() {} });
const slide = (...args) => (want() ? newSlide(...args) : skip());

// Section divider: the topic, who presents it, and the one idea of the section in the banner.
function divider(topic, who, idea, extra) {
  if (!want()) return;
  const s = newSlide(null);
  text(s, topic, { x: 0.5, y: 1.55, w: 9, h: 0.9, fontSize: 40, align: "center", valign: "middle" });
  text(s, runs(who, { fontSize: 22, color: C.muted }), { x: 0.5, y: 2.45, w: 9, h: 0.45, align: "center" });
  if (extra) text(s, runs(extra, { fontSize: 18, color: C.accent }), { x: 0.5, y: 2.95, w: 9, h: 0.4, align: "center" });
  banner(s, idea);
  return s;
}

// Practice: the question alone, with room to work.
function practice(topic, name, q, src, notes) {
  const s = slide(topic, `Practice: ${name}`, src);
  img(s, q, 0.5, TOP + 0.05);
  if (notes) s.addNotes(notes);
  return s;
}

// Solution: the question in a grey box when it fits, then the solution. opts.banner adds a takeaway.
function solution(topic, name, q, sol, src, { banner: take, notes, question = "auto" } = {}) {
  const s = slide(topic, `Solution: ${name}`, src);
  const bottom = take ? BANNER_TOP : BOTTOM;
  const qg = IMGS[`${q}_g`], sm = IMGS[sol];
  let y = TOP;
  const fits = qg && qg.h + 0.14 + sm.h <= bottom - TOP;
  if (question === "always" || (question === "auto" && fits)) {
    const g = img(s, `${q}_g`, 0.4, y, { maxW: 9.2 });
    y = g.bottom + 0.14;
  }
  img(s, sol, 0.5, y, { maxH: bottom - y });
  if (take) banner(s, take);
  if (notes) s.addNotes(notes);
  return s;
}

// ================================================================= demo slides (replace these)
if (want()) {
  const s = newSlide(null);
  text(s, "Modular Arithmetic Review", { x: 0.5, y: 1.6, w: 9, h: 1.0, fontSize: 48, align: "center", valign: "middle" });
  text(s, runs("Presenter names", { fontSize: 24, color: C.muted }), { x: 0.5, y: 2.75, w: 9, h: 0.5, align: "center" });
  text(s, runs("Term", { fontSize: 18, color: C.muted }), { x: 0.5, y: 3.4, w: 9, h: 0.4, align: "center" });
  s.addNotes("Every definition follows the course's own notes, and the caption at the top right of each slide names the source.");
}

divider("Inverses", "Presenter  ·  Lecture 5", "x has an inverse mod m exactly when gcd(m, x) = 1.");

{
  const s = slide("Inverses", "Definition + Examples", "Lecture 5");
  box(s, [
    "**x^{−1} mod m:** the y with xy ≡ 1 (mod m). Dividing by x means multiplying by y",
    "**It exists iff gcd(m, x) = 1,** and then it is unique mod m",
    "8^{−1} ≡ 2 (mod 15), since 8 · 2 = 16 ≡ 1",
    ["12 has no inverse mod 15: 12a mod 15 runs 12, 9, 6, 3, 0, 12, …", 1],
    "Find inverses with extended Euclid",
  ], { x: 0.5, y: TOP, w: 9, h: 2.75, size: 17, space: 7 });
  callout(s, "Watch out:", "2^{3} = 8 ≡ 2 (mod 3), but 2^{3 mod 3} = 2^{0} = 1. Reduce the base, never the exponent.",
    { x: 0.5, y: 4.4, w: 9, h: 0.6 });
}

{
  const s = slide("Inverses", "Euclid's Algorithm", "Lecture 6");
  box(s, ["**gcd(x, y) = gcd(y, x mod y)** until gcd(d, 0) = d", "**Extended Euclid** also gives a, b with ax + by = gcd(x, y)"],
    { x: 0.5, y: TOP, w: 4.3, h: 2.6, size: 17, space: 8 });
  img(s, "euclid_ex", 5.15, TOP);
  table(s, [["x", "8", "12", "7"], ["gcd(x, 15)", "1", "3", "1"], ["x^{−1} mod 15", "[[2]]", "none", "[[13]]"]],
    { x: 0.5, y: 4.2, w: 9, colW: [2.4, 2.2, 2.2, 2.2], rowH: 0.34, size: 15 });
}

practice("Inverses", "Solve a Congruence", "inv_q", null, "Where the problem comes from, and what was changed from the original.");
solution("Inverses", "Solve a Congruence", "inv_q", "inv_s", "Lecture 5", {
  banner: "Find the inverse first, then multiply both sides by it.",
});

{
  const s = slide("Next Steps", "Before the Exam", null);
  const star = (t) => para(t, { bullet: { code: S.bullets[2], indent: 22 }, paraSpaceAfter: 12 }, { fontSize: 18 });
  text(s, join([star("Take the **practice exam**, then read its solutions"), star("Learn each definition as the notes state it")]),
    { x: 0.8, y: TOP, w: 8.6, h: 3.2 });
}

// ---------------------------------------------------------------- save
// pptxgenjs writes an <a:pPr> before every run, and an unbulleted run gets <a:buNone/>. Google Slides applies the last
// one, so a bold label followed by plain text would lose its bullet. Only the first <a:pPr> in a paragraph is kept.
async function save(file) {
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(await pres.write({ outputType: "nodebuffer" }));
  let dropped = 0;
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async("string");
    zip.file(name, xml.replace(/<a:p>[\s\S]*?<\/a:p>/g, (p) => {
      let first = true;
      return p.replace(/<a:pPr\b[^>]*?(?:\/>|>[\s\S]*?<\/a:pPr>)/g, (pPr) => {
        if (first) { first = false; return pPr; }
        dropped += 1;
        return "";
      });
    }));
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return { file, dropped };
}

save(OUT).then(({ file, dropped }) => {
  console.log(`wrote ${file}: ${count} slides (style: ${STYLE}; dropped ${dropped} stray paragraph properties)`);
  if (warnings.length) console.log("warnings:\n  " + [...new Set(warnings)].join("\n  "));
});
