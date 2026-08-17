import { useState } from "react";

interface Props {
  onReady: () => void;
}

export default function FirstRun({ onReady }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  async function pick() {
    const path = await window.journal.chooseWorkspace();
    if (path) setChosen(path);
  }

  async function confirm() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      await window.journal.setWorkspace(chosen, { createIfEmpty: true });
      onReady();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}>
      <div className="col" style={{ maxWidth: "52ch", textAlign: "left" }}>
        <p className="lbl">Welcome</p>
        <h1 className="pagetitle">Choose your journal folder</h1>
        <p className="pagesub">
          Entries accumulate as markdown files on your own disk. Pick an empty folder to start a fresh
          workspace, or point at a journal you already have. Nothing here talks to a server.
        </p>

        <div className="btnrow" style={{ marginTop: "var(--space-lg)" }}>
          <button className="btn" type="button" onClick={pick}>
            Choose folder&hellip;
          </button>
          {chosen && (
            <button className="btn btn--primary" type="button" disabled={busy} onClick={confirm}>
              {busy ? "Setting up…" : "Use this folder"}
            </button>
          )}
        </div>

        {chosen && <p className="counted__d">{chosen}</p>}
        {error && (
          <div className="block block--flag">
            <p className="block__b">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
