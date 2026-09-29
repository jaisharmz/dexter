#!/usr/bin/env node
// The part of ./setup that needs JSON: OpenClaw, the Discord server, the daily jobs,
// and the link into Claude Code. Every step looks before it changes anything, so a
// second run finishes what the first began, and a finished install is a no-op.
//
//   ./setup           set up, or finish setting up
//   ./setup doctor    check every piece and say what to fix, changing nothing
//
// OPENCLAW_STATE_DIR and OPENCLAW_CONFIG_PATH point OpenClaw at other state, and
// DISCORD_API at a stand-in server, which is how this was tried without touching a
// live install.

import { spawnSync } from "node:child_process";
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, symlinkSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AGENT = "dexter";
const SECRET = "DISCORD_BOT_TOKEN";
const API = process.env.DISCORD_API || "https://discord.com/api/v10";
// The map is shared and committed; the ids of one person's server are not. Setup
// writes those to the local file, which .gitignore keeps out of every push.
const CHANNELS = join(ROOT, "etc/channels.json");
const LOCAL = join(ROOT, "etc/channels.local.json");

// What the bot needs in the server: view, send (and in threads), start threads, embed,
// attach, read history, react, slash commands, pin the index (Pin Messages, and Manage
// Messages where Discord still counts it), and build the channels once (Manage Channels).
const PERMISSIONS = [10, 11, 38, 35, 14, 15, 16, 6, 31, 51, 13, 4]
  .reduce((bits, bit) => bits | (1n << BigInt(bit)), 0n);
const MESSAGE_CONTENT = (1 << 18) | (1 << 19); // application flags: full or limited intent

const JOBS = [
  { name: "queue-digest", display: "Queue digest", cron: "0 9 * * *", script: "kernel/jobs/post-queue.sh" },
  { name: "skills-registry", display: "Skill registry", cron: "5 9 * * *", script: "kernel/jobs/post-skills.sh" },
];

const say = (line) => console.log(line);
const done = (line) => say(`  ok    ${line}`);
const doing = (line) => say(`  ...   ${line}`);
const warn = (line) => say(`  note  ${line}`);
const sleep = (ms) => new Promise((wake) => setTimeout(wake, ms));
// Equal as data: key order is not meaning, and OpenClaw may store keys in another order.
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

// ---- openclaw --------------------------------------------------------------------

const openclaw = (args, { input, check = true } = {}) => {
  const run = spawnSync("openclaw", args, { input, encoding: "utf8" });
  if (check && run.status !== 0) {
    throw new Error(`openclaw ${args.join(" ")} failed:\n${(run.stderr || run.stdout || "").trim()}`);
  }
  return run;
};

const parse = (text) => {
  try { return JSON.parse(text); } catch { return undefined; }
};

// A config value, or undefined when the path is unset.
const config = (path) => {
  const run = openclaw(["config", "get", path, "--json"], { check: false });
  return run.status === 0 ? parse(run.stdout) : undefined;
};

const listJson = (args) => {
  const listed = parse(openclaw(args, { check: false }).stdout);
  return Array.isArray(listed) ? listed : listed?.jobs || listed?.plugins || [];
};

// ---- asking ----------------------------------------------------------------------

const readLine = (prompt, { hidden = false } = {}) => new Promise((answer) => {
  process.stdout.write(prompt);
  const stdin = process.stdin;
  let line = "";
  const raw = hidden && stdin.isTTY;
  if (raw) stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();
  const onData = (chunk) => {
    for (const char of chunk) {
      if (char === "\u0003") process.exit(130);
      if (char === "\r" || char === "\n") {
        stdin.off("data", onData);
        if (raw) stdin.setRawMode(false);
        stdin.pause();
        if (raw) process.stdout.write("\n");
        return answer(line.trim());
      }
      line = char === "\u007f" ? line.slice(0, -1) : line + char;
    }
  };
  stdin.on("data", onData);
});

