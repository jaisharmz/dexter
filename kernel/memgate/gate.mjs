#!/usr/bin/env node
// The memory gate: will this fit? One reading of the machine decides whether a heavy job or a new
// tab may start, and whether a finished tab may stay open for the operator.
//
//   node kernel/memgate/gate.mjs check                       may I open a tab? and the band
//   node kernel/memgate/gate.mjs check --for model            a named need (see NEEDS)
//   node kernel/memgate/gate.mjs check --need 4G --disk 3G    a measured one
//   add --json for the reading itself
//
// Exit 1 when it does not fit. The audit hook runs the same check before every heavy command and
// every new tab (kernel/audit/policy.mjs, rule memory), so an agent cannot skip it.
//
// Two numbers decide, because macOS fails two ways. Memory that runs short goes to swap and the
// work crawls; swap grows into free disk, and when the disk is full too the system starts killing
// apps. So a job fits when the memory it needs leaves a floor available, and the disk it needs
// (downloads, plus room for swap) leaves a floor free:
//   Oct 9   1.7 GB of disk free with swap nearly full; Chrome restarted three times overnight.
//   Oct 11  32% of memory free with Chrome at 4.8 GB was fine for one or two more tabs.
//   Oct 28  a 2.5 GB model download left 860 MB of disk, then the model's run pushed swap to
//           16.6 GB with almost no RAM free; a page took 17 minutes and almost every app crashed.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// What each kind of work needs, in GB of memory and of disk. A model's weights plus its runtime;
// a download is mostly disk; a tab is a renderer, and a heavy page (Docs, Slides, a booking form
// with maps) takes about this much.
export const NEEDS = {
  tab: { ram: 0.5, disk: 0.5 },
  session: { ram: 1, disk: 0.5 },
  render: { ram: 1.5, disk: 1 },
  container: { ram: 2, disk: 2 },
  model: { ram: 3, disk: 1 },
  download: { ram: 0.5, disk: 3 },
  roomy: { ram: 4, disk: 4 },
};

// What stays free after the job: an eighth of memory (2 GB on the 16 GB Mac), and 3 GB of disk
// for swap to grow into.
const ramFloor = (reading) => Math.max(2, reading.ramGB / 8);
const DISK_FLOOR = 3;

// ---- reading the machine ------------------------------------------------------------

const quiet = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
};

const KB = 1024 * 1024;
const toGB = (amount, unit) => Number(amount) / { K: KB, M: 1024, G: 1 }[unit.toUpperCase()];

// "total = 12288.00M  used = 11369.38M  free = 918.62M  (encrypted)"
export const parseSwap = (text) => {
  const used = /used\s*=\s*([\d.]+)([KMG])/i.exec(text);
  const total = /total\s*=\s*([\d.]+)([KMG])/i.exec(text);
  return { swapUsedGB: used ? toGB(used[1], used[2]) : 0, swapTotalGB: total ? toGB(total[1], total[2]) : 0 };
};

const diskFreeGB = (path) => {
  const row = quiet("df", ["-k", path]).trim().split("\n")[1]?.split(/\s+/);
  return row ? Number(row[3]) / KB : NaN;
};

// The biggest apps by resident memory, helpers folded into their app, so the advice can name what
// to close. Resident memory counts shared pages twice, so this ranks; it does not add up.
export const biggest = (psText, count = 5) => {
  const apps = {};
  for (const line of psText.split("\n")) {
    const match = /^\s*(\d+)\s+(.+)$/.exec(line);
    if (!match) continue;
    const path = match[2].trim();
    const app = /\/([^/]+)\.app\//.exec(path)?.[1] ?? path.split("/").pop();
    apps[app] = (apps[app] ?? 0) + Number(match[1]) / KB;
  }
  return Object.entries(apps).map(([name, gb]) => ({ name, gb })).sort((a, b) => b.gb - a.gb).slice(0, count);
};

