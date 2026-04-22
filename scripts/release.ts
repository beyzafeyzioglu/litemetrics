#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const PACKAGES = [
  "core",
  "tracker",
  "client",
  "node",
  "react",
  "react-native",
  "cli",
];

type Result = { pkg: string; ok: boolean; message?: string };

function run(cmd: string, args: string[], cwd: string) {
  return spawnSync(cmd, args, { cwd, stdio: "inherit" });
}

const root = resolve(import.meta.dir, "..");

console.log("\n=== Building all packages ===");
const build = run("turbo", ["build", "--force"], root);
if (build.status !== 0) {
  console.error("[release] build failed, aborting");
  process.exit(build.status ?? 1);
}

const results: Result[] = [];

for (const pkg of PACKAGES) {
  const name = `@litemetrics/${pkg}`;
  console.log(`\n=== Publishing ${name} ===`);
  const res = run(
    "bun",
    ["publish", "--access", "public"],
    resolve(root, "packages", pkg),
  );
  if (res.status === 0) {
    results.push({ pkg: name, ok: true });
  } else {
    const message = `exit code ${res.status ?? "unknown"}`;
    console.error(`[release] ${name} failed (${message}), continuing`);
    results.push({ pkg: name, ok: false, message });
  }
}

console.log("\n=== Release summary ===");
for (const r of results) {
  const mark = r.ok ? "ok" : "fail";
  const suffix = r.message ? ` (${r.message})` : "";
  console.log(`  [${mark}] ${r.pkg}${suffix}`);
}

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.log(`\n${failed.length}/${results.length} package(s) failed to publish.`);
}
