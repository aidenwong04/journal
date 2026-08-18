import { useEffect, useState } from "react";
import { weekOf } from "../../electron/journal-date";
import type { Entry } from "../../electron/frontmatter";
import type { ProjectSummary } from "../../electron/projects";
import type { View } from "./Shell";

interface Props {
  today: string;
  view: View;
  inboxCount: number;
  onSetView: (v: View) => void;
  /** Bumped by the parent after a save, so the rail refetches. */
  refreshKey: number;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function label(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const local = new Date(y, m - 1, d);
  return `${WEEKDAY[local.getDay()]} ${String(d).padStart(2, "0")}`;
}

function daysOfWeek(start: string): string[] {
  const [y, m, d] = start.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d + i);
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`);
  }
  return out;
}

/**
 * The rail: a 28-day cadence readout, the current and previous week
 * broken into one row per date (a real file or a void row for a skipped
 * day), then the review pipeline and the project list. This mirrors the
 * reference prototype's rail rather than the flat nav list v1 shipped
 * with, which is the gap that was raised.
 */
export default function Rail({ today, view, inboxCount, onSetView, refreshKey }: Props) {
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());
  const [weekEntries, setWeekEntries] = useState<Record<string, Entry>>({});
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  const thisWeek = weekOf(today);
  const lastWeekStart = daysOfWeek(thisWeek.start)[0];
  const lastWeek = weekOf(
    (() => {
      const [y, m, d] = lastWeekStart.split("-").map(Number);
      const dt = new Date(y, m - 1, d - 1);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    })()
  );

  useEffect(() => {
    void window.journal.listEntryDates().then((dates) => setEntryDates(new Set(dates)));
    void window.journal.listProjects().then(setProjects);
  }, [refreshKey]);

  useEffect(() => {
    const dates = [...daysOfWeek(lastWeek.start), ...daysOfWeek(thisWeek.start)].filter((d) => d <= today);
    Promise.all(dates.map((d) => window.journal.getEntry(d).then((e) => [d, e] as const))).then((pairs) => {
      const map: Record<string, Entry> = {};
      for (const [d, e] of pairs) if (e) map[d] = e;
      setWeekEntries(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryDates, today, refreshKey]);

  const last28 = Array.from({ length: 28 }, (_, i) => {
    const [y, m, d] = today.split("-").map(Number);
    const dt = new Date(y, m - 1, d - (27 - i));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  });
  const onCount = last28.filter((d) => entryDates.has(d)).length;

  function rowTail(entry: Entry): string {
    const total = Object.values(entry.frontmatter.minutes).reduce((a, b) => a + b, 0);
    if (entry.frontmatter.type === "correction") return "corr";
    return total > 0 ? `${total}m` : "";
  }

  function rowProject(entry: Entry): string {
    return entry.frontmatter.projects[0] ?? "—";
  }

  function weekRows(startDate: string) {
    return daysOfWeek(startDate)
      .filter((d) => d <= today)
      .map((d) => {
        const entry = weekEntries[d];
        const isToday = d === today;
        if (!entry) {
          return (
            <li key={d}>
              <div className="voidrow">
                <span className="voidrow__date">{label(d)}</span>
                <span className="voidrow__rule" aria-hidden="true" />
                <span>no file</span>
              </div>
            </li>
          );
        }
        const targetView: View = isToday ? { kind: "today" } : { kind: "entry", date: d };
        const isCurrent =
          (view.kind === "today" && isToday) || (view.kind === "entry" && view.date === d);
        return (
          <li key={d}>
            <button
              className="navitem"
              type="button"
              aria-current={isCurrent ? "page" : undefined}
              onClick={() => onSetView(targetView)}
            >
              <span className="navitem__date">{label(d)}</span>
              <span>{rowProject(entry)}</span>
              <span className="navitem__tail">{rowTail(entry)}</span>
            </button>
          </li>
        );
      });
  }

  return (
    <>
      <div>
        <ul>
          <li>
            <button
              className="navitem"
              type="button"
              aria-current={view.kind === "today" ? "page" : undefined}
              onClick={() => onSetView({ kind: "today" })}
              title="Back to today's entry"
            >
              <span style={{ fontWeight: 600 }}>Today</span>
              <span className="navitem__tail">{today}</span>
            </button>
          </li>
        </ul>
      </div>

      <div className="cadence">
        <p className="lbl" style={{ padding: 0 }}>
          Cadence &middot; 28d
        </p>
        <div className="ticks" role="img" aria-label={`Last 28 days: ${onCount} carry an entry`}>
          {last28.map((d) => (
            <span key={d} className={`tick${entryDates.has(d) ? " tick--on" : ""}${d === today ? " tick--now" : ""}`} />
          ))}
        </div>
        <p className="cadence__note">{onCount} / 28</p>
      </div>

      <div>
        <div className="weekmark">
          <span>{thisWeek.label}</span>
          <span className="weekmark__rule" aria-hidden="true" />
          <span>open</span>
        </div>
        <ul>{weekRows(thisWeek.start)}</ul>

        <div className="weekmark">
          <span>{lastWeek.label}</span>
          <span className="weekmark__rule" aria-hidden="true" />
          <span>sealed</span>
        </div>
        <ul>{weekRows(lastWeek.start)}</ul>
      </div>

      <div>
        <p className="lbl">Pipeline</p>
        <ul style={{ marginTop: "var(--space-xs)" }}>
          <li>
            <button
              className="navitem"
              type="button"
              aria-current={view.kind === "reviews" ? "page" : undefined}
              onClick={() => onSetView({ kind: "reviews" })}
            >
              <span>Reviews</span>
            </button>
          </li>
          <li>
            <button
              className="navitem"
              type="button"
              aria-current={view.kind === "inbox" ? "page" : undefined}
              onClick={() => onSetView({ kind: "inbox" })}
            >
              <span>Inbox</span>
              {inboxCount > 0 && <span className="badge">{inboxCount}</span>}
            </button>
          </li>
        </ul>
      </div>

      <div>
        <p className="lbl">Projects</p>
        <ul style={{ marginTop: "var(--space-xs)" }}>
          {projects.map((p) => (
            <li key={p.slug}>
              <button
                className="navitem"
                type="button"
                aria-current={view.kind === "project" && view.slug === p.slug ? "page" : undefined}
                onClick={() => onSetView({ kind: "project", slug: p.slug })}
              >
                <span>{p.slug}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              className="navitem"
              type="button"
              aria-current={view.kind === "newProject" ? "page" : undefined}
              onClick={() => onSetView({ kind: "newProject" })}
            >
              <span style={{ color: "var(--color-muted)" }}>+ new project</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}