export const read = () => {
  if (process.platform === "darwin") {
    const [mem, level, swap] = quiet("sysctl", ["-n", "hw.memsize", "kern.memorystatus_level", "vm.swapusage"]).split("\n");
    if (!mem || !level) return { known: false };
    const ramGB = Number(mem) / 1024 ** 3;
    const top = biggest(quiet("ps", ["-axo", "rss=,comm="]), 6);
    const disk = diskFreeGB("/System/Volumes/VM");
    return {
      known: true, ramGB, freePct: Number(level), availGB: (ramGB * Number(level)) / 100, ...parseSwap(swap ?? ""),
      diskFreeGB: Number.isNaN(disk) ? diskFreeGB("/") : disk,
      chromeGB: top.find((app) => app.name === "Google Chrome")?.gb ?? 0, top: top.slice(0, 5),
    };
  }
  if (process.platform === "linux") {
    const info = Object.fromEntries([...quiet("cat", ["/proc/meminfo"]).matchAll(/^(\w+):\s+(\d+)/gm)].map((m) => [m[1], Number(m[2]) / KB]));
    if (!info.MemTotal) return { known: false };
    const top = biggest(quiet("ps", ["-eo", "rss=,comm="]), 6);
    return {
      known: true, ramGB: info.MemTotal, availGB: info.MemAvailable, freePct: Math.round((100 * info.MemAvailable) / info.MemTotal),
      swapUsedGB: info.SwapTotal - info.SwapFree, swapTotalGB: info.SwapTotal, diskFreeGB: diskFreeGB("/"),
      chromeGB: top.find((app) => /chrome/i.test(app.name))?.gb ?? 0, top: top.slice(0, 5),
    };
  }
  return { known: false };
};

// ---- the verdict ----------------------------------------------------------------------

const gb = (value) => (value >= 10 ? value.toFixed(0) : value.toFixed(1));

// Does `need` fit? Each shortfall says what is short and by how much.
export const fits = (reading, need) => {
  if (!reading?.known) return { ok: true, short: [], unknown: true };
  const short = [];
  const floor = ramFloor(reading);
  if (reading.availGB - need.ram < floor) short.push(`${gb(reading.availGB)} GB of memory is available, and this needs ${gb(need.ram)} GB with ${gb(floor)} GB left free`);
  if (reading.diskFreeGB - need.disk < DISK_FLOOR) short.push(`${gb(reading.diskFreeGB)} GB of disk is free, and this needs ${gb(need.disk)} GB with ${DISK_FLOOR} GB left for swap, which grows into free disk`);
  return { ok: !short.length, short };
};

// roomy: a 4 GB job still fits. tight: a tab fits, a heavy job does not. full: not even a tab.
export const band = (reading) => {
  if (!reading?.known) return "unknown";
  if (fits(reading, NEEDS.roomy).ok) return "roomy";
  return fits(reading, NEEDS.tab).ok ? "tight" : "full";
};

// What to do with tabs in each band. A tab that waits on the operator is a booking form, an
// application stopped at Submit, a sign-in or emailed code, a slot to pick, a page to look at.
export const TABS = {
  roomy: "keep tabs that wait on the operator open and name them in your report; keep done tabs while this run may come back to them",
  tight: "keep only tabs that wait on the operator; close each done tab now, and close one before opening one",
  full: "open none; close your done tabs, then save the state of tabs that wait on the operator (address, answers in the run README, a small screenshot) and close them, oldest first",
  unknown: "memory is not measured here; close done tabs, keep the ones that wait on the operator",
};

export const summary = (reading) => {
  if (!reading?.known) return "memory and disk are not measured on this platform";
  const swap = reading.swapUsedGB ? `, swap ${gb(reading.swapUsedGB)} GB used` : "";
  return `${gb(reading.availGB)} of ${gb(reading.ramGB)} GB memory available (${reading.freePct}%)${swap}, ${gb(reading.diskFreeGB)} GB disk free`;
};

export const biggestLine = (reading) => (reading?.top?.length ? `biggest: ${reading.top.map((app) => `${app.name} ${gb(app.gb)} GB`).join(", ")}` : "");

// ---- spotting a heavy command ---------------------------------------------------------

// Python packages whose import means a model is loading, or about to.
const ML = "torch|torchvision|tensorflow|jax|flax|mlx|mlx_lm|mlx_vlm|transformers|diffusers|vllm|llama_cpp|sentence_transformers|onnxruntime|paddle|paddleocr|ultralytics|whisper|faster_whisper|keras|accelerate|timm|open_clip|docling|ctranslate2|optimum|bitsandbytes";
const IMPORTS = new RegExp(`(?:^|[;\\n])\\s*(?:import|from)\\s+(${ML})\\b`, "m");
const PACKAGES = /^(torch|torchvision|torchaudio|tensorflow|jax|jaxlib|mlx|mlx-lm|mlx-vlm|vllm|transformers|diffusers|paddlepaddle|paddleocr|llama-cpp-python|sentence-transformers|onnxruntime|ultralytics|xformers|bitsandbytes|openai-whisper|faster-whisper|docling)\b/i;

