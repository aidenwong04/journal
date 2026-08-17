import { useEffect, useState } from "react";

interface Props {
  slug: string;
}

/**
 * Read-only rendering of projects/<slug>/project.md. ui-contract.md read
 * privilege #1: the project picker; this view is the human-readable
 * counterpart. The app never writes project.md except via an accepted
 * proposal in the inbox.
 */
export default function ProjectView({ slug }: Props) {
  const [raw, setRaw] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setRaw(undefined);
    void window.journal.readProjectFile(slug).then(setRaw);
  }, [slug]);

  if (raw === undefined) return null;

  return (
    <section className="view">
      <div className="col">
        <p className="lbl">Project</p>
        <h1 className="pagetitle">{slug}</h1>
        {raw === null ? (
          <p className="pagesub">No project.md found for this slug.</p>
        ) : (
          <div className="proseread">
            {raw
              .replace(/^---[\s\S]*?---\r?\n?/, "")
              .split(/\n{2,}/)
              .map((para, i) => (
                <p key={i} className="quote__t">
                  {para}
                </p>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
