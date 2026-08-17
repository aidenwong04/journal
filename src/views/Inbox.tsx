import { useEffect, useState } from "react";
import type { Proposal } from "../../electron/projects";
import { extractProposedChange } from "../../electron/proposal-parse";

interface Props {
  onOpenProject: (slug: string) => void;
}

/**
 * ui-contract.md: "The highest-value screen in the app... Accept - apply
 * the quoted replacement... Reject - delete the proposal file... The UI
 * never applies a proposal on its own, on a timer, in bulk, or as a
 * default action." Every action here is one explicit click on one card.
 */
export default function Inbox({ onOpenProject }: Props) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setProposals(await window.journal.listInbox());
  }

  useEffect(() => {
    void load();
  }, []);

  async function accept(p: Proposal) {
    const change = extractProposedChange(p.raw);
    if (!change) {
      setError(`${p.file}: could not find a clean quoted replacement. Edit project.md by hand instead.`);
      return;
    }
    setBusy(p.file);
    setError(null);
    try {
      await window.journal.acceptProposal(p.projectSlug, p.file, change);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function reject(p: Proposal) {
    setBusy(p.file);
    try {
      await window.journal.rejectProposal(p.projectSlug, p.file);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!proposals) return null;

  return (
    <section className="view">
      <div className="col col--wide">
        <p className="lbl">Inbox</p>
        <h1 className="pagetitle">Proposals awaiting a human</h1>
        <p className="pagesub">
          No review, rollup, or automated run may edit a project.md directly. This is the gate.
        </p>

        {error && (
          <div className="block block--flag">
            <p className="block__b">{error}</p>
          </div>
        )}

        {proposals.length === 0 && <p className="helper">Nothing waiting. Empty is the goal, not a bug.</p>}

        {proposals.map((p) => {
          const change = extractProposedChange(p.raw);
          return (
            <div key={`${p.projectSlug}/${p.file}`} className="block">
              <div className="block__h">
                <span className="block__t">{p.title}</span>
                <span className="block__n">
                  {p.projectSlug}
                  {p.ageDays !== null ? ` · ${p.ageDays}d old` : ""}
                </span>
              </div>
              {p.kind && <p className="counted__d">kind: {p.kind}</p>}

              {change ? (
                <div className="verbatim">
                  <mark>&minus;</mark> {change.old}
                  {"\n"}
                  <mark>+</mark> {change.next}
                </div>
              ) : (
                <p className="block__b">
                  No clean quoted replacement found; accepting requires editing project.md by hand.
                </p>
              )}

              <div className="btnrow">
                <button
                  className="btn btn--primary"
                  type="button"
                  disabled={busy === p.file || !change}
                  onClick={() => accept(p)}
                >
                  Accept
                </button>
                <button className="btn" type="button" disabled={busy === p.file} onClick={() => reject(p)}>
                  Reject
                </button>
                <button className="btn" type="button" onClick={() => onOpenProject(p.projectSlug)}>
                  View project
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