const WRAPPERS = new Set(["timeout", "gtimeout", "nohup", "caffeinate", "time", "nice", "exec", "env", "command"]);

// The pieces of a command between ; && || | and newlines, outside quotes, as words with their
// quotes taken off.
const pieces = (command) => {
  const out = [];
  let words = [];
  let word = "";
  let quoted = false;
  const endWord = () => {
    if (word || quoted) words.push(word);
    word = "";
    quoted = false;
  };
  const endPiece = () => {
    endWord();
    if (words.length) out.push(words);
    words = [];
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === "\\" && i + 1 < command.length) { word += command[++i]; continue; }
    if (c === "'" || c === '"') {
      let end = i + 1;
      while (end < command.length && command[end] !== c) end += c === '"' && command[end] === "\\" ? 2 : 1;
      word += command.slice(i + 1, end);
      quoted = true;
      i = end;
      continue;
    }
    if (/\s/.test(c) && c !== "\n") { endWord(); continue; }
    if (c === "\n" || c === ";" || c === "|" || (c === "&" && command[i + 1] === "&")) {
      if (c === "&" || (c === "|" && command[i + 1] === "|")) i++;
      endPiece();
      continue;
    }
    word += c;
  }
  endPiece();
  return out;
};

const size = (text) => {
  const match = /^([\d.]+)\s*([KMG]?)/i.exec(text ?? "");
  return match ? toGB(match[1], match[2] || "G") : undefined;
};

const ofKind = (kind, why, declared) => ({ kind, why, need: { ram: declared.ram ?? NEEDS[kind].ram, disk: declared.disk ?? NEEDS[kind].disk } });

