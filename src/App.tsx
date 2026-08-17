import { useEffect, useState, useCallback } from "react";
import type { JournalStatus } from "../electron/api-types";
import FirstRun from "./views/FirstRun";
import Shell from "./components/Shell";

export default function App() {
  const [status, setStatus] = useState<JournalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await window.journal.getStatus();
      setStatus(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) {
    return (
      <div className="col" style={{ paddingTop: "var(--space-3xl)" }}>
        <p className="pagetitle">Something went wrong</p>
        <p className="pagesub">{error}</p>
      </div>
    );
  }

  if (!status) return null; // brief loading flash; the reveal animation covers it once mounted

  if (status.isFirstRun || !status.workspacePath) {
    return <FirstRun onReady={refresh} />;
  }

  return <Shell status={status} onWorkspaceChanged={refresh} />;
}
