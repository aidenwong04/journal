import { useEffect, useState } from "react";
import type { Entry } from "../../electron/frontmatter";
import type { ProjectSummary } from "../../electron/projects";
import type { Violation } from "../../electron/validate";
import EntryEditor from "../components/EntryEditor";

interface Props {
  today: string;
  /** Called when the current journal day rolls over while this view is open. */
  onSealed: (date: string) => void;
}

/**
 * ui-contract.md: "Editable today, sealed after... At the next 04:00
 * boundary that file seals." This view polls isSealed rather than trusting
 * a value computed at mount, so the rollover needs no restart.
 */
export default function Today({ today, onSealed }: Props) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [blockerSuggestions, setBlockerSuggestions] = useState<string[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    void window.journal.getTodayEntry().then(setEntry);
    void window.journal.listProjects().then(setProjects);
    void window.journal.recentBlockerIds().then(setBlockerSuggestions);
  }, [today]);

  useEffect(() => {
    const id = setInterval(() => {
      void window.journal.isSealed(today).then((sealed) => {
        if (sealed) onSealed(today);
      });
    }, 30000);
    return () => clearInterval(id);
  }, [today, onSealed]);

  async function save() {
    if (!entry) return;
    setSaving(true);
    try {
      const result = await window.journal.saveTodayEntry(entry);
      setViolations(result.violations);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  if (!entry) return null;

  return (
    <section className="view" aria-label="Today's entry">
      <div className="col">
        <div className="slug">
          <span className="slug__file">entries/{today.slice(0, 4)}/{today.slice(5, 7)}/{today}.md</span>
          <span className="stamp stamp--open">
            <span className="stamp__dot" aria-hidden="true" />
            unsealed
          </span>
        </div>
        <h1 className="pagetitle">{today}</h1>

        <EntryEditor entry={entry} onChange={setEntry} projects={projects} blockerSuggestions={blockerSuggestions} />

        {violations.length > 0 && (
          <div className="block block--flag">
            <div className="block__h">
              <span className="block__t">{violations.length} schema violation{violations.length === 1 ? "" : "s"}</span>
            </div>
            <ul className="bullets">
              {violations.map((v, i) => (
                <li key={i} className="bullet">
                  <span className="bullet__m">&middot;</span>
                  <span>
                    <b>{v.field}</b>: {v.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="btnrow">
          <button className="btn btn--primary" type="button" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </button>
          {savedAt && violations.length === 0 && (
            <span className="helper">saved {savedAt.toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </section>
  );
}