// ---- the channel map -------------------------------------------------------------

// The committed map, with this install's server and ids laid over it.
const readChannels = () => {
  const map = JSON.parse(readFileSync(CHANNELS, "utf8"));
  const local = existsSync(LOCAL) ? JSON.parse(readFileSync(LOCAL, "utf8")) : {};
  for (const key of ["guild", "guildName", "application", "owner"]) if (local[key]) map[key] = local[key];
  for (const [name, id] of Object.entries(local.ids || {})) if (map.channels[name]) map.channels[name].id = id;
  return map;
};

const writeLocal = (fields) => {
  const local = existsSync(LOCAL) ? JSON.parse(readFileSync(LOCAL, "utf8")) : {};
  writeFileSync(LOCAL, JSON.stringify({ ...local, ...fields }, null, 2) + "\n");
};

const realId = (id) => /^[1-9][0-9]{16,19}$/.test(id || "");
const serverBuilt = () => {
  const map = readChannels();
  return realId(map.guild) && realId(map.application) &&
    Object.values(map.channels).every((channel) => realId(channel.id));
};

// ---- discord ---------------------------------------------------------------------

const discord = async (token, method, path, body) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(API + path, {
      method,
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });
    if (response.status === 429) {
      const { retry_after: wait = 1 } = parse(await response.text()) || {};
      await sleep((wait + 0.25) * 1000);
      continue;
    }
    const text = await response.text();
    if (response.status === 401) {
      throw new Error("Discord rejected the bot token. Copy it again from the bot's page in the " +
        "developer portal and run ./setup again.");
    }
    if (!response.ok) throw new Error(`Discord ${method} ${path}: ${response.status} ${text.slice(0, 300)}`);
    return text ? parse(text) : null;
  }
  throw new Error(`Discord ${method} ${path}: still rate limited after six tries`);
};

const BOT_HOWTO = `
Dexter talks through a Discord bot you own, in a server of your own. To make them:

  1. Server: in Discord, + > Create My Own. An empty server is best.
  2. Bot: https://discord.com/developers/applications > New Application, name it Dexter.
     On its Bot page, copy the token. If you no longer have it, Reset Token makes a new
     one and retires the old.
  3. Same page, Privileged Gateway Intents: turn on Message Content Intent.
`;

// OpenClaw's secret store is write-only by design, so a stored token cannot be read
// back. Setup asks for it only when it has to talk to Discord itself, and keeps it in
// memory only.
const askToken = async () => {
  if (process.env.DISCORD_BOT_TOKEN) return process.env.DISCORD_BOT_TOKEN.trim();
  say(BOT_HOWTO);
  const token = await readLine("Bot token (hidden as you paste): ", { hidden: true });
  if (!token) throw new Error("no token given");
  return token;
};

const checkIntent = async (token, application) => {
  while (!(application.flags & MESSAGE_CONTENT)) {
    warn("the bot cannot read messages until Message Content Intent is on:");
    say(`        https://discord.com/developers/applications/${application.id}/bot`);
    await readLine("        Turn it on, then press Enter. ");
    application = await discord(token, "GET", "/oauth2/applications/@me");
  }
  done("Message Content Intent is on");
  return application;
};

const pickServer = async (token, application) => {
  const invite = "https://discord.com/oauth2/authorize?client_id=" +
    `${application.id}&scope=bot%20applications.commands&permissions=${PERMISSIONS}`;
  for (;;) {
    const guilds = await discord(token, "GET", "/users/@me/guilds");
    const known = guilds.find((guild) => guild.id === readChannels().guild);
    if (known) return known;
    if (guilds.length === 1) return guilds[0];
    if (guilds.length > 1) {
      guilds.forEach((guild, index) => say(`        ${index + 1}. ${guild.name}`));
      const pick = Number(await readLine("        Which server is Dexter's? "));
      if (guilds[pick - 1]) return guilds[pick - 1];
      continue;
    }
    say("\nInvite the bot to your server with this link:\n");
    say(`    ${invite}\n`);
    await readLine("Press Enter once it has joined. ");
  }
};

