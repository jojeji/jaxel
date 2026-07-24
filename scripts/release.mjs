#!/usr/bin/env node
// Tag + Push für ein Release. Übernimmt genau den Teil, den man sonst
// händisch machen würde: Versionsabgleich prüfen, "vX.Y.Z"-Tag setzen,
// Commit + Tag pushen — das triggert .github/workflows/release.yml.
//
// Setzt voraus, dass Version (package.json / tauri.conf.json), CHANGELOG.md
// und der Release-Commit bereits vorbereitet sind (siehe CHANGELOG.md-Kopf:
// "eine Version wird erst beim PO-Kommando 'Release' geschnitten").

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`Fehler: ${message}`);
  process.exit(1);
}

const pkgVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const tauriVersion = JSON.parse(
  readFileSync("apps/editor/src-tauri/tauri.conf.json", "utf8"),
).version;

if (pkgVersion !== tauriVersion) {
  fail(
    `Version in package.json (${pkgVersion}) und tauri.conf.json (${tauriVersion}) weichen ab.`,
  );
}

const tag = `v${pkgVersion}`;

const branch = run("git branch --show-current");
if (branch !== "main") {
  fail(`Aktueller Branch ist "${branch}", nicht "main". Release erfolgt von main aus.`);
}

if (run("git status --porcelain")) {
  fail("Es gibt uncommittete Änderungen. Erst committen, dann releasen.");
}

const existingTags = run("git tag -l").split("\n");
if (existingTags.includes(tag)) {
  fail(`Tag ${tag} existiert bereits.`);
}

console.log(`Release ${tag}:`);
console.log(`  - Tag ${tag} auf aktuellem HEAD (${run("git rev-parse --short HEAD")}) anlegen`);
console.log(`  - main + Tag ${tag} zu origin pushen`);
console.log("  → triggert den GitHub-Actions-Workflow 'Release' (Build + GitHub-Release).");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question("Fortfahren? (y/N) ");
rl.close();

if (answer.trim().toLowerCase() !== "y") {
  console.log("Abgebrochen.");
  process.exit(0);
}

run(`git tag ${tag}`);
console.log(`Tag ${tag} angelegt.`);

execSync("git push origin main", { stdio: "inherit" });
execSync(`git push origin ${tag}`, { stdio: "inherit" });

console.log(`\nFertig. Fortschritt: https://github.com/jojeji/jaxel/actions`);
