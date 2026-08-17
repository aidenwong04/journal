import { useEffect, useState } from "react";
import type { Entry } from "../../electron/frontmatter";
import type { ProjectSummary } from "../../electron/projects";
import type { Violation } from "../../electron/validate";
import EntryEditor from "../components/EntryEditor";

interface Props {
  originalDate: string;
  onSaved: (date: string) => void;
}

/**
 * ui-contract.md: a correction is a NEW file dated today with type:
 * correction and corrects: <original date>. The original is never
 * touched. This view only ever writes today's correction file.
 */
export default function Correction({ originalDate, onSaved }: Props) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [blockerSuggestions, setBlockerSuggestions] = useState<string[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void window.journal.newCorrectionEntry(originalDate).then(setEntry);
    void window.journal.listProjects().then(setProjects);
    void window.journal.recentBlockerIds().then(setBlockerSuggestions);
  }, [originalDate]);

  async function save() {
    if (!entry) return;
    setSaving(true);
    try {
      const result = await window.journal.saveCorrection(entry);
      setViolations(result.violations);
      if (result.violations.length === 0) onSaved(entry.frontmatter.date);
    } finally {
      setSaving(false);
    }
  }

  if (!entry) return null;

  return (
    <section className="view">
      <div className="col">
        <div className="banner">
          <span className="banner__k">Correction</span>
          <p className="banner__t">
            This writes a <b>new</b> file dated today, correcting <b>{originalDate}</b>. The original stays
            exactly as written.
          </p>
        </div>

        <h1 className="pagetitle">{entry.frontmatter.date}</h1>

        <EntryEditor entry={entry} onChange={setEntry} projects={projects} blockerSuggestions={blockerSuggestions} />

        {violations.length > 0 && (
          <div className="block block--flag">
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
            {saving ? "Saving…" : "Save correction"}
          </button>
        </div>
      </div>
    </section>
  );
}
