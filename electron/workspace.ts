// The chosen journal folder, first-run scaffolding, and config storage.
//
// ui-contract.md: "The UI is not part of this workspace. It is a separate
// application whose data directory happens to be journal/." and "Store its
// own config inside journal/... UI preferences belong in the platform's
// application-support directory." So the workspace path lives in
// app.getPath('userData'), never inside the journal folder itself.

import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";

// __dirname is a native CommonJS global here; see electron/tsconfig.json's
// "module": "CommonJS".

function configPath(): string {
  return path.join(app.getPath("userData"), "workspace.json");
}

export async function getConfiguredWorkspace(): Promise<string | null> {
  try {
    const raw = await fs.readFile(configPath(), "utf8");
    const data = JSON.parse(raw) as { path?: string };
    return data.path ?? null;
  } catch {
    return null;
  }
}

export async function setConfiguredWorkspace(workspacePath: string): Promise<void> {
  await fs.mkdir(path.dirname(configPath()), { recursive: true });
  await fs.writeFile(configPath(), JSON.stringify({ path: workspacePath }, null, 2));
}

export function defaultWorkspacePath(): string {
  return path.join(app.getPath("home"), "journal");
}

/** Path to the bundled template/ tree, both in dev and in a packaged app. */
export function templateRoot(): string {
  if (app.isPackaged) {
    // electron-builder's "files" config puts template/ at the app root
    // alongside dist/ and dist-electron/ (see package.json "build.files").
    return path.join(process.resourcesPath, "app.asar.unpacked", "template");
  }
  return path.join(__dirname, "..", "template");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** True if `dir` already looks like a journal workspace, empty or not. */
export async function looksLikeWorkspace(dir: string): Promise<boolean> {
  return (await pathExists(path.join(dir, "_system"))) && (await pathExists(path.join(dir, "CONTEXT.md")));
}

async function copyDir(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else {
      await fs.copyFile(s, d);
    }
  }
}

/**
 * Scaffold a fresh workspace at `dir` from the bundled template, if `dir`
 * does not already look like one. Never overwrites an existing workspace;
 * "adopt in place" is just "do nothing" when looksLikeWorkspace is true.
 */
export async function ensureWorkspace(dir: string): Promise<{ created: boolean }> {
  if (await looksLikeWorkspace(dir)) {
    return { created: false };
  }
  await fs.mkdir(dir, { recursive: true });
  const existing = await fs.readdir(dir);
  if (existing.length > 0) {
    throw new Error(
      `${dir} is not empty and does not look like a journal workspace. Choose an empty folder, or an existing journal.`
    );
  }
  await copyDir(templateRoot(), dir);
  return { created: true };
}

export interface WorkspaceInfo {
  path: string;
  created: boolean;
}

/** Resolve the active workspace on startup: configured path, or none yet. */
export async function resolveWorkspace(): Promise<string | null> {
  const configured = await getConfiguredWorkspace();
  if (configured && (await pathExists(configured))) {
    return configured;
  }
  return null;
}
