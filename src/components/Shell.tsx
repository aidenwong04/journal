import { useEffect, useState } from "react";
import type { JournalStatus } from "../../electron/api-types";
import Today from "../views/Today";
import EntryReader from "../views/EntryReader";
import Correction from "../views/Correction";
import Inbox from "../views/Inbox";
import Reviews from "../views/Reviews";
import ProjectView from "../views/ProjectView";

interface Props {
  status: JournalStatus;
  onWorkspaceChanged: () => void;
}

export type View =
  | { kind: "today" }
  | { kind: "entry"; date: string }
  | { kind: "correction"; date: string }
  | { kind: "inbox" }
  | { kind: "reviews" }
  | { kind: "project"; slug: string };

export default function Shell({ status, onWorkspaceChanged }: Props) {
  const [view, setView] = useState<View>({ kind: "today" });
  const [inboxCount, setInboxCount] = useState(0);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  useEffect(() => {
    window.journal.listInbox().then((items) => setInboxCount(items.length)).catch(() => {});
  }, [view]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  function cycleTheme() {
    setTheme((t) => (t === "system" ? "dark" : t === "dark" ? "light" : "system"));
  }

  return (
    <div className="app" data-rail="on" data-aside="off">
      <header className="top">
        <div className="brand">
          <span className="brand__name">Journal</span>
          <span className="brand__path">{status.workspacePath}</span>
        </div>
        <div className="top__right">
          <button className="btn" type="button" onClick={onWorkspaceChanged} title="Re-check workspace">
            Refresh
          </button>
        </div>
      </header>

      <nav className="rail" aria-label="Navigation">
        <div className="panel__inner">
          <div>
            <p className="lbl">Today</p>
            <ul style={{ marginTop: "var(--space-xs)" }}>
              <li>
                <button
                  className="navitem"
                  type="button"
                  aria-current={view.kind === "today" ? "page" : undefined}
                  onClick={() => setView({ kind: "today" })}
                >
                  <span className="navitem__date">{status.today}</span>
                  <span>write</span>
                </button>
              </li>
            </ul>
          </div>

          <div style={{ marginTop: "var(--space-xl)" }}>
            <p className="lbl">Pipeline</p>
            <ul style={{ marginTop: "var(--space-xs)" }}>
              <li>
                <button
                  className="navitem"
                  type="button"
                  aria-current={view.kind === "reviews" ? "page" : undefined}
                  onClick={() => setView({ kind: "reviews" })}
                >
                  <span>Reviews</span>
                </button>
              </li>
              <li>
                <button
                  className="navitem"
                  type="button"
                  aria-current={view.kind === "inbox" ? "page" : undefined}
                  onClick={() => setView({ kind: "inbox" })}
                >
                  <span>Inbox</span>
                  {inboxCount > 0 && <span className="badge">{inboxCount}</span>}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="main">
        {view.kind === "today" && (
          <Today
            today={status.today}
            onSealed={(date) => setView({ kind: "entry", date })}
          />
        )}
        {view.kind === "entry" && (
          <EntryReader
            date={view.date}
            today={status.today}
            onCorrect={(date) => setView({ kind: "correction", date })}
          />
        )}
        {view.kind === "correction" && (
          <Correction originalDate={view.date} onSaved={(date) => setView({ kind: "entry", date })} />
        )}
        {view.kind === "inbox" && <Inbox onOpenProject={(slug) => setView({ kind: "project", slug })} />}
        {view.kind === "reviews" && <Reviews />}
        {view.kind === "project" && <ProjectView slug={view.slug} />}
      </main>

      <footer className="status">
        <span className="status__law">04:00 boundary &middot; entries are immutable</span>
        <span className="status__sep">&middot;</span>
        <span>{status.today}</span>
        <div className="status__right">
          <div className="themetoggle">
            <button className="themetoggle__btn" type="button" onClick={cycleTheme}>
              {theme}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
