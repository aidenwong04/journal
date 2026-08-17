import { useEffect, useState } from "react";
import type { Entry } from "../../electron/frontmatter";

interface Props {
  date: string;
  today: string;
  onCorrect: (date: string) => void;
}

/**
 * Read-only rendering of a sealed entry. ui-contract.md: "Sealed entries
 * are never modified... The UI's affordance for a wrong past entry is
 * 'write a correction'." There is no edit control here at all, on purpose.
 */
export default function EntryReader({ date, today, onCorrect }: Props) {
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);

  useEffect(() => {
    setEntry(undefined);
    void window.journal.getEntry(date).then(setEntry);
  }, [date]);

  if (entry === undefined) return null;

  if (entry === null) {
    return (
      <section className="view">
        <div className="col">
          <p className="lbl">No file</p>
          <h1 className="pagetitle">{date}</h1>
          <p className="pagesub">
            No entry was written for this date. A missing file is a skipped day &mdash; that is the whole
            adherence mechanism. There is no backfill.
          </p>
        </div>
      </section>
    );
  }

  const fm = entry.frontmatter;
  const isToday = date === today;

  return (
    <section className="view">
      <div className="col">
        <div className="slug">
          <span className="slug__file">
            entries/{date.slice(0, 4)}/{date.slice(5, 7)}/{date}.md
          </span>
          <span className="stamp">
            <span className="stamp__dot" aria-hidden="true" />
            sealed
          </span>
          {fm.type === "correction" && <span className="stamp">corrects {fm.corrects}</span>}
        </div>
        <h1 className="pagetitle">{date}</h1>

        <div className="proseread">
          {entry.body.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="quote__t">
              {para}
            </p>
          ))}
        </div>

        <div className="counted">
          <p className="lbl">Counted by the review</p>
          <div className="counted__row">
            {fm.projects.map((p) => (
              <span key={p} className="field">
                <span className="field__k">project</span>
                {p}
              </span>
            ))}
            <span className="field">
              <span className="field__k">energy</span>
              {fm.energy}
            </span>
            {Object.entries(fm.minutes).map(([slug, m]) => (
              <span key={slug} className="field">
                <span className="field__k">{slug}</span>
                {m}m
              </span>
            ))}
          </div>
          {fm.blockers.length > 0 && (
            <div className="counted__row">
              {fm.blockers.map((b, i) => (
                <span key={i} className="field field--recurs">
                  <span className="field__k">blocker</span>
                  {b.id}
                </span>
              ))}
            </div>
          )}
          {fm.shipped.length > 0 && (
            <div className="bullets">
              {fm.shipped.map((s, i) => (
                <div key={i} className="bullet">
                  <span className="bullet__m">&middot;</span>
                  <span>
                    <b>{s.project}</b>: {s.what}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isToday && (
          <div className="btnrow">
            <button className="btn" type="button" onClick={() => onCorrect(date)}>
              Write a correction
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
