// Pure parsing, no filesystem access, so this module is safe to import
// from either the main process (projects.ts) or the renderer (to preview
// a proposal's diff before asking main to apply it).

/**
 * Extract the exact replacement quoted under "## Proposed change to
 * project.md". The proposal template (_system/templates/proposal.md)
 * promises this section quotes exact lines so accepting can be mechanical.
 * Returns null when the section does not contain two fenced code blocks,
 * in which case the caller should fall back to a manual edit rather than
 * guessing (ui-contract.md: the UI never applies a proposal by guessing).
 */
export function extractProposedChange(raw: string): { old: string; next: string } | null {
  const section = /## Proposed change to project\.md\r?\n([\s\S]*?)(\r?\n## |$)/.exec(raw);
  if (!section) return null;
  const body = section[1];
  const blocks = [...body.matchAll(/```[a-zA-Z]*\r?\n([\s\S]*?)```/g)].map((m) => m[1].replace(/\s+$/, ""));
  if (blocks.length >= 2) {
    return { old: blocks[0], next: blocks[1] };
  }
  return null;
}
