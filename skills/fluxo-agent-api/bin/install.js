#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const SKILL_NAME = "fluxo-agent-api";
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const CODEX_HOME = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const TARGET_ROOT = path.join(CODEX_HOME, "skills");
const TARGET_DIR = path.join(TARGET_ROOT, SKILL_NAME);
const SKILL_FILES = ["SKILL.md", "agents", "references", "scripts"];

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === "node_modules") {
      continue;
    }
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function removeDirIfExists(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function install() {
  fs.mkdirSync(TARGET_ROOT, { recursive: true });
  removeDirIfExists(TARGET_DIR);
  for (const entry of SKILL_FILES) {
    const sourcePath = path.join(PACKAGE_ROOT, entry);
    const targetPath = path.join(TARGET_DIR, entry);
    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
  console.log(`Installed ${SKILL_NAME} to ${TARGET_DIR}`);
}

function main() {
  const command = process.argv[2] || "install";

  if (command === "install") {
    install();
    return;
  }

  if (command === "where") {
    console.log(TARGET_DIR);
    return;
  }

  if (command === "uninstall") {
    removeDirIfExists(TARGET_DIR);
    console.log(`Removed ${TARGET_DIR}`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error("Usage: fluxo-agent-api-skill [install|where|uninstall]");
  process.exit(1);
}

main();
