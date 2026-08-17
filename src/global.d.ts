import type { JournalApi } from "../electron/api-types";

declare global {
  interface Window {
    journal: JournalApi;
  }
}

export {};