// Does this shell command start work that needs gigabytes on this machine? A model run (a Python
// script that imports a model runtime, ollama, llama.cpp, vllm, mlx), a model download or a
// model-runtime install, a container, a virtual display or a render. Work sent elsewhere (ssh) and
// commands that only name a package (grep torch, pip show torch) do not count. A command can state
// its measured need with MEMGATE_NEED=1G and MEMGATE_DISK=2G in front.
export const heavy = (command, cwd = process.cwd()) => {
  const text = String(command ?? "");
  const vars = { HOME: homedir() };
  const declared = {};
  const sub = (word) => word.replace(/^~(?=\/|$)/, homedir()).replace(/\$\{?(\w+)\}?/g, (all, name) => vars[name] ?? all);
  // A Python script fed on stdin: `python3 - <<'EOF'`.
  for (const doc of text.matchAll(/([^\n]*?)<<-?\s*(['"]?)(\w+)\2[^\n]*\n([\s\S]*?)\n\s*\3\s*(?=\n|$)/g)) {
    if (/(^|[\s/])python[\d.]*\b|\buv\s+run\b/.test(doc[1]) && IMPORTS.test(doc[4])) return ofKind("model", `a Python script on stdin imports ${IMPORTS.exec(doc[4])[1]}`, declared);
  }
  const body = text.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, "<<HEREDOC");
  let dir = cwd;
  for (let words of pieces(body)) {
    while (/^\w+=/.test(words[0] ?? "")) {
      const [name, ...rest] = words[0].split("=");
      vars[name] = sub(rest.join("="));
      if (name === "MEMGATE_NEED") declared.ram = size(vars[name]);
      if (name === "MEMGATE_DISK") declared.disk = size(vars[name]);
      words = words.slice(1);
    }
    while (WRAPPERS.has(words[0])) words = words.slice(1).filter((word, index) => index > 0 || !/^-|^\d/.test(word));
    if (words[0] === "uv" && words[1] === "run") words = words.slice(2).filter((word, index, all) => !/^-/.test(word) || index > all.findIndex((w) => !/^-/.test(w)));
    if (!words.length) continue;
    const [program, ...args] = words.map(sub);
    const name = program.split("/").pop();
    if (name === "cd") { dir = resolve(dir, args[0] ?? homedir()); continue; }
    if (/^python[\d.]*$/.test(name)) {
      const module = args[args.indexOf("-m") + 1];
      if (args.includes("-m") && module === "pip") {
        if (args.includes("install") && args.some((arg) => PACKAGES.test(arg))) return ofKind("download", `pip installs ${args.find((arg) => PACKAGES.test(arg))}`, declared);
        continue;
      }
      if (args.includes("-m") && new RegExp(`^(${ML})(\\.|$)`).test(module)) return ofKind("model", `python -m ${module}`, declared);
      const code = args.includes("-c") ? args[args.indexOf("-c") + 1] : null;
      if (code != null) {
        if (IMPORTS.test(code)) return ofKind("model", `python -c imports ${IMPORTS.exec(code)[1]}`, declared);
        continue;
      }
      const script = args.find((arg) => /\.py$/.test(arg));
      if (!script) continue;
      let source = "";
      try {
        source = readFileSync(resolve(dir, script), "utf8").slice(0, 256 * 1024);
      } catch {
        continue;
      }
      if (IMPORTS.test(source)) return ofKind("model", `${script.split("/").pop()} imports ${IMPORTS.exec(source)[1]}`, declared);
      continue;
    }
    const verb = args[0];
    if (/^pip3?$/.test(name) || (name === "uv" && verb === "pip") || name === "conda" || name === "mamba") {
      if (args.includes("install") && args.some((arg) => PACKAGES.test(arg) || /^pytorch$/.test(arg))) return ofKind("download", `${name} installs ${args.find((arg) => PACKAGES.test(arg) || arg === "pytorch")}`, declared);
      continue;
    }
    if (name === "uv" && verb === "add" && args.some((arg) => PACKAGES.test(arg))) return ofKind("download", `uv adds ${args.find((arg) => PACKAGES.test(arg))}`, declared);
    if (name === "ollama" && verb === "pull") return ofKind("download", "ollama pull", declared);
    if (name === "ollama" && /^(run|serve|create)$/.test(verb)) return ofKind("model", `ollama ${verb}`, declared);
    if (/^llama-(server|cli|bench|run)$/.test(name) || (name === "vllm" && verb === "serve") || /^mlx_(lm|vlm)\./.test(name) || (name === "lms" && verb === "load")) return ofKind("model", name, declared);
    if ((name === "hf" || name === "huggingface-cli") && verb === "download") return ofKind("download", `${name} download`, declared);
    if (/^(docker|podman)$/.test(name) && /^(run|build|compose|start)$/.test(verb) && (verb !== "compose" || args.includes("up"))) return ofKind("container", `${name} ${verb}`, declared);
    if (name === "docker-compose" && verb === "up") return ofKind("container", "docker-compose up", declared);
    if (/^(Xvfb|manim|blender)$/.test(name)) return ofKind("render", name, declared);
  }
  return null;
};

// ---- the command line -----------------------------------------------------------------

const main = (argv) => {
  const [command, ...rest] = argv;
  if (command !== "check") {
    console.error("usage: gate.mjs check [--for tab|session|render|container|model|download] [--need 4G] [--disk 3G] [--json]");
    return 2;
  }
  const option = (flag) => (rest.includes(flag) ? rest[rest.indexOf(flag) + 1] : undefined);
  const kind = option("--for") ?? "tab";
  if (!NEEDS[kind]) {
    console.error(`unknown --for ${kind}; one of ${Object.keys(NEEDS).join(", ")}`);
    return 2;
  }
  const need = { ram: size(option("--need")) ?? NEEDS[kind].ram, disk: size(option("--disk")) ?? NEEDS[kind].disk };
  const reading = read();
  const verdict = fits(reading, need);
  const level = band(reading);
  if (rest.includes("--json")) {
    console.log(JSON.stringify({ ...reading, band: level, need, fits: verdict.ok, short: verdict.short }, null, 2));
    return verdict.ok ? 0 : 1;
  }
  const what = option("--need") || option("--disk") ? `${gb(need.ram)} GB memory and ${gb(need.disk)} GB disk` : `a ${kind}`;
  console.log(`${level}: ${summary(reading)}`);
  console.log(verdict.ok ? `  ${what} fits` : `  ${what} does not fit: ${verdict.short.join("; ")}`);
  if (biggestLine(reading)) console.log(`  ${biggestLine(reading)}`);
  console.log(`  tabs: ${TABS[level]}`);
  if (!verdict.ok) console.log("  free memory first (your own done tabs, your own background jobs), run it on the PC (/handoff), or wait and check again");
  return verdict.ok ? 0 : 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
