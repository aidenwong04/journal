import { useMemo } from "react";
import type { Entry, Blocker, Shipped } from "../../electron/frontmatter";
import type { ProjectSummary } from "../../electron/projects";

interface Props {
  entry: Entry;
  onChange: (entry: Entry) => void;
  projects: ProjectSummary[];
  blockerSuggestions: string[];
}

/**
 * The frontmatter form plus the prose surface, shared by the today view
 * and the correction view. Field semantics: _system/entry-schema.md.
 * The project picker only ever offers real slugs (ui-contract.md: "Never
 * free text"); minutes keys are restricted to the same set.
 */
export default function EntryEditor({ entry, onChange, projects, blockerSuggestions }: Props) {
  const fm = entry.frontmatter;

  function patch(partial: Partial<typeof fm>) {
    onChange({ ...entry, frontmatter: { ...fm, ...partial } });
  }

  function toggleProject(slug: string) {
    const has = fm.projects.includes(slug);
    const nextProjects = has ? fm.projects.filter((p) => p !== slug) : [...fm.projects, slug];
    const nextMinutes = { ...fm.minutes };
    if (has) delete nextMinutes[slug];
    patch({ projects: nextProjects, minutes: nextMinutes });
  }

  function setMinutes(slug: string, minutes: number) {
    patch({ minutes: { ...fm.minutes, [slug]: minutes } });
  }

  function addBlocker() {
    const b: Blocker = { id: "", project: null, note: "" };
    patch({ blockers: [...fm.blockers, b] });
  }

  function updateBlocker(i: number, next: Partial<Blocker>) {
    const blockers = fm.blockers.map((b, idx) => (idx === i ? { ...b, ...next } : b));
    patch({ blockers });
  }

  function removeBlocker(i: number) {
    patch({ blockers: fm.blockers.filter((_, idx) => idx !== i) });
  }

  function addShipped() {
    const s: Shipped = { project: fm.projects[0] ?? "", what: "" };
    patch({ shipped: [...fm.shipped, s] });
  }

  function updateShipped(i: number, next: Partial<Shipped>) {
    const shipped = fm.shipped.map((s, idx) => (idx === i ? { ...s, ...next } : s));
    patch({ shipped });
  }

  function removeShipped(i: number) {
    patch({ shipped: fm.shipped.filter((_, idx) => idx !== i) });
  }

  const blockerDatalistId = useMemo(() => "blocker-ids", []);

  return (
    <>
      <textarea
        className="prose"
        aria-label="Entry body"
        spellCheck={false}
        placeholder="Write freely here. What you actually did, what you avoided, what you told yourself about why."
        value={entry.body}
        onChange={(e) => onChange({ ...entry, body: e.target.value })}
      />

      <div className="counted">
        <p className="lbl">Counted by the review</p>
        <p className="counted__d">
          These fields are what the weekly review counts. The prose above is what it quotes. Nothing here is
          computed, all of it is typed by you.
        </p>

        <div className="counted__row">
          <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
            Projects
          </span>
          {projects.length === 0 && <span className="field field--empty">no projects yet</span>}
          {projects.map((p) => (
            <button
              key={p.slug}
              type="button"
              className={fm.projects.includes(p.slug) ? "field field--recurs" : "field"}
              onClick={() => toggleProject(p.slug)}
            >
              {p.slug}
            </button>
          ))}
        </div>

        {fm.projects.length > 0 && (
          <div className="counted__row">
            <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
              Minutes
            </span>
            {fm.projects.map((slug) => (
              <label key={slug} className="field">
                <span className="field__k">{slug}</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={fm.minutes[slug] ?? 0}
                  onChange={(e) => setMinutes(slug, Math.max(0, Number(e.target.value)))}
                  style={{
                    width: "3.5rem",
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    font: "inherit",
                  }}
                />
              </label>
            ))}
          </div>
        )}

        <div className="counted__row">
          <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
            Energy
          </span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={fm.energy === n ? "field field--recurs" : "field"}
              onClick={() => patch({ energy: n })}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="counted__row" style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--space-xs)" }}>
          <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
            Blockers
          </span>
          <datalist id={blockerDatalistId}>
            {blockerSuggestions.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          {fm.blockers.map((b, i) => (
            <div key={i} className="btnrow">
              <input
                className="field"
                list={blockerDatalistId}
                placeholder="id (kebab-case, reuse across days)"
                value={b.id}
                onChange={(e) => updateBlocker(i, { id: e.target.value })}
                style={{ background: "transparent", border: "1px solid var(--color-rule)", color: "inherit" }}
              />
              <select
                className="field"
                value={b.project ?? ""}
                onChange={(e) => updateBlocker(i, { project: e.target.value || null })}
              >
                <option value="">no project</option>
                {fm.projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                className="field"
                placeholder="note"
                value={b.note}
                onChange={(e) => updateBlocker(i, { note: e.target.value })}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--color-rule)", color: "inherit" }}
              />
              <button type="button" className="btn" onClick={() => removeBlocker(i)}>
                remove
              </button>
            </div>
          ))}
          <button type="button" className="btn" onClick={addBlocker}>
            + blocker
          </button>
        </div>

        <div className="counted__row" style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--space-xs)" }}>
          <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
            Shipped
          </span>
          {fm.shipped.map((s, i) => (
            <div key={i} className="btnrow">
              <select className="field" value={s.project} onChange={(e) => updateShipped(i, { project: e.target.value })}>
                {fm.projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                className="field"
                placeholder="what (verifiable by someone else)"
                value={s.what}
                onChange={(e) => updateShipped(i, { what: e.target.value })}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--color-rule)", color: "inherit" }}
              />
              <button type="button" className="btn" onClick={() => removeShipped(i)}>
                remove
              </button>
            </div>
          ))}
          <button type="button" className="btn" onClick={addShipped} disabled={fm.projects.length === 0}>
            + shipped
          </button>
        </div>

        <div className="counted__row">
          <span className="lbl" style={{ letterSpacing: "normal", textTransform: "none" }}>
            Mood note
          </span>
          <input
            className="field"
            style={{ flex: 1, background: "transparent", border: "1px solid var(--color-rule)", color: "inherit" }}
            value={fm.mood_note ?? ""}
            onChange={(e) => patch({ mood_note: e.target.value || null })}
          />
        </div>
      </div>
    </>
  );
}
