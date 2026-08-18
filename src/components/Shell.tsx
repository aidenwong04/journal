import { useEffect, useState } from "react";
import type { JournalStatus } from "../../electron/api-types";
import Today from "../views/Today";
import EntryReader from "../views/EntryReader";
import Correction from "../views/Correction";
import Inbox from "../views/Inbox";
import Reviews from "../views/Reviews";
import ProjectView from "../views/ProjectView";
import Aside from "./Aside";
import Rail from "./Rail";
import NewProject from "../views/NewProject";

interface Props {
  status: JournalStatus;
}

export type View =
  | { kind: "today" }
  | { kind: "entry"; date: string }
  | { kind: "correction"; date: string }
  | { kind: "inbox" }
  | { kind: "reviews" }
  | { kind: "project"; slug: string }
  | { kind: "newProject" };

export default function Shell({ status }: Props) {
  const [view, setView] = useState<View>({ kind: "today" });
  const [inboxCount, setInboxCount] = useState(0);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [railOpen, setRailOpen] = useState(true);
  const [asideOpen, setAsideOpen] = useState(true);
  const [railRefresh, setRailRefresh] = useState(0);
  const bumpRail = () => setRailRefresh((n) => n + 1);

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
    <div className="app" data-rail={railOpen ? "on" : "off"} data-aside={asideOpen ? "on" : "off"}>
      <header className="top">
        <div className="brand">
          <button
            type="button"
            className="brand__name"
            style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
            title="Back to today"
            onClick={() => setView({ kind: "today" })}
          >
            Journal
          </button>
          <span className="brand__path">{status.workspacePath}</span>
        </div>
      </header>

      <nav className="rail" id="rail" aria-label="Navigation">
        <div className="panel__inner">
          <Rail
            today={status.today}
            view={view}
            inboxCount={inboxCount}
            onSetView={setView}
            refreshKey={railRefresh}
          />
        </div>
      </nav>

      <main className="main">
        {view.kind === "today" && (
          <Today
            today={status.today}
            onSealed={(date) => setView({ kind: "entry", date })}
            onSaved={bumpRail}
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
        {view.kind === "newProject" && (
          <NewProject
            onCreated={(slug) => {
              bumpRail();
              setView({ kind: "project", slug });
            }}
            onCancel={() => setView({ kind: "today" })}
          />
        )}
      </main>

      {/* Same grid row as rail/main/aside, spans all three columns, so its
          box height matches that row exactly with no hardcoded pixels.
          pointer-events:none lets clicks fall through everywhere except
          the two buttons themselves — this exists as a sibling of .main,
          not a child, because .main computes overflow-x:auto (forced by
          its overflow-y:auto per the CSS spec) and was silently clipping
          these buttons when they lived inside it. */}
      <div className="paneltogglelayer">
        <button
          className="paneltoggle paneltoggle--rail"
          type="button"
          aria-pressed={railOpen}
          aria-controls="rail"
          title={railOpen ? "Collapse entries" : "Expand entries"}
          aria-label="Toggle entries panel"
          onClick={() => setRailOpen((v) => !v)}
        >
          {/* points left (collapse-toward-edge) when open, right (expand) when closed */}
          <svg viewBox="0 0 8 12" fill="none" aria-hidden="true" style={{ transform: railOpen ? "none" : "scaleX(-1)" }}>
            <path d="M6 1 2 6l4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className="paneltoggle paneltoggle--aside"
          type="button"
          aria-pressed={asideOpen}
          aria-controls="aside"
          title={asideOpen ? "Collapse context" : "Expand context"}
          aria-label="Toggle context panel"
          onClick={() => setAsideOpen((v) => !v)}
        >
          {/* points right (collapse-toward-edge) when open, left (expand) when closed */}
          <svg viewBox="0 0 8 12" fill="none" aria-hidden="true" style={{ transform: asideOpen ? "none" : "scaleX(-1)" }}>
            <path d="M2 1l4 5-4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <Aside view={view} />

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
