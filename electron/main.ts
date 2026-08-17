import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { journalDate, isSealed } from "./journal-date.js";
import {
  defaultWorkspacePath,
  ensureWorkspace,
  getConfiguredWorkspace,
  looksLikeWorkspace,
  resolveWorkspace,
  setConfiguredWorkspace,
} from "./workspace.js";
import {
  listEntryDates,
  newBlankEntry,
  newCorrectionEntry,
  readEntry,
  recentBlockerIds,
  saveCorrection,
  saveTodayEntry,
  validateEntryOnDisk,
} from "./entries.js";
import type { Entry } from "./frontmatter.js";
import { acceptProposal, listAllInbox, listProjects, readProjectFile, rejectProposal } from "./projects.js";
import { listAllReviews, listReviews, readReview } from "./reviews.js";
import type { ReviewTier } from "./reviews.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let workspacePath: string | null = null;

function requireWorkspace(): string {
  if (!workspacePath) throw new Error("no workspace configured yet");
  return workspacePath;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: "#121216", // approximates --color-paper (oklch(14% 0.012 265)) to avoid a flash on launch
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Open external links (e.g. a "view on GitHub" link) in the real browser,
  // never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.NODE_ENV === "development") {
    await win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function registerHandlers() {
  ipcMain.handle("journal:getStatus", async () => {
    const configured = await resolveWorkspace();
    workspacePath = configured;
    return {
      workspacePath,
      today: journalDate(),
      isFirstRun: !configured,
    };
  });

  ipcMain.handle("journal:chooseWorkspace", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose or create your journal folder",
      defaultPath: defaultWorkspacePath(),
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("journal:setWorkspace", async (_e, chosenPath: string) => {
    const exists = await looksLikeWorkspace(chosenPath);
    if (!exists) {
      await ensureWorkspace(chosenPath);
    }
    await setConfiguredWorkspace(chosenPath);
    workspacePath = chosenPath;
    return { workspacePath, today: journalDate(), isFirstRun: false };
  });

  ipcMain.handle("journal:getTodayEntry", async () => {
    const ws = requireWorkspace();
    const today = journalDate();
    const existing = await readEntry(ws, today);
    return existing ?? newBlankEntry();
  });

  ipcMain.handle("journal:getEntry", async (_e, date: string) => {
    return readEntry(requireWorkspace(), date);
  });

  ipcMain.handle("journal:isSealed", async (_e, date: string) => {
    return isSealed(date);
  });

  ipcMain.handle("journal:saveTodayEntry", async (_e, entry: Entry) => {
    return saveTodayEntry(requireWorkspace(), entry);
  });

  ipcMain.handle("journal:saveCorrection", async (_e, entry: Entry) => {
    return saveCorrection(requireWorkspace(), entry);
  });

  ipcMain.handle("journal:listEntryDates", async () => {
    return listEntryDates(requireWorkspace());
  });

  ipcMain.handle("journal:recentBlockerIds", async () => {
    return recentBlockerIds(requireWorkspace());
  });

  ipcMain.handle("journal:validateEntry", async (_e, entry: Entry) => {
    return validateEntryOnDisk(requireWorkspace(), entry);
  });

  ipcMain.handle("journal:listProjects", async () => {
    return listProjects(requireWorkspace());
  });

  ipcMain.handle("journal:readProjectFile", async (_e, slug: string) => {
    return readProjectFile(requireWorkspace(), slug);
  });

  ipcMain.handle("journal:listInbox", async () => {
    return listAllInbox(requireWorkspace());
  });

  ipcMain.handle(
    "journal:acceptProposal",
    async (_e, slug: string, file: string, replacement: { old: string; next: string }) => {
      return acceptProposal(requireWorkspace(), slug, file, replacement);
    }
  );

  ipcMain.handle("journal:rejectProposal", async (_e, slug: string, file: string) => {
    return rejectProposal(requireWorkspace(), slug, file);
  });

  ipcMain.handle("journal:listReviews", async (_e, tier: ReviewTier) => {
    return listReviews(requireWorkspace(), tier);
  });

  ipcMain.handle("journal:listAllReviews", async () => {
    return listAllReviews(requireWorkspace());
  });

  ipcMain.handle("journal:readReview", async (_e, tier: ReviewTier, file: string) => {
    return readReview(requireWorkspace(), tier, file);
  });

  // newCorrectionEntry is exposed indirectly: the renderer asks for a blank
  // correction shell via this channel rather than constructing frontmatter
  // itself, keeping date/corrects computation in the main process.
  ipcMain.handle("journal:newCorrectionEntry", async (_e, originalDate: string) => {
    return newCorrectionEntry(originalDate);
  });
}

app.whenReady().then(async () => {
  registerHandlers();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