// Every category and channel in the map, created where missing and matched by name
// where it already exists, so a rerun or a hand-made channel is never doubled.
const buildServer = async (token, guild) => {
  const map = readChannels();
  const existing = await discord(token, "GET", `/guilds/${guild.id}/channels`);
  const find = (type, name) => existing.find((channel) =>
    channel.type === type && channel.name.toLowerCase() === name.toLowerCase());
  let created = 0;
  const make = async (body) => {
    const channel = await discord(token, "POST", `/guilds/${guild.id}/channels`, body);
    existing.push(channel);
    created++;
    return channel;
  };
  const ids = {};
  for (const [category, names] of Object.entries(map.categories || {})) {
    const parent = find(4, category) || await make({ name: category, type: 4 });
    for (const name of names) {
      const spec = map.channels[name];
      if (!spec) continue;
      ids[name] = (find(0, name) || await make({ name, type: 0, parent_id: parent.id, topic: spec.purpose })).id;
    }
  }
  for (const [name, spec] of Object.entries(map.channels)) {
    if (!ids[name]) ids[name] = (find(0, name) || await make({ name, type: 0, topic: spec.purpose })).id;
  }
  writeLocal({ guild: guild.id, guildName: guild.name, ids });
  return created;
};

// Everything setup needs from Discord itself, saved so later runs need no token.
const connectDiscord = async () => {
  const token = await askToken();
  const me = await discord(token, "GET", "/users/@me");
  done(`bot ${me.username} accepts the token`);
  openclaw(["secrets", "store", "set", SECRET, "--kind", "secret", "--value-file", "-"], { input: token });
  openclaw(["secrets", "reload"], { check: false });
  done("token stored in OpenClaw's secret store");
  const application = await checkIntent(token, await discord(token, "GET", "/oauth2/applications/@me"));
  const owner = application.owner?.id || application.team?.owner_user_id;
  writeLocal({ application: application.id, ...(owner ? { owner } : {}) });
  const guild = await pickServer(token, application);
  const created = await buildServer(token, guild);
  done(`${guild.name} has every channel${created ? ` (${created} created)` : ""}`);
  return created;
};

// ---- openclaw steps --------------------------------------------------------------

// Onboarding signs OpenClaw in and nothing more: it ignores a workspace and an agent
// name in non-interactive mode, so the agent is added and given Discord explicitly.
// --skip-bootstrap stops OpenClaw writing its own AGENTS.md and friends over this
// folder's; the files here are still read.
const ensureAgent = () => {
  const agent = config(`agents.entries.${AGENT}`);
  if (agent?.workspace === ROOT) return done(`agent ${AGENT} works in ${ROOT}`);
  if (agent) {
    throw new Error(`an agent named ${AGENT} already works in ${agent.workspace}. ` +
      `Run ./setup from there, or remove it with: openclaw agents delete ${AGENT}`);
  }
  if (config("agents.defaults.model.primary") === undefined) {
    doing("first-time OpenClaw setup, signed in with your Claude Code login");
    openclaw(["onboard", "--non-interactive", "--accept-risk", "--auth-choice", "anthropic-cli",
      "--skip-bootstrap", "--skip-channels", "--skip-skills", "--skip-search", "--skip-ui",
      "--skip-daemon", "--skip-health"]);
  }
  doing(`adding agent ${AGENT}, with Discord routed to it`);
  openclaw(["agents", "add", AGENT, "--workspace", ROOT, "--non-interactive"]);
  openclaw(["agents", "bind", "--agent", AGENT, "--bind", "discord"]);
  if (config(`agents.entries.${AGENT}`)?.workspace !== ROOT) {
    throw new Error(`OpenClaw did not record ${ROOT} as ${AGENT}'s workspace; see: openclaw agents list`);
  }
  done(`agent ${AGENT} works in ${ROOT}`);
};

