import { useState } from "react";

interface Props {
  onCreated: (slug: string) => void;
  onCancel: () => void;
}

/**
 * Creates projects/<slug>/project.md. The two sections a full node
 * carries but this form doesn't ask for (what done looks like, open
 * questions) are left for a human to fill in by hand afterward, per
 * projects/CONTEXT.md: project.md is a small knowledge node, not
 * something meant to be fully authored by a form.
 */
export default function NewProject({ onCreated, onCancel }: Props) {
  const [slug, setSlug] = useState("");
  const [whatFor, setWhatFor] = useState("");
  const [cadence, setCadence] = useState(3);
  const [cadenceNote, setCadenceNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const slugValid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);

  async function create() {
    if (!slugValid) {
      setError("slug must be kebab-case: lowercase letters, digits, and hyphens only");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await window.journal.createProject({ slug, whatFor, cadenceDaysPerWeek: cadence, cadenceNote });
      onCreated(slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="view">
      <div className="col">
        <p className="lbl">New project</p>
        <h1 className="pagetitle">Start a knowledge node</h1>
        <p className="pagesub">
          Small on purpose: what it's for, and a cadence you're willing to defend. Everything else here can be
          edited by hand later.
        </p>

        <div className="counted">
          <div className="counted__row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
              Slug
            </span>
            <input
              className="field"
              style={{ background: "transparent", border: "1px solid var(--color-rule)", color: "inherit", width: "16rem" }}
              placeholder="icm-journal"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
            />
            {slug.length > 0 && !slugValid && (
              <span className="helper">must be kebab-case: lowercase letters, digits, hyphens</span>
            )}
          </div>

          <div className="counted__row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
              What this is for
            </span>
            <textarea
              className="prose"
              style={{ minHeight: "6rem", fontSize: "var(--text-base)" }}
              placeholder="The outcome, not the activity. Two sentences is plenty."
              value={whatFor}
              onChange={(e) => setWhatFor(e.target.value)}
            />
          </div>

          <div className="counted__row">
            <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
              Committed cadence
            </span>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                className={cadence === n ? "field field--recurs" : "field"}
                onClick={() => setCadence(n)}
              >
                {n}
              </button>
            ))}
            <span className="helper">days a week</span>
          </div>

          <div className="counted__row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
              Cadence note
            </span>
            <input
              className="field"
              style={{ background: "transparent", border: "1px solid var(--color-rule)", color: "inherit" }}
              placeholder="which days, if it matters (optional)"
              value={cadenceNote}
              onChange={(e) => setCadenceNote(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="block block--flag">
            <p className="block__b">{error}</p>
          </div>
        )}

        <div className="btnrow">
          <button className="btn btn--primary" type="button" disabled={saving || !slug} onClick={create}>
            {saving ? "Creating…" : "Create project"}
          </button>
          <button className="btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
