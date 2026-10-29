// node --test kernel/memgate/gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { band, biggest, fits, heavy, NEEDS, parseSwap } from "./gate.mjs";

const mac = (freePct, diskFreeGB, swapUsedGB = 0) => ({ known: true, ramGB: 16, freePct, availGB: (16 * freePct) / 100, swapUsedGB, swapTotalGB: 12, diskFreeGB, top: [] });

test("the Oct 28 crash reading is full, and the hour before it holds a model", () => {
  assert.equal(band(mac(8, 1.5, 16.6)), "full");
  // 4.7 GB of disk free before the weights came down: the 3 GB download does not fit.
  assert.equal(fits(mac(30, 4.7, 11), NEEDS.download).ok, false);
  assert.match(fits(mac(30, 4.7, 11), NEEDS.download).short.join(), /disk is free/);
  assert.equal(fits(mac(30, 8, 11), NEEDS.model).ok, false);
});

test("Oct 11, 32% free, still takes a tab; a roomy machine takes a model", () => {
  assert.equal(band(mac(32, 20)), "tight");
  assert.equal(fits(mac(32, 20), NEEDS.tab).ok, true);
  assert.equal(band(mac(60, 40)), "roomy");
  assert.equal(fits(mac(60, 40), NEEDS.model).ok, true);
});

test("a full disk alone is full, however much memory is free", () => {
  assert.equal(band(mac(70, 2)), "full");
});

test("an unmeasured machine fits and says so", () => {
  assert.deepEqual(fits({ known: false }, NEEDS.model), { ok: true, short: [], unknown: true });
  assert.equal(band({ known: false }), "unknown");
});

test("swap usage and app sizes parse", () => {
  const swap = parseSwap("total = 12288.00M  used = 11369.38M  free = 918.62M  (encrypted)");
  assert.equal(swap.swapTotalGB, 12);
  assert.ok(Math.abs(swap.swapUsedGB - 11.1) < 0.05);
  const apps = biggest("2097152 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n1048576 /Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Helper (Renderer).app/Contents/MacOS/Google Chrome Helper (Renderer)\n524288 /usr/bin/python3");
  assert.deepEqual(apps.map((app) => [app.name, app.gb]), [["Google Chrome", 3], ["python3", 0.5]]);
});

test("the Oct 28 model run is heavy: a script in a variable's directory that imports torch", () => {
  const dir = mkdtempSync(join(tmpdir(), "memgate-"));
  writeFileSync(join(dir, "run_model.py"), '"""Whole-page parse."""\nimport json\n\nimport torch\nfrom PIL import Image\n');
  writeFileSync(join(dir, "score.py"), "import json\nimport numpy\n");
  const run = `N=${dir}; P=$(grep page $N/batch.txt); echo "$P" | xargs basename; cd $N && .venv/bin/python run_model.py $N/out "$P" 2>&1 | tail -2`;
  assert.equal(heavy(run, "/").kind, "model");
  assert.match(heavy(run, "/").why, /run_model\.py imports torch/);
  assert.equal(heavy(`cd ${dir} && python3 score.py`, "/"), null);
});

test("installs, downloads, runtimes and containers are heavy", () => {
  assert.equal(heavy("uv venv -q .venv && uv pip install -q --python .venv/bin/python torch==2.14.1 transformers==5.14.1").kind, "download");
  assert.equal(heavy("pip3 install -U mlx-lm").kind, "download");
  assert.equal(heavy("python -m pip install torch").kind, "download");
  assert.equal(heavy("hf download nvidia/Parse --revision abc").kind, "download");
  assert.equal(heavy("ollama run llama3").kind, "model");
  assert.equal(heavy("timeout 600 mlx_lm.generate --model m --prompt hi").kind, "model");
  assert.equal(heavy('python3 -I -c "import os; import torch; print(torch.ones(1))"').kind, "model");
  assert.equal(heavy("python3 -m mlx_vlm.generate --model m").kind, "model");
  assert.equal(heavy("python3 - <<'EOF'\nfrom transformers import AutoModel\nAutoModel.from_pretrained('m')\nEOF").kind, "model");
  assert.equal(heavy("docker compose up -d").kind, "container");
  assert.equal(heavy("Xvfb :99 -screen 0 1280x800x24 &").kind, "render");
});

test("naming a package, or running it on another machine, is not heavy", () => {
  for (const command of [
    "grep -rn torch src/ | head",
    "pip show torch",
    "du -sh ~/.cache/huggingface/hub/* | sort -rh | head",
    'git commit -m "The torch install now pins 2.14"',
    'ssh eda-1 "cd lab && innovus -nowin -files par.tcl"',
    "curl -s https://huggingface.co/api/models/nvidia/Parse/tree/main | python3 -I -c 'import json,sys; print(len(json.load(sys.stdin)))'",
    "python3 - <<'EOF'\nimport json\nprint('torch')\nEOF",
    "docker ps",
  ]) assert.equal(heavy(command), null, command);
});

test("a command can state its measured need", () => {
  const job = heavy('MEMGATE_NEED=0.8G MEMGATE_DISK=200M python3 -c "import torch"');
  assert.equal(job.need.ram, 0.8);
  assert.ok(Math.abs(job.need.disk - 0.195) < 0.01);
  assert.equal(fits(mac(30, 8), job.need).ok, true);
});