// Discord is an external plugin, installed at the version that matches the CLI.
const pluginLoaded = () => listJson(["plugins", "list", "--json"])
  .some((plugin) => plugin.id === "discord" && plugin.status === "loaded");

const ensurePlugin = () => {
  if (pluginLoaded()) return done("the Discord plugin is installed");
  const version = (openclaw(["--version"]).stdout.match(/\d+\.\d+\.\d+\S*/) || [])[0];
  doing("installing the Discord plugin");
  openclaw(["plugins", "install", version ? `@openclaw/discord@${version}` : "@openclaw/discord",
    "--accept-capabilities"], { input: "" });
  done("the Discord plugin is installed");
  return true;
};

// The config this install should have, from the map. Only the owner may drive Dexter:
// the guild's sender allowlist is the owner's id, and a read-only channel is switched
// off, so Dexter can read it with the message tool but never answers there.
const desiredConfig = () => {
  const map = readChannels();
  const channels = { "*": { enabled: true } };
  for (const channel of Object.values(map.channels)) {
    if (channel.mode === "read-only" && realId(channel.id)) channels[channel.id] = { enabled: false };
  }
  const guild = { requireMention: false, channels, ...(map.owner ? { users: [map.owner] } : {}) };
  return {
    plugins: { entries: { discord: { enabled: true } } },
    skills: { load: { watch: true } },
    agents: { entries: { [AGENT]: { heartbeat: { every: "30m" } } } },
    channels: {
      discord: {
        enabled: true,
        token: { source: "store", provider: "default", id: SECRET },
        applicationId: map.application,
        dmPolicy: "pairing",
        guilds: { [map.guild]: guild },
        commands: { native: true, nativeSkills: true },
        streaming: {
          mode: "progress",
          progress: { toolProgress: true, commentary: true, narration: true, maxLines: 14, maxLineChars: 160 },
        },
      },
    },
  };
};

// Applies what differs and returns whether anything did, so the gateway knows to restart.
const configure = () => {
  const want = desiredConfig();
  const discord = want.channels.discord;
  const guildId = Object.keys(discord.guilds)[0];
  const current = config("channels.discord") || {};
  const settled = config("plugins.entries.discord.enabled") === true && config("skills.load.watch") === true &&
    same(config(`agents.entries.${AGENT}.heartbeat`), want.agents.entries[AGENT].heartbeat) &&
    // config get redacts a secret reference's id, so the reference is compared without it.
    current.token?.source === discord.token.source && current.token?.provider === discord.token.provider &&
    ["enabled", "applicationId", "dmPolicy", "commands", "streaming"]
      .every((key) => same(current[key], discord[key])) &&
    same(current.guilds?.[guildId], discord.guilds[guildId]);
  const patch = { ...want };
  // Setting an owner is only ours to do when nobody has: an existing list stays as it is.
  const map = readChannels();
  const needsOwner = map.owner && config("commands.ownerAllowFrom") === undefined;
  if (needsOwner) patch.commands = { ownerAllowFrom: [`discord:${map.owner}`] };
  if (settled && !needsOwner) {
    done(`OpenClaw listens to ${map.guildName}, to you only`);
    return false;
  }
  const text = JSON.stringify(patch);
  openclaw(["config", "patch", "--stdin", "--dry-run"], { input: text });
  openclaw(["config", "patch", "--stdin"], { input: text });
  done(`OpenClaw listens to ${map.guildName}${map.owner ? ", to you only" : ""}`);
  return true;
};

const gatewayState = () => parse(openclaw(["gateway", "status", "--json"], { check: false }).stdout) || {};

const discordConnected = () => {
  const status = parse(openclaw(["channels", "status", "--json"], { check: false }).stdout) || {};
  return (status.channelAccounts?.discord || []).some((account) => account?.connected === true);
};

