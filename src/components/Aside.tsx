import type { View } from "./Shell";

/**
 * Contextual guidance for whatever's open, pulled from the rules in
 * CONTEXT.md / ui-contract.md rather than any live assistant. There is no
 * chat backend behind this panel; it is static, honest about that, and
 * exists so the shell has the second panel the design spec calls for.
 */
function noteFor(view: View): { kind: string; body: string } {
  switch (view.kind) {
    case "today":
      return {
        kind: "Reminder",
        body: "This file is editable until the next 04:00 boundary, then it seals for good. Reuse the same blocker id across days; that reuse is what makes a recurring blocker visible to the weekly review.",
      };
    case "entry":
      return {
        kind: "Sealed",
        body: "This entry can no longer be edited. If something here turns out to be wrong, write a correction instead — a new file, dated today, that says what you now believe. The original stays exactly as written.",
      };
    case "correction":
      return {
        kind: "Append-only",
        body: "Saving here writes a new file; it never touches the entry being corrected. Restate only the fields that were wrong.",
      };
    case "inbox":
      return {
        kind: "The human gate",
        body: "No review may edit a project.md directly. Accept applies the quoted replacement after you confirm it; reject just deletes the proposal. An untouched proposal is a signal, not a bug — it is fine to leave one sitting.",
      };
    case "reviews":
      return {
        kind: "Tier rule",
        body: "Weekly reads entries. Monthly reads weeklies, not entries. Quarterly reads monthlies, not weeklies. Each tier only ever looks at the tier directly below it, which is what keeps review cost flat as the archive grows.",
      };
    case "project":
      return {
        kind: "The human gate",
        body: "This file is never edited by a review or rollup. The only way it changes is a human accepting a proposal from a project's _inbox/, or editing it by hand.",
      };
    case "newProject":
      return {
        kind: "Small on purpose",
        body: "project.md is a knowledge node, not a task list: what it's for, what done looks like, and a cadence you're actually willing to defend. You can always edit it by hand later — nothing here is final.",
      };
  }
}

export default function Aside({ view }: { view: View }) {
  const note = noteFor(view);
  return (
    <aside className="aside" id="aside" aria-label="Context">
      <div className="panel__inner">
        <div className="aside__head">
          <p className="aside__title">Context</p>
          <p className="aside__gate">not a live assistant — static guidance from the workspace rules</p>
        </div>
        <div className="note">
          <p className="note__kind">{note.kind}</p>
          <p className="note__body">{note.body}</p>
        </div>
      </div>
    </aside>
  );
}
