import { useEffect, useState } from "react";
import type { Review, ReviewSummary, ReviewTier } from "../../electron/reviews";

const TIER_LABEL: Record<ReviewTier, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

/**
 * Read-only rendering of reviews/*\/output/. reviews/CONTEXT.md: "May
 * never write... entries/ anything, or projects/<slug>/project.md" and
 * this app never writes to reviews/ either, so every control here is a
 * link, never an edit.
 */
export default function Reviews() {
  const [summaries, setSummaries] = useState<ReviewSummary[] | null>(null);
  const [open, setOpen] = useState<{ tier: ReviewTier; file: string } | null>(null);
  const [detail, setDetail] = useState<Review | null>(null);

  useEffect(() => {
    void window.journal.listAllReviews().then(setSummaries);
  }, []);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      return;
    }
    void window.journal.readReview(open.tier, open.file).then(setDetail);
  }, [open]);

  if (!summaries) return null;

  if (open && detail) {
    const isQuarterly = open.tier === "quarterly";
    return (
      <section className="view">
        <div className="col col--wide">
          <div className="btnrow">
            <button className="btn" type="button" onClick={() => setOpen(null)}>
              &larr; all reviews
            </button>
          </div>
          <p className="lbl">{TIER_LABEL[open.tier]}</p>
          <h1 className="pagetitle">{detail.period}</h1>
          {detail.generated && <p className="pagesub">generated {detail.generated}</p>}

          {detail.sections.map((s, i) => {
            const isDecision = /doing next/i.test(s.heading);
            if (isQuarterly && isDecision) {
              return (
                <div key={i} className="verdict">
                  <span className="verdict__k">{s.heading}</span>
                  <p className="verdict__b" style={{ whiteSpace: "pre-wrap" }}>
                    {s.body}
                  </p>
                </div>
              );
            }
            return (
              <div key={i} className="block">
                <div className="block__h">
                  <span className="block__t">{s.heading}</span>
                </div>
                <p className="block__b" style={{ whiteSpace: "pre-wrap" }}>
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  const tiers: ReviewTier[] = ["weekly", "monthly", "quarterly"];

  return (
    <section className="view">
      <div className="col">
        <p className="lbl">Reviews</p>
        <h1 className="pagetitle">The rollup pipeline</h1>
        <p className="pagesub">
          Weekly reads entries, monthly reads weeklies, quarterly reads monthlies. Each tier reads only the
          tier below it.
        </p>

        {tiers.map((tier) => {
          const items = summaries.filter((s) => s.tier === tier);
          return (
            <div key={tier} className="sect">
              <div className="sect__h">
                <span className="sect__t">{TIER_LABEL[tier]}</span>
              </div>
              {items.length === 0 ? (
                <p className="helper">none yet</p>
              ) : (
                <ul>
                  {items.map((s) => (
                    <li key={s.file}>
                      <button className="navitem" type="button" onClick={() => setOpen({ tier, file: s.file })}>
                        <span className="navitem__date">{s.period}</span>
                        {s.generated && <span className="navitem__tail">{s.generated}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
