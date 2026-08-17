// The entire capability surface exposed to the renderer. contextIsolation
// is on and nodeIntegration is off (see main.ts), so this file, plus
// api-types.ts, is the complete audit surface for "what can the UI touch."

import { contextBridge, ipcRenderer } from "electron";
import type { JournalApi } from "./api-types.js";

function call<K extends keyof JournalApi>(channel: K) {
  return (...args: unknown[]) => ipcRenderer.invoke(`journal:${channel}`, ...args);
}

const api: JournalApi = {
  getStatus: call("getStatus"),
  chooseWorkspace: call("chooseWorkspace"),
  setWorkspace: call("setWorkspace"),

  getTodayEntry: call("getTodayEntry"),
  getEntry: call("getEntry"),
  isSealed: call("isSealed"),
  saveTodayEntry: call("saveTodayEntry"),
  saveCorrection: call("saveCorrection"),
  newCorrectionEntry: call("newCorrectionEntry"),
  listEntryDates: call("listEntryDates"),
  recentBlockerIds: call("recentBlockerIds"),
  validateEntry: call("validateEntry"),

  listProjects: call("listProjects"),
  readProjectFile: call("readProjectFile"),
  listInbox: call("listInbox"),
  acceptProposal: call("acceptProposal"),
  rejectProposal: call("rejectProposal"),

  listReviews: call("listReviews"),
  listAllReviews: call("listAllReviews"),
  readReview: call("readReview"),
} as unknown as JournalApi;

contextBridge.exposeInMainWorld("journal", api);