const ensureGateway = async (restart) => {
  const service = gatewayState().service || {};
  if (!service.loaded) {
    doing("installing the gateway as a service, so Dexter survives reboots");
    openclaw(["gateway", "install"]);
  }
  if (gatewayState().service?.runtime?.status !== "running") openclaw(["gateway", "start"]);
  else if (restart && service.loaded) openclaw(["gateway", "restart"]);
  for (let second = 0; second < 90; second += 3) {
    if (discordConnected()) return done("gateway running, Discord connected");
    await sleep(3000);
  }
  warn("the gateway is up but Discord has not connected yet; ./setup doctor will say why");
};

// Jobs belong to the agent: with more than one agent, OpenClaw refuses one without an owner.
const ensureJobs = () => {
  const jobs = listJson(["cron", "list", "--json"]);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  for (const job of JOBS) {
    if (!jobs.some((existing) => existing.name === job.name)) {
      openclaw(["cron", "add", "--agent", AGENT, "--name", job.name, "--display-name", job.display,
        "--cron", job.cron, "--tz", zone, "--command", `sh ${JSON.stringify(join(ROOT, job.script))}`,
        "--description", `Posts from ${job.script}`]);
    }
    done(`${job.display} runs at ${job.cron} (${zone})`);
  }
};

// Claude Code reads ~/.claude/skills. A missing folder becomes a link to skills/; an
// existing folder gets one link per skill it lacks; a link that points elsewhere
// belongs to someone else's setup and is left alone.
const linkSkills = () => {
  const target = join(homedir(), ".claude", "skills");
  const source = join(ROOT, "skills");
  let stat;
  try { stat = lstatSync(target); } catch { stat = undefined; }
  if (!stat) {
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(source, target);
    return done(`~/.claude/skills links to ${source}`);
  }
  if (stat.isSymbolicLink()) {
    const pointsAt = resolve(dirname(target), readlinkSync(target));
    if (pointsAt === source) return done(`~/.claude/skills links to ${source}`);
    return warn(`~/.claude/skills links to ${pointsAt}, so Claude Code will not see these skills. ` +
      "Link the ones you want from skills/ into it by hand.");
  }
  const added = [];
  for (const name of readdirSync(source)) {
    if (!existsSync(join(source, name, "SKILL.md"))) continue;
    try { lstatSync(join(target, name)); } catch {
      symlinkSync(join(source, name), join(target, name));
      added.push(name);
    }
  }
  done(`Claude Code sees the skills${added.length ? ` (linked ${added.join(", ")})` : ""}`);
};

const HOME_README = `# home

Your private half, and its own git repository with no remote. The workspace around it
ignores this folder, so nothing here reaches a push of the workspace.

- prompts/     raw prompts worth keeping, verbatim and dated
- corpus/      things you wrote
- reference/   things other people wrote, never mixed with corpus
- people/      contacts
`;

const ensureHome = () => {
  const home = join(ROOT, "home");
  if (existsSync(home)) return done("home/ exists (private, gitignored)");
  for (const folder of ["prompts", "corpus", "reference", "people"]) mkdirSync(join(home, folder), { recursive: true });
  writeFileSync(join(home, "README.md"), HOME_README);
  spawnSync("git", ["init", "-q", home]);
  done("home/ created as its own private repository");
};

// ---- doctor ----------------------------------------------------------------------

const doctor = () => {
  const checks = [];
  const check = (passed, what, fix) => checks.push({ passed, what, fix });

  const version = openclaw(["--version"], { check: false });
  check(version.status === 0, (version.stdout || "OpenClaw").trim(), "install OpenClaw and put it on PATH");
  check(pluginLoaded(), "the Discord plugin is installed", "./setup");

  const agent = config(`agents.entries.${AGENT}`);
  check(agent?.workspace === ROOT, `agent ${AGENT} works in this folder`, "./setup");
  const agents = listJson(["agents", "list", "--json"]);
  const bindings = listJson(["agents", "bindings", "--json"]);
  check(bindings.some((binding) => binding.agentId === AGENT && binding.match?.channel === "discord") ||
    agents.some((entry) => entry.id === AGENT && entry.isDefault === true),
    `Discord messages reach ${AGENT}`, `openclaw agents bind --agent ${AGENT} --bind discord`);

  const discordConfig = config("channels.discord") || {};
  check(config("plugins.entries.discord.enabled") === true && discordConfig.enabled === true,
    "the Discord plugin is enabled", "./setup");
  check(Boolean(discordConfig.token), "a bot token is configured", "./setup");
  check(Boolean(discordConfig.applicationId), "the bot's application id is set", "./setup");

  let map;
  try { map = readChannels(); } catch { map = undefined; }
  const missing = map ? Object.entries(map.channels).filter(([, channel]) => !realId(channel.id)).map(([name]) => name) : ["all"];
  check(map && realId(map.guild) && missing.length === 0, "every channel in the map has an id",
    `./setup (missing: ${missing.join(", ")})`);
  check(Boolean(map && discordConfig.guilds?.[map.guild]), "OpenClaw listens to that server", "./setup");

  const service = gatewayState().service || {};
  check(service.runtime?.status === "running", "the gateway is running",
    service.loaded ? "openclaw gateway start" : "./setup");
  check(discordConnected(), "Discord is connected",
    "openclaw channels status --probe, and grep the gateway log for 'without explicit trust'");

  const jobs = listJson(["cron", "list", "--json"]);
  for (const job of JOBS) {
    check(jobs.some((existing) => existing.name === job.name), `the ${job.display} job is scheduled`, "./setup");
  }

  const skills = join(homedir(), ".claude", "skills");
  const seen = readdirSync(join(ROOT, "skills")).filter((name) => existsSync(join(ROOT, "skills", name, "SKILL.md")))
    .every((name) => existsSync(join(skills, name, "SKILL.md")));
  check(seen, "Claude Code sees every skill in skills/", "./setup, or link them into ~/.claude/skills");

  for (const { passed, what, fix } of checks) say(`  ${passed ? "ok  " : "FIX "}  ${what}${passed ? "" : `  ->  ${fix}`}`);
  const failed = checks.filter((result) => !result.passed).length;
  say(failed ? `\n${failed} to fix.` : "\nEverything checks out.");
  return failed;
};

// ---- main ------------------------------------------------------------------------

const setup = async () => {
  say("Setting up Dexter in " + ROOT + "\n");
  ensureAgent();
  const installed = ensurePlugin();
  let created = 0;
  let tokenStored = false;
  if (serverBuilt() && config("channels.discord.token")) {
    done(`Discord is set up in ${readChannels().guildName}`);
  } else {
    created = await connectDiscord();
    tokenStored = true;
  }
  const changed = configure();
  await ensureGateway(changed || tokenStored || installed === true);
  ensureJobs();
  linkSkills();
  ensureHome();
  if (created) {
    const index = spawnSync("sh", [join(ROOT, "kernel/jobs/post-index.sh")], { encoding: "utf8" });
    if (index.status === 0) done("posted and pinned the ?? index in #dexter");
    else warn("could not post the ?? index yet; once Dexter is online: sh kernel/jobs/post-index.sh");
  }
  say("\nChecking everything:\n");
  const failed = doctor();
  if (!failed) say(`\nSay hello in #dexter. On its first message Dexter reads BOOTSTRAP.md and sets itself up.`);
  return failed;
};

const command = process.argv[2] || "setup";
const run = command === "doctor" ? async () => doctor() : command === "setup" ? setup : null;
if (!run) {
  say("usage: ./setup [doctor]");
  process.exit(2);
}
run().then((failed) => process.exit(failed ? 1 : 0), (error) => {
  say(`\n${error.message}`);
  process.exit(1);
});
